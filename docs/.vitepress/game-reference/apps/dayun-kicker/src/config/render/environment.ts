import type { EnvironmentTheme } from "../../game/types";

export const ROAD_WIDTH = 14.2;
export const ROAD_LENGTH = 940;
export const PROP_WRAP_LENGTH = 760;
export const PROP_REAR_DISTANCE = 150;

export interface EnvironmentThemePreset {
  skyTop: string;
  skyMiddle: string;
  skyHorizon: string;
  skyLower: string;
  fog: string;
  ground: string;
  road: string;
  shoulder: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sunColor: string;
  sunIntensity: number;
  shadowIntensity: number;
  celestialColor: string;
  celestialPosition: [number, number, number];
  lampIntensity: number;
  mountain: string;
  skyline: string;
  exposure: number;
}

export const THEME_PRESETS: Record<EnvironmentTheme, EnvironmentThemePreset> = {
  day: {
    skyTop: "#58a8cf",
    skyMiddle: "#9bc6d5",
    skyHorizon: "#c7e0e4",
    skyLower: "#f3d5a5",
    fog: "#b4ced0",
    ground: "#46653d",
    road: "#444d53",
    shoulder: "#41483f",
    hemiSky: "#e7f8ff",
    hemiGround: "#657477",
    hemiIntensity: 1.65,
    sunColor: "#fff4cf",
    sunIntensity: 2.05,
    shadowIntensity: 0.78,
    celestialColor: "#fff2bc",
    celestialPosition: [-92, 155, -330],
    lampIntensity: 0.35,
    mountain: "#89a6a3",
    skyline: "#7b969c",
    exposure: 1,
  },
  sunset: {
    skyTop: "#43566e",
    skyMiddle: "#9b9297",
    skyHorizon: "#dab08a",
    skyLower: "#edc790",
    fog: "#a39188",
    ground: "#3f4933",
    road: "#47434b",
    shoulder: "#3d3a36",
    hemiSky: "#c6cbd5",
    hemiGround: "#555653",
    hemiIntensity: 1.35,
    sunColor: "#ffe0b1",
    sunIntensity: 1.3,
    shadowIntensity: 0.5,
    celestialColor: "#ffcc73",
    celestialPosition: [92, 70, -320],
    lampIntensity: 1.55,
    mountain: "#493f51",
    skyline: "#55424a",
    exposure: 1.04,
  },
  night: {
    skyTop: "#061326",
    skyMiddle: "#14283b",
    skyHorizon: "#18364b",
    skyLower: "#294d55",
    fog: "#162b38",
    ground: "#15261f",
    road: "#444c52",
    shoulder: "#202b2a",
    hemiSky: "#b2c9df",
    hemiGround: "#202733",
    hemiIntensity: 1.25,
    sunColor: "#bdd5ec",
    sunIntensity: 1.15,
    shadowIntensity: 0.48,
    celestialColor: "#d8e9ff",
    celestialPosition: [-86, 110, -320],
    lampIntensity: 3.2,
    mountain: "#142536",
    skyline: "#101c2b",
    exposure: 0.96,
  },
};

export const HEADLAMP_INTENSITY = 220;
export const SCOOTER_LIGHT_LEVEL: Readonly<Record<EnvironmentTheme, number>> = {
  day: 0,
  sunset: 0.45,
  night: 1,
};

export const PRESENTATION_GLOW: Readonly<Record<EnvironmentTheme, number>> = {
  day: 0.08,
  sunset: 0.18,
  night: 0.24,
};

/** Painted surfaces share a restrained port-town palette; safety accents stay warm. */
export const HARBOR_COLORS = {
  cream: "#e8dfc4", teal: "#438f88", coral: "#ca6b51", navy: "#233d46",
  ochre: "#d2a353", brick: "#ab5847", pavement: "#bab6a1", sand: "#939881",
  leaf: "#527b68", sea: "#39868c",
} as const;
