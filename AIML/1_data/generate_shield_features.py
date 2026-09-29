"""
EV Chassis Structural Health Monitoring System
Feature Generator & Dataset Synthesizer (1_data/generate_shield_features.py)

Generates high-fidelity physics-based telemetry logs for:
- Safe Driving (Normal load & vibration) -> Class 0 (Safe)
- Potholes & Road Disturbances -> Class 1 (Warning)
- Minor Impulses / Overload -> Class 1 (Warning)
- Major Impact Collisions -> Class 2 (Critical)
- Permanent Plastic Deformation & Structural Yield -> Class 2 (Critical)

Exports:
- 1_data/shield_raw_data.csv
- 1_data/shield_features.csv
"""

import os
import sys
import math
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# Ensure UTF-8 stdout encoding on Windows
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DATA_PATH = os.path.join(DATA_DIR, "shield_raw_data.csv")
FEATURES_DATA_PATH = os.path.join(DATA_DIR, "shield_features.csv")

FEATURE_COLUMNS = [
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

def generate_chassis_telemetry(num_samples: int = 5000, sample_rate_hz: float = 10.0) -> pd.DataFrame:
    """
    Simulates realistic EV chassis multi-sensor telemetry across various operating profiles.
    """
    dt = 1.0 / sample_rate_hz
    records = []
    
    current_time = datetime(2026, 9, 27, 8, 0, 0)
    
    scenarios = [
        ("NORMAL", int(num_samples * 0.65)),
        ("POTHOLE", int(num_samples * 0.12)),
        ("MINOR_IMPACT", int(num_samples * 0.08)),
        ("MAJOR_IMPACT", int(num_samples * 0.08)),
        ("STRUCTURAL_DAMAGE", int(num_samples * 0.07))
    ]
    
    total_idx = 0
    
    for scenario_name, count in scenarios:
        baseline_temp = 24.5
        plastic_strain = 0.0
        
        if scenario_name == "MAJOR_IMPACT":
            plastic_strain = 550.0
            baseline_temp = 32.0
        elif scenario_name == "STRUCTURAL_DAMAGE":
            plastic_strain = 1200.0
            baseline_temp = 42.0

        for i in range(count):
            t = total_idx * dt
            total_idx += 1
            current_time += timedelta(seconds=dt)
            
            noise_acc = float(np.random.normal(0, 0.02))
            noise_gyro = float(np.random.normal(0, 0.5))
            noise_strain = float(np.random.normal(0, 2.0))
            
            if scenario_name == "NORMAL":
                accel_x = 0.01 * math.cos(t * 0.8) + noise_acc
                accel_y = 0.02 * math.sin(t * 1.1) + noise_acc
                accel_z = 1.00 + 0.03 * math.sin(t * 1.5) + noise_acc
                
                gyro_x = noise_gyro
                gyro_y = noise_gyro
                gyro_z = 0.5 * math.sin(t * 0.3) + noise_gyro
                
                dynamic_strain = 15.0 * math.sin(t * 2.0) + noise_strain
                total_strain_ue = max(10.0, dynamic_strain + 45.0)
                weight_kg = total_strain_ue * 4.2 + float(np.random.normal(0, 1.5))
                stress_mpa = max(1.0, total_strain_ue * 0.21)
                
                temp_chassis = baseline_temp + 2.0 * math.sin(t * 0.05) + float(np.random.normal(0, 0.1))
                health_state = 0  # Safe
                
            elif scenario_name == "POTHOLE":
                decay = math.exp(-((i % 40) * dt * 3.5))
                shock_osc = math.sin((i % 40) * dt * 16.0 * math.pi * 2)
                
                accel_x = (0.4 * shock_osc * decay) + noise_acc
                accel_y = (0.8 * shock_osc * decay) + noise_acc
                accel_z = 1.0 + (2.6 * shock_osc * decay) + noise_acc
                
                gyro_x = (15.0 * shock_osc * decay) + noise_gyro
                gyro_y = (20.0 * shock_osc * decay) + noise_gyro
                gyro_z = (8.0 * shock_osc * decay) + noise_gyro
                
                dynamic_strain = 220.0 * shock_osc * decay + noise_strain
                total_strain_ue = max(20.0, dynamic_strain + 75.0)
                weight_kg = total_strain_ue * 4.2
                stress_mpa = max(4.0, total_strain_ue * 0.21)
                
                temp_chassis = baseline_temp + 1.0 + float(np.random.normal(0, 0.15))
                health_state = 1 if (stress_mpa > 25.0 or abs(accel_z - 1.0) > 1.2) else 0
                
            elif scenario_name == "MINOR_IMPACT":
                decay = math.exp(-((i % 60) * dt * 2.2))
                shock_osc = math.sin((i % 60) * dt * 12.0 * math.pi * 2)
                
                accel_x = (4.2 * shock_osc * decay) + noise_acc
                accel_y = (2.8 * shock_osc * decay) + noise_acc
                accel_z = 1.0 + (1.8 * shock_osc * decay) + noise_acc
                
                gyro_x = (35.0 * shock_osc * decay) + noise_gyro
                gyro_y = (42.0 * shock_osc * decay) + noise_gyro
                gyro_z = (18.0 * shock_osc * decay) + noise_gyro
                
                dynamic_strain = 450.0 * shock_osc * decay + noise_strain
                total_strain_ue = max(30.0, dynamic_strain + 160.0)
                weight_kg = total_strain_ue * 4.5
                stress_mpa = max(8.0, total_strain_ue * 0.21)
                
                temp_chassis = 28.5 + float(np.random.normal(0, 0.2))
                health_state = 1  # Warning
                
            elif scenario_name == "MAJOR_IMPACT":
                decay = math.exp(-((i % 80) * dt * 1.2))
                shock_osc = math.sin((i % 80) * dt * 8.0 * math.pi * 2)
                
                accel_x = (8.5 * shock_osc * decay) + float(np.random.normal(0, 0.1))
                accel_y = (6.2 * shock_osc * decay) + float(np.random.normal(0, 0.1))
                accel_z = 1.0 + (3.8 * shock_osc * decay) + float(np.random.normal(0, 0.1))
                
                gyro_x = (65.0 * shock_osc * decay) + noise_gyro * 2
                gyro_y = (75.0 * shock_osc * decay) + noise_gyro * 2
                gyro_z = (35.0 * shock_osc * decay) + noise_gyro * 2
                
                dynamic_strain = 1200.0 * shock_osc * decay
                total_strain_ue = max(80.0, plastic_strain + dynamic_strain + noise_strain)
                weight_kg = total_strain_ue * 5.0
                stress_mpa = max(25.0, total_strain_ue * 0.21)
                
                temp_chassis = baseline_temp + 0.05 * (i % 80) + float(np.random.normal(0, 0.2))
                health_state = 2  # Critical
                
            else: # STRUCTURAL_DAMAGE
                accel_x = 0.6 * math.sin(t * 3.0) + float(np.random.normal(0, 0.1))
                accel_y = 0.5 * math.cos(t * 2.5) + float(np.random.normal(0, 0.1))
                accel_z = 1.0 + 0.4 * math.sin(t * 4.0) + float(np.random.normal(0, 0.1))
                
                gyro_x = 8.0 * math.sin(t * 2.0) + noise_gyro
                gyro_y = 12.0 * math.cos(t * 2.2) + noise_gyro
                gyro_z = 5.0 * math.sin(t * 1.5) + noise_gyro
                
                total_strain_ue = plastic_strain + 80.0 * math.sin(t * 2.0) + noise_strain
                weight_kg = total_strain_ue * 5.2
                stress_mpa = max(65.0, total_strain_ue * 0.21)
                
                temp_chassis = baseline_temp + min(12.0, (i * 0.03)) + float(np.random.normal(0, 0.2))
                health_state = 2  # Critical
                
            g_force = math.sqrt(accel_x**2 + accel_y**2 + accel_z**2)
            
            records.append({
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
                "scenario": scenario_name,
                "weight_kg": round(float(weight_kg), 2),
                "stress_mpa": round(float(stress_mpa), 3),
                "accel_x": round(float(accel_x), 3),
                "accel_y": round(float(accel_y), 3),
                "accel_z": round(float(accel_z), 3),
                "g_force": round(float(g_force), 3),
                "gyro_x": round(float(gyro_x), 2),
                "gyro_y": round(float(gyro_y), 2),
                "gyro_z": round(float(gyro_z), 2),
                "temp_chassis": round(float(temp_chassis), 2),
                "health_state": int(health_state)
            })
            
    df = pd.DataFrame(records)
    return df

def generate_and_save_datasets(num_samples: int = 6000):
    print(f"[DATA] Synthesizing {num_samples} EV Chassis Telemetry samples...")
    df = generate_chassis_telemetry(num_samples=num_samples)
    
    os.makedirs(DATA_DIR, exist_ok=True)
    df.to_csv(RAW_DATA_PATH, index=False)
    print(f"[OK] Raw Telemetry saved to: {RAW_DATA_PATH} ({len(df)} rows)")
    
    feature_df = df[FEATURE_COLUMNS + ["health_state"]]
    feature_df.to_csv(FEATURES_DATA_PATH, index=False)
    print(f"[OK] Training Feature Dataset saved to: {FEATURES_DATA_PATH}")
    
    dist = feature_df["health_state"].value_counts().to_dict()
    print(f"[INFO] Class Distribution:")
    print(f"   - Class 0 (Safe):     {dist.get(0, 0)} samples ({dist.get(0,0)/len(df)*100:.1f}%)")
    print(f"   - Class 1 (Warning):  {dist.get(1, 0)} samples ({dist.get(1,0)/len(df)*100:.1f}%)")
    print(f"   - Class 2 (Critical): {dist.get(2, 0)} samples ({dist.get(2,0)/len(df)*100:.1f}%)")

if __name__ == "__main__":
    generate_and_save_datasets()
