// esp32_inference.ino
// SHIELD — ESP32 Edge AI Inference

#include "shield_model.h"
#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <MPU6050.h>
#include <HX711.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_ADS1X15.h>
#include <Adafruit_SSD1306.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASS = "YOUR_PASSWORD";
const char* MQTT_BROKER = "192.168.1.100";
const int   MQTT_PORT = 1883;

#define WINDOW_SIZE 50
#define SAMPLE_RATE_HZ 100

#define HX711_1_DT 27
#define HX711_1_SCK 14
#define HX711_2_DT 12
#define HX711_2_SCK 13
#define TEMP_PIN 4
#define LED_GREEN 16
#define LED_YELLOW 17
#define LED_RED 18
#define BUZZER 19
#define VIB_MOTOR 23

Adafruit_ADS1115 ads;
MPU6050 imu1(0x68);
MPU6050 imu2(0x69);
HX711 lc1, lc2;
OneWire oneWire(TEMP_PIN);
DallasTemperature tempSensor(&oneWire);
Adafruit_SSD1306 display(128, 64, &Wire, -1);

WiFiClient espClient;
PubSubClient mqtt(espClient);

float sg_buf[6][WINDOW_SIZE];
float imu1_buf[WINDOW_SIZE];
float imu2_buf[WINDOW_SIZE];
int buf_idx = 0;
float lc1_val = 0, lc2_val = 0, temp_val = 25.0;
unsigned long last_sample_us = 0;

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n=== SHIELD ESP32 ===");
    Wire.begin();

    if (!ads.begin()) Serial.println("ADS1115 failed!");
    ads.setGain(GAIN_ONE);

    imu1.initialize();
    imu2.initialize();

    lc1.begin(HX711_1_DT, HX711_1_SCK);
    lc2.begin(HX711_2_DT, HX711_2_SCK);
    lc1.set_scale(2280.f); lc2.set_scale(2280.f);
    lc1.tare(); lc2.tare();

    tempSensor.begin();

    pinMode(LED_GREEN, OUTPUT);
    pinMode(LED_YELLOW, OUTPUT);
    pinMode(LED_RED, OUTPUT);
    pinMode(BUZZER, OUTPUT);
    pinMode(VIB_MOTOR, OUTPUT);

    display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("SHIELD");
    display.display();

    WiFi.begin(WIFI_SSID, WIFI_PASS);
    Serial.print("WiFi");
    while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
    Serial.println(" connected");

    mqtt.setServer(MQTT_BROKER, MQTT_PORT);
    Serial.println("Ready. Sampling at 100 Hz...");
}

void sample_sensors() {
    for (int i = 0; i < 4; i++) {
        int16_t raw = ads.readADC_SingleEnded(i);
        sg_buf[i][buf_idx] = ads.computeVolts(raw) * 1000.0;
    }
    sg_buf[4][buf_idx] = sg_buf[2][buf_idx] * 0.95;
    sg_buf[5][buf_idx] = sg_buf[3][buf_idx] * 0.95;

    int16_t ax, ay, az;
    imu1.getAcceleration(&ax, &ay, &az);
    imu1_buf[buf_idx] = sqrt(ax*ax + ay*ay + az*az) / 16384.0;
    imu2.getAcceleration(&ax, &ay, &az);
    imu2_buf[buf_idx] = sqrt(ax*ax + ay*ay + az*az) / 16384.0;

    if (buf_idx == 0) {
        if (lc1.is_ready()) lc1_val = lc1.get_units(3);
        if (lc2.is_ready()) lc2_val = lc2.get_units(3);
        tempSensor.requestTemperatures();
        float t = tempSensor.getTempCByIndex(0);
        if (t > -50 && t < 100) temp_val = t;
    }

    if (imu1_buf[buf_idx] > 2.0 || imu2_buf[buf_idx] > 2.0) {
        char payload[128];
        snprintf(payload, sizeof(payload),
            "{\"type\":\"IMPACT\",\"value\":%.3f}", imu1_buf[buf_idx]);
        mqtt.publish("shield/alert", payload);
    }

    buf_idx++;
    if (buf_idx >= WINDOW_SIZE) { buf_idx = 0; process_window(); }
}

void extract_features(float* f) {
    int idx = 0;
    for (int s = 0; s < 6; s++) {
        float sum = 0, sum_sq = 0, peak = 0;
        for (int i = 0; i < WINDOW_SIZE; i++) {
            float v = sg_buf[s][i];
            sum += v; sum_sq += v * v;
            if (fabs(v) > peak) peak = fabs(v);
        }
        float mean = sum / WINDOW_SIZE;
        float rms = sqrt(sum_sq / WINDOW_SIZE);
        float var = sum_sq / WINDOW_SIZE - mean * mean;
        float sd = sqrt(max(var, 0.0f));
        f[idx++] = rms;
        f[idx++] = sd;
        f[idx++] = peak;
        f[idx++] = 0.0;
        f[idx++] = 0.0;
    }

    f[idx++] = lc1_val;
    f[idx++] = lc2_val;
    f[idx++] = 0.0;
    f[idx++] = 0.0;

    for (int im = 0; im < 2; im++) {
        float* buf = (im == 0) ? imu1_buf : imu2_buf;
        float sum_sq = 0, peak = 0, sum = 0;
        for (int i = 0; i < WINDOW_SIZE; i++) {
            sum += buf[i];
            sum_sq += buf[i] * buf[i];
            if (buf[i] > peak) peak = buf[i];
        }
        float rms = sqrt(sum_sq / WINDOW_SIZE);
        float mean = sum / WINDOW_SIZE;
        float var = sum_sq / WINDOW_SIZE - mean * mean;
        f[idx++] = rms;
        f[idx++] = peak;
        f[idx++] = sqrt(max(var, 0.0f));
    }

    f[idx++] = temp_val;
    f[idx++] = 0.0;

    float sm = 0, smax = 0;
    for (int s = 0; s < 6; s++) {
        float sme = 0;
        for (int i = 0; i < WINDOW_SIZE; i++) sme += sg_buf[s][i];
        sme /= WINDOW_SIZE;
        sm += sme;
        if (sme > smax) smax = sme;
    }
    sm /= 6;

    f[idx++] = sm;
    f[idx++] = smax;
    f[idx++] = 0.0;
    f[idx++] = sm / 42.0;
    f[idx++] = smax / 42.0;
}

int classify_centroid(float* f) {
    float best_dist = 1e30;
    int best_class = 0;
    for (int c = 0; c < NUM_CLASSES; c++) {
        float dist = 0;
        for (int j = 0; j < NUM_FEATURES; j++) {
            float norm = f[j] / FEATURE_STDS[j];
            float diff = norm - CENTROIDS[c][j];
            dist += diff * diff;
        }
        dist = sqrt(dist);
        if (dist < best_dist) {
            best_dist = dist;
            best_class = c;
        }
    }
    return best_class;
}

void indicate(int class_id) {
    digitalWrite(LED_GREEN, class_id == 0);
    digitalWrite(LED_YELLOW, class_id == 1);
    digitalWrite