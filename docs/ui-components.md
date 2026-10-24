# UI 组件复用约定

`ReadyCityPanel` 是首页同步加载的开始页，复用 `GameJourneyEntries`、`GameScrollArea` 与 `GameLink`。`#start-button` 保留原生导航语义，直接进入剧情街区，不依赖比赛物理引擎的加载状态。首页不挂载赛车模式、赛道、纪录与赛道预览；已知比赛活动链接才挂载 `ReadyStartPanel`，统一显示「街头赛事」。街区活动目录仅提供一个赛事地点，具体目标在赛事准备页选择。

`GameJourneyEntries` 将「剧情模式」与「自由模式」作为两个主入口，教程、合作、僵尸突围、街区返回与 Web 客户端下载作为快捷入口。僵尸相关入口、候场、HUD 和结果页统一显示「僵尸突围」，步行、驾驶与双座共乘是同局操作；主入口不再分别提供两种玩法选项。统一城市房保留既有 `city-*` DOM ID，旧双座页面及 `coop-*` DOM ID 仅用于 `/coop-legacy.html` 兼容。保留原生导航语义和稳定 DOM ID，导航流程由宿主管理。街区按需加载 `DistrictTutorial` 与 `DistrictActivities`：前者通过不可变教程快照展示当前步骤，发送跳过、重练与打开地图事件；后者通过活动地点、玩家位置、速度和阻塞状态展示导航 / 开始按钮，宿主再次验证实际地点、停车和业务状态。活动地图标记、世界标记与列表复用同一份活动目录。`DistrictMap` 的可选 `activities` 仅用于展示地图标记；共享基础组件不引入游戏逻辑。具体入口与返回流程见 [游戏流程](game-flow.md)。

`DistrictModePanel` 在街区欢迎页、暂停菜单和地图导航按需挂载，以 `mode`、既有骑手 `progress` 和 `delivery` 派生任务说明，通过 `mode` / `continue` 事件请求宿主切换引导或继续当前任务。两个主模式按钮使用 `aria-pressed` 和共享选中态；`DistrictView.gameMode` 与 URL 记录当前引导，不新增城市场景或存档副本。模式切换不修改位置、订单或奖励。

`DistrictWelcome` 负责街区欢迎页的模式说明与操作布局；游戏状态由 props 提供，开始、模式、教程和地图通过事件交给宿主，自由模式活动通过 slot 提供。内容区可独立滚动，存档状态、开始 / 继续按钮及新手 / 地图入口位于固定操作区，使用共享间距 token 分组；低高度横屏将内容与操作并排。欢迎页的 `DistrictModePanel` 传 `showContinue=false`，避免与主开始按钮重复；暂停和地图默认保留任务快捷按钮。地图尺度、建模说明与面积收在地图导航的「地图说明」折叠区，速度与加速规则收在地图的操作分类，不占欢迎页。

游戏 UI 优先复用已安装的 Reka UI 交互组件，使用项目 CSS 保持 GTA 风格。组件负责键盘导航、焦点管理和无障碍语义；游戏代码负责状态、手柄输入与视觉样式。

合作候场根据 `CoopRoomState.authority` 展示 Steam、开发测试或云乐坊入口，登录与连接由 transport 管理。
`CoopProfileEditor` 保留原生 `#coop-profile` details 与 summary；第一次展开才加载 `CoopProfileForm`，
关闭后保留未保存输入。房间号支持 64 字符并在窄屏换行，复制按钮保持触控尺寸。

旧双座路线兼容 HUD 的 `#coop-delivery` 展示权威订单目的地与剩余距离；停稳交付时 `#coop-delivery-progress` 使用进度条语义，数值来自权威毫秒进度。`#coop-resources` 在原有路线状态行显示双方共享的资源箱领取数与简短拾取提示，不增加库存弹窗。结算复用 `GameMetric` 显示送达用时与搜集数，窄屏允许读数换行。缺少配送字段的旧快照仍展示撤离目标与原结算；这些状态只在合作业务组件派生，基础组件不处理规则。

僵尸突围 `/coop.html` 候场（`/city-coop.html` 为兼容地址）、按人数显示的 HUD、暂停与结算复用 `GamePanel`、`GameButton`、`GameMetric`、`GameNotice` 和共享 token。城市房统一支持 1–4 人，`#city-player-count` 显示当前人数与房间容量；本地单人不显示可分享的房间号，联机加入控件保持禁用。`#city-world` 保留原生可聚焦场景节点；触屏移动、奔跑、开火、救援与急刹保留原生指针捕获及按住 / 取消行为，跳跃与上下车使用一次点击。步行控件提供跳跃与奔跑，`#city-jump` / `#city-sprint` 保留可访问名称与按键提示。街区 `RideControls` 的可选 `outdoor` 默认为 `true`；站厅传 `false` 以展示现有室内移动控件。组件在户外步行时复用原生按住节点展示跳跃、奔跑与移动，通过 `action` 发出本地意图，切换车辆状态、失焦和卸载时释放输入。控件按步行、司机或后座显示；司机隐藏枪械，后座隐藏驾驶，场景业务校验权威座位与交互条件。HUD 用 `data-city-player` 标识权威玩家，并显示每个人的生命与倒地状态；菜单、后台与渲染中断由业务入口释放本地操作，本地单人同时暂停规则时钟，关闭菜单后恢复场景焦点。城市规则与 transport 不进入基础 UI 组件。

`DisplayControls` 统一展示首页／比赛、街区与合作暂停菜单的画面设置，合作菜单按需加载。分辨率为保持窗口比例的总像素上限，提供自动动态调整及 540p／720p／900p／1080p／1440p／2160p；选项标注标准尺寸，但不改变窗口形状。帧率提供 30／60／90／120／144／不限，受屏幕刷新率和性能限制。设置由 `useDisplaySettings` 保存并通知各渲染器，默认自动分辨率＋60 FPS，像素与帧率上限即时生效。

桌面版可在画面设置开启实际 FPS 读数，默认关闭。窗口模式放在标题栏，全屏时移至左下角；复用 GamePanel、GameMetric 与共享 token，避免遮住骑行控件。读数由实际完成的主游戏帧更新，不计限帧器跳过的回调与水面辅助绘制；加载、暂停或窗口隐藏后的陈旧读数显示为不可用。手柄设置提供振动开关及测试反馈，沿用共享设置行和 Switch；离开游戏、断开手柄或禁用振动时释放持续反馈。

