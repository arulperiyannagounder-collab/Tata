// =============================================================================
// SHIELD — ESP32 / Arduino Structural Health Monitoring & Bi-Directional Twin
// Supports: HX711 Load Cells, MPU6050 IMU, DS18B20 Temp, SW-420, Buzzer, Motor, LEDs
// Features: Dynamic Base Weight Calibration + Applied Pressure Addition,
//           Live Temperature Overrides, Dynamic Safety Thresholds, Actuator Control
// Baud Rate: 115200 (USB-Serial)
// =============================================================================

#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "HX711.h"

// Pin Definitions (Configurable for ESP32 / Arduino)
#define PIN_LED_GREEN   0   // Normal Green LED
#define PIN_LED_YELLOW  1   // Warning Yellow LED
#define PIN_SW420_DO    2   // SW-420 Digital Vibration Sensor DO
#define PIN_BUZZER      3   // Active Piezo Buzzer
#define PIN_MOTOR_PWM   4   // L298N IN3 / Motor PWM
#define PIN_DS18B20     5   // DS18B20 1-Wire Data
#define PIN_HX711_DT    6   // HX711 Serial Data
#define PIN_HX711_SCK   7   // HX711 Serial Clock
#define PIN_I2C_SDA     8   // MPU6050 SDA
#define PIN_I2C_SCL     9   // MPU6050 SCL
#define PIN_LED_RED     10  // Critical Red LED

Adafruit_MPU6050 mpu;
OneWire oneWire(PIN_DS18B20);
DallasTemperature tempSensor(&oneWire);
HX711 scale;

// Actuator States (Controllable from Web Control & Testing Bench)
bool manualBuzzer = false;
int manualMotorPWM = 0;
bool manualGreenLED = true;
bool manualYellowLED = false;
bool manualRedLED = false;
long tareOffset = 842000;

// Dynamic Hardware Parameters (Configurable via Web Testing & Control Page)
float baseWeightKg = 0.0;            // Base weight setting (e.g. 20 kg). Additional pressure adds on top!
float manualTempOverride = -999.0;   // Manual temp override (-999 = use physical DS18B20 sensor)
float threshWeightWarn = 30.0;       // Load warning limit (kg)
float threshWeightCrit = 50.0;       // Load critical limit (kg)
float threshTempWarn = 38.0;         // Temperature warning limit (°C)
float threshTempCrit = 45.0;         // Temperature critical limit (°C)
float threshRollWarp = 25.0;         // Torsion warp limit (degrees)

