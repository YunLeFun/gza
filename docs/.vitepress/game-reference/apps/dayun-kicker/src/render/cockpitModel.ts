import * as THREE from "three";
import { mergeVertices, toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { getScooterSkin } from "../game/skins";
import { createRiderBody, shoulderAnchor, solveLimb, RIDER_PROPORTIONS } from "./riderRig";
import { SCOOTER_LAYOUT } from "../config/render/rider";
import { createScooterBrakes } from "./scooterBrakes";
import { createScooterLighting } from "./scooterLights";
import { createScooterBody } from "./scooterBody";
import { createSkinAccessories } from "./skinAccessories";

// Geometry and initial pose stay reusable without importing game simulation.
export interface Cockpit {
  riderBody: THREE.Group;
  group: THREE.Group;
  camera: THREE.PerspectiveCamera;
  fillLight: THREE.PointLight;
  rimLight: THREE.PointLight;
  leftLeg: RiderLeg;
  rightLeg: RiderLeg;
  leftHand: RiderHand;
  rightHand: RiderHand;
  handlebar: THREE.Group;
  steeringAssembly: THREE.Group;
  dashboard: DashboardAssembly;
  brakes: ReturnType<typeof createScooterBrakes>;
  lights: ReturnType<typeof createScooterLighting>;
  lightLevel: number;
  sizeScale: number;
  accessories: ReturnType<typeof createSkinAccessories>;
  musicPulse: number;
  skinMaterials: {
    rubber: THREE.MeshStandardMaterial;
    graphite: THREE.MeshStandardMaterial;
    shell: THREE.MeshStandardMaterial;
    accent: THREE.MeshStandardMaterial;
    riderSkin: THREE.MeshStandardMaterial;
    riderJacket: THREE.MeshStandardMaterial;
    riderCuff: THREE.MeshStandardMaterial;
    riderTrim: THREE.MeshStandardMaterial;
    riderPants: THREE.MeshStandardMaterial;
    riderFootwear: THREE.MeshStandardMaterial;
  };
}

export interface RiderLeg {
  group: THREE.Group;
  thigh: THREE.Mesh;
  shin: THREE.Mesh;
  knee: THREE.Mesh;
  shoe: THREE.Group;
}

export interface RiderHand {
  group: THREE.Group;
  wrist: THREE.Group;
  pose: THREE.Group;
  skinMesh: THREE.Mesh;
  forearm: THREE.Mesh;
  sleeve: THREE.Mesh;
  viewSleeve: THREE.Mesh;
  sleeveHem: THREE.Mesh;
  cuff: THREE.Mesh;
  sleeveAnchor: THREE.Object3D;
  sleeveJoin: THREE.Object3D;
  side: -1 | 1;
}

interface DashboardAssembly {
  root: THREE.Group;
  update: (state: DashboardRenderState) => void;
}

interface DashboardRenderState {
  speedKmh: number;
  energy: number;
  mode: string;
}

const HANDLEBAR_Y = SCOOTER_LAYOUT.gripY;

const HANDLEBAR_Z = SCOOTER_LAYOUT.gripZ;

const GRIP_CENTER_X = SCOOTER_LAYOUT.gripX;

const GRIP_LENGTH = SCOOTER_LAYOUT.gripLength;

const GRIP_RADIUS = SCOOTER_LAYOUT.gripRadius;

export function createCockpit(camera: THREE.PerspectiveCamera): Cockpit {
  const group = new THREE.Group();
  camera.add(group);
  camera.layers.enable(1);
  const factoryPalette = getScooterSkin("stock").palette;

  const rubber = new THREE.MeshStandardMaterial({
    color: factoryPalette.rubber,
    roughness: 0.92,
    metalness: 0.02,
    flatShading: false,
  });
  const graphite = new THREE.MeshStandardMaterial({
    color: factoryPalette.graphite,
    emissive: "#090d0f",
    emissiveIntensity: 0.16,
    roughness: 0.58,
    metalness: 0.16,
    flatShading: false,
  });
  const matteBlack = new THREE.MeshStandardMaterial({
    color: "#0b0f11",
    emissive: "#040607",
    emissiveIntensity: 0.12,
    roughness: 0.78,
    flatShading: false,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: "#cfd3ce",
    metalness: 0.48,
    roughness: 0.3,
    flatShading: false,
  });
  const shell = new THREE.MeshStandardMaterial({
    color: factoryPalette.shell,
    metalness: 0.05,
    roughness: 0.28,
    flatShading: false,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: factoryPalette.accent,
    emissive: factoryPalette.emissive,
    emissiveIntensity: 0.38,
    metalness: 0.12,
    roughness: 0.48,
    flatShading: false,
  });
  const amber = new THREE.MeshStandardMaterial({
    color: "#ffd447",
    emissive: "#ff9f1a",
    emissiveIntensity: 0.8,
    roughness: 0.26,
  });
  const tire = new THREE.MeshStandardMaterial({
    color: "#242a2c",
    emissive: "#07090a",
    emissiveIntensity: 0.12,
    roughness: 0.92,
  });

  const handlebar = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.027, GRIP_CENTER_X * 2 + 0.04, 12), graphite);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, HANDLEBAR_Y, HANDLEBAR_Z);
  handlebar.add(bar);

  [-GRIP_CENTER_X, GRIP_CENTER_X].forEach((x) => {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(GRIP_RADIUS, GRIP_RADIUS, GRIP_LENGTH, 12), rubber);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(x, HANDLEBAR_Y, HANDLEBAR_Z);
    handlebar.add(grip);

    // Keep the grip stop on the dashboard side. The wrist cuff occupies the
    // outside edge, so placing another cap there causes visible z-fighting.
    const gripStop = new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.053, 0.024, 12), graphite);
    gripStop.rotation.z = Math.PI / 2;
    gripStop.position.set(x - Math.sign(x) * (GRIP_LENGTH / 2 + 0.015), HANDLEBAR_Y, HANDLEBAR_Z);
    handlebar.add(gripStop);
  });

  const dashboard = createDashboardAssembly(shell, matteBlack, accent);
  handlebar.add(dashboard.root);

  group.add(handlebar);

  const riderSkin = createRiderMaterial("#d39169", "#32170e", 0.1, 0.88, false);
  const defaults = factoryPalette.rider;
  const riderJacket = createRiderMaterial(defaults.jacket, "#07131d", 0.16, 0.94);
  const riderCuff = createRiderMaterial(defaults.cuff, "#050d11", 0.12, 0.96);
  const riderTrim = createRiderMaterial(defaults.trim ?? defaults.jacket, defaults.trimEmissive ?? factoryPalette.emissive, 0.16, 0.72);
  const handMaterials = {
    skin: riderSkin,
    sleeve: riderJacket,
    cuff: riderCuff,
    trim: riderTrim,
  };
  const leftHand = createRiderHand(-1, handMaterials);
  const rightHand = createRiderHand(1, handMaterials);
  group.add(leftHand.group, rightHand.group);

  // Camera-local lights lift the first-person model without flattening the
  // distant environment. Their short range keeps the effect cockpit-only.
  const cockpitFill = new THREE.PointLight("#d9edff", 1.4, 1.6, 2);
  cockpitFill.position.set(0, 0.42, 0.12);
  const cockpitRim = new THREE.PointLight("#79e7df", 0.18, 1.1, 2);
  cockpitRim.position.set(0, -0.08, -0.34);
  cockpitFill.layers.set(1);
  cockpitRim.layers.set(1);
  group.add(cockpitFill, cockpitRim);

  const steeringAssembly = new THREE.Group();
  steeringAssembly.name = "front-steering-assembly";
  steeringAssembly.position.set(0, HANDLEBAR_Y, HANDLEBAR_Z);
  group.add(steeringAssembly);

  // The front assembly uses one axle anchor so the fork, hub and tire cannot
  // drift apart when proportions change. Coordinates here are camera-local.
  const axle = new THREE.Vector3(0, SCOOTER_LAYOUT.axleY, SCOOTER_LAYOUT.frontAxleZ);
  const addFrontPart = (name: string, geometry: THREE.BufferGeometry,
    material: THREE.MeshStandardMaterial, position: THREE.Vector3) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.copy(position).sub(steeringAssembly.position);
    steeringAssembly.add(mesh);
    return mesh;
  };

  const stem = addFrontPart("steering-stem",
    new THREE.CylinderGeometry(0.04, 0.052, 1, 10), graphite, new THREE.Vector3());
  placeLimbSegment(stem,
    new THREE.Vector3(0, HANDLEBAR_Y, HANDLEBAR_Z).sub(steeringAssembly.position),
    new THREE.Vector3(0, -0.62, -0.74).sub(steeringAssembly.position), 1);

  // A tapered step-through apron gives the scooter a readable body silhouette.
  // Keep its top below the display and its lower half between the rider's legs.
  const apronShape = new THREE.Shape();
  apronShape.moveTo(-0.11, -0.28);
  apronShape.lineTo(0.11, -0.28);
  apronShape.quadraticCurveTo(0.13, -0.13, 0.25, 0.06);
  apronShape.quadraticCurveTo(0.29, 0.14, 0.24, 0.25);
  apronShape.quadraticCurveTo(0, 0.3, -0.24, 0.25);
  apronShape.quadraticCurveTo(-0.29, 0.14, -0.25, 0.06);
  apronShape.quadraticCurveTo(-0.13, -0.13, -0.11, -0.28);
  apronShape.closePath();
  const apronGeometry = new THREE.ExtrudeGeometry(apronShape, {
    depth: 0.08, steps: 1, curveSegments: 5, bevelEnabled: true,
    bevelThickness: 0.015, bevelSize: 0.018, bevelSegments: 2,
  });
  addFrontPart("front-apron", smoothExtrusion(apronGeometry), shell, new THREE.Vector3(0, -0.65, -0.77));
  addFrontPart("front-apron-inset",
    new RoundedBoxGeometry(0.18, 0.23, 0.022, 2, 0.01), graphite,
    new THREE.Vector3(0, -0.62, -0.665));
  addFrontPart("front-apron-trim",
    new RoundedBoxGeometry(0.035, 0.13, 0.012, 1, 0.006), accent,
    new THREE.Vector3(0, -0.62, -0.645));

  addFrontPart("front-headlight-bezel",
    new RoundedBoxGeometry(0.35, 0.115, 0.052, 2, 0.024), graphite,
    new THREE.Vector3(0, -0.48, -0.792));
  const headlight = addFrontPart("front-headlight",
    new RoundedBoxGeometry(0.29, 0.064, 0.02, 2, 0.009), amber,
    new THREE.Vector3(0, SCOOTER_LAYOUT.headlightY, SCOOTER_LAYOUT.headlightZ));
  headlight.rotation.x = -0.1;

  const forkGeometry = new THREE.CylinderGeometry(0.021, 0.025, 1, 10);
  [-0.085, 0.085].forEach((x) => {
    const forkArm = addFrontPart(x < 0 ? "left-front-fork" : "right-front-fork",
      forkGeometry, metal, new THREE.Vector3());
    placeLimbSegment(forkArm,
      new THREE.Vector3(x, -0.55, -0.73).sub(steeringAssembly.position),
      axle.clone().setX(x).sub(steeringAssembly.position), 1);
  });

  const frontWheel = addFrontPart("front-wheel",
    new THREE.TorusGeometry(0.19, 0.047, 12, 28), tire, axle);
  frontWheel.rotation.y = Math.PI / 2;
  const rim = addFrontPart("front-wheel-rim",
    new THREE.CylinderGeometry(0.153, 0.153, 0.046, 12), graphite, axle);
  rim.rotation.z = Math.PI / 2;
  const wheelHub = addFrontPart("front-wheel-hub",
    new THREE.CylinderGeometry(0.063, 0.063, 0.19, 12), metal, axle);
  wheelHub.rotation.z = Math.PI / 2;

  // An actual arch follows the tire, with clearance across the entire tread.
  const fenderShape = new THREE.Shape();
  fenderShape.absarc(0, 0, 0.27, 0, Math.PI * 0.62, false);
  fenderShape.absarc(0, 0, 0.25, Math.PI * 0.62, 0, true);
  fenderShape.closePath();
  const fenderGeometry = new THREE.ExtrudeGeometry(fenderShape, {
    depth: 0.12, steps: 1, bevelEnabled: false, curveSegments: 10,
  });
  fenderGeometry.translate(0, 0, -0.06);
  const frontFender = addFrontPart("front-fender", fenderGeometry, accent, axle);
  frontFender.rotation.y = Math.PI / 2;

  // Side tabs bridge the tread cover to the fork without crossing the tire.
  for (const side of [-1, 1]) {
    const mount = addFrontPart(`${side < 0 ? "left" : "right"}-front-fender-mount`,
      new RoundedBoxGeometry(0.046, 0.045, 0.075, 1, 0.006), metal,
      new THREE.Vector3(side * 0.074, axle.y + 0.242, axle.z + 0.084));
    mount.rotation.x = -0.4;
  }

  const deck = new THREE.Mesh(new RoundedBoxGeometry(SCOOTER_LAYOUT.deckWidth, 0.1, SCOOTER_LAYOUT.deckLength, 2, 0.035), shell);
  deck.name = "scooter-deck";
  deck.position.set(0, -1.08, SCOOTER_LAYOUT.deckZ);
  group.add(deck);

  // The fixed chassis rises from the deck into the steering bearing. Only
  // the fork assembly turns; attaching this bridge to it would tear the deck.
  const frameStart = new THREE.Vector3(0, -1.065, -0.64);
  const frameEnd = new THREE.Vector3(0, -0.63, -0.685);
  const frameBridge = new THREE.Mesh(new RoundedBoxGeometry(0.22, 1, 0.17, 2, 0.025), shell);
  frameBridge.name = "deck-front-frame";
  placeLimbSegment(frameBridge, frameStart, frameEnd, 1);
  group.add(frameBridge);
  const steeringBearing = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.15, 16), graphite);
  steeringBearing.name = "steering-bearing";
  steeringBearing.position.copy(frameEnd);
  steeringBearing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0.48, 0.24).normalize());
  group.add(steeringBearing);

  const deckPad = new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.025, 0.59, 2, 0.012), rubber);
  deckPad.name = "scooter-deck-pad";
  deckPad.position.set(0, -1.018, SCOOTER_LAYOUT.deckZ);
  group.add(deckPad);

  const railGeometry = new RoundedBoxGeometry(0.024, 0.028, 0.55, 1, 0.01);
  [-0.355, 0.355].forEach((x) => {
    const sideRail = new THREE.Mesh(railGeometry, accent);
    sideRail.name = x < 0 ? "left-deck-trim" : "right-deck-trim";
    sideRail.position.set(x, -1.024, SCOOTER_LAYOUT.deckZ);
    group.add(sideRail);
  });

  const riderPants = createRiderMaterial(defaults.pants, "#050d11", 0.1, 0.9);
  const riderFootwear = createRiderMaterial(defaults.footwear, "#151b1b", 0.06, 0.62);
  const legMaterials = {
    pants: riderPants,
    seam: riderTrim,
    shoeUpper: riderFootwear,
    shoeTrim: riderTrim,
    sole: rubber,
  };
  const leftLeg = createRiderLeg(-1, legMaterials);
  const rightLeg = createRiderLeg(1, legMaterials);
  group.add(leftLeg.group, rightLeg.group);
  const riderBody = createRiderBody(riderJacket, riderPants, riderSkin, riderTrim);
  group.add(riderBody);
  const exterior = createScooterBody(shell, accent, rubber, metal);
  group.add(exterior);
  const accessories = createSkinAccessories(group, riderBody, steeringAssembly);
  const brakes = createScooterBrakes(group, handlebar, steeringAssembly, metal, graphite, matteBlack);
  const tailLight = exterior.getObjectByName("rear-tail-light") as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  const lights = createScooterLighting(headlight, tailLight);

  // Render the camera-attached model in its own depth pass. World geometry
  // must not cut away the footboard when the miniature camera nears the road.
  group.traverse((object) => {
    if (object instanceof THREE.Mesh && object.layers.mask !== 4) {
      object.layers.set(1);
    }
  });

  // Keep anatomical upper arms for exterior views. The first-person sleeves
  // continue below the lens, including when mini mode exposes the elbows.
  leftHand.sleeve.layers.set(2);
  rightHand.sleeve.layers.set(2);
  syncRiderHand(leftHand, handlebar);
  syncRiderHand(rightHand, handlebar);

  return {
    group,
    camera,
    riderBody,
    fillLight: cockpitFill,
    rimLight: cockpitRim,
    leftLeg,
    rightLeg,
    leftHand,
    rightHand,
    handlebar,
    steeringAssembly,
    dashboard,
    brakes,
    lights,
    lightLevel: 0,
    sizeScale: 1,
    accessories,
    musicPulse: 0,
    skinMaterials: {
      rubber,
      graphite,
      shell,
      accent,
      riderSkin,
      riderJacket,
      riderCuff,
      riderTrim,
      riderPants,
      riderFootwear,
    },
  };
}

