// SPDX-License-Identifier: Apache-2.0
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const manifestRelativePath = "assets/media-manifest.json";
const modelSourcePattern = /^assets\/map-models\/.+\.(?:blend|fbx|obj|mtl|glb|gltf|bin|ktx2|png|jpe?g|webp|avif|hdr|exr|zip)$/;
const destinationPatterns = [
  /^docs\/data\/map-(?:roads|shapes)\.json$/,
  /^apps\/dayun-kicker\/public\/maps\/canton-5km\/(?:ground-[0-4]|region)\.json$/,
  /^apps\/dayun-kicker\/public\/audio\/[a-z0-9-]+\.mp3$/,
  /^apps\/dayun-kicker\/public\/[a-z0-9-]+\.png$/,
  /^assets\/app-icon\/.+\.png$/,
  /^apps\/dayun-kicker-desktop\/build\/icons\/icon\.(?:png|icns)$/,
  /^apps\/dayun-kicker\/public\/(?:models|textures|maps)\/.+\.(?:glb|gltf|bin|ktx2|png|jpe?g|webp|avif|hdr|exr)$/,
  modelSourcePattern,
];

export function isMediaAssetPath(name) {
  return typeof name === "string" && !name.includes("\\")
    && !name.split("/").some(part => !part || part === "." || part === "..")
    && destinationPatterns.some(pattern => pattern.test(name));
}

export function mapAssetCity(name) {
  if (!isMediaAssetPath(name)) return null;
  if (name.startsWith("apps/dayun-kicker/public/maps/canton-5km/")) return "guangzhou";
  return /^(?:apps\/dayun-kicker\/public\/(?:models|textures|maps)|assets\/map-models)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/.+$/.exec(name)?.[1] ?? null;
}

export function validateMapVersion(city, version) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(city ?? "")
    || typeof version !== "string" || !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(version)) {
    throw new Error(`Invalid map city or version: ${city}/${version}`);
  }
}

export function validateMediaManifest(manifest) {
  if (manifest?.schemaVersion !== 1 || manifest.product !== "dayun-kicker"
    || typeof manifest.version !== "string" || !manifest.version.trim()
    || !Array.isArray(manifest.files) || !manifest.files.length) {
    throw new Error("Invalid dayun-kicker media manifest.");
  }
  const paths = new Set();
  const contents = new Map();
  if (manifest.mapVersions !== undefined) {
    if (!manifest.mapVersions || typeof manifest.mapVersions !== "object" || Array.isArray(manifest.mapVersions)) {
      throw new Error("Invalid pinned map versions.");
    }
    for (const [city, version] of Object.entries(manifest.mapVersions)) validateMapVersion(city, version);
  }
  for (const entry of manifest.files) {
    const name = entry?.path;
    if (!isMediaAssetPath(name) || paths.has(name)) {
      throw new Error(`Invalid or duplicate media destination: ${name}`);
    }
    paths.add(name);
    const city = mapAssetCity(name);
    if (city && manifest.mapVersions !== undefined && !Object.hasOwn(manifest.mapVersions, city)) {
      throw new Error(`Missing pinned map version: ${city}`);
    }
    // Authoring sources are restored outside public/ and never enter client packages.
    const maxBytes = (modelSourcePattern.test(name) ? 1024 : 64) * 1024 * 1024;
    if (!/^[a-f0-9]{64}$/.test(entry.sha256) || !Number.isSafeInteger(entry.bytes) || entry.bytes <= 0 || entry.bytes > maxBytes) {
      throw new Error(`Invalid media checksum or byte count: ${name}`);
    }
    const url = new URL(entry.url);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
      throw new Error(`Media URL must be permanent HTTPS without credentials: ${name}`);
    }
    const previous = contents.get(entry.sha256);
    if (previous && previous.bytes !== entry.bytes) {
      throw new Error(`Conflicting media content: ${name}`);
    }
    contents.set(entry.sha256, entry);
  }
  return manifest;
}

