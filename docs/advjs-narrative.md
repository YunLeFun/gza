# ADV.JS 剧情接入

2026-10-08，本地试点：客村骑手站的陈叔对白、骑手登记与「园区午餐」配送。使用现有城市、角色实例批次、任务规则和存档；不引入 ADV.JS Client、默认主题或编辑器到游戏运行包。

## 本地运行

应用通过 workspace 依赖使用仓库中的 [`vendor/advjs/`](https://github.com/YunLeFun/dayun-kicker/blob/main/vendor/advjs/README.md) 固定 SDK 快照，版本为 `0.1.4-dayun.8`。快照保留所需运行时、编译器、解析器、类型、源码和 MPL-2.0 授权，独立 CI checkout 可直接安装与构建，不依赖开发者机器上的 ADV.JS 工作区。npm 发布版尚不包含当前使用的统一运行时入口；上游发布兼容版本后再替换为固定 npm 版本。

网页同时公开对应的普通源码文件、构建元数据、来源与许可证，见 [ADV.JS 发布依赖与源码说明](./advjs-release-snapshot.md)。使用已提交的 workspace 快照，不从本机上游自动覆盖，不将依赖或源码压缩包加入 Git。

在游戏仓库执行：

```sh
pnpm install
pnpm story:build
pnpm dev
```

从首页进入「剧情模式」并开始骑手故事，沿导航到 TIT。自由模式也可点击「拜访客村骑手站」。停稳后使用「与陈叔交谈」按钮或键盘 E；手柄沿用交互键。对白选项可通过 Tab / Enter 或手柄方向 / A 操作，Esc / B 离开。首次可登记骑手，再次交谈可接园区午餐；已有配送时不会提供新订单。剧情模式与自由模式复用这套对白、任务和存档，模式切换保留已完成的业务操作。

当前 JSON 节点图、可视化编辑器、预览及向 ADV.JS 的分批迁移见[共享剧情创作说明](./story-json-graph.md)。

## 模块边界

| 模块 | 职责 |
| --- | --- |
| `packages/dayun-kicker-content/data/chapters/zhou-hai-re.json` | 唯一手写章节源：对白、稳定选项 ID、JSON 条件与世界流程 |
| `scripts/build-story.mjs` / `scripts/story-pipeline.ts` | 校验共享 JSON，并生成 Web / Godot 兼容产物 |
| `src/district/story/session.ts` / 共享 `chapter-story.ts` | 按需加载运行时，复用宿主扩展声明并处理活动结果 |
| `src/district/story/controller.ts` | 加载取消、连续点击保护、展示状态与快照 |
| `src/district/ui/StoryDialogue.vue` | Reka Dialog、共享游戏组件和设计 token |
| `src/district/main.ts` | 交谈距离、输入 / 时间冻结、登记与接单规则 |

编辑剧本后运行 `pnpm story:build`；`pnpm story:check` 检查 JSON 是否过期，应用 build 也会检查。编译器的宿主活动不确定性提示由剧情单测与实际任务 E2E 覆盖；没有将提示当作分支已验证。

宿主活动只请求登记或接单，由已有游戏函数检查并执行，返回纯 JSON 结果。奖励仍由原配送结算负责。对白打开时冻结模拟，背景渲染降到 5 FPS，手柄轮询仍正常运行。没有剧情回退入口；运行时 checkpoint 与 trace 数量设为 0，已完成活动的恢复不会再触发业务操作。

剧情快照作为可选 `story` 字段存入原有街区存档，保持旧存档可读。单个剧情数据限制为 10 KiB，沿用整份存档的 32 KiB 上限。重新交谈时用当前骑手 / 配送状态刷新条件；剧本语义 hash 改变或快照无效时重新开始交谈，保留城市与任务进度。

## 按需加载与多剧本扩展

当前通过动态导入 `session.ts` 按需加载轻量运行时，编译器只用于构建；陈叔剧本在同一剧情块内。上游 `docs/guide/runtime/embedding.md` 已提供 SDK 包装、多章节编译与独立 Program 加载目录示例，源码在 `docs/examples/web-game/`。

后续增加 NPC 时，共享流程可把多份 `.adv.md` 编译到同一 Program，用章节 ID 和显式链接编排；需要独立下载的对白分别编译为 Program，通过字面量动态导入白名单加载。缓存剧情数据，每次交谈创建独立会话。当前游戏只配置陈叔会话；扩展多 NPC 存档前需调整 `story` 字段与大小限制、保留旧字段兼容，并按玩家 / NPC / Program 隔离快照，再检查现有性能和发布预算。

## 验证

```sh
pnpm exec vitest run apps/dayun-kicker/src/district/story/session.test.ts apps/dayun-kicker/src/district/saveGame.test.ts
pnpm exec playwright test e2e/story.spec.ts e2e/delivery.spec.ts e2e/save-game.spec.ts e2e/lazy-loading.spec.ts
pnpm typecheck
pnpm build
pnpm verify:performance
pnpm verify:release
```

ADV.JS 上游增加 `@advjs/core/runtime` / `@advjs/core/compiler` 公共子入口，保留原根入口；同时把单独的 `type: end` 编译为终止节点，避免对白分支串入后续分支。

2026-10-08 实际验证结果：

- 游戏侧剧情、存档与输入测试：3 个文件、32 项通过；ADV.JS 入口、终止、宿主契约与选项 ID 测试：4 个文件、9 项通过。
- 新增剧情 E2E 的桌面读档、320 × 568 手机接单结算、手柄确认取消均通过。原有配送手动存档 E2E 通过。
- 原有设置 / 音频按需加载 E2E 首次耗尽默认 60 秒时限，单独以 `--timeout=120000` 复跑通过，实际约 1 分钟；未修改共享测试时限或性能预算。本机无头浏览器的城市初始化约 20 秒，新增剧情测试在本文件内为初始化保留 45 秒。
- 两个仓库类型检查、游戏构建、发布产物与性能预算校验通过；ADV.JS 核心构建、定向 ESLint、文档检查与文档构建通过。
- 生产剧情与运行时块为 26,161 字节，gzip 压缩级别 9 后为 8,230 字节（8.04 KiB），首次进入城市不加载。首页 JS 295.4 KiB / 350 KiB，街区入口 JS 312.5 KiB / 350 KiB；预算未调整。

更新 SDK 快照时，按 `vendor/advjs/README.md` 重建类型、解析器和核心包，再执行剧情校验与浏览器 E2E。常规游戏开发无需构建外部 ADV.JS 仓库。详细初次联调记录位于 ADV.JS 仓库的 `docs/reports/2026-10-08-headless-game-integration.md`。

## AI 辅助维护与扩展

通用接入指南已整理到 ADV.JS 仓库的 `docs/guide/runtime/embedding.md`；Agent 契约、CLI / MCP 与运行时 AI 活动参考位于 `docs/ai/web-game-integration.md`。本文件保留大云游戏自己的流程、命令和验证记录。

本项目可交给 Agent 的维护说明：

```text
读取仓库约定、docs/advjs-narrative.md 和 docs/ui-components.md。
剧情源为 packages/dayun-kicker-content/data/chapters/zhou-hai-re.json，
生成 JSON 使用 pnpm story:build，校验使用 pnpm story:check。
宿主插件 courier/service 允许 register、accept、finishChapter；接单的 orderId 必须在章节订单白名单内，收尾须通过章节完成条件。
任务接受还需验证实际位置、背包空间与章节前置条件。
registered、hasOrder、completed 从现有骑手和配送状态刷新；剧情不直接发放奖励。
修改对白保留稳定选项 ID、显式锚点和分支 end；同步生成产物。
修改桥接时保留输入 / 时间冻结、旧存档兼容、连续确认保护和关闭焦点恢复。
按改动运行现有剧情、存档、输入和相关 E2E，报告未验证范围。
```

当前陈叔对白是预编译固定剧情，未连接模型。要增加实时 AI 闲聊，可在单独的宿主活动中调用游戏后端，校验文本后返回运行时；作者对白仍可作为离线兜底。骑手登记、接单与结算继续由现有业务函数执行，AI 回答不直接改写这些状态。


## 外卖教学与解药主线（2026-10-11）

第一章从陈叔的骑手登记开始，用「园区午餐」引导加速、转向、刹车、地图导航和停车交接，再给丽园雅庭的阿婆送热粥。第一单记住「轻敲门」；随后「滨江咖啡」取餐后接近艺术博物院、配送已进行至少 3 秒时，第一次遇见感染者。剧情感染者复用已有模型与实例池，慢速靠近玩家，可绕行或用骑行踢击击退。

异变后回站接「阿婆的第二单」：两单共用原有 `liyuan` 交付坐标，备注变成「别按门铃，楼道里有人」。她家附近也会出现剧情感染者；完成第二单后撤去这组感染者，街坊从后门接应阿婆。随后可接密送任务，到省二医取密封保温箱，送到陈家祠南门，暗号「粥还热」。陈叔不直接宣布话事人身份，医院留箱、街坊接应、留粮和借工具的反馈逐步体现他的关系与安排。

解药送达后，南门启用对讲机，沿用同一对白会话与宿主桥接，通过 `atRefuge` 显示通话开场。在这里先接 `chen-food`，再接 `chen-tools`；取件点沿已连通的祠堂周边路线选取，是虚构接应点。交接后，`story/refugeScene.ts` 按需加载并展示救护棚 → 临时厨房 → 修车点和骑手集合区；救助过的阿婆随解药到达出现。模型使用程序几何与合批，首次进入城市不加载据点块。

医院、外卖箱、路线、停车交接、积分和存档继续由街区宿主管理；阿婆、解药和据点补给单不出现在公开接单板，取消后仍可重新接取，完成后不再重复提供。宿主再次检查地点、背包和章节条件，不能通过隐藏选项绕过前置任务。

`story.arc` 保存 `outbreakSeen` / `briefed` / `antidoteDelivered` 和可选的 `chapterCompleted`，独立于对白快照。教学和四项里程碑从有效最佳配送成绩派生：`tit-lunch`、`granny-first`、`granny-second`、`chen-food`、`chen-tools`；无需新增一份重复存档。剧本 hash 更新只重置交谈，保留城市、任务和据点进度。已有咖啡单仍可触发异变；已接受解药的旧存档通过 `briefed` 保留续送和重新接取能力；已送达解药的旧存档可直接接粮米，但首章收尾前仍需完成阿婆两单。旧存档没有新订单成绩时，对应里程碑为 false。

首章「粥还热」在南门对讲机收尾。完成教学、救援、解药与两次补给后，玩家听到阿婆、阿杰和陈叔的回信；宿主再次核对地点与订单，确认 `finishChapter` 后出现通关卡。称呼“街坊骑手”随章节进度保留，结尾不追加配送积分。重看和恢复对白不会重复结算。完整节奏与验收见 [第一章](story-chapter-one.md)。

章节与任务提示由 `story/campaign.ts` 派生，`StoryObjective` 展示当前目标，继续沿用键盘、触屏与手柄对白行为。地理来源、桥面近似与程序祠堂范围见 [陈家祠地图与剧情](chen-clan.md)。

本轮验证：9 个相关单测文件、76 项通过；七单剧情与据点读档 E2E 通过，原有桌面交谈、手机接单、手柄对白三项 E2E 通过。全仓库类型检查、网页构建、发布产物校验、剧情生成校验与 Git 资源检查通过。七单 E2E 使用开发定位接口检查交接、场景和存档，长途道路连通性由地图单测检查。

网页体积预算仍有两项失败：街区入口 gzip 356.9 KiB / 350 KiB，城市合作入口 373.6 KiB / 350 KiB；未放宽预算。剧情和据点模型继续按需加载，此轮未执行发布。

## 首章世界交互

`story/moments.ts` 负责门口救援和解药路口选择，使用剧情 arc 的有界可选字段保存阶段。它不自行发积分：`main.ts` 在满足世界交互条件后才允许 `stepDelivery` 交付。`grannyRescue` 只接受 knocked / answered / clear / escorted，`antidoteRoute` 只接受 direct / quiet，`antidoteCheckpoint` 必须有合法路线。旧版 arc 继续接受，已完成的配送记录仍决定阿婆和据点里程碑。
