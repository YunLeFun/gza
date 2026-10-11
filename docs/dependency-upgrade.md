# 依赖升级说明

## 兼容版本与安全修复（2026-10-10）

| 依赖 | 升级后版本 |
| --- | --- |
| Vite | 8.3.4 |
| Playwright | 1.64.0 |
| Electron | 44.7.0 |
| 工作区 ws | 8.22.0 |
| js-yaml / Zod | 5.4.3 / 4.6.5 |
| Vue Router / PixiJS | 5.4.0 / 8.22.0 |
| PostCSS / nanoid / source-map-js | 8.5.29 / 3.3.20 / 1.2.2 |

保留 24 小时发布等待期、现有 Reka UI 补丁和 CloudBase lodash 安全替代包。应用的 TypeScript 6、Node 22 类型定义、Colyseus 0.17 协议及固定 pnpm 版本沿用下文的兼容约束。ADV.JS 固定快照修订为 `0.1.4-dayun.2`，同步依赖元数据、重建 lib 和公开源码的 SHA-256；其构建单独使用 TypeScript 5.9.3，满足 unbuild 3.6.1 的 peer 要求。

`js-yaml` 和 `source-map-js` 的已知安全告警已修复。工作区还保留一项 `sprintf-js@1.1.3` 中风险告警，来自 electron-builder 的可选打包工具依赖链 `app-builder-lib → @electron/get → global-agent → roarr → sprintf-js`。截至本次升级，npm 没有发布 1.1.4，官方告警也未列出修复版；保留审计结果，不添加不存在的版本或忽略告警。[上游安全告警](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)

验证：冻结离线安装与 peer 检查通过；工作区及文档类型检查、1313 项单元测试、剧情产物校验、Web / 桌面 / 文档构建通过。Web 和桌面发布产物及性能预算通过，公开源码与 vendor 的 SHA-256 一致。macOS arm64 的 Electron 44.7.0 本地预览包通过代码签名、离线资源、体积和窗口重建 / 存档恢复测试；此检查不代表 Windows 原生构建或正式发布。生产依赖审计和独立云函数审计均为零告警。

独立工作区的 8 项浏览器测试通过，覆盖比赛流程、模型按需加载、设置焦点与窄屏布局、桌面 / 手机 / 手柄剧情交互；使用新版本 Playwright 的 Chromium 运行。

## 工作区升级（2026-10-06）

2026-10-06 升级工作区和 `cloudfunctions/dayun-kicker-api` 的直接依赖，并同步 pnpm / npm 锁文件。

| 依赖 | 升级后版本 |
| --- | --- |
| Vite / Vue 插件 | 8.3.2 / 6.0.9 |
| Vitest / Playwright | 5.0.3 / 1.63.0 |
| TypeScript / vue-tsc | 6.0.3 / 3.3.12 |
| Vue / vue-i18n | 3.5.43 / 11.4.13 |
| Three.js / 类型定义 | 0.186.1 / 0.186.0 |
| Rapier | 0.21.0 |
| UnoCSS / 图标预设 | 66.10.5 |
| CloudBase Web / Node SDK | 3.10.1 / 3.18.6 |
| 云函数 ws | 8.22.0 |

构建迁移到 Rolldown 的 `codeSplitting`，移除直接声明的 macOS 专用 Rollup / esbuild 二进制。构建目标仍为 Chrome / Edge 107、Firefox 104、Safari 16，Node.js 要求与 Vitest 5 一致。BFF 明确设置 `rootDir: src`，维持原有声明和 JavaScript 输出路径。设置面板改为打开时加载，并补齐异步弹窗首次打开的焦点管理。[Vite 8 迁移说明](https://vite.dev/guide/migration)

## 兼容约束

- TypeScript 7 尚不提供 Vue 类型检查工具所需的稳定编译器 API，使用最新的兼容版本 6.0.3。[官方说明](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- `@colyseus/sdk` 保持 0.17.43，与 Play 游戏服的 `@colyseus/core` 0.17.45 / Schema 4 协议一致。升级到 0.18 必须与独立游戏服同步迁移。[迁移说明](https://docs.colyseus.io/migrating/0.18)
- Node 类型定义更新到 22.20.5，与部署运行时一致。
- CloudBase Node SDK 按 `release-v3` 稳定维护分支更新到 3.18.6。
- 现有 `@yunlefun/*`、图标集、WASM 插件已是最新稳定版。pnpm 继续使用项目固定的 11.10.0。

## 安全和性能

Axios 1.20.0、qs 6.16.0、fast-uri 3.1.8、nanoid 3.3.19 修复已知告警；保留 CloudBase 的本地 lodash 安全替代包。PostCSS 更新到 8.5.28。nanoid 3.3.20 和 PostCSS 8.5.29 发布不足 24 小时，遵守现有 `minimumReleaseAge`，本次使用已过等待期的稳定版本。

Rapier 0.21 的 WASM 体积增加，gzip 分包约 1,199 KiB，预算单独调整为 1.25 MiB。物理引擎继续延迟加载，首屏 JavaScript 预算仍为 270 KiB；移动端弱网首次可玩预算仍为 15 秒。Node.js 22 下使用现有生产配置构建，首屏约 269.0 KiB，CSS 约 13.3 KiB；Fast 3G / 4 倍 CPU 限速最终首次可玩为 8.1 秒，较升级前约 5.4 秒增加。这是引擎升级的实际下载成本。

## 验证

- Node.js 22.23.3：类型检查、258 项单元测试、生产构建、体积预算和 61 个发布文件的产物检查通过。
- 35 项浏览器测试通过，包含固定 / 随机 / 道具赛完整双圈、移动端多指控制、首次及再次打开设置的焦点恢复、昼夜场景与车辆预览。
- 最终生产包的弱网启动检查通过；新版 CloudBase Web SDK 的游客态排行榜、商品目录和可用幽灵只读 smoke 通过。
- 随机赛道三种主题的 90 秒持续运行及十次重开检查通过，无浏览器异常，GPU 资源增长在原有阈值内。
- 工作区 `pnpm audit` 和独立云函数 `npm audit` 均为 0 个已知漏洞，peer 检查无冲突；两个锁文件均可冻结安装。

更新云函数锁文件不等于部署云函数；后续发布仍需执行独立的 CloudBase 云函数部署。

## 设置下拉框依赖（2026-10-07）

新增 Reka UI 2.11.0，使用公开 Select 组件构建设置下拉框。控件及 Floating UI 依赖独立分包，竞速入口按需加载。

`patches/reka-ui@2.11.0.patch` 将 ESM / 源码中的 Vue 命名空间导入改为具名 `useId` 导入，避免兼容检测使所有 Vue 导出留在生产包中。工作区固定 Vue 3.5.43，直接调用其原生 `useId`；自定义 ConfigProvider 的 ID 生成方法仍优先。此补丁依赖 Vue 3.5 及以上，升级 Reka UI 时应核对上游实现并在具名导入已修复时移除。
