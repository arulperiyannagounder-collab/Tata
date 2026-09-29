# anomaly_detector.py — FIXED
# Use classifier's feature_names (post-filtering)

import csv
import math
import json

def load_json(fn):
    with open(fn) as f:
        return json.load(f)

def load_csv(filename):
    with open(filename, 'r') as f:
        return list(csv.DictReader(f))

print("=" * 60)
print("SHIELD — Anomaly Detection (FIXED)")
print("=" * 60)

# Load classifier to get its feature names
classifier = load_json('2_models/shield_classifier.json')
feature_names = classifier['feature_names']

data = load_csv('1_data/shield_features.csv')

print(f"Using {len(feature_names)} features from classifier")

# Compute baseline from NORMAL samples only
normal = [[float(row[f]) for f in feature_names]
          for row in data if row['condition'] == 'NORMAL']

print(f"Baseline from {len(normal)} NORMAL samples")

n = len(normal)
dim = len(feature_names)
b_mean = [sum(normal[i][j] for i in range(n))/n for j in range(dim)]
b_std = []
for j in range(dim):
    var = sum((normal[i][j] - b_mean[j])**2 for i in range(n)) / n
    b_std.append(math.sqrt(var) if var > 0.001 else 1.0)

baseline = {
    'feature_names': feature_names,
    'mean': b_mean,
    'std': b_std,
    'sample_count': n
}
with open('2_models/shield_baseline.json', 'w') as f:
    json.dump(baseline, f, indent=2)

print("Baseline saved: 2_models/shield_baseline.json")

def anomaly_score(features):
    zs = [abs(features[j] - b_mean[j]) / b_std[j] for j in range(dim)]
    return math.sqrt(sum(z**2 for z in zs) / len(zs))

by_cond = {}
for row in data:
    features = [float(row[f]) for f in feature_names]
    score = anomaly_score(features)
    by_cond.setdefault(row['condition'], []).append(score)

print("\nAnomaly scores by condition:")
print(f"{'Condition':<14} {'Mean':>10} {'Max':>10} {'Count':>8}")
for cond in sorted(by_cond.keys()):
    scores = by_cond[cond]
    print(f"{cond:<14} {sum(scores)/len(scores):>10.4f} {max(scores):>10.4f} {len(scores):>8}")

normal_scores = by_cond.get('NORMAL', [])
threshold = sorted(normal_scores)[int(len(normal_scores)*0.99)] if normal_scores else 5.0
if threshold < 2.0:
    threshold = 2.0

print(f"\nThreshold (99th percentile, min 2.0): {threshold:.4f}")
for cond in ['WATCH', 'INSPECTION']:
    if cond in by_cond:
        above = sum(1 for s in by_cond[cond] if s > threshold)
        total = len(by_cond[cond])
        print(f"  {cond}: {above}/{total} ({above/total*100:.0f}%) above")

threshold_data = {
    'threshold': threshold,
    'baseline_file': 'shield_baseline.json'
}
with open('2_models/shield_anomaly_threshold.json', 'w') as f:
    json.dump(threshold_data, f, indent=2)

print("\nAnomaly threshold saved: 2_models/shield_anomaly_threshold.json")
print("=" * 60)
print("✅ ANOMALY DETECTOR COMPLETE (FIXED)")
print("=" * 60)