function createRiderMaterial(
  color: THREE.ColorRepresentation,
  emissive: THREE.ColorRepresentation,
  emissiveIntensity: number,
  roughness: number,
  flatShading = false,
) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    roughness,
    flatShading,
  });
}

function createDashboardAssembly(
  housingMaterial: THREE.MeshStandardMaterial,
  bezelMaterial: THREE.MeshStandardMaterial,
  indicatorMaterial: THREE.MeshStandardMaterial,
): DashboardAssembly {
  const dashboard = createDashboardTexture();
  drawDashboard(dashboard.context, 0, 100, "巡航");
  dashboard.texture.needsUpdate = true;

  const root = new THREE.Group();
  root.name = "dashboard-root";
  root.position.set(0, SCOOTER_LAYOUT.dashboardY, SCOOTER_LAYOUT.dashboardZ);
  root.scale.setScalar(SCOOTER_LAYOUT.dashboardScale);
  root.rotation.x = -0.16;

  const housing = new THREE.Mesh(
    new RoundedBoxGeometry(0.87, 0.4, 0.1, 2, 0.035),
    housingMaterial,
  );
  housing.name = "dashboard-housing";

  const displayAssembly = new THREE.Group();
  displayAssembly.name = "dashboard-display-assembly";
  displayAssembly.position.z = 0.051;

  const bezel = new THREE.Mesh(
    createRoundedRectRingGeometry({
      outerWidth: 0.78,
      outerHeight: 0.35,
      outerRadius: 0.032,
      innerWidth: 0.72,
      innerHeight: 0.32,
      innerRadius: 0.026,
      depth: 0.012,
    }),
    bezelMaterial,
  );
  bezel.name = "dashboard-bezel";

  const screenMaterial = new THREE.MeshBasicMaterial({
    map: dashboard.texture,
    toneMapped: false,
    transparent: true,
    alphaTest: 0.08,
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.32), screenMaterial);
  screen.name = "dashboard-screen";
  screen.position.z = 0.013;
  displayAssembly.add(bezel, screen);

  const indicator = new THREE.Mesh(
    new RoundedBoxGeometry(0.38, 0.01, 0.012, 1, 0.005),
    indicatorMaterial,
  );
  indicator.name = "dashboard-indicator";
  indicator.position.set(0, -0.188, 0.057);

  root.add(housing, displayAssembly, indicator);

  let dashboardKey = "0:100:巡航";
  return {
    root,
    update: ({ speedKmh, energy, mode }) => {
      root.position.set(0, SCOOTER_LAYOUT.dashboardY, SCOOTER_LAYOUT.dashboardZ);
      root.scale.setScalar(SCOOTER_LAYOUT.dashboardScale);

      const nextKey = `${speedKmh}:${energy}:${mode}`;
      if (dashboardKey === nextKey) {
        return;
      }
      drawDashboard(dashboard.context, speedKmh, energy, mode);
      dashboard.texture.needsUpdate = true;
      dashboardKey = nextKey;
    },
  };
}

