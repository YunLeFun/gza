// SPDX-License-Identifier: Apache-2.0
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMediaAssetPath, loadMediaManifest, mapAssetCity, repositoryRoot, sha256File, validateMapVersion, validateMediaManifest, writeMediaManifest } from "./media-assets.mjs";

const contentTypes = {
  ".mp3": "audio/mpeg", ".png": "image/png", ".icns": "image/icns",
  ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".ktx2": "image/ktx2",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
  ".hdr": "image/vnd.radiance", ".exr": "image/x-exr", ".obj": "text/plain", ".mtl": "text/plain", ".zip": "application/zip",
};

export function contentTypeForPath(filename) {
  return filename.endsWith(".tar.gz") ? "application/gzip" : filename.endsWith(".json") ? "application/json" : contentTypes[path.extname(filename)] ?? "application/octet-stream";
}

// Installation archives use this publisher, but never become runtime media restored by assets:pull.
export function isDesktopReleaseAssetPath(filename) {
  return /^apps\/dayun-kicker-desktop\/release\/(?:[a-zA-Z0-9._-]+\/)*GZA-\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?-(?:mac|win|linux)-(?:arm64|x64)\.(?:zip|tar\.gz)$/.test(filename)
    && !filename.split("/").some(part => part === "." || part === "..");
}

export function cosCall(cos, bucket, region, method, params = {}) {
  return new Promise((resolve, reject) => {
    if (typeof cos?.[method] !== "function") return reject(new Error(`COS provider does not support ${method}.`));
    cos[method]({ Bucket: bucket, Region: region, ...params }, (error, result) => error ? reject(error) : resolve(result));
  });
}

export function publicObjectUrl(bucket, region, key) {
  if (!/^[a-z0-9-]+-\d+$/.test(bucket ?? "") || !/^[a-z]+-[a-z]+(?:-\d+)?$/.test(region ?? "")
    || !/^dayun-kicker\/[a-zA-Z0-9/._-]+$/.test(key ?? "") || key.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error("Invalid COS bucket, region or object key.");
  }
  return `https://${bucket}.cos.${region}.myqcloud.com/${key}`;
}

export async function createCosProvider(env = process.env) {
  const { TENCENT_COS_SECRET_ID: SecretId, TENCENT_COS_SECRET_KEY: SecretKey, TENCENT_COS_TOKEN: SecurityToken,
    TENCENT_COS_BUCKET: bucket, TENCENT_COS_REGION: region } = env;
  if (!SecretId || !SecretKey) throw new Error("Provide COS credentials through the publishing environment.");
  publicObjectUrl(bucket, region, "dayun-kicker/check");
  const { default: COS } = await import("cos-nodejs-sdk-v5");
  return { cos: new COS({ SecretId, SecretKey, ...(SecurityToken ? { SecurityToken } : {}) }), bucket, region };
}

export async function verifyPublicObject(response, entry) {
  if (!response.ok || !response.body) throw new Error(`Published media is not readable: HTTP ${response.status} (${entry.path ?? entry.name})`);
  let bytes = 0;
  const hash = createHash("sha256");
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > entry.bytes) throw new Error(`Published media exceeds expected size: ${entry.path ?? entry.name}`);
    hash.update(chunk);
  }
  if (bytes !== entry.bytes || hash.digest("hex") !== entry.sha256) throw new Error(`Published media verification failed: ${entry.path ?? entry.name}`);
}

/** Private buckets can return anonymous 403 even for missing public-object keys. */
export async function readPublicResponse(url, { fetcher = fetch, optional = false, cos, bucket, region, key } = {}) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(60_000) });
  if (optional && response.status === 404) return null;
  if (optional && response.status === 403 && cos) {
    if (!key || publicObjectUrl(bucket, region, key) !== url) throw new Error("Authenticated missing-object probe must match the exact public COS object URL.");
    await response.body?.cancel?.();
    try { await cosCall(cos, bucket, region, "headObject", { Key: key }); }
    catch (error) {
      if (error.statusCode === 404 || error.code === "NoSuchKey") return null;
      throw new Error(`Cannot establish whether COS object is missing (${key}); authenticated HEAD was denied or failed.`, { cause: error });
    }
    throw new Error(`Existing COS object is not anonymously readable: HTTP 403 (${key}); its ACL was not changed.`);
  }
  return response;
}

