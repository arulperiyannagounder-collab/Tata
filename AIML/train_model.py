"""
EV Chassis Structural Health Monitoring System
Model Training & Artifact Generation Pipeline (train_model.py)

Responsibilities:
1. Load dataset from `1_data/shield_features.csv`.
2. Inspect and split features (10-vector) and target labels (health_state: 0=Safe, 1=Warning, 2=Critical).
3. Fit and persist feature standardizer -> `2_models/scaler.pkl`.
4. Train and tune multi-class Random Forest classifier -> `2_models/chassis_model.pkl`.
5. Output detailed evaluation metrics: Accuracy, Classification Report, Confusion Matrix, and Latency Benchmark.
"""

import os
import sys
import json
import time
import numpy as np
import pandas as pd
import joblib

# Ensure UTF-8 console output on Windows
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "1_data", "shield_features.csv")
MODELS_DIR = os.path.join(BASE_DIR, "2_models")
SCALER_FILE = os.path.join(MODELS_DIR, "scaler.pkl")
MODEL_FILE = os.path.join(MODELS_DIR, "chassis_model.pkl")
METADATA_FILE = os.path.join(MODELS_DIR, "metadata.json")

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

CLASS_LABELS = {
    0: "Safe",
    1: "Warning",
    2: "Critical"
}

def ensure_dataset():
    if not os.path.exists(DATA_PATH):
        print("[INFO] Dataset not found at 1_data/shield_features.csv. Generating synthetic telemetry...")
        from importlib.machinery import SourceFileLoader
        gen_path = os.path.join(BASE_DIR, "1_data", "generate_shield_features.py")
        gen_mod = SourceFileLoader("generate_shield_features", gen_path).load_module()
        gen_mod.generate_and_save_datasets()

def train():
    os.makedirs(MODELS_DIR, exist_ok=True)
    ensure_dataset()

    print(f"\n=======================================================")
    print(f"🚀 1. LOADING DATASET: {DATA_PATH}")
    print(f"=======================================================")
    df = pd.read_csv(DATA_PATH)
    print(f"[OK] Rows: {len(df)}, Features: {len(FEATURE_NAMES)}, Target: 'health_state'")
    
    # Class breakdown
    class_counts = df["health_state"].value_counts().sort_index()
    for c_id, count in class_counts.items():
        print(f"   - Class {c_id} ({CLASS_LABELS.get(c_id, 'Unknown')}): {count} samples ({count/len(df)*100:.1f}%)")

    # Features and Labels
    X = df[FEATURE_NAMES].values
    y = df["health_state"].values

    # Train / Test Stratified Split (80% Train, 20% Test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"\n[INFO] Train samples: {len(X_train)}, Test samples: {len(X_test)}")

    # 2. Fit and save Scaler
    print(f"\n=======================================================")
    print(f"⚙️ 2. PREPROCESSING & FEATURE SCALING")
    print(f"=======================================================")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    joblib.dump(scaler, SCALER_FILE)
    print(f"[OK] StandardScaler fitted and saved to: {SCALER_FILE}")

    # 3. Model Training
    print(f"\n=======================================================")
    print(f"🧠 3. TRAINING RANDOM FOREST CHASSIS HEALTH MODEL")
    print(f"=======================================================")
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        n_jobs=1
    )
    clf.fit(X_train_scaled, y_train)
    
    # 5-Fold Stratified Cross Validation
    cv_scores = cross_val_score(clf, X_train_scaled, y_train, cv=5)
    print(f"[OK] 5-Fold Cross-Validation Accuracy: {cv_scores.mean()*100:.2f}% (± {cv_scores.std()*100:.2f}%)")

    # 4. Evaluation
    y_pred = clf.predict(X_test_scaled)
    test_acc = accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(y_test, y_pred, average="macro")

    print(f"\n=======================================================")
    print(f"📊 4. MODEL EVALUATION METRICS (Test Accuracy: {test_acc*100:.2f}%)")
    print(f"=======================================================")
    target_names = [CLASS_LABELS[i] for i in sorted(CLASS_LABELS.keys())]
    
    print("\n--- Classification Report ---")
    print(classification_report(y_test, y_pred, target_names=target_names, digits=4))

    print("--- Confusion Matrix ---")
    cm = confusion_matrix(y_test, y_pred)
    header = f"{'Actual':<12} | " + " | ".join([f"Pred {t}" for t in target_names])
    print(header)
    print("-" * len(header))
    for i, row in enumerate(cm):
        print(f"{target_names[i]:<12} | " + " | ".join([f"{val:10d}" for val in row]))

    print("\n--- Feature Importance Ranking ---")
    importances = clf.feature_importances_
    indices = np.argsort(importances)[::-1]
    for rank, idx in enumerate(indices):
        print(f"   {rank+1:2d}. {FEATURE_NAMES[idx]:14s}: {importances[idx]*100:5.2f}%")

    # 5. Latency Benchmark
    sample_input = X_test_scaled[0:1]
    for _ in range(50):
        _ = clf.predict(sample_input)
    t0 = time.perf_counter()
    iterations = 500
    for _ in range(iterations):
        _ = clf.predict(sample_input)
    avg_latency_ms = ((time.perf_counter() - t0) / iterations) * 1000
    print(f"\n⚡ Single-Sample Inference Latency: {avg_latency_ms:.4f} ms per frame (Throughput: {1000.0/avg_latency_ms:.1f} FPS)")

    # 6. Save Model Artifact
    joblib.dump(clf, MODEL_FILE)
    print(f"[OK] Trained Chassis Model saved to: {MODEL_FILE}")

    # Metadata
    metadata = {
        "model_name": "chassis_model.pkl",
        "model_class": "RandomForestClassifier",
        "features": FEATURE_NAMES,
        "classes": CLASS_LABELS,
        "test_accuracy": round(float(test_acc), 4),
        "macro_f1": round(float(macro_f1), 4),
        "avg_latency_ms": round(float(avg_latency_ms), 4),
        "trained_samples": len(X_train),
        "test_samples": len(X_test),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=4)
    print(f"[OK] Metadata saved to: {METADATA_FILE}")
    print("\n🎉 Model Training and Packaging Complete!")

if __name__ == "__main__":
    train()
