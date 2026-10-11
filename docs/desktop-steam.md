# 桌面操作与 Steam 城市地图路线

正式 App ID 申请、Coming Soon、抢先体验问答和 SteamPipe 上传配置见 [Steam 发布流程](steam-release.md)。

## 已实现的浏览器 / 桌面共用能力

- 竞速与自由骑行使用浏览器 Gamepad API 的 `standard` 映射；连接后按任意键让浏览器发现设备。
- 参考 GTA 驾驶布局：左摇杆转向、右摇杆环顾、RT 油门、LT 刹车、RB 手刹 / 漂移。参考 GTA Online 摩托车近战，按住 A 后点 LB / RB 左右踹；组合踢击占用的 RB 必须松开后才恢复手刹。游戏专属操作为 B 智能踹、X 道具，Menu 暂停 / 继续。
- 自由骑行按住 LT 先刹停，再倒车；RB 手刹只刹停。View 地图、Y 上下车 / 入塔 / 出塔、左摇杆按下掉头、右摇杆按下后视镜。左摇杆前后仅用于步行与游览，驾驶用扳机控制速度；塔内用方向键选楼层、A 乘梯。坦克用 LB 开火，避开 RB 手刹。跨菜单持有的倒车输入需要松开后再次按下。
- 菜单用方向键或左摇杆导航，A 确认，B 返回；左右可以调整滑杆和下拉选项。摇杆带死区，动作按键只在按下时触发，断连与失焦清空手柄输入。
- 非标准映射设备显示状态，不猜测按钮布局；自定义映射、Steam Input 原生动作集与手柄震动留待桌面客户端阶段。
- 游戏设置与自由骑行地图面板均有渲染分辨率上限（自动 / 720p / 1080p / 1440p）和帧率上限（30 / 60 / 120 / 跟随屏幕），使用 `dayun-kicker.display.v1` 跨入口保存。
- 分辨率选择限制画布像素总数，保留窗口比例，DOM 界面仍按窗口尺寸绘制。帧率限制只控制渲染与现有模拟循环的调度，不改变规则参数；手柄在每个显示 tick 轮询，菜单低帧率时也保留按键边沿。
- Alt + Enter 切换全屏，窗口失焦或页面隐藏时暂停，回到窗口后由玩家继续。
- 画面设置和城市地图共用「跟随本机时间」开关：按设备时区同步昼夜，关闭后恢复手动时间。默认关闭，本机文件保存，离线可用；城市同步精确时刻，竞速同步对应氛围。详见[时间天气](district-exploration.md#时间天气)。

参考：[GTA V Xbox 官方操作说明](https://dlassets-ssl.xboxlive.com/public/content/4f0a3089-ba2c-4f3d-9e38-102a41cbd885/GameManual/bffef18e-3f19-4190-a9b1-75402359b13b/en-IL/index.html)、[Rockstar 摩托车近战说明](https://support.rockstargames.com/articles/4DmfF7cqNcxZ20KTjZDguK/gta-online-controls-for-melee-on-motorbikes-ps4-xbox-one-pc)。手刹采用 [GTA Xbox 手册中的 RB 布局](https://media.rockstargames.com/rockstargames-newsite/img/manuals/en_uk/GTAIV_360_MANUAL_CRED18_ENG.pdf)；智能踹、道具和街区快捷键是本游戏扩展。

## 设置面板

竞速设置按画面、声音、操作和通用分为四个 Tab。分类与底部提示固定，只滚动当前分类；支持键盘左右 / Home / End、手柄 LB / RB 和方向键导航，B / Esc 关闭并恢复打开按钮的焦点。桌面采用深色半透明面板与高对比选中条，窄屏保留四个分类。

弹窗与分类导航分别复用 Reka UI Dialog 和 Tabs，关闭按钮使用 Grid 居中的 SVG。后续交互控件遵循 [UI 组件复用约定](ui-components.md)。

设置分类、动作音效、音乐与广州塔室内按使用时机加载。Electron 保留完整本地资源，分包无需网络；详见[按需加载](lazy-loading.md)。

设置下拉框使用共享 `GameSelect` 与 Reka UI Select：自绘上下箭头、深色弹出菜单、白色选中条和勾选标记。弹层挂载到页面顶部，避开设置面板的滚动裁切；保留可访问名称、选中状态、键盘方向 / Home / End / 输入文字定位以及关闭后的焦点恢复。手柄 A 打开 / 确认、方向键移动、B 关闭下拉层；关闭状态下左右可直接调整值。竞速与自由骑行共用同一控件。

## Steam 四人好友房

桌面版新增玩家房主的 2–4 人经典冲线赛：Steam 大厅、好友邀请、现代 NetworkingSockets 通信、准备、房主开赛、三个对手、房间排名及房主离开后的结束提示。对局在主进程运行，真实 Steam 跨设备测试待正式 App ID 完成。联机协议区分玩家房主与未来官方服务器，详见 [Steam 四人好友房](steam-multiplayer.md)。

## 已实现的离线 Electron 客户端与 Steam 接口

新增独立包 `apps/dayun-kicker-desktop`，锁定 Electron 44.7.0、electron-builder 26.15.3 和 steamworks.js 0.4.0。

```sh
pnpm desktop:start          # 构建客户端游戏资源与主进程，然后启动本地客户端
pnpm desktop:package        # 构建并生成当前操作系统的测试包
pnpm desktop:package:win    # 生成 Windows x64 ZIP；当前 macOS 可交叉打包
pnpm desktop:package:linux  # 生成 Linux x64 tar.gz
pnpm verify:performance:desktop # 检查客户端游戏资源体积
pnpm verify:desktop        # 校验已打包的启动文件、离线资源与应用体积
pnpm test:desktop          # 需先 desktop:build；实际 Electron 验收
```

打包输出在 `apps/dayun-kicker-desktop/release/`，归档文件名使用 `GZA-版本-系统-架构`。新构建的 macOS ZIP 内是 `GZA：暴力电驴.app`，包内主程序也使用完整名称；2026-10-09 已发布的预览包仍为 `GZA.app`。Windows ZIP 解压后运行 `GZA.exe`，Linux tar.gz 解压后运行 `./dayun-kicker`；Steam 上传使用平台的解包目录。应用菜单和窗口标题统一显示“GZA：暴力电驴”；默认数据目录继续使用旧名称 `Dayun Kicker`，保留旧存档与偏好。`verify-package.mjs` 可以接收自定义输出目录作为参数，并在 macOS 检查完整的应用名称及应用与嵌套代码的签名完整性。macOS 默认本地测试包使用 ad-hoc 临时签名，避免重命名 Electron 后保留失效的资源签名。显式 `--notarize` 支持 Developer ID 签名、Apple 公证和 Gatekeeper 检查；已发布通过公证的 arm64 预览版，见 [macOS 发行](macos-distribution.md)。当前没有安装器、自动更新或 Steam 上传操作。在 macOS 交叉打出的 Windows EXE 不编辑图标与版本资源；Windows CI 原生构建会写入图标与资源。

`.github/workflows/desktop.yml` 仅在 GitHub Release 发布时执行 Windows x64 / macOS arm64 / Linux x64 打包，包含已发布的预发布版；PR、普通 push 和 Release 草稿不会触发。Windows / macOS 运行原生启动、全屏与文件存档验收；三平台全部通过后将安装包上传到该 Release 的附件，同时保留 Actions 构建产物。2026-10-09 检查的最近三次任务曾被 GitHub Actions 预算阻止启动，远端构建仍待实际运行验收。可通过仓库变量启用独立的 COS 预览版发布任务，上传并匿名校验，下载清单失败时保留上一版；配置、凭证与切换 Steam 商店入口见 [客户端发布](desktop-release.md)。

客户端使用独立体积预算：入口 JS gzip 512 KiB，游戏资源 raw 128 MiB，其中音频最多 64 MiB；每个平台与架构的完整解包应用最多 768 MiB，包含 Electron 与原生库。`desktop:build` 生成独立 `dist-desktop`，自动检查游戏资源与发布完整性，打包 CI 通过 `verify:desktop` 检查最终应用。网页继续使用 350 KiB 入口与 20 MiB 总资源预算，手机首次可玩仍要求不超过 15 秒。完整规则见[按需加载与预算](lazy-loading.md)；构建隔离、Web 试玩裁剪边界与客户端下载状态见[分发说明](distribution.md)。

### 离线资源与主进程

窗口模式使用 40 px 深色标题栏，与游戏共用 UI token。macOS 保留原生红绿灯及系统菜单，Windows / Linux 使用原生 Window Controls Overlay；标题栏支持拖动，系统缩放与窗口按钮行为保持原生。竞速、街区加载和自由骑行共用桌面外壳，画布、HUD、设置与车库均使用标题栏下方的游戏区域。Alt + Enter 或系统全屏操作隐藏自定义栏，退出后恢复布局与相机比例。桌面标题栏按需加载，浏览器和手机不创建外壳。

窗口关闭后清空主窗口引用并退出当前 Steam 房间；房间事件先检查 `BrowserWindow.isDestroyed()`，再访问 `webContents`。应用退出先取消房间订阅，房间销毁停止计时器与原生回调并静默清理本机状态，仍向其他玩家广播房主离开。最终存档的异步回调绑定原窗口，避免影响 macOS 上重新打开的窗口。

使用 `dayun://game/` 标准安全协议读取打包的网页、城市 JSON、音频与 WASM，竞速和城市漫游不依赖服务器。渲染进程启用沙盒与 context isolation，不能调用 Node 或读取任意文件；preload 只暴露明确的窗口、存档和 Steam 方法。主进程检查调用来源、地图资源目录与外链范围。Alt + Enter 和手柄确认全屏按钮均使用原生窗口接口，不受网页用户激活限制；桌面音频允许无键鼠启动。

### 文件存档与 Steam Cloud

游戏入口在读取设置前从文件恢复存档。设置更改会合并写入；退出客户端前等待最后一次写入，页面切换也提交快照。写入使用临时文件替换，并以临时文件和重命名原子更新上一个有效版本的 `.bak`。主档不可读、损坏或文件类型不匹配时尝试有效备份，隔离原稿并修复主档；主档或备份明确声明其他版本时拒绝自动修复 / 覆写，保留两份原稿并报错。修复 / 隔离失败明确报错。偏好与进度各按自身白名单验证，错误类别的文档不会旋转覆盖有效备份。文件写入失败不更新内存中的已确认文档，导入校验 v1 格式、时间戳与完整文档大小，并隔离外部对象修改。不复制网页登录凭证或排行榜缓存。

在 Electron 的 `userData` 目录内：

```text
preferences.json                   # 显示、音频、语言等本机偏好
saves/offline/progress.json         # 离线用户成绩、职业与街区存档
saves/<SteamID64>/progress.json     # 各 Steam 用户独立进度
```

街区快照保存退出位置、导航、配送、骑手登记、步行与载具、塔内及游览状态，自动槽与三个手动槽均纳入进度白名单，并保留各槽的有效备份。主进程关闭窗口及页面切换收集本地存储前，先调用街区的同步快照回调，避免仅保存最后一个 5 秒周期的数据。操作入口与恢复规则见[自动恢复与存档](district-free-ride.md#自动恢复与存档)。

显示设置不上传云端。Steam Cloud 启用后，通过 RemoteStorage 的 `progress-v1.json` 读取 / 写入成绩与街区存档；仅恢复更新的有效版本。远端损坏时保留本地副本并停止覆盖远端；上传失败时保留本地文件，通用 Tab 显示状态。更新顺序使用版本与时间戳，暂未提供手动云冲突选择或多城市存档。后端需要启用 Steam Cloud 配额；不要同时让 Auto-Cloud 同步本机设置或重复管理同一份进度。

### Steam 启用与边界

`steam.config.json` 默认 `appId: 0`，无需 Steam 也可启动。拿到正式 ID 后修改该文件，或本地运行时设置 `DAYUN_STEAM_APP_ID`。不要把测试游戏 480 当成本项目 App ID 发布。

```sh
DAYUN_STEAM_APP_ID=你的正式数字ID pnpm desktop:start
```

- SDK 只在主进程初始化，读取用户身份、启用 Overlay，并为存档选择 Steam 用户目录。原生绑定和各平台 Steam API 运行库随包保存。
- `requireSteamLaunch: true` 时调用 `restartAppIfNecessary`，由 Steam 重新启动；开发和离线测试保持 false。
- 已实现 Workshop 订阅枚举、状态查询、下载和下载完成状态判断的桥接接口，并可从通用 Tab 打开 Workshop 页面。尚未加载这些条目的城市内容，也没有发布工具。
- 还未用正式 App ID、运行中的 Steam 客户端验证 Overlay、Cloud 和 UGC。原生绑定装载、离线客户端与文件存档可在本机直接验收；实体手柄、Windows 运行和 Steam Deck 需要对应设备 / CI 验证。

Steam 身份不是云乐坊网页 SSO 会话。桌面端暂时使用独立离线 SDK，不初始化网页 CloudBase / Cookie 登录，也不发送成绩到网页服务；登录、商店、付费权益和官方服务器联机需要后端接收并验证 Steam Auth Ticket，之后再签发桌面会话。当前不会把客户端提供的 Steam ID 当成已认证的后端用户。

## 创意工坊：城市地图包

**城市加载仍为设计方案：地图包导入、城市切换和 Workshop 发布尚未实现；订阅 / 下载桥接已实现。** Workshop 提供发布、订阅、下载和更新；城市如何加载、生成场景和运行任务仍由本游戏实现。

现有 `DistrictMap` 有米制路网、建筑轮廓、水域和桥梁，可以复用。当前入口固定读取客村 / 滨江 / 琶洲三个文件，目的地、广州地标、配送起点、边界及专用美术仍有固定逻辑，所以现在不能把任意城市 JSON 替换进去就承诺可玩。

第一版地图包只描述道路、建筑、水域、出生点和目的地，由共享卡通美术生成城市。预览、许可与来源信息随包保存；自定义 GLB 地标、材质和任务放在后续版本。

建议包目录（格式待实现）：

```text
manifest.json       # 格式版本、稳定城市 ID、作者、游戏兼容范围、资源入口
world.json          # DistrictMap 的通用地理数据，包含该城市自己的 WGS84 原点
places.json         # 目的地、出生点、可选路线；本地米制坐标
preview.png         # 城市选择和 Workshop 预览
attribution.md      # 数据与资源来源、许可与署名
```

建议 manifest 形状：

```json
{
  "format": "dayun-city",
  "schemaVersion": 1,
  "id": "creator.city-name",
  "version": "1.0.0",
  "name": "示例城市",
  "author": "Creator",
  "world": "world.json",
  "places": "places.json",
  "preview": "preview.png",
  "attribution": "attribution.md"
}
```

地图必须有有效的可骑行路网、路网可达的出生点以及与原点一致的投影坐标。加载器检查格式版本、文件大小、数量预算、有限坐标、道路引用、闭合建筑 / 水域轮廓、地图边界和任务可达性。包内资源只使用相对路径；不执行地图包中的 JS / HTML / 插件脚本。

先把广州专用内容归入 `guangzhou` 场景配置，让通用城市不自动出现广州塔、TIT 园区和广州固定目的地。城市间各用自己的原点和边界，切换时重建物理世界、导航和场景，释放旧资源；只合并同一城市且原点一致的分区。存档按城市 ID 隔离，成绩和联机额外记录地图版本 / 内容 hash。自定义城市先支持离线自由骑行，联机地图需要服务端认可对应版本后再开放。

实施顺序：

1. 通用城市场景配置与地图包校验 / 加载。
2. 内置城市 + 本地地图包导入 + 城市选择面板；验证切换与资源释放。
3. Steam 订阅列表、下载状态与安装目录加载。通过 `GetSubscribedItems` / `GetItemState` / `DownloadItem` / `GetItemInstallInfo` 和安装回调读取实际完成下载的内容。
4. 发布工具：`CreateItem` → `StartItemUpdate` → 设置内容、预览、元数据 → `SubmitItemUpdate`；作者更新原条目，玩家保留当前可用版本直至新版通过校验。
5. 地标 GLB、城市路线 / 配送任务和联机地图版本协商。

需要正式 Steam App ID 和 Steamworks 的 ISteamUGC 配置。选用 JS 原生绑定前核对这些 UGC API 的覆盖范围，不能只凭成就 / Overlay 示例判断 Workshop 已可用。

参考：[Steam Workshop 实施指南](https://partner.steamgames.com/doc/features/workshop/implementation)、[ISteamUGC](https://partner.steamgames.com/doc/api/ISteamUGC)、[Steam Cloud](https://partner.steamgames.com/doc/features/cloud)、[Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)。
