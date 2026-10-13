import { defineConfig } from "vitepress";
import { fileURLToPath } from "node:url";
const siteOrigin = "https://docs.gza.yunle.fun";
const base = process.env.DOCS_BASE || "/";
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) {
  throw new Error("DOCS_BASE 必须为 / 或 /manual/ 这样的目录路径，且以 / 开头和结尾。");
}

export default defineConfig({
  lang: "zh-CN",
  title: "GZA：暴力电驴",
  titleTemplate: ":title · GZA 官方文档",
  description: "GZA：暴力电驴官方介绍与玩家手册。骑电驴穿过广州，探索城市、挑战竞速，了解世界设定、操作与存档。",
  base,
  sitemap: { hostname: siteOrigin },
  appearance: "force-dark",
  cleanUrls: false,
  metaChunk: true,
  lastUpdated: true,
  vite: {
    resolve: { alias: { "@yunlefun/dayun-kicker-coop": fileURLToPath(new URL("./game-reference/packages/dayun-kicker-coop/src/docs.ts", import.meta.url)) } },
    // esbuild 0.28 no longer lowers destructuring for legacy targets.
    // All supported documentation browsers parse it.
    esbuild: { supported: { destructuring: true } },
    optimizeDeps: {
      esbuildOptions: { supported: { destructuring: true } },
      include: [
        "three",
        "three/examples/jsm/controls/OrbitControls.js",
        "three/addons/geometries/RoundedBoxGeometry.js",
        "three/addons/utils/BufferGeometryUtils.js",
        "three/addons/environments/RoomEnvironment.js",
      ],
    },
  },
  head: [
    ["meta", { name: "theme-color", content: "#090909" }],
    ["script", { src: `${base}manual-init.js` }],
  ],
  // VitePress 1.x emits these two inline initializers even with metaChunk.
  // The equivalent local script works under the game's script-src 'self' CSP.
  transformHtml: (html) => html.replace(
    /<script id="(?:check-dark-mode|check-mac-os)">[\s\S]*?<\/script>/g,
    "",
  ),
  transformHead({ pageData, siteData }) {
    const path = pageData.relativePath.replace(/(^|\/)index\.md$/, "$1").replace(/\.md$/, ".html");
    const url = new URL(`${base}${path}`, siteOrigin).href;
    return [
      ["link", { rel: "canonical", href: url }],
      ["meta", { property: "og:url", content: url }],
      ["meta", { property: "og:title", content: `${pageData.title} · GZA：暴力电驴` }],
      ["meta", { property: "og:description", content: pageData.description || siteData.description }],
      ["meta", { property: "og:type", content: "website" }],
    ];
  },
  markdown: {
    container: {
      tipLabel: "提示",
      infoLabel: "说明",
      warningLabel: "注意",
      dangerLabel: "重要",
      detailsLabel: "展开说明",
    },
  },
  themeConfig: {
    siteTitle: "GZA / 官方文档",
    nav: [
      { text: "游戏设定", link: "/game/world", activeMatch: "/game/" },
      { text: "玩家手册", link: "/guide/quick-start", activeMatch: "/guide/" },
      { text: "客户端下载", link: "/guide/installation" },
      { text: "开始游戏", link: "https://dayun-kicker.yunle.fun/" },
      { text: "云乐坊间", link: "https://play.yunle.fun/games/dayun-kicker" },
    ],
    sidebar: [
      {
        text: "认识 GZA",
        items: [
          { text: "世界与广州", link: "/game/world" },
          { text: "角色与载具", link: "/game/characters" },
          { text: "车辆建模图鉴", link: "/vehicle-models" },
          { text: "物品图鉴", link: "/item-catalog" },
          { text: "广州地图预览", link: "/map-preview" },
          { text: "电动车皮肤", link: "/scooter-skins" },
          { text: "玩法设定", link: "/game/modes" },
        ],
      },
      {
        text: "玩家手册",
        items: [
          { text: "开始骑行", link: "/guide/quick-start" },
          { text: "操作方式", link: "/guide/controls" },
          { text: "玩法与广州街区", link: "/guide/gameplay" },
          { text: "存档与读档", link: "/guide/saves" },
          { text: "安装与版本", link: "/guide/installation" },
          { text: "常见问题", link: "/guide/faq" },
        ],
      },
      { text: "参与项目", items: [{ text: "开发与文档维护", link: "/development" }, { text: "工程文档", link: "/engineering" }, { text: "路线图", link: "/roadmap" }, { text: "AI 玩法设计（草案）", link: "/ai-gameplay" }, { text: "僵尸生存设计（草案）", link: "/zombie-survival" }, { text: "许可证", link: "/licensing" }] },
    ],
    search: {
      provider: "local",
      options: {
        miniSearch: {
          searchOptions: { prefix: true, fuzzy: 0.2 },
        },
        translations: {
          button: { buttonText: "搜索文档", buttonAriaLabel: "搜索官方文档" },
          modal: {
            displayDetails: "显示详细列表",
            resetButtonTitle: "清除搜索",
            backButtonTitle: "返回",
            noResultsText: "没有找到相关内容",
            footer: { selectText: "选择", navigateText: "切换", closeText: "关闭" },
          },
        },
      },
    },
    outline: { level: [2, 3], label: "本页内容" },
    docFooter: { prev: "上一页", next: "下一页" },
    sidebarMenuLabel: "手册目录",
    skipToContentLabel: "跳到正文",
    returnToTopLabel: "回到顶部",
    externalLinkIcon: true,
    lastUpdated: { text: "最后更新", formatOptions: { dateStyle: "medium" } },
    editLink: {
      pattern: "https://github.com/YunLeFun/gza/edit/main/docs/:path",
      text: "在 GitHub 上改进本页",
    },
    socialLinks: [{ icon: "github", link: "https://github.com/YunLeFun/gza" }],
    footer: { message: '文档文字采用 <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>；素材与品牌另行授权', copyright: "YunLeFun contributors" },
  },
});
