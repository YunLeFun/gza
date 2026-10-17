// Shared boundary for the original, texture-free model samples.
export function modelAssetBase(value: string): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
      || url.username || url.password || url.search || url.hash) return '';
    return url.href.replace(/\/$/, '');
  } catch { return ''; }
}

export async function verifiedModelBytes(url: string, expected: { bytes: number; sha256: string }): Promise<ArrayBuffer> {
  if (!Number.isSafeInteger(expected.bytes) || expected.bytes < 20 || expected.bytes > 8 * 1024 * 1024) throw new Error('Invalid model size');
  const response = await fetch(url, { signal: AbortSignal.timeout(10000), credentials: 'omit', redirect: 'error' });
  if (!response.ok || !response.body) throw new Error(`Model HTTP ${response.status}`);
  const reader = response.body.getReader();
  const bytes = new Uint8Array(expected.bytes);
  let received = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (received + value.byteLength > bytes.byteLength) throw new Error('Model size exceeds manifest');
      bytes.set(value, received); received += value.byteLength;
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  if (received !== expected.bytes) throw new Error('Model size mismatch');
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  if (hash !== expected.sha256) throw new Error('Model checksum mismatch');
  assertSelfContainedGlb(bytes.buffer);
  return bytes.buffer;
}

// Validate before GLTFLoader can initiate secondary requests or allocate GPU data.
export function assertSelfContainedGlb(bytes: ArrayBuffer): void {
  const view = new DataView(bytes);
  if (bytes.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67
    || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.byteLength
    || view.getUint32(16, true) !== 0x4e4f534a) throw new Error('Invalid GLB header');
  const length = view.getUint32(12, true);
  if (length % 4 || length > bytes.byteLength - 20) throw new Error('Invalid GLB JSON chunk');
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, length)));
  if (json.asset?.version !== '2.0' || json.scenes?.length !== 1
    || !json.meshes?.length || json.skins?.length || json.images?.length || json.textures?.length
    || json.buffers?.length !== 1 || json.buffers.some((buffer: { uri?: unknown }) => buffer.uri !== undefined)) {
    throw new Error('Only single-scene, texture-free, self-contained GLB samples are supported');
  }
}
