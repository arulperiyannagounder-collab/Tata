import { ImpactScenario, SensorTelemetry, ChassisHealthState, HardwareParameters } from '../types/simulation';

export type TelemetryCallback = (data: SensorTelemetry) => void;

export interface SensorDataProvider {
  readonly id: string;
  readonly name: string;
  readonly isConnected: boolean;
  start(): void;
  pause(): void;
  reset(): void;
  setScenario(scenario: ImpactScenario): void;
  subscribe(callback: TelemetryCallback): () => void;
  getLatestTelemetry(): SensorTelemetry;
  setHardwareBaseWeight?(weightKg: number): Promise<boolean>;
  setHardwareTemperature?(tempC: number | null): Promise<boolean>;
  setHardwareThresholds?(params: Partial<HardwareParameters>): Promise<boolean>;
  resetHardwareParameters?(): Promise<boolean>;
  setSimulatedAppliedPressure?(pressureKg: number): void;
  getHardwareParameters?(): HardwareParameters;
}

/**
 * High-fidelity real-time physics simulation of EV chassis strain, IMU kinetics,
 * temperature gradients, and actuator control logic.
 */
export class SimulatedSensorDataProvider implements SensorDataProvider {
  readonly id = 'SIMULATOR';
  readonly name = 'SHIELD High-Fidelity Physics Engine';
  public isConnected = true;

  private isRunning = true;
  private currentScenario: ImpactScenario = 'NORMAL';
  private scenarioStartTime = 0;
  private listeners: Set<TelemetryCallback> = new Set();
  private timerId: number | null = null;
  private tickCount = 0;

  // Persistent deformation for STRUCTURAL_DAMAGE
  private permanentDeformationMicroStrain = 0;
  private permanentDeflectionMm = 0;

  // Dynamic hardware parameters (Base weight, temperature override, thresholds)
  private hardwareParams: HardwareParameters = {
    baseWeightKg: 0,
    simulatedAppliedPressureKg: 0,
    tempOverrideC: null,
    threshWeightWarnKg: 30,
    threshWeightCritKg: 50,
    threshTempWarnC: 38,
    threshTempCritC: 45,
    threshRollWarpDeg: 25,
  };

  // Current telemetry state
  private telemetry: SensorTelemetry = {
    timestamp: Date.now(),
    strainMicroStrain: 12,
    loadKg: 24.5,
    loadCell1Raw: 842100,
    loadCell2Raw: 841950,
    strainDeformationMm: 0.08,
    accel: { x: 0.01, y: 0.02, z: 1.00 },
    gyro: { x: 0.1, y: -0.2, z: 0.0 },
    roll: 0.0,
    pitch: 0.0,
    yaw: 0.0,
    vibrationSensorDetected: false,
    vibrationSensorRaw: 0,
    temperatureC: 24.8,
    vibrationMotorActive: false,
    vibrationDutyCycle: 0,
    buzzerActive: false,
    buzzerFrequency: 0,
    ledGreen: true,
    ledYellow: false,
    ledRed: false,
    systemStatus: 'NORMAL',
    activeScenario: 'NORMAL',
    scenarioProgress: 0,
    dataSource: 'SIMULATION',
  };

  constructor() {
    this.start();
  }

