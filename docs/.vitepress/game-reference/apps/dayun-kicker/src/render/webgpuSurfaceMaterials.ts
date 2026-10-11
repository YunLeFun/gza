import * as THREE from "three";
import { MeshPhysicalNodeMaterial, MeshStandardNodeMaterial } from "three/webgpu";
import type { Node } from "three/webgpu";
import { clamp, dot, float, fract, max, min, mix, normalMap, positionWorld, reference, smoothstep, step, texture, uniform, uv, vec2, vec3, vec4 } from "three/tsl";

type Bounds = readonly [number, number, number, number];
interface GroundSource {
  bounds: Bounds;
  map: THREE.Texture;
  mask: THREE.Texture;
}
export interface WebGPUGroundSource extends GroundSource {
  atlas: { albedo: THREE.Texture; relief: THREE.Texture };
  courtBounds: THREE.Vector4;
  palette: readonly THREE.Color[];
  outer?: GroundSource;
}

// Three copies these standard material flags in setDefaultValues; its Node
// declarations omit them. Declare the existing flags for shared scene APIs.
class SurfaceStandardNodeMaterial extends MeshStandardNodeMaterial {
  declare readonly isMeshStandardMaterial: boolean;
}
class SurfacePhysicalNodeMaterial extends MeshPhysicalNodeMaterial {
  declare readonly isMeshStandardMaterial: boolean;
  declare readonly isMeshPhysicalMaterial: boolean;
}

// Node materials do not use the WebGL onBeforeRender environment hook. Keep the
// authored per-material reflection intensity when the shared sky changes.
const surfaces = new Set<MeshStandardNodeMaterial>();
function register<T extends MeshStandardNodeMaterial>(material: T): T {
  surfaces.add(material);
  const release = () => { surfaces.delete(material); material.removeEventListener("dispose", release); };
  material.addEventListener("dispose", release);
  return material;
}
export function syncWebGPUSurfaceEnvironment(scene: THREE.Scene) {
  for (const material of surfaces) {
    if (material.envMap === scene.environment) continue;
    material.envMap = scene.environment;
    material.needsUpdate = true;
  }
}

const mapBounds = (bounds: Bounds) => uniform(new THREE.Vector4(bounds[0], -bounds[3], bounds[2] - bounds[0], bounds[3] - bounds[1]));
const smallestInset = (point: Node<"vec2">, bounds: Node<"vec4">) => {
  const inset = vec4(point.sub(bounds.xy), bounds.zw.sub(point));
  return min(min(inset.x, inset.y), min(inset.z, inset.w));
};
const hash = (point: Node<"vec2">) => {
  const base = fract(point.xyx.mul(.1031)).toVar();
  const q = base.add(dot(base, base.yzx.add(33.33))).toVar();
  return fract(q.x.add(q.y).mul(q.z));
};
const noise = (point: Node<"vec2">) => {
  const cell = point.floor().toVar(), fraction = fract(point).toVar();
  const f = fraction.mul(fraction).mul(vec2(3).sub(fraction.mul(2))).toVar();
  return mix(mix(hash(cell), hash(cell.add(vec2(1, 0))), f.x),
    mix(hash(cell.add(vec2(0, 1))), hash(cell.add(vec2(1))), f.x), f.y);
};

