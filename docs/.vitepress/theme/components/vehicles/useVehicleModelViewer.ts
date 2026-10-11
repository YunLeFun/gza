import { nextTick, onBeforeUnmount, onMounted, readonly, shallowRef, watch, type Ref } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createVehiclePreviewModel } from "./createVehiclePreviewModel";
import { createVehiclePreviewLighting } from "./vehiclePreviewLighting";

type ViewerStatus = "loading" | "ready" | "error";

interface ViewerScene {
  load: (id: string) => Promise<void>;
  reset: () => void;
  setAutoRotate: (enabled: boolean) => void;
  dispose: () => void;
}

/** Every preview owns its GPU resources; nothing is shared with a running game. */
function disposeModel(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
    if (object instanceof THREE.InstancedMesh) object.dispose();
  });
  for (const texture of textures) {
    // Truck logos redraw their canvas after the shared SVG image loads.
    texture.userData.disposed = true;
    texture.dispose();
  }
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}

function visibleModelBounds(root: THREE.Object3D): THREE.Box3 {
  const bounds = new THREE.Box3();
  root.updateWorldMatrix(true, true);
  root.traverseVisible((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (object instanceof THREE.InstancedMesh) {
      object.computeBoundingBox();
      if (object.boundingBox) bounds.union(object.boundingBox.clone().applyMatrix4(object.matrixWorld));
    } else {
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      if (object.geometry.boundingBox) bounds.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
    }
  });
  return bounds;
}

function createViewerScene(
  canvas: HTMLCanvasElement,
  viewport: HTMLElement,
  onFailure: (message: string) => void,
  loadModel: (id: string) => Promise<THREE.Group>,
): ViewerScene {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  let lighting: ReturnType<typeof createVehiclePreviewLighting>;
  try {
    lighting = createVehiclePreviewLighting(renderer, scene);
  } catch (error) {
    // start() cannot own the scene until initialization has returned.
    renderer.dispose();
    if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
    throw error;
  }

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  // Without damping, manual input only renders when the view actually changes.
  controls.enableDamping = false;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI * 0.88;
  controls.autoRotateSpeed = 1.1;
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 0.85;

  let model: THREE.Group | undefined;
  let disposed = false;
  let inViewport = true;
  let width = 0;
  let height = 0;
  let frame = 0;
  let lastFrameTime = 0;
  let radius = 1;
  let fitDistance = 1;
  let renderCount = 0;
  const refreshTimers = new Set<number>();
  const initialDirection = new THREE.Vector3(6, 4, -8).normalize();
  const offset = new THREE.Vector3();

  function canRender(): boolean {
    return !!model && !disposed && !document.hidden && inViewport && width > 0 && height > 0;
  }

  function stopFrame(): void {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastFrameTime = 0;
  }

  function fail(message: string): void {
    if (!disposed) onFailure(message);
  }

  function renderFrame(time: number): void {
    frame = 0;
    if (!canRender()) return;
    try {
      if (controls.autoRotate) {
        const delta = lastFrameTime ? Math.min((time - lastFrameTime) / 1000, 0.05) : 1 / 60;
        controls.update(delta);
      }
      lastFrameTime = time;
      renderer.render(scene, camera);
      canvas.dataset.renderCount = String(++renderCount);
      canvas.dataset.viewAngle = controls.getAzimuthalAngle().toFixed(4);
      canvas.dataset.viewDistance = controls.getDistance().toFixed(4);
      if (controls.autoRotate) requestRender();
    } catch {
      fail("3D 预览已中断，可重试或查看模型图片。");
    }
  }

  function requestRender(): void {
    if (!frame && canRender()) frame = requestAnimationFrame(renderFrame);
  }

  function calculateFitDistance(): number {
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
    const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
    return radius / Math.sin(Math.min(vertical, horizontal)) * 1.1;
  }

  function updateCameraRange(): void {
    controls.minDistance = radius * 1.15;
    controls.maxDistance = fitDistance * 4;
    camera.near = Math.max(radius / 100, 0.001);
    camera.far = Math.max(fitDistance * 8 + radius, 100);
    camera.updateProjectionMatrix();
  }

  function reset(): void {
    if (!model || disposed) return;
    fitDistance = calculateFitDistance();
    camera.position.copy(controls.target).addScaledVector(initialDirection, fitDistance);
    camera.zoom = 1;
    updateCameraRange();
    controls.update();
    requestRender();
  }

  function resize(): void {
    const bounds = viewport.getBoundingClientRect();
    width = Math.round(bounds.width);
    height = Math.round(bounds.height);
    if (width <= 0 || height <= 0) {
      stopFrame();
      return;
    }
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (model) {
      const distanceRatio = camera.position.distanceTo(controls.target) / fitDistance;
      fitDistance = calculateFitDistance();
      offset.copy(camera.position).sub(controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(offset, fitDistance * distanceRatio);
      updateCameraRange();
      controls.update();
    } else {
      camera.updateProjectionMatrix();
    }
    requestRender();
  }

  function onVisibilityChange(): void {
    if (document.hidden) stopFrame();
    else requestRender();
  }

  function onContextLost(event: Event): void {
    event.preventDefault();
    fail("3D 显示暂时中断，可重试或查看模型图片。");
  }

  function onPointerDown(): void {
    canvas.focus({ preventScroll: true });
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!model || disposed || event.altKey || event.ctrlKey || event.metaKey) return;
    const turn = Math.PI / 24;
    offset.copy(camera.position).sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    switch (event.key) {
      case "ArrowLeft": spherical.theta -= turn; break;
      case "ArrowRight": spherical.theta += turn; break;
      case "ArrowUp": spherical.phi -= turn; break;
      case "ArrowDown": spherical.phi += turn; break;
      case "+":
      case "=": spherical.radius *= 0.9; break;
      case "-":
      case "_": spherical.radius /= 0.9; break;
      case "0":
        event.preventDefault();
        reset();
        return;
      default: return;
    }
    event.preventDefault();
    spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
    spherical.radius = THREE.MathUtils.clamp(spherical.radius, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(offset.setFromSpherical(spherical));
    controls.update();
    requestRender();
  }

  controls.addEventListener("change", requestRender);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("keydown", onKeyDown);
  document.addEventListener("visibilitychange", onVisibilityChange);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(viewport);
  const intersectionObserver = new IntersectionObserver((entries) => {
    inViewport = entries.some((entry) => entry.isIntersecting);
    if (inViewport) requestRender();
    else stopFrame();
  });
  intersectionObserver.observe(viewport);
  resize();

  return {
    async load(id) {
      const loadedModel = await loadModel(id);
      if (disposed) {
        disposeModel(loadedModel);
        return;
      }
      model = loadedModel;
      const bounds = visibleModelBounds(model);
      if (bounds.isEmpty()) throw new Error("Vehicle preview has no geometry");
      const center = bounds.getCenter(new THREE.Vector3());
      radius = Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius, 0.01);
      model.position.sub(center);
      lighting.fit(model, bounds);
      controls.target.set(0, 0, 0);
      scene.add(model);
      reset();
      // The game draws truck logos asynchronously. A few refreshes settle that
      // canvas texture without leaving an animation loop running for a still view.
      for (const delay of [100, 500, 1500]) {
        const timer = window.setTimeout(() => {
          refreshTimers.delete(timer);
          requestRender();
        }, delay);
        refreshTimers.add(timer);
      }
    },
    reset,
    setAutoRotate(enabled) {
      controls.autoRotate = enabled;
      lastFrameTime = 0;
      requestRender();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stopFrame();
      for (const timer of refreshTimers) window.clearTimeout(timer);
      refreshTimers.clear();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("keydown", onKeyDown);
      controls.removeEventListener("change", requestRender);
      controls.dispose();
      if (model) disposeModel(model);
      lighting.dispose();
      scene.clear();
      renderer.dispose();
      if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
    },
  };
}

