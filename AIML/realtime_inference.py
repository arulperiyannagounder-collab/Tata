"""
EV Chassis Structural Health Monitoring System
Production Real-Time Inference & Logging Pipeline (realtime_inference.py)

Responsibilities:
1. Ingest live 10-feature telemetry from ESP32-C3 over USB Serial COM port @ 115200 Baud (10 Hz).
2. Load fitted scaler (`2_models/scaler.pkl`) and trained model (`2_models/chassis_model.pkl`).
3. Scale the incoming 10-feature vector and perform sub-millisecond ML inference.
4. Output a live colorized console dashboard with sensor metrics, structural health status (SAFE, WARNING, CRITICAL), and confidence levels.
5. Append raw telemetry readings, timestamps, and predicted states to `1_data/live_shield_telemetry.csv`.
"""

import os
import sys
import time
import argparse
import csv
import math
from datetime import datetime
import joblib
import numpy as np

# Ensure UTF-8 stdout encoding on Windows
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Safe serial & terminal styling imports
try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False

try:
    from colorama import init, Fore, Back, Style
    init(autoreset=True)
    COLOR_SUPPORT = True
except ImportError:
    COLOR_SUPPORT = False
    class EmptyColor:
        def __getattr__(self, name):
            return ""
    Fore = Back = Style = EmptyColor()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "2_models")
DATA_DIR = os.path.join(BASE_DIR, "1_data")
SCALER_PATH = os.path.join(MODELS_DIR, "scaler.pkl")
MODEL_PATH = os.path.join(MODELS_DIR, "chassis_model.pkl")
TELEMETRY_LOG_FILE = os.path.join(DATA_DIR, "live_shield_telemetry.csv")

FEATURE_NAMES = [
    "weight_kg",
    "stress_mpa",
    "accel_x",
    "accel_y",
    "accel_z",
    "g_force",
    "gyro_x",
    "gyro_y",
    "gyro_z",
    "temp_chassis"
]

STATUS_DISPLAY = {
    0: ("SAFE", Fore.GREEN, "[ SAFE - NORMAL STATE ]"),
    1: ("WARNING", Fore.YELLOW, "[ WARNING - ELEVATED STRESS ]"),
    2: ("CRITICAL", Fore.RED, "[ CRITICAL - STRUCTURAL DAMAGE ]")
}

def auto_detect_esp32_port():
    if not SERIAL_AVAILABLE:
        return "COM5"
    try:
        ports = list(serial.tools.list_ports.comports())
        for p in ports:
            desc = (p.description or "").lower()
            if any(key in desc for key in ["ch340", "cp210", "esp32", "usb-serial", "arduino", "cdc"]):
                return p.device
        if ports:
            return ports[0].device
    except Exception:
        pass
    return "COM5"

