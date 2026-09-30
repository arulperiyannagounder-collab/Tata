import React, { useState, useEffect, useRef } from 'react';
import {
  SensorTelemetry,
  ViewMode,
  ImpactScenario,
  HardwareComponentMeta,
  WireConnection,
  LoadCellWiringConfig,
  ComponentLockState,
  WireRoutingMode,
  NavigationPage,
  HardwareParameters,
} from './types/simulation';
import {
  SimulatedSensorDataProvider,
  RealESP32SensorDataProvider,
  SensorDataProvider,
} from './services/SensorDataProvider';
import { HARDWARE_COMPONENTS, INITIAL_WIRES } from './data/hardwareLayout';
import { Scene3D } from './components/3d/Scene3D';
import { Header } from './components/dashboard/Header';
import { TelemetryDashboard } from './components/dashboard/TelemetryDashboard';
import { BottomControls } from './components/dashboard/BottomControls';
import { ComponentInspectorModal } from './components/modals/ComponentInspectorModal';
import { ComponentLockValidationPanel } from './components/modals/ComponentLockValidationPanel';
import { ConnectionValidationModal } from './components/modals/ConnectionValidationModal';
import { LoadCellConfigModal } from './components/modals/LoadCellConfigModal';
import { RealHardwareModal } from './components/modals/RealHardwareModal';
import { LiveHardwareDataPage } from './components/pages/LiveHardwareDataPage';
import { HardwareControlBenchPage } from './components/pages/HardwareControlBenchPage';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import {
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronLeft,
  Cpu,
  Bell,
  Zap,
  Sparkles,
  RotateCcw,
  Lock,
  Unlock,
  X,
  FileText,
  Check,
  AlertTriangle,
} from 'lucide-react';

