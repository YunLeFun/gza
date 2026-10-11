import * as THREE from "three";
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from "three/webgpu";
import type { Node, NodeBuilder } from "three/webgpu";
import { cameraProjectionMatrix, modelViewMatrix, positionLocal, positionView, instanceColor, uniform, vec4, mix, smoothstep, max, materialOpacity, fog } from "three/tsl";
export { createWebGPUWaterMaterial } from "./webgpuWaterMaterial";
export { createPlanarWaterCapture } from "./planarWaterCapture";
export { createWebGPUStaticBatchCullingProtocol } from "./webgpuStaticBatchCulling";
export { createWebGPUPresentationMaterial } from "./webgpuPresentationMaterial";
export { createWebGPUGroundMaterial, createWebGPUFacadeMaterial, createWebGPUCoatedGlazingMaterial, syncWebGPUSurfaceEnvironment } from "./webgpuSurfaceMaterials";

export function createWebGPUSkyMaterial(values: {high:{value:THREE.Color}; middle:{value:THREE.Color}; low:{value:THREE.Color}; dusk:{value:number}}) {
  const material = new MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
  const direction = positionLocal.normalize();
  const dusk = uniform(0).onRenderUpdate(() => values.dusk.value);
  const high = uniform(values.high.value), middle = uniform(values.middle.value), low = uniform(values.low.value);
  const west = max(0, direction.x.negate()).pow(2);
  const horizon = mix(low, middle, dusk.mul(west.oneMinus(), .42));
  material.colorNode = mix(mix(horizon, middle, smoothstep(.01, .14, direction.y)), high, smoothstep(.14, .55, direction.y));
  applyFarPlane(material);
  return material;
}

function applyFarPlane(material: MeshBasicNodeMaterial) {
  const clip = cameraProjectionMatrix.mul(modelViewMatrix).mul(vec4(positionLocal, 1));
  material.vertexNode = vec4(clip.xy, clip.w, clip.w);
}
export function createWebGPUSkyLayerMaterial(parameters: THREE.MeshBasicMaterialParameters, farPlane: boolean) {
  const material = new MeshBasicNodeMaterial(parameters);
  if (farPlane) applyFarPlane(material);
  return material;
}
export function createWebGPUTrafficShadowMaterial(map: THREE.Texture) {
  const material = new MeshBasicNodeMaterial({ map, color: "#000000", transparent: true, depthWrite: false, toneMapped: false });
  // materialColor already contributes the map alpha. Apply instance fading once.
  material.opacityNode = materialOpacity.mul(instanceColor.r);
  return material;
}
class TowerNodeMaterial extends MeshStandardNodeMaterial {
  constructor(private scale: { value: number }) { super({ color: "#d7e1dc", roughness: .34, metalness: .4 }); }
  override setupFog(builder: NodeBuilder, outputNode: Node): Node {
    // Fog uses view-space distance. The correction applies to this landmark,
    // leaving the rest of the city's atmosphere unchanged.
    const fogBuilder = builder as NodeBuilder & { fogNode?: ReturnType<typeof fog>; scene: THREE.Scene; context: { output: Node } };
    if (!fogBuilder.fogNode || !fogBuilder.scene.fog) return outputNode;
    fogBuilder.context.output = outputNode;
    const node = fogBuilder.fogNode.context({ getViewZ: () => positionView.z.mul(uniform(1).onRenderUpdate(() => this.scale.value)) });
    return vec4(node.toVar());
  }
}
export function createWebGPUTowerMaterial(scale: {value:number}) { return new TowerNodeMaterial(scale); }
export { prepareSceneShadowRegistry, freezeSceneShadows } from "./webgpuShadowRegistry";
