import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { TruckRole, TruckVariant } from "../game/types";
import { createWorkVehicle } from "./workVehicle";
import { createConstructionBody } from "./constructionVehicle";
import { createMunicipalBody, MUNICIPAL_BODY_COLOR } from "./municipalVehicle";
import yunleLogoUrl from "../assets/yunle-logo.svg";
import { HARBOR_COLORS as C } from "../config/render/environment";

// Shared render construction, independent of traffic simulation and physics.
export const TRUCK_WIDTH = 2.48;

export const TRUCK_HEIGHT = 2.22;

export const TRUCK_LENGTH = 5.86;

const TRUCK_VISUAL_OFFSET_Y = -(TRUCK_HEIGHT / 2 + 0.01);

const palette = [C.coral, C.ochre, C.teal, C.cream, C.navy];

const cabPalette = [C.cream, "#d7e6df", "#eed6ac", "#d7e3e7"];

let yunleLogoImage: HTMLImageElement | null = null;

let yunleLogoPromise: Promise<HTMLImageElement> | null = null;

export function createTruckMesh(id: number, direction: -1 | 1, variant: TruckVariant, role: TruckRole) {
  const group = new THREE.Group();
  group.rotation.y = direction === -1 ? 0 : Math.PI;
  const visual = new THREE.Group();
  visual.position.y = TRUCK_VISUAL_OFFSET_Y;
  group.add(visual);

  if (variant === "roller" || variant === "loader") {
    visual.add(createWorkVehicle(variant));
    if (role === "interference") addInterferenceBeacons(visual);
    return group;
  }

  const municipal = variant === "sprinkler" || variant === "sanitation";
  const color = municipal ? MUNICIPAL_BODY_COLOR : variant === "heavy" ? C.navy : palette[id % palette.length];
  const cargoMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.58, metalness: 0.04 });
  const cabMaterial = new THREE.MeshStandardMaterial({
    color: municipal ? MUNICIPAL_BODY_COLOR
      : variant === "heavy" ? C.coral : cabPalette[Math.floor(id / palette.length) % cabPalette.length],
    roughness: 0.3,
    metalness: 0.06,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: "#16191a", roughness: 0.82 });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: "#7ed6ff",
    roughness: 0.18,
    metalness: 0.02,
    transparent: true,
    opacity: 0.72,
  });
  const chromeMaterial = new THREE.MeshStandardMaterial({ color: "#d6d2c6", roughness: 0.24, metalness: 0.85 });
  addVariantBody(visual, variant, cargoMaterial, darkMaterial, chromeMaterial);

  const cab = new THREE.Mesh(new RoundedBoxGeometry(TRUCK_WIDTH * 0.96, 1.52, 1.65, 1, 0.085), cabMaterial);
  cab.position.set(0, 1.03, -2.08);
  cab.castShadow = true;
  cab.receiveShadow = true;
  visual.add(cab);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(TRUCK_WIDTH * 0.68, 0.48, 0.04), glassMaterial);
  windshield.position.set(0, 1.48, -2.93);
  windshield.rotation.x = -0.12;
  visual.add(windshield);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(TRUCK_WIDTH * 0.92, 0.28, 0.18), chromeMaterial);
  bumper.position.set(0, 0.48, -2.96);
  visual.add(bumper);

  const headlightGeometry = new THREE.BoxGeometry(0.34, 0.18, 0.05);
  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: "#fff3ae",
    emissive: "#ffd447",
    emissiveIntensity: 0.9,
  });
  [-0.62, 0.62].forEach((x) => {
    const light = new THREE.Mesh(headlightGeometry, headlightMaterial);
    light.position.set(x, 0.72, -3.07);
    visual.add(light);
  });

  addCabDetails(visual, glassMaterial, darkMaterial, chromeMaterial, cabMaterial);
  addRearDetails(visual, darkMaterial, chromeMaterial);
  if (variant === "heavy") {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.34, 1.22), cabMaterial);
    roof.name = "heavy-roof-fairing";
    roof.position.set(0, 1.94, -1.98);
    visual.add(roof);
    for (const side of [-1, 1]) {
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 1.55, 8), chromeMaterial);
      exhaust.position.set(side * 1.15, 1.25, -1.16);
      visual.add(exhaust);
    }
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.55, 0.06), darkMaterial);
    grille.position.set(0, 0.95, -2.96);
    visual.add(grille);
  }

  // City-service trucks carry their own livery instead of the Dayun freight label.
  if (!municipal) addDayunLabels(visual, variant, color);

  if (role === "interference") {
    addInterferenceBeacons(visual);
  }

  const wheelGeometry = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 18);
  const hubGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.36, 16);
  [-1, 1].forEach((side) => {
    (variant === "heavy" ? [-2.2, -0.72, 0.8, 2.18] : [-2.2, -0.1, 2.18]).forEach((z) => {
      const wheel = new THREE.Mesh(wheelGeometry, darkMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 1.32, 0.43, z);
      wheel.castShadow = true;
      visual.add(wheel);

      const hub = new THREE.Mesh(hubGeometry, chromeMaterial);
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(wheel.position);
      visual.add(hub);
    });
  });

  return group;
}