interface RoundedRectRingOptions {
  outerWidth: number;
  outerHeight: number;
  outerRadius: number;
  innerWidth: number;
  innerHeight: number;
  innerRadius: number;
  depth: number;
}

function createRoundedRectRingGeometry(options: RoundedRectRingOptions) {
  const shape = new THREE.Shape();
  addRoundedRectContour(shape, options.outerWidth, options.outerHeight, options.outerRadius);
  const hole = new THREE.Path();
  addRoundedRectContour(hole, options.innerWidth, options.innerHeight, options.innerRadius);
  shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, {
    depth: options.depth,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 3,
  });
}

function addRoundedRectContour(
  path: THREE.Path,
  width: number,
  height: number,
  radius: number,
) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const r = Math.min(radius, halfWidth, halfHeight);
  path.moveTo(-halfWidth + r, -halfHeight);
  path.lineTo(halfWidth - r, -halfHeight);
  path.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + r);
  path.lineTo(halfWidth, halfHeight - r);
  path.quadraticCurveTo(halfWidth, halfHeight, halfWidth - r, halfHeight);
  path.lineTo(-halfWidth + r, halfHeight);
  path.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - r);
  path.lineTo(-halfWidth, -halfHeight + r);
  path.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + r, -halfHeight);
  path.closePath();
}

function createDashboardTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create dashboard canvas");
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { context, texture };
}

function drawDashboard(context: CanvasRenderingContext2D, speedKmh: number, energy: number, mode: string) {
  const { width, height } = context.canvas;
  context.clearRect(0, 0, width, height);
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#071114");
  gradient.addColorStop(0.55, "#10282c");
  gradient.addColorStop(1, "#041012");
  context.fillStyle = gradient;
  fillRoundRect(context, 0, 0, width, height, 24);

  context.strokeStyle = "rgba(65, 250, 225, 0.68)";
  context.lineWidth = 8;
  strokeRoundRect(context, 18, 18, width - 36, height - 36, 28);

  context.fillStyle = "rgba(115, 244, 255, 0.9)";
  context.font = "700 34px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.fillText(mode, 42, 58);
  context.fillStyle = "rgba(255, 212, 71, 0.95)";
  context.font = "700 24px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.fillText("KM/H", 372, 58);

  context.fillStyle = "#e8fff9";
  context.font = "900 128px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(speedKmh.toString().padStart(2, "0"), width / 2, 134);

  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = "rgba(255, 255, 255, 0.68)";
  context.font = "600 21px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.fillText("踹击能量", 42, 216);

  const barX = 202;
  const barY = 196;
  const barWidth = 250;
  context.fillStyle = "rgba(255, 255, 255, 0.14)";
  fillRoundRect(context, barX, barY, barWidth, 22, 11);
  context.fillStyle = energy > 38 ? "#41fae1" : "#ffd447";
  fillRoundRect(context, barX, barY, Math.max(16, barWidth * Math.max(0, Math.min(1, energy / 100))), 22, 11);
}

function fillRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  roundRectPath(context, x, y, width, height, radius);
  context.fill();
}

function strokeRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  roundRectPath(context, x, y, width, height, radius);
  context.stroke();
}

function roundRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function createRiderLeg(
  side: -1 | 1,
  materials: {
    pants: THREE.MeshStandardMaterial;
    seam: THREE.MeshStandardMaterial;
    shoeUpper: THREE.MeshStandardMaterial;
    shoeTrim: THREE.MeshStandardMaterial;
    sole: THREE.MeshStandardMaterial;
  },
): RiderLeg {
  const group = new THREE.Group();
  const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.55, 0.19), materials.pants);
  const shin = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.55, 0.16), materials.pants);
  const knee = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), materials.pants);
  const shoe = createRiderShoe(materials.shoeUpper, materials.shoeTrim, materials.sole);
  thigh.castShadow = true;
  shin.castShadow = true;
  knee.castShadow = true;
  group.add(thigh, shin, knee, shoe);
  return { group, thigh, shin, knee, shoe };
}

function createRiderShoe(
  upperMaterial: THREE.MeshStandardMaterial,
  trimMaterial: THREE.MeshStandardMaterial,
  soleMaterial: THREE.MeshStandardMaterial,
) {
  const group = new THREE.Group();
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.15, 0.31), upperMaterial);
  upper.name = "boot-upper";
  upper.position.set(0, 0.012, -0.085);
  const sole = new THREE.Mesh(new THREE.BoxGeometry(0.205, 0.04, 0.33), soleMaterial);
  sole.name = "boot-sole";
  sole.position.set(0, -0.08, -0.085);
  const ankle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), upperMaterial);
  ankle.name = "boot-ankle";
  ankle.position.set(0, 0.09, 0.005);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.018, 0.038), trimMaterial);
  stripe.position.set(0, 0.09, -0.15);
  group.add(upper, sole, ankle, stripe);
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
    }
  });
  return group;
}