渲染后端提供自动／WebGL／WebGPU，默认自动；旧的 `dayun-kicker.display.v1` 数据缺少 `renderer` 字段时也使用自动。选择通过原存储键保存，`useRendererSettings` 单独订阅主渲染器的真实状态；`#render-backend-status` 显示实际后端及设备不可用、场景兼容、初始化失败或设备中断原因，不根据选择值推断实际后端。更改与当前初始化偏好不同时，`#render-backend-reload` 提供「保存并重新载入」，先捕获进度并等待桌面存档写入，10 秒超时或失败时保留页面并提示重试；重新载入会重新进入场景，当前比赛或联机会结束。保留 `#render-resolution` → `#render-frame-rate` 的键盘顺序，其后是 `#render-backend`，同一时刻只挂载一个设置面板。后端界面仅使用轻量状态 API，不加载 Three 或探测 GPU。

`fullscreen` 显示全屏按钮；可选 `mirror`、`mirrorDisabled` 和 `update:mirror` 仅展示街区后视镜状态，由街区管理开启、加载和渲染。后视镜每次进入默认关闭，手动开启才加载。街区镜子使用 `#render-mirror`，复用 `GameSwitch`。

面板直接使用共享翻译实例，可按需挂载到没有安装翻译插件的合作入口；语言选择保持响应式。 `DisplayControls` 的 `language` 属性显示共享 `LanguageControl`（默认隐藏）；它只负责语言选择，`id` 默认为 `locale-select`，`description` 默认为开启。首页通用设置、街区欢迎页、地图画面设置、合作候场与暂停菜单共用 `dayun-kicker.locale`，立即更新且可跨入口恢复。街区及合作 UI 的文本目录随世界入口加载，首章对白与选项在展示边界翻译，任务 ID、存档和世界地理数据不随语言改变。合作模式的输入将 Select 浮层和 Dialog 内的 Escape 留给 Reka，关闭下拉框时不同时切换游戏菜单，场景内 Escape 仍可打开菜单。

自由探索的 `DistrictZombieChallenge` 按需复用 `useCityCoopGame`、`CityHud`、`CityTouchControls` 和 `CitySessionMenu`。本地挑战借用 `#game-root` 及原来的 `#game-canvas`，不创建另一个 WebGL 上下文或城市场景；暂停、结算的 `sceneId` 指定焦点返回节点，`leaveLabel` 指定退出文案，默认值继续兼容独立联机入口。街区欢迎页、暂停菜单和城市游览设置通过 `zombies` 事件请求挑战，出生点、模拟暂停及返回状态由街区宿主管理。共享城市战斗 CSS 不包含页面全局重置，独立入口另加载 `city-coop/page.css`。

## GTA V 视觉约定与 token

首页、设置、比赛 HUD、街区、车库和比赛 / 购买 / 渲染恢复弹层使用 `apps/dayun-kicker/src/ui/styles/tokens.css`。各页面入口及独立加载 / 开发诊断样式直接导入它，不依赖主页面先加载。

采用黑色半透明底板、方角、细分隔线、白色选中行和紧凑数字读数。以 GTA V 的菜单与 HUD 为视觉参考，保留本游戏的中文内容、移动端控制和现有布局。绿 / 蓝 / 黄 / 红用于状态、导航、警示和错误，避免每个面板另设强调色。

| token | 用途 |
| --- | --- |
| `--ui-panel` / `--ui-panel-strong` / `--ui-panel-hud` | 普通面板 / 主菜单及对话框 / 轻量 HUD 底板 |
| `--ui-text` / `--ui-text-muted` / `--ui-text-subtle` | 正文、说明、次要信息 |
| `--ui-selected` / `--ui-on-selected` | 白色选中底与深色文字，必须成对使用 |
| `--ui-success` / `--ui-info` / `--ui-warning` / `--ui-danger` | 状态语义色；焦点默认使用 warning |
| `--ui-font` / `--ui-font-display` / `--ui-font-number` | 正文、标题与等宽数字风格；不增加字体下载 |
| `--ui-text-xs` 到 `--ui-text-title` | 共享字号层级 |
| `--ui-space-1` 到 `--ui-space-6` | 4、8、12、16、24、32 px 间距 |
| `--ui-radius` / `--ui-line` / `--ui-line-strong` | 方角与分隔线 |
| `--ui-control-small` / `--ui-control-height` / `--ui-control-large` | 34、40、52 px 最小控件高度；触屏或不超过 700 px 的窄屏，常规与小号为 44 px |
| `--ui-titlebar-height` | Electron 窗口模式的 40 px 标题栏；原生窗口按钮高度需在桌面主进程同步 |
| `--ui-motion` / `--ui-focus` / `--ui-focus-width` | 120 ms 状态反馈、键盘焦点；减少动态效果偏好下为 0 ms |
| `--ui-motion-panel` / `--ui-ease-out` | 220 ms 面板擦入与选中条滑动；标题横幅揭示使用两倍时长。减少动态效果偏好下为 0 ms |
| `--ui-press-brightness` | 按下时的短促明暗反馈，配合共享动效时长使用 |
| `--ui-layer-*` / `--ui-shadow-*` | HUD、菜单、弹窗、购买确认（checkout）、渲染恢复（recovery）、全屏车库（fullscreen）、选择浮层、诊断层及阴影 |

### GTA 风格动效

`tokens.css` 提供共享关键帧：`ui-wipe-in`（自左向右的 clip-path 擦入）、`ui-fade-in` 与 `ui-title-reveal`（自中线展开的横幅标题）。关键帧只改变透明度与 clip-path，不改变 `transform` 或布局尺寸，已用 `transform` 定位的面板与 E2E 的几何检查不受影响；均使用 `backwards` 填充，结束后不残留裁切。

- `GamePanel` 与 `GameNotice` 挂载或 `v-show` 重新显示时擦入；父级过渡已负责入场时传 `data-ui-motion="none"`。
- `GameButton` / `GameLink` 悬停或键盘聚焦时，左侧以 `--ui-focus-width` 白色边条生长；主按钮与选中态保持既有白底配对。
- Reka 弹窗只在 `data-state="open"` 时淡入与擦入，关闭保持即时，避免延迟焦点恢复；`GameSelect` 下拉自上展开，设置分类的 `TabsIndicator` 在分类之间滑动。
- 街区暂停菜单、剧情时刻标题与首页字标使用横幅揭示。

首页 CSS 预算为 17 KiB（见[按需加载](lazy-loading.md)），首页专属的入口级联动画暂未启用；新增首屏动效前先运行 `pnpm verify:performance`。