function addCabDetails(
  visual: THREE.Group,
  glassMaterial: THREE.MeshStandardMaterial,
  darkMaterial: THREE.MeshStandardMaterial,
  chromeMaterial: THREE.MeshStandardMaterial,
  cabMaterial: THREE.MeshStandardMaterial,
) {
  const visor = new THREE.Mesh(new THREE.BoxGeometry(TRUCK_WIDTH * 0.86, 0.12, 0.34), cabMaterial);
  visor.position.set(0, 1.82, -2.79);
  visor.rotation.x = -0.08;
  visor.castShadow = true;
  visual.add(visor);

  const windshieldDivider = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.5, 0.052), darkMaterial);
  windshieldDivider.position.set(0, 1.48, -2.965);
  windshieldDivider.rotation.x = -0.12;
  visual.add(windshieldDivider);

  for (const side of [-1, 1]) {
    const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.46, 0.7), glassMaterial);
    sideWindow.position.set(side * (TRUCK_WIDTH * 0.485), 1.45, -2.25);
    visual.add(sideWindow);

    const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.035), chromeMaterial);
    mirrorArm.position.set(side * 1.31, 1.55, -2.64);
    visual.add(mirrorArm);

    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.23), darkMaterial);
    mirror.position.set(side * 1.44, 1.51, -2.64);
    mirror.castShadow = true;
    visual.add(mirror);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.045, 0.28), chromeMaterial);
    handle.position.set(side * (TRUCK_WIDTH * 0.493), 1.14, -2.04);
    visual.add(handle);
  }

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.38, 0.06), darkMaterial);
  grille.position.set(0, 0.98, -3.075);
  visual.add(grille);
  for (let y = 0.84; y <= 1.12; y += 0.095) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.022, 0.028), chromeMaterial);
    slat.position.set(0, y, -3.115);
    visual.add(slat);
  }
}

function addRearDetails(
  visual: THREE.Group,
  darkMaterial: THREE.MeshStandardMaterial,
  chromeMaterial: THREE.MeshStandardMaterial,
) {
  const rearBar = new THREE.Mesh(new THREE.BoxGeometry(TRUCK_WIDTH * 0.88, 0.18, 0.16), chromeMaterial);
  rearBar.position.set(0, 0.48, 2.96);
  visual.add(rearBar);

  const tailLightMaterial = new THREE.MeshStandardMaterial({
    color: "#ff3d35",
    emissive: "#c10e09",
    emissiveIntensity: 1.2,
    roughness: 0.3,
    toneMapped: false,
  });
  for (const x of [-0.76, 0.76]) {
    const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.06), tailLightMaterial);
    tailLight.position.set(x, 0.68, 3.055);
    visual.add(tailLight);
  }

  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.2, 0.035), darkMaterial);
  plate.position.set(0, 0.68, 3.075);
  visual.add(plate);
}

