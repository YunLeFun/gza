import DefaultTheme from "vitepress/theme-without-fonts";
import type { Theme } from "vitepress";
import ClientDownloads from "./components/ClientDownloads.vue";
import VehicleModelGallery from "./components/VehicleModelGallery.vue";
import "../game-reference/apps/dayun-kicker/src/ui/styles/tokens.css";
import "./style.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("ClientDownloads", ClientDownloads);
    app.component("VehicleModelGallery", VehicleModelGallery);
  },
} satisfies Theme;