function createRiderHand(
  side: -1 | 1,
  materials: {
    skin: THREE.MeshStandardMaterial;
    sleeve: THREE.MeshStandardMaterial;
    cuff: THREE.MeshStandardMaterial;
    trim: THREE.MeshStandardMaterial;
  },
): RiderHand {
  const group = new THREE.Group();
  const wrist = new THREE.Group();
  const pose = new THREE.Group();
  wrist.position.set(side * GRIP_CENTER_X, HANDLEBAR_Y, HANDLEBAR_Z);
  const wristAxis = getRiderWristAxis(side);
  const wristStart = new THREE.Vector3(side * 0.006, 0.052, 0.05);

  // A toy-style C grip and wrist are one closed surface, with no separate
  // finger roots or overlapping palm pieces to expose seams in first person.
  const skinMesh = new THREE.Mesh(createRiderHandSkinGeometry(wristStart, wristAxis), materials.skin);
  skinMesh.name = side < 0 ? "rider-hand-left" : "rider-hand-right";
  skinMesh.userData.assetRole = "procedural-rider-hand";
  pose.add(skinMesh);

  // Continue the jacket material through the cuff so the bright accent no
  // longer reads as a separate block between the arm and hand.
  const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.105, 0.14), materials.cuff);
  const cuffStart = wristStart.clone().addScaledVector(wristAxis, 0.075);
  const cuffEnd = wristStart.clone().addScaledVector(wristAxis, 0.18);
  placeLimbSegment(cuff, cuffStart, cuffEnd, 0.105);
  pose.add(cuff);

  // The sleeve meets the outside face of the cuff. Keeping this as an explicit
  // anchor makes the seam stable while the hand twists around the throttle.
  const sleeveAnchor = new THREE.Object3D();
  sleeveAnchor.position.copy(wristStart).addScaledVector(wristAxis, 0.162);
  pose.add(sleeveAnchor);
  wrist.add(pose);

  const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.125, 1, 0.125), materials.sleeve);
  const sleeveJoin = new THREE.Object3D();
  // Cover the sleeve end rings even where the faceted joint bends.
  const elbow = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.17, 0.17), materials.sleeve);
  elbow.name = "rider-elbow";
  sleeveJoin.add(elbow);
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.175, 1, 0.175), materials.sleeve);
  const viewSleeve = new THREE.Mesh(sleeve.geometry, materials.sleeve);
  viewSleeve.name = side < 0 ? "rider-view-sleeve-left" : "rider-view-sleeve-right";
  viewSleeve.userData.firstPersonOnly = true;
  const sleeveHem = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1, 0.13), materials.cuff);
  const cuffSeam = wrist.position.clone().add(sleeveAnchor.position);
  sleeveJoin.position.copy(cuffSeam).addScaledVector(wristAxis, 0.3);
  const sleeveOrigin = sleeveJoin.position.clone().addScaledVector(wristAxis, 0.38);
  placeLimbSegment(forearm, sleeveJoin.position, cuffSeam, 1);
  placeLimbSegment(sleeve, sleeveOrigin, sleeveJoin.position, 1);
  placeSleeveHem(sleeveHem, sleeveJoin.position, cuffSeam);
  group.add(sleeve, viewSleeve, sleeveHem, forearm, sleeveJoin, wrist);
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
    }
  });
  viewSleeve.castShadow = false;
  return {
    group,
    wrist,
    pose,
    skinMesh,
    forearm,
    sleeve,
    viewSleeve,
    sleeveHem,
    cuff,
    sleeveAnchor,
    sleeveJoin,
    side,
  };
}

