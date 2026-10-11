# Web 与客户端分发

Web 与 Electron 复用游戏、输入、存档格式、场景和 UI 源码，通过构建 profile 生成独立产物。显示品牌继续使用「GZA：暴力电驴」，技术标识继续使用 `dayun-kicker`。

## 已实现的构建隔离

| 项目 | Web | 客户端 |
| --- | --- | --- |
| 构建命令 | `pnpm build` | `pnpm desktop:build` |
| 游戏产物 | `apps/dayun-kicker/dist` | `apps/dayun-kicker/dist-desktop` |
| 依赖清单 | `apps/dayun-kicker/.vite/manifest.json` | `apps/dayun-kicker/.vite/desktop/manifest.json` |
| 编译常量 | `__DAYUN_BUILD_PROFILE__ === "web"` | `__DAYUN_BUILD_PROFILE__ === "desktop"` |
| 入口 JS gzip 预算 | 350 KiB | 512 KiB |
| 完整游戏资源 raw 预算 | 20 MiB | 128 MiB |
| 音频 raw 预算 | 5.3 MiB | 64 MiB |
| 含 Electron 的解包应用预算 | — | 每平台与架构 768 MiB |

完整预算集中在 `scripts/performance-budgets.mjs`。`pnpm build:desktop-renderer` 可以仅生成客户端游戏资源，`pnpm desktop:build` 还检查客户端体积、资源完整性并编译主进程。两份产物可以同时存在，重新构建一份不会覆盖另一份的入口或依赖清单。

每份产物的 `build-profile.json` 记录 profile、入口列表和构建清单 SHA-256。预算与发布校验检查 profile 和清单匹配；客户端构建、打包、启动及离线包检查拒绝 Web profile。安装目录内继续使用 `resources/web`，本地运行从 `dist-desktop` 读取。

开发服务器默认使用完整版 profile。验证 Web 导航时使用 `pnpm --filter @yunlefun/dayun-kicker dev --mode web`。普通生产构建默认 Web，客户端使用 `vite build --mode desktop`。

## Web 试玩的后续裁剪边界

当前独立构建保留竞速、合作、完整街区及同一组运行资源，尚未减少 Web 的地图和玩法范围。Web 主菜单已提供客户端下载入口，客户端构建中不显示此入口。

建议 Web 保留客村 / TIT 小范围试玩，把完整广州街区、后续城市包与高规格内容放在客户端。确定范围后，按以下顺序落地：

1. 在共享 feature 配置中定义各 profile 的可用入口、地图、任务和画质默认值。
2. 用编译常量控制模块导入，按 profile 选择 Vite 的 HTML 入口和场景依赖，让不需要的模块从构建依赖图移除。
3. 为公共资源定义 profile 清单。Vite 默认复制整个 `public`，因此需要同步过滤地图、音频、模型及其完整性检查；继续复用 COS 清单与恢复工具。
4. 试玩地图的边界、导航、活动、传送、旧存档恢复与资源请求一起约束，保证游戏能在所选区域完成闭环。
5. 对两份实际产物分别验证体积、首次可玩时间、操作与离线资源，再增加客户端专属内容。

资源包上限与渲染负载分别管理。桌面浏览器和 Electron 都可能运行在低性能设备上；绘制次数、三角形、分辨率、阴影和帧率设置需按目标设备实测，当前不提高已有渲染与手机首次可玩门槛。

## 下载入口与安装包状态

源码已新增轻量 `/download.html`，复用共享 UI token、`GamePanel` 和 `GameNotice`，只加载 Vue 与页面展示代码，不加载 Three、Rapier、地图或平台登录。Web 主菜单的 `#client-download-entry` 指向该页面；手机使用 2 × 2 入口布局。

官网稳定入口仍为 `https://dayun-kicker.yunle.fun/download.html`；该页面源码已完成，尚待正常 Web 发布。安装包已通过本机发布环境上传，**macOS Apple 芯片预览版 0.1.0-preview.20261009.3 已公开**：