export async function publishPublicObject({ cos, bucket, region, key, filename, body, entry, fetcher = fetch, reuse = false,
  immutable = true, forbidOverwrite = false, cacheControl = immutable ? "public, max-age=31536000, immutable" : "public, max-age=60" }) {
  const url = publicObjectUrl(bucket, region, key);
  const request = () => fetcher(url, { signal: AbortSignal.timeout(60_000) });
  if (reuse) {
    const existing = await readPublicResponse(url, { fetcher, optional: true, cos, bucket, region, key });
    if (existing) { await verifyPublicObject(existing, entry); return { ...entry, url }; }
  }
  try {
    await cosCall(cos, bucket, region, "putObject", {
      Key: key, Body: filename ? createReadStream(filename) : body, ContentLength: entry.bytes,
      ContentType: contentTypeForPath(entry.path ?? entry.name ?? key), ACL: "public-read", CacheControl: cacheControl,
      Headers: { "x-cos-meta-sha256": entry.sha256, "x-cos-meta-project": "dayun-kicker", ...(forbidOverwrite ? { "x-cos-forbid-overwrite": "true" } : {}) },
    });
  } catch (error) {
    if (!forbidOverwrite || !(error.statusCode === 409 || error.code === "ObjectAlreadyExists")) throw error;
  }
  await verifyPublicObject(await request(), entry);
  return { ...entry, url };
}

export async function readPublicJson(url, { maxBytes = 256 * 1024, ...options } = {}) {
  const response = await readPublicResponse(url, options);
  if (!response) return null;
  if (!response.ok || !response.body) throw new Error(`Cannot read publication manifest: HTTP ${response.status}.`);
  const chunks = []; let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > maxBytes) throw new Error("Publication manifest exceeds its size limit.");
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function writeJsonAtomic(filename, value) {
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, JSON.stringify(value, null, 2) + "\n", { flag: "wx" }); await rename(temporary, filename); }
  finally { await rm(temporary, { force: true }); }
}

/** A channel lock, never a bucket policy mutation. Suspended versioning is unsafe too. */
export async function withCosPublicationLock({ cos, bucket, region, key, attempts = 100, delayMs = 100 }, work) {
  const versioning = await cosCall(cos, bucket, region, "getBucketVersioning");
  const status = versioning.VersioningConfiguration?.Status;
  if (status === "Enabled" || status === "Suspended") throw new Error("Safe publication locking requires a bucket that has never enabled versioning; no bucket configuration was changed.");
  const owner = randomUUID(), body = Buffer.from(JSON.stringify({ owner }));
  let acquired = false;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      await cosCall(cos, bucket, region, "putObject", { Key: key, Body: body, ContentLength: body.length, ContentType: "application/json", ACL: "private", Headers: { "x-cos-forbid-overwrite": "true" } });
      acquired = true; break;
    } catch (error) {
      if (!(error.statusCode === 409 || error.code === "ObjectAlreadyExists")) throw error;
      if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  if (!acquired) throw new Error(`Publication channel is locked (${key}); inspect the existing publisher before removing a stale lock.`);
  try { return await work(); }
  finally {
    const lock = await cosCall(cos, bucket, region, "getObject", { Key: key });
    if (JSON.parse(Buffer.from(lock.Body).toString("utf8")).owner !== owner) throw new Error("Publication lock ownership changed; refusing to delete it.");
    await cosCall(cos, bucket, region, "deleteObject", { Key: key });
  }
}

export async function mediaFiles(root) {
  const files = [];
  async function walk(directory, optional = false) {
    let entries;
    try { entries = await readdir(path.join(root, directory), { withFileTypes: true }); }
    catch (error) { if (optional && error.code === "ENOENT") return; throw error; }
    for (const entry of entries) {
      const name = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await walk(name);
      else if (entry.isFile() && isMediaAssetPath(name)) files.push(name);
    }
  }
  for (const directory of ["apps/dayun-kicker/public", "assets/app-icon", "apps/dayun-kicker-desktop/build/icons", "docs/data"]) await walk(directory, true);
  await walk("assets/map-models", true);
  return files.sort();
}

export function mediaObjectKey(entry, mapVersions = {}) {
  const city = mapAssetCity(entry.path);
  if (!city) return `dayun-kicker/media/v1/${entry.sha256}${path.extname(entry.path)}`;
  const version = mapVersions[city];
  validateMapVersion(city, version);
  const kind = entry.path.startsWith("assets/map-models/") ? "sources" : "runtime";
  return `dayun-kicker/maps/${city}/${version}/${kind}/${entry.sha256}${path.extname(entry.path)}`;
}

export async function publishFile({ cos, bucket, region, filename, entry, mapVersions, fetcher = fetch }) {
  const key = mediaObjectKey(entry, mapVersions);
  return publishPublicObject({ cos, bucket, region, key, filename, entry, fetcher });
}

