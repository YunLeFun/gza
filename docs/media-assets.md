# COS 资源与离线构建

音频、Web 图标、封面、App 图标原稿与平台导出存放在 COS；地图模型、贴图和建模原稿也复用这套流程。Git 保存 [`assets/media-manifest.json`](https://github.com/YunLeFun/dayun-kicker/blob/main/assets/media-manifest.json) 中的资源版本、目标路径、字节数、永久 HTTPS URL 和 SHA-256，继续保存授权说明、生成提示词、Icon Composer JSON 和平台配置。同一命名空间内相同内容共享一个对象；对象键包含 SHA-256，更新资源生成新对象并提交新版清单。地图按城市和地图版本使用独立命名空间，本地缓存仍按 SHA-256 跨版本复用。

公开前的许可核对记录在 [`assets/asset-license-inventory.json`](https://github.com/YunLeFun/dayun-kicker/blob/main/assets/asset-license-inventory.json)，逐项对应固定资源的路径与 SHA-256；当前恢复清单不包含许可字段，许可索引不改变下载或校验协议。索引中的 `NOASSERTION` 表示尚未确认对外授权，公开 URL 不能代替许可。确认方案后，新增或修改资源时同步更新许可记录；完整边界见[许可证方案](open-source-licensing.md)。

## 地图建模资源

当前广州场景主要由 TypeScript 程序建模，`public/maps/` 下 7 份 JSON 合计约 996 KiB，继续在 Git 中保存，便于审查道路、建筑轮廓、坐标和来源变更；其中[开放街区补全](district-infill.md)约 404 KiB。暂未发布外部模型；接入大文件时使用以下目录：

| 目录 | 内容 | 是否随客户端打包 |
| --- | --- | --- |
| `apps/dayun-kicker/public/models/` | GLB、glTF、关联 BIN 和贴图，可按城市分子目录 | 是 |
| `apps/dayun-kicker/public/textures/` | PNG、JPEG、WebP、AVIF、KTX2、HDR、EXR | 是 |
| `apps/dayun-kicker/public/maps/` | 可就近存放同样格式的模型和贴图；轻量 JSON 仍留在 Git | 是 |
| `assets/map-models/` | Blender、FBX、OBJ / MTL、模型、贴图和 ZIP 原稿归档 | 否 |

这些目录中的模型大文件由 `.gitignore` 排除，README、Markdown 来源说明与 `LICENSE*` 继续跟踪。程序建模代码、导入脚本和地图 JSON 正常提交。优先导出自包含 GLB；多文件 glTF 必须使用本地相对路径，并把引用的 BIN 和贴图一起发布，保留目录关系，不能依赖第三方在线纹理 URL。建模原稿的敏感性与许可应适合当前公开分发桶。

运行资源单文件上限仍为 64 MiB，建模原稿上限为 1 GiB；资源恢复和校验使用流式读写。开发、测试、构建和 CI 使用 `--runtime-only`，跳过 `assets/map-models/` 原稿下载。需要编辑或发布原稿时运行完整的 `pnpm assets:pull`；原稿恢复在 `assets/`，不会复制进 Web 或客户端产物。实际发布仍受现有 Web / 桌面总资源预算约束，超限需要压缩、拆分或另行确定分发方案，不能通过 COS 绕过预算。

## 广州与其他城市的地图版本

广州外部地图模型已经有专用的发布位置，COS 对象按以下路径存放：

```text
dayun-kicker/maps/guangzhou/
  1.0.0/runtime/<sha256>.glb
  1.0.0/runtime/<sha256>.ktx2
  1.0.0/sources/<sha256>.blend
  1.1.0/runtime/<sha256>.glb
  1.1.0/sources/<sha256>.blend
```

`guangzhou` 是稳定城市 ID，地图版本独立于音频、图标等通用资源的版本。其他城市使用各自的 ID，例如 `shenzhen`。本地模型、贴图及原稿分别放在 `public/models/guangzhou/`、`public/textures/guangzhou/`、`assets/map-models/guangzhou/`，也可把模型放在 `public/maps/guangzhou/`。这些本地目录只放当前版本，历史版本保留在 COS。

每次发布会生成并保留 [`assets/maps/guangzhou/<map-version>.json`](https://github.com/YunLeFun/dayun-kicker/blob/main/assets/maps/guangzhou)；这里是进入 Git 的独立版本清单，不存模型大文件。发布脚本检查已有的版本清单，内容变化必须使用新版本号；重试相同内容可以复用同一版本。当前构建清单的 `mapVersions` 明确记录每个城市选定的版本，安装包只包含选定版本的运行文件。

```sh
# 先恢复现有资源，再编辑当前城市目录中的模型、贴图和原稿。
pnpm assets:pull
pnpm assets:publish 2026-10-08.2 --map-version guangzhou=1.0.0
git add assets/media-manifest.json assets/maps/guangzhou/

# 下一版更换模型后，同时更新独立地图版本。
pnpm assets:publish 2026-10-08.3 --map-version guangzhou=1.1.0

# 选择或回退到已发布的版本，再打包离线客户端。
pnpm assets:map-select guangzhou 1.0.0
pnpm desktop:package
```

首次发布城市必须指定 `--map-version <city>=<version>`；同一次发布可以为多个城市重复该参数。后续发布默认沿用已固定的地图版本，模型变更时再显式指定新版本。版本选择会先在缓存暂存并验证整套运行资源，再替换本地文件和构建清单；下载校验失败保留当前运行文件和清单。属于旧版但新版不再引用的文件会移除，避免 Vite 把历史文件一起打包；检测到这些文件存在未发布修改时会拒绝删除。

已有对应缓存时可执行 `pnpm assets:map-select guangzhou 1.0.0 --offline`。版本切换只恢复运行资源；需要选定版本的建模原稿时再运行完整的 `pnpm assets:pull`。以上版本号为示例，目前尚未发布外部广州模型。程序建模代码和轻量地图 JSON 仍由 Git 提交固定；本流程控制外部模型资源版本，游戏内城市 / 地图切换仍是另外的功能。

## 构建和缓存

```sh
pnpm install --frozen-lockfile
pnpm assets:pull
pnpm assets:check
pnpm build
pnpm desktop:package
```

开发、测试、Web 构建和桌面构建/打包命令会自动恢复运行资源与构建图标。下载使用公开的项目资源 URL，不需要 COS 密钥。脚本检查每个所需本地文件的大小和 SHA-256；缺失或与清单不符时，从 `.cache/dayun-media/<sha256>` 恢复，缓存无效才下载。下载写入临时文件，大小和校验全部通过后再替换目标；任何失败会中止构建。

首次构建需要网络。资源已下载后，可以用 `pnpm assets:pull --offline` 从缓存恢复；本地资源与缓存都缺失时会明确失败。`assets:check` 只校验，不下载或改写。CI 缓存以资源清单内容为键；命中缓存仍校验 SHA-256。

`gza` 的 Web 构建先恢复运行媒体缓存，成功后保存供性能任务和 16 个浏览器测试分片共用；手动浏览器诊断也复用这份缓存。缓存仅包含 `source/.cache/dayun-media` 中已公开发布的内容地址对象，不包含私有源码、构建产物或建模原稿。缓存键使用运行平台和清单哈希，清单变化时通过稳定前缀回退到旧缓存，再由 `assets:pull --runtime-only` 校验并下载缺少或损坏的对象。缓存可用时，相同清单无需重复从 COS 下载；清单更新只需补齐新增或变化的资源，缓存被清理时仍可正常全量恢复。文档 CI 与可选文档构建分别缓存自己的地图资源，并使用同样的旧缓存回退机制。

广州地铁线路图以结构化站序、换乘及图上坐标独立绘制 SVG，轻量 JSON 在 Git 中保存并随线路弹层按需加载。官方原图只用于核对，不在资源清单或离线客户端中分发。数据来源、采集版本及绘制边界见 [`docs/guangzhou-metro.md`](./guangzhou-metro.md)。

资源恢复到原来的 `public/audio/`、`public/*.png`、模型、贴图和图标路径，Web 产物包含本地文件。Electron 的 `extraResources` 继续把完整 Web 产物打进安装包；游戏运行时不访问 COS，安装后的音频、图标和场景资源可离线使用。Web 发布校验与桌面包校验都会检查所有清单中的 Web 资源的大小和 SHA-256，包含嵌套模型和贴图。

## 发布资源

先执行 `pnpm assets:pull`，在本地编辑音频、同步导出图标，或把模型与全部贴图放入上述目录，再发布一个新资源版本：

```sh
pnpm icons:sync --source /path/to/YunLeFun/icons
pnpm icons:export
pnpm assets:publish 2026-10-08.2
pnpm assets:check
git add assets/media-manifest.json assets/app-icon/manifest.json
```

发布环境提供 `TENCENT_COS_SECRET_ID`、`TENCENT_COS_SECRET_KEY`、`TENCENT_COS_BUCKET` 和 `TENCENT_COS_REGION`；临时凭证还提供 `TENCENT_COS_TOKEN`。使用具有目标前缀写权限的子账号或临时凭证，密钥不写入仓库。当前桶是 `yunlefun-assets-prod-1325586649`，地域 `ap-shanghai`；通用媒体前缀为 `dayun-kicker/media/v1/`，城市地图前缀为 `dayun-kicker/maps/<city>/<map-version>/`。既有音频和图标无需迁移。

发布脚本扫描上述媒体目录，上传时仅对资源对象设置公开读取和长期缓存，逐个匿名下载并检查 SHA-256，所有对象通过后才原子替换清单。桶的其他对象权限保持原样。发布失败保留上一次清单，已上传的内容寻址对象可在重试时复用。

**编辑资源后先发布新版清单，再运行构建或 `assets:pull`**：恢复命令以 Git 清单为准，会替换本地不符的媒体。原稿的来源清单 `assets/app-icon/manifest.json` 和 COS 分发清单承担不同职责；修改原稿时两份清单都要更新。Windows / Linux 直接下载已导出的平台图标，无需 Apple 工具。

## 提交与推送检查

`assets/git-asset-policy.json` 是 Git 资源策略，`scripts/check-git-assets.mjs` 只依赖 Node 和 Git，不依赖 COS 凭证、项目 SDK 或网络。它与现有的发布、恢复及校验工具组成统一入口：

```sh
# 检查暂存区的实际 Git blob，而不是可能已被替换的工作树文件。
pnpm assets:git-check

# 推送前 fetch，按实际目标分支检查整个待推送历史。
git fetch origin
pnpm assets:git-check --base origin/main
```

检查禁止跟踪媒体、压缩包和二进制构建产物；默认单个 Git blob 上限 1 MiB，未知扩展名的二进制上限 256 KiB，小型 SVG 上限 64 KiB。源码、结构化地图 JSON、清单和授权说明仍可提交。已在 COS 清单登记的路径始终不得跟踪。小型测试样本例外只能使用精确路径、最大字节数和用途，禁止目录通配；修改例外是策略变更，不能作为自动修复检查失败的手段。

`--base` 同时检查暂存区和目标分支之后的新 blob，包括中间提交及合并父提交。媒体先提交、再删除也会失败；目标历史已包含的旧 blob 不重复算作新增上传。失败时输出路径、字节数与来源，检查不会删除文件、上传资源、改写提交或安装/覆盖本机 Git 钩子。媒体误入未推送提交时，应先确认本地改动安全，再重建这些提交；已发布历史另行协商迁移。

`pnpm test`、`pnpm build` 自动检查暂存区，CI 在安装依赖前检查提交树及本次提交范围。现有的大流量推送确认钩子继续工作：总 pack 较大可能来自正常的源码、地图和锁文件历史，不能仅凭上传体积判断有媒体。

这套机制可跨仓库复用：复制检查脚本和策略文件，指定 `--root` / `--policy`，将 `manifestPath` 指向该仓库的资源清单（保留 `files[].path` 结构），再接入 CI 与 AGENTS 约束。对象发布、SHA-256 校验、内容寻址和离线恢复沿用现有工具；新增媒体类型需同步扩充发布目标白名单和 MIME 表。形成多个实际使用方后，再提取共享包，避免先引入额外 SDK 和发布流程。

## 已发布历史迁移

媒体恢复文件被 `.gitignore` 排除。删除 Git 跟踪只减少未来提交；清理历史需要重写包含旧媒体的已发布分支。旧媒体内容和 Git blob 对应关系保存在 [`assets/media-history.json`](https://github.com/YunLeFun/dayun-kicker/blob/main/assets/media-history.json)，可按 SHA-256 从 COS 找回历史资源；历史版本中的源文件仍从 Git 获取。

历史重写前保留 Git bundle、未提交工作区归档与提交映射。重写后已有克隆需要迁移到新的分支历史；有本地修改的开发者先备份，再用新克隆恢复自己的改动。旧提交 ID 会变化，旧的 Git 备份和 Codex 快照仍可保留原对象，因此本机 `.git` 大小可能高于新克隆。

## 公开文档地图

`gza` 复用本文的共享工具，清单只包含文档的两份几何 JSON。`docs/data/map-roads.json` 和 `map-shapes.json` 被忽略，按内容地址存储在现有 COS；版本、永久 URL、字节数、SHA-256、ODbL-1.0 许可与生成说明保存在 `assets/media-manifest.json`。`map-preview.json` 中的来源、署名及 24 张小型 SVG 继续跟踪。

文档构建和类型检查会先恢复并验证地图。首次需要联网；已下载的内容缓存可通过 `pnpm assets:pull --offline` 恢复。更新本地几何后先发布新版本，再构建，避免未发布修改被恢复流程覆盖。发布凭证只在维护者本机环境使用，文档 CI 与 EdgeOne 不需要 COS 密钥。