### GTA 风格组件（2026-10-17）

位于 `components/base/`，只负责展示；时机、队列、关闭与定位由业务组件决定。开发服务器的 `/ui-gallery.html` 汇总全部组件与 HUD 合成示例，生产发布不包含该页面，只有 `VITE_UI_GALLERY=1` 的预览构建会加入。

| 组件 | 用途与约定 |
| --- | --- |
| `GameButton layout="row"` | GTA 暂停菜单行：通栏、左对齐，悬停 / 聚焦 / `aria-pressed` 时整行白底；`#value` 插槽显示右侧值。保留原生按钮、ID 与事件 |
| `GameKey` | 键帽：`kind="key"` 方形键盘键，`kind="pad"` 圆形手柄键 |
| `GameInstructionBar` | 右下角操作提示，`items` 为 `{ key, label, kind? }`；触屏界面由业务决定是否显示 |
| `GameBanner` | 任务横幅：`tone="success"` 金色（`--ui-reward`）、`danger` 红色（`--ui-danger-strong`）、`info` 白色；`backdrop="desaturate"` 为画面去色。父级有 `transform` 时固定定位会被限制，应改为在遮罩上去色（城市合作结算即如此）。标题与对话框标题重复时传 `role="none"` 并对屏幕阅读器隐藏 |
| `GameFeed` | 通知卡片：语义色左边条、`#icon` 插槽，`duration` 毫秒绘制倒计时条；队列与移除由调用方负责 |
| `GameMeter` | HUD 细条：`role="meter"`，值夹在 0–1，下降时留白色拖尾；`segments` 分格表示护甲 |
| `GameSpinner` | 保存 / 加载环与文字，`role="status"` |

新增 token：`--ui-reward`、`--ui-danger-strong` 只用于任务横幅语义，`--ui-shadow-title` 为大标题描边阴影。当前接入：街区暂停菜单（菜单行 + 操作提示）、首章通关横幅、城市合作结算横幅与失败去色。

新增视觉值优先使用这些 token。场景布局的宽度、位置和响应式断点由业务组件决定。旧的 `--arcade-*`、`--launch-*`、`--menu-*` 等变量保留为共享 token 的别名，供尚未迁移的功能面板使用；不再新增独立色板。

Electron 在恢复本机设置后按需加载 `DesktopTitlebar` 与桌面外壳。标题栏复用 `--ui-surface` / `--ui-text` / `--ui-line`，保留原生窗口按钮、拖动区域和 macOS 系统菜单；原生 overlay 的颜色及高度与这些 token 保持同步。全屏隐藏标题栏并恢复完整游戏区域。桌面外壳为固定 HUD 建立包含块；Dialog、Select 和车库通过 `getUiPortalTarget()` 挂载到游戏区域，浏览器仍挂载到 body。新增 Portal / Teleport 应复用该目标，弹窗高度使用 `--app-height`，避免遮挡标题栏或超出游戏区域。

## 公共基础组件

组件位于 `apps/dayun-kicker/src/ui/components/base/`，仅负责展示，业务状态通过 props / slot / 原生事件传入。

| 组件 | API | 已使用场景 |
| --- | --- | --- |
| `GameButton` | `variant`: primary / secondary / quiet / danger；`size`: sm / md / lg；`type`、`disabled`、默认 slot | 首页选项、菜单 Tab、开始按钮、HUD 工具、设置 / 街区 / 车库操作、暂停 / 结算 / 恢复按钮 |
| `GameLink` | `href`；与 `GameButton` 相同的 `variant` / `size`；默认 slot | 街区暂停菜单、城市合作候场的返回首页入口 |
| `GameCloseButton` | `label`（完整可访问名称与悬停提示）；透传 ID、disabled 与原生事件 | 地铁线路地图、7号门店关闭 |
| `GamePanel` | `as`: div / section / aside；`tone`: normal / strong / hud；局部 `--ui-panel-padding` 控制内边距；默认 slot | 首页控制台、比赛 HUD、显示设置、街区欢迎 / 导航 / 地图 / 暂停、车库列表 / 详情、比赛与购买弹层 |
| `GameMetric` | `label`、`value`、`unit?`、`valueId?`、`tone`、`as`；局部 `--ui-metric-size` 控制数字大小 | 首页纪录、比赛分数、街区速度、观景高度 |
| `GameSettingRow` | `label`、`description?`、`descriptionId?`、`controlId?`；slot 放控件 | 画面、声音、操作、时间和语言设置 |
| `GameNotice` | `as`: div / section / aside；`tone`: info / success / warning / danger；`role`: status / alert / none；默认 slot | 街区通知、巡逻与追逐状态、挑战结算、设置加载 / 错误提示 |
| `GameMapNorth` | `label`、`description`（可访问方向说明） | 街区小地图 / 大地图、比赛全程小地图 |
| `GameScrollArea` | `label`（滚动区域可访问名称）、`hint`（更多内容提示）；默认 slot | 首页骑行配置、其他菜单 Tab |

`GameScrollArea` 监听容器与内容尺寸，按实际溢出和滚动位置显示上下渐变及底部提示；到底后隐藏向下提示，无溢出时不进入 Tab 顺序。提示不接收指针、不参与手柄导航、不重复播报；键盘焦点可见时隐藏渐变以保持控件清晰。默认 slot 放自然高度的内容，父容器提供有界高度，内部保留原生滚动和焦点行为。首页保留现有六个分类 Tab；开始页仅配置区滚动，开始按钮位于滚动区外，切换分类时重新挂载对应滚动区。

小屏首页的开发诊断入口收成 DEV 按钮，放在设置按钮旁边，保留原可访问名称与复制行为，避免遮挡时段选择、滚动提示和开始按钮。

`GameMapNorth` 仅用于北朝上的地图，以共享 token 显示固定屏幕字号的单北标；中文 `label` 为「北」，英文为「N」，`description` 说明地图上方为北。组件不接收指针、不进入键盘或手柄焦点，也不管理地图或游戏状态。街区地图放在右上角；比赛全程地图放在路线图外的标题行，避免覆盖路线与检查点，手机及低高度横屏使用「赛道 / 通勤」「Race / Route」短标题，保留完整地图可访问名称。经典骑行的前向路线预览不显示固定北标。

