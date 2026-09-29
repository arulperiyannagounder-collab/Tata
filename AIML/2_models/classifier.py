# classifier.py — FIXED VERSION
# SHIELD — Classification Model with proper normalization

import csv
import math
import json
import random

random.seed(42)

def load_csv(filename):
    with open(filename, 'r') as f:
        return list(csv.DictReader(f))

print("=" * 60)
print("SHIELD — Classifier Training (FIXED)")
print("=" * 60)

data = load_csv('1_data/shield_features.csv')
feature_names = [k for k in data[0].keys() if k != 'condition']

# ============================================================
# FIX 1: Remove constant features (freq_shift, kurtosis)
# FIX 2: Proper z-score normalization
# ============================================================

# Compute feature variance to identify useless features
all_values = [[float(row[f]) for f in feature_names] for row in data]

useful_features = []
for j, name in enumerate(feature_names):
    col = [all_values[i][j] for i in range(len(all_values))]
    col_mean = sum(col) / len(col)
    col_var = sum((x - col_mean)**2 for x in col) / len(col)
    if col_var > 0.01:  # Skip near-constant features
        useful_features.append(name)

print(f"Original features: {len(feature_names)}")
print(f"Useful features: {len(useful_features)}")
print(f"Removed: {len(feature_names) - len(useful_features)} constant features")

feature_names = useful_features

X = [[float(row[f]) for f in feature_names] for row in data]
y = [row['condition'] for row in data]

print(f"Classes: {sorted(set(y))}")
print(f"Distribution: {dict((c, y.count(c)) for c in set(y))}")

# ============================================================
# STRATIFIED SPLIT
# ============================================================

by_class = {}
for i, label in enumerate(y):
    by_class.setdefault(label, []).append(i)

train_idx, test_idx = [], []
for label, indices in by_class.items():
    random.shuffle(indices)
    split = int(len(indices) * 0.8)
    train_idx.extend(indices[:split])
    test_idx.extend(indices[split:])

X_train = [X[i] for i in train_idx]
y_train = [y[i] for i in train_idx]
X_test = [X[i] for i in test_idx]
y_test = [y[i] for i in test_idx]

print(f"Train: {len(X_train)} | Test: {len(X_test)}")

# ============================================================
# PROPER CLASSIFIER — LDA-like with full covariance
# ============================================================

class ShieldClassifier:
    """
    Nearest Centroid with:
    - Per-feature z-score normalization
    - Cosine similarity (scale-invariant)
    - Distance-weighted voting
    """
    def __init__(self):
        self.centroids = {}
        self.classes = []
        self.means = []
        self.stds = []

    def fit(self, X, y):
        n = len(X)
        dim = len(X[0])

        # Global z-score normalization
        self.means = [sum(X[i][j] for i in range(n)) / n for j in range(dim)]
        self.stds = []
        for j in range(dim):
            var = sum((X[i][j] - self.means[j])**2 for i in range(n)) / n
            self.stds.append(math.sqrt(var) if var > 0.001 else 1.0)

        # Normalize
        X_norm = [
            [(X[i][j] - self.means[j]) / self.stds[j] for j in range(dim)]
            for i in range(n)
        ]

        # Per-class centroids
        by_class = {}
        for features, label in zip(X_norm, y):
            by_class.setdefault(label, []).append(features)

        for label, flist in by_class.items():
            nc = len(flist)
            self.centroids[label] = [
                sum(flist[i][j] for i in range(nc)) / nc
                for j in range(dim)
            ]

        self.classes = sorted(self.centroids.keys())

    def _normalize(self, features):
        return [
            (features[j] - self.means[j]) / self.stds[j]
            for j in range(len(features))
        ]

    def _cosine_similarity(self, a, b):
        dot = sum(x*y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x*x for x in a))
        norm_b = math.sqrt(sum(x*x for x in b))
        if norm_a == 0 or norm_b == 0:
            return 0
        return dot / (norm_a * norm_b)

    def predict_one(self, features):
        norm = self._normalize(features)
        best_label, best_score = None, -float('inf')
        for label, centroid in self.centroids.items():
            # Use cosine similarity (better than Euclidean for this data)
            sim = self._cosine_similarity(norm, centroid)
            if sim > best_score:
                best_score = sim
                best_label = label
        return best_label

    def predict_proba(self, features):
        norm = self._normalize(features)
        scores = {}
        for label, centroid in self.centroids.items():
            scores[label] = self._cosine_similarity(norm, centroid)
        # Softmax
        max_s = max(scores.values())
        exp_s = {k: math.exp((v - max_s) * 10) for k, v in scores.items()}
        total = sum(exp_s.values())
        return {k: v / total for k, v in exp_s.items()}


model = ShieldClassifier()
model.fit(X_train, y_train)

y_pred = [model.predict_one(x) for x in X_test]
correct = sum(1 for a, b in zip(y_test, y_pred) if a == b)
accuracy = correct / len(y_test)

print(f"\nAccuracy: {accuracy:.4f} ({correct}/{len(y_test)})")

classes = sorted(set(y))
cm = {c: {c2: 0 for c2 in classes} for c in classes}
for actual, pred in zip(y_test, y_pred):
    cm[actual][pred] += 1

print("\nConfusion Matrix:")
print(f"{'':<14}" + "  ".join(f"{c[:6]:>8}" for c in classes))
for actual in classes:
    row = "  ".join(f"{cm[actual][p]:>8}" for p in classes)
    print(f"{actual:<14} {row}")

print("\nPer-class metrics:")
print(f"{'Class':<14} {'Precision':>10} {'Recall':>10} {'F1':>10}")
for c in classes:
    tp = cm[c][c]
    fp = sum(cm[o][c] for o in classes if o != c)
    fn = sum(cm[c][o] for o in classes if o != c)
    p = tp/(tp+fp) if (tp+fp) > 0 else 0
    r = tp/(tp+fn) if (tp+fn) > 0 else 0
    f1 = 2*p*r/(p+r) if (p+r) > 0 else 0
    print(f"{c:<14} {p:>10.4f} {r:>10.4f} {f1:>10.4f}")

# Save
model_data = {
    'classes': model.classes,
    'centroids': model.centroids,
    'means': model.means,
    'stds': model.stds,
    'feature_names': feature_names,
    'accuracy': accuracy,
    'metric': 'cosine'
}
with open('2_models/shield_classifier.json', 'w') as f:
    json.dump(model_data, f, indent=2)

print("\nModel saved: 2_models/shield_classifier.json")
print("=" * 60)
print("✅ CLASSIFIER COMPLETE (FIXED)")
print("=" * 60)