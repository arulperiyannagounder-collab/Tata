import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  SensorTelemetry,
  ViewMode,
  WireConnection,
  HardwareComponentMeta,
  ComponentLockState,
  WireRoutingMode,
} from '../../types/simulation';
import {
  createESDMat,
  createBreadboard,
  createESP32C3,
  createHX711Module,
  createSingleLoadCellWithPad,
  createWheatstoneCombinerBoard,
  createFourLoadCells,
  createMPU6050,
  createDS18B20,
  createL298N,
  createCoinMotor,
  createBuzzer,
  createTrafficLEDModule,
  createThroughHoleResistor,
  createSW420VibrationSensor,
  createRealisticJumperWire,
  computeWirePath,
  updateESDMatTheme,
} from './modelGenerators';
import { buzzerAudio } from '../../services/BuzzerAudioEngine';
import { useTheme } from '../../context/ThemeContext';
import {
  Settings,
  ChevronRight,
  ChevronLeft,
  Compass,
  Move,
  RotateCcw,
  Camera,
  Grid,
  ZoomIn,
  Box,
  Maximize2,
  Minimize2,
  Layers,
  Zap,
  Activity,
  Sparkles,
  Lock,
  Check,
  X,
} from 'lucide-react';

interface Scene3DProps {
  telemetry: SensorTelemetry;
  viewMode: ViewMode;
  wires: WireConnection[];
  components: HardwareComponentMeta[];
  selectedComponent: HardwareComponentMeta | null;
  selectedWire: WireConnection | null;
  onSelectComponent: (comp: HardwareComponentMeta | null) => void;
  onSelectWire: (wire: WireConnection | null) => void;
  lockedComponents?: ComponentLockState;
  routingMode?: WireRoutingMode;
  onToggleRoutingMode?: (mode: WireRoutingMode) => void;
  onAlignWiring?: () => void;
  onOpenLockManager?: () => void;
  isTracingConnections?: boolean;
  isSlideBarOpen?: boolean;
  onToggleSlideBar?: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

interface ComponentEntity {
  id: string;
  name: string;
  group: THREE.Group;
  baseY: number;
  initialPos: THREE.Vector3;
  pinOffsets: Record<string, THREE.Vector3>;
}

export const Scene3D: React.FC<Scene3DProps> = ({
  telemetry,
  viewMode,
  wires,
  components,
  selectedComponent,
  selectedWire,
  onSelectComponent,
  onSelectWire,
  lockedComponents = {},
  routingMode = 'ALIGNED_ORTHOGONAL',
  onToggleRoutingMode,
  onAlignWiring,
  onOpenLockManager,
  isTracingConnections = false,
  isSlideBarOpen: propIsSlideBarOpen,
  onToggleSlideBar,
  isFullScreen = false,
  onToggleFullScreen,
}) => {
  const { isDark, activeConfig } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalSlideBarOpen, setInternalSlideBarOpen] = useState<boolean>(true);
  const isSlideBarOpen = propIsSlideBarOpen !== undefined ? propIsSlideBarOpen : internalSlideBarOpen;

  const handleToggleSlideBar = () => {
    if (onToggleSlideBar) {
      onToggleSlideBar();
    } else {
      setInternalSlideBarOpen((prev) => !prev);
    }
  };

  const [activeCamPreset, setActiveCamPreset] = useState<'PERSPECTIVE' | 'TOP' | 'MACRO' | 'LOAD_CELLS'>('PERSPECTIVE');
  const [interactionMode, setInteractionMode] = useState<'ORBIT' | 'MOVE'>('ORBIT');
  const [draggingCompName, setDraggingCompName] = useState<string | null>(null);
  const [lockedToast, setLockedToast] = useState<{ componentName: string; visible: boolean } | null>(null);

