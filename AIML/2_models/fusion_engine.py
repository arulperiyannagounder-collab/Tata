# fusion_engine.py — FIXED

import csv
import math
import json

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

# Handle feature dimension mismatch
if len(baseline_mean) != len(feature_names):
    print(f"WARNING: Dimension mismatch!")
    print(f"  Classifier features: {len(feature_names)}")
    print(f"  Baseline features:   {len(baseline_mean)}")
    print(f"  Using min dimension: {min(len(feature_names), len(baseline_mean))}")
    dim = min(len(feature_names), len(baseline_mean))
else:
    dim = len(feature_names)

def anomaly_score(f):
    zs = [abs(f[j] - baseline_mean[j]) / baseline_std[j] for j in range(dim)]
    return math.sqrt(sum(z*z for z in zs) / len(zs))

def frequency_shift(f):
    idx = [i for i, n in enumerate(feature_names[:dim]) if 'freq_shift' in n]
    if not idx: return 0.0
    return sum(abs(f[i]) for i in idx) / len(idx)

class PersistenceTracker:
    def __init__(self, window=5):
        self.window = window
        self.history = []
    def add(self, is_anom):
        self.history.append(is_anom)
        if len(self.history) > self.window:
            self.history.pop(0)
    def score(self):
        if not self.history: return 0.0
        return sum(self.history) / len(self.history)

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

def fusion_decision(features, tracker):
    label = classify(features)
    anom = anomaly_score(features)
    is_anom = anom > anomaly_threshold
    fs = frequency_shift(features)
    tracker.add(is_anom)
    persist = tracker.score()

    # Trust classifier first
    if label == 'INSPECTION':
        final, reason = 'INSPECTION', 'Classifier: INSPECTION'
    elif label == 'WATCH':
        final, reason = 'WATCH', 'Classifier: WATCH'
    elif label == 'NORMAL':
        final, reason = 'NORMAL', 'Classifier: NORMAL'
    # Only escalate via anomaly if classifier is uncertain
    elif anom > anomaly_threshold * 5 and persist > 0.7:
        final, reason = 'INSPECTION', 'Anomaly: very severe + persistent'
    elif is_anom and persist > 0.5:
        final, reason = 'WATCH', 'Anomaly: persistent deviation'
    elif fs > 5.0:
        final, reason = 'WATCH', f'Frequency: {fs:.1f} Hz'
    else:
        final, reason = 'NORMAL', 'All within baseline'

    return {
        'condition': final, 'reason': reason,
        'anomaly_score': anom, 'persistence': persist,
        'frequency_shift': fs, 'classifier_label': label
    }

print("=" * 60)
print("SHIELD — Fusion Engine Demo (FIXED)")
print("=" * 60)

with open('1_data/shield_features.csv', 'r') as f:
    data = list(csv.DictReader(f))

tracker = PersistenceTracker()
for cond in ['NORMAL', 'WATCH', 'INSPECTION']:
    samples = [r for r in data if r['condition'] == cond][:3]
    print(f"\n--- {cond} samples ---")
    for i, row in enumerate(samples):
        features = [float(row[f]) for f in feature_names]
        result = fusion_decision(features, tracker)
        icon = "✅" if result['condition'] == cond else "❌"
        print(f"{icon} Sample {i+1}: {result['condition']} ({result['reason']})")
        print(f"   Anomaly: {result['anomaly_score']:.2f} | "
              f"Freq: {result['frequency_shift']:.2f} | "
              f"Persist: {result['persistence']:.2f}")

print("\n" + "=" * 60)
print("✅ FUSION ENGINE COMPLETE (FIXED)")
print("=" * 60)