import * as THREE from 'three';
import { WireRoutingMode } from '../../types/simulation';

/**
 * Photorealistic 3D Procedural Engineering Hardware Models
 * SI Metric Units (1 unit = 1 meter)
 */

// Shared reusable physical PBR materials
export const materials = {
  // PCBs
  pcbBlackMatte: new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.42,
    metalness: 0.15,
  }),
  pcbGreen: new THREE.MeshStandardMaterial({
    color: 0x0f4728,
    roughness: 0.38,
    metalness: 0.15,
  }),
  pcbBlue: new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    roughness: 0.38,
    metalness: 0.15,
  }),
  pcbRed: new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.38,
    metalness: 0.15,
  }),
  // Metals
  aluminumBrushed: new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.3,
    metalness: 0.85,
  }),
  steelChassis: new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.45,
    metalness: 0.7,
  }),
  metalNickel: new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.22,
    metalness: 0.9,
  }),
  metalGoldEnig: new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.2,
    metalness: 0.92,
  }),
  metalScrew: new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.25,
    metalness: 0.88,
  }),
  heatsinkBlack: new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.35,
    metalness: 0.75,
  }),
  // Plastics & Synthetics
  breadboardABS: new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.4,
    metalness: 0.04,
  }),
  plasticBlackIC: new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.65,
    metalness: 0.12,
  }),
  terminalBlue: new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.45,
    metalness: 0.08,
  }),
  dupontBootBlack: new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.6,
    metalness: 0.1,
  }),
  siliconeSealant: new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.85,
    metalness: 0.02,
  }),
  foamTape: new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.95,
    metalness: 0.0,
  }),
  // SMD Resistor body
  smdResistorBody: new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.5,
    metalness: 0.1,
  }),
  smdSolderFillet: new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.25,
    metalness: 0.85,
  }),
};

/**
 * Creates the Anti-static ESD Soldering/Cutting Mat on Workbench
 */
export function createESDMat(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ESD Workbench Mat';

  // Wooden Workbench Base
  const benchGeo = new THREE.BoxGeometry(0.72, 0.03, 0.48);
  const benchMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.75,
    metalness: 0.1,
  });
  const bench = new THREE.Mesh(benchGeo, benchMat);
  bench.name = 'benchBase';
  bench.position.set(0, -0.016, 0);
  bench.receiveShadow = true;
  group.add(bench);

  // Deep Blue/Green ESD Anti-Static Mat (540mm x 360mm x 2mm)
  const matGeo = new THREE.BoxGeometry(0.56, 0.002, 0.38);
  const matMat = new THREE.MeshStandardMaterial({
    color: 0x0f344d,
    roughness: 0.65,
    metalness: 0.08,
  });
  const matMesh = new THREE.Mesh(matGeo, matMat);
  matMesh.name = 'esdMatSurface';
  matMesh.position.set(0, 0.001, 0);
  matMesh.receiveShadow = true;
  group.add(matMesh);

  // Metric Coordinate Grid Markings on ESD Mat
  const grid = new THREE.GridHelper(0.54, 27, 0x1e5a8a, 0x164264);
  grid.name = 'esdMatGrid';
  grid.position.set(0, 0.0022, 0);
  group.add(grid);

  // Grounding Snap Terminal at top-left corner
  const snapGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.003, 16);
  const snap = new THREE.Mesh(snapGeo, materials.metalScrew);
  snap.position.set(-0.25, 0.0035, -0.16);
  group.add(snap);

  // Coiled ground wire connection
  const coilCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.25, 0.0035, -0.16),
    new THREE.Vector3(-0.27, 0.015, -0.18),
    new THREE.Vector3(-0.29, 0.008, -0.21),
    new THREE.Vector3(-0.31, -0.01, -0.24),
  ]);
  const groundWireGeo = new THREE.TubeGeometry(coilCurve, 20, 0.0012, 6, false);
  const groundWireMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5 });
  const groundWire = new THREE.Mesh(groundWireGeo, groundWireMat);
  group.add(groundWire);

  return group;
}

export function updateESDMatTheme(group: THREE.Group, isDark: boolean, baseHex?: number, matHex?: number): void {
  const bench = group.getObjectByName('benchBase') as THREE.Mesh | undefined;
  if (bench && bench.material instanceof THREE.MeshStandardMaterial) {
    bench.material.color.setHex(baseHex !== undefined ? baseHex : (isDark ? 0x1f2937 : 0xcbd5e1));
  }
  const mat = group.getObjectByName('esdMatSurface') as THREE.Mesh | undefined;
  if (mat && mat.material instanceof THREE.MeshStandardMaterial) {
    mat.material.color.setHex(matHex !== undefined ? matHex : (isDark ? 0x0f344d : 0x0284c7));
  }
  const grid = group.getObjectByName('esdMatGrid') as THREE.GridHelper | undefined;
  if (grid && grid.material instanceof THREE.LineBasicMaterial) {
    grid.material.color.setHex(isDark ? 0x1e5a8a : 0x0369a1);
  }
}

/**
 * Creates Solderless 400-tie-point Breadboard
 * Standard dimensions: 165mm x 55mm x 9mm
 */
export function createBreadboard(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Breadboard';

  // ABS Plastic Main Body
  const bodyGeo = new THREE.BoxGeometry(0.165, 0.009, 0.055);
  const body = new THREE.Mesh(bodyGeo, materials.breadboardABS);
  body.position.y = 0.0045;
  body.receiveShadow = true;
  body.castShadow = true;
  group.add(body);

  // Center trough divider
  const troughGeo = new THREE.BoxGeometry(0.156, 0.0015, 0.0035);
  const troughMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
  const trough = new THREE.Mesh(troughGeo, troughMat);
  trough.position.set(0, 0.0085, 0);
  group.add(trough);

  // Screen-printed Red (+) and Blue (-) power bus lines
  const lineGeo = new THREE.BoxGeometry(0.152, 0.0002, 0.0007);
  const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const blueMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });

  // Top power rail lines
  const topRed = new THREE.Mesh(lineGeo, redMat);
  topRed.position.set(0, 0.0091, -0.024);
  group.add(topRed);

  const topBlue = new THREE.Mesh(lineGeo, blueMat);
  topBlue.position.set(0, 0.0091, -0.020);
  group.add(topBlue);

  // Bottom power rail lines
  const btmBlue = new THREE.Mesh(lineGeo, blueMat);
  btmBlue.position.set(0, 0.0091, 0.020);
  group.add(btmBlue);

  const btmRed = new THREE.Mesh(lineGeo, redMat);
  btmRed.position.set(0, 0.0091, 0.024);
  group.add(btmRed);

  // Recessed tie-point socket holes (Instanced)
  const holeGeo = new THREE.BoxGeometry(0.0011, 0.0006, 0.0011);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
  const totalHoles = 30 * 10;
  const instancedHoles = new THREE.InstancedMesh(holeGeo, holeMat, totalHoles);

  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let c = 0; c < 30; c++) {
    const x = -0.072 + c * 0.00496;
    // Top bank (rows A-E)
    for (let r = 0; r < 5; r++) {
      const z = -0.016 + r * 0.0028;
      dummy.position.set(x, 0.0091, z);
      dummy.updateMatrix();
      instancedHoles.setMatrixAt(idx++, dummy.matrix);
    }
    // Bottom bank (rows F-J)
    for (let r = 0; r < 5; r++) {
      const z = 0.005 + r * 0.0028;
      dummy.position.set(x, 0.0091, z);
      dummy.updateMatrix();
      instancedHoles.setMatrixAt(idx++, dummy.matrix);
    }
  }
  instancedHoles.instanceMatrix.needsUpdate = true;
  group.add(instancedHoles);

  return group;
}

/**
 * Creates ESP32-C3 Dev Board
 * Dimensions: ~48mm x 26mm x 6mm
 */
