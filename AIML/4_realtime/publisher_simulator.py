# publisher_simulator.py
# SHIELD — Simulated ESP32 Publisher (test without hardware)

import paho.mqtt.client as mqtt
import json
import time
import random
from datetime import datetime

MQTT_BROKER = "localhost"
MQTT_PORT = 1883
TOPIC_DATA = "shield/data"
TOPIC_ALERT = "shield/alert"

SCENARIOS = {
    'normal': {
        'sg': (42, 3), 'lc': (25, 0.5), 'imu': (0.4, 0.05),
        'temp': (30, 1), 'duration': 15
    },
    'watch': {
        'sg': (85, 8), 'lc': (25, 0.5), 'imu': (0.9, 0.1),
        'temp': (31, 1), 'duration': 10
    },
    'inspection': {
        'sg': (180, 15), 'lc': (25, 0.5), 'imu': (2.0, 0.2),
        'temp': (32, 1), 'duration': 10
    },
    'impact': {
        'sg': (350, 50), 'lc': (28, 2), 'imu': (5.5, 0.5),
        'temp': (30, 1), 'duration': 3
    }
}

def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT (rc={rc})")

def generate_sample(scenario):
    cfg = SCENARIOS[scenario]
    return {
        'chassis_id': 'EV-CH-0007',
        'condition': scenario.upper(),
        'sg1': random.gauss(*cfg['sg']),
        'sg2': random.gauss(*cfg['sg']),
        'sg3': random.gauss(cfg['sg'][0] * 0.9, cfg['sg'][1]),
        'sg4': random.gauss(cfg['sg'][0] * 0.9, cfg['sg'][1]),
        'sg5': random.gauss(cfg['sg'][0] * 1.05, cfg['sg'][1]),
        'sg6': random.gauss(cfg['sg'][0] * 1.05, cfg['sg'][1]),
        'lc1': random.gauss(*cfg['lc']),
        'lc2': random.gauss(*cfg['lc']),
        'imu1': random.gauss(*cfg['imu']),
        'imu2': random.gauss(*cfg['imu']),
        'temp': random.gauss(*cfg['temp'])
    }

def main():
    client = mqtt.Client()
    client.on_connect = on_connect
    
    print("=" * 60)
    print("SHIELD — Simulated ESP32 Publisher")
    print("=" * 60)
    print(f"Broker: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"Topic: {TOPIC_DATA}")
    print()
    
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()
    time.sleep(1)
    
    scenario_order = ['normal', 'watch', 'inspection', 'impact', 'normal']
    
    for scenario in scenario_order:
        duration = SCENARIOS[scenario]['duration']
        print(f"\n>>> Scenario: {scenario.upper()} ({duration}s)")
        start = time.time()
        while time.time() - start < duration:
            sample = generate_sample(scenario)
            client.publish(TOPIC_DATA, json.dumps(sample))
            if scenario == 'impact' and sample['imu1'] > 3.0:
                client.publish(TOPIC_ALERT, json.dumps({
                    'type': 'IMPACT', 'value': sample['imu1']
                }))
            print(f"  [{datetime.now().strftime('%H:%M:%S')}] "
                  f"sg1={sample['sg1']:.1f} imu1={sample['imu1']:.2f}")
            time.sleep(0.5)
    
    print("\n✅ Simulation complete")
    client.loop_stop()

if __name__ == "__main__":
    main()