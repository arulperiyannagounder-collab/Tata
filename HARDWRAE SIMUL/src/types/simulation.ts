/**
 * Simulation and Hardware Data Types for SHIELD EV Chassis Structural Health Monitoring
 */

export type ChassisHealthState = 'NORMAL' | 'WARNING' | 'CRITICAL';

export type ImpactScenario = 'NORMAL' | 'POTHOLE' | 'MINOR_IMPACT' | 'MAJOR_IMPACT' | 'STRUCTURAL_DAMAGE';

export type ViewMode = 'HARDWARE';

export type NavigationPage = 'LIVE_DATA' | 'HARDWARE_CONTROL' | 'BENCH_3D';

export interface HardwareParameters {
  baseWeightKg: number;
  simulatedAppliedPressureKg: number;
  tempOverrideC: number | null;
  threshWeightWarnKg: number;
  threshWeightCritKg: number;
  threshTempWarnC: number;
  threshTempCritC: number;
  threshRollWarpDeg: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface SensorTelemetry {
  timestamp: number;
  // Load cells (Chassis Structural Strain)
  strainMicroStrain: number;      // in microstrains (με), baseline ~0
  loadKg: number;                 // Equivalent mechanical load (kg)
  loadCell1Raw: number;           // ADC value LC1
  loadCell2Raw: number;           // ADC value LC2
  strainDeformationMm: number;     // Structural deflection (mm)
  
  // MPU6050 IMU
  accel: Vector3D;                // in g (X, Y, Z)
  gyro: Vector3D;                 // in deg/s (X, Y, Z)
  roll: number;                   // degrees
  pitch: number;                  // degrees
  yaw: number;                    // degrees
  
  // SW-420 Digital Vibration Sensor
  vibrationSensorDetected: boolean; // Active-high digital impulse trigger
  vibrationSensorRaw: number;     // 0 = IDLE, 1 = SHOCK / VIBRATION DETECTED

  // DS18B20 Temperature
  temperatureC: number;           // in °C
  
  // Actuators & Indicators
  vibrationMotorActive: boolean;
  vibrationDutyCycle: number;     // 0 to 255 (PWM)
  buzzerActive: boolean;
  buzzerFrequency: number;        // in Hz
  
  // Traffic LEDs
  ledGreen: boolean;
  ledYellow: boolean;
  ledRed: boolean;
  
  // System state
  systemStatus: ChassisHealthState;
  activeScenario: ImpactScenario;
  scenarioProgress: number;       // 0 to 1 for active transient event
  dataSource: 'SIMULATION' | 'REAL_HARDWARE';
}

export interface GpioPinState {
  pinNumber: number;
  name: string;
  mode: 'INPUT' | 'OUTPUT' | 'I2C' | 'ANALOG' | 'POWER';
  voltage: number;                // 0V, 3.3V, 5V
  logicLevel: 0 | 1 | null;
  targetDevice: string;
  description: string;
}

export interface WireConnection {
  id: string;
  name: string;
  sourceComponent: string;
  sourcePin: string;
  targetComponent: string;
  targetPin: string;
  color: string;                  // Hex or css color
  colorName: '3.3V (Red)' | '5V (Orange)' | 'GND (Black)' | 'I2C SDA (Blue)' | 'I2C SCL (Green)' | 'GPIO (Yellow)' | 'Sensor Data (Purple)' | 'Load Cell (White/Black)';
  signalType: 'POWER_3V3' | 'POWER_5V' | 'GND' | 'I2C_SDA' | 'I2C_SCL' | 'GPIO_CONTROL' | 'ONE_WIRE' | 'BRIDGE_SIGNAL';
  activeSignal: boolean;
  voltageText: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'FAULT';
}

export interface HardwareComponentMeta {
  id: string;
  name: string;
  subtitle: string;
  category: 'MCU' | 'ADC' | 'SENSOR' | 'DRIVER' | 'ACTUATOR' | 'INDICATOR' | 'PASSIVE' | 'POWER' | 'CHASSIS';
  pinCount: number;
  operatingVoltage: string;
  description: string;
  currentRole: string;
  pins: {
    pinName: string;
    pinType: string;
    connectedTo: string;
    currentVal?: string;
  }[];
}

export interface LoadCellWiringConfig {
  ePlusColor: string;
  eMinusColor: string;
  aPlusColor: string;
  aMinusColor: string;
}

export interface ValidationErrorItem {
  component: string;
  pin: string;
  expected: string;
  actual: string;
  severity: 'CRITICAL' | 'WARNING';
  suggestion: string;
}

export interface ValidationReport {
  isValid: boolean;
  timestamp: string;
  totalChecks: number;
  passedChecks: number;
  errors: ValidationErrorItem[];
}

export type WireRoutingMode = 'ALIGNED_ORTHOGONAL' | 'VALIDATED_TIGHT' | 'STANDARD_SLACK';

export interface ComponentLockState {
  [componentId: string]: boolean;
}

export interface ConnectionCheckItem {
  id: string;
  label: string;
  source: string;
  sourcePin: string;
  target: string;
  targetPin: string;
  signalType: string;
  status: 'VALIDATED' | 'CHECKING' | 'PENDING' | 'FAULT';
  details: string;
}