/** Exact world-space palette, courtyard paving and derivative-filtered relief. */
export function createWebGPUGroundMaterial(source: WebGPUGroundSource) {
  const material = new SurfaceStandardNodeMaterial({ map: source.map, normalMap: source.atlas.relief,
    normalScale: new THREE.Vector2(.45, .45), roughness: .94 });
  const metres = positionWorld.xz.mul(vec2(1, -1)).toVar();
  const bounds = mapBounds(source.bounds), mapUv = metres.sub(bounds.xy).div(bounds.zw).toVar();
  let weights = texture(source.mask, mapUv).rgb;
  let alpha = texture(source.map, mapUv).a;
  if (source.outer) {
    const outerBounds = mapBounds(source.outer.bounds), outerUv = metres.sub(outerBounds.xy).div(outerBounds.zw).toVar();
    const innerBounds = uniform(new THREE.Vector4(source.bounds[0], -source.bounds[3], source.bounds[2], -source.bounds[1]));
    const localMix = smoothstep(0, 8, smallestInset(metres, innerBounds)).toVar();
    weights = mix(texture(source.outer.mask, outerUv).rgb, weights, localMix);
    alpha = mix(texture(source.outer.map, outerUv).a, alpha, localMix);
  }
  weights = weights.toVar();
  const edgeAA = clamp(weights.fwidth().mul(.8), vec3(.025), vec3(.25)).toVar();
  weights = smoothstep(vec3(.5).sub(edgeAA), vec3(.5).add(edgeAA), weights);
  weights = weights.div(max(1, dot(weights, vec3(1)))).toVar();
  const grass = max(0, dot(weights, vec3(1)).oneMinus()).toVar();
  const kind = weights.r.greaterThan(.5).select(float(0), weights.g.greaterThan(.5).select(float(1), weights.b.greaterThan(.5).select(float(2), float(3)))).toVar();
  const palette = source.palette.map(color => uniform(color));
  let color = reference("color", "color", material).rgb.mul(palette[0]!.mul(weights.r).add(palette[1]!.mul(weights.g), palette[2]!.mul(weights.b), palette[3]!.mul(grass)));
  const court = uniform(source.courtBounds), paving = step(0, smallestInset(metres, court)).mul(weights.b).toVar();
  const local = metres.sub(court.xy).toVar(), band = fract(local.add(vec2(1.8, .9)).div(6)).sub(.5).abs().mul(6).toVar();
  const bandAA = max(.012, max(local.x.fwidth(), local.y.fwidth()));
  const red = smoothstep(float(.42).sub(bandAA), float(.42).add(bandAA), min(band.x, band.y)).oneMinus();
  color = mix(color, mix(vec3(.63, .61, .56), vec3(.48, .27, .26), red), paving);
  let unit = kind.lessThan(.5).select(float(2), kind.lessThan(1.5).select(float(.8), kind.lessThan(2.5).select(float(1.2), float(2.4))));
  unit = mix(unit, float(.36), paving).toVar();
  const dx = metres.dFdx().toVar(), dy = metres.dFdy().toVar(), footprint = max(dx.length(), dy.length());
  const detail = smoothstep(mix(.05, .018, grass), mix(.48, .14, grass), footprint).oneMinus().toVar();
  const repeated = fract(metres.div(unit)).toVar();
  const atlasUv = vec2(repeated.x, kind.mul(288).add(16, repeated.y.mul(256)).div(1152)).toVar();
  const atlasScale = vec2(1, 256 / 1152).div(unit).toVar();
  // Differentiate before fract, matching textureGrad in the authored GLSL.
  const relief = texture(source.atlas.relief, atlasUv).grad(dx.mul(atlasScale), dy.mul(atlasScale)).toVar();
  const grain = texture(source.atlas.albedo, atlasUv).grad(dx.mul(atlasScale), dy.mul(atlasScale)).rgb;
  color = color.mul(mix(vec3(mix(.973, .944, grass)), grain.mul(1.04), detail));
  const patch = noise(metres.div(36)).mul(.64).add(noise(metres.div(8.5).add(vec2(17.2, -9.4))).mul(.36));
  const meadow = noise(metres.div(115).add(vec2(-4.8, 6.1)));
  const grassColor = mix(vec3(.86, .95, .83), vec3(1.12, 1.065, .94), patch).mul(mix(.94, 1.045, meadow));
  material.colorNode = vec4(color.mul(mix(vec3(1), grassColor, grass)), alpha);
  material.roughnessNode = mix(mix(.94, .97, grass), relief.a, detail);
  material.normalNode = normalMap(mix(vec3(.5, .5, 1), relief.xyz, detail), reference("normalScale", "vec2", material));
  return material;
}

/** Atlas sampling retains unwrapped UV derivatives and the dark roof sentinel. */
export function createWebGPUFacadeMaterial(parameters: THREE.MeshPhysicalMaterialParameters, rect: THREE.Vector4) {
  const material = register(new SurfacePhysicalNodeMaterial(parameters)), coordinates = uv(), region = uniform(rect);
  const roof = coordinates.y.lessThan(-1);
  const atlasUv = roof.select(region.xy.sub(vec2(4 / 1024)), region.xy.add(fract(coordinates).mul(region.zw))).toVar();
  // A constant roof coordinate has zero derivatives (mip zero). Select the
  // coordinates/gradients, rather than sampling both branches for every pane.
  const dx = roof.select(vec2(0), coordinates.dFdx().mul(region.zw)).toVar();
  const dy = roof.select(vec2(0), coordinates.dFdy().mul(region.zw)).toVar();
  const sample = (map: THREE.Texture) => texture(map, atlasUv).grad(dx, dy);
  const color = sample(material.map!);
  material.colorNode = vec4(reference("color", "color", material).rgb.mul(color.rgb), color.a);
  material.roughnessNode = reference("roughness", "float", material).mul(sample(material.roughnessMap!).g);
  material.normalNode = normalMap(sample(material.normalMap!).rgb, reference("normalScale", "vec2", material));
  material.emissiveNode = reference("emissive", "color", material).rgb.mul(reference("emissiveIntensity", "float", material), sample(material.emissiveMap!).rgb);
  return material;
}

/** Standard Node PBR already implements these four shared glazing maps. */
export function createWebGPUCoatedGlazingMaterial(parameters: THREE.MeshPhysicalMaterialParameters) {
  return register(new SurfacePhysicalNodeMaterial(parameters));
}
