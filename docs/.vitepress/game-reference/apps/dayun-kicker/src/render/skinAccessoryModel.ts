import * as THREE from "three";
import { getScooterSkin, type ScooterSkinPalette, type ScooterSkinTheme } from "../game/skins";
import { SCOOTER_LAYOUT } from "../config/render/rider";
import { batchStaticModel } from "./staticBatch";
import { getCargoLabelInk } from "./scooterBody";

/** Built once per rider. Equipping only changes visibility/materials, never geometry. */
export function createSkinAccessoryModel(root: THREE.Group, steering: THREE.Group) {
  const groups = new Map<ScooterSkinTheme, THREE.Group>();
  const front = new THREE.Group();
  front.name = "guihuo-front-lights";
  const cockpitLeds = new THREE.Group();
  cockpitLeds.name = "guihuo-dashboard-lights";
  const blueApron = new THREE.Group();
  blueApron.name = "blue-memory-apron-decoration";
  const wheels: THREE.Mesh[] = [];
  const cones: THREE.Mesh[] = [];
  const leds: THREE.MeshBasicMaterial[] = [];
  const cargoShells = new Map<THREE.MeshStandardMaterial, string>();
  const cargoBadges: { material: THREE.MeshStandardMaterial; canvas: HTMLCanvasElement; title: string;
    subtitle: string; background: string; ink: string; currentBackground: string }[] = [];
  let active: ScooterSkinTheme | undefined;
  const paint = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
  const yellow = paint("#ffcf24"), black = paint("#202329"), white = paint("#fff4e8");
  const pink = paint("#ff47a9"), purple = paint("#982cff");
  const neon = (color: string) => {
    const material = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    leds.push(material);
    return material;
  };
  const box = (parent: THREE.Group, name: string, size: [number, number, number],
    position: [number, number, number], material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name; mesh.position.set(...position); parent.add(mesh); return mesh;
  };
  const badge = (parent: THREE.Group, name: string, title: string, subtitle: string,
    background: string, ink: string, size: [number, number], position: [number, number, number], back = false) => {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 256;
    drawBadge(canvas, title, subtitle, background, ink);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
    if (name.endsWith("-box-top")) {
      material.name = `${parent.name}-cargo-brand`;
      cargoBadges.push({ material, canvas, title, subtitle, background, ink, currentBackground: background });
    }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), material);
    mesh.name = name; mesh.position.set(...position); if (!back) mesh.rotation.y = Math.PI;
    parent.add(mesh); return mesh;
  };
  const lightning = (parent: THREE.Group, name: string, material: THREE.Material,
    position: [number, number, number], scale: number, back = false) => {
    const shape = new THREE.Shape();
    shape.moveTo(0.12, 0.22); shape.lineTo(-0.11, -0.03); shape.lineTo(0.01, -0.03);
    shape.lineTo(-0.08, -0.23); shape.lineTo(0.15, 0.05); shape.lineTo(0.03, 0.05); shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
    mesh.name = name; mesh.position.set(...position); mesh.scale.setScalar(scale);
    if (!back) mesh.rotation.y = Math.PI;
    parent.add(mesh); return mesh;
  };
  const makeTheme = (theme: ScooterSkinTheme) => {
    const group = new THREE.Group(); group.name = `skin-${theme}`;
    root.add(group); groups.set(theme, group); return group;
  };

  const robe = makeTheme("yellow-robe");
  for (const side of [-1, 1]) {
    const ear = box(robe, `yellow-helmet-ear-${side}`, [0.085, 0.15, 0.07], [side * 0.15, 0.51, 0.2], yellow);
    ear.rotation.z = side * -0.2;
    box(robe, `yellow-ear-inset-${side}`, [0.04, 0.085, 0.008], [side * 0.15, 0.52, 0.16], black);
    // Wrap outside the belt/chest so the uniform has distinct front and back faces.
    box(robe, `yellow-jacket-side-${side}`, [0.06, 0.31, 0.36], [side * 0.267, -0.3, 0.22], black);
    box(robe, `yellow-shoulder-reflector-${side}`, [0.14, 0.025, 0.35], [side * 0.2, -0.01, 0.22], white);
    box(robe, `yellow-box-latch-${side}`, [0.045, 0.15, 0.02], [side * 0.26, -0.06, 1.177], black);
  }
  badge(robe, "yellow-chest-badge", "云送", "准时必达", "#ffcf24", "#202329", [0.16, 0.08], [-0.13, -0.16, 0.025]);
  badge(robe, "yellow-back-badge", "黄袍加身", "热爱每一程", "#ffcf24", "#202329", [0.37, 0.16], [0, -0.18, 0.402], true);

  const flash = makeTheme("flash-racer");
  const flashPalette = getScooterSkin("flash-racer").palette;
  const flashInk = paint(flashPalette.graphite);
  for (const side of [-1, 1]) {
    box(flash, `flash-white-shoulder-${side}`, [0.16, 0.08, 0.36], [side * 0.215, -0.04, 0.22], flashInk);
    const stripe = box(flash, `flash-jacket-stripe-${side}`, [0.055, 0.26, 0.017], [side * 0.175, -0.23, 0.038], flashInk);
    stripe.rotation.z = side * -0.4;
    const fairing = box(flash, `flash-fairing-stripe-${side}`, [0.024, 0.11, 0.4], [side * 0.297, -0.87, 0.13], flashInk);
    fairing.rotation.x = -0.26;
    box(flash, `flash-helmet-stripe-${side}`, [0.045, 0.018, 0.4], [side * 0.14, 0.482, 0.22], flashInk);
  }
  lightning(flash, "flash-chest-lightning", flashInk, [0, -0.2, 0.025], 0.36);
  lightning(flash, "flash-back-lightning", flashInk, [0, -0.18, 0.405], 0.6, true);
  badge(flash, "flash-box-top", "FLASH", "好物闪电到", flashPalette.shell, flashPalette.graphite, [0.45, 0.25], [0, 0.043, 0.94], true).rotation.x = -Math.PI / 2;

  // Shared uniform construction keeps each courier's silhouette and trim distinct.
  for (const theme of ["blue-memory", "emerald-rush", "night-express"] as const) {
    const skin = getScooterSkin(theme), palette = skin.palette, group = makeTheme(theme);
    const ink = theme === "night-express" ? "#c4cbd3" : palette.accent;
    const reflector = paint(ink), trim = paint(theme === "night-express" ? palette.accent : palette.graphite);
    for (const side of [-1, 1]) {
      box(group, `${theme}-shoulder-reflector-${side}`, [0.15, 0.025, 0.35], [side * 0.2, -0.012, 0.22], reflector);
      box(group, `${theme}-cargo-strap-${side}`, [0.03, 0.32, 0.025], [side * 0.26, -0.12, 1.177], trim);
      const fairing = box(group, `${theme}-fairing-trim-${side}`, [0.02, 0.065, 0.4], [side * 0.298, -0.89, 0.11], reflector);
      fairing.rotation.x = theme === "emerald-rush" ? -0.4 : -0.2;
    }
    badge(group, `${theme}-chest-badge`, skin.name.slice(0, 2), skin.mark!, palette.shell, ink, [0.19, 0.095], [-0.12, -0.16, 0.026]);
    badge(group, `${theme}-back-badge`, skin.name, skin.mark!, palette.shell, ink, [0.4, 0.17], [0, -0.19, 0.402], true);
    if (theme === "blue-memory") {
      box(group, "blue-memory-jacket-band", [0.44, 0.055, 0.016], [0, -0.34, 0.027], reflector);
      box(group, "blue-memory-helmet-band", [0.025, 0.018, 0.38], [0, 0.484, 0.22], reflector);
      const wave = new THREE.Shape();
      wave.moveTo(-0.18, 0); wave.bezierCurveTo(-0.08, 0.12, 0.07, -0.08, 0.18, 0.035);
      wave.lineTo(0.18, -0.025); wave.bezierCurveTo(0.07, -0.14, -0.08, 0.06, -0.18, -0.06); wave.closePath();
      const emblem = new THREE.Mesh(new THREE.ShapeGeometry(wave, 6), reflector);
      emblem.name = "blue-memory-wave"; emblem.rotation.y = Math.PI; emblem.scale.setScalar(0.65);
      emblem.position.set(0, -0.61, -0.797).sub(steering.position); blueApron.add(emblem);
      badge(group, "blue-memory-helmet-cloud", "云", "BLUE", palette.shell, ink, [0.095, 0.06], [0, 0.43, -0.019]);
    } else if (theme === "emerald-rush") {
      const earGeometry = new THREE.SphereGeometry(0.075, 8, 6);
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(earGeometry, reflector); ear.scale.set(0.7, 1, 0.6);
        ear.name = `emerald-rush-helmet-ear-${side}`; ear.position.set(side * 0.235, 0.35, 0.16); group.add(ear);
        const seam = box(group, `emerald-rush-leaf-seam-${side}`, [0.04, 0.24, 0.017], [side * 0.12, -0.3, 0.029], reflector);
        seam.rotation.z = side * -0.45;
      }
      box(group, "emerald-rush-helmet-trunk", [0.035, 0.07, 0.036], [0, 0.33, 0.012], reflector);
      badge(group, "emerald-rush-box-top", "鲜", "FRESH / JADE", palette.shell, ink, [0.42, 0.24], [0, 0.043, 0.94], true).rotation.x = -Math.PI / 2;
    } else {
      box(group, "night-express-helmet-stripe", [0.025, 0.018, 0.38], [0, 0.484, 0.22], trim);
      for (const side of [-1, 1]) {
        const seam = box(group, `night-express-chest-chevron-${side}`, [0.045, 0.17, 0.017], [side * 0.11, -0.29, 0.029], reflector);
        seam.rotation.z = side * 0.55;
        box(group, `night-express-fairing-pinstripe-${side}`, [0.012, 0.018, 0.5], [side * 0.306, -0.95, 0.13], trim);
      }
      box(group, "night-express-cargo-lock", [0.07, 0.075, 0.025], [0, -0.11, 1.181], reflector);
    }
  }

  const party = makeTheme("guihuo");
  // A swept yellow quiff, dark glasses and pink/cyan jacket patches read at a distance.
  box(party, "guihuo-hair-cap", [0.395, 0.08, 0.38], [0, 0.405, 0.22], yellow);
  for (let i = 0; i < 5; i++) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.18 + (i % 2) * 0.055, 4), yellow);
    tuft.name = `guihuo-hair-${i}`; tuft.position.set((i - 2) * 0.074, 0.51, 0.13);
    tuft.rotation.z = -0.22; tuft.rotation.x = -0.28; party.add(tuft);
  }
  for (const side of [-1, 1]) {
    box(party, `guihuo-sunglass-${side}`, [0.135, 0.065, 0.025], [side * 0.083, 0.258, 0.018], black);
    box(party, `guihuo-glass-highlight-${side}`, [0.065, 0.008, 0.006], [side * 0.083, 0.276, 0.002], neon("#29f6e5"));
    box(party, `guihuo-glass-arm-${side}`, [0.022, 0.025, 0.2], [side * 0.185, 0.268, 0.1], black);
    box(party, `guihuo-jacket-panel-${side}`, [0.11, 0.22, 0.022], [side * 0.19, -0.22, 0.031], side < 0 ? pink : purple);
    box(party, `guihuo-shoulder-${side}`, [0.16, 0.045, 0.35], [side * 0.215, -0.005, 0.22], pink);
  }
  box(party, "guihuo-glass-bridge", [0.08, 0.012, 0.024], [0, 0.267, 0.018], black);
  badge(party, "guihuo-back-graffiti", "鬼火少年", "NEON / 01", "#201830", "#d5ff4b", [0.42, 0.25], [0, -0.2, 0.402], true);
  for (const side of [-1, 1]) {
    const sticker = badge(party, `guihuo-body-sticker-${side}`, "夜行", "LOUD & FREE", "#982cff", "#d5ff4b", [0.36, 0.18], [side * 0.294, -0.91, 0.12], true);
    sticker.rotation.y = side * Math.PI / 2;
  }
  lightning(party, "guihuo-chest-bolt", neon("#29f6e5"), [0.09, -0.18, 0.026], 0.3);

  // The cargo rack becomes a boombox, with protected low-poly speaker diaphragms.
  const boomboxShell = black.clone();
  boomboxShell.name = "guihuo-cargo-shell";
  boomboxShell.userData.cargoColor = true;
  cargoShells.set(boomboxShell, `#${boomboxShell.color.getHexString()}`);
  box(party, "guihuo-boombox", [0.68, 0.4, 0.43], [0, -0.3, 0.92], boomboxShell);
  box(party, "guihuo-boombox-handle", [0.34, 0.05, 0.07], [0, -0.07, 0.92], purple);
  const coneMaterial = paint("#32284d");
  for (const side of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 24), neon(side < 0 ? "#ff47a9" : "#29f6e5"));
    ring.position.set(side * 0.18, -0.3, 1.143); party.add(ring);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.102, 0.05, 0.035, 20), coneMaterial);
    cone.name = `guihuo-speaker-${side}`; cone.rotation.x = Math.PI / 2;
    cone.position.set(side * 0.18, -0.3, 1.146); cone.userData.skinPart = true;
    party.add(cone); cones.push(cone);
  }
  for (let i = 0; i < 5; i++) box(party, `guihuo-equalizer-${i}`, [0.016, 0.025 + i % 3 * 0.013, 0.009], [(i - 2) * 0.025, -0.12, 1.14], neon("#d5ff4b"));

  // Vertex colors provide a complete rainbow without extra lights or post-processing.
  const wheelGeometry = new THREE.TorusGeometry(0.208, 0.012, 6, 40);
  const positions = wheelGeometry.getAttribute("position"), colors = new Float32Array(positions.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    color.setHSL((Math.atan2(positions.getY(i), positions.getX(i)) / (Math.PI * 2) + 1) % 1, 1, 0.58);
    color.toArray(colors, i * 3);
  }
  wheelGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const wheelMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  for (const isFront of [true, false]) for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.name = `guihuo-wheel-${isFront ? "front" : "rear"}-${side}`;
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(side * 0.091, SCOOTER_LAYOUT.axleY, isFront ? SCOOTER_LAYOUT.frontAxleZ : SCOOTER_LAYOUT.rearAxleZ);
    if (isFront) wheel.position.sub(steering.position);
    wheel.userData.skinPart = true;
    (isFront ? front : party).add(wheel); wheels.push(wheel);
  }
  for (const side of [-1, 1]) {
    box(party, `guihuo-deck-led-${side}`, [0.023, 0.028, 0.62], [side * 0.373, -1.06, SCOOTER_LAYOUT.deckZ], neon(side < 0 ? "#ff47a9" : "#29f6e5"));
    const led = box(front, `guihuo-front-led-${side}`, [0.025, 0.34, 0.025], [side * 0.21, -0.44, -0.314], neon(side < 0 ? "#b7ff35" : "#ff47a9"));
    led.rotation.z = side * 0.17;
    box(cockpitLeds, `guihuo-bar-led-${side}`, [0.17, 0.012, 0.014], [side * 0.25, SCOOTER_LAYOUT.gripY + 0.025, SCOOTER_LAYOUT.gripZ - 0.025], neon("#29f6e5"));
  }
  const glowCanvas = document.createElement("canvas"); glowCanvas.width = glowCanvas.height = 64;
  const ctx = glowCanvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32, 32, 1, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,0.65)"); gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  const glowMaterial = new THREE.MeshBasicMaterial({ color: "#db36ff", map: new THREE.CanvasTexture(glowCanvas),
    transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 2.35), glowMaterial);
  glow.name = "guihuo-underglow"; glow.rotation.x = -Math.PI / 2;
  glow.position.set(0, -1.255, -0.15); party.add(glow);

  const helmetDetails: THREE.Group[] = [];
  const cargoDetails: THREE.Group[] = [];
  for (const group of groups.values()) {
    const details = new THREE.Group(); details.name = `${group.name}-helmet-details`;
    details.userData.skinPart = details.userData.helmetDetails = true;
    for (const part of [...group.children]) if (/helmet|^yellow-ear-inset/.test(part.name)) details.add(part);
    group.add(details); helmetDetails.push(details);
    const cargo = new THREE.Group(); cargo.name = `${group.name}-cargo-details`; cargo.userData.skinPart = true;
    // Cargo decorations must keep their own boundary before rigid batching.
    for (const part of [...group.children]) if (part !== details && (/box|cargo|speaker|equalizer/.test(part.name)
      || (group === party && part instanceof THREE.Mesh && part.geometry instanceof THREE.TorusGeometry && part.position.z > 1))) cargo.add(part);
    group.add(cargo); cargoDetails.push(cargo);
  }
  for (const group of [...groups.values(), front, cockpitLeds, blueApron]) {
    group.traverse(object => {
      object.layers.set(group === cockpitLeds ? 1 : 2);
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        object.castShadow = materials.every(material => !material.transparent);
      }
    });
    batchStaticModel(group);
    group.userData.skinPart = true;
    group.visible = false;
  }
  helmetDetails.forEach(group => batchStaticModel(group));
  cargoDetails.forEach(group => batchStaticModel(group));
  steering.add(front, blueApron); root.add(cockpitLeds);
  return {
    get animated() { return active === "guihuo"; },
    setHelmetVisibility(visible: boolean) { helmetDetails.forEach(group => { group.visible = visible; }); },
    setCargoVisibility(visible: boolean) { cargoDetails.forEach(group => { group.visible = visible; }); },
    apply(palette: ScooterSkinPalette) {
      active = palette.theme;
      for (const [material, original] of cargoShells) material.color.set(palette.cargoColor ?? original);
      for (const badge of cargoBadges) {
        const background = palette.cargoColor ?? badge.background;
        if (background === badge.currentBackground) continue;
        drawBadge(badge.canvas, badge.title, badge.subtitle, background,
          background === badge.background ? badge.ink : getCargoLabelInk(background));
        badge.currentBackground = background;
        badge.material.map!.needsUpdate = true;
      }
      for (const [theme, group] of groups) group.visible = theme === active;
      front.visible = cockpitLeds.visible = active === "guihuo";
      blueApron.visible = active === "blue-memory";
    },
    update(elapsed: number, musicPulse: number) {
      if (active !== "guihuo") return;
      for (let i = 0; i < leds.length; i++) leds[i].color.setHSL((elapsed * 0.12 + i * 0.13) % 1, 1, 0.58 + musicPulse * 0.1);
      for (const wheel of wheels) wheel.rotation.z = elapsed * 1.5;
      for (const cone of cones) cone.position.z = 1.146 + musicPulse * 0.012;
      glowMaterial.color.setHSL((elapsed * 0.1 + 0.7) % 1, 1, 0.5);
  glowMaterial.opacity = 0.48 + musicPulse * 0.22;
    },
  };
}

function drawBadge(canvas: HTMLCanvasElement, title: string, subtitle: string, background: string, ink: string) {
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = background; ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = '900 84px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(title, 256, 94);
  ctx.font = 'bold 37px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(subtitle, 256, 193);
}