export function createESP32C3(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ESP32-C3';

  // Matte Black FR4 PCB
  const pcbGeo = new THREE.BoxGeometry(0.026, 0.0016, 0.048);
  const pcb = new THREE.Mesh(pcbGeo, materials.pcbBlackMatte);
  pcb.position.y = 0.0008;
  pcb.castShadow = true;
  group.add(pcb);

  // Gold header pins (left and right banks)
  const pinGeo = new THREE.BoxGeometry(0.0008, 0.007, 0.0008);
  for (let i = 0; i < 9; i++) {
    const z = -0.018 + i * 0.0045;
    const pinL = new THREE.Mesh(pinGeo, materials.metalGoldEnig);
    pinL.position.set(-0.0118, -0.0025, z);
    group.add(pinL);

    const pinR = new THREE.Mesh(pinGeo, materials.metalGoldEnig);
    pinR.position.set(0.0118, -0.0025, z);
    group.add(pinR);
  }

  // Nickel-plated RF Shielding Can with Espressif markings
  const shieldGeo = new THREE.BoxGeometry(0.018, 0.0028, 0.020);
  const shield = new THREE.Mesh(shieldGeo, materials.metalNickel);
  shield.position.set(0, 0.0026, -0.007);
  shield.castShadow = true;
  group.add(shield);

  // Gold-plated serpentine PCB trace antenna at top edge
  const antGeo = new THREE.BoxGeometry(0.016, 0.0004, 0.0045);
  const ant = new THREE.Mesh(antGeo, materials.metalGoldEnig);
  ant.position.set(0, 0.0018, -0.020);
  group.add(ant);

  // SMT USB Type-C connector at bottom
  const usbGeo = new THREE.BoxGeometry(0.009, 0.0032, 0.0075);
  const usb = new THREE.Mesh(usbGeo, materials.metalNickel);
  usb.position.set(0, 0.0024, 0.021);
  usb.castShadow = true;
  group.add(usb);

  // USB-C Plug & Power Cable (supplying 5V to the ESP32-C3 directly)
  const usbPlugGeo = new THREE.BoxGeometry(0.0095, 0.0042, 0.016);
  const usbPlugMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 });
  const usbPlug = new THREE.Mesh(usbPlugGeo, usbPlugMat);
  usbPlug.position.set(0, 0.0024, 0.032);
  usbPlug.castShadow = true;
  group.add(usbPlug);

  const usbStrainReliefGeo = new THREE.CylinderGeometry(0.0025, 0.002, 0.010, 12);
  const usbStrainRelief = new THREE.Mesh(usbStrainReliefGeo, materials.plasticBlackIC);
  usbStrainRelief.rotation.x = Math.PI / 2;
  usbStrainRelief.position.set(0, 0.0024, 0.043);
  group.add(usbStrainRelief);

  const usbCableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.0024, 0.048),
    new THREE.Vector3(0, 0.001, 0.065),
    new THREE.Vector3(0.01, 0.001, 0.090),
    new THREE.Vector3(0.02, 0.001, 0.130),
    new THREE.Vector3(0.03, -0.01, 0.180),
  ]);
  const usbCableGeo = new THREE.TubeGeometry(usbCableCurve, 24, 0.0018, 8, false);
  const usbCableMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
  const usbCableMesh = new THREE.Mesh(usbCableGeo, usbCableMat);
  group.add(usbCableMesh);

  // Reset and Boot miniature pushbuttons
  const btnGeo = new THREE.BoxGeometry(0.0025, 0.0018, 0.0025);
  const rstBtn = new THREE.Mesh(btnGeo, materials.metalScrew);
  rstBtn.position.set(-0.0075, 0.0022, 0.014);
  group.add(rstBtn);

  const bootBtn = new THREE.Mesh(btnGeo, materials.metalScrew);
  bootBtn.position.set(0.0075, 0.0022, 0.014);
  group.add(bootBtn);

  // Red 0603 Power LED
  const pwrLedGeo = new THREE.BoxGeometry(0.0014, 0.0008, 0.0014);
  const pwrLedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 0.8,
  });
  const pwrLed = new THREE.Mesh(pwrLedGeo, pwrLedMat);
  pwrLed.position.set(-0.0065, 0.0018, 0.006);
  group.add(pwrLed);

  return group;
}

/**
 * Creates HX711 24-bit ADC Module
 */
export function createHX711Module(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'HX711';

  // Green PCB
  const pcbGeo = new THREE.BoxGeometry(0.024, 0.0014, 0.032);
  const pcb = new THREE.Mesh(pcbGeo, materials.pcbGreen);
  pcb.position.y = 0.0007;
  pcb.castShadow = true;
  group.add(pcb);

  // SOIC-16 IC
  const icGeo = new THREE.BoxGeometry(0.0065, 0.0016, 0.010);
  const ic = new THREE.Mesh(icGeo, materials.plasticBlackIC);
  ic.position.set(0, 0.0017, 0);
  ic.castShadow = true;
  group.add(ic);

  // Gold header pins
  const pinGeo = new THREE.BoxGeometry(0.0008, 0.005, 0.0008);
  for (let i = 0; i < 4; i++) {
    const z = -0.006 + i * 0.004;
    // Left: E+, E-, A+, A-
    const pinL = new THREE.Mesh(pinGeo, materials.metalGoldEnig);
    pinL.position.set(-0.0095, 0.0025, z);
    group.add(pinL);
    // Right: VCC, DT, SCK, GND
    const pinR = new THREE.Mesh(pinGeo, materials.metalGoldEnig);
    pinR.position.set(0.0095, 0.0025, z);
    group.add(pinR);
  }

  return group;
}

/**
 * Creates 50kg Half-Bridge Body Load Cell matching user uploaded reference image
 * Features:
 * - Square stamped zinc-plated steel frame plate (34mm x 34mm x 1.6mm) with rounded corners
 * - Inner rectangular aperture separating outer rim from center strain beam
 * - Center bridge member with 3 steel mounting rivets/dimples
 * - White silicone rubber potting / elastomer cover sealing internal strain gauges
 * - Coiled 3-wire pigtail (Red, Black, White) with wire loops and stripped ends
 */
export function create50kgLoadCell(label = '50kg Body Load Cell'): THREE.Group {
  const group = new THREE.Group();
  group.name = label;

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xd8dce3,
    roughness: 0.3,
    metalness: 0.88,
  });

  const outerW = 0.034;
  const outerH = 0.034;
  const thickness = 0.0016;
  const cornerR = 0.006;
  const rimW = 0.0055;

  // Top and bottom horizontal rims
  const horizRimGeo = new THREE.BoxGeometry(outerW - cornerR * 2, thickness, rimW);
  const topRim = new THREE.Mesh(horizRimGeo, steelMat);
  topRim.position.set(0, thickness / 2, -(outerH / 2 - rimW / 2));
  topRim.castShadow = true;
  group.add(topRim);

  const btmRim = new THREE.Mesh(horizRimGeo, steelMat);
  btmRim.position.set(0, thickness / 2, outerH / 2 - rimW / 2);
  btmRim.castShadow = true;
  group.add(btmRim);

  // Left and right vertical rims
  const vertRimGeo = new THREE.BoxGeometry(rimW, thickness, outerH - cornerR * 2);
  const leftRim = new THREE.Mesh(vertRimGeo, steelMat);
  leftRim.position.set(-(outerW / 2 - rimW / 2), thickness / 2, 0);
  leftRim.castShadow = true;
  group.add(leftRim);

  const rightRim = new THREE.Mesh(vertRimGeo, steelMat);
  rightRim.position.set(outerW / 2 - rimW / 2, thickness / 2, 0);
  rightRim.castShadow = true;
  group.add(rightRim);

  // Rounded corners (quarter cylinders)
  const cornerGeo = new THREE.CylinderGeometry(cornerR, cornerR, thickness, 16);
  const c1 = new THREE.Mesh(cornerGeo, steelMat);
  c1.position.set(-(outerW / 2 - cornerR), thickness / 2, -(outerH / 2 - cornerR));
  group.add(c1);

  const c2 = new THREE.Mesh(cornerGeo, steelMat);
  c2.position.set(outerW / 2 - cornerR, thickness / 2, -(outerH / 2 - cornerR));
  group.add(c2);

  const c3 = new THREE.Mesh(cornerGeo, steelMat);
  c3.position.set(-(outerW / 2 - cornerR), thickness / 2, outerH / 2 - cornerR);
  group.add(c3);

  const c4 = new THREE.Mesh(cornerGeo, steelMat);
  c4.position.set(outerW / 2 - cornerR, thickness / 2, outerH / 2 - cornerR);
  group.add(c4);

  // White silicone potting / elastomer cover in center
  const siliconeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.85,
    metalness: 0.05,
  });
  const siliconeGeo = new THREE.BoxGeometry(0.016, 0.0032, 0.012);
  const silicone = new THREE.Mesh(siliconeGeo, siliconeMat);
  silicone.position.set(0, 0.002, 0);
  silicone.castShadow = true;
  group.add(silicone);

  // Center arched steel strain bridge with 3 rivets
  const bridgeGeo = new THREE.BoxGeometry(0.018, 0.0018, 0.008);
  const bridge = new THREE.Mesh(bridgeGeo, steelMat);
  bridge.position.set(0, 0.0036, 0);
  bridge.castShadow = true;
  group.add(bridge);

  const rivetGeo = new THREE.CylinderGeometry(0.0014, 0.0014, 0.0008, 12);
  const rivetMat = new THREE.MeshStandardMaterial({ color: 0xc4c7cb, roughness: 0.25, metalness: 0.9 });
  for (let r = -1; r <= 1; r++) {
    const rivet = new THREE.Mesh(rivetGeo, rivetMat);
    rivet.position.set(r * 0.006, 0.0046, 0);
    group.add(rivet);
  }

  // Clean, professionally pruned strain-relief cable exit sleeve (No excess coiled loops)
  const sleeveGeo = new THREE.CylinderGeometry(0.0016, 0.0019, 0.006, 12);
  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.65 });
  const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
  sleeve.rotation.z = Math.PI / 2;
  sleeve.position.set(0.016, 0.0024, 0);
  sleeve.castShadow = true;
  group.add(sleeve);

  // Pruned 3-wire exit leads (Red, Black, White) - flush, neat and directly connected with no dangling coils
  const wireRadius = 0.00045;
  const redWireMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
  const blackWireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 });
  const whiteWireMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });

  const createPrunedLead = (offsetZ: number, mat: THREE.Material) => {
    const leadGeo = new THREE.CylinderGeometry(wireRadius, wireRadius, 0.005, 8);
    const leadMesh = new THREE.Mesh(leadGeo, mat);
    leadMesh.rotation.z = Math.PI / 2;
    leadMesh.position.set(0.021, 0.0024, offsetZ);
    return leadMesh;
  };

  group.add(createPrunedLead(-0.0012, redWireMat));
  group.add(createPrunedLead(0, blackWireMat));
  group.add(createPrunedLead(0.0012, whiteWireMat));

  // Tinned solder terminal pads at lead ends for tight jumper connection
  const tipGeo = new THREE.CylinderGeometry(0.0006, 0.0006, 0.0015, 8);
  [-0.0012, 0, 0.0012].forEach((offsetZ) => {
    const tip = new THREE.Mesh(tipGeo, materials.metalGoldEnig);
    tip.rotation.z = Math.PI / 2;
    tip.position.set(0.024, 0.0024, offsetZ);
    group.add(tip);
  });

  return group;
}