  public subscribe(callback: TelemetryCallback): () => void {
    this.listeners.add(callback);
    callback(this.telemetry);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getLatestTelemetry(): SensorTelemetry {
    return { ...this.telemetry };
  }

  public start(): void {
    this.isRunning = true;
    if (this.timerId === null) {
      this.timerId = window.setInterval(() => this.tick(), 40); // 25 Hz update loop
    }
  }

  public pause(): void {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public reset(): void {
    this.currentScenario = 'NORMAL';
    this.scenarioStartTime = Date.now();
    this.permanentDeformationMicroStrain = 0;
    this.permanentDeflectionMm = 0;
    this.tickCount = 0;

    this.telemetry = {
      timestamp: Date.now(),
      strainMicroStrain: 14,
      loadKg: 25.0,
      loadCell1Raw: 842100,
      loadCell2Raw: 841950,
      strainDeformationMm: 0.08,
      accel: { x: 0.0, y: 0.0, z: 1.0 },
      gyro: { x: 0.0, y: 0.0, z: 0.0 },
      roll: 0.0,
      pitch: 0.0,
      yaw: 0.0,
      vibrationSensorDetected: false,
      vibrationSensorRaw: 0,
      temperatureC: 24.8,
      vibrationMotorActive: false,
      vibrationDutyCycle: 0,
      buzzerActive: false,
      buzzerFrequency: 0,
      ledGreen: true,
      ledYellow: false,
      ledRed: false,
      systemStatus: 'NORMAL',
      activeScenario: 'NORMAL',
      scenarioProgress: 0,
      dataSource: 'SIMULATION',
    };
    this.notify();
  }

  public setScenario(scenario: ImpactScenario): void {
    this.currentScenario = scenario;
    this.scenarioStartTime = Date.now();

    if (scenario === 'STRUCTURAL_DAMAGE') {
      this.permanentDeformationMicroStrain = 1750;
      this.permanentDeflectionMm = 7.8;
    } else if (scenario === 'NORMAL') {
      this.permanentDeformationMicroStrain = 0;
      this.permanentDeflectionMm = 0;
    }
  }

  private tick(): void {
    if (!this.isRunning) return;
    this.tickCount++;

    const now = Date.now();
    const elapsedSec = (now - this.scenarioStartTime) / 1000;
    const noise = (Math.random() - 0.5) * 4;
    const microJitter = (Math.random() - 0.5) * 0.02;

    let dynamicStrain = 0;
    let accelX = (Math.random() - 0.5) * 0.02;
    let accelY = (Math.random() - 0.5) * 0.02;
    let accelZ = 1.0 + (Math.random() - 0.5) * 0.02;
    let gyroX = (Math.random() - 0.5) * 0.4;
    let gyroY = (Math.random() - 0.5) * 0.4;
    let gyroZ = (Math.random() - 0.5) * 0.3;
    let roll = 0;
    let pitch = 0;
    let tempC = 24.8 + Math.sin(this.tickCount * 0.02) * 0.4;
    let progress = 0;

    let status: ChassisHealthState = 'NORMAL';
    let ledGreen = true;
    let ledYellow = false;
    let ledRed = false;
    let buzzer = false;
    let buzzerFreq = 0;
    let motor = false;
    let motorDuty = 0;
    let vibrationSensorDetected = false;

    switch (this.currentScenario) {
      case 'NORMAL': {
        dynamicStrain = 12 + Math.sin(this.tickCount * 0.05) * 6 + noise;
        status = 'NORMAL';
        ledGreen = true;
        ledYellow = false;
        ledRed = false;
        buzzer = false;
        motor = false;
        vibrationSensorDetected = false;
        progress = 1.0;
        break;
      }

      case 'POTHOLE': {
        // High-frequency impact spike lasting ~1.5s then decaying
        const duration = 2.0;
        progress = Math.min(1.0, elapsedSec / duration);
        if (elapsedSec < duration) {
          const decay = Math.exp(-elapsedSec * 2.5);
          const freq = Math.sin(elapsedSec * 24);
          dynamicStrain = 280 * decay * freq + 30 * decay + 14;
          accelZ = 1.0 + 2.1 * decay * freq;
          accelY = 0.8 * decay * Math.cos(elapsedSec * 18);
          roll = 4.2 * decay * Math.sin(elapsedSec * 12);
          pitch = -3.5 * decay * Math.cos(elapsedSec * 15);
          gyroX = 35 * decay * freq;
          gyroY = -28 * decay * Math.cos(elapsedSec * 16);

          status = 'WARNING';
          ledGreen = false;
          ledYellow = true;
          ledRed = false;
          buzzer = false;
          motor = decay > 0.3;
          motorDuty = Math.floor(140 * decay);
          vibrationSensorDetected = decay > 0.15;
        } else {
          // Settled back to normal
          dynamicStrain = 14 + noise;
          status = 'NORMAL';
          ledGreen = true;
          ledYellow = false;
          ledRed = false;
          buzzer = false;
          motor = false;
          vibrationSensorDetected = false;
        }
        break;
      }

      case 'MINOR_IMPACT': {
        // Lateral curb / bump impact lasting ~3.0s
        const duration = 3.5;
        progress = Math.min(1.0, elapsedSec / duration);
        if (elapsedSec < duration) {
          const decay = Math.exp(-elapsedSec * 1.4);
          const freq = Math.sin(elapsedSec * 16);
          dynamicStrain = 580 * decay * freq + 80 * decay + 25;
          accelX = 3.2 * decay * freq;
          accelY = 1.5 * decay * Math.cos(elapsedSec * 14);
          accelZ = 1.0 + 1.2 * decay * freq;
          roll = 8.5 * decay * Math.sin(elapsedSec * 10);
          pitch = 5.0 * decay * Math.cos(elapsedSec * 12);
          gyroZ = 65 * decay * freq;

          status = 'WARNING';
          ledGreen = false;
          ledYellow = true;
          ledRed = false;
          buzzer = elapsedSec < 0.8;
          buzzerFreq = 1800;
          motor = decay > 0.15;
          motorDuty = Math.floor(190 * decay);
          vibrationSensorDetected = decay > 0.12;
        } else {
          dynamicStrain = 28 + noise; // slight offset
          status = 'WARNING';
          ledGreen = false;
          ledYellow = true;
          ledRed = false;
          buzzer = false;
          motor = false;
          vibrationSensorDetected = false;
        }
        break;
      }

      case 'MAJOR_IMPACT': {
        // High-energy collision with ongoing structural alarm
        const duration = 4.5;
        progress = Math.min(1.0, elapsedSec / duration);
        const decay = Math.exp(-elapsedSec * 0.9);
        const freq = Math.sin(elapsedSec * 22);

        dynamicStrain = 1350 * decay * freq + 750 * decay + 420;
        accelX = 6.4 * decay * freq + (Math.random() - 0.5) * 0.4;
        accelY = 4.1 * decay * Math.cos(elapsedSec * 18);
        accelZ = 1.0 + 3.8 * decay * freq;
        roll = 14.0 * decay * Math.sin(elapsedSec * 8);
        pitch = -11.0 * decay * Math.cos(elapsedSec * 9);
        tempC = 27.4 + Math.min(6.0, elapsedSec * 1.2); // Thermal friction heating

        status = 'CRITICAL';
        ledGreen = false;
        ledYellow = false;
        ledRed = true;
        // Pulsing siren buzzer
        buzzer = (Math.floor(elapsedSec * 6) % 2 === 0);
        buzzerFreq = buzzer ? 2800 : 0;
        motor = true;
        motorDuty = 255;
        vibrationSensorDetected = decay > 0.08 || elapsedSec < 3.2;
        break;
      }

      case 'STRUCTURAL_DAMAGE': {
        // Permanent plastic deformation of chassis frame members
        dynamicStrain = this.permanentDeformationMicroStrain + Math.sin(this.tickCount * 0.08) * 35 + noise;
        accelZ = 1.0 + microJitter * 2;
        roll = 3.2; // permanent structural twist
        pitch = -1.8;
        tempC = 29.8 + Math.sin(this.tickCount * 0.03) * 0.8;

        status = 'CRITICAL';
        ledGreen = false;
        ledYellow = false;
        ledRed = true;
        // Intermittent fault buzzer tone
        buzzer = (Math.floor(this.tickCount / 12) % 4 === 0);
        buzzerFreq = 3200;
        motor = (Math.floor(this.tickCount / 15) % 3 === 0);
        motorDuty = 220;
        vibrationSensorDetected = (Math.sin(this.tickCount * 0.25) > 0.15);
        progress = 1.0;
        break;
      }
    }

    const totalMicroStrain = Math.max(0, dynamicStrain + this.permanentDeformationMicroStrain);
    const baseKg = this.hardwareParams.baseWeightKg;
    const appliedPressureKg = this.hardwareParams.simulatedAppliedPressureKg;
    const rawLoadKg = +(totalMicroStrain * 0.125).toFixed(1);
    const loadKg = +(baseKg + appliedPressureKg + rawLoadKg).toFixed(1);
    const deflectionMm = +(totalMicroStrain * 0.0042 + this.permanentDeflectionMm + (baseKg + appliedPressureKg) * 0.015).toFixed(2);

    if (this.hardwareParams.tempOverrideC !== null) {
      tempC = this.hardwareParams.tempOverrideC;
    }

    // Dynamic threshold evaluation
    if (
      loadKg >= this.hardwareParams.threshWeightCritKg ||
      tempC >= this.hardwareParams.threshTempCritC ||
      Math.abs(roll) >= this.hardwareParams.threshRollWarpDeg
    ) {
      status = 'CRITICAL';
      ledGreen = false;
      ledYellow = false;
      ledRed = true;
      buzzer = true;
      buzzerFreq = 2800;
      motor = true;
      motorDuty = 255;
    } else if (
      loadKg >= this.hardwareParams.threshWeightWarnKg ||
      tempC >= this.hardwareParams.threshTempWarnC
    ) {
      status = 'WARNING';
      ledGreen = false;
      ledYellow = true;
      ledRed = false;
      buzzer = false;
      motor = true;
      motorDuty = 140;
    }

    // Compute raw 24-bit ADC values (HX711 baseline ~ 8388608 or midscale offset)
    const lc1Raw = Math.floor(842000 + (totalMicroStrain + (baseKg + appliedPressureKg) * 8) * 18.4 + noise * 10);
    const lc2Raw = Math.floor(841800 + (totalMicroStrain + (baseKg + appliedPressureKg) * 8) * 17.9 - noise * 8);

    this.telemetry = {
      timestamp: now,
      strainMicroStrain: Math.round(totalMicroStrain + (baseKg + appliedPressureKg) * 8),
      loadKg,
      loadCell1Raw: lc1Raw,
      loadCell2Raw: lc2Raw,
      strainDeformationMm: deflectionMm,
      accel: {
        x: +accelX.toFixed(3),
        y: +accelY.toFixed(3),
        z: +accelZ.toFixed(3),
      },
      gyro: {
        x: +gyroX.toFixed(2),
        y: +gyroY.toFixed(2),
        z: +gyroZ.toFixed(2),
      },
      roll: +roll.toFixed(1),
      pitch: +pitch.toFixed(1),
      yaw: 0,
      vibrationSensorDetected,
      vibrationSensorRaw: vibrationSensorDetected ? 1 : 0,
      temperatureC: +tempC.toFixed(1),
      vibrationMotorActive: motor,
      vibrationDutyCycle: motor ? motorDuty : 0,
      buzzerActive: buzzer,
      buzzerFrequency: buzzer ? buzzerFreq : 0,
      ledGreen,
      ledYellow,
      ledRed,
      systemStatus: status,
      activeScenario: this.currentScenario,
      scenarioProgress: progress,
      dataSource: 'SIMULATION',
    };

    this.notify();
  }

  public async setHardwareBaseWeight(weightKg: number): Promise<boolean> {
    this.hardwareParams.baseWeightKg = Math.max(0, weightKg);
    this.tick();
    return true;
  }

  public async setHardwareTemperature(tempC: number | null): Promise<boolean> {
    this.hardwareParams.tempOverrideC = tempC;
    this.tick();
    return true;
  }

  public async setHardwareThresholds(params: Partial<HardwareParameters>): Promise<boolean> {
    Object.assign(this.hardwareParams, params);
    this.tick();
    return true;
  }

  public async resetHardwareParameters(): Promise<boolean> {
    this.hardwareParams = {
      baseWeightKg: 0,
      simulatedAppliedPressureKg: 0,
      tempOverrideC: null,
      threshWeightWarnKg: 30,
      threshWeightCritKg: 50,
      threshTempWarnC: 38,
      threshTempCritC: 45,
      threshRollWarpDeg: 25,
    };
    this.tick();
    return true;
  }

  public setSimulatedAppliedPressure(pressureKg: number): void {
    this.hardwareParams.simulatedAppliedPressureKg = Math.max(0, pressureKg);
    this.tick();
  }

  public getHardwareParameters(): HardwareParameters {
    return { ...this.hardwareParams };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.telemetry);
    }
  }
}

