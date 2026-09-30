"""
=============================================================================
SHIELD Hardware Real-Time Bi-Directional Bridge Server
Streams COM5 hardware telemetry to 3D Simulation & sends controls to Hardware
=============================================================================
Usage:
    python serial_bridge.py
    python serial_bridge.py --port COM5 --baud 115200
"""

import sys
import time
import asyncio
import argparse
import serial
import serial.tools.list_ports
import websockets
import json

connected_clients = set()
active_serial = None

def find_available_ports():
    ports = serial.tools.list_ports.comports()
    return [p.device for p in ports]

async def ws_handler(websocket):
    global active_serial
    connected_clients.add(websocket)
    client_ip = getattr(websocket, 'remote_address', 'Client')
    print(f"[\033[92m+\033[0m] Browser 3D Simulation connected: {client_ip}")
    try:
        async for message in websocket:
            cmd = str(message).strip()
            print(f"[\033[95mWEB COMMAND -> HARDWARE\033[0m] \033[1m{cmd}\033[0m")
            if active_serial and active_serial.is_open:
                try:
                    active_serial.write(f"{cmd}\n".encode('utf-8'))
                    active_serial.flush()
                except Exception as ex:
                    print(f"[\033[91m!\033[0m] Error writing command to serial: {ex}")
            else:
                print(f"[\033[93m!\033[0m] Serial port is not open. Cannot forward command: {cmd}")
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        print(f"[\033[91m-\033[0m] Browser 3D Simulation disconnected: {client_ip}")

async def broadcast_telemetry(line: str):
    if not connected_clients:
        return
    dead = set()
    for ws in connected_clients:
        try:
            await ws.send(line)
        except Exception:
            dead.add(ws)
    for ws in dead:
        connected_clients.discard(ws)

def open_serial_connection(port_name, baud_rate):
    print(f"[*] Opening serial port: \033[96m{port_name}\033[0m at \033[96m{baud_rate}\033[0m baud...")
    s = serial.Serial(port_name, baud_rate, timeout=1, dsrdtr=True, rtscts=True)
    s.setDTR(True)
    s.setRTS(True)
    time.sleep(1)
    print(f"[\033[92m✓\033[0m] Connected to hardware on {port_name}! Bi-directional stream active...")
    return s

async def serial_reader_loop(port_name, baud_rate):
    global active_serial
    loop = asyncio.get_running_loop()
    
    while True:
        try:
            active_serial = await loop.run_in_executor(None, open_serial_connection, port_name, baud_rate)
            while True:
                line_bytes = await loop.run_in_executor(None, active_serial.readline)
                if not line_bytes:
                    await asyncio.sleep(0.01)
                    continue
                try:
                    line = line_bytes.decode('utf-8', errors='ignore').strip()
                except Exception:
                    continue

                if line:
                    # Print preview with color highlighting
                    if "CRITICAL" in line or "TORSION" in line or "TWIST" in line:
                        print(f"\033[91m[HARDWARE ALERT]\033[0m {line}")
                    elif "WARN" in line:
                        print(f"\033[93m[HARDWARE WARN]\033[0m {line}")
                    else:
                        print(f"\033[94m[HARDWARE DATA]\033[0m {line}")

                    # Broadcast line directly to browser 3D simulator
                    await broadcast_telemetry(line)
        except serial.SerialException as se:
            print(f"[\033[91m!\033[0m] Serial error on {port_name}: {se}. Retrying in 2 seconds...")
            if active_serial:
                try:
                    active_serial.close()
                except Exception:
                    pass
                active_serial = None
            await asyncio.sleep(2)
        except Exception as e:
            print(f"[\033[91m!\033[0m] Unexpected error: {e}. Retrying in 2 seconds...")
            await asyncio.sleep(2)

async def main():
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass

    parser = argparse.ArgumentParser(description="SHIELD Hardware Bi-Directional Bridge Server")
    parser.add_argument("--port", default="COM5", help="Serial port (default: COM5)")
    parser.add_argument("--baud", type=int, default=115200, help="Baud rate (default: 115200)")
    parser.add_argument("--ws-port", type=int, default=8765, help="WebSocket port (default: 8765)")
    args = parser.parse_args()

    available_ports = find_available_ports()
    print("=" * 65)
    print("[*] SHIELD Real-Time Bi-Directional Hardware Bridge Server")
    print("=" * 65)
    print(f"  * Target Serial Port : {args.port}")
    print(f"  * Baud Rate          : {args.baud}")
    print(f"  * WebSocket Server   : ws://localhost:{args.ws_port}")
    print(f"  * Available COM Ports: {available_ports}")
    print("=" * 65)

    if args.port not in available_ports:
        print(f"[!] WARNING: {args.port} is not in current ports list: {available_ports}")

    # Start WebSocket Server
    ws_server = await websockets.serve(ws_handler, "0.0.0.0", args.ws_port)
    print(f"[+] WebSocket server listening on ws://localhost:{args.ws_port}")
    print(f"[*] Open the Web 3D Simulation at http://localhost:3000 to interact live!\n")

    # Start Serial Reader task
    await serial_reader_loop(args.port, args.baud)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[*] Bridge server stopped by user.")
