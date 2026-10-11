/** Navigation identities, distinct from the ODbL geometry in the district extract.
 * Coordinates below are WGS84 points beside the corresponding OSM footprints.
 * Navigation points are street-side art references, not surveyed entrance locations.
 */
export const PAZHOU_HOSPITAL_SITE_ID = 297014565;

export const PAZHOU_BUILDINGS = {
  tencentSouth: 1396846660,
  tencentNorth: 699687124,
  joyy: 1396804443,
  alibabaSouth: 845986507,
  alibabaNorth: 845986509,
  xiaomiSouth: 845998551,
  xiaomiNorth: 845998545,
  xiaomiPodium: 845998549,
  vipshopWest: 846152826,
  vipshopSouth: 846152827,
  vipshopPodium: 846152825,
  gomeWest: 845998546,
  gomeEast: 1302529228,
  gomeWestPodium: 1458987441,
  gomeEastPodium: 1458987442,
  tclWest: 846628469,
  tclEast: 846628470,
  hospitalCentral: 412886253,
  hospitalSouth: 412886254,
  hospitalStreet: 412886256,
} as const;

export const PAZHOU_PLACES = [
  { id: "gd2h", name: "广东省第二人民医院 · 琶洲院区", lon: 113.32820, lat: 23.09827,
    address: "新港中路466号大院", building: PAZHOU_BUILDINGS.hospitalStreet },
  { id: "tencent", name: "腾讯广州大厦", lon: 113.34112, lat: 23.10734,
    building: PAZHOU_BUILDINGS.tencentSouth },
  { id: "joyy", name: "欢聚大厦", lon: 113.33997, lat: 23.10726,
    building: PAZHOU_BUILDINGS.joyy },
  { id: "alibaba", name: "阿里巴巴华南运营中心", lon: 113.34255, lat: 23.10745,
    building: PAZHOU_BUILDINGS.alibabaSouth },
  { id: "xiaomi", name: "小米广州大厦", lon: 113.33963, lat: 23.10552,
    building: PAZHOU_BUILDINGS.xiaomiSouth },
  { id: "vipshop", name: "唯品会总部大厦", lon: 113.34383, lat: 23.10773,
    building: PAZHOU_BUILDINGS.vipshopSouth },
  { id: "gome", name: "国美 · 智慧城", lon: 113.34185, lat: 23.10575,
    building: PAZHOU_BUILDINGS.gomeEast },
  { id: "tcl", name: "TCL 琶洲大厦", lon: 113.33687, lat: 23.10832,
    building: PAZHOU_BUILDINGS.tclEast },
] as const;