export async function loadMediaManifest(root = repositoryRoot) {
  return validateMediaManifest(JSON.parse(await readFile(path.join(root, manifestRelativePath), "utf8")));
}

export async function writeMediaManifest(manifest, { root = repositoryRoot, relativePath = manifestRelativePath } = {}) {
  validateMediaManifest(manifest);
  const destination = path.join(root, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
    await rename(temporary, destination);
  } finally { await rm(temporary, { force: true }); }
}

export async function sha256File(filename) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest("hex");
}

async function matches(filename, entry) {
  try {
    return (await stat(filename)).size === entry.bytes && await sha256File(filename) === entry.sha256;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function download(entry, filename, fetcher) {
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetcher(entry.url, { signal: AbortSignal.timeout(60_000) });
        if (response.status !== 429 && response.status < 500 || attempt === 2) break;
        await response.body?.cancel();
      } catch (error) {
        if (attempt === 2) throw new Error(`Media download failed: ${entry.path} (${error.cause?.code ?? error.message})`);
      }
      await setTimeout(1000 * (attempt + 1));
    }
    if (!response.ok || !response.body) throw new Error(`Media download returned HTTP ${response.status}: ${entry.path}`);
    let bytes = 0;
    const hash = createHash("sha256");
    const verify = new Transform({ transform(chunk, _encoding, done) {
      bytes += chunk.length;
      if (bytes > entry.bytes) return done(new Error(`Media byte count exceeded manifest: ${entry.path}`));
      hash.update(chunk); done(null, chunk);
    } });
    await pipeline(Readable.fromWeb(response.body), verify, createWriteStream(temporary, { flags: "wx" }));
    if (bytes !== entry.bytes || hash.digest("hex") !== entry.sha256) throw new Error(`Media SHA-256 or byte count mismatch: ${entry.path}`);
    await rename(temporary, filename);
  } finally { await rm(temporary, { force: true }); }
}

async function materialize(source, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    await copyFile(source, temporary);
    await rename(temporary, destination);
  } finally { await rm(temporary, { force: true }); }
}

export async function prepareMediaAssets({ root = repositoryRoot, cacheRoot = root, manifest, offline = false, check = false, runtimeOnly = false, fetcher = fetch } = {}) {
  manifest = validateMediaManifest(manifest ?? await loadMediaManifest(root));
  const files = manifest.files.filter(entry => !runtimeOnly || !modelSourcePattern.test(entry.path));
  const cache = path.join(cacheRoot, ".cache/dayun-media");
  const downloads = new Map();
  const result = { files: files.length, downloaded: 0, restored: 0, verified: 0 };
  for (const entry of files) {
    const destination = path.join(root, entry.path);
    if (await matches(destination, entry)) { result.verified++; continue; }
    if (check) throw new Error(`Media missing or modified: ${entry.path}. Run pnpm assets:pull.`);
    const cached = path.join(cache, entry.sha256);
    if (!downloads.has(entry.sha256)) downloads.set(entry.sha256, (async () => {
      if (!await matches(cached, entry)) {
        if (offline) throw new Error(`Media unavailable offline: ${entry.path}`);
        await download(entry, cached, fetcher); result.downloaded++;
      }
      return cached;
    })());
    await materialize(await downloads.get(entry.sha256), destination);
    result.restored++;
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2).filter(argument => argument !== "--");
  if (args.some(argument => !["--check", "--offline", "--runtime-only"].includes(argument))) {
    console.error("Usage: node scripts/media-assets.mjs [--check|--offline] [--runtime-only]"); process.exitCode = 1;
  } else {
    prepareMediaAssets({ check: args.includes("--check"), offline: args.includes("--offline"), runtimeOnly: args.includes("--runtime-only") }).then(result => {
      console.log(`Verified ${result.files} pinned media files; downloaded ${result.downloaded}, restored ${result.restored}.`);
    }).catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