/**
 * Creates an individual 50kg load cell on its mechanical mounting pad
 * for independent positioning, individual dragging, and locking.
 */
export function createSingleLoadCellWithPad(label: string = '50kg Load Cell'): THREE.Group {
  const container = new THREE.Group();
  container.name = label;

  // Base platform spacer pad (realistic laboratory test jig)
  const padGeo = new THREE.BoxGeometry(0.038, 0.0015, 0.038);
  const padMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.set(0, 0.00075, 0);
  pad.receiveShadow = true;
  container.add(pad);

  // 4 corner mounting screws on the pad
  const screwGeo = new THREE.CylinderGeometry(0.0009, 0.0009, 0.0012, 8);
  const screwMat = materials.metalScrew;
  [
    [-0.015, -0.015],
    [0.015, -0.015],
    [-0.015, 0.015],
    [0.015, 0.015],
  ].forEach(([sx, sz]) => {
    const s = new THREE.Mesh(screwGeo, screwMat);
    s.position.set(sx, 0.0018, sz);
    container.add(s);
  });

  const cell = create50kgLoadCell(label);
  cell.position.set(0, 0.0015, 0);
  container.add(cell);

  return container;
}

/**
 * Creates the central Wheatstone Bridge Combiner Board as a standalone PCB
 */
export function createWheatstoneCombinerBoard(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Wheatstone Bridge Combiner Board';

  // Central Wheatstone Bridge Combiner Board (34mm x 26mm x 1.6mm Green FR4 PCB)
  const combinerPcbGeo = new THREE.BoxGeometry(0.034, 0.0016, 0.026);
  const combinerPcb = new THREE.Mesh(combinerPcbGeo, materials.pcbGreen);
  combinerPcb.position.set(0, 0.0008, 0);
  combinerPcb.castShadow = true;
  combinerPcb.receiveShadow = true;
  group.add(combinerPcb);

  // Silkscreen border on combiner board
  const borderGeo = new THREE.BoxGeometry(0.032, 0.0002, 0.024);
  const borderMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const border = new THREE.Mesh(borderGeo, borderMat);
  border.position.set(0, 0.0017, 0);
  group.add(border);

  const innerGeo = new THREE.BoxGeometry(0.030, 0.0003, 0.022);
  const innerMat = new THREE.MeshBasicMaterial({ color: 0x0f4728 });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  inner.position.set(0, 0.00175, 0);
  group.add(inner);

  // 4 Corner M2 mounting holes with copper annular rings
  const holeGeo = new THREE.CylinderGeometry(0.0012, 0.0012, 0.0018, 12);
  const ringGeo = new THREE.RingGeometry(0.0012, 0.0022, 16);
  [
    [-0.014, -0.010],
    [0.014, -0.010],
    [-0.014, 0.010],
    [0.014, 0.010],
  ].forEach(([hx, hz]) => {
    const ring = new THREE.Mesh(ringGeo, materials.metalGoldEnig);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(hx, 0.00185, hz);
    group.add(ring);
  });

  // Gold Solder Pads for Bridge Output [ E+ | E- | A+ | A- ] (facing right toward HX711)
  const padHoleGeo = new THREE.CylinderGeometry(0.0011, 0.0011, 0.0006, 12);
  const bridgeZPositions = [-0.006, -0.002, 0.002, 0.006];
  bridgeZPositions.forEach((z) => {
    const pad = new THREE.Mesh(padHoleGeo, materials.metalGoldEnig);
    pad.position.set(0.013, 0.0019, z);
    group.add(pad);
  });

  // Miniature terminal blocks / solder screw pads for LC1, LC2, LC3, LC4
  const addTerminalPad = (x: number, z: number, colorHex: number) => {
    const pad = new THREE.Mesh(padHoleGeo, materials.metalGoldEnig);
    pad.position.set(x, 0.0019, z);
    group.add(pad);

    const dotGeo = new THREE.CylinderGeometry(0.00065, 0.00065, 0.0008, 8);
    const dotMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(x, 0.0022, z);
    group.add(dot);
  };

  // LC1 Terminals (Front-Left: Red, Black, White at x = -0.013)
  addTerminalPad(-0.013, -0.008, 0xef4444); // LC1 Red
  addTerminalPad(-0.013, -0.005, 0x18181b); // LC1 Black
  addTerminalPad(-0.013, -0.002, 0xf8fafc); // LC1 White

  // LC3 Terminals (Rear-Left: Red, Black, White at x = -0.013)
  addTerminalPad(-0.013, 0.002, 0xef4444);  // LC3 Red
  addTerminalPad(-0.013, 0.005, 0x18181b);  // LC3 Black
  addTerminalPad(-0.013, 0.008, 0xf8fafc);  // LC3 White

  // LC2 Terminals (Front-Right: Red, Black, White at x = 0.005)
  addTerminalPad(0.005, -0.008, 0xef4444);  // LC2 Red
  addTerminalPad(0.005, -0.005, 0x18181b);  // LC2 Black
  addTerminalPad(0.005, -0.002, 0xf8fafc);  // LC2 White

  // LC4 Terminals (Rear-Right: Red, Black, White at x = 0.005)
  addTerminalPad(0.005, 0.002, 0xef4444);   // LC4 Red
  addTerminalPad(0.005, 0.005, 0x18181b);   // LC4 Black
  addTerminalPad(0.005, 0.008, 0xf8fafc);   // LC4 White

  // Silkscreen text bars & Wheatstone Bridge balancing resistors
  const smdGeo = new THREE.BoxGeometry(0.0022, 0.0009, 0.0012);
  const smdMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 });
  [-0.004, 0.000].forEach((x) => {
    [-0.003, 0.003].forEach((z) => {
      const smd = new THREE.Mesh(smdGeo, smdMat);
      smd.position.set(x, 0.0022, z);
      group.add(smd);
    });
  });

  return group;
}

/**
 * Backward-compatible 4 load cells composite
 */
