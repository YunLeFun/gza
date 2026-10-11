import { NodeMaterial } from "three/webgpu";
import type * as THREE from "three";
import { Fn, cameraPosition, clamp, cos, dot, exp, float, mix, normalize, positionWorld, pow, texture, uniform, vec2, vec3, vec4 } from "three/tsl";

/** The same authored waves, Fresnel and depth absorption as the GLSL material. */
export function createWebGPUWaterMaterial(values: Record<string, THREE.IUniform>): THREE.Material {
  const scalar = (name: string) => uniform(values[name]!.value as number).onRenderUpdate(() => values[name]!.value as number);
  const matrix = (name: string) => uniform(values[name]!.value as THREE.Matrix4).onRenderUpdate(() => values[name]!.value as THREE.Matrix4);
  const color = (name: string) => uniform(values[name]!.value as THREE.Color).onRenderUpdate(() => values[name]!.value as THREE.Color).rgb;
  const reflectionMatrix = matrix("reflectionMatrix"), refractionMatrix = matrix("refractionMatrix");
  const inverseProjection = matrix("inverseRefractionProjection"), cameraWorld = matrix("refractionCameraWorld");
  const elapsed = scalar("elapsed"), waveStrength = scalar("waveStrength"), height = scalar("waterHeight");
  const absorption = uniform(values.absorption!.value as THREE.Vector3).onRenderUpdate(() => values.absorption!.value as THREE.Vector3);
  const waterColor = color("waterColor"), skyColor = color("skyColor");
  const texel = scalar("texel"), ready = scalar("ready"), fallbackAlpha = scalar("fallbackAlpha");
  const reflection = texture(values.reflectionMap!.value as THREE.Texture), refraction = texture(values.refractionMap!.value as THREE.Texture);
  const depthMap = texture(values.refractionDepth!.value as THREE.DepthTexture);
  const material = new NodeMaterial(); material.transparent = true; material.depthWrite = false; material.fog = true;
  material.fragmentNode = Fn(() => {
    const position = positionWorld, p = position.xz;
    const slope = vec2(.8, .6).mul(cos(dot(p, vec2(.8, .6)).mul(.72).add(elapsed.mul(.7))))
      .add(vec2(-.36, .93).mul(cos(dot(p, vec2(-.36, .93)).mul(1.31).sub(elapsed.mul(.95))), .48))
      .add(vec2(.94, -.34).mul(cos(dot(p, vec2(.94, -.34)).mul(2.77).add(elapsed.mul(1.2))), .24));
    const normal = normalize(vec3(slope.x.mul(waveStrength).negate(), 1, slope.y.mul(waveStrength).negate()));
    const eye = normalize(cameraPosition.sub(position)), cosine = dot(eye, normal).max(0);
    const fresnel = float(.02).add(pow(cosine.oneMinus(), 5).mul(.98));
    const reflectionCoord = reflectionMatrix.mul(vec4(position, 1)), refractionCoord = refractionMatrix.mul(vec4(position, 1));
    const distortion = normal.xz.mul(.012, clamp(cosine.mul(8), .15, 1));
    const reflectUv = clamp(reflectionCoord.xy.div(reflectionCoord.w).add(distortion), vec2(texel), vec2(texel.oneMinus()));
    const refractUv = clamp(refractionCoord.xy.div(refractionCoord.w).sub(distortion.div(1.333)), vec2(texel), vec2(texel.oneMinus()));
    const reflected = reflection.sample(reflectUv).rgb.mul(.5)
      .add(reflection.sample(reflectUv.add(vec2(texel, 0))).rgb.mul(.25), reflection.sample(reflectUv.sub(vec2(texel, 0))).rgb.mul(.25));
    const depth = depthMap.sample(refractUv).r;
    // GPU render-target UVs have a downward Y axis and depth is NDC [0,1].
    // The actual oblique inverse is essential; near/far formulas lose thickness.
    const below = inverseProjection.mul(vec4(refractUv.x.mul(2).sub(1), refractUv.y.mul(-2).add(1), depth, 1));
    const belowWorld = cameraWorld.mul(below.div(below.w)).xyz;
    const thickness = depth.greaterThan(.99999).select(float(12), clamp(height.sub(belowWorld.y).div(cosine.max(.18)), 0, 12));
    const transmission = exp(absorption.mul(thickness).negate());
    const refracted = refraction.sample(refractUv).rgb.mul(transmission).add(waterColor.mul(transmission.oneMinus()));
    const color = ready.greaterThan(.5).select(mix(refracted, reflected, fresnel), mix(waterColor, skyColor, fresnel));
    return vec4(color, ready.greaterThan(.5).select(float(1), fallbackAlpha));
  })();
  return material;
}
