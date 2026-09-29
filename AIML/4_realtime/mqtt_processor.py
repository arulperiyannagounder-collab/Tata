# mqtt_processor.py
# SHIELD — Real-Time MQTT Data Processor

import paho.mqtt.client as mqtt
import json
import csv
import math
from datetime import datetime
from collections import deque

# ============================================================
# VIRTUAL DISPLACEMENT
# ============================================================

DISP_K = 0.023
DISP_BASE = 0.5
DISP_MAX = 15.0

def compute_virtual_displacement(sg_values):
    """Compute virtual displacement from strain (mm)."""
    if not sg_values:
        return 1.0
    avg_strain = sum(sg_values) / len(sg_values)
    disp = DISP_BASE + (avg_strain * DISP_K)
    return max(0.0, min(DISP_MAX, disp))

# ============================================================
# CONFIG
# ============================================================

MQTT_BROKER = "localhost"
MQTT_PORT = 1883
TOPIC_DATA = "shield/data"
TOPIC_ALERT = "shield/alert"

# ============================================================
# LOAD MODELS
# ============================================================

def load_json(fn):
    with open(fn) as f:
        return json.load(f)

classifier = load_json('2_models/shield_classifier.json')
baseline = load_json('2_models/shield_baseline.json')
threshold_data = load_json('2_models/shield_anomaly_threshold.json')

feature_names = classifier['feature_names']
baseline_mean = baseline['mean']
baseline_std = baseline['std']
anomaly_threshold = threshold_data['threshold']
dim = len(feature_names)

anomaly_history = deque(maxlen=10)
impacts = []

# ============================================================
# AI LOGIC
# ============================================================

def compute_virtual_displacement(sg_values):
    """
    Compute virtual displacement from strain values.
    No physical sensor needed — derived from strain physics.
    
    Using empirical relationship: disp = k × strain
    Where k ≈ 0.023 mm/µε (calibrated for mini chassis)
    """
    if not sg_values:
        return 1.0
    
    # Use average strain across all gauges
    avg_strain = sum(sg_values) / len(sg_values)
    
    # Empirical model (calibrated)
    k = 0.023  # mm per µε
    base_disp = 0.5  # baseline offset (mm)
    
    displacement = base_disp + (avg_strain * k)
    
    # Clamp to realistic range
    return max(0.0, min(15.0, displacement))

def anomaly_score(f):
    zs = [abs(f[j] - baseline_mean[j]) / baseline_std[j] for j in range(dim)]
    return math.sqrt(sum(z*z for z in zs) / len(zs))

def classify(f):
    means = classifier['means']
    stds = classifier['stds']
    norm = [(f[j] - means[j]) / stds[j] for j in range(dim)]

    def cosine(a, b):
        dot = sum(x*y for x, y in zip(a, b))
        na = math.sqrt(sum(x*x for x in a))
        nb = math.sqrt(sum(x*x for x in b))
        return dot/(na*nb) if (na*nb) > 0 else 0

    best, best_sim = None, -float('inf')
    for label, centroid in classifier['centroids'].items():
        sim = cosine(norm, centroid)
        if sim > best_sim:
            best_sim, best = sim, label
    return best

# ============================================================
# FEATURE BUILDING
# ============================================================

def build_features(data):
    sg = [data.get(f'sg{i}', 0) for i in range(1, 7)]
    lc1 = data.get('lc1', 25)
    lc2 = data.get('lc2', 25)
    imu1 = data.get('imu1', 0.4)
    imu2 = data.get('imu2', 0.4)
    temp = data.get('temp', 30)

    disp = compute_virtual_displacement(sg)

    strain_mean = sum(sg) / 6
    strain_max = max(sg)
    strain_std = (sum((x - strain_mean)**2 for x in sg) / 6) ** 0.5

    feature_dict = {
        'sg1_rms': sg[0], 'sg2_rms': sg[1],
        'sg3_rms': sg[2], 'sg4_rms': sg[3],
        'sg5_rms': sg[4], 'sg6_rms': sg[5],
        'sg1_std': strain_std, 'sg2_std': strain_std,
        'sg3_std': strain_std, 'sg4_std': strain_std,
        'sg5_std': strain_std, 'sg6_std': strain_std,
        'sg1_peak': sg[0] * 1.15, 'sg2_peak': sg[1] * 1.15,
        'sg3_peak': sg[2] * 1.15, 'sg4_peak': sg[3] * 1.15,
        'sg5_peak': sg[4] * 1.15, 'sg6_peak': sg[5] * 1.15,
        'sg1_kurtosis': -0.1, 'sg2_kurtosis': -0.1,
        'sg3_kurtosis': -0.1, 'sg4_kurtosis': -0.1,
        'sg5_kurtosis': -0.1, 'sg6_kurtosis': -0.1,
        'sg1_freq_shift': 0.0, 'sg2_freq_shift': 0.0,
        'sg3_freq_shift': 0.0, 'sg4_freq_shift': 0.0,
        'sg5_freq_shift': 0.0, 'sg6_freq_shift': 0.0,
        'lc1_mean': lc1, 'lc2_mean': lc2,
        'lc1_std': 0.5, 'lc2_std': 0.5,
        'load_imbalance': abs(lc1 - lc2),
        'load_total': lc1 + lc2,
        'imu1_rms': imu1, 'imu2_rms': imu2,
        'imu1_peak': imu1 * 1.3, 'imu2_peak': imu2 * 1.3,
        'imu1_std': imu1 * 0.1, 'imu2_std': imu2 * 0.1,
        'temp_mean': temp, 'temp_delta': 1.0,
        # VIRTUAL DISPLACEMENT (4)
        'disp_mean': disp,
        'disp_max': disp * 1.15,
        'disp_std': disp * 0.08,
        'disp_delta': disp * 0.15,
        # Composite (5)
        'strain_mean': strain_mean,
        'strain_max': strain_max,
        'strain_std': strain_std,
        'persistence_score': strain_mean / 42.0,
        'severity_score': strain_max / 42.0,
    }

    return [feature_dict.get(name, 0.0) for name in feature_names]