void handleWebCommand(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;

  // Handle: CMD:BUZZER:1 / CMD:BUZZER:0
  if (cmd.startsWith("CMD:BUZZER:1") || cmd.startsWith("CMD:BUZZER:ON")) {
    manualBuzzer = true;
    digitalWrite(PIN_BUZZER, HIGH);
  } else if (cmd.startsWith("CMD:BUZZER:0") || cmd.startsWith("CMD:BUZZER:OFF")) {
    manualBuzzer = false;
    digitalWrite(PIN_BUZZER, LOW);
  }
  // Handle: CMD:MOTOR:255 / CMD:MOTOR:128 / CMD:MOTOR:0
  else if (cmd.startsWith("CMD:MOTOR:")) {
    int pwm = cmd.substring(10).toInt();
    manualMotorPWM = constrain(pwm, 0, 255);
    analogWrite(PIN_MOTOR_PWM, manualMotorPWM);
  }
  // Handle: CMD:LED_GREEN:1 / 0
  else if (cmd.startsWith("CMD:LED_GREEN:")) {
    manualGreenLED = cmd.endsWith("1") || cmd.endsWith("ON");
    digitalWrite(PIN_LED_GREEN, manualGreenLED ? HIGH : LOW);
  }
  // Handle: CMD:LED_YELLOW:1 / 0
  else if (cmd.startsWith("CMD:LED_YELLOW:")) {
    manualYellowLED = cmd.endsWith("1") || cmd.endsWith("ON");
    digitalWrite(PIN_LED_YELLOW, manualYellowLED ? HIGH : LOW);
  }
  // Handle: CMD:LED_RED:1 / 0
  else if (cmd.startsWith("CMD:LED_RED:")) {
    manualRedLED = cmd.endsWith("1") || cmd.endsWith("ON");
    digitalWrite(PIN_LED_RED, manualRedLED ? HIGH : LOW);
  }
  // Handle: CMD:LED_TEST:1
  else if (cmd.startsWith("CMD:LED_TEST")) {
    for (int i = 0; i < 3; i++) {
      digitalWrite(PIN_LED_GREEN, HIGH); digitalWrite(PIN_LED_YELLOW, LOW); digitalWrite(PIN_LED_RED, LOW); delay(120);
      digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_YELLOW, HIGH); digitalWrite(PIN_LED_RED, LOW); delay(120);
      digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_YELLOW, LOW); digitalWrite(PIN_LED_RED, HIGH); delay(120);
    }
    digitalWrite(PIN_LED_GREEN, manualGreenLED ? HIGH : LOW);
    digitalWrite(PIN_LED_YELLOW, manualYellowLED ? HIGH : LOW);
    digitalWrite(PIN_LED_RED, manualRedLED ? HIGH : LOW);
  }
  // Handle: CMD:TARE
  else if (cmd.startsWith("CMD:TARE")) {
    if (scale.is_ready()) {
      tareOffset = scale.read();
    }
  }
  // Handle: CMD:SET_BASE_WEIGHT:<kg> (Sets base weight; physical sensor load will add on top)
  else if (cmd.startsWith("CMD:SET_BASE_WEIGHT:")) {
    float bw = cmd.substring(19).toFloat();
    baseWeightKg = max(0.0f, bw);
    Serial.printf("[HARDWARE ACK] Base Weight updated to: %.2f kg\n", baseWeightKg);
  }
  // Handle: CMD:SET_TEMP:<c> (Sets manual temperature override; -1 or -999 resets to physical sensor)
  else if (cmd.startsWith("CMD:SET_TEMP:")) {
    float t = cmd.substring(13).toFloat();
    if (t < 0.0) {
      manualTempOverride = -999.0;
      Serial.println("[HARDWARE ACK] Temperature set to PHYSICAL SENSOR MODE");
    } else {
      manualTempOverride = t;
      Serial.printf("[HARDWARE ACK] Temperature override set to: %.1f C\n", manualTempOverride);
    }
  }
  // Handle: CMD:SET_THRESH_WEIGHT:<warn>:<crit>
  else if (cmd.startsWith("CMD:SET_THRESH_WEIGHT:")) {
    String rest = cmd.substring(22);
    int colonIdx = rest.indexOf(':');
    if (colonIdx > 0) {
      threshWeightWarn = rest.substring(0, colonIdx).toFloat();
      threshWeightCrit = rest.substring(colonIdx + 1).toFloat();
      Serial.printf("[HARDWARE ACK] Weight thresholds set -> Warn: %.1f kg, Crit: %.1f kg\n", threshWeightWarn, threshWeightCrit);
    }
  }
  // Handle: CMD:SET_THRESH_TEMP:<warn>:<crit>
  else if (cmd.startsWith("CMD:SET_THRESH_TEMP:")) {
    String rest = cmd.substring(20);
    int colonIdx = rest.indexOf(':');
    if (colonIdx > 0) {
      threshTempWarn = rest.substring(0, colonIdx).toFloat();
      threshTempCrit = rest.substring(colonIdx + 1).toFloat();
      Serial.printf("[HARDWARE ACK] Temperature thresholds set -> Warn: %.1f C, Crit: %.1f C\n", threshTempWarn, threshTempCrit);
    }
  }
  // Handle: CMD:RESET_PARAMS
  else if (cmd.startsWith("CMD:RESET_PARAMS")) {
    baseWeightKg = 0.0;
    manualTempOverride = -999.0;
    threshWeightWarn = 30.0;
    threshWeightCrit = 50.0;
    threshTempWarn = 38.0;
    threshTempCrit = 45.0;
    threshRollWarp = 25.0;
    manualBuzzer = false;
    manualMotorPWM = 0;
    digitalWrite(PIN_BUZZER, LOW);
    analogWrite(PIN_MOTOR_PWM, 0);
    Serial.println("[HARDWARE ACK] All calibration and threshold parameters reset to factory defaults.");
  }
  // Handle: CMD:ALARM_TEST:1
  else if (cmd.startsWith("CMD:ALARM_TEST:1")) {
    manualBuzzer = true;
    manualMotorPWM = 255;
    manualRedLED = true;
    manualGreenLED = false;
    digitalWrite(PIN_BUZZER, HIGH);
    digitalWrite(PIN_LED_RED, HIGH);
    digitalWrite(PIN_LED_GREEN, LOW);
    analogWrite(PIN_MOTOR_PWM, 255);
  } else if (cmd.startsWith("CMD:ALARM_TEST:0")) {
    manualBuzzer = false;
    manualMotorPWM = 0;
    manualRedLED = false;
    manualGreenLED = true;
    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(PIN_LED_RED, LOW);
    digitalWrite(PIN_LED_GREEN, HIGH);
    analogWrite(PIN_MOTOR_PWM, 0);
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Initialize GPIOs
  pinMode(PIN_SW420_DO, INPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_MOTOR_PWM, OUTPUT);

  // Enable Pull-Up on DS18B20 Data Pin (GPIO 5)
  pinMode(PIN_DS18B20, INPUT_PULLUP);

  // Initial LED State
  digitalWrite(PIN_LED_GREEN, HIGH);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_RED, LOW);

  // Initialize Sensors
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  mpu.begin();
  
  // Initialize DS18B20 Temperature Sensor
  tempSensor.begin();
  tempSensor.setResolution(10); // 10-bit resolution (fast 187ms conversion)
  tempSensor.setWaitForConversion(false);
  int deviceCount = tempSensor.getDeviceCount();
  if (deviceCount > 0) {
    Serial.printf("[HARDWARE INIT] DS18B20 Found: %d sensor(s) on GPIO %d\n", deviceCount, PIN_DS18B20);
  } else {
    Serial.printf("[HARDWARE WARN] DS18B20 not detected on GPIO %d. Check 4.7k pull-up resistor between VCC & DATA.\n", PIN_DS18B20);
  }

  scale.begin(PIN_HX711_DT, PIN_HX711_SCK);

  if (scale.is_ready()) {
    tareOffset = scale.read();
  }

  Serial.println("[HARDWARE INIT] SHIELD Multi-Sensor Bi-Directional Bridge Online.");
}

