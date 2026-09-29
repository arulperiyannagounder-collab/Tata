import { ValidationErrorItem, ValidationReport, WireConnection } from '../types/simulation';

export interface CircuitStateOverrides {
  disconnectWireIds?: string[];
  swappedConnections?: Record<string, string>; // wireId -> targetPin
  missingPullUpResistor?: boolean;
  missingLedResistors?: boolean;
}

export class ElectricalValidator {
  /**
   * Validates the active electrical connections against the SHIELD schematic specification
   */
  static validate(
    wires: WireConnection[],
    overrides: CircuitStateOverrides = {}
  ): ValidationReport {
    const errors: ValidationErrorItem[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    // Helper to find wire
    const findWire = (srcComp: string, srcPin: string, tgtComp: string, tgtPin: string) => {
      totalChecks++;
      const wire = wires.find(
        (w) =>
          ((w.sourceComponent === srcComp && w.sourcePin === srcPin &&
            w.targetComponent === tgtComp && w.targetPin === tgtPin) ||
           (w.sourceComponent === tgtComp && w.sourcePin === tgtPin &&
            w.targetComponent === srcComp && w.targetPin === srcPin))
      );

      if (!wire) return null;
      if (overrides.disconnectWireIds?.includes(wire.id)) return null;
      return wire;
    };

    // 1. ESP32-C3 Power Rail validation
    const pwr3v3 = findWire('ESP32-C3', '3.3V', 'Breadboard Rail', '+ 3.3V');
    if (!pwr3v3) {
      errors.push({
        component: 'Breadboard Rail',
        pin: '+ 3.3V',
        expected: 'ESP32-C3 3.3V',
        actual: 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'Connect ESP32-C3 3.3V pin to Breadboard positive (+) 3.3V power rail using Red jumper wire.'
      });
    } else {
      passedChecks++;
    }

    const gndRail = findWire('ESP32-C3', 'GND', 'Breadboard Rail', '- GND');
    if (!gndRail) {
      errors.push({
        component: 'Breadboard Rail',
        pin: '- GND',
        expected: 'ESP32-C3 GND',
        actual: 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'Connect ESP32-C3 GND pin to Breadboard negative (-) ground rail using Black jumper wire.'
      });
    } else {
      passedChecks++;
    }

    // 2. L298N Power Supply
    const l298nPwr = findWire('ESP32-C3', '5V/VIN', 'L298N', '12V/VCC');
    if (!l298nPwr) {
      errors.push({
        component: 'L298N Motor Driver',
        pin: '12V/VCC',
        expected: 'ESP32-C3 5V/VIN (or 5V Power Module)',
        actual: 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'Connect ESP32-C3 5V/VIN supply line to L298N power terminal (labeled 12V/VCC on board).'
      });
    } else {
      passedChecks++;
    }

    const l298nGnd = findWire('L298N', 'GND', 'Breadboard Rail', '- GND');
    if (!l298nGnd) {
      errors.push({
        component: 'L298N Motor Driver',
        pin: 'GND',
        expected: 'Common GND Rail',
        actual: 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'L298N must share common GND with ESP32-C3 for logic level reference.'
      });
    } else {
      passedChecks++;
    }

    // 3. HX711 ADC Connections
    const hxVcc = findWire('HX711', 'VCC', 'Breadboard Rail', '+ 3.3V');
    if (!hxVcc) {
      errors.push({
        component: 'HX711 ADC',
        pin: 'VCC',
        expected: '3.3V Rail',
        actual: 'NO POWER',
        severity: 'CRITICAL',
        suggestion: 'Connect HX711 VCC to 3.3V power bus.'
      });
    } else {
      passedChecks++;
    }

    const hxGnd = findWire('HX711', 'GND', 'Breadboard Rail', '- GND');
    if (!hxGnd) {
      errors.push({
        component: 'HX711 ADC',
        pin: 'GND',
        expected: 'GND Rail',
        actual: 'NO GND',
        severity: 'CRITICAL',
        suggestion: 'Connect HX711 GND to common ground.'
      });
    } else {
      passedChecks++;
    }

    const hxDt = findWire('HX711', 'DT', 'ESP32-C3', 'GPIO 6');
    if (!hxDt) {
      const swapped = overrides.swappedConnections?.['wire-hx711-dt'];
      errors.push({
        component: 'HX711 ADC',
        pin: 'DT (Data)',
        expected: 'ESP32-C3 GPIO 6',
        actual: swapped || 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'HX711 Serial Data line (DT) must connect to GPIO 6.'
      });
    } else {
      passedChecks++;
    }

    const hxSck = findWire('HX711', 'SCK', 'ESP32-C3', 'GPIO 7');
    if (!hxSck) {
      errors.push({
        component: 'HX711 ADC',
        pin: 'SCK (Clock)',
        expected: 'ESP32-C3 GPIO 7',
        actual: 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'HX711 Serial Clock line (SCK) must connect to GPIO 7.'
      });
    } else {
      passedChecks++;
    }

    // 3b. Wheatstone Combiner to HX711 Differential & Excitation Inputs
    const bridgeEPlus = findWire('Wheatstone Combiner', 'Bridge E+', 'HX711', 'E+') ||
      findWire('Load Cells (4x)', 'Bridge E+', 'HX711', 'E+');
    if (!bridgeEPlus) {
      errors.push({
        component: 'HX711 ADC',
        pin: 'E+ (Excitation +)',
        expected: 'Wheatstone Combiner Bridge E+',
        actual: 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'Connect Wheatstone Combiner Bridge E+ to HX711 E+ terminal.'
      });
    } else {
      passedChecks++;
    }

    const bridgeEMinus = findWire('Wheatstone Combiner', 'Bridge E-', 'HX711', 'E-') ||
      findWire('Load Cells (4x)', 'Bridge E-', 'HX711', 'E-');
    if (!bridgeEMinus) {
      errors.push({
        component: 'HX711 ADC',
        pin: 'E- (Excitation -)',
        expected: 'Wheatstone Combiner Bridge E-',
        actual: 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'Connect Wheatstone Combiner Bridge E- to HX711 E- terminal.'
      });
    } else {
      passedChecks++;
    }

    const bridgeAPlus = findWire('Wheatstone Combiner', 'Bridge A+', 'HX711', 'A+') ||
      findWire('Load Cells (4x)', 'Bridge A+', 'HX711', 'A+');
    if (!bridgeAPlus) {
      errors.push({
        component: 'HX711 ADC',
        pin: 'A+ (Signal +)',
        expected: 'Wheatstone Combiner Bridge A+',
        actual: 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'Connect Wheatstone Combiner Bridge A+ differential signal to HX711 A+.'
      });
    } else {
      passedChecks++;
    }

    const bridgeAMinus = findWire('Wheatstone Combiner', 'Bridge A-', 'HX711', 'A-') ||
      findWire('Load Cells (4x)', 'Bridge A-', 'HX711', 'A-');
    if (!bridgeAMinus) {
      errors.push({
        component: 'HX711 ADC',
        pin: 'A- (Signal -)',
        expected: 'Wheatstone Combiner Bridge A-',
        actual: 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'Connect Wheatstone Combiner Bridge A- differential signal to HX711 A-.'
      });
    } else {
      passedChecks++;
    }

    // 3c. Individual Load Cells (LC1, LC2, LC3, LC4) to Combiner Junction
    ['1', '2', '3', '4'].forEach((num) => {
      const lcWhite = findWire(`Load Cell ${num}`, 'White (Center Tap)', 'Wheatstone Combiner', `LC${num} White`);
      if (lcWhite) {
        passedChecks++;
      }
    });

    // 4. MPU6050 IMU Connections
    const mpuVcc = findWire('MPU6050', 'VCC', 'Breadboard Rail', '+ 3.3V');
    if (!mpuVcc) {
      errors.push({
        component: 'MPU6050 IMU',
        pin: 'VCC',
        expected: '3.3V Rail',
        actual: 'NO POWER',
        severity: 'CRITICAL',
        suggestion: 'Power MPU6050 with 3.3V supply.'
      });
    } else {
      passedChecks++;
    }

    const mpuGnd = findWire('MPU6050', 'GND', 'Breadboard Rail', '- GND');
    if (!mpuGnd) {
      errors.push({
        component: 'MPU6050 IMU',
        pin: 'GND',
        expected: 'GND Rail',
        actual: 'NO GND',
        severity: 'CRITICAL',
        suggestion: 'Ground MPU6050 to common GND.'
      });
    } else {
      passedChecks++;
    }

    const mpuSda = findWire('MPU6050', 'SDA', 'ESP32-C3', 'GPIO 8');
    if (!mpuSda) {
      const swapped = overrides.swappedConnections?.['wire-mpu6050-sda'];
      errors.push({
        component: 'MPU6050 IMU',
        pin: 'SDA',
        expected: 'ESP32-C3 GPIO 8',
        actual: swapped || 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'I2C Data line (SDA) must connect to GPIO 8.'
      });
    } else {
      passedChecks++;
    }

    const mpuScl = findWire('MPU6050', 'SCL', 'ESP32-C3', 'GPIO 9');
    if (!mpuScl) {
      errors.push({
        component: 'MPU6050 IMU',
        pin: 'SCL',
        expected: 'ESP32-C3 GPIO 9',
        actual: 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'I2C Clock line (SCL) must connect to GPIO 9.'
      });
    } else {
      passedChecks++;
    }

    // 5. DS18B20 Temperature Sensor & 4.7kΩ Pull-up Resistor
    const dsVcc = findWire('DS18B20', 'VCC (Red)', 'Breadboard Rail', '+ 3.3V');
    if (!dsVcc) {
      errors.push({
        component: 'DS18B20 Probe',
        pin: 'VCC (Red)',
        expected: '3.3V Rail',
        actual: 'NO POWER',
        severity: 'CRITICAL',
        suggestion: 'Connect DS18B20 red wire to 3.3V.'
      });
    } else {
      passedChecks++;
    }

    const dsGnd = findWire('DS18B20', 'GND (Black)', 'Breadboard Rail', '- GND');
    if (!dsGnd) {
      errors.push({
        component: 'DS18B20 Probe',
        pin: 'GND (Black)',
        expected: 'GND Rail',
        actual: 'NO GND',
        severity: 'CRITICAL',
        suggestion: 'Connect DS18B20 black wire to GND.'
      });
    } else {
      passedChecks++;
    }

    const dsData = findWire('DS18B20', 'DATA (Yellow)', 'ESP32-C3', 'GPIO 5');
    if (!dsData) {
      errors.push({
        component: 'DS18B20 Probe',
        pin: 'DATA (Yellow)',
        expected: 'ESP32-C3 GPIO 5',
        actual: 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'Connect DS18B20 yellow 1-Wire signal to GPIO 5.'
      });
    } else {
      passedChecks++;
    }

    // Pull-up resistor check
    totalChecks++;
    if (overrides.missingPullUpResistor) {
      errors.push({
        component: 'DS18B20 Circuit',
        pin: '1-Wire Bus',
        expected: '4.7kΩ Pull-up Resistor to 3.3V',
        actual: 'MISSING RESISTOR (Bus Floating)',
        severity: 'CRITICAL',
        suggestion: '1-Wire protocol requires a 4.7kΩ pull-up between 3.3V and DATA (GPIO 5) or sensor will read -127°C.'
      });
    } else {
      passedChecks++;
    }

    // 6. L298N Control & Motor Output
    const l298nIn3 = findWire('ESP32-C3', 'GPIO 4', 'L298N', 'IN3');
    if (!l298nIn3) {
      errors.push({
        component: 'L298N Motor Driver',
        pin: 'IN3',
        expected: 'ESP32-C3 GPIO 4',
        actual: 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'Connect GPIO 4 to L298N IN3 to drive vibration motor PWM.'
      });
    } else {
      passedChecks++;
    }

    const l298nIn4 = findWire('L298N', 'IN4', 'Breadboard Rail', '- GND');
    if (!l298nIn4) {
      errors.push({
        component: 'L298N Motor Driver',
        pin: 'IN4',
        expected: 'Common GND',
        actual: 'DISCONNECTED',
        severity: 'WARNING',
        suggestion: 'Tie IN4 to GND for single-direction forward vibration drive.'
      });
    } else {
      passedChecks++;
    }

    const motorOut3 = findWire('L298N', 'OUT3', 'Coin Motor', 'Lead (+) Red');
    const motorOut4 = findWire('L298N', 'OUT4', 'Coin Motor', 'Lead (-) Blue/Black');
    if (!motorOut3 || !motorOut4) {
      errors.push({
        component: 'Coin Vibration Motor',
        pin: 'Terminals',
        expected: 'L298N OUT3 (+) & OUT4 (-)',
        actual: 'MOTOR UNCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'Connect coin vibration motor leads to L298N H-Bridge OUT3 & OUT4.'
      });
    } else {
      passedChecks += 2;
    }

    // 7. Active Buzzer
    const buzzerPos = findWire('ESP32-C3', 'GPIO 3', 'Buzzer', 'Positive (+) Long Pin');
    const buzzerGnd = findWire('Buzzer', 'Negative (-) Short Pin', 'Breadboard Rail', '- GND');
    if (!buzzerPos || !buzzerGnd) {
      errors.push({
        component: 'Active Buzzer',
        pin: 'Positive (+)',
        expected: 'ESP32-C3 GPIO 3 & GND',
        actual: 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'Connect Active Buzzer long lead to GPIO 3, short lead to GND.'
      });
    } else {
      passedChecks += 2;
    }

    // 8. Industrial 3-LED Traffic Module & SMD 220Ω Resistors
    const ledGnd = findWire('Traffic LED Module', 'Pin 1: GND', 'ESP32-C3', 'GND');
    if (!ledGnd) {
      errors.push({
        component: 'Traffic LED Module',
        pin: 'Pin 1: GND',
        expected: 'ESP32 Common GND',
        actual: 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'Connect Traffic LED Breakout Module Pin 1 (GND) to ESP32 Common Ground using black jumper wire.'
      });
    } else {
      passedChecks++;
    }

    const redLed = findWire('Traffic LED Module', 'Pin 2: RED', 'ESP32-C3', 'GPIO 10');
    if (!redLed) {
      errors.push({
        component: 'Traffic LED Module',
        pin: 'Pin 2: RED',
        expected: 'ESP32-C3 GPIO 10',
        actual: 'DISCONNECTED',
        severity: 'WARNING',
        suggestion: 'Connect Traffic LED Module Pin 2 (RED) to ESP32-C3 GPIO 10 using yellow jumper wire.'
      });
    } else {
      passedChecks++;
    }

    const yellowLed = findWire('Traffic LED Module', 'Pin 3: YEL', 'ESP32-C3', 'GPIO 1');
    if (!yellowLed) {
      errors.push({
        component: 'Traffic LED Module',
        pin: 'Pin 3: YEL',
        expected: 'ESP32-C3 GPIO 1',
        actual: 'DISCONNECTED',
        severity: 'WARNING',
        suggestion: 'Connect Traffic LED Module Pin 3 (YEL) to ESP32-C3 GPIO 1 using yellow jumper wire.'
      });
    } else {
      passedChecks++;
    }

    const greenLed = findWire('Traffic LED Module', 'Pin 4: GRN', 'ESP32-C3', 'GPIO 0');
    if (!greenLed) {
      errors.push({
        component: 'Traffic LED Module',
        pin: 'Pin 4: GRN',
        expected: 'ESP32-C3 GPIO 0',
        actual: 'DISCONNECTED',
        severity: 'WARNING',
        suggestion: 'Connect Traffic LED Module Pin 4 (GRN) to ESP32-C3 GPIO 0 using yellow jumper wire.'
      });
    } else {
      passedChecks++;
    }

    totalChecks++;
    if (overrides.missingLedResistors) {
      errors.push({
        component: 'Traffic LED Module',
        pin: 'SMD Ballast Resistors',
        expected: '3x SMD 0805 220Ω Onboard Resistors',
        actual: 'MISSING RESISTORS (Overcurrent Danger)',
        severity: 'CRITICAL',
        suggestion: 'Driving 5mm LEDs directly from ESP32 GPIOs without 220Ω resistors will damage the GPIO ports!'
      });
    } else {
      passedChecks++;
    }

    // 9. SW-420 Digital Vibration Sensor
    const swVcc = findWire('SW-420 Vibration Sensor', 'VCC', 'Breadboard Rail', '+ 3.3V');
    if (!swVcc) {
      errors.push({
        component: 'SW-420 Vibration Sensor',
        pin: 'VCC',
        expected: '3.3V Power Rail',
        actual: 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'Connect SW-420 Vibration Sensor VCC pin to Breadboard +3.3V rail using red jumper wire.'
      });
    } else {
      passedChecks++;
    }

    const swGnd = findWire('SW-420 Vibration Sensor', 'GND', 'Breadboard Rail', '- GND');
    if (!swGnd) {
      errors.push({
        component: 'SW-420 Vibration Sensor',
        pin: 'GND',
        expected: 'Common GND Rail',
        actual: 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'Connect SW-420 Vibration Sensor GND pin to Breadboard -GND rail using black jumper wire.'
      });
    } else {
      passedChecks++;
    }

    const swDo = findWire('SW-420 Vibration Sensor', 'DO', 'ESP32-C3', 'GPIO 2');
    if (!swDo) {
      errors.push({
        component: 'SW-420 Vibration Sensor',
        pin: 'DO (Digital Out)',
        expected: 'ESP32-C3 GPIO 2',
        actual: 'DISCONNECTED',
        severity: 'CRITICAL',
        suggestion: 'Connect SW-420 Vibration Sensor DO digital trigger pin to ESP32-C3 GPIO 2 using yellow jumper wire.'
      });
    } else {
      passedChecks++;
    }

    return {
      isValid: errors.length === 0,
      timestamp: new Date().toLocaleTimeString(),
      totalChecks,
      passedChecks,
      errors
    };
  }
}
