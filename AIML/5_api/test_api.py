# test_api.py
# SHIELD — API Validation Tests

import requests

API_URL = "http://localhost:8001"

scenarios = [
    {
        'name': 'S1: Normal Operation',
        'expected': 'NORMAL',
        'data': {'chassis_id': 'EV-CH-0007',
                 'sg1': 42, 'sg2': 41, 'sg3': 38,
                 'sg4': 39, 'sg5': 44, 'sg6': 43,
                 'lc1': 25, 'lc2': 25,
                 'imu1': 0.4, 'imu2': 0.4, 'temp': 30}
    },
    {
        'name': 'S2: Minor Impact',
        'expected': 'WATCH',
        'data': {'chassis_id': 'EV-CH-0007',
                 'sg1': 85, 'sg2': 82, 'sg3': 76,
                 'sg4': 78, 'sg5': 88, 'sg6': 86,
                 'lc1': 25, 'lc2': 25,
                 'imu1': 0.9, 'imu2': 0.8, 'temp': 31}
    },
    {
        'name': 'S3: Severe Impact',
        'expected': 'INSPECTION',
        'data': {'chassis_id': 'EV-CH-0007',
                 'sg1': 180, 'sg2': 175, 'sg3': 165,
                 'sg4': 170, 'sg5': 185, 'sg6': 182,
                 'lc1': 25, 'lc2': 25,
                 'imu1': 2.0, 'imu2': 1.9, 'temp': 32}
    },
]

def test_health():
    r = requests.get(f"{API_URL}/health")
    print(f"Health: {r.status_code} — {r.json()}")
    return r.status_code == 200

def test_scenario(scenario):
    r = requests.post(f"{API_URL}/predict", json=scenario['data'])
    result = r.json()
    match = result['condition'] == scenario['expected']
    icon = "✅" if match else "❌"
    print(f"\n{icon} {scenario['name']}")
    print(f"   Expected: {scenario['expected']}")
    print(f"   Predicted: {result['condition']}")
    print(f"   Anomaly: {result['anomaly_score']}")
    print(f"   Action: {result['action']}")
    return match

def main():
    print("=" * 60)
    print("SHIELD — API Tests")
    print("=" * 60)
    if not test_health():
        print("❌ API not running. Start with: python 5_api\\api_server.py")
        return

    passed = sum(test_scenario(s) for s in scenarios)
    print(f"\n{'='*60}")
    print(f"RESULTS: {passed}/{len(scenarios)} passed")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()