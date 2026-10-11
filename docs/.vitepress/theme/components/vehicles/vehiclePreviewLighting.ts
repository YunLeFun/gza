import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

function createGroundFade(): THREE.DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1);
      const alpha = Math.round((1 - THREE.MathUtils.smoothstep(distance, 0.5, 1)) * 255);
      const index = (y * size + x) * 4;
      data[index] = data[index + 1] = data[index + 2] = alpha;
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** A small studio built locally, with no HDR, texture or scene downloads. */
export function createVehiclePreviewLighting(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Orbiting moves only the camera, so one shadow pass lasts for the whole view.
  renderer.shadowMap.autoUpdate = false;

  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  let environment: THREE.WebGLRenderTarget;
  try {
    environment = pmrem.fromScene(room, 0.04);
  } finally {
    room.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
    room.dispose();
    pmrem.dispose();
  }
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.45;

  const ambient = new THREE.HemisphereLight(0xe9edf2, 0x60584e, 0.85);
  const key = new THREE.DirectionalLight(0xfff4df, 2.5);
  // Match the main-light direction used by the SVG gallery generator.
  const keyDirection = new THREE.Vector3(-3, 6, -5).normalize();
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 8;
  key.shadow.bias = -0.0001;
  const fill = new THREE.DirectionalLight(0xd9e6f5, 0.4);
  fill.position.set(5, 2, 4);
  const rim = new THREE.DirectionalLight(0xe5efff, 0.65);
  rim.position.set(2, 4, 6);
  scene.add(ambient, key, key.target, fill, rim);

  const groundFade = createGroundFade();
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1, 64),
    new THREE.MeshStandardMaterial({
      color: 0x151515, roughness: 1, metalness: 0,
      alphaMap: groundFade, transparent: true, opacity: 0.8, depthWrite: false,
    }),
  );
  floor.name = "vehicle-preview-ground";
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  return {
    fit(model: THREE.Group, bounds: THREE.Box3) {
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const radius = Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius, 0.01);
      // The viewer centers the vehicle; keep its wheels just above this surface.
      floor.position.set(0, bounds.min.y - center.y - radius * 0.003, 0);
      floor.scale.set(size.x + size.y * 1.2, size.z * 0.7 + size.y * 0.8, 1);
      key.position.copy(keyDirection).multiplyScalar(radius * 4);
      const extent = radius * 1.55;
      const camera = key.shadow.camera;
      camera.left = camera.bottom = -extent;
      camera.right = camera.top = extent;
      camera.near = radius * 0.1;
      camera.far = radius * 8;
      camera.updateProjectionMatrix();
      key.shadow.normalBias = radius * 0.004;
      model.traverseVisible(object => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        object.castShadow = materials.every(material => !material.transparent && material.opacity >= 1);
        object.receiveShadow = true;
      });
      renderer.shadowMap.needsUpdate = true;
    },
    dispose() {
      scene.environment = null;
      environment.dispose();
      key.shadow.dispose();
      groundFade.dispose();
      floor.geometry.dispose();
      floor.material.dispose();
      scene.remove(ambient, key, key.target, fill, rim, floor);
    },
  };
}
