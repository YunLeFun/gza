import * as THREE from 'three';
import { CITY_MELEE_TOOLS, type CityMeleeTool } from '@yunlefun/dayun-kicker-coop';

/** Fixed-size, one-draw-call swing trails. These are feedback, never hit detection. */
export function createCityMeleeEffects() {
  const capacity = 8, segments = 10, positions: number[] = [];
  const point = (angle: number, radius: number) => [Math.sin(angle) * radius, 0, -Math.cos(angle) * radius];
  for (let i = 0; i < segments; i++) {
    const a = -.5 + i / segments, b = -.5 + (i + 1) / segments;
    const innerA = point(a, .8), outerA = point(a, 1.08), innerB = point(b, .8), outerB = point(b, 1.08);
    positions.push(...innerA, ...outerA, ...innerB, ...innerB, ...outerA, ...outerB);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.MeshBasicMaterial({ color: '#fff1bd', side: THREE.DoubleSide, transparent: true, opacity: .65,
    depthWrite: false, toneMapped: false });
  const root = new THREE.InstancedMesh(geometry, material, capacity); root.name = 'city-melee-swings'; root.frustumCulled = false; root.count = 0;
  const swings = Array.from({ length: capacity }, () => ({ life: 0, tool: 'broom' as CityMeleeTool, x: 0, y: 0, z: 0, yaw: 0 }));
  const hand = new THREE.Group(); hand.name = 'city-melee-tool'; hand.visible = false;
  const tools = new Map<CityMeleeTool, THREE.Group>();
  const wood = new THREE.MeshStandardMaterial({ color: '#ae8054', roughness: .85 });
  const metal = new THREE.MeshStandardMaterial({ color: '#79868a', metalness: .45, roughness: .4 });
  const dark = new THREE.MeshStandardMaterial({ color: '#303b3d', roughness: .6 });
  const cloth = new THREE.MeshStandardMaterial({ color: '#e8bb52', roughness: .85 });
  const box = new THREE.BoxGeometry(1, 1, 1), disc = new THREE.CylinderGeometry(1, 1, 1, 12), cone = new THREE.ConeGeometry(1, 1, 12);
  function toolModel(tool: CityMeleeTool) {
    if (tools.has(tool)) return tools.get(tool)!;
    const group = new THREE.Group();
    const part = (geometry: THREE.BufferGeometry, material: THREE.Material, size: [number, number, number], at: [number, number, number]) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.scale.set(...size); mesh.position.set(...at); group.add(mesh); return mesh;
    };
    if (tool === 'broom') { part(box, wood, [.045, .045, .85], [0, 0, -.3]); part(box, cloth, [.36, .12, .16], [0, 0, -.74]); }
    else if (tool === 'umbrella') { part(box, dark, [.04, .04, .75], [0, 0, -.3]); const canopy = part(cone, cloth, [.12, .5, .12], [0, 0, -.64]); canopy.rotation.x = -Math.PI / 2; }
    else if (tool === 'frying-pan') { part(box, dark, [.07, .055, .43], [0, 0, -.15]); const pan = part(disc, dark, [.22, .065, .22], [0, 0, -.56]); pan.rotation.x = Math.PI / 2; }
    else { const lid = part(disc, metal, [.28, .06, .28], [0, 0, -.4]); lid.rotation.x = Math.PI / 2; part(box, dark, [.13, .055, .08], [0, 0, -.34]); }
    tools.set(tool, group); hand.add(group); return group;
  }
  const transform = new THREE.Object3D(); let cursor = 0, disposed = false;
  return { root, hand,
    pose(tool: CityMeleeTool, progress: number, guard: boolean) {
      const selected = toolModel(tool); for (const model of tools.values()) model.visible = model === selected;
      const swing = Math.sin(progress * Math.PI);
      hand.visible = true; hand.position.set(.25 - (tool === 'umbrella' ? 0 : swing * .35), -.28 + (guard ? .1 : swing * .08), -.25 - swing * (tool === 'umbrella' ? .42 : .12));
      hand.rotation.set(0, tool === 'umbrella' || guard ? 0 : -swing, tool === 'umbrella' || guard ? 0 : swing * .7);
    },
    add(origin: { x: number; y: number; z: number }, direction: { x: number; z: number }, tool: CityMeleeTool = 'broom') {
      if (disposed) return;
      Object.assign(swings[cursor++ % capacity]!, origin, { tool, life: CITY_MELEE_TOOLS[tool].swingMs / 1000, yaw: Math.atan2(-direction.x, -direction.z) });
    },
    update(dt: number, reducedMotion = false) {
      let count = 0;
      for (const swing of swings) {
        swing.life = Math.max(0, swing.life - Math.max(0, dt)); if (!swing.life) continue;
        const spec = CITY_MELEE_TOOLS[swing.tool], progress = 1 - swing.life / (spec.swingMs / 1000);
        transform.position.set(swing.x, swing.y, swing.z);
        transform.rotation.set(0, swing.yaw + (reducedMotion ? 0 : spec.halfAngle * (1 - progress * 2)), 0);
        transform.scale.setScalar(spec.range / 2.25 * (1 + (reducedMotion ? 0 : Math.sin(progress * Math.PI) * .3))); transform.updateMatrix();
        root.setMatrixAt(count++, transform.matrix);
      }
      root.count = count; root.instanceMatrix.needsUpdate = true;
    },
    clear() { swings.forEach(swing => { swing.life = 0; }); root.count = 0; hand.visible = false; },
    dispose() { disposed = true; root.removeFromParent(); hand.removeFromParent(); hand.clear(); tools.clear(); root.dispose(); geometry.dispose(); material.dispose(); box.dispose(); disc.dispose(); cone.dispose(); wood.dispose(); metal.dispose(); dark.dispose(); cloth.dispose(); },
  };
}