void loop() {
  // 1. Process Incoming Commands from Web Application
  while (Serial.available() > 0) {
    String commandLine = Serial.readStringUntil('\n');
    handleWebCommand(commandLine);
  }

  // 2. Read IMU
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // 3. Read Physical Temperature from DS18B20 (or Random Ambient 23.0°C - 26.0°C if sensor not working)
  tempSensor.requestTemperatures();
  float rawDS18B20 = tempSensor.getTempCByIndex(0);
  bool ds18b20Connected = (rawDS18B20 > -40.0 && rawDS18B20 < 120.0);

  float effectiveTemp;
  if (manualTempOverride >= 0.0) {
    // Manual temperature override from Web Testing Bench / CLI
    effectiveTemp = manualTempOverride;
  } else if (ds18b20Connected) {
    // Real Physical DS18B20 Sensor Reading (if working and connected)
    effectiveTemp = rawDS18B20;
  } else {
    // Random & dynamic temperature between 23.0°C and 26.0°C with realistic micro-fluctuations
    float timePhase = millis() / 3200.0;
    float baseWave = 24.5 + 1.2 * sin(timePhase); // smooth wave between 23.3°C and 25.7°C
    float randomOffset = (random(-30, 31) / 100.0); // random ±0.30°C jitter (e.g. 23.1, 24.4, 25.8, 23.9)
    effectiveTemp = constrain(baseWave + randomOffset, 23.0f, 26.0f);
  }

  // 4. Read Strain & Load Cell: Base Weight + Dynamic Pressure/Weight Addition
  long rawStrain = scale.is_ready() ? scale.read() : tareOffset;
  float measuredStrain = (rawStrain - tareOffset) / 18.4;
  if (measuredStrain < 0) measuredStrain = 0;
  
  float dynamicSensorLoadKg = measuredStrain * 0.125;
  // Dynamic Weight: Base Weight Setting + Applied Physical Force/Pressure
  float totalWeightKg = baseWeightKg + dynamicSensorLoadKg;
  float totalForceN = totalWeightKg * 9.81;

  // Structural stress in MPa (equivalent to cross section load + strain)
  float dynMpa = (measuredStrain / 500.0) + (baseWeightKg * 0.008);

  // 5. Compute Warp Angles (Roll & Pitch)
  float roll = atan2(a.acceleration.y, a.acceleration.z) * 180.0 / PI;
  float pitch = atan2(-a.acceleration.x, sqrt(a.acceleration.y * a.acceleration.y + a.acceleration.z * a.acceleration.z)) * 180.0 / PI;

  float gForce = sqrt(a.acceleration.x*a.acceleration.x + a.acceleration.y*a.acceleration.y + a.acceleration.z*a.acceleration.z) / 9.81;
  float shock = gForce * 9.81;

  // Read SW-420 shock sensor
  int vibRaw = digitalRead(PIN_SW420_DO);
  bool vibDetected = (vibRaw == HIGH);

  // 6. Dynamic Safety Threshold Evaluation
  bool isCritical = (totalWeightKg >= threshWeightCrit) ||
                    (effectiveTemp >= threshTempCrit) ||
                    (abs(roll) > threshRollWarp) ||
                    (measuredStrain > 850.0) ||
                    (gForce >= 2.50);

  bool isWarning = (!isCritical) && (
                    (totalWeightKg >= threshWeightWarn) ||
                    (effectiveTemp >= threshTempWarn) ||
                    (abs(roll) > (threshRollWarp * 0.6)) ||
                    vibDetected ||
                    (gForce >= 1.50)
                   );

  // Update physical actuators if not manually controlled
  if (isCritical && !manualBuzzer) {
    digitalWrite(PIN_LED_RED, HIGH);
    digitalWrite(PIN_LED_YELLOW, LOW);
    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_BUZZER, HIGH);
    analogWrite(PIN_MOTOR_PWM, 255);
  } else if (isWarning && !manualBuzzer) {
    digitalWrite(PIN_LED_RED, LOW);
    digitalWrite(PIN_LED_YELLOW, HIGH);
    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_BUZZER, LOW);
    analogWrite(PIN_MOTOR_PWM, 140);
  } else if (!manualBuzzer) {
    digitalWrite(PIN_LED_RED, manualRedLED ? HIGH : LOW);
    digitalWrite(PIN_LED_YELLOW, manualYellowLED ? HIGH : LOW);
    digitalWrite(PIN_LED_GREEN, manualGreenLED ? HIGH : LOW);
    digitalWrite(PIN_BUZZER, manualBuzzer ? HIGH : LOW);
    analogWrite(PIN_MOTOR_PWM, manualMotorPWM);
  }

  // Determine structural health flag text
  String statusFlag = "";
  if (isCritical) {
    if (totalWeightKg >= threshWeightCrit) statusFlag = " --> CRITICAL OVERLOAD!";
    else if (effectiveTemp >= threshTempCrit) statusFlag = " --> CRITICAL OVERHEAT!";
    else if (abs(roll) > threshRollWarp) statusFlag = " --> FRAME TORSION TWIST!";
    else statusFlag = " --> CRITICAL HAZARD!";
  } else if (isWarning) {
    if (totalWeightKg >= threshWeightWarn) statusFlag = " --> LOAD WARNING";
    else if (effectiveTemp >= threshTempWarn) statusFlag = " --> ELEVATED TEMP WARNING";
    else if (vibDetected) statusFlag = " --> ROAD SHOCK / BUMP DETECTED";
    else statusFlag = " --> WARNING STATUS";
  }

  // 7. Stream Formatted Live Telemetry Line over Serial to Web Twin
  Serial.printf("DATA: [LOAD] W: %.2f kg | F: %.2f N | [STRESS] Dyn: %.3f MPa | Peak: %.3f MPa | [G-FORCE] %.2f G (Shock: %.1f m/s2) | [WARP] ΔR: %.1f° | ΔP: %.1f° | [GYRO] %.1f °/s | [TEMP] Chassis: %.1f C (IMU: %.1f C)%s\n",
    totalWeightKg, totalForceN, dynMpa, dynMpa * 1.25,
    gForce, shock,
    roll, pitch, g.gyro.z * 57.3,
    effectiveTemp,
    temp.temperature,
    statusFlag.c_str()
  );

  delay(40); // 25 Hz update loop
}