/**
 * Real ESP32 Hardware Provider supporting Web Serial (with DTR/RTS),
 * WebSocket live streaming bridge, and rich sensor text/JSON parsing.
 */
export class RealESP32SensorDataProvider implements SensorDataProvider {
  readonly id = 'REAL_ESP32';
  readonly name = 'Direct Hardware Stream (COM Port / WebSocket)';
  public isConnected = false;

  private listeners: Set<TelemetryCallback> = new Set();
  private logListeners: Set<(line: string) => void> = new Set();
  private port: any = null;
  private reader: any = null;
  private isReading = false;
  private ws: WebSocket | null = null;
  private wsReconnectTimer: any = null;
  private simulatedFallback: SimulatedSensorDataProvider;

  // Dynamic Hardware Parameters
  private hardwareParams: HardwareParameters = {
    baseWeightKg: 0,
    simulatedAppliedPressureKg: 0,
    tempOverrideC: null,
    threshWeightWarnKg: 30,
    threshWeightCritKg: 50,
    threshTempWarnC: 38,
    threshTempCritC: 45,
    threshRollWarpDeg: 25,
  };

  private telemetry: SensorTelemetry = {
    timestamp: Date.now(),
    strainMicroStrain: 0,
    loadKg: 0,
    loadCell1Raw: 842000,
    loadCell2Raw: 841800,
    strainDeformationMm: 0,
    accel: { x: 0, y: 0, z: 1.0 },
    gyro: { x: 0, y: 0, z: 0 },
    roll: 0,
    pitch: 0,
    yaw: 0,
    vibrationSensorDetected: false,
    vibrationSensorRaw: 0,
    temperatureC: 25.0,
    vibrationMotorActive: false,
    vibrationDutyCycle: 0,
    buzzerActive: false,
    buzzerFrequency: 0,
    ledGreen: true,
    ledYellow: false,
    ledRed: false,
    systemStatus: 'NORMAL',
    activeScenario: 'NORMAL',
    scenarioProgress: 1.0,
    dataSource: 'REAL_HARDWARE',
  };

