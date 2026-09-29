#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <HX711.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <math.h>

// ================= ACTIVE-LOW LED CONTROL =================
#define LED_ON  LOW
#define LED_OFF HIGH

// ================= PIN CONFIGURATION (ESP32-C3) =================
const int PIN_SW420_DO      = 2;   // SW-420 Vibration Sensor DO
const int PIN_HX711_DOUT    = 6;   // Load Cell DT
const int PIN_HX711_SCK     = 7;   // Load Cell SCK
const int PIN_DS18B20_DATA  = 5;   // Temp Sensor Data (4.7k pull-up)
const int PIN_I2C_SDA       = 8;   // MPU6050 SDA
const int PIN_I2C_SCL       = 9;   // MPU6050 SCL

const int PIN_LED_GREEN     = 0;   // Safe Indicator (Active-LOW)
const int PIN_LED_YELLOW    = 1;   // Caution Indicator (Active-LOW)
const int PIN_LED_RED       = 10;  // Severe Hazard Indicator (Active-LOW)
const int PIN_BUZZER        = 3;   // Active Buzzer (+)
const int PIN_MOTOR_PIN     = 4;   // Haptic / Vibration Output

// ================= PHYSICAL SPECS & CATASTROPHIC THRESHOLDS =================
const float CHASSIS_AREA_MM2       = 60.0;    // Cross section (20mm x 3mm)
float calibration_factor           = 420.0;   // Load cell calibration factor

// RED ALERT LIMITS (Extreme Catastrophe Only)
const float STRESS_CRIT_LIMIT_MPA  = 0.850;   // Heavy chassis crushing load
const float TORSION_CRIT_DEG       = 45.0;    // Structural rollover / 45-deg frame twist
const float SAG_CRIT_DEG           = 45.0;    // Complete chassis sag / structural break
const float G_IMPACT_CRIT_LIMIT    = 5.20;    // High-speed collision / violent crash
const float TEMP_CRIT_C            = 50.0;    // Thermal runaway temperature

// YELLOW CAUTION LIMITS (Moderate Shock / Road Potholes)
const float STRESS_WARN_LIMIT_MPA  = 0.400;   // High payload stress
const float WARP_WARN_DEG          = 25.0;    // Significant frame lean
const float G_IMPACT_WARN_LIMIT    = 2.60;    // Moderate road bump
const float TEMP_WARN_C            = 40.0;

// Dynamic Baselines
float baseline_pitch = 0.0;
float baseline_roll  = 0.0;

HX711 scale;
Adafruit_MPU6050 mpu;
OneWire oneWire(PIN_DS18B20_DATA);
DallasTemperature tempSensors(&oneWire);

// --- HARDWARE I2C UNLOCK ROUTINE ---
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
  Wire.setTimeOut(30);

  if (!mpu.begin()) {
    recoverI2CBus();
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
    mpu.begin();
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  // 2. Initialize Load Cell with Startup Glitch Flush
  scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);
  scale.set_scale(calibration_factor);
  delay(300);
  for (int i = 0; i < 5; i++) {
    if (scale.is_ready()) scale.get_units(1);
    delay(30);
  }
  scale.tare();

  // 3. Initialize DS18B20
  tempSensors.begin();
  tempSensors.setWaitForConversion(false);

  // 4. Stable Baseline Calibration (Keep board stationary on table)
  Serial.println("\n[CALIBRATING] Locking baseline geometry... Keep board flat!");
  float sum_pitch = 0.0, sum_roll = 0.0;
  for (int i = 0; i < 20; i++) {
    sensors_event_t a_init, g_init, t_init;
    mpu.getEvent(&a_init, &g_init, &t_init);
    sum_pitch += atan2(-a_init.acceleration.x, sqrt(a_init.acceleration.y * a_init.acceleration.y + a_init.acceleration.z * a_init.acceleration.z)) * (180.0 / PI);
    sum_roll  += atan2(a_init.acceleration.y, a_init.acceleration.z) * (180.0 / PI);
    delay(40);
  }
  baseline_pitch = sum_pitch / 20.0;
  baseline_roll  = sum_roll / 20.0;

  Serial.println("==========================================================================");
  Serial.print("[SYSTEM ARMED] Zero Pitch: "); Serial.print(baseline_pitch, 1);
  Serial.print("° | Zero Roll: "); Serial.print(baseline_roll, 1); Serial.println("°");
  Serial.println("==========================================================================\n");

  // Indicator Self-Test
  digitalWrite(PIN_LED_GREEN, LED_ON);  delay(100); digitalWrite(PIN_LED_GREEN, LED_OFF);
  digitalWrite(PIN_LED_YELLOW, LED_ON); delay(100); digitalWrite(PIN_LED_YELLOW, LED_OFF);
  digitalWrite(PIN_LED_RED, LED_ON);    delay(100); digitalWrite(PIN_LED_RED, LED_OFF);
}