- [下载 macOS arm64 ZIP](https://yunlefun-assets-prod-1325586649.cos.ap-shanghai.myqcloud.com/dayun-kicker/releases/artifacts/6c2666771aabaf7952f2979db8176ee5c75a32d8f640a7e0ace19ab37e8d111c/GZA-0.1.0-mac-arm64.zip)，134.4 MiB。
- SHA-256：`6c2666771aabaf7952f2979db8176ee5c75a32d8f640a7e0ace19ab37e8d111c`。
- [公开最新版本清单](https://yunlefun-assets-prod-1325586649.cos.ap-shanghai.myqcloud.com/dayun-kicker/releases/preview/latest.json) 与 `assets/desktop-releases/preview/` 中的本地 pin 对应。

下载页现在自动读取该 COS 清单，显示已发布平台的版本、大小、永久链接与 SHA-256；缺失平台保持「待发布」，网络失败可以重试。仅需在 `apps/dayun-kicker/src/config/clientDownloads.ts` 将 provider 切为 `steam` 并填写真实公开商店 URL，即可切换入口；当前 App ID 为 0，未设置占位链接。轻量页面复用共享 Vue / UI，不载入游戏场景或平台 SDK，详见 [客户端发布](desktop-release.md)。

本机 `pnpm desktop:release VERSION --publish` 串联当前源码构建、预算、打包、验包、上传、匿名完整下载及清单更新。已有包可通过 `desktop:publish` 独立重试；默认 dry run。历史归档与版本记录不可覆盖，频道锁串行合并平台，发生错误保留上一版下载清单。

本轮跨平台打包被校验拦截：Windows 包缺少目标原生 NetworkingSockets 库，没有发布该包或放宽检查。Windows / Linux 继续待各自原生 CI 验收；工作流已接入三原生任务与依赖的 COS 发布任务，但仓库 Secrets 尚为空，GitHub Actions 预算仍需恢复。当前 macOS 预览版已使用 Developer ID 签名，通过 Apple 公证、票据附加与 Gatekeeper 检查；Windows / Linux 运行验收及正式 Steam 上架独立完成。详见 [macOS 发行与商店路线](macos-distribution.md)及[公证发布验收](releases/2026-10-09-macos-notarized.md)。

## 2026-10-09 验证

完整类型检查、68 项构建 profile / 预算 / 桌面相关测试、两份实际构建与各自体积及发布完整性检查通过。Web 包含 372 个发布文件，客户端游戏资源包含 371 个文件；先生成 Web 再生成客户端后，Web 全部发布文件及外置依赖清单的 SHA-256 保持不变。客户端生产 JavaScript 不包含主菜单下载入口代码。

Web 生产预览的 1440 × 900 与 390 × 844 视口通过页面身份、有效内容、错误遮罩、控制台、无溢出、开始按钮遮挡与键盘往返检查；开发模式另测手柄导航与 A 确认跳转。下载页冷开只请求 7 个页面所需 JavaScript，与其静态依赖闭包一致，不请求 Three、Rapier、地图或游戏主包。下载入口 JS / CSS 约 50.4 / 2.4 KiB gzip，完整 Web 资源为 12.91 MiB。首页 CSS 预算余量只有 14 B，合作入口 JS 约 349 / 350 KiB，后续 UI 与玩法扩展需要继续控制分包体积。

本轮完整 Electron 回归在 `Alt + Enter` 原生全屏处未通过：最小诊断确认按键与 IPC 已到达、仅调用一次 `setFullScreen(true)`，但原生状态随即回滚且未发完成事件；当前 macOS 会话 `CGSSessionScreenIsLocked=Yes`，原生窗口无法取得焦点。保留原断言，待屏幕解锁后复测；不能把这次完整桌面回归记为通过。当时仅生成客户端 renderer 与主进程；随后已重新生成、验证并公开上传上述 macOS 预览包。实体手机与正式 Steam 验收尚未完成。Web 试玩范围裁剪及手机首次可玩时间仍需独立验收。

另外执行的 Electron 离线专项验收通过：实际 `dayun://game/*` 使用匹配的客户端构建标记，主页无下载入口；成绩写入文件后真实关闭并重启恢复，街区加载就绪、合作模式显示 Steam 离线状态，下载页显示三个待发布平台。全部 96 个资源请求使用本地协议，外部请求和页面错误均为 0。专项结果不代替上述全屏回归。

## 本轮发布与存档验证

完整类型检查与 173 项存档、桌面、下载、发布、资源及 profile 相关单测通过；随后首次私有桶缺失对象 403 处理补测的 43 项发布 / 媒体测试通过（与上述统计重叠）。Web / desktop 各自构建、体积与发布资源校验通过；客户端构建后 Web 的全部 373 个文件（含外置清单）SHA-256 保持不变。Web 下载页约 52.9 KiB JS / 3.0 KiB CSS gzip，完整 Web 游戏资源约 12.92 MiB，未调整预算。

实际 macOS `GZA.app` 的手动保存等待磁盘确认，写入离线 profile 后正常关闭；人为损坏该临时测试 profile 的主档，再真实启动应用，备份恢复手动槽与成绩，原坏文件隔离保留，修复后的主档与有效备份一致。整个专项无外部资源请求 / 页面异常。安装 ZIP 的 140,922,620 字节与上述 SHA-256 已由发布器匿名完整下载核验。

实际 Web 生产预览的 1440 × 900 与 390 × 844 下载页读取真实 COS 清单，通过版本 / 校验值 / 永久链接、键盘焦点、触控高度、无溢出及轻量依赖检查。开发模式的两个视口各验证已发布、404未发布、失败重试与 Steam 切换共 8 项分支；Steam 使用仅测试运行时的商店 URL，正式配置仍为 COS。浏览器插件不可用，使用仓库 Playwright；截图和机器记录位于 `/tmp/dayun-release-20261009/`。最终原配置的 12 项存档浏览器回归全部通过，包含 320 px 手机与模拟手柄；结果及边界记录于[本轮发布验收](releases/2026-10-09-client-preview.md)。