function addVariantBody(
  visual: THREE.Group,
  variant: TruckVariant,
  cargoMaterial: THREE.MeshStandardMaterial,
  darkMaterial: THREE.MeshStandardMaterial,
  chromeMaterial: THREE.MeshStandardMaterial,
) {
  if (variant === "crane" || variant === "excavator") {
    visual.add(createConstructionBody(variant, darkMaterial, chromeMaterial));
    return;
  }
  if (variant === "sprinkler" || variant === "sanitation") {
    visual.add(createMunicipalBody(variant, cargoMaterial, darkMaterial, chromeMaterial));
    return;
  }
  if (variant === "tanker") {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(TRUCK_WIDTH * 0.94, 0.25, 4.25), darkMaterial);
    chassis.position.set(0, 0.52, 0.78);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 3.72, 20), cargoMaterial);
    tank.rotation.x = Math.PI / 2;
    tank.position.set(0, 1.38, 0.78);
    tank.castShadow = true;
    tank.receiveShadow = true;
    visual.add(chassis, tank);
    for (const z of [-0.35, 1.9]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.055, 8, 24), chromeMaterial);
      band.position.set(0, 1.38, z);
      visual.add(band);
    }
    return;
  }

  if (variant === "flatbed") {
    const platform = new THREE.Mesh(new THREE.BoxGeometry(TRUCK_WIDTH, 0.24, 4.15), cargoMaterial);
    platform.position.set(0, 0.66, 0.78);
    platform.castShadow = true;
    platform.receiveShadow = true;
    visual.add(platform);
    const crateGeometry = new THREE.BoxGeometry(1.02, 0.92, 1.05);
    for (const [x, z, height] of [[-0.58, 0, 1], [0.58, 0.1, 1.16], [0, 1.32, 0.88]] as const) {
      const crate = new THREE.Mesh(crateGeometry, cargoMaterial);
      crate.position.set(x, 0.72 + height * 0.46, z);
      crate.scale.y = height;
      crate.castShadow = true;
      visual.add(crate);
    }
    return;
  }

  if (variant === "dump") {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(TRUCK_WIDTH * 0.94, 0.24, 4.12), darkMaterial);
    chassis.position.set(0, 0.53, 0.78);
    const bed = new THREE.Group();
    bed.position.set(0, 0.7, 0.8);
    bed.rotation.x = -0.045;

    const floor = new THREE.Mesh(new THREE.BoxGeometry(TRUCK_WIDTH * 0.92, 0.2, 3.65), cargoMaterial);
    floor.position.y = 0.08;
    floor.castShadow = true;
    floor.receiveShadow = true;
    bed.add(floor);

    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.92, 3.55), cargoMaterial);
      panel.position.set(side * (TRUCK_WIDTH * 0.43), 0.52, 0);
      panel.castShadow = true;
      bed.add(panel);
      for (const z of [-1.2, 0, 1.2]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.02, 0.1), chromeMaterial);
        rib.position.set(side * (TRUCK_WIDTH * 0.48), 0.5, z);
        bed.add(rib);
      }
    }

    for (const z of [-1.74, 1.74]) {
      const gate = new THREE.Mesh(new THREE.BoxGeometry(TRUCK_WIDTH * 0.92, 0.92, 0.16), cargoMaterial);
      gate.position.set(0, 0.52, z);
      gate.castShadow = true;
      bed.add(gate);
    }
    visual.add(chassis, bed);
    return;
  }

  if (variant === "mixer") {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(TRUCK_WIDTH * 0.94, 0.24, 4.2), darkMaterial);
    chassis.position.set(0, 0.53, 0.78);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.02, 2.85, 20), cargoMaterial);
    drum.rotation.x = Math.PI / 2;
    drum.rotation.z = 0.08;
    drum.position.set(0, 1.38, 0.72);
    drum.castShadow = true;
    drum.receiveShadow = true;
    visual.add(chassis, drum);

    for (const z of [-0.15, 1.34]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(z < 0 ? 0.78 : 0.96, 0.055, 8, 24), chromeMaterial);
      band.position.set(0, 1.38, z);
      visual.add(band);
    }

    const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.25, 0.62, 12), chromeMaterial);
    hopper.rotation.x = Math.PI / 2;
    hopper.position.set(0, 1.28, 2.34);
    visual.add(hopper);
    const chute = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 1.05), chromeMaterial);
    chute.position.set(0, 0.78, 2.54);
    chute.rotation.x = -0.42;
    visual.add(chute);
    return;
  }

  const cargo = new THREE.Mesh(new RoundedBoxGeometry(TRUCK_WIDTH, 1.74, 3.65, 1, 0.045), cargoMaterial);
  cargo.position.set(0, 1.23, 0.78);
  cargo.castShadow = true;
  cargo.receiveShadow = true;
  visual.add(cargo);
}

