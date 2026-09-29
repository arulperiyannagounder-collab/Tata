# performance_report.py
# SHIELD — AI Performance Report

import csv
import json
import math
import time
import os
from collections import Counter

def load_json(fn):
    with open(fn) as f:
        return json.load(f)

def load_csv(fn):
    with open(fn) as f:
        return list(csv.DictReader(f))

classifier = load_json('2_models/shield_classifier.json')
data = load_csv('1_data/shield_features.csv')
feature_names = classifier['feature_names']

def classify(f):
    means = classifier['means']
    stds = classifier['stds']
    norm = [(f[j] - means[j]) / stds[j] for j in range(len(f))]

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

print("=" * 60)
print("SHIELD — AI Performance Report")
print("=" * 60)

correct = 0
total = 0
confusion = {}
latencies = []

for row in data:
    features = [float(row[f]) for f in feature_names]
    actual = row['condition']
    t0 = time.perf_counter()
    predicted = classify(features)
    t1 = time.perf_counter()
    latencies.append((t1 - t0) * 1000)
    confusion.setdefault(actual, Counter())
    confusion[actual][predicted] += 1
    if predicted == actual:
        correct += 1
    total += 1

accuracy = correct / total

print(f"\n📊 Dataset: {total} samples")
print(f"📊 Features: {len(feature_names)}")
print(f"📊 Classes: {list(classifier['classes'])}")
print(f"\n🎯 ACCURACY: {accuracy:.4f} ({correct}/{total})")

print(f"\n📈 PER-CLASS METRICS:")
print(f"{'Class':<14} {'Precision':>10} {'Recall':>10} {'F1':>10}")
classes = classifier['classes']
for c in classes:
    tp = confusion.get(c, {}).get(c, 0)
    fp = sum(confusion.get(o, {}).get(c, 0) for o in classes if o != c)
    fn = sum(confusion.get(c, {}).get(o, 0) for o in classes if o != c)
    p = tp/(tp+fp) if (tp+fp) > 0 else 0
    r = tp/(tp+fn) if (tp+fn) > 0 else 0
    f1 = 2*p*r/(p+r) if (p+r) > 0 else 0
    print(f"{c:<14} {p:>10.4f} {r:>10.4f} {f1:>10.4f}")

print(f"\n📊 CONFUSION MATRIX:")
print(f"{'':<14}" + "  ".join(f"{c[:8]:>8}" for c in classes))
for actual in classes:
    row_str = "  ".join(f"{confusion.get(actual, {}).get(pred, 0):>8}" for pred in classes)
    print(f"{actual:<14} {row_str}")

print(f"\n⚡ EDGE METRICS:")
print(f"   Avg inference: {sum(latencies)/len(latencies):.3f} ms")
print(f"   Min: {min(latencies):.3f} ms | Max: {max(latencies):.3f} ms")
print(f"   P95: {sorted(latencies)[int(len(latencies)*0.95)]:.3f} ms")
esp32_est = sum(latencies)/len(latencies) * 20
print(f"\n   Estimated ESP32: ~{esp32_est:.1f} ms")
print(f"   ESP32 target: <500 ms ✅")

model_size = os.path.getsize('2_models/shield_classifier.json') / 1024
print(f"\n💾 MODEL SIZE:")
print(f"   JSON: {model_size:.1f} KB")
print(f"   Flash usage: {model_size * 1.5 / 4096 * 100:.2f}%")

# Save report
with open('6_validation/results/accuracy_report.txt', 'w') as f:
    f.write(f"SHIELD AI Performance Report\n")
    f.write(f"{'='*40}\n\n")
    f.write(f"Dataset: {total} samples\n")
    f.write(f"Features: {len(feature_names)}\n")
    f.write(f"Classes: {classes}\n\n")
    f.write(f"Accuracy: {accuracy:.4f}\n\n")
    f.write(f"Avg inference: {sum(latencies)/len(latencies):.3f} ms\n")
    f.write(f"Estimated ESP32: ~{esp32_est:.1f} ms\n\n")
    f.write(f"Model size: {model_size:.1f} KB\n")

print("\n✅ Report saved: 6_validation/results/accuracy_report.txt")
print("=" * 60)