```vue
<script setup lang="ts">
import GameButton from "../base/GameButton.vue";
import GamePanel from "../base/GamePanel.vue";
import GameMetric from "../base/GameMetric.vue";
defineProps<{ speed: number; paused: boolean }>();
defineEmits<{ resume: [] }>();
</script>

<template>
  <GamePanel tone="hud" aria-label="骑行状态">
    <GameMetric label="当前速度" :value="speed" unit="KM/H" />
    <GameButton v-if="paused" variant="primary" @click="$emit('resume')">继续骑行</GameButton>
  </GamePanel>
</template>
```

按钮保留原生键盘行为。所有基础组件均为单根节点，`id`、`aria-*`、业务 `data-*`、class 和事件会透传；选中按钮传 `aria-pressed` 或 `aria-selected`。内部样式属性统一使用 `data-ui-variant` / `data-ui-size` / `data-ui-tone`，避免覆盖游戏已有的 `data-variant`、`data-tone` 等业务属性。`GameSettingRow` 的 `controlId` 关联真实控件 ID，说明 ID 由控件通过 `aria-describedby` 引用。

`GameButton` / `GameLink`、`GamePanel`、`GameMetric` 的展示样式分别维护在 `ui/styles/button.css`、`panel.css`、`metric.css`。按钮与链接直接导入同一份仅作用于 `.game-button` 的样式，构建时去重；面板与读数使用 scoped 外部样式。街区 loading 页需要在 Vue、Three 和地图模块到达前显示，因此保留 `district.html` 的原生 HTML，并在 `district/loading.css` 直接导入同一份样式和 token。原生节点复用对应的 `game-*` class、`data-ui-*` 属性和读数结构；返回首页保留原生链接，使用按钮样式的悬停与焦点反馈。加载状态、进度和错误恢复仍由 `district/loading.ts` 管理，不引入 Vue 运行时。正常进度使用 info，错误使用 danger；保留原有 DOM ID、单一状态播报、输入隔离和焦点恢复。

`GameLink` 保留原生 `<a>` 的链接语义、跳转、键盘与修饰键行为，并复用 `GameButton` 的 `ui/styles/button.css`；游戏菜单内的导航操作不使用下划线，通过方角底板、边线、悬停和键盘焦点表示可交互。链接不提供按钮的 `type` / `disabled` 属性，ID、ARIA、业务属性与原生事件直接透传。

宿主统一安装 `ui/interactionFeedback.ts`，覆盖首页、比赛、街区及合作菜单，包括 Portal 内的按钮、Select 和 Switch。点击反馈样式在首次操作时加载，通过短时 `data-ui-feedback="pressed"` 使用共享动效、边线和明暗 token，不改变选中配色、布局或焦点；减少动态效果时取消动画。基础组件不引入音频依赖。音效通过 `GameAudio.play` 提交带类型的声音事件，复用主音量、静音与音效通道；菜单导航、确认、开关、打开和关闭使用不同短音，暂停期间保留菜单反馈。首个用户操作解锁音频，音频不可用时仍能正常操作。宿主通过 `subscribeSettings` 同步其他作用域改变的音量与静音。禁用、隐藏、输入框编辑和修饰键导航不播放反馈，键盘重复与同一次操作产生的事件去重。分类、优先级、声部预算与生命周期见 [统一音效系统](audio-system.md)。

原生按住控件或 `data-ui-held` 节点保持指针捕获和释放流程，只在按下时显示反馈；骑行音效由合并输入的按下边沿产生，长按、持续转向和暂停恢复不重复响铃。已有踢击、开火等玩法音效的区域可传 `data-ui-sound="none"` 取消通用确认音，内部菜单入口用 `data-ui-sound="auto"` 恢复；游戏动作音效仍由宿主在有效操作后播放。宿主卸载时清理监听器及反馈计时器。

状态通知默认使用 `role="status"`；已有内部 live region 时传 `role="none"`，避免重复播报。需要直接获取原生 DOM ref 的 Reka 关闭按钮仍保留原生节点，使用同一组 token。

关闭按钮统一为方形图标，不显示「关闭 ×」重复文字。`GameCloseButton` 复用 `GameButton` 和装饰性的 `GameCloseIcon`；需要原生 DOM ref 的地图、设置、帮助和车库保留原生 button，使用同一个图标及 `ui/styles/close-button.css`。点击区域使用 `--ui-control-height`（桌面 40 px，窄屏或触屏 44 px），图标使用 `--ui-text-lg`；完整名称保留在 `aria-label` 和 `title` 中，悬停白底深色图标，键盘焦点使用共享 token。保持各入口的关闭、输入释放和焦点恢复行为。

街区大地图的 `DistrictMapSidebar` 负责 Reka Tabs 分类、地图与侧栏布局及 `GameScrollArea` 滚动，宿主通过 `v-model:tab` 控制分类、`busy` 暂停交互，通过 `map` slot 提供地图、其他具名 slot 提供业务内容。分类为导航、活动、游览、配送、外卖箱、环境、设置、操作、存档；`DistrictMapSettings` 将设置再分为车辆、声音和画面。顶层分类横条位于标题下方，横跨地图和侧栏，采用黑色底板、细分隔线和白色选中态。保持单行，窄屏横向滑动；方向键、手柄和业务入口切换时，当前分类自动进入视野。只有当前分类内容滚动，未选中的内容不挂载；外卖箱仅在退场过渡期间保留，结束后卸载。关闭按钮与时段控件保持可见。暂停菜单的操作 / 存档入口和街区接单入口直达对应分类，新手引导直接展示活动分类。

手机竖屏在导航分类保留地图预览，其他分类将地图区域腾给内容；高度不超过 650 px 时进一步缩小导航预览，并使用单行触控工具，避免设置子分类被底部遮挡。开发诊断入口收敛为 DEV 按钮，竖屏留在地图外并仅在开发入口存在时预留底部空间，低高度横屏放在关闭按钮旁。

街区大地图按需加载 `DistrictMapPoints`，为7号门店、餐厅、骑手站、观光入口等功能地点优先显示短名称。标签按屏幕尺寸和缩放重新排布，避开彼此、功能地点图标及地图工具；拥挤时保留标记，悬停或键盘聚焦通过 Reka Tooltip 展示完整名称与功能。点击、触屏点按及 Enter / Space 只发送一次原始导航地点；拖动不触发导航。`data-map-place` / `data-map-label` / `data-map-tooltip` 用于定位地点、标签和悬浮提示，既有活动与地铁标记属性继续保留。字体、底板、焦点与层级使用共享 token，HTML 提示沿用公共 Portal 目标。