  // References
  const threeRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    animFrameId: number;
    clickableObjects: { mesh: THREE.Object3D; data: any; type: 'COMPONENT' | 'WIRE' }[];
    componentsMap: Map<string, ComponentEntity>;
    lockIndicatorsMap: Map<string, THREE.Group[]>;
    ambientLight?: THREE.AmbientLight;
    keyLight?: THREE.DirectionalLight;
    fillLight?: THREE.DirectionalLight;
    rimLight?: THREE.DirectionalLight;
    esdMatGroup?: THREE.Group;
    // LED Module References
    trafficLEDs?: {
      greenMesh: THREE.Mesh;
      yellowMesh: THREE.Mesh;
      redMesh: THREE.Mesh;
      greenLight: THREE.PointLight;
      yellowLight: THREE.PointLight;
      redLight: THREE.PointLight;
    };
    coinRotorMesh?: THREE.Mesh;
    coinGroup?: THREE.Group;
    buzzerRipple?: THREE.Mesh;
    wireMeshesMap: Map<string, { mesh: THREE.Mesh; wire: WireConnection }>;
    hardwareGroup?: THREE.Group;
    groundHighlightMesh?: THREE.Mesh;
    // Dragging state
    isDraggingComponent: boolean;
    draggedComponent: ComponentEntity | null;
    dragPlane: THREE.Plane;
    dragOffset: THREE.Vector3;
    pointerStart: { x: number; y: number };
  } | null>(null);

  // Auto-dismiss locked toast
  useEffect(() => {
    if (lockedToast?.visible) {
      const timer = setTimeout(() => {
        setLockedToast((prev) => (prev ? { ...prev, visible: false } : null));
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [lockedToast]);

  // Helper to resolve pin world coordinate based on current component position and wire identity
  const getPinWorldPosition = (componentName: string, pinName: string, wireId?: string): THREE.Vector3 => {
    if (!threeRefs.current) return new THREE.Vector3(0, 0.01, 0);
    const { componentsMap } = threeRefs.current;

    // Check specific breadboard tie-point alignment when targeting Breadboard power rails
    if (componentName.includes('Breadboard')) {
      const bb = componentsMap.get('breadboard');
      if (bb) {
        // Top power bus lines: Red (+) at z = -0.024, Blue (-) at z = -0.020
        // Neatly distribute tie-point sockets along X according to connected device to avoid clustering
        let pinX = -0.032;
        const isVCC = pinName.includes('+') || pinName.includes('3.3V') || pinName.includes('VCC');
        const pinZ = isVCC ? -0.024 : -0.020;

        if (wireId) {
          if (wireId.includes('hx711')) pinX = -0.055;
          else if (wireId.includes('mpu6050')) pinX = -0.038;
          else if (wireId.includes('sw420')) pinX = -0.024;
          else if (wireId.includes('esp32')) pinX = -0.012;
          else if (wireId.includes('ds18b20')) pinX = 0.008;
          else if (wireId.includes('l298n-gnd')) pinX = 0.028;
          else if (wireId.includes('l298n-in4')) pinX = 0.038;
          else if (wireId.includes('buzzer')) pinX = 0.058;
        }

        return bb.group.position.clone().add(new THREE.Vector3(pinX, 0.0095, pinZ));
      }
    }

    let compId = '';
    if (componentName.includes('ESP32')) compId = 'esp32-c3';
    else if (componentName.includes('HX711')) compId = 'hx711';
    else if (componentName.includes('Load Cell 1') || componentName === 'LC1') compId = 'load-cell-1';
    else if (componentName.includes('Load Cell 2') || componentName === 'LC2') compId = 'load-cell-2';
    else if (componentName.includes('Load Cell 3') || componentName === 'LC3') compId = 'load-cell-3';
    else if (componentName.includes('Load Cell 4') || componentName === 'LC4') compId = 'load-cell-4';
    else if (componentName.includes('Combiner') || componentName.includes('Wheatstone')) compId = 'load-cell-combiner';
    else if (componentName.includes('Load Cell')) compId = 'load-cell-1';
    else if (componentName.includes('MPU6050')) compId = 'mpu6050';
    else if (componentName.includes('SW-420') || componentName.includes('Vibration') || componentName.includes('sw420')) compId = 'sw420';
    else if (componentName.includes('DS18B20')) compId = 'ds18b20';
    else if (componentName.includes('L298N')) compId = 'l298n';
    else if (componentName.includes('Coin Motor') || componentName.includes('Motor')) compId = 'coin-motor';
    else if (componentName.includes('Buzzer')) compId = 'buzzer';
    else if (componentName.includes('Traffic LED') || componentName.includes('LED Module')) compId = 'traffic-leds';
    else if (componentName.includes('Breadboard')) compId = 'breadboard';

    const entity = componentsMap.get(compId);
    if (entity) {
      const offset = entity.pinOffsets[pinName] || new THREE.Vector3(0, 0.005, 0);
      return entity.group.position.clone().add(offset);
    }

    return new THREE.Vector3(0, 0.01, 0);
  };

  // Recalculate a wire's 3D spline and update geometry with aligned Manhattan or tight routing
  const updateWire = (
    wire: WireConnection,
    mesh: THREE.Mesh,
    mode: WireRoutingMode = routingMode || 'ALIGNED_ORTHOGONAL'
  ) => {
    const startPos = getPinWorldPosition(wire.sourceComponent, wire.sourcePin, wire.id);
    const endPos = getPinWorldPosition(wire.targetComponent, wire.targetPin, wire.id);

    const path = computeWirePath(startPos, endPos, mode, wire);
    mesh.geometry.dispose();

    const isLoadCellLead = wire.id.includes('wire-lc');
    const wireRadius = isLoadCellLead ? 0.0009 : 0.0014;
    mesh.geometry = new THREE.TubeGeometry(path, 48, wireRadius, 8, false);

    // Update connector boots/terminations
    const liftOffset = isLoadCellLead ? 0.002 : 0.014;
    if (mesh.children.length >= 2) {
      mesh.children[0].position.copy(startPos.clone().add(new THREE.Vector3(0, liftOffset * 0.5, 0)));
      mesh.children[1].position.copy(endPos.clone().add(new THREE.Vector3(0, liftOffset * 0.5, 0)));
    } else if (mesh.children.length === 1 && isLoadCellLead) {
      mesh.children[0].position.copy(endPos.clone().add(new THREE.Vector3(0, 0.0009, 0)));
    }
  };

  // Update all wires attached to a specific component or all wires
  const updateAttachedWires = (mode: WireRoutingMode = routingMode || 'ALIGNED_ORTHOGONAL') => {
    if (!threeRefs.current) return;
    const { wireMeshesMap } = threeRefs.current;
    wireMeshesMap.forEach(({ mesh, wire }) => {
      updateWire(wire, mesh, mode);
    });
  };

  // Reset all components to initial reference positions and align all wiring
  const handleResetPositions = () => {
    if (!threeRefs.current) return;
    const { componentsMap } = threeRefs.current;
    componentsMap.forEach((entity) => {
      entity.group.position.copy(entity.initialPos);
    });
    updateAttachedWires(routingMode || 'ALIGNED_ORTHOGONAL');
  };

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(activeConfig.sceneBackground);
    scene.fog = new THREE.FogExp2(activeConfig.sceneFog, isDark ? 0.8 : 0.45);

    // PerspectiveCamera with precise required parameters
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 50);
    camera.position.set(0, 0.45, 0.65);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // OrbitControls with smooth, fast, cursor-directed zoom
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.zoomToCursor = true;
    controls.zoomSpeed = 1.6;
    controls.minDistance = 0.04;
    controls.maxDistance = 4.5;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.02, 0);

    // Laboratory lighting setup
    const ambientLight = new THREE.AmbientLight(activeConfig.ambientLightColor, activeConfig.ambientLightIntensity);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(0.3, 0.8, 0.4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    fillLight.position.set(-0.4, 0.5, -0.3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 0.45);
    rimLight.position.set(0, 0.3, -0.5);
    scene.add(rimLight);

    // ESD Mat and Workbench Base
    const esdMat = createESDMat();
    updateESDMatTheme(esdMat, isDark, activeConfig.esdMatBase, activeConfig.esdMatColor);
    scene.add(esdMat);

    // Ground position halo indicator when dragging
    const haloGeo = new THREE.RingGeometry(0.015, 0.035, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    const groundHighlightMesh = new THREE.Mesh(haloGeo, haloMat);
    groundHighlightMesh.rotation.x = -Math.PI / 2;
    groundHighlightMesh.position.set(0, 0.0025, 0);
    scene.add(groundHighlightMesh);

    // Hardware and Digital Twin Groups
    const hardwareGroup = new THREE.Group();
    scene.add(hardwareGroup);

    const clickableObjects: { mesh: THREE.Object3D; data: any; type: 'COMPONENT' | 'WIRE' }[] = [];
    const wireMeshesMap = new Map<string, { mesh: THREE.Mesh; wire: WireConnection }>();
    const componentsMap = new Map<string, ComponentEntity>();
    const lockIndicatorsMap = new Map<string, THREE.Group[]>();

    // ==========================================
    // 1. POPULATE HARDWARE COMPONENTS (BENCHTOP TWIN)
    // ==========================================

    // 1. Solderless Breadboard (Centered on ESD mat)
    const breadboard = createBreadboard();
    const bbInitialPos = new THREE.Vector3(0.015, 0.002, 0.015);
    breadboard.position.copy(bbInitialPos);
    hardwareGroup.add(breadboard);

    componentsMap.set('breadboard', {
      id: 'breadboard',
      name: 'Breadboard',
      group: breadboard,
      baseY: 0.002,
      initialPos: bbInitialPos.clone(),
      pinOffsets: {
        '+ 3.3V': new THREE.Vector3(-0.032, 0.0095, -0.024),
        '- GND': new THREE.Vector3(-0.032, 0.0095, -0.020),
      },
    });

    // 2. ESP32-C3 Microcontroller (Mounted on breadboard center with USB-C power)
    const esp32 = createESP32C3();
    const esp32InitialPos = new THREE.Vector3(0.015, 0.011, 0.015);
    esp32.position.copy(esp32InitialPos);
    hardwareGroup.add(esp32);
    componentsMap.set('esp32-c3', {
      id: 'esp32-c3',
      name: 'ESP32-C3 DevKit',
      group: esp32,
      baseY: 0.011,
      initialPos: esp32InitialPos.clone(),
      pinOffsets: {
        '3.3V': new THREE.Vector3(-0.0118, 0.001, -0.005),
        'GND': new THREE.Vector3(-0.0118, 0.001, -0.010),
        '5V/VIN': new THREE.Vector3(-0.0118, 0.001, -0.015),
        'GPIO 0': new THREE.Vector3(0.0118, 0.001, 0.010),
        'GPIO 1': new THREE.Vector3(0.0118, 0.001, 0.005),
        'GPIO 2': new THREE.Vector3(-0.0118, 0.001, 0.003),
        'GPIO 3': new THREE.Vector3(-0.0118, 0.001, 0.008),
        'GPIO 4': new THREE.Vector3(-0.0118, 0.001, 0.013),
        'GPIO 5': new THREE.Vector3(-0.0118, 0.001, 0.017),
        'GPIO 6': new THREE.Vector3(0.0118, 0.001, -0.015),
        'GPIO 7': new THREE.Vector3(0.0118, 0.001, -0.010),
        'GPIO 8': new THREE.Vector3(0.0118, 0.001, -0.005),
        'GPIO 9': new THREE.Vector3(0.0118, 0.001, 0.0),
        'GPIO 10': new THREE.Vector3(0.0118, 0.001, 0.014),
      },
    });
    clickableObjects.push({
      mesh: esp32,
      data: components.find((c) => c.id === 'esp32-c3'),
      type: 'COMPONENT',
    });

    // 3. HX711 ADC Module (Placed left of breadboard)
    const hx711 = createHX711Module();
    const hxInitialPos = new THREE.Vector3(-0.075, 0.002, -0.010);
    hx711.position.copy(hxInitialPos);
    hardwareGroup.add(hx711);
    componentsMap.set('hx711', {
      id: 'hx711',
      name: 'HX711 ADC Module',
      group: hx711,
      baseY: 0.002,
      initialPos: hxInitialPos.clone(),
      pinOffsets: {
        'VCC': new THREE.Vector3(0.0095, 0.0025, -0.006),
        'DT': new THREE.Vector3(0.0095, 0.0025, -0.002),
        'SCK': new THREE.Vector3(0.0095, 0.0025, 0.002),
        'GND': new THREE.Vector3(0.0095, 0.0025, 0.006),
        'E+': new THREE.Vector3(-0.0095, 0.0025, -0.006),
        'E-': new THREE.Vector3(-0.0095, 0.0025, -0.002),
        'A+': new THREE.Vector3(-0.0095, 0.0025, 0.002),
        'A-': new THREE.Vector3(-0.0095, 0.0025, 0.006),
      },
    });
    clickableObjects.push({
      mesh: hx711,
      data: components.find((c) => c.id === 'hx711'),
      type: 'COMPONENT',
    });

    // 4. INDIVIDUAL 4x 50kg HALF-BRIDGE LOAD CELLS + WHEATSTONE COMBINER BOARD
    // Each load cell is its own entity: independently movable, drag-enabled, and axis-lockable

    // 4a. Load Cell 1 (Front-Left)
    const lc1 = createSingleLoadCellWithPad('LC1 (Front-Left 50kg)');
    const lc1InitialPos = new THREE.Vector3(-0.205, 0.001, -0.055);
    lc1.position.copy(lc1InitialPos);
    hardwareGroup.add(lc1);
    componentsMap.set('load-cell-1', {
      id: 'load-cell-1',
      name: 'Load Cell 1 (Front-Left 50kg)',
      group: lc1,
      baseY: 0.001,
      initialPos: lc1InitialPos.clone(),
      pinOffsets: {
        'Red (Lead +)': new THREE.Vector3(0.024, 0.0039, -0.0012),
        'Black (Lead -)': new THREE.Vector3(0.024, 0.0039, 0.0),
        'White (Center Tap)': new THREE.Vector3(0.024, 0.0039, 0.0012),
      },
    });
    clickableObjects.push({
      mesh: lc1,
      data: components.find((c) => c.id === 'load-cell-1'),
      type: 'COMPONENT',
    });

    // 4b. Load Cell 2 (Front-Right) - Rotated 180° so leads face inward to combiner
    const lc2 = createSingleLoadCellWithPad('LC2 (Front-Right 50kg)');
    const lc2InitialPos = new THREE.Vector3(-0.125, 0.001, -0.055);
    lc2.position.copy(lc2InitialPos);
    lc2.rotation.y = Math.PI;
    hardwareGroup.add(lc2);
    componentsMap.set('load-cell-2', {
      id: 'load-cell-2',
      name: 'Load Cell 2 (Front-Right 50kg)',
      group: lc2,
      baseY: 0.001,
      initialPos: lc2InitialPos.clone(),
      pinOffsets: {
        'Red (Lead +)': new THREE.Vector3(-0.024, 0.0039, 0.0012),
        'Black (Lead -)': new THREE.Vector3(-0.024, 0.0039, 0.0),
        'White (Center Tap)': new THREE.Vector3(-0.024, 0.0039, -0.0012),
      },
    });
    clickableObjects.push({
      mesh: lc2,
      data: components.find((c) => c.id === 'load-cell-2'),
      type: 'COMPONENT',
    });

    // 4c. Load Cell 3 (Rear-Left)
    const lc3 = createSingleLoadCellWithPad('LC3 (Rear-Left 50kg)');
    const lc3InitialPos = new THREE.Vector3(-0.205, 0.001, 0.035);
    lc3.position.copy(lc3InitialPos);
    hardwareGroup.add(lc3);
    componentsMap.set('load-cell-3', {
      id: 'load-cell-3',
      name: 'Load Cell 3 (Rear-Left 50kg)',
      group: lc3,
      baseY: 0.001,
      initialPos: lc3InitialPos.clone(),
      pinOffsets: {
        'Red (Lead +)': new THREE.Vector3(0.024, 0.0039, -0.0012),
        'Black (Lead -)': new THREE.Vector3(0.024, 0.0039, 0.0),
        'White (Center Tap)': new THREE.Vector3(0.024, 0.0039, 0.0012),
      },
    });
    clickableObjects.push({
      mesh: lc3,
      data: components.find((c) => c.id === 'load-cell-3'),
      type: 'COMPONENT',
    });

    // 4d. Load Cell 4 (Rear-Right) - Rotated 180° so leads face inward to combiner
    const lc4 = createSingleLoadCellWithPad('LC4 (Rear-Right 50kg)');
    const lc4InitialPos = new THREE.Vector3(-0.125, 0.001, 0.035);
    lc4.position.copy(lc4InitialPos);
    lc4.rotation.y = Math.PI;
    hardwareGroup.add(lc4);
    componentsMap.set('load-cell-4', {
      id: 'load-cell-4',
      name: 'Load Cell 4 (Rear-Right 50kg)',
      group: lc4,
      baseY: 0.001,
      initialPos: lc4InitialPos.clone(),
      pinOffsets: {
        'Red (Lead +)': new THREE.Vector3(-0.024, 0.0039, 0.0012),
        'Black (Lead -)': new THREE.Vector3(-0.024, 0.0039, 0.0),
        'White (Center Tap)': new THREE.Vector3(-0.024, 0.0039, -0.0012),
      },
    });
    clickableObjects.push({
      mesh: lc4,
      data: components.find((c) => c.id === 'load-cell-4'),
      type: 'COMPONENT',
    });

    // 4e. Wheatstone Bridge Combiner Board
    const combinerBoard = createWheatstoneCombinerBoard();
    const combInitialPos = new THREE.Vector3(-0.165, 0.002, -0.010);
    combinerBoard.position.copy(combInitialPos);
    hardwareGroup.add(combinerBoard);
    componentsMap.set('load-cell-combiner', {
      id: 'load-cell-combiner',
      name: 'Wheatstone Bridge Combiner Board',
      group: combinerBoard,
      baseY: 0.002,
      initialPos: combInitialPos.clone(),
      pinOffsets: {
        'LC1 Red': new THREE.Vector3(-0.013, 0.0022, -0.008),
        'LC1 Black': new THREE.Vector3(-0.013, 0.0022, -0.005),
        'LC1 White': new THREE.Vector3(-0.013, 0.0022, -0.002),
        'LC2 Red': new THREE.Vector3(0.005, 0.0022, -0.008),
        'LC2 Black': new THREE.Vector3(0.005, 0.0022, -0.005),
        'LC2 White': new THREE.Vector3(0.005, 0.0022, -0.002),
        'LC3 Red': new THREE.Vector3(-0.013, 0.0022, 0.002),
        'LC3 Black': new THREE.Vector3(-0.013, 0.0022, 0.005),
        'LC3 White': new THREE.Vector3(-0.013, 0.0022, 0.008),
        'LC4 Red': new THREE.Vector3(0.005, 0.0022, 0.002),
        'LC4 Black': new THREE.Vector3(0.005, 0.0022, 0.005),
        'LC4 White': new THREE.Vector3(0.005, 0.0022, 0.008),
        'Bridge E+': new THREE.Vector3(0.013, 0.0022, -0.006),
        'Bridge E-': new THREE.Vector3(0.013, 0.0022, -0.002),
        'Bridge A+': new THREE.Vector3(0.013, 0.0022, 0.002),
        'Bridge A-': new THREE.Vector3(0.013, 0.0022, 0.006),
      },
    });
    clickableObjects.push({
      mesh: combinerBoard,
      data: components.find((c) => c.id === 'load-cell-combiner'),
      type: 'COMPONENT',
    });

    // 5. MPU6050 6-DoF IMU (Seated on breadboard lower-left bank)
    const mpu6050 = createMPU6050();
    const mpuInitialPos = new THREE.Vector3(-0.040, 0.011, 0.025);
    mpu6050.position.copy(mpuInitialPos);
    hardwareGroup.add(mpu6050);
    componentsMap.set('mpu6050', {
      id: 'mpu6050',
      name: 'MPU6050 IMU',
      group: mpu6050,
      baseY: 0.011,
      initialPos: mpuInitialPos.clone(),
      pinOffsets: {
        'VCC': new THREE.Vector3(-0.0085, 0.0025, -0.0085),
        'GND': new THREE.Vector3(-0.0061, 0.0025, -0.0085),
        'SCL': new THREE.Vector3(-0.0037, 0.0025, -0.0085),
        'SDA': new THREE.Vector3(-0.0013, 0.0025, -0.0085),
      },
    });
    clickableObjects.push({
      mesh: mpu6050,
      data: components.find((c) => c.id === 'mpu6050'),
      type: 'COMPONENT',
    });

    // 6. DS18B20 Waterproof Temp Probe (Resting on ESD mat in front)
    const ds18b20 = createDS18B20();
    const dsInitialPos = new THREE.Vector3(-0.025, 0.003, 0.090);
    ds18b20.position.copy(dsInitialPos);
    hardwareGroup.add(ds18b20);
    componentsMap.set('ds18b20', {
      id: 'ds18b20',
      name: 'DS18B20 Temp Probe',
      group: ds18b20,
      baseY: 0.003,
      initialPos: dsInitialPos.clone(),
      pinOffsets: {
        'VCC (Red)': new THREE.Vector3(0.035, 0.002, -0.001),
        'GND (Black)': new THREE.Vector3(0.037, 0.002, 0.0),
        'DATA (Yellow)': new THREE.Vector3(0.039, 0.002, 0.001),
      },
    });
    clickableObjects.push({
      mesh: ds18b20,
      data: components.find((c) => c.id === 'ds18b20'),
      type: 'COMPONENT',
    });

    // DS18B20 4.7kΩ Pull-up Resistor (between 3.3V and GPIO 5 on breadboard)
    const pullUpResistor = createThroughHoleResistor([0xeab308, 0x8b5cf6, 0xef4444, 0xf59e0b]);
    pullUpResistor.position.set(-0.010, 0.014, 0.032);
    hardwareGroup.add(pullUpResistor);

    // 7. L298N Motor Driver Module (Upper area of workbench mat)
    const l298n = createL298N();
    const l298InitialPos = new THREE.Vector3(0.015, 0.002, -0.085);
    l298n.position.copy(l298InitialPos);
    hardwareGroup.add(l298n);
    componentsMap.set('l298n', {
      id: 'l298n',
      name: 'L298N Motor Driver',
      group: l298n,
      baseY: 0.002,
      initialPos: l298InitialPos.clone(),
      pinOffsets: {
        '12V/VCC': new THREE.Vector3(-0.006, 0.0065, 0.016),
        'GND': new THREE.Vector3(-0.001, 0.0065, 0.016),
        'IN3': new THREE.Vector3(0.002, 0.0035, 0.009),
        'IN4': new THREE.Vector3(0.0064, 0.0035, 0.009),
        'OUT3': new THREE.Vector3(0.017, 0.0065, -0.002),
        'OUT4': new THREE.Vector3(0.017, 0.0065, 0.004),
      },
    });
    clickableObjects.push({
      mesh: l298n,
      data: components.find((c) => c.id === 'l298n'),
      type: 'COMPONENT',
    });

    // 8. Coin Vibration Motor (Resting on ESD mat with foam tape)
    const { group: coinMotor, rotorMesh: coinRotor } = createCoinMotor();
    const coinInitialPos = new THREE.Vector3(0.080, 0.002, -0.080);
    coinMotor.position.copy(coinInitialPos);
    hardwareGroup.add(coinMotor);
    componentsMap.set('coin-motor', {
      id: 'coin-motor',
      name: 'Coin Vibration Motor',
      group: coinMotor,
      baseY: 0.002,
      initialPos: coinInitialPos.clone(),
      pinOffsets: {
        'Lead (+) Red': new THREE.Vector3(-0.006, 0.0015, -0.002),
        'Lead (-) Blue/Black': new THREE.Vector3(-0.006, 0.0015, 0.002),
      },
    });
    clickableObjects.push({
      mesh: coinMotor,
      data: components.find((c) => c.id === 'coin-motor'),
      type: 'COMPONENT',
    });

    // 9. Active Piezo Buzzer (Seated in breadboard right bank tie-points)
    const { group: buzzer, rippleMesh: buzzerRip } = createBuzzer();
    const buzzerInitialPos = new THREE.Vector3(0.070, 0.011, 0.024);
    buzzer.position.copy(buzzerInitialPos);
    hardwareGroup.add(buzzer);
    componentsMap.set('buzzer', {
      id: 'buzzer',
      name: 'Active Buzzer',
      group: buzzer,
      baseY: 0.011,
      initialPos: buzzerInitialPos.clone(),
      pinOffsets: {
        'Positive (+) Long Pin': new THREE.Vector3(-0.004, 0.0015, 0.0),
        'Negative (-) Short Pin': new THREE.Vector3(0.0, 0.0015, 0.004),
      },
    });
    clickableObjects.push({
      mesh: buzzer,
      data: components.find((c) => c.id === 'buzzer'),
      type: 'COMPONENT',
    });

    // 10. INDUSTRIAL 3-LED TRAFFIC LIGHT BREAKOUT PCB MODULE
    const ledModuleObj = createTrafficLEDModule();
    const ledModulePos = new THREE.Vector3(0.145, 0.002, 0.010);
    ledModuleObj.group.position.copy(ledModulePos);
    hardwareGroup.add(ledModuleObj.group);

    componentsMap.set('traffic-leds', {
      id: 'traffic-leds',
      name: 'Industrial Traffic LED Breakout Module',
      group: ledModuleObj.group,
      baseY: 0.002,
      initialPos: ledModulePos.clone(),
      pinOffsets: {
        'Pin 1: GND': new THREE.Vector3(-0.0038, 0.0025, 0.0075),
        'Pin 2: RED': new THREE.Vector3(-0.00126, 0.0025, 0.0075),
        'Pin 3: YEL': new THREE.Vector3(0.00126, 0.0025, 0.0075),
        'Pin 4: GRN': new THREE.Vector3(0.0038, 0.0025, 0.0075),
      },
    });
    clickableObjects.push({
      mesh: ledModuleObj.group,
      data: components.find((c) => c.id === 'traffic-leds'),
      type: 'COMPONENT',
    });

    // ==========================================
    // 2. 3D REALISTIC JUMPER WIRES WITH DUPONT BOOTS & LOW-PROFILE LEADS
    // ==========================================
    wires.forEach((wire) => {
      const start = getPinWorldPosition(wire.sourceComponent, wire.sourcePin, wire.id);
      const end = getPinWorldPosition(wire.targetComponent, wire.targetPin, wire.id);

      const colorHex = parseInt(wire.color.replace('#', '0x'), 16);
      const { mesh } = createRealisticJumperWire(start, end, colorHex, 0.03, 0.0014, routingMode, wire);
      mesh.name = wire.name;
      mesh.userData = { wireId: wire.id, wire };
      hardwareGroup.add(mesh);

      wireMeshesMap.set(wire.id, { mesh, wire });
      clickableObjects.push({
        mesh,
        data: wire,
        type: 'WIRE',
      });
    });

    // 11. SW-420 HIGH-SENSITIVITY VIBRATION SENSOR MODULE
    const sw420 = createSW420VibrationSensor();
    const sw420InitialPos = new THREE.Vector3(-0.065, 0.002, 0.045);
    sw420.position.copy(sw420InitialPos);
    hardwareGroup.add(sw420);

    componentsMap.set('sw420', {
      id: 'sw420',
      name: 'SW-420 Vibration Sensor Module',
      group: sw420,
      baseY: 0.002,
      initialPos: sw420InitialPos.clone(),
      pinOffsets: {
        'VCC': new THREE.Vector3(0.0155, 0.0032, -0.00254),
        'GND': new THREE.Vector3(0.0155, 0.0032, 0.0),
        'DO': new THREE.Vector3(0.0155, 0.0032, 0.00254),
      },
    });
    clickableObjects.push({
      mesh: sw420,
      data: components.find((c) => c.id === 'sw420'),
      type: 'COMPONENT',
    });

    threeRefs.current = {
      scene,
      camera,
      renderer,
      controls,
      animFrameId: 0,
      clickableObjects,
      componentsMap,
      lockIndicatorsMap,
      trafficLEDs: {
        greenMesh: ledModuleObj.greenMesh,
        yellowMesh: ledModuleObj.yellowMesh,
        redMesh: ledModuleObj.redMesh,
        greenLight: ledModuleObj.greenLight,
        yellowLight: ledModuleObj.yellowLight,
        redLight: ledModuleObj.redLight,
      },
      coinRotorMesh: coinRotor,
      coinGroup: coinMotor,
      buzzerRipple: buzzerRip,
      wireMeshesMap,
      hardwareGroup,
      ambientLight,
      keyLight,
      fillLight,
      rimLight,
      esdMatGroup: esdMat,
      groundHighlightMesh,
      isDraggingComponent: false,
      draggedComponent: null,
      dragPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      dragOffset: new THREE.Vector3(),
      pointerStart: { x: 0, y: 0 },
    };

    // Render Loop
    const animate = () => {
      if (threeRefs.current) {
        const { controls, renderer, scene, camera } = threeRefs.current;
        controls.update();

        // Sound sync for active buzzer
        if (telemetry.buzzerActive) {
          buzzerAudio.play(telemetry.buzzerFrequency || 2800);
        } else {
          buzzerAudio.stop();
        }

        renderer.render(scene, camera);
        threeRefs.current.animFrameId = requestAnimationFrame(animate);
      }
    };
    threeRefs.current.animFrameId = requestAnimationFrame(animate);

    // Handle Resize (Window + Container ResizeObserver for seamless full screen & slider transitions)
    const handleResize = () => {
      if (!containerRef.current || !threeRefs.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w === 0 || h === 0) return;
      threeRefs.current.camera.aspect = w / h;
      threeRefs.current.camera.updateProjectionMatrix();
      threeRefs.current.renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      if (threeRefs.current) {
        cancelAnimationFrame(threeRefs.current.animFrameId);
        threeRefs.current.controls.dispose();
        threeRefs.current.renderer.dispose();
      }
      buzzerAudio.stop();
    };
  }, []);

  // Dynamically update Three.js scene for Theme & Palette changes
  useEffect(() => {
    if (!threeRefs.current) return;
    const { scene, ambientLight, esdMatGroup } = threeRefs.current;

    scene.background = new THREE.Color(activeConfig.sceneBackground);
    scene.fog = new THREE.FogExp2(activeConfig.sceneFog, isDark ? 0.8 : 0.35);
    if (ambientLight) {
      ambientLight.color.setHex(activeConfig.ambientLightColor);
      ambientLight.intensity = activeConfig.ambientLightIntensity;
    }
    const { keyLight, fillLight, rimLight } = threeRefs.current;
    if (keyLight) {
      keyLight.intensity = isDark ? 1.6 : 1.8;
    }
    if (fillLight) {
      fillLight.color.setHex(isDark ? 0x38bdf8 : 0x94a3b8);
      fillLight.intensity = isDark ? 0.6 : 0.75;
    }
    if (rimLight) {
      rimLight.color.setHex(isDark ? 0xa855f7 : 0x64748b);
      rimLight.intensity = isDark ? 0.45 : 0.3;
    }
    if (esdMatGroup) {
      updateESDMatTheme(esdMatGroup, isDark, activeConfig.esdMatBase, activeConfig.esdMatColor);
    }
  }, [isDark, activeConfig]);

  // Hardware Workbench Camera Focus
  useEffect(() => {
    if (!threeRefs.current) return;
    const { hardwareGroup, camera, controls } = threeRefs.current;
    if (hardwareGroup) hardwareGroup.visible = true;
    camera.position.set(0, 0.42, 0.60);
    controls.target.set(0, 0.015, 0);
    controls.update();
  }, [viewMode]);

  // Update LED Emissive Lighting & Actuators
  useEffect(() => {
    if (!threeRefs.current) return;
    const {
      trafficLEDs,
      coinRotorMesh,
      buzzerRipple,
    } = threeRefs.current;

    // Traffic LED Emissive Lighting & PointLights
    if (trafficLEDs) {
      const gMat = trafficLEDs.greenMesh.material as THREE.MeshPhysicalMaterial;
      const yMat = trafficLEDs.yellowMesh.material as THREE.MeshPhysicalMaterial;
      const rMat = trafficLEDs.redMesh.material as THREE.MeshPhysicalMaterial;

      // Green LED
      if (telemetry.ledGreen) {
        gMat.emissive.setHex(0x22c55e);
        gMat.emissiveIntensity = 2.5;
        trafficLEDs.greenLight.intensity = 1.0;
      } else {
        gMat.emissive.setHex(0x000000);
        gMat.emissiveIntensity = 0.0;
        trafficLEDs.greenLight.intensity = 0.0;
      }

      // Yellow LED
      if (telemetry.ledYellow) {
        yMat.emissive.setHex(0xeab308);
        yMat.emissiveIntensity = 2.5;
        trafficLEDs.yellowLight.intensity = 1.0;
      } else {
        yMat.emissive.setHex(0x000000);
        yMat.emissiveIntensity = 0.0;
        trafficLEDs.yellowLight.intensity = 0.0;
      }

      // Red LED
      if (telemetry.ledRed) {
        rMat.emissive.setHex(0xef4444);
        rMat.emissiveIntensity = 2.5;
        trafficLEDs.redLight.intensity = 1.0;
      } else {
        rMat.emissive.setHex(0x000000);
        rMat.emissiveIntensity = 0.0;
        trafficLEDs.redLight.intensity = 0.0;
      }
    }

    // Coin Motor Rotor
    if (coinRotorMesh && telemetry.vibrationMotorActive) {
      coinRotorMesh.rotation.z += 0.8;
    }

    // Buzzer Waves
    if (buzzerRipple) {
      const ripMat = buzzerRipple.material as THREE.MeshBasicMaterial;
      if (telemetry.buzzerActive) {
        buzzerRipple.scale.addScalar(0.04);
        if (buzzerRipple.scale.x > 2.0) buzzerRipple.scale.set(0.6, 0.6, 0.6);
        ripMat.opacity = Math.max(0, 1.0 - (buzzerRipple.scale.x - 0.6) / 1.4);
      } else {
        ripMat.opacity = 0;
        buzzerRipple.scale.set(0.6, 0.6, 0.6);
      }
    }
  }, [telemetry]);

  // Highlight Selected Wire
  useEffect(() => {
    if (!threeRefs.current) return;
    const { wireMeshesMap } = threeRefs.current;

    wireMeshesMap.forEach(({ mesh }, wireId) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (selectedWire && selectedWire.id === wireId) {
        mat.emissive.setHex(0x38bdf8);
        mat.emissiveIntensity = 0.9;
        mesh.scale.set(1.4, 1.4, 1.4);
      } else {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0.0;
        mesh.scale.set(1.0, 1.0, 1.0);
      }
    });
  }, [selectedWire]);

  // Focus and select component
  useEffect(() => {
    if (selectedComponent && threeRefs.current) {
      const { groundHighlightMesh, componentsMap } = threeRefs.current;
      const entity = componentsMap.get(selectedComponent.id);
      if (entity && groundHighlightMesh) {
        groundHighlightMesh.position.x = entity.group.position.x;
        groundHighlightMesh.position.z = entity.group.position.z;
        (groundHighlightMesh.material as THREE.MeshBasicMaterial).opacity = 0.6;
      }
    } else if (threeRefs.current?.groundHighlightMesh) {
      (threeRefs.current.groundHighlightMesh.material as THREE.MeshBasicMaterial).opacity = 0;
    }
  }, [selectedComponent]);

  // Sync 3D lock icons visibility whenever lockedComponents state changes
  useEffect(() => {
    if (!threeRefs.current || !lockedComponents) return;
    const { lockIndicatorsMap } = threeRefs.current;
    lockIndicatorsMap.forEach((indicators, compId) => {
      const isLocked = Boolean(lockedComponents[compId]);
      indicators.forEach((ind) => {
        ind.visible = isLocked;
      });
    });
  }, [lockedComponents]);

  // Sync wire geometry when wire routing mode changes (Tight Validated vs Lab Slack)
  useEffect(() => {
    if (routingMode) {
      updateAttachedWires(routingMode);
    }
  }, [routingMode]);

  // Live progressive electrical wire-trace pulse animation
  useEffect(() => {
    if (!threeRefs.current || !isTracingConnections) return;
    const { wireMeshesMap } = threeRefs.current;
    const wireEntries = Array.from(wireMeshesMap.values());
    let step = 0;
    const interval = setInterval(() => {
      wireEntries.forEach(({ mesh }, i) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (i === step % wireEntries.length) {
          mat.emissive.setHex(0x10b981);
          mat.emissiveIntensity = 2.4;
        } else {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0.0;
        }
      });
      step++;
    }, 110);

    return () => {
      clearInterval(interval);
      wireEntries.forEach(({ mesh }) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0.0;
      });
    };
  }, [isTracingConnections]);

  // Camera Presets
  const setCameraPreset = (preset: 'PERSPECTIVE' | 'TOP' | 'MACRO' | 'LOAD_CELLS') => {
    if (!threeRefs.current) return;
    setActiveCamPreset(preset);
    const { camera, controls } = threeRefs.current;

    if (preset === 'PERSPECTIVE') {
      camera.position.set(0, 0.42, 0.60);
      controls.target.set(0, 0.015, 0);
    } else if (preset === 'TOP') {
      camera.position.set(0, 0.65, 0.005);
      controls.target.set(0, 0, 0);
    } else if (preset === 'MACRO') {
      camera.position.set(0.015, 0.18, 0.22);
      controls.target.set(0.015, 0.011, 0.015);
    } else if (preset === 'LOAD_CELLS') {
      camera.position.set(-0.165, 0.18, 0.16);
      controls.target.set(-0.165, 0.005, -0.01);
    }
    controls.update();
  };

  // MOUSE & POINTER INTERACTION (OrbitControls + Component Dragging)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!threeRefs.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    threeRefs.current.pointerStart = { x: e.clientX, y: e.clientY };

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, threeRefs.current.camera);

    // If in MOVE mode or left click, check for component picking
    if (interactionMode === 'MOVE' || e.button === 0) {
      const { componentsMap } = threeRefs.current;
      const componentMeshes: THREE.Object3D[] = [];
      componentsMap.forEach((entity) => componentMeshes.push(entity.group));

      const intersects = raycaster.intersectObjects(componentMeshes, true);
      if (intersects.length > 0) {
        let hitMesh: THREE.Object3D | null = intersects[0].object;
        let matchedEntity: ComponentEntity | null = null;

        while (hitMesh) {
          for (const entity of componentsMap.values()) {
            if (entity.group === hitMesh) {
              matchedEntity = entity;
              break;
            }
          }
          if (matchedEntity) break;
          hitMesh = hitMesh.parent;
        }

        if (matchedEntity) {
          const compMeta = components.find((c) => c.id === matchedEntity!.id) || null;
          onSelectComponent(compMeta);
          onSelectWire(null);

          // Check if component is mechanically locked on its axis
          const isLocked = Boolean(lockedComponents?.[matchedEntity.id] ?? true);
          if (isLocked) {
            // Rigid mechanical axis lock! Prevent dragging and show visual feedback
            setLockedToast({
              componentName: matchedEntity.name,
              visible: true,
            });
            return;
          }

          // Disable OrbitControls while dragging component
          threeRefs.current.controls.enabled = false;
          threeRefs.current.isDraggingComponent = true;
          threeRefs.current.draggedComponent = matchedEntity;
          setDraggingCompName(matchedEntity.name);

          threeRefs.current.dragPlane.set(new THREE.Vector3(0, 1, 0), -matchedEntity.group.position.y);
          const planeIntersect = new THREE.Vector3();
          raycaster.ray.intersectPlane(threeRefs.current.dragPlane, planeIntersect);
          threeRefs.current.dragOffset.subVectors(matchedEntity.group.position, planeIntersect);

          if (threeRefs.current.groundHighlightMesh) {
            threeRefs.current.groundHighlightMesh.position.x = matchedEntity.group.position.x;
            threeRefs.current.groundHighlightMesh.position.z = matchedEntity.group.position.z;
            (threeRefs.current.groundHighlightMesh.material as THREE.MeshBasicMaterial).opacity = 0.8;
          }
          return;
        }
      }
    }

    // Check wire selection
    const wireMeshes = Array.from(threeRefs.current.wireMeshesMap.values()).map((w) => w.mesh);
    const wireIntersects = raycaster.intersectObjects(wireMeshes, true);
    if (wireIntersects.length > 0) {
      let wireHit = wireIntersects[0].object;
      while (wireHit && !wireHit.userData?.wire) {
        wireHit = wireHit.parent as THREE.Object3D;
      }
      if (wireHit?.userData?.wire) {
        onSelectWire(wireHit.userData.wire);
        onSelectComponent(null);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!threeRefs.current || !containerRef.current) return;
    const { isDraggingComponent, draggedComponent } = threeRefs.current;

    if (isDraggingComponent && draggedComponent) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, threeRefs.current.camera);

      const intersectPoint = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(threeRefs.current.dragPlane, intersectPoint)) {
        const targetX = intersectPoint.x + threeRefs.current.dragOffset.x;
        const targetZ = intersectPoint.z + threeRefs.current.dragOffset.z;

        // Keep inside ESD mat boundary (-0.24m to 0.24m, -0.16m to 0.16m)
        const clampedX = Math.max(-0.24, Math.min(0.24, targetX));
        const clampedZ = Math.max(-0.16, Math.min(0.16, targetZ));

        draggedComponent.group.position.x = clampedX;
        draggedComponent.group.position.z = clampedZ;

        if (threeRefs.current.groundHighlightMesh) {
          threeRefs.current.groundHighlightMesh.position.x = clampedX;
          threeRefs.current.groundHighlightMesh.position.z = clampedZ;
        }

        // Dynamically update attached wires in real time!
        updateAttachedWires();
      }
    }
  };

  const handlePointerUp = () => {
    if (!threeRefs.current) return;
    if (threeRefs.current.isDraggingComponent) {
      threeRefs.current.isDraggingComponent = false;
      threeRefs.current.draggedComponent = null;
      setDraggingCompName(null);
      // Re-enable OrbitControls
      threeRefs.current.controls.enabled = true;
      if (threeRefs.current.groundHighlightMesh) {
        (threeRefs.current.groundHighlightMesh.material as THREE.MeshBasicMaterial).opacity = 0.3;
      }
    }
  };

  return (
    <div className={`relative w-full h-full select-none overflow-hidden ${isDark ? 'bg-[#0a0e13]' : 'bg-[#edf2f7]'}`}>
      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        className={`w-full h-full ${
          draggingCompName
            ? 'cursor-grabbing'
            : interactionMode === 'MOVE'
            ? 'cursor-grab'
            : 'cursor-default'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* Locked Axis Feedback Toast */}
      {lockedToast?.visible && (
        <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs animate-in fade-in slide-in-from-top-2 select-none pointer-events-auto border ${
          isDark
            ? 'bg-slate-900/95 border-cyan-500/70 text-slate-300'
            : 'bg-white/95 border-cyan-400 text-slate-700 shadow-slate-300/60'
        }`}>
          <Lock className="w-4 h-4 text-cyan-400" />
          <div className="flex items-center gap-1.5">
            <span className={`font-bold font-['Chakra_Petch'] ${isDark ? 'text-white' : 'text-slate-900'}`}>{lockedToast.componentName}</span>
            <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>is LOCKED on mechanical axis.</span>
          </div>
          {onOpenLockManager && (
            <button
              onClick={onOpenLockManager}
              className={`ml-2 px-2.5 py-1 text-[11px] font-semibold rounded-lg cursor-pointer transition-colors border ${
                isDark
                  ? 'text-cyan-300 bg-cyan-950 hover:bg-cyan-900 border-cyan-500/50'
                  : 'text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border-cyan-300'
              }`}
            >
              Unlock in Manager
            </button>
          )}
          <button
            onClick={() => setLockedToast(null)}
            className={`ml-1 p-0.5 rounded cursor-pointer ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Toggle Button to open Slide Bar (when collapsed) */}
      {!isSlideBarOpen && (
        <button
          onClick={handleToggleSlideBar}
          title="Open Bench Controls Slide Bar"
          className={`absolute top-4 left-4 z-20 flex items-center gap-2 h-8 px-3 rounded-md shadow-lg backdrop-blur-md font-mono text-xs transition-all cursor-pointer group active:scale-95 pointer-events-auto border ${
            isDark
              ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-white'
              : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-md'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <Settings className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-45 transition-transform duration-300" />
          <span className={`font-semibold tracking-wider text-[11px] uppercase ${isDark ? 'text-cyan-200' : 'text-blue-700'}`}>BENCH CONTROLS</span>
          <ChevronRight className="w-3 h-3 text-cyan-400" />
        </button>
      )}

      {/* Left Slide Bar (Bench Controls Drawer) */}
      <div
        className={`absolute top-3 left-3 bottom-3 z-30 w-84 max-w-[calc(100vw-3rem)] flex flex-col rounded-2xl shadow-2xl transition-all duration-300 ease-in-out pointer-events-auto overflow-hidden border ${
          isDark
            ? 'bg-[#0b101e]/95 backdrop-blur-xl border-slate-700/80 shadow-black/80 text-white'
            : 'bg-white/95 backdrop-blur-xl border-slate-300 shadow-slate-400/30 text-slate-800'
        } ${
          isSlideBarOpen
            ? 'translate-x-0 opacity-100'
            : '-translate-x-[calc(100%+2rem)] opacity-0 pointer-events-none'
        }`}
      >
        {/* Floating edge tab button attached to slide bar edge to collapse smoothly */}
        <button
          onClick={handleToggleSlideBar}
          title="Slide bar away (collapse)"
          className={`absolute -right-8 top-5 z-40 flex items-center justify-center py-2 px-1.5 rounded-r-md border-y border-r shadow-xl cursor-pointer ${
            isDark
              ? 'bg-[#0b101e]/95 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
              : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-md'
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Slide Bar Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
          isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-xs">
              <Settings className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className={`text-xs font-bold tracking-wider uppercase font-mono ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                Bench Controls
              </h3>
              <p className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Camera · Wiring · Rigidity</p>
            </div>
          </div>
          <button
            onClick={handleToggleSlideBar}
            title="Slide Bar Away (Collapse)"
            className={`h-7 flex items-center gap-1 px-2.5 text-[11px] font-mono rounded-md transition-colors cursor-pointer shadow-xs border ${
              isDark
                ? 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border-slate-700/70'
                : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-300'
            }`}
          >
            <ChevronLeft className="w-3 h-3" />
            <span>Collapse</span>
          </button>
        </div>

        {/* Scrollable Control Sections */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar text-xs">
          {/* Section 1: Interaction Mode */}
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800/90 shadow-sm' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[11px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                <Move className="w-3.5 h-3.5 text-slate-400" />
                <span>Interaction Mode</span>
              </span>
              <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                interactionMode === 'ORBIT'
                  ? isDark
                    ? 'bg-blue-950/90 border-blue-500/50 text-blue-300'
                    : 'bg-blue-50 border-blue-300 text-blue-700'
                  : isDark
                  ? 'bg-cyan-950/90 border-cyan-500/50 text-cyan-300'
                  : 'bg-cyan-50 border-cyan-300 text-cyan-700'
              }`}>
                {interactionMode === 'ORBIT' ? 'Orbit View' : 'Move Parts'}
              </span>
            </div>

            {/* Segmented Switch */}
            <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-lg border ${isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-200/60 border-slate-300'}`}>
              <button
                onClick={() => setInteractionMode('ORBIT')}
                className={`h-8 flex items-center justify-center gap-1.5 px-2 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  interactionMode === 'ORBIT'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-950 font-bold'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Orbit Camera</span>
              </button>
              <button
                onClick={() => setInteractionMode('MOVE')}
                className={`h-8 flex items-center justify-center gap-1.5 px-2 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  interactionMode === 'MOVE'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950 font-bold'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                <span>Drag &amp; Move</span>
              </button>
            </div>

            <button
              onClick={handleResetPositions}
              title="Reset all components and wires to reference positions"
              className={`w-full mt-2 h-7.5 px-3 flex items-center justify-center gap-1.5 text-[11px] font-medium rounded-md transition-all cursor-pointer border ${
                isDark
                  ? 'text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600'
                  : 'text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border-slate-300 shadow-xs'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Layout to Reference</span>
            </button>
          </div>

          {/* Section 2: Camera Angles Presets */}
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800/90 shadow-sm' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[11px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                <Camera className="w-3.5 h-3.5 text-slate-400" />
                <span>Camera Angles</span>
              </span>
              <span className={`text-[10px] font-mono ${isDark ? 'text-cyan-400' : 'text-cyan-700 font-bold'}`}>
                Preset: {activeCamPreset}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'PERSPECTIVE', label: 'Perspective', icon: Compass, desc: 'Default 3D' },
                { id: 'TOP', label: 'Top View', icon: Grid, desc: 'Overhead 2D' },
                { id: 'MACRO', label: 'Close-up', icon: ZoomIn, desc: 'Breadboard' },
                { id: 'LOAD_CELLS', label: '4x Load Cells', icon: Box, desc: 'Chassis Quad' },
              ].map((preset) => {
                const isActive = activeCamPreset === preset.id;
                const IconComponent = preset.icon;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setCameraPreset(preset.id as any)}
                    className={`flex flex-col items-start p-2 rounded-md border text-left transition-all cursor-pointer ${
                      isActive
                        ? isDark
                          ? 'bg-blue-950/80 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50'
                          : 'bg-blue-50 border-blue-500 text-blue-950 shadow-xs ring-1 ring-blue-500/50 font-bold'
                        : isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-900/60'
                        : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-100/70 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <IconComponent className="w-3.5 h-3.5" />
                        <span>{preset.label}</span>
                      </span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                    </div>
                    <span className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{preset.desc}</span>
                  </button>
                );
              })}
            </div>

            {onToggleFullScreen && (
              <button
                onClick={onToggleFullScreen}
                title={isFullScreen ? 'Exit Full Screen 3D View' : 'Enter Immersive Full Screen 3D View'}
                className={`w-full mt-2.5 h-8 px-3 flex items-center justify-center gap-2 text-xs font-semibold rounded-md transition-all cursor-pointer shadow-sm active:scale-95 border ${
                  isDark
                    ? 'text-blue-300 hover:text-white bg-blue-950/70 hover:bg-blue-900/80 border-blue-500/50 hover:border-blue-400'
                    : 'text-blue-800 hover:text-blue-950 bg-blue-50 hover:bg-blue-100 border-blue-300 hover:border-blue-400'
                }`}
              >
                {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
              </button>
            )}
          </div>

          {/* Section 3: Wire Harness Routing Engine */}
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800/90 shadow-sm' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[11px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Wire Harness Routing</span>
              </span>
              <span className={`text-[10px] font-mono font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                Manhattan 90°
              </span>
            </div>

            <div className="space-y-1.5">
              <button
                onClick={() => onToggleRoutingMode ? onToggleRoutingMode('ALIGNED_ORTHOGONAL') : updateAttachedWires('ALIGNED_ORTHOGONAL')}
                className={`w-full flex items-center justify-between p-2 rounded-md border text-left transition-all cursor-pointer ${
                  routingMode === 'ALIGNED_ORTHOGONAL'
                    ? isDark
                      ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-300 shadow-sm ring-1 ring-emerald-500/40'
                      : 'bg-emerald-100/90 border-emerald-500 text-emerald-900 shadow-xs ring-1 ring-emerald-500/50 font-bold'
                    : isDark
                    ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Grid className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold leading-tight">Aligned Orthogonal</div>
                    <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Radiused Manhattan harness (Clean)</div>
                  </div>
                </div>
                {routingMode === 'ALIGNED_ORTHOGONAL' && (
                  <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded font-bold border ${
                    isDark ? 'bg-emerald-900/90 border-emerald-500/60 text-emerald-200' : 'bg-emerald-200 border-emerald-400 text-emerald-900'
                  }`}>
                    ACTIVE
                  </span>
                )}
              </button>

              <button
                onClick={() => onToggleRoutingMode ? onToggleRoutingMode('VALIDATED_TIGHT') : updateAttachedWires('VALIDATED_TIGHT')}
                className={`w-full flex items-center justify-between p-2 rounded-md border text-left transition-all cursor-pointer ${
                  routingMode === 'VALIDATED_TIGHT'
                    ? isDark
                      ? 'bg-cyan-950/70 border-cyan-500/80 text-cyan-300 shadow-sm ring-1 ring-cyan-500/40'
                      : 'bg-cyan-100/90 border-cyan-500 text-cyan-900 shadow-xs ring-1 ring-cyan-500/50 font-bold'
                    : isDark
                    ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold leading-tight">Tight Direct</div>
                    <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Taut point-to-point Bézier cables</div>
                  </div>
                </div>
                {routingMode === 'VALIDATED_TIGHT' && (
                  <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded font-bold border ${
                    isDark ? 'bg-cyan-900/90 border-cyan-500/60 text-cyan-200' : 'bg-cyan-200 border-cyan-400 text-cyan-900'
                  }`}>
                    ACTIVE
                  </span>
                )}
              </button>

              <button
                onClick={() => onToggleRoutingMode ? onToggleRoutingMode('STANDARD_SLACK') : updateAttachedWires('STANDARD_SLACK')}
                className={`w-full flex items-center justify-between p-2 rounded-md border text-left transition-all cursor-pointer ${
                  routingMode === 'STANDARD_SLACK'
                    ? isDark
                      ? 'bg-indigo-950/70 border-indigo-500/80 text-indigo-300 shadow-sm ring-1 ring-indigo-500/40'
                      : 'bg-indigo-100/90 border-indigo-500 text-indigo-900 shadow-xs ring-1 ring-indigo-500/50 font-bold'
                    : isDark
                    ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold leading-tight">Lab Sag</div>
                    <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Realistic physical catenary gravity sag</div>
                  </div>
                </div>
                {routingMode === 'STANDARD_SLACK' && (
                  <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded font-bold border ${
                    isDark ? 'bg-indigo-900/90 border-indigo-500/60 text-indigo-200' : 'bg-indigo-200 border-indigo-400 text-indigo-900'
                  }`}>
                    ACTIVE
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={() => {
                handleResetPositions();
                if (onAlignWiring) onAlignWiring();
                updateAttachedWires('ALIGNED_ORTHOGONAL');
              }}
              title="Snap all components to reference positions and align all wire channels"
              className={`w-full mt-2.5 h-8 px-3 flex items-center justify-center gap-2 text-xs font-semibold rounded-md transition-all cursor-pointer shadow-md border ${
                isDark
                  ? 'text-amber-200 bg-amber-950/80 hover:bg-amber-900/90 border-amber-500/50'
                  : 'text-amber-900 bg-amber-100 hover:bg-amber-200 border-amber-400 shadow-xs'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Align Wiring Design &amp; Snap</span>
            </button>
          </div>

          {/* Section 4: Component Lock & Validation Manager */}
          {onOpenLockManager && (
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800/90 shadow-sm' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[11px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mechanical Rigidity</span>
                </span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-bold rounded shadow-sm border ${
                  isDark
                    ? 'bg-emerald-950 border-emerald-500/70 text-emerald-300'
                    : 'bg-emerald-100 border-emerald-300 text-emerald-800'
                }`}>
                  <Check className="w-2.5 h-2.5" /> LOCKED
                </span>
              </div>
              <p className={`text-[11px] leading-snug mb-2.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                All 15 bench sensors, microcontrollers, and load cells are locked on mechanical axes.
              </p>
              <button
                onClick={onOpenLockManager}
                title="Open Component Lock & Validation Manager"
                className={`w-full h-8 px-3 flex items-center justify-center gap-2 text-xs font-semibold rounded-md shadow-md transition-all cursor-pointer active:scale-95 border ${
                  isDark
                    ? 'text-cyan-300 bg-cyan-950/90 hover:bg-cyan-900 border-cyan-500/60 hover:border-cyan-400'
                    : 'text-cyan-800 bg-cyan-100/90 hover:bg-cyan-200 border-cyan-300 hover:border-cyan-400'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Open Lock &amp; Validation Manager</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Section 5: 3D Navigation Gestures Guide */}
          <div className={`p-3 rounded-xl border text-[11px] font-mono space-y-1.5 ${
            isDark ? 'bg-slate-950/60 border-slate-800/60 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-xs'
          }`}>
            <div className={`flex items-center gap-1.5 font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>3D NAVIGATION GESTURES</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Left-click + Drag:</span>
              <span className={isDark ? 'text-slate-200' : 'text-slate-800 font-semibold'}>Rotate Camera</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Right-click + Drag:</span>
              <span className={isDark ? 'text-slate-200' : 'text-slate-800 font-semibold'}>Pan Viewport</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Mouse Scroll:</span>
              <span className={isDark ? 'text-cyan-300' : 'text-cyan-700 font-bold'}>Zoom to Cursor</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Click Component:</span>
              <span className={isDark ? 'text-cyan-300' : 'text-cyan-700 font-bold'}>Live Telemetry &amp; Pins</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Active Moving Banner (Top Center) */}
      {draggingCompName && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 border backdrop-blur-md rounded-xl text-xs font-mono shadow-2xl animate-pulse pointer-events-auto ${
          isDark
            ? 'bg-cyan-950/95 border-cyan-400/80 text-cyan-100 shadow-cyan-950/60'
            : 'bg-cyan-50/95 border-cyan-500 text-cyan-950 shadow-cyan-200/60 font-semibold'
        }`}>
          <Move className="w-3.5 h-3.5 text-cyan-400" />
          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Moving:</span>
          <span className={`font-bold font-['Chakra_Petch'] ${isDark ? 'text-white' : 'text-cyan-900'}`}>{draggingCompName}</span>
          <span className={`text-[11px] ${isDark ? 'text-cyan-400/80' : 'text-cyan-700'}`}>· Wires rerouting live</span>
        </div>
      )}

      {/* Selected Wire Floating Callout Card */}
      {selectedWire && (
        <div className={`absolute bottom-6 left-6 z-20 max-w-sm p-4 backdrop-blur-md rounded-xl border shadow-2xl animate-in fade-in slide-in-from-bottom-2 pointer-events-auto ${
          isDark
            ? 'bg-slate-900/95 border-cyan-500/50 text-slate-300 shadow-black/80'
            : 'bg-white/95 border-cyan-500/70 text-slate-700 shadow-slate-300/80'
        }`}>
          <div className={`flex items-center justify-between gap-3 mb-2 pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full border border-black/20 shadow-xs"
                style={{ backgroundColor: selectedWire.color }}
              />
              <h4 className={`text-sm font-bold font-['Chakra_Petch'] ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedWire.name}</h4>
            </div>
            <button
              onClick={() => onSelectWire(null)}
              className={`p-1 rounded cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className={`space-y-1.5 text-xs font-mono ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            <div className={`flex justify-between border-b pb-1 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Source:</span>
              <span className={`font-semibold ${isDark ? 'text-cyan-300' : 'text-cyan-700 font-bold'}`}>{selectedWire.sourceComponent} [{selectedWire.sourcePin}]</span>
            </div>
            <div className={`flex justify-between border-b pb-1 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Destination:</span>
              <span className={`font-semibold ${isDark ? 'text-cyan-300' : 'text-cyan-700 font-bold'}`}>{selectedWire.targetComponent} [{selectedWire.targetPin}]</span>
            </div>
            <div className={`flex justify-between border-b pb-1 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Wire Spec:</span>
              <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{selectedWire.colorName}</span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Signal:</span>
              <span className={isDark ? 'text-emerald-400 font-semibold' : 'text-emerald-700 font-bold'}>{selectedWire.voltageText}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
