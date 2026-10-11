/** The WebGL path only loads this small bridge. Shader nodes arrive after a
 * primary WebGPU device has initialized, before that scene builds materials.
 */
type NodeMaterials = typeof import("./nodeMaterialsRuntime");
let runtime: NodeMaterials | undefined;
let enabled = false;
let generation = 0;

export async function activateNodeMaterials() {
  const token = ++generation;
  runtime ??= await import("./nodeMaterialsRuntime");
  if (generation === token) enabled = true;
}

export function deactivateNodeMaterials() { generation++; enabled = false; }
export function getNodeMaterials(): NodeMaterials | undefined { return enabled ? runtime : undefined; }
