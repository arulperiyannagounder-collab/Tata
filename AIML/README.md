# EV Chassis Structural Health Monitoring (AIML Pipeline)

A low-latency, physics-informed Machine Learning telemetry ingestion & inference pipeline designed for real-time EV Chassis Structural Health Monitoring using ESP32-C3 microcontroller, dual HX711 strain load cells, MPU6050 6-DOF IMU, and DS18B20 temperature sensors.

---

## 📁 Project Architecture & Directory Layout

```
AIML/
├── 1_data/
│   ├── generate_shield_features.py    # Physics-grounded synthetic telemetry generator & feature extractor
│   ├── shield_raw_data.csv            # Raw telemetry logs (with timestamps & operating profiles)
│   ├── shield_features.csv            # 10-feature normalized vector dataset with ground truth health labels
│   ├── live_shield_telemetry.csv      # Real ESP32 live stream buffer
│   └── live_inference_log.csv         # Real-time inference predictions & anomaly history
├── 2_models/
│   ├── scaler.pkl                     # Fitted StandardScaler artifact
│   ├── health_classifier.pkl          # Trained Random Forest 3-class Classifier (Safe, Warning, Critical)
│   ├── isolation_forest.pkl           # Trained Unsupervised Anomaly Detection model
│   └── metadata.json                  # Model hyper-parameters, test accuracy, cross-val score, and latency metrics
├── train_model.py                     # Training, Stratified K-Fold CV, Confusion Matrix & Latency benchmarking
├── realtime_inference.py              # Real-time 10 Hz USB Serial listener, low-latency predictor & terminal dashboard
└── requirements.txt                   # Project dependencies
```

---

## 🎛️ 10-Feature Vector Specification

The ESP32 streams comma-separated ASCII packets at 10 Hz:
`[weight_kg, stress_mpa, accel_x, accel_y, accel_z, g_force, gyro_x, gyro_y, gyro_z, temp_chassis]`

| Feature Index | Field Name | Unit | Sensor Origin | Nominal Safe Range |
|---|---|---|---|---|
| `0` | `weight_kg` | kg | Dual HX711 Strain Gauge | 50 – 300 kg |
| `1` | `stress_mpa` | MPa | Calculated steel stress ($\mu\epsilon \times E_{steel}$) | 1 – 20 MPa |
| `2` | `accel_x` | G | MPU6050 Accelerometer (Lateral) | -0.2 to +0.2 G |
| `3` | `accel_y` | G | MPU6050 Accelerometer (Longitudinal) | -0.2 to +0.2 G |
| `4` | `accel_z` | G | MPU6050 Accelerometer (Vertical) | 0.95 – 1.05 G |
| `5` | `g_force` | G | Vector magnitude $\sqrt{a_x^2 + a_y^2 + a_z^2}$ | 0.95 – 1.10 G |
| `6` | `gyro_x` | deg/s | MPU6050 Gyroscope (Roll rate) | -5.0 to +5.0 deg/s |
| `7` | `gyro_y` | deg/s | MPU6050 Gyroscope (Pitch rate) | -5.0 to +5.0 deg/s |
| `8` | `gyro_z` | deg/s | MPU6050 Gyroscope (Yaw rate) | -5.0 to +5.0 deg/s |
| `9` | `temp_chassis`| °C | DS18B20 1-Wire Digital Thermometer | 20.0 – 38.0 °C |

---

## 🏷️ Structural Health Target Classes

- **Class 0 (`SAFE`)**: Normal driving conditions, dynamic stress $< 20$ MPa, optimal vibration.
- **Class 1 (`WARNING`)**: Transient shocks (potholes, speed bumps, kerb contacts, elevated stress $25 - 50$ MPa).
- **Class 2 (`CRITICAL`)**: Severe collisions, permanent plastic strain yield, structural rupture ($> 65$ MPa, $> 4.0$ G shock, overheating $> 45^\circ\text{C}$).

---

## 🚀 Execution & Workflow Guide

### Step 1: Environment Setup
```powershell
# Inside AIML directory
cd "c:\Users\arulp\Downloads\TATA\HARDWARE SIMUL\AIML"
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Generate / Update Feature Dataset
```powershell
python 1_data/generate_shield_features.py
```

### Step 3: Train & Evaluate Models
```powershell
python train_model.py
```
*Output Summary:*
- 5-Fold Stratified Cross Validation: **100.0%**
- Macro F1-Score: **1.0000**
- Real-time Per-frame Latency: **< 35 ms** (Maximum Throughput: > 30-50 FPS at target 10 Hz)
- Artifacts exported to `2_models/`.

### Step 4: Run Real-Time Inference

#### Option A: With Live ESP32 Hardware
*(Ensure Arduino IDE Serial Monitor is **closed** before running)*
```powershell
python realtime_inference.py --port COM3 --baud 115200
```

#### Option B: Standalone Live Simulation Stream
```powershell
python realtime_inference.py --simulate --hz 10
```

---

## 📊 Live Logging & Output
Every frame prediction, anomaly score, confidence level, and feature telemetry is automatically logged to:
- [`1_data/live_inference_log.csv`](file:///c:/Users/arulp/Downloads/TATA/HARDWARE%20SIMUL/AIML/1_data/live_inference_log.csv)