class RealtimeChassisMonitor:
    def __init__(self):
        self.scaler = None
        self.model = None
        self.frame_index = 0
        self.load_model_artifacts()
        self.init_telemetry_file()

    def load_model_artifacts(self):
        if not (os.path.exists(SCALER_PATH) and os.path.exists(MODEL_PATH)):
            print(f"{Fore.YELLOW}[WARN] Required artifacts not found in {MODELS_DIR}.")
            print(f"{Fore.CYAN}[INFO] Automatically invoking train_model.py to build artifacts...")
            from importlib.machinery import SourceFileLoader
            train_script = os.path.join(BASE_DIR, "train_model.py")
            train_mod = SourceFileLoader("train_model", train_script).load_module()
            train_mod.train()

        self.scaler = joblib.load(SCALER_PATH)
        self.model = joblib.load(MODEL_PATH)
        print(f"{Fore.GREEN}[OK] Successfully loaded {SCALER_PATH}")
        print(f"{Fore.GREEN}[OK] Successfully loaded {MODEL_PATH}")

    def init_telemetry_file(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        if not os.path.exists(TELEMETRY_LOG_FILE):
            with open(TELEMETRY_LOG_FILE, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                header = ["timestamp"] + FEATURE_NAMES + ["predicted_health", "status_label", "confidence_pct", "inference_latency_ms"]
                writer.writerow(header)
            print(f"{Fore.CYAN}[OK] Initialized live telemetry log at: {TELEMETRY_LOG_FILE}")

    def process_telemetry_frame(self, raw_readings: list) -> dict:
        t_start = time.perf_counter()

        # 1. Scale incoming readings
        feat_array = np.array(raw_readings, dtype=np.float32).reshape(1, -1)
        scaled_features = self.scaler.transform(feat_array)

        # 2. Run Model Inference
        pred_class = int(self.model.predict(scaled_features)[0])
        probas = self.model.predict_proba(scaled_features)[0]
        confidence = float(probas[pred_class]) * 100.0
        
        latency_ms = (time.perf_counter() - t_start) * 1000.0

        return {
            "features": raw_readings,
            "pred_class": pred_class,
            "status_label": STATUS_DISPLAY[pred_class][0],
            "badge_text": STATUS_DISPLAY[pred_class][2],
            "color": STATUS_DISPLAY[pred_class][1],
            "confidence": confidence,
            "latency_ms": latency_ms
        }

    def log_telemetry_row(self, timestamp: str, result: dict):
        try:
            with open(TELEMETRY_LOG_FILE, mode="a", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                row = [timestamp] + result["features"] + [
                    result["pred_class"],
                    result["status_label"],
                    f"{result['confidence']:.2f}",
                    f"{result['latency_ms']:.3f}"
                ]
                writer.writerow(row)
                f.flush()
        except Exception as e:
            print(f"{Fore.RED}[ERROR] Failed to write to telemetry CSV: {e}")

    def display_status(self, timestamp: str, result: dict):
        self.frame_index += 1
        f = result["features"]
        color = result["color"]
        badge = f"{color}{Style.BRIGHT}{result['badge_text']}{Style.RESET_ALL}"

        # Status advisory
        if result["pred_class"] == 0:
            advice = f"{Fore.GREEN}Structural state nominal. Stress & vibrations within safe limits."
        elif result["pred_class"] == 1:
            advice = f"{Fore.YELLOW}Dynamic overload / road shock event. Monitor chassis deflection."
        else:
            advice = f"{Fore.RED}{Style.BRIGHT}CRITICAL IMPACT OR YIELD! IMMEDIATE INSPECTION REQUIRED!"

        print("=" * 90)
        print(f"📡 Frame #{self.frame_index:05d} | ⏰ {timestamp} | ⚡ Latency: {result['latency_ms']:.3f} ms")
        print(f"📊 Load Cell & Stress: Load = {f[0]:6.1f} kg | Stress = {f[1]:6.2f} MPa | Temp = {f[9]:4.1f} °C")
        print(f"📐 6-DOF IMU:         Accel = [X:{f[2]:+5.2f}, Y:{f[3]:+5.2f}, Z:{f[4]:+5.2f}] G (Total: {f[5]:4.2f} G)")
        print(f"                      Gyro  = [X:{f[6]:+5.1f}, Y:{f[7]:+5.1f}, Z:{f[8]:+5.1f}] deg/s")
        print(f"🤖 Health Prediction: {badge} (Confidence: {result['confidence']:.1f}%)")
        print(f"🚨 Operational Advisory: {advice}")

def start_serial_stream(monitor: RealtimeChassisMonitor, port: str, baud: int = 115200):
    if not SERIAL_AVAILABLE:
        print(f"{Fore.RED}[ERROR] 'pyserial' is not installed. Please run: pip install pyserial")
        return

    print(f"\n{Fore.CYAN}🔌 Connecting to ESP32 on port {port} @ {baud} Baud...")
    print(f"{Fore.WHITE}👉 Note: Please ensure Arduino IDE Serial Monitor is CLOSED.")

    try:
        ser = serial.Serial(port, baud, timeout=1.0)
        time.sleep(2.0)  # ESP32 initialization delay
        ser.reset_input_buffer()
        print(f"{Fore.GREEN}[OK] Connected! Ingesting live 10 Hz telemetry...\n")

        while True:
            if ser.in_waiting > 0:
                raw_line = ser.readline().decode("utf-8", errors="ignore").strip()
                if not raw_line:
                    continue

                parts = raw_line.split(",")
                if len(parts) == 10:
                    try:
                        readings = [float(val) for val in parts]
                        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
                        result = monitor.process_telemetry_frame(readings)
                        monitor.display_status(timestamp, result)
                        monitor.log_telemetry_row(timestamp, result)
                    except ValueError:
                        continue
    except serial.SerialException as err:
        print(f"{Fore.RED}\n[ERROR] Serial Communication Error: {err}")
        print(f"{Fore.YELLOW}[HINT] Check that ESP32 is connected to {port} and not open in another application.")
    except KeyboardInterrupt:
        print(f"{Fore.YELLOW}\n[STOP] Real-time monitoring stopped by user.")
    finally:
        if "ser" in locals() and ser.is_open:
            ser.close()
            print(f"{Fore.GREEN}[CLOSED] Serial port safely closed.")

def start_simulated_stream(monitor: RealtimeChassisMonitor, hz: float = 10.0, max_frames: int = None):
    print(f"\n{Fore.CYAN}[SIMULATOR] Starting Real-Time Telemetry Simulation Stream @ {hz} Hz...")
    print(f"{Fore.CYAN}[INFO] Cycles: NORMAL -> POTHOLE -> MINOR_IMPACT -> MAJOR_IMPACT -> STRUCTURAL_DAMAGE")
    print(f"{Fore.WHITE}Press Ctrl+C to stop.\n")

    dt = 1.0 / hz
    scenarios = ["NORMAL", "POTHOLE", "MINOR_IMPACT", "MAJOR_IMPACT", "STRUCTURAL_DAMAGE"]
    scenario_idx = 0
    ticks = 0
    ticks_per_scenario = 50
    t = 0.0
    rendered = 0

    while True:
        try:
            scenario = scenarios[scenario_idx]
            ticks += 1
            if ticks > ticks_per_scenario:
                scenario_idx = (scenario_idx + 1) % len(scenarios)
                ticks = 0

            t += dt
            noise = lambda: float(np.random.normal(0, 0.02))

            if scenario == "NORMAL":
                ax = 0.01 * math.cos(t * 0.8) + noise()
                ay = 0.02 * math.sin(t * 1.1) + noise()
                az = 1.00 + 0.03 * math.sin(t * 1.5) + noise()
                gx, gy, gz = float(np.random.normal(0, 0.5)), float(np.random.normal(0, 0.5)), 0.5 * math.sin(t * 0.3)
                strain = 45.0 + 15.0 * math.sin(t * 2.0)
                temp = 24.5 + 1.5 * math.sin(t * 0.05)
            elif scenario == "POTHOLE":
                shock = math.exp(-((ticks % 25) * dt * 3.5)) * math.sin((ticks % 25) * dt * 32 * math.pi)
                ax = 0.3 * shock + noise()
                ay = 0.6 * shock + noise()
                az = 1.0 + 2.8 * shock + noise()
                gx, gy, gz = 15.0 * shock, 20.0 * shock, 8.0 * shock
                strain = 80.0 + 260.0 * abs(shock)
                temp = 25.5
            elif scenario == "MINOR_IMPACT":
                shock = math.exp(-((ticks % 40) * dt * 2.2)) * math.sin((ticks % 40) * dt * 24 * math.pi)
                ax = 4.2 * shock + noise()
                ay = 2.8 * shock + noise()
                az = 1.0 + 1.8 * shock + noise()
                gx, gy, gz = 35.0 * shock, 42.0 * shock, 18.0 * shock
                strain = 150.0 + 450.0 * abs(shock)
                temp = 27.5
            elif scenario == "MAJOR_IMPACT":
                shock = math.exp(-((ticks % 60) * dt * 1.2)) * math.sin((ticks % 60) * dt * 16 * math.pi)
                ax = 8.5 * shock + noise()
                ay = 6.2 * shock + noise()
                az = 1.0 + 3.8 * shock + noise()
                gx, gy, gz = 65.0 * shock, 75.0 * shock, 35.0 * shock
                strain = 650.0 + 1200.0 * abs(shock)
                temp = 32.0 + (ticks * 0.05)
            else: # STRUCTURAL_DAMAGE
                ax = 0.6 * math.sin(t * 3.0) + noise()
                ay = 0.5 * math.cos(t * 2.5) + noise()
                az = 1.0 + 0.4 * math.sin(t * 4.0) + noise()
                gx, gy, gz = 8.0, 12.0, 5.0
                strain = 1250.0 + 80.0 * math.sin(t * 2.0)
                temp = 42.0

            weight_kg = strain * 4.5
            stress_mpa = strain * 0.21
            g_force = math.sqrt(ax**2 + ay**2 + az**2)

            readings = [
                round(float(weight_kg), 2),
                round(float(stress_mpa), 3),
                round(float(ax), 3),
                round(float(ay), 3),
                round(float(az), 3),
                round(float(g_force), 3),
                round(float(gx), 2),
                round(float(gy), 2),
                round(float(gz), 2),
                round(float(temp), 2)
            ]

            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
            result = monitor.process_telemetry_frame(readings)
            monitor.display_status(timestamp, result)
            monitor.log_telemetry_row(timestamp, result)

            rendered += 1
            if max_frames and rendered >= max_frames:
                break

            time.sleep(dt)
        except KeyboardInterrupt:
            print(f"\n{Fore.YELLOW}[STOP] Simulation stopped by user.")
            break

def main():
    parser = argparse.ArgumentParser(description="Real-Time EV Chassis Structural Health Inference")
    parser.add_argument("--port", type=str, default=None, help="Serial COM Port (e.g. COM5, COM4, /dev/ttyUSB0)")
    parser.add_argument("--baud", type=int, default=115200, help="Serial Baud Rate (default: 115200)")
    parser.add_argument("--simulate", "--sim", action="store_true", help="Run simulated 10 Hz telemetry stream")
    parser.add_argument("--hz", type=float, default=10.0, help="Sampling frequency (default: 10.0 Hz)")
    parser.add_argument("--max-frames", type=int, default=None, help="Stop after N frames (for validation testing)")

    args = parser.parse_args()
    monitor = RealtimeChassisMonitor()

    if args.simulate:
        start_simulated_stream(monitor, hz=args.hz, max_frames=args.max_frames)
    else:
        port = args.port or auto_detect_esp32_port()
        if not port:
            print(f"{Fore.YELLOW}[WARN] No active ESP32 COM port detected. Switching to --simulate mode...")
            start_simulated_stream(monitor, hz=args.hz, max_frames=args.max_frames)
        else:
            print(f"{Fore.CYAN}[PORT] Active Port: {port}")
            start_serial_stream(monitor, port=port, baud=args.baud)

if __name__ == "__main__":
    main()
