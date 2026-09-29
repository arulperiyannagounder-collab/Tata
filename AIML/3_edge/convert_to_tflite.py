# convert_to_tflite.py
# SHIELD — Export model for ESP32 Edge AI

import json

def load_json(fn):
    with open(fn) as f:
        return json.load(f)

classifier = load_json('2_models/shield_classifier.json')
feature_names = classifier['feature_names']
centroids = classifier['centroids']
classes = classifier['classes']
stds = classifier['stds']

print("=" * 60)
print("SHIELD — Edge Model Export")
print("=" * 60)
print(f"Classes: {classes}")
print(f"Features: {len(feature_names)}")

def generate_c_header(classifier, filename):
    lines = []
    lines.append("// SHIELD — Edge AI Model (Nearest Centroid)")
    lines.append("// Auto-generated from shield_classifier.json")
    lines.append("")
    lines.append("#ifndef SHIELD_MODEL_H")
    lines.append("#define SHIELD_MODEL_H")
    lines.append("")
    lines.append(f"#define NUM_FEATURES {len(feature_names)}")
    lines.append(f"#define NUM_CLASSES {len(classes)}")
    lines.append("")
    lines.append("const char* CLASS_NAMES[] = {")
    for c in classes:
        lines.append(f'    "{c}",')
    lines.append("};")
    lines.append("")
    lines.append("const float FEATURE_STDS[NUM_FEATURES] = {")
    for i in range(0, len(stds), 6):
        chunk = stds[i:i+6]
        lines.append("    " + ", ".join(f"{v:.6f}f" for v in chunk) + ",")
    lines.append("};")
    lines.append("")
    for class_name in classes:
        centroid = centroids[class_name]
        c_name = class_name.upper().replace(' ', '_')
        lines.append(f"const float CENTROID_{c_name}[NUM_FEATURES] = {{")
        for i in range(0, len(centroid), 6):
            chunk = centroid[i:i+6]
            lines.append("    " + ", ".join(f"{v:.6f}f" for v in chunk) + ",")
        lines.append("};")
        lines.append("")
    lines.append("const float* CENTROIDS[NUM_CLASSES] = {")
    for class_name in classes:
        c_name = class_name.upper().replace(' ', '_')
        lines.append(f"    CENTROID_{c_name},")
    lines.append("};")
    lines.append("")
    lines.append("#endif // SHIELD_MODEL_H")
    with open(filename, 'w') as f:
        f.write("\n".join(lines))
    print(f"Generated: {filename}")

def export_json(classifier, filename):
    edge_model = {
        'type': 'nearest_centroid',
        'classes': classes,
        'feature_names': feature_names,
        'stds': stds,
        'centroids': centroids
    }
    with open(filename, 'w') as f:
        json.dump(edge_model, f, indent=2)
    print(f"Generated: {filename}")

generate_c_header(classifier, '3_edge/shield_model.h')
export_json(classifier, '3_edge/shield_edge_model.json')

print("\n" + "=" * 60)
print("✅ EDGE MODEL EXPORTED")
print("=" * 60)
print("  shield_model.h          → For ESP32")
print("  shield_edge_model.json  → For API/Dashboard")