export async function publishMediaAssets({ root = repositoryRoot, cos, bucket, region, version, mapVersions = {}, fetcher = fetch }) {
  if (!/^[a-z0-9-]+-\d+$/.test(bucket ?? "") || !/^[a-z]+-[a-z]+(?:-\d+)?$/.test(region ?? "") || !version?.trim()) {
    throw new Error("A COS bucket, region and resource version are required.");
  }
  const contents = new Map(), files = [], inputs = [];
  for (const name of await mediaFiles(root)) {
    const filename = path.join(root, name);
    const entry = { path: name, bytes: (await stat(filename)).size, sha256: await sha256File(filename) };
    inputs.push(entry);
  }
  let previous;
  try { previous = await loadMediaManifest(root); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  // Keep the per-file rights and provenance when republishing pinned documentation data.
  for (const entry of inputs) {
    const prior = previous?.files.find(file => file.path === entry.path);
    for (const field of ["license", "generation"]) {
      if (prior?.[field] !== undefined) entry[field] = prior[field];
    }
  }
  const cities = [...new Set(inputs.map(entry => mapAssetCity(entry.path)).filter(Boolean))].sort();
  const pinnedMaps = Object.fromEntries(cities.map(city => {
    const mapVersion = Object.hasOwn(mapVersions, city) ? mapVersions[city] : previous?.mapVersions?.[city];
    if (!mapVersion) throw new Error(`Provide --map-version ${city}=<map-version> when first publishing a city.`);
    validateMapVersion(city, mapVersion);
    return [city, mapVersion];
  }));
  for (const city of Object.keys(mapVersions)) {
    if (!cities.includes(city)) throw new Error(`No local map assets for ${city}. Use public/models/<city>/ or assets/map-models/<city>/.`);
  }
  // Validate every destination before publishing anything.
  const draft = validateMediaManifest({ schemaVersion: 1, product: "dayun-kicker", version,
    ...(cities.length ? { mapVersions: pinnedMaps } : {}),
    files: inputs.map(entry => ({ ...entry, url: `https://${bucket}.cos.${region}.myqcloud.com/${mediaObjectKey(entry, pinnedMaps)}` })) });
  const archives = cities.map(city => ({
    filename: path.join(root, "assets/maps", city, `${pinnedMaps[city]}.json`),
    manifest: validateMediaManifest({ schemaVersion: 1, product: "dayun-kicker", version: pinnedMaps[city], city,
      mapVersions: { [city]: pinnedMaps[city] }, files: draft.files.filter(entry => mapAssetCity(entry.path) === city) }),
  }));
  async function checkArchive(archive) {
    try {
      const existing = JSON.parse(await readFile(archive.filename, "utf8"));
      if (JSON.stringify(existing) !== JSON.stringify(archive.manifest)) {
        throw new Error(`Map version already published with different assets: ${archive.manifest.city}/${archive.manifest.version}. Choose a new --map-version.`);
      }
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  for (const archive of archives) await checkArchive(archive);
  for (const entry of inputs) {
    const filename = path.join(root, entry.path);
    const key = mediaObjectKey(entry, pinnedMaps);
    if (!contents.has(key)) {
      contents.set(key, await publishFile({ cos, bucket, region, filename, entry, mapVersions: pinnedMaps, fetcher }));
      console.log(`Published and verified ${entry.path}`);
    }
    files.push({ ...entry, url: contents.get(key).url });
  }
  const manifest = validateMediaManifest({ ...draft, files });
  for (const archive of archives) {
    await mkdir(path.dirname(archive.filename), { recursive: true });
    try { await writeFile(archive.filename, JSON.stringify(archive.manifest, null, 2) + "\n", { flag: "wx" }); }
    catch (error) { if (error.code !== "EEXIST") throw error; await checkArchive(archive); }
  }
  await writeMediaManifest(manifest, { root });
  console.log(`Pinned ${files.length} paths to ${contents.size} unique COS objects.`);
  return manifest;
}

export function parsePublishArgs(args) {
  args = args.filter(argument => argument !== "--");
  const version = args[0], mapVersions = {};
  if (!version || version.startsWith("--")) throw new Error("Usage: pnpm assets:publish <resource-version> [--map-version <city>=<map-version>]");
  for (let i = 1; i < args.length; i += 2) {
    const match = args[i + 1]?.match(/^([^=]+)=([^=]+)$/);
    if (args[i] !== "--map-version" || !match) throw new Error("Expected --map-version <city>=<map-version>.");
    validateMapVersion(match[1], match[2]);
    if (Object.hasOwn(mapVersions, match[1])) throw new Error(`Duplicate map version: ${match[1]}`);
    mapVersions[match[1]] = match[2];
  }
  return { version, mapVersions };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (async () => {
    const options = parsePublishArgs(process.argv.slice(2));
    await publishMediaAssets({ ...await createCosProvider(), ...options });
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
