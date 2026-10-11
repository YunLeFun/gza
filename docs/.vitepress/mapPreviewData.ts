export interface Point { x: number; z: number }
export interface PreviewData {
  version: string; published: boolean; snapshot: string; sourceSha256: string; geometrySha256: string; inputsSha256: string;
  inputs: { path: string; sha256: string; bytes: number }[];
  viewBox: string; center: Point; radius: number;
  paths: { roads: string; buildings: string; water: string[]; boundary: string; legacy: string };
  counts: { roads: number; buildings: number; waters: number; connectedNodes: number };
  diagnostics: { direction: string; gapMetres: number; limited: boolean }[];
  attribution: string; license: string;
}