  constructor() {
    this.simulatedFallback = new SimulatedSensorDataProvider();
    // Auto-attempt connecting to local Python Serial Bridge on ws://localhost:8765
    this.connectWebSocket();
  }

  public subscribe(callback: TelemetryCallback): () => void {
    this.listeners.add(callback);
    callback(this.telemetry);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public subscribeLogs(callback: (line: string) => void): () => void {
    this.logListeners.add(callback);
    return () => {
      this.logListeners.delete(callback);
    };
  }

  public getLatestTelemetry(): SensorTelemetry {
    return { ...this.telemetry };
  }

  public start(): void {
    if (!this.isConnected) {
      this.connectWebSocket();
    }
  }

  public pause(): void {
    this.simulatedFallback.pause();
  }

  public reset(): void {
    this.simulatedFallback.reset();
  }

  public setScenario(scenario: ImpactScenario): void {
    this.simulatedFallback.setScenario(scenario);
  }

  /**
   * Connects to Python serial_bridge.py via WebSocket (ws://localhost:8765)
   */
  public connectWebSocket(url = 'ws://localhost:8765'): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('✓ Connected to Python Serial Bridge WebSocket:', url);
        this.isConnected = true;
        if (this.wsReconnectTimer) {
          clearTimeout(this.wsReconnectTimer);
          this.wsReconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        const raw = String(event.data).trim();
        this.parseSerialLine(raw);
      };

      this.ws.onerror = () => {
        // Silent error, will retry in background
      };

      this.ws.onclose = () => {
        if (this.isConnected && !this.port) {
          this.isConnected = false;
        }
        // Auto retry connecting every 3 seconds if not connected via serial
        if (!this.port && !this.wsReconnectTimer) {
          this.wsReconnectTimer = setTimeout(() => {
            this.wsReconnectTimer = null;
            this.connectWebSocket(url);
          }, 3000);
        }
      };
    } catch {
      // Fallback
    }
  }

  /**
   * Connects via Browser Web Serial API (Chrome/Edge on Desktop) with DTR/RTS signals
   */
  public async connectSerial(baudRate = 115200): Promise<{ success: boolean; message: string }> {
    if (!('serial' in navigator)) {
      return {
        success: false,
        message: 'Web Serial API is not supported in this browser. Please use Chrome or Edge on Desktop.',
      };
    }

    try {
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate });

      // Hardware boards (ESP32-C3/S3, CP2102, CH340) require DTR & RTS active to stream data
      try {
        await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
      } catch (sigErr) {
        console.log('Serial signals notice:', sigErr);
      }

      this.isConnected = true;
      this.isReading = true;
      this.readSerialLoop();
      return { success: true, message: `Connected to Serial Port at ${baudRate} baud with DTR/RTS enabled.` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to open serial port' };
    }
  }

  public async disconnectSerial(): Promise<void> {
    this.isReading = false;
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {}
    }
    if (this.port) {
      try {
        await this.port.close();
      } catch {}
      this.port = null;
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.isConnected = false;
    }
  }

  /**
   * Sends an actuator command to physical hardware over WebSocket or Web Serial.
   * Formats: CMD:BUZZER:1 | CMD:BUZZER:0 | CMD:MOTOR:255 | CMD:LED_RED:1 | CMD:LED_GREEN:1 | CMD:TARE
   */
  public async sendCommand(command: string): Promise<boolean> {
    const formatted = command.trim().startsWith('CMD:') ? command.trim() : `CMD:${command.trim()}`;
    console.log('[SHIELD Web -> Hardware Control]:', formatted);

    let sent = false;

    // 1. Send via WebSocket (Python bridge)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(formatted);
        sent = true;
      } catch (e) {
        console.warn('WebSocket send failed:', e);
      }
    }

    // 2. Send via Web Serial (Direct browser USB)
    if (this.port && this.port.writable) {
      try {
        const encoder = new TextEncoder();
        const writer = this.port.writable.getWriter();
        await writer.write(encoder.encode(formatted + '\n'));
        writer.releaseLock();
        sent = true;
      } catch (e) {
        console.warn('Web Serial send failed:', e);
      }
    }

    // Apply immediate UI state feedback so the 3D twin & dials reflect changes instantly
    const upper = formatted.toUpperCase();
    if (upper.includes('BUZZER:1') || upper.includes('BUZZER:ON')) {
      this.telemetry.buzzerActive = true;
      this.telemetry.buzzerFrequency = 2800;
    } else if (upper.includes('BUZZER:0') || upper.includes('BUZZER:OFF')) {
      this.telemetry.buzzerActive = false;
      this.telemetry.buzzerFrequency = 0;
    } else if (upper.includes('MOTOR:')) {
      const match = upper.match(/MOTOR:(\d+)/);
      const val = match ? parseInt(match[1]) : 0;
      this.telemetry.vibrationMotorActive = val > 0;
      this.telemetry.vibrationDutyCycle = val;
    } else if (upper.includes('LED_GREEN:')) {
      this.telemetry.ledGreen = upper.includes(':1') || upper.includes(':ON');
    } else if (upper.includes('LED_YELLOW:')) {
      this.telemetry.ledYellow = upper.includes(':1') || upper.includes(':ON');
    } else if (upper.includes('LED_RED:')) {
      this.telemetry.ledRed = upper.includes(':1') || upper.includes(':ON');
    } else if (upper.includes('TARE')) {
      this.telemetry.loadKg = 0;
      this.telemetry.strainMicroStrain = 0;
      this.telemetry.strainDeformationMm = 0;
    } else if (upper.includes('SET_BASE_WEIGHT:')) {
      const match = upper.match(/SET_BASE_WEIGHT:([-\d.]+)/);
      if (match) {
        const bw = parseFloat(match[1]);
        this.hardwareParams.baseWeightKg = bw;
        this.telemetry.loadKg = +(bw + this.hardwareParams.simulatedAppliedPressureKg).toFixed(2);
      }
    } else if (upper.includes('SET_TEMP:')) {
      const match = upper.match(/SET_TEMP:([-\d.]+)/);
      if (match) {
        const t = parseFloat(match[1]);
        if (t < 0) {
          this.hardwareParams.tempOverrideC = null;
        } else {
          this.hardwareParams.tempOverrideC = t;
          this.telemetry.temperatureC = +t.toFixed(1);
        }
      }
    } else if (upper.includes('RESET_PARAMS')) {
      this.hardwareParams = {
        baseWeightKg: 0,
        simulatedAppliedPressureKg: 0,
        tempOverrideC: null,
        threshWeightWarnKg: 30,
        threshWeightCritKg: 50,
        threshTempWarnC: 38,
        threshTempCritC: 45,
        threshRollWarpDeg: 25,
      };
      this.telemetry.buzzerActive = false;
      this.telemetry.vibrationMotorActive = false;
      this.telemetry.vibrationDutyCycle = 0;
      this.telemetry.ledRed = false;
      this.telemetry.ledYellow = false;
      this.telemetry.ledGreen = true;
      this.telemetry.systemStatus = 'NORMAL';
    }

    for (const listener of this.listeners) {
      listener({ ...this.telemetry });
    }

    return sent;
  }

  public async setHardwareBaseWeight(weightKg: number): Promise<boolean> {
    this.hardwareParams.baseWeightKg = Math.max(0, weightKg);
    return this.sendCommand(`CMD:SET_BASE_WEIGHT:${weightKg.toFixed(2)}`);
  }

  public async setHardwareTemperature(tempC: number | null): Promise<boolean> {
    this.hardwareParams.tempOverrideC = tempC;
    return this.sendCommand(tempC !== null ? `CMD:SET_TEMP:${tempC.toFixed(1)}` : 'CMD:SET_TEMP:-1');
  }

  public async setHardwareThresholds(params: Partial<HardwareParameters>): Promise<boolean> {
    Object.assign(this.hardwareParams, params);
    let ok = true;
    if (params.threshWeightWarnKg !== undefined && params.threshWeightCritKg !== undefined) {
      ok = ok && (await this.sendCommand(`CMD:SET_THRESH_WEIGHT:${params.threshWeightWarnKg}:${params.threshWeightCritKg}`));
    }
    if (params.threshTempWarnC !== undefined && params.threshTempCritC !== undefined) {
      ok = ok && (await this.sendCommand(`CMD:SET_THRESH_TEMP:${params.threshTempWarnC}:${params.threshTempCritC}`));
    }
    return ok;
  }

  public async resetHardwareParameters(): Promise<boolean> {
    this.hardwareParams = {
      baseWeightKg: 0,
      simulatedAppliedPressureKg: 0,
      tempOverrideC: null,
      threshWeightWarnKg: 30,
      threshWeightCritKg: 50,
      threshTempWarnC: 38,
      threshTempCritC: 45,
      threshRollWarpDeg: 25,
    };
    return this.sendCommand('CMD:RESET_PARAMS');
  }

  public setSimulatedAppliedPressure(pressureKg: number): void {
    this.hardwareParams.simulatedAppliedPressureKg = Math.max(0, pressureKg);
    this.telemetry.loadKg = +(this.hardwareParams.baseWeightKg + pressureKg).toFixed(2);
    for (const listener of this.listeners) {
      listener({ ...this.telemetry });
    }
  }

  public getHardwareParameters(): HardwareParameters {
    return { ...this.hardwareParams };
  }

  private async readSerialLoop(): Promise<void> {
    const textDecoder = new TextDecoderStream();
    this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    let buffer = '';
    try {
      while (this.isReading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              this.parseSerialLine(trimmed);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Serial read ended:', err);
    } finally {
      this.isConnected = false;
    }
  }

  /**
   * Unified Parser supporting both formatted Hardware strings and JSON packets.
   * Format example:
   * DATA: [LOAD] W: 0.00 kg | F: 0.00 N | [STRESS] Dyn: 0.000 MPa | Peak: 0.001 MPa | [G-FORCE] 0.97 G (Shock: 9.8 m/s2) | [WARP] ΔR: 44.9° | ΔP: 29.1° | [GYRO] 0.8 °/s | [TEMP] Chassis: 24.6 C (IMU: 44.9 C) --> FRAME TORSION TWIST!
   */
  public parseSerialLine(line: string): boolean {
    if (!line) return false;

    // Notify raw log listeners
    for (const logListener of this.logListeners) {
      logListener(line);
    }

    // 1. If it's a JSON packet
    if (line.startsWith('{') && line.endsWith('}')) {
      return this.parseJsonTelemetry(line);
    }

    // 2. Parse formatted hardware line
    try {
      // Extract Load (supports "[LOAD] 0.00 kg" and "[LOAD] W: 0.00 kg | F: ... N")
      const loadMatch = line.match(/\[LOAD\]\s*(?:W:\s*)?([-\d.]+)\s*kg(?:\s*\|\s*F:\s*([-\d.]+)\s*N)?/i);
      let loadKg = loadMatch ? parseFloat(loadMatch[1]) : this.telemetry.loadKg;
      if (this.hardwareParams.simulatedAppliedPressureKg > 0) {
        loadKg = +(loadKg + this.hardwareParams.simulatedAppliedPressureKg).toFixed(2);
      }

      // Extract Stress (supports "[DYN STRESS] 0.000 MPa" and "[STRESS] Dyn: 0.000 MPa")
      const stressMatch = line.match(/\[(?:DYN\s+)?STRESS\]\s*(?:Dyn:\s*)?([-\d.]+)\s*MPa(?:\s*\|\s*Peak:\s*([-\d.]+)\s*MPa)?/i);
      const dynStressMpa = stressMatch ? parseFloat(stressMatch[1]) : 0;
      const peakStressMpa = stressMatch && stressMatch[2] ? parseFloat(stressMatch[2]) : dynStressMpa;

      // Extract G-Force / Shock (supports "[G] 0.98" and "[G-FORCE] 0.97 G (Shock: 9.8 m/s2)")
      const gforceMatch = line.match(/\[(?:G-FORCE|G)\]\s*([-\d.]+)(?:\s*G)?(?:\s*\(Shock:\s*([-\d.]+)\s*m\/s2\))?/i);
      const gForce = gforceMatch ? parseFloat(gforceMatch[1]) : 1.0;

      // Extract Warp (supports "[WARP] R: 93.1° P: 9.1°" and "[WARP] ΔR: 44.9° | ΔP: 29.1°")
      const warpMatch = line.match(/\[WARP\]\s*(?:ΔR|R):\s*([-\d.]+)\s*°?(?:(?:\s*\|\s*|\s+)(?:ΔP|P):\s*([-\d.]+)\s*°?)?/i);
      const roll = warpMatch ? parseFloat(warpMatch[1]) : this.telemetry.roll;
      const pitch = warpMatch && warpMatch[2] ? parseFloat(warpMatch[2]) : this.telemetry.pitch;

      // Extract Gyro
      const gyroMatch = line.match(/\[GYRO\]\s*([-\d.]+)\s*°\/s/i);
      const gyroVal = gyroMatch ? parseFloat(gyroMatch[1]) : 0;

      // Extract Temperature (supports "[TEMP] 24.2 C" and "[TEMP] Chassis: 24.6 C (IMU: 44.9 C)")
      const tempMatch = line.match(/\[TEMP\]\s*(?:Chassis:\s*)?([-\d.]+)\s*C(?:\s*\(IMU:\s*([-\d.]+)\s*C\))?/i);
      let chassisTemp = tempMatch ? parseFloat(tempMatch[1]) : this.telemetry.temperatureC;
      if (this.hardwareParams.tempOverrideC !== null) {
        chassisTemp = this.hardwareParams.tempOverrideC;
      }

      // Extract Alert / Status flag (e.g. "--> FRAME TORSION TWIST!!", "--> PERMANENT YIELD FAILURE!", "--> NORMAL")
      const alertMatch = line.match(/-->\s*(.+)$/i);
      const alertText = alertMatch ? alertMatch[1].trim() : '';

      // Extract Vibration Sensor State (supports "[VIB: IDLE ]", "[VIB: ACTIVE ]", "[VIB: SHOCK ]")
      const vibMatch = line.match(/\[VIB:\s*([^\]]+)\]/i);
      const vibText = vibMatch ? vibMatch[1].trim().toUpperCase() : '';
      const vibShockDetected = vibText.includes('SHOCK') || vibText.includes('ACTIVE') || vibText.includes('1') || vibText.includes('HIGH');

      // Compute Microstrain from Stress / Load
      let strainMicroStrain = 0;
      if (dynStressMpa > 0) {
        strainMicroStrain = Math.round(dynStressMpa * 500);
      } else if (loadKg > 0) {
        strainMicroStrain = Math.round(loadKg * 8);
      } else if (Math.abs(roll) > 10 || Math.abs(pitch) > 10) {
        strainMicroStrain = Math.round(Math.max(Math.abs(roll), Math.abs(pitch)) * 18);
      }

      // Compute structural deflection (mm)
      const strainDeformationMm = +(strainMicroStrain * 0.0042 + (Math.abs(roll) > 20 ? (Math.abs(roll) / 15) : 0)).toFixed(2);

      // Determine Health Status with dynamic thresholds
      let status: ChassisHealthState = 'NORMAL';
      const upperAlert = alertText.toUpperCase();

      if (
        loadKg >= this.hardwareParams.threshWeightCritKg ||
        chassisTemp >= this.hardwareParams.threshTempCritC ||
        Math.abs(roll) >= this.hardwareParams.threshRollWarpDeg ||
        upperAlert.includes('TWIST') ||
        upperAlert.includes('TORSION') ||
        upperAlert.includes('CRITICAL') ||
        upperAlert.includes('OVERLOAD') ||
        upperAlert.includes('OVERHEAT') ||
        upperAlert.includes('DAMAGE') ||
        upperAlert.includes('FAIL') ||
        upperAlert.includes('YIELD') ||
        strainMicroStrain > 900
      ) {
        status = 'CRITICAL';
      } else if (
        loadKg >= this.hardwareParams.threshWeightWarnKg ||
        chassisTemp >= this.hardwareParams.threshTempWarnC ||
        Math.abs(roll) >= (this.hardwareParams.threshRollWarpDeg * 0.6) ||
        upperAlert.includes('WARN') ||
        upperAlert.includes('SHOCK') ||
        upperAlert.includes('BUMP') ||
        vibShockDetected ||
        strainMicroStrain > 280
      ) {
        status = 'WARNING';
      } else {
        status = 'NORMAL';
      }

      const lc1Raw = Math.floor(842000 + strainMicroStrain * 18.4);
      const lc2Raw = Math.floor(841800 + strainMicroStrain * 17.9);

      this.isConnected = true;
      this.telemetry = {
        timestamp: Date.now(),
        strainMicroStrain,
        loadKg: +loadKg.toFixed(2),
        loadCell1Raw: lc1Raw,
        loadCell2Raw: lc2Raw,
        strainDeformationMm,
        accel: {
          x: +(Math.sin((roll * Math.PI) / 180)).toFixed(3),
          y: +(Math.sin((pitch * Math.PI) / 180)).toFixed(3),
          z: +gForce.toFixed(3),
        },
        gyro: {
          x: 0,
          y: 0,
          z: +gyroVal.toFixed(2),
        },
        roll: +roll.toFixed(1),
        pitch: +pitch.toFixed(1),
        yaw: 0,
        vibrationSensorDetected: vibShockDetected,
        vibrationSensorRaw: vibShockDetected ? 1 : 0,
        temperatureC: +chassisTemp.toFixed(1),
        vibrationMotorActive: status === 'CRITICAL' || status === 'WARNING',
        vibrationDutyCycle: status === 'CRITICAL' ? 255 : status === 'WARNING' ? 140 : 0,
        buzzerActive: status === 'CRITICAL',
        buzzerFrequency: status === 'CRITICAL' ? 2800 : 0,
        ledGreen: status === 'NORMAL',
        ledYellow: status === 'WARNING',
        ledRed: status === 'CRITICAL',
        systemStatus: status,
        activeScenario: 'NORMAL',
        scenarioProgress: 1.0,
        dataSource: 'REAL_HARDWARE',
      };

      for (const listener of this.listeners) {
        listener(this.telemetry);
      }
      return true;
    } catch (e) {
      console.warn('Failed parsing serial line:', e);
      return false;
    }
  }

  public parseJsonTelemetry(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      const strain = data.strain || data.ue || 0;
      const roll = data.roll ?? data.warp_r ?? 0;
      const pitch = data.pitch ?? data.warp_p ?? 0;
      const status: ChassisHealthState =
        strain > 1200 || Math.abs(roll) > 35 ? 'CRITICAL' : strain > 350 || Math.abs(roll) > 15 ? 'WARNING' : 'NORMAL';

      this.isConnected = true;
      this.telemetry = {
        timestamp: Date.now(),
        strainMicroStrain: Math.round(strain),
        loadKg: data.load || +(strain * 0.125).toFixed(1),
        loadCell1Raw: data.raw1 || Math.floor(842000 + strain * 18.4),
        loadCell2Raw: data.raw2 || Math.floor(841800 + strain * 17.9),
        strainDeformationMm: data.deflection || +(strain * 0.0042).toFixed(2),
        accel: {
          x: data.ax ?? 0,
          y: data.ay ?? 0,
          z: data.az ?? 1.0,
        },
        gyro: {
          x: data.gx ?? 0,
          y: data.gy ?? 0,
          z: data.gz ?? 0,
        },
        roll: +roll.toFixed(1),
        pitch: +pitch.toFixed(1),
        yaw: data.yaw ?? 0,
        vibrationSensorDetected: Boolean(data.vib ?? data.shock ?? data.vibration ?? false),
        vibrationSensorRaw: (data.vib ?? data.shock ?? data.vibration) ? 1 : 0,
        temperatureC: data.temp ?? 25.0,
        vibrationMotorActive: Boolean(data.motor || status !== 'NORMAL'),
        vibrationDutyCycle: data.duty ?? (status === 'CRITICAL' ? 255 : status === 'WARNING' ? 140 : 0),
        buzzerActive: Boolean(data.buzzer || status === 'CRITICAL'),
        buzzerFrequency: data.buzzer ? 2500 : status === 'CRITICAL' ? 2800 : 0,
        ledGreen: status === 'NORMAL',
        ledYellow: status === 'WARNING',
        ledRed: status === 'CRITICAL',
        systemStatus: status,
        activeScenario: 'NORMAL',
        scenarioProgress: 1.0,
        dataSource: 'REAL_HARDWARE',
      };

      for (const listener of this.listeners) {
        listener(this.telemetry);
      }
      return true;
    } catch {
      return false;
    }
  }
}
