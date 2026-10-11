import * as THREE from "three";

/** Replace the near row using the original inverse, including asymmetric views. */
export function applyWaterObliqueProjection(camera: THREE.PerspectiveCamera, worldPlane: THREE.Plane, clipBias = .001) {
  const plane = worldPlane.clone().applyMatrix4(camera.matrixWorldInverse);
  const clip = new THREE.Vector4(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
  const inverse = camera.projectionMatrix.clone().invert();
  const corner = new THREE.Vector4(Math.sign(clip.x), Math.sign(clip.y), 1, 1).applyMatrix4(inverse);
  const gpu = camera.coordinateSystem === THREE.WebGPUCoordinateSystem;
  clip.multiplyScalar((gpu ? 1 : 2) / clip.dot(corner));
  const elements = camera.projectionMatrix.elements;
  elements[2] = clip.x; elements[6] = clip.y;
  elements[10] = clip.z + (gpu ? 0 : 1) - clipBias; elements[14] = clip.w;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}

function captureHelper(height: number, size: number, depth: boolean) {
  const object = new THREE.Object3D(), camera = new THREE.PerspectiveCamera();
  const target = new THREE.WebGLRenderTarget(size, size, { type: THREE.UnsignedByteType, samples: 0 });
  if (depth) target.depthTexture = new THREE.DepthTexture(size, size, THREE.UnsignedIntType);
  object.rotation.x = -Math.PI / 2; object.position.y = height; object.updateMatrixWorld();
  return Object.assign(object, { camera, getRenderTarget: () => target, getReflectionCamera: (_source: THREE.Camera) => camera, dispose: () => target.dispose() });
}

/** Manual pair retains fixed-size, shared-per-height and throttled captures. */
export function createPlanarWaterCapture(height: number, size: number) {
  const reflector = captureHelper(height, size, false), refractor = captureHelper(height, size, true);
  const reflectionMatrix = new THREE.Matrix4(), refractionMatrix = new THREE.Matrix4();
  const position = new THREE.Vector3(), forward = new THREE.Vector3(), up = new THREE.Vector3(), rotation = new THREE.Matrix4();
  const bias = new THREE.Matrix4().set(.5, 0, 0, .5, 0, -.5, 0, .5, 0, 0, 1, 0, 0, 0, 0, 1);
  return {
    reflector, refractor, reflectionMatrix, refractionMatrix,
    updateCameras(source: THREE.PerspectiveCamera) {
      // These captures target WebGPU's [0,1] depth. Copying the source prevents
      // Renderer._updateCamera from rebuilding and discarding the oblique row.
      const mirror = reflector.camera, below = refractor.camera;
      mirror.copy(source, false); below.copy(source, false);
      mirror.coordinateSystem = below.coordinateSystem = THREE.WebGPUCoordinateSystem;
      // A standalone first capture can receive a camera not yet normalized by
      // the GPU renderer. Preserve authored offsets while converting its depth.
      if (source.coordinateSystem !== THREE.WebGPUCoordinateSystem) {
        mirror.updateProjectionMatrix(); below.updateProjectionMatrix();
      }
      source.getWorldPosition(position); source.getWorldDirection(forward); rotation.extractRotation(source.matrixWorld);
      up.set(0, 1, 0).applyMatrix4(rotation); up.y *= -1;
      mirror.position.copy(position); mirror.position.y = height * 2 - position.y;
      forward.add(position); forward.y = height * 2 - forward.y;
      mirror.up.copy(up); mirror.lookAt(forward); mirror.updateMatrixWorld();
      below.position.copy(position); source.getWorldQuaternion(below.quaternion); below.updateMatrixWorld();
      applyWaterObliqueProjection(mirror, new THREE.Plane(new THREE.Vector3(0, 1, 0), -height));
      applyWaterObliqueProjection(below, new THREE.Plane(new THREE.Vector3(0, -1, 0), height));
      reflectionMatrix.copy(bias).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
      refractionMatrix.copy(bias).multiply(below.projectionMatrix).multiply(below.matrixWorldInverse);
    },
    resize(nextSize: number) {
      for (const helper of [reflector, refractor]) {
        const target = helper.getRenderTarget(); target.setSize(nextSize, nextSize);
        if (target.depthTexture) {
          target.depthTexture.image.width = nextSize; target.depthTexture.image.height = nextSize; target.depthTexture.needsUpdate = true;
        }
      }
    },
    dispose() { reflector.dispose(); refractor.dispose(); },
  };
}
