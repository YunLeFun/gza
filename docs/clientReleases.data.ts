import { fileURLToPath } from "node:url";
import { defineLoader } from "vitepress";
import release from "./.vitepress/game-reference/assets/desktop-releases/preview/latest.json";
import { clientDistribution, clientDownloads } from "./.vitepress/game-reference/apps/dayun-kicker/src/config/clientDownloads";
import type { ClientDownload } from "./.vitepress/game-reference/apps/dayun-kicker/src/config/clientDownloads";

export interface ClientReleaseData {
  provider: "cos" | "steam";
  steamUrl: string | null;
  releaseVersion: string;
  entries: ClientDownload[];
}

declare const data: ClientReleaseData;
export { data };

const targets = {
  "windows-x64": { platform: "win", arch: "x64" },
  "macos-arm64": { platform: "mac", arch: "arm64" },
  "linux-x64": { platform: "linux", arch: "x64" },
} as const;

export default defineLoader({
  watch: [
    fileURLToPath(new URL("./.vitepress/game-reference/assets/desktop-releases/preview/latest.json", import.meta.url)),
    fileURLToPath(new URL("./.vitepress/game-reference/apps/dayun-kicker/src/config/clientDownloads.ts", import.meta.url)),
  ],
  load(): ClientReleaseData {
    return {
      provider: clientDistribution.provider,
      steamUrl: clientDistribution.steamUrl,
      releaseVersion: release.releaseVersion,
      entries: clientDownloads.map((entry) => {
        const target = targets[entry.id];
        const artifact = release.artifacts.find(
          (item) => item.platform === target.platform && item.arch === target.arch,
        );
        return {
          ...entry,
          release: artifact ? {
            url: artifact.url,
            version: release.releaseVersion,
            bytes: artifact.bytes,
            sha256: artifact.sha256,
          } : null,
        };
      }),
    };
  },
});