export function useVehicleModelViewer(
  id: () => string,
  viewport: Readonly<Ref<HTMLElement | null>>,
  canvas: Readonly<Ref<HTMLCanvasElement | null>>,
  loadModel: (id: string) => Promise<THREE.Group> = createVehiclePreviewModel,
) {
  const status = shallowRef<ViewerStatus>("loading");
  const errorMessage = shallowRef("");
  const autoRotate = shallowRef(false);
  const canvasKey = shallowRef(0);
  let mounted = false;
  let generation = 0;
  let currentScene: ViewerScene | undefined;

  function releaseScene(): void {
    currentScene?.dispose();
    currentScene = undefined;
  }

  async function start(): Promise<void> {
    const requestGeneration = ++generation;
    releaseScene();
    status.value = "loading";
    errorMessage.value = "";
    autoRotate.value = false;
    canvasKey.value += 1;
    // A fresh canvas also makes a retry independent of a lost WebGL context.
    await nextTick();
    if (!mounted || requestGeneration !== generation || !canvas.value || !viewport.value) return;
    try {
      const preview = createViewerScene(canvas.value, viewport.value, (message) => {
        if (requestGeneration !== generation || !mounted) return;
        status.value = "error";
        errorMessage.value = message;
        autoRotate.value = false;
        releaseScene();
      }, loadModel);
      currentScene = preview;
      await preview.load(id());
      if (!mounted || requestGeneration !== generation || currentScene !== preview) return;
      status.value = "ready";
    } catch {
      if (!mounted || requestGeneration !== generation) return;
      errorMessage.value = currentScene
        ? "模型未能载入，可重试或查看模型图片。"
        : "当前浏览器暂时无法启动 3D 预览，可先查看模型图片。";
      status.value = "error";
      releaseScene();
    }
  }

  function toggleAutoRotate(): void {
    if (status.value !== "ready") return;
    autoRotate.value = !autoRotate.value;
    currentScene?.setAutoRotate(autoRotate.value);
  }

  onMounted(() => {
    mounted = true;
    watch(id, () => void start(), { immediate: true });
  });
  onBeforeUnmount(() => {
    mounted = false;
    generation += 1;
    releaseScene();
  });

  return {
    status: readonly(status),
    errorMessage: readonly(errorMessage),
    autoRotate: readonly(autoRotate),
    canvasKey: readonly(canvasKey),
    reset: () => currentScene?.reset(),
    retry: () => void start(),
    toggleAutoRotate,
  };
}