export function createFourLoadCells(): THREE.Group {
  const group = new THREE.Group();
  group.name = '4x 50kg Half-Bridge Load Cells';

  const positions = [
    { x: -0.040, z: -0.042, label: 'LC1 (Front-Left 50kg)' },
    { x: 0.040, z: -0.042, label: 'LC2 (Front-Right 50kg)' },
    { x: -0.040, z: 0.042, label: 'LC3 (Rear-Left 50kg)' },
    { x: 0.040, z: 0.042, label: 'LC4 (Rear-Right 50kg)' },
  ];

  positions.forEach((pos) => {
    const cell = createSingleLoadCellWithPad(pos.label);
    cell.position.set(pos.x, 0, pos.z);
    group.add(cell);
  });

  const combiner = createWheatstoneCombinerBoard();
  combiner.position.set(0, 0.0015, 0);
  group.add(combiner);

  return group;
}

/**
 * Backwards-compatible alias for 4 load cells
 */
export function createLoadCells(): THREE.Group {
  return createFourLoadCells();
}

/**
 * Creates MPU6050 IMU seated on breadboard
 */
export function createMPU6050(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'MPU6050';

  // Blue PCB (21mm x 21mm x 1.6mm)
  const pcbGeo = new THREE.BoxGeometry(0.021, 0.0016, 0.021);
  const pcb = new THREE.Mesh(pcbGeo, materials.pcbBlue);
  pcb.position.y = 0.0008;
  pcb.castShadow = true;
  group.add(pcb);

  // QFN MEMS sensor IC
  const icGeo = new THREE.BoxGeometry(0.006, 0.0012, 0.006);
  const ic = new THREE.Mesh(icGeo, materials.plasticBlackIC);
  ic.position.set(0, 0.0016, 0);
  group.add(ic);

  // 8-pin Header
  const pinGeo = new THREE.BoxGeometry(0.0008, 0.005, 0.0008);
  for (let i = 0; i < 8; i++) {
    const x = -0.0085 + i * 0.0024;
    const pin = new THREE.Mesh(pinGeo, materials.metalGoldEnig);
    pin.position.set(x, 0.0025, -0.0085);
    group.add(pin);
  }

  // Power LED
  const ledGeo = new THREE.BoxGeometry(0.0012, 0.0008, 0.0012);
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 0.8,
  });
  const led = new THREE.Mesh(ledGeo, ledMat);
  led.position.set(0.006, 0.0016, 0.006);
  group.add(led);

  return group;
}

/**
 * Creates SW-420 High-Sensitivity Normally Closed Vibration Sensor Module
 * Features SW-420 metallic switch cylinder, LM393 comparator IC,
 * 10k potentiometer trimmer, indicator LEDs, and 3-pin header [VCC | GND | DO]
 */
export function createSW420VibrationSensor(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SW420_Vibration_Sensor';

  // 1. Blue Double-Sided FR4 PCB (32mm x 14mm x 1.6mm)
  const pcbGeo = new THREE.BoxGeometry(0.032, 0.0016, 0.014);
  const pcb = new THREE.Mesh(pcbGeo, materials.pcbBlue);
  pcb.position.y = 0.0008;
  pcb.castShadow = true;
  group.add(pcb);

  // Mounting hole at left margin (M3 screw hole)
  const holeGeo = new THREE.CylinderGeometry(0.0015, 0.0015, 0.0018, 16);
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
  const hole = new THREE.Mesh(holeGeo, holeMat);
  hole.position.set(-0.012, 0.0008, 0);
  group.add(hole);

  // Gold annular ring around mounting hole
  const ringGeo = new THREE.CylinderGeometry(0.0022, 0.0022, 0.0017, 16);
  const ring = new THREE.Mesh(ringGeo, materials.metalGoldEnig);
  ring.position.set(-0.012, 0.0008, 0);
  group.add(ring);

  // 2. SW-420 Metallic Vibration Switch Canister (Gold-plated cylindrical barrel)
  const canGroup = new THREE.Group();
  const canGeo = new THREE.CylinderGeometry(0.0024, 0.0024, 0.012, 18);
  const canMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.92,
    roughness: 0.22,
  });
  const can = new THREE.Mesh(canGeo, canMat);
  can.rotation.z = Math.PI / 2; // Lie horizontally along X
  can.castShadow = true;
  canGroup.add(can);

  // Endcap ring on canister
  const capGeo = new THREE.CylinderGeometry(0.0026, 0.0026, 0.002, 16);
  const cap = new THREE.Mesh(capGeo, materials.plasticBlackIC);
  cap.rotation.z = Math.PI / 2;
  cap.position.x = -0.0055;
  canGroup.add(cap);

  canGroup.position.set(-0.004, 0.0035, -0.0028);
  group.add(canGroup);

  // 3. LM393 Dual Differential Comparator IC (SOIC-8)
  const icGeo = new THREE.BoxGeometry(0.0052, 0.0014, 0.004);
  const ic = new THREE.Mesh(icGeo, materials.plasticBlackIC);
  ic.position.set(0.005, 0.0019, -0.0025);
  group.add(ic);

  // LM393 Gull-wing Lead Pins
  const pinLeadGeo = new THREE.BoxGeometry(0.0007, 0.0003, 0.0012);
  for (let i = 0; i < 4; i++) {
    const x = 0.003 + i * 0.0013;
    const pinL = new THREE.Mesh(pinLeadGeo, materials.metalNickel);
    pinL.position.set(x, 0.0011, -0.005);
    group.add(pinL);

    const pinR = new THREE.Mesh(pinLeadGeo, materials.metalNickel);
    pinR.position.set(x, 0.0011, 0.0);
    group.add(pinR);
  }

  // 4. 10kΩ Calibration Sensitivity Potentiometer (Blue 3362 Trimpot with brass adjustment screw)
  const potGeo = new THREE.BoxGeometry(0.0055, 0.005, 0.0055);
  const pot = new THREE.Mesh(potGeo, materials.terminalBlue);
  pot.position.set(-0.003, 0.0041, 0.0032);
  pot.castShadow = true;
  group.add(pot);

  // Brass adjustment screw on top of pot
  const screwGeo = new THREE.CylinderGeometry(0.0012, 0.0012, 0.001, 14);
  const screw = new THREE.Mesh(screwGeo, materials.metalGoldEnig);
  screw.position.set(-0.003, 0.0068, 0.0032);
  group.add(screw);

  // 5. Dual SMD Status LEDs
  // PWR LED (Green)
  const pwrLedGeo = new THREE.BoxGeometry(0.0012, 0.0008, 0.001);
  const pwrLedMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 0.9,
  });
  const pwrLed = new THREE.Mesh(pwrLedGeo, pwrLedMat);
  pwrLed.position.set(0.004, 0.0018, 0.0035);
  group.add(pwrLed);

  // DO Indicator LED (Red shock pulse indicator)
  const doLedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 0.4,
  });
  const doLed = new THREE.Mesh(pwrLedGeo, doLedMat);
  doLed.position.set(0.007, 0.0018, 0.0035);
  group.add(doLed);

  // 6. 3-Pin Right-Angle 2.54mm Header Block [VCC | GND | DO]
  const headerBlockGeo = new THREE.BoxGeometry(0.0028, 0.0045, 0.009);
  const headerBlock = new THREE.Mesh(headerBlockGeo, materials.plasticBlackIC);
  headerBlock.position.set(0.0135, 0.0032, 0.0);
  group.add(headerBlock);

  // Gold square pins protruding outwards (towards +X)
  const pinStickGeo = new THREE.BoxGeometry(0.005, 0.00065, 0.00065);
  const pinZOffsets = [-0.00254, 0.0, 0.00254]; // VCC, GND, DO
  pinZOffsets.forEach((z) => {
    const pin = new THREE.Mesh(pinStickGeo, materials.metalGoldEnig);
    pin.position.set(0.0155, 0.0032, z);
    group.add(pin);
  });

  return group;
}

/**
 * Creates DS18B20 Waterproof Temperature Probe with Chassis P-Clamp
 */