function createRiderHandSkinGeometry(
  wristStart: THREE.Vector3,
  wristAxis: THREE.Vector3,
) {
  // Author the complete silhouette in the Y/Z plane, then extrude along the
  // handlebar axis. The rear wrist tab is part of the same outline as the claw.
  const innerRadius = GRIP_RADIUS + 0.014;
  const outerRadius = 0.087;
  const startAngle = -Math.PI / 2 + 0.52;
  const endAngle = Math.PI * 1.5 - 0.52;
  const outline = new THREE.Shape();
  outline.absarc(0, 0, outerRadius, startAngle, 1.95, false);
  outline.lineTo(-0.145, 0.065);
  outline.lineTo(-0.18, 0.052);
  outline.lineTo(-0.18, 0.023);
  outline.lineTo(-0.106, -0.03);
  outline.lineTo(Math.cos(3.6) * outerRadius, Math.sin(3.6) * outerRadius);
  outline.absarc(0, 0, outerRadius, 3.6, endAngle, false);
  outline.lineTo(Math.cos(endAngle) * innerRadius, Math.sin(endAngle) * innerRadius);
  outline.absarc(0, 0, innerRadius, endAngle, startAngle, true);
  outline.closePath();

  const extruded = new THREE.ExtrudeGeometry(outline, {
    depth: 0.1, steps: 1, curveSegments: 8,
    bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2,
  });
  extruded.translate(0, 0, -0.05);
  extruded.rotateY(Math.PI / 2);
  const positions = extruded.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    // Planar, tapered side walls tuck fully inside the cuff. Applying the
    // same linear taper to the whole claw avoids diagonal shading creases.
    const z = positions.getZ(i);
    const width = (0.046 - 0.13 * z) / 0.05;
    positions.setX(i, positions.getX(i) * width + wristStart.x
      + (z - wristStart.z) * wristAxis.x / wristAxis.z);
  }
  extruded.deleteAttribute("uv");
  extruded.computeVertexNormals();
  // Preserve the cap/bevel normals; smoothing every edge creates false seams
  // across the large toy-hand faces despite the surface being connected.
  const geometry = mergeVertices(smoothExtrusion(extruded, Math.PI / 4));
  extruded.dispose();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.assetContract = "procedural-toy-grip-v1";
  return geometry;
}