街区外卖箱按需加载 `InventoryPanel`，通过 `InventorySlots` 展示十个可聚焦物品格、`InventorySupplies` 展示骑手站补给。业务通过 props 传入物品、受保护的配送物品、体力、冷却与余额，使用 / 丢弃 / 购买事件由宿主重新验证并保存。打开与关闭复用大地图的输入释放、焦点管理和手柄导航；个人物品与订单状态分别持有，订单物品只派生显示，不重复保存。

地图数据下载、详细来源与 ODbL 许可集中在首页「关于 → 地图」，`AboutLinks` 和地图子菜单按需加载，查看说明不下载地图 JSON。大地图旁只保留一条简短 OpenStreetMap 署名；街区、双人合作和城市合作 HUD 不重复展示数据下载和许可链接，合作候场页也不重复展示地图来源。

`GameNotice` 默认渲染为 `div`；挑战结算等具名区域使用 `as="section"` 和 `aria-label`，配合 `role="none"` 保留原生区域语义。

`GamePanel` 默认内边距随 tone 决定。列表等场景可以在面板根节点局部设置 `--ui-panel-padding: 0`，详情面板可以设置 `--ui-panel-padding: var(--ui-space-2) var(--ui-space-3)`；不要在全局设置此变量，以免影响其他面板。

街区观景的地点 HUD 和底部控制条复用 `GamePanel` 的 `hud` 底板，高度读数使用 `GameMetric`，方向与返回骑行按钮使用 `GameButton`。`TourHud` 负责地点展示与事件转发，`TourControls` 负责高度输入和按住操作；方向按钮用 `aria-pressed` 显示按住状态，保留指针捕获、多输入源独立释放及键盘 Enter / Space 操作。原生高度滑杆沿用稳定 ID 和输入事件，使用共享控件高度、选中色与焦点 token。城市游览地点列表也使用同一组字体与间距 token，不单独维护绿色色板。

手机观景期间，开发诊断入口缩为 DEV 按钮，保留“复制调试信息”可访问名称；竖屏仅在该开发入口存在时抬高控制条，横屏将入口留在控制条左侧，避免覆盖移动按钮与操作提示。

车库的皮肤色块继续使用车型业务色；选中行、筛选项和预览工具使用公共按钮的白底 / 深色文字。车库关闭、购买确认等已有原生 DOM ref 保持不变；比赛统计保留 `dl` / `dt` / `dd` 语义并使用共享 token。

`GaragePreview` 接收 `skinId`、可选 `palette: ScooterSkinPalette` 与 `seating: "single" | "double"`（默认 `single`）；传入 palette 时叠加预览配色，异步模型加载或皮肤切换后重新应用，显式头盔配色同时展示头盔。双座预览使用共享世界载具与独立乘客外观，货箱、货架及后座音箱由座位配置控制；默认车库仍展示单座，宿主通过 seating 指定预览配置。预览组件不管理购买、权益或存档。街区7号门店按需加载 `ScooterShopDialog`，复用该预览和 Reka Dialog / Tabs、公共基础组件；宿主负责停车、积分交易及装备状态，进店期间冻结游戏输入和计时，关闭后恢复进店按钮焦点。

窄屏车库预览工具保持单行，额外音乐操作可横向滚动访问，避免工具栏遮住车辆。旋转、夜景、音乐按钮在窄屏显示图标，并保留完整可访问名称和选中状态。开发模式的复制诊断入口使用车库页脚空间，不能覆盖装备或购买操作。

不超过 600 px 的暂停 / 结算界面，开发诊断入口收敛为左上角的 DEV 按钮，保留“复制调试信息”可访问名称及状态播报，避免覆盖统计内容。

比赛骑行时，手机开发诊断入口使用紧凑 DEV 按钮，竖屏放在上方读数下侧、横屏放在上方读数和地图之间，避开踢击与油门 / 刹车区域。街区显示教程或附近活动时，诊断入口使用已腾出的左上方空间，不覆盖引导和活动开始按钮。

街区 loading 与加载失败界面的开发诊断入口收敛为右下角的 DEV 按钮，保留完整可访问名称，不遮挡返回首页、重新加载或底部街区说明。

宽度超过 700 px、但高度不超过 520 px 的横屏车库使用列表 / 预览 / 详情三列，保留主题描述、省略配色详情，优先保证预览和主要操作可见；列表及详情内容仍可独立滚动。

皮肤使用「名称 + 短主题描述 + 装备标签」。主题描述表达角色或城市氛围，制服、头盔、货箱等具体特征由标签展示。名称与主题描述统一维护在 `config/skinMessages.ts`；车库与商店通过 `shop.skins.<id>` 使用中英文文案，`game/skins.ts` 的中文兜底也复用同一份配置。手机和横屏也要保证主题句与主要操作可见。

## 当前设置面板

| 交互 | 使用组件 | 项目职责 |
| --- | --- | --- |
| 弹窗 | DialogRoot / Portal / Overlay / Content / Title / Description / Close | 控制打开状态、初始关闭按钮焦点和布局 |
| 分类切换 | TabsRoot / List / Trigger / Content | 分类内容、样式、稳定 DOM ID 与手柄导航 |
| 下拉选择 | GameSelect 封装 Reka Select | 类型化选项、GTA 样式与手柄操作 |
| 开关 | GameSwitch 封装 Reka Switch | GTA 样式、可访问名称和说明；键盘 / 手柄确认切换 |

骑手开发预览的皮肤、车身颜色和配送箱颜色选择同样复用 `GameSelect`；`RiderSkinSelect` 通过 `initialValue` / `options`、`initialPaint` / `paintOptions` 和 `initialCargo` / `cargoOptions` 初始化三个独立选择，分别发送 `change`、`paintChange` 和 `cargoChange`。场景、音频和本地预览偏好由诊断宿主管理；颜色复用门店涂装目录，车身和配送箱配色都保留人物服装，车身选择「套装原色」恢复当前皮肤的车辆配色。配送箱默认黑色，可独立选择颜色或选择「跟随车身」。三个控件通过共享间距 token 在窄屏换行，浮层由公共 Portal 挂载，避免被工具栏裁切。Select 的触发器和浮层处理键盘操作时，诊断射击快捷键忽略这些事件；Esc 关闭浮层后恢复触发器焦点。

新增弹窗、Tabs、Select、Slider、Switch、Popover 或 Tooltip 时，优先检查 Reka UI 的对应组件；重复的样式和游戏输入适配封装为小型共享组件。普通操作按钮使用 `GameButton`，其根节点为原生 `button`。

