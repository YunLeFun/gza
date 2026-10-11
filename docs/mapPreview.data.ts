import { defineLoader } from 'vitepress';
import snapshot from './data/map-preview.json';
import roads from './data/map-roads.json';
import shapes from './data/map-shapes.json';
import type { PreviewData } from './.vitepress/mapPreviewData';
declare const data: PreviewData;
export { data };
export default defineLoader({ watch: ['./data/map-*.json'], load: () => ({ ...snapshot, paths: { ...roads, ...shapes } }) as PreviewData });
