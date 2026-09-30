#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <HX711.h>
#include <DHT.h>
#include <math.h>

// ================= MODE SELECTOR =================
// 0 = Human-Readable Real-Time Dashboard (Serial Monitor)
// 1 = Pure Numeric CSV Stream (For inference.py ML Model)
#define CSV_FOR_ML 0

// ================= ACTIVE-LOW LED CONTROL =================
#define LED_ON  LOW
#define LED_OFF HIGH

// ================= PIN CONFIGURATION (ESP32-C3) =================
const int PIN_SW420_DO      = 2;   // SW-420 Vibration Sensor DO
const int PIN_HX711_DOUT    = 6;   // Load Cell DT
const int PIN_HX711_SCK     = 7;   // Load Cell SCK
const int PIN_DHT_DATA      = 5;   // DHT11 Data Pin (Replaced DS18B20)
const int PIN_I2C_SDA       = 8;   // MPU6050 SDA
const int PIN_I2C_SCL       = 9;   // MPU6050 SCL

const int PIN_LED_GREEN     = 0;   // Safe Indicator (Active-LOW)
const int PIN_LED_YELLOW    = 1;   // Warning Indicator (Active-LOW)
const int PIN_LED_RED       = 10;  // Severe Hazard Indicator (Active-LOW)
const int PIN_BUZZER        = 3;   // Active Buzzer (+)
const int PIN_MOTOR_PIN     = 4;   // Vibration / Haptic Output

// DHT Configuration
#define DHTTYPE DHT11
DHT dht(PIN_DHT_DATA, DHTTYPE);

// ================= PHYSICAL SPECS & SAFETY LIMITS =================
const float CHASSIS_AREA_MM2       = 60.0;    // Cross section (20mm x 3mm)
float calibration_factor           = 420.0;   // Load cell factor

// Critical Failure Limits (RED)
const float STRESS_CRIT_LIMIT_MPA  = 0.850;   // Severe overload
const float TORSION_CRIT_DEG       = 45.0;    // Rollover / 45-deg frame twist
const float SAG_CRIT_DEG           = 45.0;    // Severe frame sag
const float G_IMPACT_CRIT_LIMIT    = 5.20;    // Violent crash shock
const float TEMP_CRIT_C            = 50.0;    // Thermal runaway temperature

// Caution Limits (YELLOW)
const float STRESS_WARN_LIMIT_MPA  = 0.400;
const float WARP_WARN_DEG          = 25.0;
const float G_IMPACT_WARN_LIMIT    = 2.60;
const float TEMP_WARN_C            = 40.0;

// Hardware Objects
HX711 scale;
Adafruit_MPU6050 mpu;

// Non-blocking Timing
unsigned long last_stream_time   = 0;
const unsigned long STREAM_DELAY = 100; // 100ms = 10 Hz Real-Time Rate

unsigned long last_dht_time      = 0;
const unsigned long DHT_DELAY    = 1500; // DHT11 needs ~1.5s between samples

// Telemetry Buffers
float baseline_pitch = 0.0;
float baseline_roll  = 0.0;
float current_temp_c = 25.0;
float current_humidity = 50.0;

// Hardware I2C Unlock Routine
void recoverI2CBus() {
  pinMode(PIN_I2C_SCL, OUTPUT);
  pinMode(PIN_I2C_SDA, INPUT_PULLUP);
  for (int i = 0; i < 9; i++) {
    digitalWrite(PIN_I2C_SCL, HIGH); delayMicroseconds(5);
    digitalWrite(PIN_I2C_SCL, LOW);  delayMicroseconds(5);
  }
  pinMode(PIN_I2C_SDA, OUTPUT);
  digitalWrite(PIN_I2C_SDA, LOW); delayMicroseconds(5);
  digitalWrite(PIN_I2C_SCL, HIGH); delayMicroseconds(2);
  digitalWrite(PIN_I2C_SDA, HIGH); delayMicroseconds(2);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(PIN_SW420_DO, INPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_MOTOR_PIN, OUTPUT);

  // Turn all OFF
  digitalWrite(PIN_LED_GREEN, LED_OFF);
  digitalWrite(PIN_LED_YELLOW, LED_OFF);
  digitalWrite(PIN_LED_RED, LED_OFF);
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_MOTOR_PIN, LOW);

  // 1. Initialize MPU6050
  recoverI2CBus();
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  Wire.setTimeOut(20);

  if (!mpu.begin()) {
    recoverI2CBus();
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
    mpu.begin();
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  // 2. Initialize Load Cell
  scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);
  scale.set_scale(calibration_factor);
  delay(200);
  scale.tare();

  // 3. Initialize DHT11
  dht.begin();

  // 4. Multi-Sample Baseline Calibration (Keep board stationary on table)
  float sum_pitch = 0.0, sum_roll = 0.0;
  for (int i = 0; i < 20; i++) {
    sensors_event_t a_init, g_init, t_init;
    mpu.getEvent(&a_init, &g_init, &t_init);
    sum_pitch += atan2(-a_init.acceleration.x, sqrt(a_init.acceleration.y * a_init.acceleration.y + a_init.acceleration.z * a_init.acceleration.z)) * (180.0 / PI);
    sum_roll  += atan2(a_init.acceleration.y, a_init.acceleration.z) * (180.0 / PI);
    delay(20);
  }
  baseline_pitch = sum_pitch / 20.0;
  baseline_roll  = sum_roll / 20.0;