# ============================================================
# CSV LOGGING
# ============================================================

csv_initialized = False

def log_csv(result, data):
    global csv_initialized
    if not csv_initialized:
        with open('4_realtime/realtime_log.csv', 'w', newline='') as f:
            w = csv.writer(f)
            w.writerow([
                'timestamp', 'condition', 'anomaly_score', 'persistence',
                'sg1','sg2','sg3','sg4','sg5','sg6',
                'lc1','lc2','imu1','imu2','temp',
                'disp_virtual'
            ])
        csv_initialized = True

    sg = [data.get(f'sg{i}', 0) for i in range(1, 7)]
    disp = compute_virtual_displacement(sg)

    with open('4_realtime/realtime_log.csv', 'a', newline='') as f:
        w = csv.writer(f)
        w.writerow([
            datetime.now().isoformat(), result['condition'],
            round(result['anomaly_score'], 4), round(result['persistence'], 4),
            data.get('sg1',0), data.get('sg2',0), data.get('sg3',0),
            data.get('sg4',0), data.get('sg5',0), data.get('sg6',0),
            data.get('lc1',0), data.get('lc2',0),
            data.get('imu1',0), data.get('imu2',0), data.get('temp',0),
            round(disp, 3)
        ])

# ============================================================
# MQTT CALLBACKS
# ============================================================

def on_connect(client, userdata, flags, rc):
    print(f"Connected (rc={rc})")
    client.subscribe(TOPIC_DATA)
    client.subscribe(TOPIC_ALERT)
    print(f"Subscribed: {TOPIC_DATA}, {TOPIC_ALERT}")

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
    except:
        return

    if msg.topic == TOPIC_DATA:
        features = build_features(data)
        label = classify(features)
        anom = anomaly_score(features)
        is_anom = anom > anomaly_threshold

        anomaly_history.append(1 if is_anom else 0)
        persist = sum(anomaly_history) / len(anomaly_history)

        if anom > 150:
            final = 'INSPECTION'
        elif anom > 30:
            final = 'WATCH'
        else:
            final = 'NORMAL'
            
        result = {
            'condition': final,
            'anomaly_score': anom,
            'persistence': persist,
            'classifier_label': label
        }

        log_csv(result, data)

        icon = {'NORMAL': '🟢', 'WATCH': '🟡', 'INSPECTION': '🔴'}[final]
        sg_vals = [data.get(f'sg{i}', 0) for i in range(1, 7)]
        disp = compute_virtual_displacement(sg_vals)
        print(f"{icon} {final:<12} anom={anom:.2f} persist={persist:.2f} "f"sg1={data.get('sg1',0):.1f} disp={disp:.2f}mm")

    elif msg.topic == TOPIC_ALERT:
        impacts.append(data)
        print(f"\n⚠️ IMPACT: {data}\n")

# ============================================================
# MAIN
# ============================================================

def main():
    print("=" * 60)
    print("SHIELD — Real-Time MQTT Processor")
    print("=" * 60)
    print(f"Broker: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"Topics: {TOPIC_DATA}, {TOPIC_ALERT}")
    print("\nWaiting for ESP32 data...\n")

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT, 60)

    try:
        client.loop_forever()
    except KeyboardInterrupt:
        print(f"\nImpacts detected: {len(impacts)}")

if __name__ == "__main__":
    main()