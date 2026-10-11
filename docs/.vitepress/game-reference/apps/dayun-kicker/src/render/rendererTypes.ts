import type { WebGLRenderer } from "three";
import type { WebGPURenderer } from "three/webgpu";

export type GameRenderer = WebGLRenderer | WebGPURenderer;

export function isWebGPURenderer(renderer: GameRenderer): renderer is WebGPURenderer {
  return "isWebGPURenderer" in renderer && renderer.isWebGPURenderer === true;
}

/** WebGPU's render.calls counts render() invocations over its lifetime. */
export function getRendererDrawCalls(renderer: GameRenderer): number {
  return isWebGPURenderer(renderer) ? renderer.info.render.drawCalls : renderer.info.render.calls;
}

export function getRendererStats(renderer: GameRenderer) {
  return { calls: getRendererDrawCalls(renderer), triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
    pixelRatio: renderer.getPixelRatio() };
}
