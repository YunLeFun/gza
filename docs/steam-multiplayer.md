# Steam 好友房：四人竞速与僵尸突围

「僵尸突围」使用统一的 1–4 人城市房。玩家在同一张广州地图中步行射击、近战、救援，寻找电动车后可驾驶或双座共乘，停稳后下车继续战斗；这些是对局内操作，不再拆分为两种玩法。

统一大厅地址为 `/coop.html`，`/city-coop.html` 保留为相同玩法的兼容入口。城市协议升级为 `dayun-city-coop-v5`，继续使用虚拟端口 2；权威输入增加上下车序号、油门、转向与刹车，快照同步车辆、座位以及个人生命和弹药。规则在房主主进程运行，客户端不能自己分配座位。每辆车最多两人，四人可分乘两辆；司机负责驾驶，后座瞄准射击，近战和救援需要下车。v5 同步移动救援目标、长按进度、幸存者跟随／后座和全员撤离；F／方向键下操作物资与幸存者。继续同步情境标记；G、触屏标记按钮和手柄方向键左共用有序请求，倒地后仍可求救。操作与开发试玩见[僵尸突围](city-zombie-coop.md)。

旧两人固定路线合作房保留 `dayun-kicker:sockets-coop:v2` 和端口 1，仅用于旧邀请及既有兼容验证。接受 Steam 邀请时，v5 城市协议打开 `/coop.html`，旧双座协议打开 `/coop-legacy.html`，竞速协议返回首页；目的页面加载后才加入。旧城市 v2 / v3 / v4 客户端被拒绝，新旧规则不会互相解释车辆输入。三个技术房间连接仍互斥，旧云端房不自动升级。历史记录见[双座路线兼容说明](zombie-coop.md)。

Steam 桌面版的首期联机采用玩家房主：2–4 名玩家在好友大厅中准备，由房主开始经典 1.5 km 冲线赛。对局在房主的 Electron 主进程中按 60 Hz 运行，客户端发送操作、接收 20 Hz 快照；渲染端插值显示本人和最多三个对手。房主切到后台不会因为渲染停止而暂停整个房间。

进入菜单「联机」，创建房间后使用「邀请 Steam 好友」，或把房间号发给好友。所有成员连接完成并准备后，房主的开始按钮才可用。游戏运行中接受 Steam 邀请和启动参数 `+connect_lobby <大厅 ID>`；已有房间时不自动跳到其他房间。比赛开始后禁止新玩家加入。

玩家需使用同一个正式 Steam App ID、拥有对应的开发者测试权限，并保持 Steam 在线。默认 `appId: 0` 时显示 Steam 不可用，单人竞速、城市漫游和本地单人僵尸突围仍可离线使用。Steam 身份用于好友房，不等同于云乐坊账号登录。

## 两种服务器模式

| 模式 | 运行位置 | 当前阶段 |
|---|---|---|
| 玩家房主 `steam-host` | 房主电脑，Steam 大厅和 P2P 连接 | 本期已接入代码与模拟测试，真实 Steam 联机待实测 |
| 官方服务器 `official-server` | 运营方托管的服务器 | 后续规划，可对持续运行的房间等服务收费 |

桥接协议显式区分 authority；游戏通过同一套输入 / 快照 / 会话边界消费对局数据。`AuthoritativeRace` 不调用 Steam、Electron 或云乐坊服务，后续官方房间可复用该规则模块。现有 Play / Colyseus 的网页联机继续保留；它目前仍使用双人规则，尚未迁移到本模块，也不与 Steam 好友房互通。

收费、Steam 支付、服务权益验证、官方实例调度和主机迁移均留待后续独立接入。本期不会创建付费商品或提供收费按钮。玩家房主结算只用于房间排名，不提交官方排行榜，也不更新单人最高分或发放云端奖励。

## 实现边界

- `packages/dayun-kicker-desktop-bridge/src/multiplayer.ts`：房间容量、authority、操作和快照协议。
- `apps/dayun-kicker-desktop/src/multiplayer/race.ts`：独立的竞速、六组玩家碰撞、踢击与完赛规则；以现有 Play parallel sprint 规则为基础扩展到四人。
- `apps/dayun-kicker-desktop/src/multiplayer/steamRoom.ts`：Steam 好友大厅、邀请、准备、通信、心跳和房主生命周期。
- `apps/dayun-kicker-desktop/src/multiplayer/sockets.ts`：现代连接、握手队列、身份和可靠 / 不可靠消息适配。
- `packages/dayun-kicker-steam-sockets`：可独立构建的 Node-API 原生绑定和 C ABI 测试。
- `apps/dayun-kicker-desktop/src/multiplayer/protocol.ts`：包大小、输入、成员、快照及版本校验。
- `apps/dayun-kicker/src/game/steamOnline.ts`：将原生房间事件适配到现有游戏会话；无需网页登录。
- `SteamRacePanel` 只展示房间状态并向上发送操作；`OnlineStandings` 展示同一权威快照的四人排名。

大厅、邀请、身份、Cloud 和 Workshop 继续使用 `steamworks.js@0.4.0`。通信已经改为 **ISteamNetworkingSockets**，由新增的 `@yunlefun/dayun-kicker-steam-sockets` Node-API 原生模块绑定 Steamworks 的现代 C 接口；复用现有 Steam 运行库和初始化状态，不创建第二个 Steam 客户端。它调用 `InitRelayNetworkAccess`、`CreateListenSocketP2P` / `ConnectP2P`，使用连接句柄和 poll group 处理消息与断线。实际 SDR 路由、延迟和跨网络连接仍需正式 App ID 实测。

