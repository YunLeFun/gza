export interface ClientRelease {
  /** Public, permanent HTTPS installer URL; authenticated CI artifacts do not qualify. */
  url: string;
  version: string;
  bytes: number;
  sha256: string;
}

export interface ClientDownload {
  id: "windows-x64" | "macos-arm64" | "linux-x64";
  platform: string;
  architecture: string;
  release: ClientRelease | null;
}

export const CLIENT_DOWNLOAD_PATH = "/download.html";
export const CLIENT_RELEASE_ORIGIN = "https://yunlefun-assets-prod-1325586649.cos.ap-shanghai.myqcloud.com";

export interface ClientDistributionConfig {
  provider: "cos" | "steam";
  manifestUrl: string;
  /** Set the real public store URL before changing provider to steam. */
  steamUrl: string | null;
}

export const clientDistribution: Readonly<ClientDistributionConfig> = {
  provider: "cos",
  manifestUrl: `${CLIENT_RELEASE_ORIGIN}/dayun-kicker/releases/preview/latest.json`,
  steamUrl: null,
};

/** Platform labels remain available while the public catalog is loading. */
export const clientDownloads: readonly ClientDownload[] = [
  { id: "windows-x64", platform: "Windows", architecture: "Intel / AMD 64 位", release: null },
  { id: "macos-arm64", platform: "macOS", architecture: "Apple 芯片", release: null },
  { id: "linux-x64", platform: "Linux", architecture: "Intel / AMD 64 位", release: null },
];
