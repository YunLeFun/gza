import * as THREE from "three";

interface StreetModelParts {
  boxes: {
    name: string;
    position: [number, number, number];
    size: [number, number, number];
    color: string;
    pitch?: number;
  }[];
  wheels: {
    name: string;
    position: [number, number, number];
    width: number;
    radius: number;
    color: string;
  }[];
}

/** Render the game’s data-only street models with the same primitive shapes. */
function createStreetPreview(parts: StreetModelParts): THREE.Group {
  const group = new THREE.Group();
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const material = (color: string) => {
    let value = materials.get(color);
    if (!value) {
      value = new THREE.MeshStandardMaterial({ color });
      materials.set(color, value);
    }
    return value;
  };
  for (const part of parts.boxes) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...part.size), material(part.color));
    mesh.name = part.name;
    mesh.position.set(...part.position);
    mesh.rotation.x = part.pitch ?? 0;
    group.add(mesh);
  }
  for (const part of parts.wheels) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(part.radius, part.radius, part.width, 12),
      material(part.color),
    );
    mesh.name = part.name;
    mesh.position.set(...part.position);
    mesh.rotation.z = Math.PI / 2;
    group.add(mesh);
  }
  return group;
}

const TRUCK_PREVIEW_IDS = ["cargo", "tanker", "flatbed", "dump", "mixer", "crane", "excavator", "heavy"] as const;
type TruckPreviewId = typeof TRUCK_PREVIEW_IDS[number];

/**
 * Construct one independently owned preview from the actual game factories.
 * Family imports load only after the viewer opens; no game bootstrap is used.
 * Geometries/materials/textures belong to this result and may all be disposed.
 */
export async function createVehiclePreviewModel(id: string): Promise<THREE.Group> {
  if (id.startsWith("skin-")) {
    const { isScooterSkinId } = await import("../../../game-reference/apps/dayun-kicker/src/game/skins");
    const skinId = id.slice("skin-".length);
    if (!isScooterSkinId(skinId)) throw new Error(`Unknown vehicle model: ${id}`);
    const { createScooterPreviewModel } = await import("./createScooterPreviewModel");
    return createScooterPreviewModel(skinId, true);
  }
  switch (id) {
    case "microvan":
    case "van": {
      const { createVanModel } = await import("../../../game-reference/apps/dayun-kicker/src/render/vanModel");
      return createStreetPreview(createVanModel(id, id === "microvan" ? 0 : 1));
    }
    case "bus":
    case "minibus": {
      const { createBusModel } = await import("../../../game-reference/apps/dayun-kicker/src/render/busModel");
      return createStreetPreview(createBusModel(id, id === "bus" ? 0 : 1));
    }
    case "roller":
    case "loader": {
      const { createWorkVehicle } = await import("../../../game-reference/apps/dayun-kicker/src/render/workVehicle");
      return createWorkVehicle(id);
    }
    case "car": {
      const { createCarMesh } = await import("../../../game-reference/apps/dayun-kicker/src/render/carModel");
      return createCarMesh(0);
    }
    case "scooter": {
      const { createScooterPreviewModel } = await import("./createScooterPreviewModel");
      return createScooterPreviewModel();
    }
    case "tank": {
      const { createTankModel } = await import("../../../game-reference/apps/dayun-kicker/src/district/tankModel");
      const tank = createTankModel();
      tank.update({ x: 0, z: 0, height: 0, yaw: 0 }, 0, { distance: 0, elapsed: 0 });
      // The gameplay shadow is a separate object and is not part of the preview.
      tank.shadow.geometry.dispose();
      tank.shadow.material.dispose();
      return tank.root;
    }
    default: {
      const index = TRUCK_PREVIEW_IDS.indexOf(id as TruckPreviewId);
      if (index < 0) throw new Error(`Unknown vehicle model: ${id}`);
      const { createTruckMesh } = await import("../../../game-reference/apps/dayun-kicker/src/render/truckModel");
      return createTruckMesh(index, -1, TRUCK_PREVIEW_IDS[index]!, "traffic");
    }
  }
}