export function createDS18B20(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'DS18B20';

  // Stainless steel cylinder capsule (6mm x 50mm)
  const probeGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.050, 16);
  const probe = new THREE.Mesh(probeGeo, materials.aluminumBrushed);
  probe.rotation.z = Math.PI / 2;
  probe.position.set(-0.010, 0.003, 0);
  probe.castShadow = true;
  group.add(probe);

  // Black heat-shrink collar
  const collarGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 0.012, 16);
  const collar = new THREE.Mesh(collarGeo, materials.plasticBlackIC);
  collar.rotation.z = Math.PI / 2;
  collar.position.set(0.016, 0.003, 0);
  group.add(collar);

  // Black jacketed cable
  const cableGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.035, 12);
  const cable = new THREE.Mesh(cableGeo, materials.plasticBlackIC);
  cable.rotation.z = Math.PI / 2;
  cable.position.set(0.038, 0.003, 0);
  group.add(cable);

  // Stainless Steel P-Clamp mounting probe to chassis rail
  const clampGeo = new THREE.CylinderGeometry(0.0042, 0.0042, 0.006, 16, 1, true, 0, Math.PI * 1.5);
  const clampMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, side: THREE.DoubleSide });
  const clamp = new THREE.Mesh(clampGeo, clampMat);
  clamp.rotation.z = Math.PI / 2;
  clamp.position.set(-0.010, 0.003, 0);
  group.add(clamp);

  // M3 socket screw on P-clamp tab
  const screwGeo = new THREE.CylinderGeometry(0.0025, 0.0025, 0.003, 12);
  const screw = new THREE.Mesh(screwGeo, materials.metalScrew);
  screw.position.set(-0.010, 0.007, -0.005);
  group.add(screw);

  return group;
}

/**
 * Creates L298N Dual H-Bridge Motor Driver Module
 */
export function createL298N(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'L298N';

  // Red PCB (44mm x 44mm x 1.6mm)
  const pcbGeo = new THREE.BoxGeometry(0.044, 0.0016, 0.044);
  const pcb = new THREE.Mesh(pcbGeo, materials.pcbRed);
  pcb.position.y = 0.0008;
  pcb.castShadow = true;
  group.add(pcb);

  // Black Anodized Aluminum Heatsink Base
  const hsBaseGeo = new THREE.BoxGeometry(0.024, 0.004, 0.014);
  const hsBase = new THREE.Mesh(hsBaseGeo, materials.heatsinkBlack);
  hsBase.position.set(0, 0.0035, -0.006);
  hsBase.castShadow = true;
  group.add(hsBase);

  // 7 vertical cooling fins
  const finGeo = new THREE.BoxGeometry(0.0012, 0.016, 0.014);
  for (let i = 0; i < 7; i++) {
    const fin = new THREE.Mesh(finGeo, materials.heatsinkBlack);
    fin.position.set(-0.010 + i * 0.0033, 0.012, -0.006);
    fin.castShadow = true;
    group.add(fin);
  }

  // 78M05 5V Voltage Regulator with metal tab
  const regGeo = new THREE.BoxGeometry(0.006, 0.008, 0.003);
  const reg = new THREE.Mesh(regGeo, materials.plasticBlackIC);
  reg.position.set(-0.012, 0.005, 0.012);
  group.add(reg);

  const regTabGeo = new THREE.BoxGeometry(0.006, 0.003, 0.001);
  const regTab = new THREE.Mesh(regTabGeo, materials.metalScrew);
  regTab.position.set(-0.012, 0.009, 0.012);
  group.add(regTab);

  // Blue screw terminals (OUT1/2 on left, OUT3/4 on right)
  const createTerminalBlock = (pos: THREE.Vector3) => {
    const termGroup = new THREE.Group();
    const blockGeo = new THREE.BoxGeometry(0.009, 0.011, 0.014);
    const block = new THREE.Mesh(blockGeo, materials.terminalBlue);
    block.castShadow = true;
    termGroup.add(block);

    // Screw heads on top
    const screwGeo = new THREE.CylinderGeometry(0.0014, 0.0014, 0.001, 8);
    const s1 = new THREE.Mesh(screwGeo, materials.metalScrew);
    s1.position.set(0, 0.006, -0.0035);
    termGroup.add(s1);

    const s2 = new THREE.Mesh(screwGeo, materials.metalScrew);
    s2.position.set(0, 0.006, 0.0035);
    termGroup.add(s2);

    // Front wire entry slots
    const slotGeo = new THREE.BoxGeometry(0.0015, 0.003, 0.0035);
    const slot1 = new THREE.Mesh(slotGeo, materials.plasticBlackIC);
    slot1.position.set(0.004, 0, -0.0035);
    termGroup.add(slot1);

    const slot2 = new THREE.Mesh(slotGeo, materials.plasticBlackIC);
    slot2.position.set(0.004, 0, 0.0035);
    termGroup.add(slot2);

    termGroup.position.copy(pos);
    return termGroup;
  };

  group.add(createTerminalBlock(new THREE.Vector3(-0.017, 0.0065, 0.002)));
  group.add(createTerminalBlock(new THREE.Vector3(0.017, 0.0065, 0.002)));

  // 3-pin power screw terminal block at bottom (12V, GND, 5V)
  const termPwrGeo = new THREE.BoxGeometry(0.018, 0.011, 0.009);
  const termPwr = new THREE.Mesh(termPwrGeo, materials.terminalBlue);
  termPwr.position.set(0, 0.0065, 0.016);
  group.add(termPwr);

  // Electrolytic capacitors with silver scored vent tops
  const capGeo = new THREE.CylinderGeometry(0.0038, 0.0038, 0.011, 16);
  const capTopGeo = new THREE.CylinderGeometry(0.0036, 0.0036, 0.0005, 16);
  for (let i = 0; i < 2; i++) {
    const cap = new THREE.Mesh(capGeo, materials.plasticBlackIC);
    cap.position.set(-0.008 + i * 0.016, 0.0065, 0.006);
    group.add(cap);

    const capTop = new THREE.Mesh(capTopGeo, materials.aluminumBrushed);
    capTop.position.set(-0.008 + i * 0.016, 0.0121, 0.006);
    group.add(capTop);
  }

  // Header pins for control (ENA, IN1, IN2, IN3, IN4, ENB)
  const pinGeo = new THREE.BoxGeometry(0.0008, 0.0045, 0.0008);
  for (let i = 0; i < 6; i++) {
    const pin = new THREE.Mesh(pinGeo, materials.metalGoldEnig);
    pin.position.set(-0.011 + i * 0.0044, 0.003, 0.009);
    group.add(pin);
  }

  return group;
}

/**
 * Creates Coin Vibration Motor with double-sided foam tape
 */
export function createCoinMotor(): { group: THREE.Group; rotorMesh: THREE.Mesh } {
  const group = new THREE.Group();
  group.name = 'Coin Motor';

  // Foam tape mounting pad under motor
  const tapeGeo = new THREE.CylinderGeometry(0.0065, 0.0065, 0.001, 16);
  const tape = new THREE.Mesh(tapeGeo, materials.foamTape);
  tape.position.y = 0.0005;
  group.add(tape);

  // Silver metal disc casing (10mm diameter x 3mm height)
  const casingGeo = new THREE.CylinderGeometry(0.0055, 0.0055, 0.003, 24);
  const casing = new THREE.Mesh(casingGeo, materials.metalNickel);
  casing.position.y = 0.0025;
  casing.castShadow = true;
  group.add(casing);

  // Eccentric rotor indicator
  const rotorGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 0.0004, 16, 1, false, 0, Math.PI * 1.3);
  const rotorMesh = new THREE.Mesh(rotorGeo, materials.metalScrew);
  rotorMesh.position.y = 0.0042;
  group.add(rotorMesh);

  // Red and Blue lead wires
  const leadGeo = new THREE.CylinderGeometry(0.0004, 0.0004, 0.014, 8);
  const leadRed = new THREE.Mesh(leadGeo, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
  leadRed.rotation.z = Math.PI / 2;
  leadRed.position.set(-0.008, 0.002, -0.0015);
  group.add(leadRed);

  const leadBlue = new THREE.Mesh(leadGeo, new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
  leadBlue.rotation.z = Math.PI / 2;
  leadBlue.position.set(-0.008, 0.002, 0.0015);
  group.add(leadBlue);

  return { group, rotorMesh };
}

/**
 * Creates Active Buzzer seated into breadboard
 */
export function createBuzzer(): { group: THREE.Group; rippleMesh: THREE.Mesh } {
  const group = new THREE.Group();
  group.name = 'Buzzer';

  // Cylindrical black housing (12mm dia x 9.5mm height)
  const bodyGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.0095, 24);
  const body = new THREE.Mesh(bodyGeo, materials.plasticBlackIC);
  body.position.y = 0.0048;
  body.castShadow = true;
  group.add(body);

  // Center sound hole
  const holeGeo = new THREE.CylinderGeometry(0.0015, 0.0015, 0.001, 16);
  const hole = new THREE.Mesh(holeGeo, new THREE.MeshBasicMaterial({ color: 0x09090b }));
  hole.position.y = 0.0096;
  group.add(hole);

  // Acoustic ripple wave visualization ring
  const rippleGeo = new THREE.RingGeometry(0.003, 0.015, 32);
  const rippleMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
  });
  const rippleMesh = new THREE.Mesh(rippleGeo, rippleMat);
  rippleMesh.rotation.x = -Math.PI / 2;
  rippleMesh.position.y = 0.012;
  group.add(rippleMesh);

  return { group, rippleMesh };
}

