import catalog from '../../../../data/model-catalog.json';
export const MODEL_CATALOG = catalog.models;
export type ModelSample = typeof MODEL_CATALOG[number];
declare const __MODEL_CATALOG_BASE__: string;
export const modelCatalogBase = __MODEL_CATALOG_BASE__;
export const modelUrl = (item: ModelSample, file = item.file) => modelCatalogBase
  ? `${modelCatalogBase.replace(/\/$/, '')}/${item.package}/${file}` : '';
