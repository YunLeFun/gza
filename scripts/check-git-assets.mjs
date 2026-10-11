import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const relativePath = name => typeof name === "string" && name.length > 0 && !name.includes("\\")
  && !name.startsWith("/") && !name.split("/").some(part => !part || part === "." || part === "..");

export function validateGitAssetPolicy(policy) {
  if (policy?.schemaVersion !== 1 || !relativePath(policy.manifestPath)
    || ![policy.maxBlobBytes, policy.maxBinaryBytes, policy.maxSvgBytes].every(value => Number.isSafeInteger(value) && value > 0)
    || policy.maxBinaryBytes > policy.maxBlobBytes || policy.maxSvgBytes > policy.maxBlobBytes
    || !Array.isArray(policy.mediaExtensions) || !policy.mediaExtensions.length
    || policy.mediaExtensions.some(ext => typeof ext !== "string" || !/^\.[a-z0-9]+$/.test(ext))
    || !Array.isArray(policy.exceptions)) throw new Error("Invalid Git asset policy.");
  const paths = new Set();
  for (const entry of policy.exceptions) {
    if (!relativePath(entry?.path) || entry.path.includes("*") || entry.path.includes("?") || paths.has(entry.path) || typeof entry.reason !== "string" || !entry.reason.trim()
      || !Number.isSafeInteger(entry.maxBytes) || entry.maxBytes <= 0 || entry.maxBytes > policy.maxBinaryBytes) {
      throw new Error("Asset exceptions require a unique exact path, a reason, and a bounded byte count.");
    }
    paths.add(entry.path);
  }
  return policy;
}

function git(root, args, options = {}) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024, ...options });
}

function indexEntries(root) {
  return git(root, ["ls-files", "--stage", "-z"]).split("\0").filter(Boolean).map(record => {
    const tab = record.indexOf("\t"), header = record.slice(0, tab).split(" ");
    if (tab < 0 || header[2] !== "0") throw new Error("Resolve Git index conflicts before checking assets.");
    return { oid: header[1], path: record.slice(tab + 1), source: "index", mode: header[0] };
  }).filter(entry => entry.mode !== "160000");
}

function historyEntries(root, base, revision) {
  const baseOid = git(root, ["rev-parse", "--verify", "--end-of-options", `${base}^{commit}`]).trim();
  const headOid = git(root, ["rev-parse", "--verify", "--end-of-options", `${revision}^{commit}`]).trim();
  if (!/^[a-f0-9]{40,64}$/.test(baseOid) || !/^[a-f0-9]{40,64}$/.test(headOid)) throw new Error("Invalid asset audit revision.");
  const objects = new Set(git(root, ["rev-list", "--objects", "--no-object-names", headOid, `^${baseOid}`]).trim().split("\n"));
  // Raw, NUL-delimited paths retain spaces, tabs, newlines and Unicode. Inspect
  // every commit, including merge parents, so add-then-delete cannot hide a blob.
  const records = git(root, ["log", "--raw", "-z", "--no-abbrev", "--format=", "--no-renames", "--diff-merges=separate", `${baseOid}..${headOid}`, "--"]).split("\0");
  const entries = [];
  for (let i = 0; i < records.length; i++) {
    const match = records[i].trim().match(/^:[0-7]{6} [0-7]{6} [a-f0-9]{40,64} ([a-f0-9]{40,64}) ([A-Z])$/);
    if (match) {
      const name = records[++i];
      if ("AMT".includes(match[2]) && objects.has(match[1])) entries.push({ oid: match[1], path: name, source: "history" });
    }
  }
  return entries;
}

