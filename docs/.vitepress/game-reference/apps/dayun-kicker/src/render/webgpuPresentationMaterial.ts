import { NodeMaterial } from "three/webgpu";
import type * as THREE from "three";
import { Fn, clamp, dot, length, max, mix, smoothstep, texture, uniform, uv, vec2, vec3, vec4 } from "three/tsl";

/** Loaded only with the node runtime. Match the existing eight-tap HDR resolve. */
export function createWebGPUPresentationMaterial(frame: THREE.Texture, texel: THREE.Vector2, glow: { value: number }): THREE.Material {
  const material = new NodeMaterial();
  const pixel = uniform(texel), strength = uniform(glow.value).onRenderUpdate(() => glow.value);
  const image = texture(frame), coordinates = uv();
  material.depthTest = false; material.depthWrite = false; material.fog = false;
  material.fragmentNode = Fn(() => {
    const highlight = (x: number, y: number) => {
      const color = image.sample(clamp(coordinates.add(vec2(x, y).mul(pixel, 5)), 0, 1)).rgb;
      const brightness = dot(color, vec3(.2126, .7152, .0722));
      return color.mul(max(0, brightness.sub(1.6)).div(max(brightness, .001)));
    };
    const halo = highlight(-1, 0).add(highlight(1, 0), highlight(0, -1), highlight(0, 1),
      highlight(-.7, -.7), highlight(.7, -.7), highlight(-.7, .7), highlight(.7, .7));
    const color = image.sample(coordinates).rgb.add(halo.mul(strength, .125));
    const luminance = dot(color, vec3(.2126, .7152, .0722));
    const saturated = max(vec3(0), mix(vec3(luminance), color, 1.06));
    return vec4(saturated.mul(smoothstep(.3, .8, length(coordinates.sub(.5))).mul(.08).oneMinus()), 1);
  })();
  material.name = "game-hdr-resolve-node";
  return material;
}