/**
 * Creates Industrial 3-LED Traffic Light Breakout Module
 * Compact matte-black PCB (35mm x 15mm x 1.6mm) mounted mechanically to the right chassis frame
 * using modeled mounting bracket and M3 screws.
 * Includes SMD 0805 220Ω chip resistors, 4-pin right-angle header, and localized PointLights!
 */
export function createTrafficLEDModule(): {
  group: THREE.Group;
  greenMesh: THREE.Mesh;
  yellowMesh: THREE.Mesh;
  redMesh: THREE.Mesh;
  greenLight: THREE.PointLight;
  yellowLight: THREE.PointLight;
  redLight: THREE.PointLight;
} {
  const group = new THREE.Group();
  group.name = 'Industrial Traffic LED Breakout Module';

  // 1. Steel / Aluminum mounting bracket to right chassis frame
  const bracketGeo = new THREE.BoxGeometry(0.012, 0.024, 0.018);
  const bracket = new THREE.Mesh(bracketGeo, materials.steelChassis);
  bracket.position.set(0, -0.010, 0);
  group.add(bracket);

  // M3 socket screws securing bracket
  const m3Geo = new THREE.CylinderGeometry(0.0025, 0.0025, 0.003, 12);
  const m3Screw1 = new THREE.Mesh(m3Geo, materials.metalScrew);
  m3Screw1.position.set(0.004, -0.018, 0);
  group.add(m3Screw1);

  // 2. Matte-black PCB (35mm x 15mm x 1.6mm)
  const pcbGeo = new THREE.BoxGeometry(0.035, 0.0016, 0.015);
  const pcb = new THREE.Mesh(pcbGeo, materials.pcbBlackMatte);
  pcb.position.y = 0.0008;
  pcb.castShadow = true;
  group.add(pcb);

  // White silkscreen ring markings around LED bases
  const ringGeo = new THREE.RingGeometry(0.0026, 0.0032, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide });

  // MeshPhysicalMaterial for 5mm LED lenses
  const createLEDLens = (baseColor: number) => {
    return new THREE.MeshPhysicalMaterial({
      color: baseColor,
      roughness: 0.15,
      metalness: 0.05,
      transmission: 0.6,
      thickness: 0.005,
      ior: 1.5,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      transparent: true,
      opacity: 0.92,
    });
  };

  const ledDomeGeo = new THREE.SphereGeometry(0.0025, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2);
  const ledRimGeo = new THREE.CylinderGeometry(0.0027, 0.0027, 0.0012, 20);

  // Internal cathode anvil & post (metallic details visible inside translucent lens)
  const anvilGeo = new THREE.BoxGeometry(0.0008, 0.0015, 0.0006);
  const anvilMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 });

  // GREEN LED (at x = -0.010)
  const greenMat = createLEDLens(0x22c55e);
  const greenMesh = new THREE.Mesh(ledDomeGeo, greenMat);
  greenMesh.position.set(-0.010, 0.0020, 0);
  group.add(greenMesh);

  const greenRim = new THREE.Mesh(ledRimGeo, greenMat);
  greenRim.position.set(-0.010, 0.0014, 0);
  group.add(greenRim);

  const greenAnvil = new THREE.Mesh(anvilGeo, anvilMat);
  greenAnvil.position.set(-0.010, 0.0025, 0);
  group.add(greenAnvil);

  const ringG = new THREE.Mesh(ringGeo, ringMat);
  ringG.rotation.x = -Math.PI / 2;
  ringG.position.set(-0.010, 0.0017, 0);
  group.add(ringG);

  const greenLight = new THREE.PointLight(0x22c55e, 0.0, 0.12, 1.8);
  greenLight.position.set(-0.010, 0.006, 0);
  group.add(greenLight);

  // YELLOW LED (at x = 0.0)
  const yellowMat = createLEDLens(0xeab308);
  const yellowMesh = new THREE.Mesh(ledDomeGeo, yellowMat);
  yellowMesh.position.set(0, 0.0020, 0);
  group.add(yellowMesh);

  const yellowRim = new THREE.Mesh(ledRimGeo, yellowMat);
  yellowRim.position.set(0, 0.0014, 0);
  group.add(yellowRim);

  const yellowAnvil = new THREE.Mesh(anvilGeo, anvilMat);
  yellowAnvil.position.set(0, 0.0025, 0);
  group.add(yellowAnvil);

  const ringY = new THREE.Mesh(ringGeo, ringMat);
  ringY.rotation.x = -Math.PI / 2;
  ringY.position.set(0, 0.0017, 0);
  group.add(ringY);

  const yellowLight = new THREE.PointLight(0xeab308, 0.0, 0.12, 1.8);
  yellowLight.position.set(0, 0.006, 0);
  group.add(yellowLight);

  // RED LED (at x = 0.010)
  const redMat = createLEDLens(0xef4444);
  const redMesh = new THREE.Mesh(ledDomeGeo, redMat);
  redMesh.position.set(0.010, 0.0020, 0);
  group.add(redMesh);

  const redRim = new THREE.Mesh(ledRimGeo, redMat);
  redRim.position.set(0.010, 0.0014, 0);
  group.add(redRim);

  const redAnvil = new THREE.Mesh(anvilGeo, anvilMat);
  redAnvil.position.set(0.010, 0.0025, 0);
  group.add(redAnvil);

  const ringR = new THREE.Mesh(ringGeo, ringMat);
  ringR.rotation.x = -Math.PI / 2;
  ringR.position.set(0.010, 0.0017, 0);
  group.add(ringR);

  const redLight = new THREE.PointLight(0xef4444, 0.0, 0.12, 1.8);
  redLight.position.set(0.010, 0.006, 0);
  group.add(redLight);

  // 3. Three miniature SMD 0805 220Ω Chip Resistors (adjacent to each LED trace)
  const smdBodyGeo = new THREE.BoxGeometry(0.0020, 0.0006, 0.0012);
  const smdFilletGeo = new THREE.BoxGeometry(0.0005, 0.0007, 0.0012);

  const addSMDResistor = (x: number, z: number) => {
    const resGroup = new THREE.Group();
    const body = new THREE.Mesh(smdBodyGeo, materials.smdResistorBody);
    resGroup.add(body);

    const f1 = new THREE.Mesh(smdFilletGeo, materials.smdSolderFillet);
    f1.position.x = -0.001;
    resGroup.add(f1);

    const f2 = new THREE.Mesh(smdFilletGeo, materials.smdSolderFillet);
    f2.position.x = 0.001;
    resGroup.add(f2);

    resGroup.position.set(x, 0.0019, z);
    group.add(resGroup);
  };

  addSMDResistor(-0.010, -0.0045);
  addSMDResistor(0, -0.0045);
  addSMDResistor(0.010, -0.0045);

  // 4. 4-Pin Right-Angle Male Header (2.54mm pitch) labeled [ GND | RED | YEL | GRN ]
  const headerBaseGeo = new THREE.BoxGeometry(0.011, 0.0025, 0.0025);
  const headerBase = new THREE.Mesh(headerBaseGeo, materials.plasticBlackIC);
  headerBase.position.set(0, 0.0025, 0.0055);
  group.add(headerBase);

  const pinGeo = new THREE.BoxGeometry(0.0006, 0.0006, 0.006);
  for (let i = 0; i < 4; i++) {
    const x = -0.0038 + i * 0.00254;
    const pin = new THREE.Mesh(pinGeo, materials.metalGoldEnig);
    pin.position.set(x, 0.0025, 0.0075);
    group.add(pin);
  }

  return {
    group,
    greenMesh,
    yellowMesh,
    redMesh,
    greenLight,
    yellowLight,
    redLight,
  };
}

/**
 * Creates 5V Step-Down USB Power Supply Module
 */