操作设置与街区地图复用 `ControllerHelp`：`district` 控制比赛 / 自由骑行映射，`initialDevice` 指定初始设备（默认 `controller`），`ready` 通知说明已挂载以便入口恢复焦点，连接状态由 `useGamepadStatus` 提供。通过 Reka Tabs 切换「手柄 / 键盘与鼠标」，默认展示手柄；设备切换与设置分类的导航互不干扰。`ControllerDiagram` 与 `KeyboardDiagram` 接收 `bindings`，`ControllerDiagram` 可选 `note` 覆盖默认说明文字，复用 `InputDiagram` 展示 GTA 风格的操作行、设备图与引线；该组件接收 `name`、`bindings`、可选 `note` / `keyboard`，默认 slot 提供 `activeKeys`，设备节点通过 `data-ui-input-key` 标记按键。点击、悬停或用键盘 / 手柄聚焦操作行时，白色选中行通过引线指向设备上的实际按键；组合键和替代键同步高亮、分别连接。默认选中油门。普通引线使用灰色细线，悬停操作行或通过键盘 / 手柄聚焦时，对应引线变为更粗的白色线与端点。悬停图示中的按键时反向选中对应操作，只强调该按键的引线；同一按键有多个映射时优先保持当前操作，否则选择首个主要映射。离开后取消悬停强调，键盘焦点仍保留强调。窄屏按需滚动操作列表，保持设备图位置。引线只展示当前操作，避免交叉遮挡；宽容器左侧说明、右侧图示，窄容器图示在上、可滚动的双列操作行在下，引线沿列表外侧经过；DOM 测量随尺寸、操作选择、列表滚动与设备 Tab 更新，卸载时释放观察器。`KeyboardDiagram` 还用 `boundKeys` 描边常用键，`district` 控制场景说明，并展示鼠标位置。图示的操作行来自同一份映射，详细按钮表继续保留。`ControllerBindingList` 用 `title` 与 `bindings`（`id`、`buttons`、`action`、可选 `chord`）展示按钮 / 功能对应表；`keyboard` 为 true 时使用方形 `<kbd>` 标签。这些组件仅负责展示。手柄采用 Xbox 按钮名称，并明确其他标准映射手柄对应相同位置。`chord` 为 true 时在按钮之间显示加号，用于按住 A 再点 LB / RB 的组合踢击或 Shift + Tab；驾驶与踢击参考 GTA，游戏专属动作另行说明。键盘移动键从 `ACTION_KEYS` / `RIDE_KEYS` / `EXPLORATION_KEYS` 读取，区分比赛 S 刹车 / 漂移与自由骑行 S 倒车、Shift 刹停。未连接手柄也显示图示，窄容器上下排列，宽容器并排展示，避免在街区侧栏挤压。图示与按钮表随操作分类或街区地图按需加载，中英文说明保持一致。

街区骑行 HUD 用 `useTouchControls` 跟随主要指针的 `(pointer: coarse)` 能力，宽度不决定输入模式。PC 隐藏骑行、踢击、道具与掉头触屏控件，保留上下车／视角按钮、鼠标捕获提示和速度、导航与状态读数；速度读数移至底部，PC 开发诊断入口放在右下方并避开速度与地图署名；手机骑行诊断入口收敛为 DEV 按钮，竖屏留在右侧、横屏避开左侧转向控件，保留完整可访问名称。触屏继续挂载 `RideControls` / `RideActions`，输入设备切换或打开地图时卸载骑行控件并释放按住状态。操作图示收在地图中，PC 默认键盘视图，暂停菜单的「操作说明」直达该区域并在返回时恢复入口焦点。「回到路面」在暂停菜单保留，触屏同时保留原有快捷入口。

图标按钮保留可访问名称，装饰 SVG 使用 `aria-hidden`。用 Grid / Flex 显式居中图标，使对齐不依赖字体基线。

弹窗内游戏输入应暂停或忽略 UI 事件。弹层关闭后恢复触发器焦点；嵌套下拉框的 Esc / 手柄 B 先关闭下拉层。设置保持按需加载，验证生产构建和现有体积预算。

设置打开时加载画面内容；声音、操作和客户端状态分别在首次切换到对应 Tab 时下载，随后复用模块缓存。Reka TabsContent 不挂载未选中的内容，避免隐藏面板触发下载。超过 200 ms 显示载入提示，失败或超过 20 秒显示重新载入按钮，其他分类保持可用。

首页默认的城市开始菜单随首页直接加载，剧情、自由模式和开始按钮不依赖单独的菜单分包。赛事准备页的规则与赛道选择同样同步加载，预览继续按需下载。排行榜 Tab 暂时使用共享面板和按钮同步展示「建设中」说明及返回开始菜单入口，不加载排行榜模块、不请求榜单。帮助、联机、账号和赛道预览继续按需加载，使用 `ReadyPanelStatus` 立即显示加载状态，失败或超过 20 秒提供重新载入按钮；切换到其他 Tab 仍可使用。Tab 动画作用于同步挂载的容器，避免异步组件尚未解析时留下空白。

Vite 模块清单属于构建校验数据，构建后保存在 `apps/dayun-kicker/.vite/manifest.json`，发布目录保留游戏实际资源。首屏预算仍按完整静态依赖闭包计算；校验前运行 `pnpm build` 生成清单。

