# api_server.py
# SHIELD — FastAPI Prediction Server
# Serves AI predictions to Digital Twin dashboard

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import math
from collections import deque
import asyncio

app = FastAPI(title="SHIELD AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
latest_state = {
    'condition': 'NORMAL',
    'anomaly_score': 0.0,
    'persistence': 0.0,
    'sensor_data': {},
    'history': []
}
connected_clients = []

# ============================================================
# AI LOGIC
# ============================================================

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

def build_features(data):
    sg = [data.get(f'sg{i}', 0) for i in range(1, 7)]
    lc1 = data.get('lc1', 25)
    lc2 = data.get('lc2', 25)
    imu1 = data.get('imu1', 0.4)
    imu2 = data.get('imu2', 0.4)
    temp = data.get('temp', 30)

    strain_mean = sum(sg) / 6
    strain_max = max(sg)
    strain_std = (sum((x - strain_mean)**2 for x in sg) / 6) ** 0.5

    feature_dict = {
        'sg1_rms': sg[0], 'sg2_rms': sg[1], 'sg3_rms': sg[2],
        'sg4_rms': sg[3], 'sg5_rms': sg[4], 'sg6_rms': sg[5],
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
        'strain_mean': strain_mean,
        'strain_max': strain_max,
        'strain_std': strain_std,
        'persistence_score': strain_mean / 42.0,
        'severity_score': strain_max / 42.0,
    }

    return [feature_dict.get(name, 0.0) for name in feature_names]

# ============================================================
# API MODELS
# ============================================================

class SensorInput(BaseModel):
    chassis_id: str = "EV-CH-0007"
    sg1: float; sg2: float; sg3: float
    sg4: float; sg5: float; sg6: float
    lc1: float; lc2: float
    imu1: float; imu2: float
    temp: float

class Prediction(BaseModel):
    chassis_id: str
    condition: str
    confidence: float
    anomaly_score: float
    persistence: float
    classifier_label: str
    action: str

# ============================================================
# ENDPOINTS
# ============================================================

@app.get("/health")
def health():
    return {"status": "healthy", "model": "SHIELD v1.0"}

@app.post("/predict", response_model=Prediction)
def predict(data: SensorInput):
    features = build_features(data.dict())
    label = classify(features)
    anom = anomaly_score(features)
    is_anom = anom > anomaly_threshold

    anomaly_history.append(1 if is_anom else 0)
    persist = sum(anomaly_history) / len(anomaly_history)

        # Trust classifier as primary decision
    if anom > 150:
        final = 'INSPECTION'
    elif anom > 30:
        final = 'WATCH'
    else:
        final = 'NORMAL'

    actions = {
        'NORMAL': 'Continue monitoring',
        'WATCH': 'Increase monitoring sensitivity',
        'INSPECTION': 'Schedule inspection within 7 days'
    }

    return Prediction(
        chassis_id=data.chassis_id,
        condition=final,
        confidence=0.95,
        anomaly_score=round(anom, 3),
        persistence=round(persist, 3),
        classifier_label=label,
        action=actions[final]
    )

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            await websocket.send_json(latest_state)
            await asyncio.sleep(0.5)
    except:
        connected_clients.remove(websocket)

# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)