export function createPowerModule(): THREE.Group {
  const group = new THREE.Group();
  group.name = '5V Power Supply';

  // Black PCB
  const pcbGeo = new THREE.BoxGeometry(0.028, 0.0014, 0.018);
  const pcb = new THREE.Mesh(pcbGeo, materials.pcbBlackMatte);
  pcb.position.y = 0.0007;
  pcb.castShadow = true;
  group.add(pcb);

  // USB Female Port
  const usbGeo = new THREE.BoxGeometry(0.0085, 0.0055, 0.0095);
  const usb = new THREE.Mesh(usbGeo, materials.metalNickel);
  usb.position.set(-0.0085, 0.0035, 0);
  group.add(usb);

  // Inductor coil
  const indGeo = new THREE.CylinderGeometry(0.0045, 0.0045, 0.004, 16);
  const ind = new THREE.Mesh(indGeo, materials.plasticBlackIC);
  ind.position.set(0.004, 0.0028, -0.002);
  group.add(ind);

  return group;
}

/**
 * Creates EV Structural Steel Ladder Frame Section
 */
export function createEVChassis(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'EV Chassis Frame';

  // Cold-rolled steel longitudinal box rails
  const railGeo = new THREE.BoxGeometry(0.024, 0.024, 0.42);

  const leftRail = new THREE.Mesh(railGeo, materials.steelChassis);
  leftRail.position.set(-0.14, 0.012, 0);
  leftRail.castShadow = true;
  leftRail.receiveShadow = true;
  group.add(leftRail);

  const rightRail = new THREE.Mesh(railGeo, materials.steelChassis);
  rightRail.position.set(0.14, 0.012, 0);
  rightRail.castShadow = true;
  rightRail.receiveShadow = true;
  group.add(rightRail);

  // Crossmembers connecting rails
  const crossGeo = new THREE.BoxGeometry(0.256, 0.020, 0.020);
  for (let i = 0; i < 4; i++) {
    const z = -0.15 + i * 0.10;
    const cross = new THREE.Mesh(crossGeo, materials.steelChassis);
    cross.position.set(0, 0.012, z);
    cross.castShadow = true;
    cross.receiveShadow = true;
    group.add(cross);
  }

  // Battery tray floor pan
  const floorGeo = new THREE.BoxGeometry(0.254, 0.003, 0.28);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.6,
    metalness: 0.6,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(0, 0.002, 0);
  floor.receiveShadow = true;
  group.add(floor);

  return group;
}

/**
 * Computes an aligned 3D Catmull-Rom spline curve for jumper wires
 * Supports ALIGNED_ORTHOGONAL (precision Manhattan wire dressing with radiused corners),
 * VALIDATED_TIGHT (direct catenary spline), and STANDARD_SLACK (realistic cable sag).
 */
/**
 * Precision Wire Path Generator
 * Supports ALIGNED_ORTHOGONAL (precision Manhattan wire dressing with radiused corners & layered bus heights),
 * VALIDATED_TIGHT (direct catenary spline), and STANDARD_SLACK (realistic cable sag).
 */
export function computeWirePath(
  start: THREE.Vector3,
  end: THREE.Vector3,
  routingMode: WireRoutingMode = 'ALIGNED_ORTHOGONAL',
  wireMeta?: { id?: string; name?: string; signalType?: string }
): THREE.CatmullRomCurve3 {
  const wireId = wireMeta?.id || '';
  const isLoadCellLead = wireId.includes('wire-lc');
  const isBridgeRibbon = wireId.includes('wire-bridge');

  // Load cell leads and bridge ribbon run low and sleek; DuPont jumper wires have 14mm boot lift
  const liftOffset = isLoadCellLead ? 0.002 : isBridgeRibbon ? 0.0035 : 0.014;
  const p1 = start.clone();
  const p4 = end.clone();
  const dist = p1.distanceTo(p4);

  if (routingMode === 'ALIGNED_ORTHOGONAL') {
    // Determine calibrated vertical routing plane (elevation) to prevent any wire collisions
    let layerY = Math.max(p1.y, p4.y) + liftOffset + 0.004;

    if (isLoadCellLead) {
      // Load cell leads run low along the ESD mat (5.5mm - 6.5mm)
      layerY = 0.0062;
    } else if (isBridgeRibbon) {
      // 4-wire Wheatstone Bridge ribbon runs flat and parallel at 7.5mm
      layerY = 0.0075;
    } else if (wireId.includes('3v3') || wireId.includes('gnd')) {
      // Main power distribution bus runs elevated at 24mm
      layerY = 0.024;
    } else if (wireId.includes('5v')) {
      layerY = 0.027;
    } else if (wireId.includes('sda') || wireId.includes('scl') || wireId.includes('mpu')) {
      // I2C bus at 19mm
      layerY = 0.019;
    } else if (wireId.includes('led')) {
      // Traffic LED harness at 17mm
      layerY = 0.017;
    } else if (wireId.includes('ds18b20')) {
      layerY = 0.015;
    } else if (wireId.includes('motor') || wireId.includes('l298n')) {
      layerY = 0.022;
    } else if (wireId.includes('buzzer')) {
      layerY = 0.013;
    }

    const pStartTop = p1.clone().add(new THREE.Vector3(0, liftOffset, 0));
    const pEndTop = p4.clone().add(new THREE.Vector3(0, liftOffset, 0));

    const dx = p4.x - p1.x;
    const dz = p4.z - p1.z;

    // 1. Collinear Along X (e.g. 4-wire Wheatstone Bridge ribbon: Combiner to HX711)
    if (Math.abs(dz) <= 0.0015) {
      const pMid1 = new THREE.Vector3(p1.x + dx * 0.33, layerY, p1.z);
      const pMid2 = new THREE.Vector3(p1.x + dx * 0.67, layerY, p4.z);
      return new THREE.CatmullRomCurve3([p1, pStartTop, pMid1, pMid2, pEndTop, p4], false, 'centripetal', 0.15);
    }

    // 2. Collinear Along Z
    if (Math.abs(dx) <= 0.0015) {
      const pMid1 = new THREE.Vector3(p1.x, layerY, p1.z + dz * 0.33);
      const pMid2 = new THREE.Vector3(p4.x, layerY, p1.z + dz * 0.67);
      return new THREE.CatmullRomCurve3([p1, pStartTop, pMid1, pMid2, pEndTop, p4], false, 'centripetal', 0.15);
    }

    // 3. Load Cell Pruned Direct Parallel Leads to Combiner Board
    if (isLoadCellLead) {
      // LC1/LC3 on left, LC2/LC4 on right
      // Clean, single-turn smooth Manhattan corner
      const turnPoint = new THREE.Vector3(p4.x, layerY, p1.z);
      const midLead1 = new THREE.Vector3(p1.x + (turnPoint.x - p1.x) * 0.5, layerY, p1.z);
      const midLead2 = new THREE.Vector3(p4.x, layerY, p1.z + (p4.z - p1.z) * 0.5);
      return new THREE.CatmullRomCurve3([p1, pStartTop, midLead1, turnPoint, midLead2, pEndTop, p4], false, 'centripetal', 0.25);
    }

    // 4. Standard Orthogonal Manhattan routing with radiused 90-degree corners
    let turn1: THREE.Vector3;
    let turn2: THREE.Vector3;

    if (Math.abs(dx) >= Math.abs(dz)) {
      const midX = p1.x + dx * 0.5;
      turn1 = new THREE.Vector3(midX, layerY, p1.z);
      turn2 = new THREE.Vector3(midX, layerY, p4.z);
    } else {
      const midZ = p1.z + dz * 0.5;
      turn1 = new THREE.Vector3(p1.x, layerY, midZ);
      turn2 = new THREE.Vector3(p4.x, layerY, midZ);
    }

    const lead1 = new THREE.Vector3().lerpVectors(pStartTop, turn1, 0.45);
    lead1.y = layerY;
    const lead2 = new THREE.Vector3().lerpVectors(turn2, pEndTop, 0.55);
    lead2.y = layerY;

    return new THREE.CatmullRomCurve3(
      [p1, pStartTop, lead1, turn1, turn2, lead2, pEndTop, p4],
      false,
      'centripetal',
      0.3
    );
  }

  if (routingMode === 'VALIDATED_TIGHT') {
    const dynamicSlack = Math.max(0.002, 0.003 + dist * 0.025);
    const p2 = p1.clone().add(new THREE.Vector3(0, liftOffset + dynamicSlack * 0.35, 0));
    const p3 = p4.clone().add(new THREE.Vector3(0, liftOffset + dynamicSlack * 0.35, 0));
    const mid = new THREE.Vector3()
      .addVectors(p1, p4)
      .multiplyScalar(0.5)
      .add(new THREE.Vector3(0, liftOffset * 0.5 + dynamicSlack, 0));
    return new THREE.CatmullRomCurve3([p1, p2, mid, p3, p4], false, 'centripetal', 0.3);
  }

  // STANDARD_SLACK (Realistic lab cable sag)
  const slackVal = 0.015 + dist * 0.12;
  const p2 = p1.clone().add(new THREE.Vector3(0, liftOffset + slackVal * 0.35, 0));
  const p3 = p4.clone().add(new THREE.Vector3(0, liftOffset + slackVal * 0.35, 0));
  const mid = new THREE.Vector3()
    .addVectors(p1, p4)
    .multiplyScalar(0.5)
    .add(new THREE.Vector3(0, liftOffset * 0.5 + slackVal, 0));
  return new THREE.CatmullRomCurve3([p1, p2, mid, p3, p4], false, 'centripetal', 0.3);
}