void loop() {
  // 1. SW-420 Mechanical Vibration
  int vib_state = digitalRead(PIN_SW420_DO);
  bool road_shock_switch = (vib_state == HIGH);

  // 2. Filtered Load Cell Reading
  float weight_kg = 0.0;
  if (scale.is_ready()) {
    float raw_w = scale.get_units(1);
    if (raw_w > 0.0 && raw_w < 25.0) weight_kg = raw_w; // Noise clamp
  }

  // 3. MPU6050 Dynamics
  sensors_event_t a, g, temp_mpu;
  mpu.getEvent(&a, &g, &temp_mpu);

  float ax = a.acceleration.x;
  float ay = a.acceleration.y;
  float az = a.acceleration.z;

  float net_accel = sqrt(ax * ax + ay * ay + az * az);
  float g_force   = net_accel / 9.81;

  // Dynamic Impact Stress
  float vertical_shock = fabs(az - 9.81);
  float dynamic_stress_mpa = (weight_kg * (9.81 + vertical_shock)) / CHASSIS_AREA_MM2;

  // 4. Chassis Angle Deflection Tracking
  float current_pitch = atan2(-ax, sqrt(ay * ay + az * az)) * (180.0 / PI);
  float current_roll  = atan2(ay, az) * (180.0 / PI);

  float delta_pitch = fabs(current_pitch - baseline_pitch);
  float delta_roll  = fabs(current_roll - baseline_roll);

  // 5. Temperature
  tempSensors.requestTemperatures();
  float chassis_temp = tempSensors.getTempCByIndex(0);
  if (chassis_temp == DEVICE_DISCONNECTED_C) chassis_temp = 25.0;

  // 6. Strict Catastrophic Alert Classification
  // RED triggers ONLY when extreme limits are breached:
  bool is_critical = (dynamic_stress_mpa >= STRESS_CRIT_LIMIT_MPA) ||
                     (delta_roll >= TORSION_CRIT_DEG) ||
                     (delta_pitch >= SAG_CRIT_DEG) ||
                     (g_force >= G_IMPACT_CRIT_LIMIT) ||
                     (chassis_temp >= TEMP_CRIT_C);

  // YELLOW triggers ONLY for strong bumps or high load (SW-420 alone won't trigger unless bump is real):
  bool is_warning  = (!is_critical) && 
                     ((dynamic_stress_mpa >= STRESS_WARN_LIMIT_MPA) ||
                      (delta_roll >= WARP_WARN_DEG) ||
                      (delta_pitch >= WARP_WARN_DEG) ||
                      (g_force >= G_IMPACT_WARN_LIMIT) ||
                      (road_shock_switch && g_force >= 2.00) ||
                      (chassis_temp >= TEMP_WARN_C));

  String status_msg = "SAFE (NORMAL)";

  // 7. Actuation (Active-LOW LEDs + Buzzer + Motor)
  if (is_critical) {
    status_msg = "CRITICAL: STRUCTURAL FAILURE / VIOLENT CRASH!";
    digitalWrite(PIN_LED_GREEN, LED_OFF);
    digitalWrite(PIN_LED_YELLOW, LED_OFF);
    digitalWrite(PIN_LED_RED, LED_ON);

    digitalWrite(PIN_BUZZER, HIGH);
    digitalWrite(PIN_MOTOR_PIN, HIGH);
    delay(100);
    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(PIN_MOTOR_PIN, LOW);
  } 
  else if (is_warning) {
    status_msg = "CAUTION: ROAD SHOCK / HEAVY BUMP";
    digitalWrite(PIN_LED_GREEN, LED_OFF);
    digitalWrite(PIN_LED_YELLOW, LED_ON);
    digitalWrite(PIN_LED_RED, LED_OFF);

    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(PIN_MOTOR_PIN, LOW);
  } 
  else {
    // Standard Normal State -> Continuous Solid GREEN
    digitalWrite(PIN_LED_GREEN, LED_ON);
    digitalWrite(PIN_LED_YELLOW, LED_OFF);
    digitalWrite(PIN_LED_RED, LED_OFF);

    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(PIN_MOTOR_PIN, LOW);
  }

  // 8. Serial Monitor Dashboard
  Serial.print("[LOAD] ");
  Serial.print(weight_kg, 2);
  Serial.print(" kg | [STRESS] ");
  Serial.print(dynamic_stress_mpa, 3);
  Serial.print(" MPa | [G] ");
  Serial.print(g_force, 2);
  Serial.print(" | [DEFLECT] R: ");
  Serial.print(delta_roll, 1);
  Serial.print("° P: ");
  Serial.print(delta_pitch, 1);
  Serial.print("° --> ");
  Serial.println(status_msg);

  delay(180);
}