export function syncRiderHand(hand: RiderHand, handlebar: THREE.Group) {
  const gripCenter = new THREE.Vector3(hand.side * GRIP_CENTER_X, HANDLEBAR_Y, HANDLEBAR_Z)
    .applyQuaternion(handlebar.quaternion)
    .add(handlebar.position);
  hand.wrist.position.copy(gripCenter);
  hand.wrist.quaternion.copy(handlebar.quaternion);

  const cuffSeam = hand.sleeveAnchor.position.clone()
    .applyQuaternion(hand.pose.quaternion)
    .applyQuaternion(hand.wrist.quaternion)
    .add(gripCenter);
  const shoulder = shoulderAnchor(hand.side);
  const solved = solveLimb(shoulder, cuffSeam,
    new THREE.Vector3(hand.side * 0.78, -0.5, 0.1),
    RIDER_PROPORTIONS.upperArm, RIDER_PROPORTIONS.forearm);
  hand.sleeveJoin.position.copy(solved.joint);
  placeLimbSegment(hand.sleeve, shoulder, hand.sleeveJoin.position, 1);
  placeLimbSegment(hand.forearm, hand.sleeveJoin.position, cuffSeam, 1);
  placeSleeveHem(hand.sleeveHem, hand.sleeveJoin.position, cuffSeam);
}

function placeSleeveHem(sleeveHem: THREE.Mesh, sleeveJoin: THREE.Vector3, cuffSeam: THREE.Vector3) {
  const forearmDirection = cuffSeam.clone().sub(sleeveJoin).normalize();
  const hemStart = sleeveJoin.clone().addScaledVector(forearmDirection, -0.012);
  const hemEnd = sleeveJoin.clone().addScaledVector(forearmDirection, 0.012);
  placeLimbSegment(sleeveHem, hemStart, hemEnd, 1);
}

function getRiderWristAxis(side: -1 | 1) {
  // Elbows sit outside and below the grips; the upper arms then return
  // inward toward the shoulders. The opposite sign produces a reversed bend.
  return new THREE.Vector3(side * 0.4, -0.32, 1).normalize();
}

export function placeLimbSegment(segment: THREE.Mesh, start: THREE.Vector3, end: THREE.Vector3, baseLength = 0.55) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  segment.position.copy(start).add(end).multiplyScalar(0.5);
  segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  segment.scale.set(1, length / baseLength, 1);
}

/** Work above the normal utility's position quantization so tiny bevels keep their own vertices. */
function smoothExtrusion(geometry: THREE.ExtrudeGeometry, creaseAngle = Math.PI / 3) {
  geometry.scale(100, 100, 100);
  toCreasedNormals(geometry, creaseAngle);
  geometry.scale(0.01, 0.01, 0.01);
  return geometry;
}