export async function checkGitAssets({ root = repositoryRoot, policyPath = "assets/git-asset-policy.json", base, revision = "HEAD" } = {}) {
  if (!relativePath(policyPath)) throw new Error("Policy path must be relative to the repository.");
  const policy = validateGitAssetPolicy(JSON.parse(await readFile(path.join(root, policyPath), "utf8")));
  const manifest = JSON.parse(await readFile(path.join(root, policy.manifestPath), "utf8"));
  if (!Array.isArray(manifest.files) || manifest.files.some(entry => !relativePath(entry?.path))) throw new Error("Invalid pinned media paths.");
  const pinned = new Set(manifest.files.map(entry => entry.path));
  const extensions = new Set(policy.mediaExtensions), exceptions = new Map(policy.exceptions.map(entry => [entry.path, entry]));
  const entries = [...indexEntries(root), ...(base ? historyEntries(root, base, revision) : [])];
  const unique = [...new Map(entries.map(entry => [`${entry.source}:${entry.path}:${entry.oid}`, entry])).values()];
  const oids = [...new Set(unique.map(entry => entry.oid))], metadata = new Map();
  if (oids.length) {
    for (const line of git(root, ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"], { input: oids.join("\n") + "\n" }).trim().split("\n")) {
      const [oid, type, bytes] = line.split(" ");
      if (type !== "blob" || !Number.isSafeInteger(Number(bytes))) throw new Error(`Cannot inspect Git blob ${oid}.`);
      metadata.set(oid, Number(bytes));
    }
  }
  const binary = new Map(), violations = [];
  for (const entry of unique) {
    const bytes = metadata.get(entry.oid), extension = path.posix.extname(entry.path).toLowerCase(), exception = exceptions.get(entry.path);
    let reason;
    if (pinned.has(entry.path)) reason = "COS manifest media must remain untracked";
    else if (exception) { if (bytes > exception.maxBytes) reason = `exception exceeds ${exception.maxBytes} bytes`; }
    else if (extensions.has(extension)) reason = "media/archive/build artifact belongs outside Git";
    else if (bytes > policy.maxBlobBytes) reason = `blob exceeds ${policy.maxBlobBytes} bytes`;
    else if (extension === ".svg" && bytes > policy.maxSvgBytes) reason = `SVG exceeds ${policy.maxSvgBytes} bytes`;
    else if (bytes > policy.maxBinaryBytes) {
      if (!binary.has(entry.oid)) {
        const body = git(root, ["cat-file", "blob", entry.oid], { encoding: null, maxBuffer: policy.maxBlobBytes + 1024 });
        binary.set(entry.oid, body.subarray(0, 8000).includes(0));
      }
      if (binary.get(entry.oid)) reason = `binary blob exceeds ${policy.maxBinaryBytes} bytes`;
    }
    if (reason) violations.push({ ...entry, bytes, reason });
  }
  return { indexFiles: unique.filter(entry => entry.source === "index").length,
    historyBlobs: unique.filter(entry => entry.source === "history").length, violations };
}

export function parseGitAssetArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = { "--base": "base", "--revision": "revision", "--policy": "policyPath", "--root": "root" }[args[i]];
    if (!key || !args[i + 1] || args[i + 1].startsWith("--") || Object.hasOwn(options, key)) {
      throw new Error("Usage: node scripts/check-git-assets.mjs [--base <ref>] [--revision <ref>] [--policy <path>] [--root <directory>]");
    }
    options[key] = args[i + 1];
  }
  if (options.revision && !options.base) throw new Error("--revision requires --base.");
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  Promise.resolve().then(() => checkGitAssets(parseGitAssetArgs(process.argv.slice(2).filter(arg => arg !== "--")))).then(result => {
    for (const issue of result.violations) console.error(`${issue.source}: ${JSON.stringify(issue.path)} (${issue.bytes} bytes): ${issue.reason}`);
    if (result.violations.length) {
      console.error("Keep media in COS and commit its manifest, checksum and license. If a blob was already committed, remove it from the outgoing commit history; deleting the current file is insufficient.");
      process.exitCode = 1;
    } else console.log(`Git asset policy passed: ${result.indexFiles} index files, ${result.historyBlobs} outgoing history blobs.`);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