#if CSV_FOR_ML == 0
  Serial.println("\n--- EV SAFETY & TELEMETRY INITIALIZED (DHT11 ACTIVE) ---");
  Serial.print("Baselines -> Zero Pitch: "); Serial.print(baseline_pitch, 1);
  Serial.print("° | Zero Roll: "); Serial.print(baseline_roll, 1); Serial.println("°\n");
#endif

  // LED Self-Test
  digitalWrite(PIN_LED_GREEN, LED_ON);  delay(100); digitalWrite(PIN_LED_GREEN, LED_OFF);
  digitalWrite(PIN_LED_YELLOW, LED_ON); delay(100); digitalWrite(PIN_LED_YELLOW, LED_OFF);
  digitalWrite(PIN_LED_RED, LED_ON);    delay(100); digitalWrite(PIN_LED_RED, LED_OFF);
}

void loop() {
  unsigned long current_millis = millis();

  // -------------------------------------------------------------
  // NON-BLOCKING DHT11 TEMPERATURE & HUMIDITY SAMPLING (~1.5s interval)
  // -------------------------------------------------------------
  if (current_millis - last_dht_time >= DHT_DELAY) {
    last_dht_time = current_millis;
    float read_t = dht.readTemperature();
    float read_h = dht.readHumidity();

    if (!isnan(read_t)) {
      current_temp_c = read_t;
    }
    if (!isnan(read_h)) {
      current_humidity = read_h;
    }
  }

  // -------------------------------------------------------------
  // HIGH-SPEED REAL-TIME SENSOR ENGINE (10 Hz = 100ms)
  // -------------------------------------------------------------
  if (current_millis - last_stream_time >= STREAM_DELAY) {
    last_stream_time = current_millis;

    // 1. SW-420 Vibration Switch
    int vib_state = digitalRead(PIN_SW420_DO);
    bool road_shock = (vib_state == HIGH);

    // 2. Load Cell Reading
    float weight_kg = 0.0;
    if (scale.is_ready()) {
      float raw_w = scale.get_units(1);
      if (raw_w > 0.0 && raw_w < 25.0) weight_kg = raw_w; // Noise clamp
    }
    float static_force_N = weight_kg * 9.81;
    float static_stress_mpa = static_force_N / CHASSIS_AREA_MM2;

    // 3. MPU6050 Motion Dynamics
    sensors_event_t a, g, temp_mpu;
    mpu.getEvent(&a, &g, &temp_mpu);

    float ax = a.acceleration.x;
    float ay = a.acceleration.y;
    float az = a.acceleration.z;

    float net_accel = sqrt(ax * ax + ay * ay + az * az);
    float g_force   = net_accel / 9.81;

    float vertical_shock = fabs(az - 9.81);
    float dynamic_stress_mpa = (weight_kg * (9.81 + vertical_shock)) / CHASSIS_AREA_MM2;

    // 4. Chassis Warp Deflection
    float current_pitch = atan2(-ax, sqrt(ay * ay + az * az)) * (180.0 / PI);
    float current_roll  = atan2(ay, az) * (180.0 / PI);

    float delta_pitch = fabs(current_pitch - baseline_pitch);
    float delta_roll  = fabs(current_roll - baseline_roll);

    // 5. System State Logic
    int state_code = 0; // 0 = Safe, 1 = Caution, 2 = Critical

    bool is_critical = (dynamic_stress_mpa >= STRESS_CRIT_LIMIT_MPA) ||
                       (delta_roll >= TORSION_CRIT_DEG) ||
                       (delta_pitch >= SAG_CRIT_DEG) ||
                       (g_force >= G_IMPACT_CRIT_LIMIT) ||
                       (current_temp_c >= TEMP_CRIT_C);

    bool is_warning  = (!is_critical) && 
                       ((dynamic_stress_mpa >= STRESS_WARN_LIMIT_MPA) ||
                        (delta_roll >= WARP_WARN_DEG) ||
                        (delta_pitch >= WARP_WARN_DEG) ||
                        (g_force >= G_IMPACT_WARN_LIMIT) ||
                        (road_shock && g_force >= 2.00) ||
                        (current_temp_c >= TEMP_WARN_C));

    // 6. Actuators
    if (is_critical) {
      state_code = 2;
      digitalWrite(PIN_LED_GREEN, LED_OFF);
      digitalWrite(PIN_LED_YELLOW, LED_OFF);
      digitalWrite(PIN_LED_RED, LED_ON);
      digitalWrite(PIN_BUZZER, HIGH);
      digitalWrite(PIN_MOTOR_PIN, HIGH);
    } 
    else if (is_warning) {
      state_code = 1;
      digitalWrite(PIN_LED_GREEN, LED_OFF);
      digitalWrite(PIN_LED_YELLOW, LED_ON);
      digitalWrite(PIN_LED_RED, LED_OFF);
      digitalWrite(PIN_BUZZER, LOW);
      digitalWrite(PIN_MOTOR_PIN, LOW);
    } 
    else {
      state_code = 0;
      digitalWrite(PIN_LED_GREEN, LED_ON);
      digitalWrite(PIN_LED_YELLOW, LED_OFF);
      digitalWrite(PIN_LED_RED, LED_OFF);
      digitalWrite(PIN_BUZZER, LOW);
      digitalWrite(PIN_MOTOR_PIN, LOW);
    }

    // -------------------------------------------------------------
    // SERIAL TELEMETRY STREAM
    // -------------------------------------------------------------
#if CSV_FOR_ML == 1
    // Pure Numeric Stream for inference.py
    // Weight,StaticStress,DynamicStress,ImpactG,DeltaPitch,DeltaRoll,Temp,Humidity,VibShock,StateCode
    Serial.print(weight_kg, 2);           Serial.print(",");
    Serial.print(static_stress_mpa, 3);   Serial.print(",");
    Serial.print(dynamic_stress_mpa, 3);  Serial.print(",");
    Serial.print(g_force, 2);             Serial.print(",");
    Serial.print(delta_pitch, 1);         Serial.print(",");
    Serial.print(delta_roll, 1);          Serial.print(",");
    Serial.print(current_temp_c, 1);      Serial.print(",");
    Serial.print(current_humidity, 1);    Serial.print(",");
    Serial.print(road_shock ? 1 : 0);     Serial.print(",");
    Serial.println(state_code);
#else
    // Scannable Real-Time Console for Arduino Serial Monitor
    Serial.print("LOAD: ");   Serial.print(weight_kg, 2);          Serial.print("kg | ");
    Serial.print("STRS: ");   Serial.print(dynamic_stress_mpa, 3); Serial.print("MPa | ");
    Serial.print("G: ");      Serial.print(g_force, 2);            Serial.print(" | ");
    Serial.print("ROLL: ");   Serial.print(delta_roll, 1);         Serial.print("° | ");
    Serial.print("PITCH: ");  Serial.print(delta_pitch, 1);        Serial.print("° | ");
    Serial.print("TEMP: ");   Serial.print(current_temp_c, 1);     Serial.print("C | ");
    Serial.print("HUM: ");    Serial.print(current_humidity, 0);   Serial.print("% | ");
    Serial.print("VIB: ");    Serial.print(road_shock ? "HIT " : "IDLE"); Serial.print(" | ");
    if (state_code == 2)      Serial.println("[CRITICAL]");
    else if (state_code == 1) Serial.println("[CAUTION]");
    else                      Serial.println("[SAFE]");
#endif
  }
}