/**
 * Procedural Bézier / Catmull-Rom Jumper Wire Generator
 * Supports Aligned Manhattan Wire Dressing, Validated Tight Routing, or Lab Slack
 * Features 2.54mm DuPont connector boots (2.5mm × 2.5mm × 14mm) for jumper wires,
 * and low-profile soldered/crimped terminals for load cell leads.
 */
export function createRealisticJumperWire(
  start: THREE.Vector3,
  end: THREE.Vector3,
  colorHex: number,
  slack = 0.04,
  radius = 0.0014,
  routingMode: WireRoutingMode = 'ALIGNED_ORTHOGONAL',
  wireMeta?: { id?: string; name?: string; signalType?: string }
): { mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3 } {
  const wireId = wireMeta?.id || '';
  const isLoadCellLead = wireId.includes('wire-lc');
  const wireRadius = isLoadCellLead ? 0.0009 : radius;
  const liftOffset = isLoadCellLead ? 0.002 : 0.014;

  const path = computeWirePath(start, end, routingMode, wireMeta);
  const tubeGeo = new THREE.TubeGeometry(path, 48, wireRadius, 8, false);

  const wireMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.38,
    metalness: 0.08,
  });

  const mesh = new THREE.Mesh(tubeGeo, wireMat);
  mesh.castShadow = true;

  if (isLoadCellLead) {
    // For load cell pruned leads: add small metallic solder fillets / crimp ferrules at the combiner terminal
    const ferruleGeo = new THREE.CylinderGeometry(0.0011, 0.0011, 0.0018, 8);
    const ferruleMat = materials.metalScrew;
    const ferrule = new THREE.Mesh(ferruleGeo, ferruleMat);
    ferrule.position.copy(end.clone().add(new THREE.Vector3(0, 0.0009, 0)));
    mesh.add(ferrule);
  } else {
    // 2.54mm Black rectangular DuPont connector housings (2.5mm × 2.5mm × 14mm)
    const bootGeo = new THREE.BoxGeometry(0.0025, 0.014, 0.0025);

    const bootStart = new THREE.Mesh(bootGeo, materials.dupontBootBlack);
    bootStart.position.copy(start.clone().add(new THREE.Vector3(0, liftOffset * 0.5, 0)));
    mesh.add(bootStart);

    const bootEnd = new THREE.Mesh(bootGeo, materials.dupontBootBlack);
    bootEnd.position.copy(end.clone().add(new THREE.Vector3(0, liftOffset * 0.5, 0)));
    mesh.add(bootEnd);
  }

  return { mesh, curve: path };
}

/**
 * Creates a high-fidelity 3D Mechanical Axis Lock Indicator
 * Displays a metallic clamping bracket, precision brass/cyan padlock body,
 * chrome shackle, and glowing status LED indicator.
 */
export function create3DLockIcon(label = 'LOCKED', isLocked = true): THREE.Group {
  const group = new THREE.Group();
  group.name = `lock-indicator-${label}`;
  group.userData = { isLockIndicator: true, label, isLocked };

  // 1. Mechanical Standoff / Clamping Base (Machined steel clamp)
  const clampBaseGeo = new THREE.BoxGeometry(0.010, 0.002, 0.007);
  const clampBaseMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.8,
  });
  const clampBase = new THREE.Mesh(clampBaseGeo, clampBaseMat);
  clampBase.position.set(0, 0.001, 0);
  clampBase.castShadow = true;
  group.add(clampBase);

  // Tiny M2 socket head cap screws holding the clamp
  const screwGeo = new THREE.CylinderGeometry(0.0008, 0.0008, 0.001, 8);
  const screwMat = materials.metalScrew;
  const screw1 = new THREE.Mesh(screwGeo, screwMat);
  screw1.position.set(-0.0035, 0.0022, 0);
  group.add(screw1);
  const screw2 = new THREE.Mesh(screwGeo, screwMat);
  screw2.position.set(0.0035, 0.0022, 0);
  group.add(screw2);

  // 2. Padlock Body (Solid brass / cyan anodized finish)
  const bodyGeo = new THREE.BoxGeometry(0.007, 0.0065, 0.0035);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Vibrant cyan-blue mechanical anodized alloy
    roughness: 0.28,
    metalness: 0.88,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.006, 0);
  body.castShadow = true;
  group.add(body);

  // 3. Chrome Steel Shackle (Curved U-arch)
  const shackleGeo = new THREE.TorusGeometry(0.0025, 0.00065, 8, 16, Math.PI);
  const shackleMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.15,
    metalness: 0.95,
  });
  const shackle = new THREE.Mesh(shackleGeo, shackleMat);
  shackle.position.set(0, 0.00925, 0);
  shackle.castShadow = true;
  group.add(shackle);

  // Vertical legs of shackle
  const legGeo = new THREE.CylinderGeometry(0.00065, 0.00065, 0.002, 8);
  const leg1 = new THREE.Mesh(legGeo, shackleMat);
  leg1.position.set(-0.0025, 0.0088, 0);
  group.add(leg1);
  const leg2 = new THREE.Mesh(legGeo, shackleMat);
  leg2.position.set(0.0025, 0.0088, 0);
  group.add(leg2);

  // 4. Glowing Lock Status LED Dot
  const ledGeo = new THREE.CylinderGeometry(0.0009, 0.0009, 0.0004, 12);
  const ledMat = new THREE.MeshBasicMaterial({
    color: isLocked ? 0x10b981 : 0xf59e0b,
  });
  const ledMesh = new THREE.Mesh(ledGeo, ledMat);
  ledMesh.rotation.x = Math.PI / 2;
  ledMesh.position.set(0, 0.006, 0.0018);
  group.add(ledMesh);

  // 5. Soft glowing contact halo
  const glowGeo = new THREE.RingGeometry(0.004, 0.007, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(0, 0.0022, 0);
  group.add(glow);

  return group;
}

/**
 * Creates 4.7kΩ Through-hole Axial Resistor with bent copper leads
 */
export function createThroughHoleResistor(bands: number[]): THREE.Group {
  const group = new THREE.Group();

  // Ceramic body (6.5mm long, 2.4mm dia)
  const bodyGeo = new THREE.CylinderGeometry(0.0012, 0.0012, 0.0065, 12);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd4b996, roughness: 0.6 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.z = Math.PI / 2;
  body.castShadow = true;
  group.add(body);

  // Color bands
  const bandGeo = new THREE.CylinderGeometry(0.00125, 0.00125, 0.0007, 12);
  bands.forEach((color, i) => {
    const bandMat = new THREE.MeshBasicMaterial({ color });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.rotation.z = Math.PI / 2;
    band.position.set(-0.002 + i * 0.0013, 0, 0);
    group.add(band);
  });

  // Bent copper leads extending vertically downwards into breadboard holes
  const leadMat = new THREE.MeshStandardMaterial({ color: 0xc4c7cb, metalness: 0.85, roughness: 0.2 });
  const leadGeo = new THREE.CylinderGeometry(0.0003, 0.0003, 0.006, 8);

  const l1 = new THREE.Mesh(leadGeo, leadMat);
  l1.position.set(-0.0045, -0.003, 0);
  group.add(l1);

  const l2 = new THREE.Mesh(leadGeo, leadMat);
  l2.position.set(0.0045, -0.003, 0);
  group.add(l2);

  return group;
}