function addDayunLabels(visual: THREE.Group, variant: TruckVariant, color: string) {
  const labelMaterial = new THREE.MeshBasicMaterial({
    map: createDayunTexture(color),
    transparent: true,
    depthWrite: false,
  });
  const construction = variant === "crane" || variant === "excavator";
  const lowBody = variant === "flatbed" || variant === "dump" || construction;
  const labelY = construction ? 0.66 : lowBody ? 0.94 : 1.42;
  const labelHeight = construction ? 0.2 : lowBody ? 0.54 : variant === "mixer" ? 0.62 : 0.8;
  [-1, 1].forEach((side) => {
    const label = new THREE.Mesh(new THREE.PlaneGeometry(2.85, labelHeight), labelMaterial);
    label.position.set(side * (TRUCK_WIDTH / 2 + 0.012), labelY, 0.78);
    label.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    visual.add(label);
  });
}

function addInterferenceBeacons(visual: THREE.Group) {
  const beaconMaterial = new THREE.MeshStandardMaterial({
    color: "#ffd447",
    emissive: "#ff6b1a",
    emissiveIntensity: 2.2,
    toneMapped: false,
  });
  for (const x of [-0.62, 0.62]) {
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.2, 10), beaconMaterial);
    beacon.position.set(x, 2.16, -2.08);
    visual.add(beacon);
  }
}

function createDayunTexture(baseColor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const redraw = (logo?: CanvasImageSource) => {
    if (texture.userData.disposed) {
      return;
    }
    drawDayunTexture(context, canvas, baseColor, logo);
    texture.needsUpdate = true;
  };

  redraw(yunleLogoImage ?? undefined);
  void loadYunleLogo()
    .then((logo) => redraw(logo))
    .catch(() => redraw());

  return texture;
}

function drawDayunTexture(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  baseColor: string,
  logo?: CanvasImageSource,
) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(232,223,196,0.95)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = baseColor;
  context.fillRect(0, 0, 20, canvas.height);
  context.fillRect(canvas.width - 20, 0, 20, canvas.height);

  context.fillStyle = "rgba(19, 23, 25, 0.08)";
  context.fillRect(34, 24, 126, 88);
  if (logo) {
    context.drawImage(logo, 46, 28, 102, 72);
  } else {
    drawYunleLogoFallback(context, 46, 28, 102, 72);
  }

  context.fillStyle = C.navy;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.font = "900 46px system-ui, sans-serif";
  context.fillText("大云汽车", 184, 58);
  context.font = "800 28px system-ui, sans-serif";
  context.fillText("YUNLE MOTOR", 186, 96);

  context.fillStyle = C.teal;
  context.fillRect(184, 118, 170, 13);
  context.fillStyle = C.coral;
  context.fillRect(366, 118, 74, 13);
}

function drawYunleLogoFallback(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  context.save();
  context.translate(x, y);
  context.scale(width / 100, height / 70);
  context.fillStyle = "#131719";
  context.fill(new Path2D("M44 35L27.5 44.5263V25.4737L44 35Z"));
  context.fill(
    new Path2D(
      "M74 35C74 39.9706 69.9706 44 65 44C60.0294 44 56 39.9706 56 35C56 30.0294 60.0294 26 65 26C69.9706 26 74 30.0294 74 35Z",
    ),
  );
  context.fill(
    new Path2D("M85 0H15V15H0V55H15V70H85V55H100V15H85V0ZM85 15H15V55H85V15Z"),
  );
  context.restore();
}

function loadYunleLogo() {
  if (yunleLogoImage) {
    return Promise.resolve(yunleLogoImage);
  }

  yunleLogoPromise ??= new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      yunleLogoImage = image;
      resolve(image);
    };
    image.onerror = () => reject(new Error("Failed to load YunLeFun logo"));
    image.src = yunleLogoUrl;
  });

  return yunleLogoPromise;
}
