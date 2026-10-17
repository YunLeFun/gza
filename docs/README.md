# GZA 文档维护

公开文档的唯一维护位置是 [YunLeFun/gza](https://github.com/YunLeFun/gza) 的 `docs/`。正式入口保持 [docs.gza.yunle.fun](https://docs.gza.yunle.fun/)。游戏与桌面客户端源码暂时留在私有 `dayun-kicker`；文档独立安装、检查和构建，无需读取私有仓库或提供任何云服务凭证。

```sh
pnpm install --frozen-lockfile
pnpm docs:dev
pnpm docs:typecheck
pnpm docs:build
pnpm docs:preview
```

`docs/game/` 保存设定，`docs/guide/` 保存玩家手册，根目录与 `releases/` 保存经过整理的工程说明和历史验证记录。设计草案与未来计划不代表已经发布的玩法；发布记录中的测试结论只适用于记录的版本。

最新讨论基线见 [Steam Demo v0.1 · 剧情与开发计划](steam-demo-v0.1.md)，记录五幕双世界方案、暂定 3D 美术方向、现有 Godot 复用范围与首个垂直切片，不替代已交付功能的验收记录。

开发执行清单统一在 [游戏开发待办](development-backlog.md)维护，记录稳定任务 ID、优先级、依赖和验收状态；`dayun-kicker/docs/development-backlog.md` 只留入口，源码与实现 PR 仍在原仓库，不复制第二份清单。

持续迭代的剧情灵感见[大云身世与剧情灵感草案](story-dayun-ideas.md)（含后续方向剧透）。候选设定与当前游戏实现分开标注，游戏仓库引用此处，不重复维护。

VitePress 配置、主题和展示组件在 `.vitepress/`；保留原有 UI token、基础组件、Reka Dialog、中文本地搜索和按需 3D 预览。`game-reference/` 是文档所需的程序模型、配置与类型的受控源码快照，不包含完整游戏、服务器入口或 SDK。来源路径、工作区状态、字节数和 SHA-256 记录在 `data/game-reference.json`。参考源码的原创程序部分采用 Apache-2.0，OSM 数据与品牌图形分别按原许可处理。

地图预览从游戏发布地图与实际合成算法导出，按道路、面状地物和版本元数据分别保存于 `data/map-*.json`。文档构建检查快照校验值、版本、发布状态与来源署名，不下载或合成整套游戏地图。页面展示固定快照，不声称与线上游戏实时一致。更新游戏模型、皮肤、物品或下载清单后，按[文档数据同步](reference-sync.md)审核并更新快照；不要直接改生成数据冒充新的游戏版本。

车辆与皮肤 SVG 仍是程序模型生成的静态展示图。素材与品牌边界见[许可证](licensing.md)。构建产物、缓存、日志与媒体原稿不得提交。

## EdgeOne 部署

沿用已有项目、证书、域名与部署历史，只将 Git 来源切换为公开 `YunLeFun/gza`。

| 配置 | 值 |
| --- | --- |
| 项目 | `yunlefun-gza-docs-git` / `makers-kugwd1xthzcp` |
| 仓库 / 生产分支 | `YunLeFun/gza` / `main` |
| 根目录 | `docs` |
| 安装 | `npx --yes pnpm@11.10.0 install --frozen-lockfile` |
| 构建 | `npx --yes pnpm@11.10.0 run typecheck && npx --yes pnpm@11.10.0 run build` |
| 输出 | `.vitepress/dist` |
| Node.js | `22.21.1` |
| 域名 | `docs.gza.yunle.fun` |
| CNAME | `docs.gza.yunle.fun.pages.dnsoe5.com` |

平台读取 `docs/edgeone.json`；保留静态站点安全头、HTTPS 和 HTTP 301 跳转。根锁文件与 pnpm workspace 一并提交，日常更新推送后由 Git 集成自动部署。GitHub Actions 独立验证文档，不保存 artifact，不读取 `PRIVATE_SOURCE_TOKEN`。

默认 `DOCS_BASE=/`。需要在游戏安装包或其他站点的 `/manual/` 下使用时，用 `DOCS_BASE=/manual/ pnpm docs:build` 生成对应路径，再复制整个站点。canonical 和 sitemap 的正式域名保持不变。VitePress 1.6.4 与 Vite 6.4.3 固定版本，保留 `metaChunk` 和本地 `manual-init.js`，不放宽 `script-src 'self'`。

地图几何通过 `assets/media-manifest.json` 从 COS 恢复，构建会验证字节数及 SHA-256。首次安装与构建需联网；已有缓存时可执行 `pnpm assets:pull --offline`。24 张小型 SVG 和地图版本、来源、OSM 署名留在 Git。

- [模型素材目录](./model-library)：24 件低模样品的规格、源文件引用与接入状态