准备、开赛、操作、结算和结束消息使用 Reliable + NoNagle；20 Hz 的比赛快照使用 Unreliable + NoNagle，晚到的快照按 serverTick 丢弃，并保证等待、比赛、完赛阶段只能向前推进，避免两种传输模式乱序时退回上一阶段。握手期间只缓存有界的可靠消息；本场完赛快照使用可靠传输。比赛快照带最近的碰撞事件，短暂丢包后仍可恢复碰撞反馈。大厅协议升级为 `dayun-kicker:sockets-race:v2`，旧版玩家不能加入新版房间；运行时不回退到旧版 `ISteamNetworking`。

原生回调只向有界的 C++ 队列写入数据，主进程轮询后才进入 JavaScript。接收消息先复制为 Node Buffer，再调用 SDK 的 `Release()`，包括非法或超大消息；退出时释放本模块的连接、监听 socket 和 poll group。原生头文件取自固定版本的 Valve GameNetworkingSockets，仅复用 ABI 类型并保留许可证；实际通信调用 Steamworks 运行库，不链接独立的开源网络实现。

主进程只接收同源主窗口的明确 IPC；网络侧仅处理当前大厅成员。其他玩家的 authority 消息被丢弃，客户端只接受固定房主的状态；输入不允许指定其他玩家身份，重复序列、无效数值、超大包和未知协议均被拒绝。碰撞采用逐对保护期和递增事件 ID，同一 tick 的多个碰撞不会覆盖彼此。城市上车请求有独立序号，重复包不会反复上下车；座位归属与快照中的车辆／玩家引用一并校验。

竞速房暂停只停止本人的操作，对局继续运行。短时无输入会刹车；成员离开或心跳失联后暂停其参与，未完赛按 DNF 结算。房主离开、连接超时或 Steam 自动改换大厅所有者会结束房间，不执行主机迁移。结束后返回菜单创建新房间。竞速房目前只覆盖经典冲线竞速；统一僵尸突围同步步行、射击、僵尸、救援、车辆和上下车座位。旧固定路线技术房仅保留兼容；普通街区配送、NPC、车流、地铁、塔内游览和道具赛仍未联机。

## 验证

以下已有记录不代替本次 v3 新增骑行与上下车的验收；真实 Steam 连接仍需正式 App ID、多个账号与设备。本轮没有外部部署。

自动测试以连接句柄、原生连接事件和序列化数据包模拟多个 Steam 客户端，覆盖四人流程、超员、房主权限、碰撞、座位复用、断线、超时和输入校验；另验证原生身份适配、插值和三个对手资源释放。模拟测试不等于真实 Steam NAT / 中继测试。

验证包含 TypeScript 检查、联机相关单元测试、独立原生 C ABI 测试，以及真实 Electron 上的离线界面测试（Steam 不可用提示、单人启动、窗口操作、存档重载和街区入口）。Electron 会实际装载 Node-API 模块并核对随包 Steam 运行库的现代接口导出。模拟网络与 C ABI 测试均不等于真实 Steam 连接。

构建桌面版会先编译原生模块，需要 Python 和 C++17 工具链；Windows / macOS / Linux CI 分别生成对应架构的二进制。electron-builder 将模块解包到 `app.asar.unpacked`，包校验与 SteamPipe 准备均要求新版 `.node` 文件存在。原生测试命令：`pnpm --filter @yunlefun/dayun-kicker-steam-sockets test:native`。

本次本地验证（2026-10-08）：类型检查、Web / 桌面构建、568 项单元测试和原生 ABI 测试通过；macOS ARM64 打包版通过三个 Electron 测试。Windows / Linux 已配置 CI 构建与原生测试，尚未取得本次 CI 执行结果。真实 Steam 测试仍待正式 App ID 和多个账号 / 设备。

上述 2026-10-08 验证曾记录 Web 产物总量 12,080.6 KiB，超过当时 11,520 KiB 的门槛。2026-10-09 合作模式构建已通过仓库现有 Web / 桌面预算；最新数据与验证范围见[僵尸突围](zombie-coop.md)，预算定义以 `scripts/performance-budgets.mjs` 为准。

正式 App ID 取得后需完成：

- [ ] 两台设备 / 两个账号验证创建、邀请、冷启动邀请和手动加入。
- [ ] 四台设备 / 四个账号验证准备、开赛、四人可见、碰撞和同一排名。
- [ ] 不同网络验证直连 / 中继、延迟、带宽和持续帧率。
- [ ] 房主切后台、关闭窗口、退出 Steam、网络中断；客端显示明确结束原因。
- [ ] 成员退出 / 重入、第五人加入、对局开始后加入、下一场重新创建。
- [ ] Windows / macOS / Linux 原生绑定与 Overlay 邀请实测。

参考：[NetworkingSockets](https://partner.steamgames.com/doc/api/ISteamNetworkingSockets)、[steamworks.js](https://github.com/ceifa/steamworks.js)、[Steam 大厅](https://partner.steamgames.com/doc/features/multiplayer/matchmaking)、[Steam Networking](https://partner.steamgames.com/doc/features/multiplayer/networking)、[Steam Datagram Relay](https://partner.steamgames.com/doc/features/multiplayer/steamdatagramrelay)。