参考：[Reka UI Dialog](https://www.reka-ui.com/docs/components/dialog)、[Tabs](https://www.reka-ui.com/docs/components/tabs)、[Select](https://www.reka-ui.com/docs/components/select)、[Switch](https://www.reka-ui.com/docs/components/switch)。

## 街区剧情对白

`StoryDialogue` 按需挂载 Reka Dialog，使用 `GamePanel`、`GameButton`、`GameNotice` 和 `--ui-*` token。弹层使用 `getUiPortalTarget()`，离开时恢复交谈入口焦点，剧情节点变化时聚焦首个选项。宿主冻结驾驶、镜头、环境和配送计时，卸载触屏骑行控件以释放按住状态。剧情执行与任务桥接见 [ADV.JS 剧情接入](advjs-narrative.md)。

## 街区地铁

地铁入口提示复用 `GamePanel` / `GameButton`，`MetroStationPanel` 只显示站名、入口及线路图 / 出站操作。`MetroTravelDialog` 按需加载 Reka Dialog，`MetroNetworkMap` 展示 GTA 风格的完整矢量线网及可聚焦的可传送站点按钮；站点、出口选择和路线预览由弹层管理，进站、停车、碰撞落点与传送由宿主管理。弹层使用 `getUiPortalTarget()`，关闭后恢复 `district-metro-travel` 焦点，打开时冻结街区和站厅输入并释放触屏按住状态。线路色来自已核查的地铁导视数据，其他面板、选中、焦点和控件尺寸仍用共享 token。地图目录导航到出入口，传送仅在入口或站厅开放；首期范围与资料精度见 [广州地铁](guangzhou-metro.md)。

`MetroNetworkMap` 接收 `stops`、`fromId`、`selectedId`、`disabled` 和可选 `diagram: MetroDiagram`，用 `select(stationId)` 向弹层发送选择，`v-model:expanded` 控制地图展开。`metroVectorNetwork.ts` 保存完整站序、线路区段、来源版本和图示坐标，`metroDiagram.ts` 提供图面尺寸与可玩热点；`MetroVectorDiagram` 只负责 SVG 呈现。线网、站名与热点使用同一个缩放／平移变换。缩放较小时只显示当前与所选站点标记，避免热点重叠；触屏热点及图外操作使用共享触控尺寸。线网数据随弹层按需加载；缩小时优先显示换乘站与关键站名，放大后展开普通站名，行程高亮沿实际线路区段绘制。

地图支持滚轮、拖动、双指缩放与图外按钮；聚焦图面时方向键移动，`+` / `-` 缩放，`0` 适应全图，`Home` 定位当前站。图上热点用 `data-gamepad-skip` 排除菜单焦点，键盘和手柄通过下方真实站点与出口按钮选择行程，避免聚焦被图面裁掉的像素热点。热点和图面使用同一套指针手势，拖动、多指或收起地图取消的手势不触发选站。地图展开时暂时将行程区域设为 inert，Esc / 手柄 B 先收起地图并恢复展开按钮焦点，再关闭线路弹层；此层级需与宿主全局暂停输入一起验证。窄屏及低高度横屏的地图、站点与出口在中间区域滚动，标题和确认按钮保持固定。开发模式的线路弹层为紧凑 DEV 入口预留底部空间，避免遮住确认按钮与站点列表。地图自行绘制线条、站点和文字，底色、站名、选中与行程高亮使用共享 token；地铁线路色属于地物导视数据。

合作模式的候场资料表单复用 `GameSettingRow`、`GameButton`、`GameNotice`；名称与颜色使用保留 label／input 原生事件的控件。衣服色块是角色业务配色，选择态仍使用公共 token。分座位教程复用 `GamePanel`，只在提示按钮接收指针，保留场景瞄准／骑行输入；关闭后恢复场景焦点。教程推进与完成记录由宿主 composable 管理，面板不控制对局暂停。

## 合作生命反馈

城市与双座合作复用轻量的 `coop/HealthMeter.vue` 展示生命／车体耐久，保留原有 HP 数字、稳定 ID、队友距离、倒地救援和雷达。城市本地玩家以左侧边线和独立生命读数强调，低生命使用文字与语义色；倒地条展示救援进度，并提供对应的进度条名称。`healthFeedback.ts` 仅派生受击闪色和短暂伤害残留，不修改权威生命；治疗、复活、新对局和时间回退清除残留。减少动态效果时即时更新生命条并关闭闪色和残留动画。

僵尸生命条以一个有深度测试的实例批次绘制，受场景遮挡及视锥裁切约束，不穿墙。满血仅近距离显示，受伤／刚受击目标扩大距离并优先显示；屏幕重叠剔除、桌面最多 12 条和窄屏最多 6 条避免遮挡玩法。城市和双座使用各自权威最大生命值，显示绑定插值后的角色位置；换局、敌人移除与 renderer 释放时清理状态和 GPU 资源。

### 外卖箱短时过渡

外卖箱沿用地图侧栏；过渡使用共享 `--ui-motion`（当前两倍为 240ms），减少动态效果时为 0。`InventoryPanel.open` 来自真实地图与标签状态，并传给 `InventoryBoxPreview`；地图关闭、切换标签和组件卸载都会关闭箱盖。关闭中的面板设置 inert／aria-hidden 并禁用物品操作，遮罩保留到退场结束；快速重开保留同一组件、预览与选中格。`useDialogFocus` 排除保留中的不可交互控件，取消过期的延迟聚焦，并在反复开关后恢复原入口焦点。I、M 与 Escape 忽略键盘重复事件。
### 剧情章节 HUD

剧情章节由 `story/campaign.ts` 根据已完成的首单、`story.arc`、配送成绩派生的 `milestones` 与当前配送推导。`DistrictModePanel` 的可选 `arc`、`trained`、`milestones` 只接受进度快照；`DistrictWelcome` 继续透传，不处理任务。按需加载的 `StoryObjective` 在原导航 HUD 内展示章节与操作目标，使用共享语义色和文字 token，不新增浮层或重复 live region。窄屏展示简短操作提示，取件要求、交付地点和暗号保持完整；详细章节说明和坐标链接保留在地图内。剧情 HUD 不叠加坐标与普通巡航读数，警示、追逐和踢击反馈继续显示。剧情订单在 `DeliveryBoard` 公开列表中过滤，是否可接受仍由宿主验证。`data-story-delivery-note` 保留当前客户备注，`data-story-delivery-reaction` 展示完成后的街坊回应。

解药送达后，陈家祠南门复用 `#district-story-talk` 作为对讲机入口，文案显示「南门对讲机 · 联系陈叔」；键盘 E、触屏与手柄继续沿用既有对白操作。入口只在户外、停稳和无阻塞时启用，宿主再次验证位置。`DeliveryBoard` 和章节面板负责展示，粮米、工具交接与据点变化由街区宿主管理。
## 性能与网络读数（2026-10-12）

正式 macOS 和浏览器版本可在画面设置中开启轻量性能面板，或按 F8 切换。面板和完整统计组件按需加载，复用 GamePanel、GameMetric、GameButton、GameCloseButton 及共享 token。面板关闭时不读取性能时钟、不采集逐帧数据；卸载后清理订阅与定时器。数字来自游戏实际渲染帧，展示最近 120 帧的实际 FPS、最近最多 4096 帧的 P95／P99、峰值及超过 50 ms 的帧数。绘制数、三角形和实际缓冲尺寸取当前主渲染器，在 WebGPU 最终呈现清零统计之前采集。CPU 数字仅表示渲染提交耗时，不能当作整帧 CPU 或 GPU 耗时。重置／复制用于对照相同场景；正式版不自动请求 GPU 查询。

完整分析仍限开发模式，展开后手动采样 CPU／GPU。WebGL 使用可用的非阻塞计时查询；WebGPU 按能力使用 timestamp-query，合计同一游戏帧的渲染 pass，区分内部呈现帧。不可用或无有效查询时显示不可用。分析结束、关闭或异常时恢复渲染钩子、时间戳开关和查询资源，避免污染后续正常渲染。

加载阶段的离屏视角／阴影／水面预热暂停轻量面板采样，结束后重新开始帧时钟，避免将预热画面和加载等待显示成游玩 FPS 或卡顿帧。性能面板使用共享 strong 面板与 debug 层级，保证读数不被普通 HUD 提示遮挡；网络详情按内容收窄并限制最大宽度，避免展开后横贯游戏画面。

菜单中的兼容 `.menu-action` 样式由使用它的按需组件引入 `menu-action.css`，保持原有视觉和事件；公共首屏样式继续遵守 16 KiB 预算，不把可选诊断和菜单样式加入常驻入口。

街区合作、旧合作和 Steam 竞速 HUD 显示真实连接状态，展开可看 RTT 波动、快照年龄和同步频率。开发／云端合作复用已确认的心跳，Steam 客户端通过房主回包计算本地单调时钟的 RTT；房主标明权威房主，本地挑战标明本地。没有采样、测量过期或断线时 RTT 显示不可用，不能以 0 ms 代替；真实测得的 0 ms 仍是有效结果。同步停滞独立显示，不能据快照年龄改写有效 RTT。旧云端竞速 SDK 没有已确认的 RTT 探针，保留 RTT 不可用，显示其实际快照的连接状态与同步频率。网络展开使用原生 details，支持键盘操作，不使用逐帧 live region 播报。

## 突围战斗提示与情境标记

`CityHud` 的可选 `combatFeedback` 提供确认命中、击倒、格挡、救援和倒地的短时展示，`worldPings` 提供经当前相机投影与建筑遮挡过滤的标记；`ping` 事件交给宿主发送按键意图。`CityCombatFeedback` 只展示文字和确认符号，不重复播报连续攻击；`showHitMarker=false` 时隐藏中心符号，适用于斜俯视的指向瞄准。`CityPingHud` 从权威标记派生发送者、距离与相对方位，只有新增标记进入独立 live region；场景标签使用 `aria-hidden` 避免重复播报。所有提示复用现有语义色、字号、间距和面板 token。

`CityTouchControls` 的「标记」是单次 action，倒地时仍可使用；移动、开火与救援继续使用原有 pointer capture 和释放流程。桌面 G、手柄方向键左与触屏按钮共用同一 action；菜单、失焦与新对局释放待发请求，输入框不拦截 G。宿主处理瞬时反馈生命周期、网络同步和场景投影，展示组件不持有权威规则。

## 移动救援 HUD 与输入

`CityRescueHud` 展示权威任务的阶段、方向、距离、长按进度与全员集合人数，沿用 `#city-wave` 并增加 `#city-rescue-mission`、`data-mission-stage` 与 `#city-mission-target`。场景标签来自宿主 `missionTarget` 投影，只做展示，阶段变化使用单独 live region，距离和进度变化不重复播报。

`CityTouchControls` 的可选 `objectiveLabel / canObjective` 控制独立任务按钮 `#city-objective-action`，沿用 `GameButton` 和指针捕获；按住、取消、失去捕获、阶段变化及卸载均释放任务意图；聚焦按钮也可用 Space／Enter 长按，失焦释放。物资与救人阶段将跳跃、奔跑、队友救援和工具收在「更多」中，保留任务、移动、开火与上下车的直接操作。F 和标准手柄方向键下使用同一 held 输入；宿主只释放任务长按，保留移动和开火等独立操作。物资和幸存者的距离、通路、落地与下车条件由权威再次校验。

## 剧情创作控件

本地剧情编辑器通过 `@advjs/gui/authoring` 复用画布、条件检查器和诊断面板。共享入口不带配色与按钮皮肤，不进入游戏运行包；`StoryGraph`、`ConditionField`、`ChapterDiagnostics` 是 GZA 的展示适配层，继续使用本页 `--ui-*` token 与 `GameButton`。保留 `data-node-id`、原表单标签、画布方向键 / Home、焦点及指针释放行为。

条件解析与校验由 GZA 内容适配器调用原章节校验器；通用控件不认识订单、位置和清场规则。无法解析的 JSON 保留为草稿，校验问题可定位回节点或完整 JSON，超过一页时提供分页。控件无文件或玩家存档写入能力，保存仍使用原本地服务、备份与版本校验。

剧情预览通过 `AdvPreviewPlayer`、`AdvVariableInspector`、`AdvPreviewTrace` 复用对白、变量分组和轨迹交互。GZA 薄封装通过 slot 注入 GameButton / GameSwitch / EditorSelect，并用 `--ui-*` token 处理三栏布局、只读事实、错误和窄屏滚动。共享模块不持有配色或业务状态；`preview-adapter.ts` 把变更事件映射为 GZA 内存命令。保留原可访问名称、`data-preview-choice` / `data-preview-action`、流程与对白节点定位行为；所有控件随预览忙碌、草稿无效或过期状态禁用。

Editor SDK 内的 GZA 工作台在构建阶段通过适配层复用 AGUI Button / Switch / Select / Panel，局部 `--ui-*` 兼容变量映射到宿主 AGUI 语义 token，随 Editor 明暗主题变化；不引入游戏全局 token 或独立色板。现有工作台样式限定到 `.gza-workbench`，不改宿主 body 和控件。面板按容器宽度调整布局，窄面板保持检查器、保存与预览可用。独立入口继续使用游戏 UI 组件与原 token。

Electron 工作台把未保存状态通过 Editor SDK 文档服务汇总到原生标题、保存菜单和 AGUI 状态栏，保留 GZA 字段及保存错误提示。标签隐藏仍参与保存；校验失败或冲突不消除脏标记。关闭使用原生确认，避免与浏览器提示重复；有脏文档时插件停用按钮报告原因并保留面板。

## Godot 四人同城房间

原生首页通过「四人同城」进入独立房间场景，复用导出的 UI token 与原生 Widgets。候场显示 4 人容量、准备状态、Steam 邀请和房主开始按钮；连接后隐藏地址编辑区。菜单使用可滚动的方角半透明面板，窄窗口仍能聚焦全部操作。Esc／Start 打开菜单并释放本地输入，房间模拟继续运行；离开房间释放远端角色，回到单人恢复个人进度。协议和状态由房间模块管理，界面只发送意图，详见[原生联机说明](godot-multiplayer.md)。