function AppContent() {
  const { isDark } = useTheme();
  // Data providers
  const simProviderRef = useRef<SimulatedSensorDataProvider | null>(null);
  const realProviderRef = useRef<RealESP32SensorDataProvider | null>(null);
  const [activeProvider, setActiveProvider] = useState<'SIMULATION' | 'REAL_HARDWARE'>('SIMULATION');

  // Application state
  const [telemetry, setTelemetry] = useState<SensorTelemetry>({
    timestamp: Date.now(),
    strainMicroStrain: 14,
    loadKg: 25.0,
    loadCell1Raw: 842100,
    loadCell2Raw: 841950,
    strainDeformationMm: 0.08,
    accel: { x: 0.01, y: 0.02, z: 1.0 },
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
  });

  // Active Navigation Page (Live Data | Hardware Control & Testing | 3D Bench)
  const [currentPage, setCurrentPage] = useState<NavigationPage>('LIVE_DATA');

  // Dynamic Hardware Calibration & Safety Threshold Parameters
  const [hardwareParams, setHardwareParams] = useState<HardwareParameters>({
    baseWeightKg: 0,
    simulatedAppliedPressureKg: 0,
    tempOverrideC: null,
    threshWeightWarnKg: 30,
    threshWeightCritKg: 50,
    threshTempWarnC: 38,
    threshTempCritC: 45,
    threshRollWarpDeg: 25,
  });

  const [rawLogs, setRawLogs] = useState<string[]>([]);

  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [activeScenario, setActiveScenario] = useState<ImpactScenario>('NORMAL');
  const [viewMode] = useState<ViewMode>('HARDWARE');

  // Interactive selection
  const [wires, setWires] = useState<WireConnection[]>(INITIAL_WIRES);
  const [components] = useState<HardwareComponentMeta[]>(HARDWARE_COMPONENTS);
  const [selectedComponent, setSelectedComponent] = useState<HardwareComponentMeta | null>(null);
  const [selectedWire, setSelectedWire] = useState<WireConnection | null>(null);

  // Component Lock & Axis Rigidity Control
  const [lockedComponents, setLockedComponents] = useState<ComponentLockState>({
    'breadboard': true,
    'esp32-c3': true,
    'hx711': true,
    'load-cell-1': true,
    'load-cell-2': true,
    'load-cell-3': true,
    'load-cell-4': true,
    'load-cell-combiner': true,
    'mpu6050': true,
    'sw420': true,
    'ds18b20': true,
    'l298n': true,
    'coin-motor': true,
    'buzzer': true,
    'traffic-leds': true,
  });

  // Wire routing geometry mode: Tight optimal Bézier vs lab sag slack
  const [routingMode, setRoutingMode] = useState<WireRoutingMode>('ALIGNED_ORTHOGONAL');
  const [isTracingConnections, setIsTracingConnections] = useState<boolean>(false);

  // Lock toggles
  const handleToggleLock = (id: string) => {
    setLockedComponents((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleLockAll = () => {
    setLockedComponents({
      'breadboard': true,
      'esp32-c3': true,
      'hx711': true,
      'load-cell-1': true,
      'load-cell-2': true,
      'load-cell-3': true,
      'load-cell-4': true,
      'load-cell-combiner': true,
      'mpu6050': true,
      'sw420': true,
      'ds18b20': true,
      'l298n': true,
      'coin-motor': true,
      'buzzer': true,
      'traffic-leds': true,
    });
  };

  const handleUnlockAll = () => {
    setLockedComponents({
      'breadboard': false,
      'esp32-c3': false,
      'hx711': false,
      'load-cell-1': false,
      'load-cell-2': false,
      'load-cell-3': false,
      'load-cell-4': false,
      'load-cell-combiner': false,
      'mpu6050': false,
      'sw420': false,
      'ds18b20': false,
      'l298n': false,
      'coin-motor': false,
      'buzzer': false,
      'traffic-leds': false,
    });
  };

  const handleRunLiveTrace = () => {
    setIsTracingConnections(true);
    setTimeout(() => {
      setIsTracingConnections(false);
    }, 1800);
  };

  // Modals
  const [activeModal, setActiveModal] = useState<'INSPECTOR' | 'VALIDATOR' | 'LOAD_CELL_CONFIG' | 'REAL_HARDWARE' | null>(null);

  // Load cell configurable mapping
  const [loadCellConfig, setLoadCellConfig] = useState<LoadCellWiringConfig>({
    ePlusColor: 'Red (#ef4444)',
    eMinusColor: 'Black (#1e293b)',
    aPlusColor: 'Twisted Black (#334155)',
    aMinusColor: 'Twisted White (#e2e8f0)',
  });

  const activeProviderRef = useRef<'SIMULATION' | 'REAL_HARDWARE'>('SIMULATION');

  useEffect(() => {
    activeProviderRef.current = activeProvider;
  }, [activeProvider]);

  // Initialize providers once on mount
  useEffect(() => {
    const sim = new SimulatedSensorDataProvider();
    const real = new RealESP32SensorDataProvider();
    simProviderRef.current = sim;
    realProviderRef.current = real;

    const unsubSim = sim.subscribe((data) => {
      if (activeProviderRef.current === 'SIMULATION') {
        setTelemetry(data);
      }
    });

    const unsubReal = real.subscribe((data) => {
      if (real.isConnected) {
        if (activeProviderRef.current !== 'REAL_HARDWARE') {
          activeProviderRef.current = 'REAL_HARDWARE';
          setActiveProvider('REAL_HARDWARE');
        }
        setTelemetry(data);
      }
    });

    const unsubLogs = real.subscribeLogs((line) => {
      setRawLogs((prev) => [...prev.slice(-80), line]);
    });

    return () => {
      unsubSim();
      unsubReal();
      unsubLogs();
      sim.pause();
    };
  }, []);

  // Hardware Parameter Handlers (Base Weight, Temperature, Thresholds)
  const handleSetBaseWeight = async (weightKg: number): Promise<boolean> => {
    setHardwareParams((prev) => ({ ...prev, baseWeightKg: weightKg }));
    if (activeProvider === 'REAL_HARDWARE' && realProviderRef.current) {
      return realProviderRef.current.setHardwareBaseWeight(weightKg);
    } else if (simProviderRef.current) {
      return simProviderRef.current.setHardwareBaseWeight(weightKg);
    }
    return true;
  };

  const handleSetTemperature = async (tempC: number | null): Promise<boolean> => {
    setHardwareParams((prev) => ({ ...prev, tempOverrideC: tempC }));
    if (activeProvider === 'REAL_HARDWARE' && realProviderRef.current) {
      return realProviderRef.current.setHardwareTemperature(tempC);
    } else if (simProviderRef.current) {
      return simProviderRef.current.setHardwareTemperature(tempC);
    }
    return true;
  };

  const handleSetThresholds = async (params: Partial<HardwareParameters>): Promise<boolean> => {
    setHardwareParams((prev) => ({ ...prev, ...params }));
    if (activeProvider === 'REAL_HARDWARE' && realProviderRef.current) {
      return realProviderRef.current.setHardwareThresholds(params);
    } else if (simProviderRef.current) {
      return simProviderRef.current.setHardwareThresholds(params);
    }
    return true;
  };

  const handleResetParameters = async (): Promise<boolean> => {
    const defaults: HardwareParameters = {
      baseWeightKg: 0,
      simulatedAppliedPressureKg: 0,
      tempOverrideC: null,
      threshWeightWarnKg: 30,
      threshWeightCritKg: 50,
      threshTempWarnC: 38,
      threshTempCritC: 45,
      threshRollWarpDeg: 25,
    };
    setHardwareParams(defaults);
    if (activeProvider === 'REAL_HARDWARE' && realProviderRef.current) {
      return realProviderRef.current.resetHardwareParameters();
    } else if (simProviderRef.current) {
      return simProviderRef.current.resetHardwareParameters();
    }
    return true;
  };

  const handleSetSimulatedPressure = (pressureKg: number) => {
    setHardwareParams((prev) => ({ ...prev, simulatedAppliedPressureKg: pressureKg }));
    if (activeProvider === 'REAL_HARDWARE' && realProviderRef.current) {
      realProviderRef.current.setSimulatedAppliedPressure(pressureKg);
    } else if (simProviderRef.current) {
      simProviderRef.current.setSimulatedAppliedPressure(pressureKg);
    }
  };

  // Simulation Controls Handlers
  const handleStart = () => {
    setIsRunning(true);
    if (activeProvider === 'SIMULATION' && simProviderRef.current) {
      simProviderRef.current.start();
    }
  };

  const handlePause = () => {
    setIsRunning(false);
    if (activeProvider === 'SIMULATION' && simProviderRef.current) {
      simProviderRef.current.pause();
    }
  };

  const handleReset = () => {
    setActiveScenario('NORMAL');
    setIsRunning(true);
    if (activeProvider === 'SIMULATION' && simProviderRef.current) {
      simProviderRef.current.reset();
      simProviderRef.current.start();
    }
  };

  const handleSelectScenario = (scenario: ImpactScenario) => {
    setActiveScenario(scenario);
    if (activeProvider === 'SIMULATION' && simProviderRef.current) {
      simProviderRef.current.setScenario(scenario);
    }
  };

  const handleOpenInspector = (comp: HardwareComponentMeta | null) => {
    setSelectedComponent(comp);
    if (comp) {
      setActiveModal('INSPECTOR');
    }
  };

  // Sidebar visibility toggle for clean view
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isControlSlideBarOpen, setIsControlSlideBarOpen] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const handleToggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullScreen(true);
      }).catch(() => {
        setIsFullScreen((prev) => !prev);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullScreen(false);
        }).catch(() => {
          setIsFullScreen(false);
        });
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullScreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Helper to render live real-time values for the clicked component
  // Hardware Remote Actuator Control Handler
  const handleHardwareControl = async (command: string) => {
    if (realProviderRef.current) {
      await realProviderRef.current.sendCommand(command);
    }
  };

  // Helper to render live real-time values & interactive hardware controls for the clicked component
  const renderLiveTelemetryForComponent = (comp: HardwareComponentMeta) => {
    const cardBg = isDark ? 'bg-slate-950/90 border-cyan-500/40' : 'bg-white border-slate-300 shadow-xs';
    const subCardBg = isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200';
    const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
    const textHeading = isDark ? 'text-white' : 'text-slate-900';

    switch (comp.id) {
      case 'sw420':
        return (
          <div className="space-y-2">
            <div className={`p-2 rounded-lg border text-[11px] font-mono space-y-1.5 ${cardBg}`}>
              <div className="flex justify-between items-center">
                <span className={`${textMuted} text-[10px]`}>SHOCK SENSOR:</span>
                <span className={`font-bold text-xs ${telemetry.vibrationSensorDetected ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
                  {telemetry.vibrationSensorDetected ? 'TRIGGERED (SHOCK)' : 'IDLE (NOMINAL)'}
                </span>
              </div>
              <div className={`flex justify-between text-[10px] ${textMuted} pt-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span>DO PIN (GPIO 2):</span>
                <span className={isDark ? 'text-amber-300 font-bold' : 'text-amber-600 font-bold'}>{telemetry.vibrationSensorDetected ? 'HIGH (3.3V)' : 'LOW (0V)'}</span>
              </div>
              <div className={`flex justify-between text-[10px] ${textMuted}`}>
                <span>MECHANISM:</span>
                <span className={isDark ? 'text-cyan-300' : 'text-cyan-700'}>Normally Closed Spring</span>
              </div>
            </div>
          </div>
        );

      case 'mpu6050':
        return (
          <div className="space-y-2">
            <div className={`grid grid-cols-2 gap-1.5 p-2 rounded-lg border text-[11px] font-mono ${cardBg}`}>
              <div className={`p-1.5 rounded border ${subCardBg}`}>
                <span className={`${textMuted} block text-[9px]`}>ROLL (ΔR)</span>
                <span className={`${isDark ? 'text-cyan-300' : 'text-cyan-700'} font-bold text-sm tabular-nums`}>{telemetry.roll}°</span>
              </div>
              <div className={`p-1.5 rounded border ${subCardBg}`}>
                <span className={`${textMuted} block text-[9px]`}>PITCH (ΔP)</span>
                <span className={`${isDark ? 'text-cyan-300' : 'text-cyan-700'} font-bold text-sm tabular-nums`}>{telemetry.pitch}°</span>
              </div>
              <div className={`p-1.5 rounded border ${subCardBg}`}>
                <span className={`${textMuted} block text-[9px]`}>G-FORCE</span>
                <span className={`${textHeading} font-bold text-xs tabular-nums`}>{telemetry.accel.z} G</span>
              </div>
              <div className={`p-1.5 rounded border ${subCardBg}`}>
                <span className={`${textMuted} block text-[9px]`}>GYRO RATE</span>
                <span className={`${textHeading} font-bold text-xs tabular-nums`}>{telemetry.gyro.z} °/s</span>
              </div>
            </div>
          </div>
        );

      case 'hx711':
      case 'load-cell-1':
      case 'load-cell-2':
      case 'load-cell-3':
      case 'load-cell-4':
      case 'load-cell-combiner':
        return (
          <div className="space-y-2">
            <div className={`grid grid-cols-2 gap-1.5 p-2 rounded-lg border text-[11px] font-mono ${cardBg}`}>
              <div className={`p-1.5 rounded border ${subCardBg}`}>
                <span className={`${textMuted} block text-[9px]`}>LOAD WEIGHT</span>
                <span className={`${textHeading} font-bold text-sm tabular-nums`}>{telemetry.loadKg} kg</span>
              </div>
              <div className={`p-1.5 rounded border ${subCardBg}`}>
                <span className={`${textMuted} block text-[9px]`}>MICROSTRAIN</span>
                <span className={`font-bold text-sm tabular-nums ${telemetry.strainMicroStrain > 500 ? 'text-rose-500' : isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
                  {telemetry.strainMicroStrain} με
                </span>
              </div>
              <div className={`p-1.5 rounded border ${subCardBg}`}>
                <span className={`${textMuted} block text-[9px]`}>DEFLECTION</span>
                <span className={`${textHeading} font-bold text-xs tabular-nums`}>{telemetry.strainDeformationMm} mm</span>
              </div>
              <div className={`p-1.5 rounded border ${subCardBg}`}>
                <span className={`${textMuted} block text-[9px]`}>RAW ADC</span>
                <span className={`${isDark ? 'text-cyan-400' : 'text-cyan-700'} font-bold text-xs tabular-nums`}>{telemetry.loadCell1Raw.toLocaleString()}</span>
              </div>
            </div>

            {/* Hardware Remote Control Button: Tare / Zero */}
            <button
              onClick={() => handleHardwareControl('CMD:TARE')}
              className={`w-full py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs border ${
                isDark ? 'text-amber-300 bg-amber-950/80 hover:bg-amber-900 border-amber-500/60' : 'text-amber-900 bg-amber-100 hover:bg-amber-200 border-amber-300'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tare Load Cells (Zero Scale)</span>
            </button>
          </div>
        );

      case 'ds18b20':
        return (
          <div className={`p-2 rounded-lg border text-[11px] font-mono space-y-1 ${cardBg}`}>
            <div className="flex justify-between items-center">
              <span className={`${textMuted} text-[10px]`}>CHASSIS TEMP:</span>
              <span className={`text-lg font-bold tabular-nums ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>{telemetry.temperatureC} °C</span>
            </div>
            <div className={`flex justify-between text-[10px] ${textMuted} pt-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <span>Bus: 1-Wire (GPIO 5)</span>
              <span className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>4.7kΩ Pullup OK</span>
            </div>
          </div>
        );

      case 'traffic-leds':
        return (
          <div className="space-y-2">
            <div className={`grid grid-cols-3 gap-1.5 p-2 rounded-lg border text-[10px] font-mono text-center ${cardBg}`}>
              <button
                onClick={() => handleHardwareControl(telemetry.ledGreen ? 'CMD:LED_GREEN:0' : 'CMD:LED_GREEN:1')}
                className={`p-1.5 rounded border transition-colors cursor-pointer ${
                  telemetry.ledGreen
                    ? isDark ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 font-bold shadow-sm' : 'bg-emerald-100 border-emerald-400 text-emerald-800 font-bold'
                    : isDark ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                }`}
              >
                GREEN<br />{telemetry.ledGreen ? '● ON (Click Off)' : '○ OFF'}
              </button>
              <button
                onClick={() => handleHardwareControl(telemetry.ledYellow ? 'CMD:LED_YELLOW:0' : 'CMD:LED_YELLOW:1')}
                className={`p-1.5 rounded border transition-colors cursor-pointer ${
                  telemetry.ledYellow
                    ? isDark ? 'bg-amber-950/90 border-amber-500 text-amber-300 font-bold shadow-sm' : 'bg-amber-100 border-amber-400 text-amber-800 font-bold'
                    : isDark ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                }`}
              >
                YELLOW<br />{telemetry.ledYellow ? '● ON (Click Off)' : '○ OFF'}
              </button>
              <button
                onClick={() => handleHardwareControl(telemetry.ledRed ? 'CMD:LED_RED:0' : 'CMD:LED_RED:1')}
                className={`p-1.5 rounded border transition-colors cursor-pointer ${
                  telemetry.ledRed
                    ? isDark ? 'bg-rose-950/90 border-rose-500 text-rose-300 font-bold shadow-sm animate-pulse' : 'bg-rose-100 border-rose-400 text-rose-800 font-bold'
                    : isDark ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                }`}
              >
                RED<br />{telemetry.ledRed ? '● ON (Click Off)' : '○ OFF'}
              </button>
            </div>
            <button
              onClick={() => handleHardwareControl('CMD:LED_TEST:1')}
              className={`w-full py-1.5 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 border ${
                isDark
                  ? 'text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/50'
                  : 'text-cyan-800 bg-cyan-100 hover:bg-cyan-200 border-cyan-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Run LED Sequence Test</span>
            </button>
          </div>
        );

      case 'coin-motor':
      case 'l298n':
        return (
          <div className="space-y-2">
            <div className={`p-2 rounded-lg border text-[11px] font-mono space-y-1 ${cardBg}`}>
              <div className="flex justify-between items-center">
                <span className={`${textMuted} text-[10px]`}>VIBRATION MOTOR:</span>
                <span className={`font-bold ${telemetry.vibrationMotorActive ? isDark ? 'text-cyan-300 animate-pulse' : 'text-cyan-700 animate-pulse' : textMuted}`}>
                  {telemetry.vibrationMotorActive ? `PWM ${telemetry.vibrationDutyCycle}/255` : 'IDLE (OFF)'}
                </span>
              </div>
              <div className={`text-[10px] ${textMuted}`}>GPIO 4 / L298N H-Bridge Drive</div>
            </div>

            {/* Hardware Motor Control Buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => handleHardwareControl('CMD:MOTOR:255')}
                className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                  isDark ? 'text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/60' : 'text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border-emerald-300'
                }`}
              >
                100% ON
              </button>
              <button
                onClick={() => handleHardwareControl('CMD:MOTOR:128')}
                className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                  isDark ? 'text-amber-300 bg-amber-950/80 hover:bg-amber-900 border-amber-500/60' : 'text-amber-800 bg-amber-100 hover:bg-amber-200 border-amber-300'
                }`}
              >
                50% PWM
              </button>
              <button
                onClick={() => handleHardwareControl('CMD:MOTOR:0')}
                className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                  isDark ? 'text-rose-300 bg-rose-950/80 hover:bg-rose-900 border-rose-500/60' : 'text-rose-800 bg-rose-100 hover:bg-rose-200 border-rose-300'
                }`}
              >
                STOP
              </button>
            </div>
          </div>
        );

      case 'buzzer':
        return (
          <div className="space-y-2">
            <div className={`p-2 rounded-lg border text-[11px] font-mono space-y-1 ${cardBg}`}>
              <div className="flex justify-between items-center">
                <span className={`${textMuted} text-[10px]`}>ACOUSTIC BUZZER:</span>
                <span className={`font-bold ${telemetry.buzzerActive ? 'text-amber-500 animate-pulse' : textMuted}`}>
                  {telemetry.buzzerActive ? `SOUNDING (${telemetry.buzzerFrequency || 2800} Hz)` : 'SILENT (OFF)'}
                </span>
              </div>
              <div className={`text-[10px] ${textMuted}`}>Pin: GPIO 3 (Active Piezo)</div>
            </div>

            {/* Hardware Buzzer Control Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleHardwareControl('CMD:BUZZER:1')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  telemetry.buzzerActive
                    ? 'bg-amber-600 text-white border-amber-400'
                    : isDark ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 hover:bg-amber-900' : 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Buzzer (ON)</span>
              </button>
              <button
                onClick={() => handleHardwareControl('CMD:BUZZER:0')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  isDark ? 'text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-600' : 'text-slate-700 bg-white hover:bg-slate-100 border-slate-300'
                }`}
              >
                <span>Silence (OFF)</span>
              </button>
            </div>
          </div>
        );

      case 'esp32-c3':
      default:
        return (
          <div className="space-y-2">
            <div className={`grid grid-cols-2 gap-1.5 p-2 rounded-lg border text-[11px] font-mono ${cardBg}`}>
              <div className={`p-1.5 rounded border ${subCardBg}`}>
                <span className={`${textMuted} block text-[9px]`}>SYSTEM HEALTH</span>
                <span className={`font-bold text-xs ${telemetry.systemStatus === 'CRITICAL' ? 'text-rose-500' : telemetry.systemStatus === 'WARNING' ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {telemetry.systemStatus}
                </span>
              </div>
              <div className={`p-1.5 rounded border ${subCardBg}`}>
                <span className={`${textMuted} block text-[9px]`}>DATA STREAM</span>
                <span className={`${isDark ? 'text-cyan-300' : 'text-cyan-700'} font-bold text-xs`}>
                  {telemetry.dataSource === 'REAL_HARDWARE' ? 'COM5 LIVE' : 'SIMULATOR'}
                </span>
              </div>
              <div className={`p-1.5 rounded border ${subCardBg}`}>
                <span className={`${textMuted} block text-[9px]`}>STRAIN / LOAD</span>
                <span className={`${textHeading} font-bold text-xs`}>{telemetry.strainMicroStrain}με · {telemetry.loadKg}kg</span>
              </div>
              <div className={`p-1.5 rounded border ${subCardBg}`}>
                <span className={`${textMuted} block text-[9px]`}>ORIENTATION</span>
                <span className={`${textHeading} font-bold text-xs`}>R:{telemetry.roll}° P:{telemetry.pitch}°</span>
              </div>
            </div>

            {/* Hardware System Alarm Test Controls */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleHardwareControl('CMD:ALARM_TEST:1')}
                className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  isDark ? 'text-rose-300 bg-rose-950/80 hover:bg-rose-900 border-rose-500/60' : 'text-rose-800 bg-rose-100 hover:bg-rose-200 border-rose-300'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Alarm Test</span>
              </button>
              <button
                onClick={() => handleHardwareControl('CMD:ALARM_TEST:0')}
                className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  isDark ? 'text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/60' : 'text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border-emerald-300'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Clear Alarm</span>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`flex flex-col w-screen h-screen overflow-hidden select-none font-['Plus_Jakarta_Sans'] transition-colors duration-200 ${
      isDark ? 'bg-[#0a0e13] text-[#E6EDF5]' : 'bg-[#f8fafc] text-slate-900'
    }`}>
      {/* Top Header Bar */}
      <Header
        viewMode={viewMode}
        systemStatus={telemetry.systemStatus}
        dataSource={telemetry.dataSource}
        currentPage={currentPage}
        onSelectPage={(p) => setCurrentPage(p)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isControlSlideBarOpen={isControlSlideBarOpen}
        onToggleControlSlideBar={() => setIsControlSlideBarOpen((prev) => !prev)}
        isFullScreen={isFullScreen}
        onToggleFullScreen={handleToggleFullScreen}
        onOpenValidator={() => setActiveModal('VALIDATOR')}
        onOpenLoadCellConfig={() => setActiveModal('LOAD_CELL_CONFIG')}
        onOpenRealHardware={() => setActiveModal('REAL_HARDWARE')}
      />

      {/* Page Routing: Live Data | Hardware Control & Testing | 3D Bench */}
      {currentPage === 'LIVE_DATA' ? (
        <LiveHardwareDataPage
          telemetry={telemetry}
          hardwareParams={hardwareParams}
          onNavigateToControl={() => setCurrentPage('HARDWARE_CONTROL')}
          onHardwareControl={handleHardwareControl}
          onOpenRealHardwareModal={() => setActiveModal('REAL_HARDWARE')}
          logs={rawLogs}
        />
      ) : currentPage === 'HARDWARE_CONTROL' ? (
        <HardwareControlBenchPage
          telemetry={telemetry}
          hardwareParams={hardwareParams}
          onSetBaseWeight={handleSetBaseWeight}
          onSetTemperature={handleSetTemperature}
          onSetThresholds={handleSetThresholds}
          onResetParameters={handleResetParameters}
          onSetSimulatedPressure={handleSetSimulatedPressure}
          onHardwareControl={handleHardwareControl}
          onNavigateToLiveData={() => setCurrentPage('LIVE_DATA')}
        />
      ) : (
        <>
          {/* Main Center Area: 3D Viewport + Right Telemetry Sidebar */}
          <div className="flex flex-1 overflow-hidden relative">
            {/* Left/Center: 3D Scene Viewport */}
            <div className="flex-1 h-full relative">
              <Scene3D
                telemetry={telemetry}
                viewMode={viewMode}
                wires={wires}
                components={components}
                selectedComponent={selectedComponent}
                selectedWire={selectedWire}
                onSelectComponent={(comp) => {
                  setSelectedComponent(comp);
                }}
                onSelectWire={(w) => setSelectedWire(w)}
                lockedComponents={lockedComponents}
                routingMode={routingMode}
                onToggleRoutingMode={(mode) => setRoutingMode(mode)}
                onAlignWiring={() => setRoutingMode('ALIGNED_ORTHOGONAL')}
                onOpenLockManager={() => setActiveModal('VALIDATOR')}
                isTracingConnections={isTracingConnections}
                isSlideBarOpen={isControlSlideBarOpen}
                onToggleSlideBar={() => setIsControlSlideBarOpen((prev) => !prev)}
                isFullScreen={isFullScreen}
                onToggleFullScreen={handleToggleFullScreen}
              />

          {/* Full Screen Mode Floating Toggle Button */}
          <button
            onClick={handleToggleFullScreen}
            title={isFullScreen ? 'Exit Full Screen 3D Mode' : 'Expand 3D Scene to Full Screen'}
            className={`absolute top-4 ${isSidebarOpen ? 'right-48' : 'right-44'} z-20 h-8 px-3 shrink-0 whitespace-nowrap backdrop-blur-md rounded-md border shadow-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
              isDark
                ? 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-white/95 border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 shadow-md'
            }`}
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>

          {/* Toggle Sidebar Floating Button */}
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            title={isSidebarOpen ? 'Hide Right Telemetry Panel (Full 3D View)' : 'Show Right Telemetry Panel'}
            className={`absolute top-4 right-4 z-20 h-8 px-3 shrink-0 whitespace-nowrap backdrop-blur-md rounded-md border shadow-lg text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              isDark
                ? 'bg-slate-900/90 border-slate-700/80 text-cyan-300 hover:text-white hover:bg-slate-800'
                : 'bg-white/95 border-slate-300 text-cyan-700 hover:text-cyan-900 hover:bg-slate-100 shadow-md'
            }`}
          >
            {isSidebarOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            <span>{isSidebarOpen ? 'Hide Dashboard' : 'Show Dashboard'}</span>
          </button>

          {/* Floating Hardware Actuator Remote Control Quick-Dock (Bottom-Left) */}
          <div
            className={`absolute bottom-6 z-20 flex items-center gap-2 p-1.5 backdrop-blur-md rounded-lg shadow-xl font-mono text-xs transition-all duration-300 ease-in-out border ${
              isDark
                ? 'bg-slate-900/95 border-slate-800 text-slate-200 shadow-black/60'
                : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/50'
            } ${
              isControlSlideBarOpen ? 'left-[22.5rem]' : 'left-6'
            }`}
          >
            <div className={`flex items-center gap-1.5 px-2 border-r ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className={`font-semibold text-[11px] uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Actuator Remote
              </span>
            </div>

            {/* Quick Buzzer Toggle */}
            <button
              onClick={() => handleHardwareControl(telemetry.buzzerActive ? 'CMD:BUZZER:0' : 'CMD:BUZZER:1')}
              title="Toggle Hardware Piezo Buzzer"
              className={`h-7 px-2.5 rounded-md border text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                telemetry.buzzerActive
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
                  : isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
              }`}
            >
              <Bell className="w-3 h-3" />
              <span>Buzzer</span>
              <span className={`text-[10px] font-mono px-1 rounded ${telemetry.buzzerActive ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400'}`}>
                {telemetry.buzzerActive ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Quick Motor Toggle */}
            <button
              onClick={() => handleHardwareControl(telemetry.vibrationMotorActive ? 'CMD:MOTOR:0' : 'CMD:MOTOR:255')}
              title="Toggle Hardware Vibration Motor"
              className={`h-7 px-2.5 rounded-md border text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                telemetry.vibrationMotorActive
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-semibold'
                  : isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Motor</span>
              <span className={`text-[10px] font-mono px-1 rounded ${telemetry.vibrationMotorActive ? 'bg-cyan-400 text-slate-950 font-bold' : 'text-slate-400'}`}>
                {telemetry.vibrationMotorActive ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Quick LED Test */}
            <button
              onClick={() => handleHardwareControl('CMD:LED_TEST:1')}
              title="Flash test all hardware LEDs"
              className={`h-7 px-2.5 rounded-md border text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                isDark
                  ? 'border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300'
                  : 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Test LEDs</span>
            </button>

            {/* Quick Tare Load Cells */}
            <button
              onClick={() => handleHardwareControl('CMD:TARE')}
              title="Zero out load cell tare offset"
              className={`h-7 px-2.5 rounded-md border text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                isDark
                  ? 'border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Tare</span>
            </button>
          </div>

          {/* Floating Selected Component Real-Time Values & Controls Card */}
          {selectedComponent && (
            <div className={`absolute bottom-6 right-6 z-20 w-80 p-4 backdrop-blur-md rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 select-none border ${
              isDark
                ? 'bg-slate-900/95 border-cyan-500/70 text-slate-300'
                : 'bg-white/95 border-cyan-500/80 text-slate-700 shadow-slate-300/70'
            }`}>
              <div className={`flex items-center justify-between gap-3 mb-2 pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${
                    isDark
                      ? 'bg-blue-900/80 border-blue-500/40 text-blue-300'
                      : 'bg-blue-50 border-blue-200 text-blue-700'
                  }`}>
                    {selectedComponent.category}
                  </span>
                  <h4 className={`text-sm font-bold font-['Chakra_Petch'] truncate max-w-[170px] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {selectedComponent.name}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedComponent(null)}
                  className={`p-1 rounded cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className={`space-y-2.5 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {/* Live Real-Time Sensor Telemetry Values for this Component */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-mono uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Live Hardware Values
                    </span>
                    <span className={`flex items-center gap-1 text-[10px] font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600 font-semibold'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDark ? 'bg-emerald-400' : 'bg-emerald-600'}`} />
                      LIVE SYNC
                    </span>
                  </div>
                  {renderLiveTelemetryForComponent(selectedComponent)}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setActiveModal('INSPECTOR')}
                    className={`h-8 flex-1 flex items-center justify-center gap-1.5 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-xs border ${
                      isDark
                        ? 'text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/50'
                        : 'text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border-cyan-300'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Inspect Pinout</span>
                  </button>

                  <button
                    onClick={() => handleToggleLock(selectedComponent.id)}
                    title={
                      lockedComponents[selectedComponent.id]
                        ? 'Unlock Axis to Drag & Reposition'
                        : 'Lock Axis in Place'
                    }
                    className={`h-8 px-3 text-xs font-mono font-bold rounded-md border transition-colors cursor-pointer flex items-center gap-1.5 ${
                      lockedComponents[selectedComponent.id]
                        ? isDark
                          ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                          : 'bg-emerald-100 border-emerald-400 text-emerald-800'
                        : isDark
                        ? 'bg-amber-950/80 border-amber-500/80 text-amber-300'
                        : 'bg-amber-100 border-amber-400 text-amber-800'
                    }`}
                  >
                    {lockedComponents[selectedComponent.id] ? (
                      <>
                        <Lock className="w-3 h-3" />
                        <span className="flex items-center gap-1"><Check className="w-2.5 h-2.5" /> LOCKED</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3" />
                        <span>UNLOCKED</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Collapsible & Movable Telemetry Dashboard with Edge Slider Button */}
        <div
          className={`relative transition-all duration-300 ease-in-out flex shrink-0 ${
            isSidebarOpen ? 'w-96' : 'w-0'
          }`}
        >
          {/* Floating Slider Tab Button attached to Sidebar edge */}
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            title={isSidebarOpen ? 'Slide sidebar away (collapse)' : 'Slide sidebar open (expand)'}
            className={`absolute top-4 z-40 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-l-lg border-y border-l shadow-2xl transition-all cursor-pointer select-none font-mono text-xs ${
              isSidebarOpen
                ? isDark
                  ? '-left-9 bg-slate-900/95 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 hover:-left-10'
                  : '-left-9 bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 hover:-left-10 shadow-md'
                : 'bg-blue-600 hover:bg-blue-500 border-blue-400 text-white font-bold shadow-blue-500/50 hover:-left-14 animate-pulse -left-12'
            }`}
          >
            {isSidebarOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            {!isSidebarOpen && (
              <span className="text-[10px] font-bold tracking-wider uppercase font-mono">
                DATA
              </span>
            )}
          </button>

          {/* Sidebar Content (hidden smoothly when collapsed) */}
          <div className="w-96 h-full overflow-hidden flex flex-col">
            <TelemetryDashboard
              telemetry={telemetry}
              components={components}
              onInspectComponent={handleOpenInspector}
            />
          </div>
        </div>
      </div>


      {/* Bottom Controls Bar */}
      <BottomControls
        isRunning={isRunning}
        activeScenario={activeScenario}
        viewMode={viewMode}
        onStart={handleStart}
        onPause={handlePause}
        onReset={handleReset}
        onSelectScenario={handleSelectScenario}
        onCheckConnections={() => setActiveModal('VALIDATOR')}
      />
      </>
      )}

      {/* Modals */}
      {activeModal === 'INSPECTOR' && selectedComponent && (
        <ComponentInspectorModal
          component={selectedComponent}
          telemetry={telemetry}
          onClose={() => {
            setActiveModal(null);
            setSelectedComponent(null);
          }}
        />
      )}

      {activeModal === 'VALIDATOR' && (
        <ComponentLockValidationPanel
          components={components}
          wires={wires}
          lockedComponents={lockedComponents}
          onToggleLock={handleToggleLock}
          onLockAll={handleLockAll}
          onUnlockAll={handleUnlockAll}
          routingMode={routingMode}
          onToggleRoutingMode={(mode) => setRoutingMode(mode)}
          onRunLiveTrace={handleRunLiveTrace}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'LOAD_CELL_CONFIG' && (
        <LoadCellConfigModal
          currentConfig={loadCellConfig}
          onSaveConfig={(cfg) => setLoadCellConfig(cfg)}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'REAL_HARDWARE' && realProviderRef.current && (
        <RealHardwareModal
          realProvider={realProviderRef.current}
          onConnected={() => setActiveProvider('REAL_HARDWARE')}
          onDisconnected={() => setActiveProvider('SIMULATION')}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
