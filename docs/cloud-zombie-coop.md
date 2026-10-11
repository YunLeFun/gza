# 旧双座路线的云端兼容

本文保留旧两人固定路线房的云端契约与历史验证，通过 `/coop-legacy.html` 兼容旧邀请和已有房间。当前主玩法已统一为城市中的 1–4 人「僵尸突围」，同局寻找电动车、骑行、共乘及停车下车；其 v3 云端适配见[Play 云端适配](cloud-city-coop.md)。旧云端房不自动迁移，本次没有外部部署。

网页版合作通过现有 `api.play.yunle.fun` 的 Colyseus 服务运行，复用云乐坊 SSO、
同源 BFF 会话和 Play 一次性联机票据。浏览器创建或加入房间，广州路线、僵尸、
伤害、弹药和胜负由 Play 权威端计算。Steam 和开发 WebSocket 使用同一个纯规则包。

## 接入契约

1. 网页显式登录云乐坊；`/api/session` 返回当前会话与 CSRF。
2. 创建生成唯一房间 ID；加入使用好友分享的同一 ID。
3. `POST /api/realtime-ticket` 的合作请求为 `{ "mode": "coop", "roomId": "..." }`。
   BFF 只接受 8–64 位字母、数字、下划线和横线，用户身份取自当前会话。
4. 现有 `dayun-kicker-api` 使用服务间鉴权请求 Play `/v1/realtime/coop-tickets`，
   签发 `audience=kicker_coop_room`、`scope.resourceId=roomId` 的 60 秒一次性票据。
5. 创建调用 Colyseus `create('kicker_coop_room', { matchId, ticket })`；
   加入调用 `joinById(roomId, { matchId, ticket })`。满房或不存在会报错，不另建同号房。

房间消息为 `coop.command` / `coop.ack`、`coop.input`、`coop.state`、`coop.snapshot`。
共享类型位于 `packages/dayun-kicker-coop/src/room.ts`。浏览器不接受位置、伤害或命中结果输入。
原有 `/api/realtime-ticket` 空请求继续签发竞速票据，两种 audience 不能互用。

创建和加入的 Colyseus 鉴权参数还必须携带共享包导出的
`COOP_RULES_VERSION`，当前值为 `delivery-v1`。Play 在消费票据前拒绝缺失或不一致的
版本，每次 `coop.state` 回传同一 `rulesVersion`。SDK 等待合法收件人的状态确认版本后
才返回可操作的连接、接收战斗快照；确认前只发送握手同步。旧服务端缺少版本回传、
回传不匹配，或 3 秒内未确认时，SDK 关闭连接并提示更新客户端与服务器。
这样旧撤离目标与新配送目标不会进入同一云端对局。

## 射击与同步

- 权威端 60 Hz 固定步进；快照约 20 Hz，瞄准与本地开火跟随输入当场反馈。
- 每枪携带独立 ID、武器、瞄准和观察帧。最多 16 条未确认请求重传，服务器按冷却
  逐条消费；突发到达不会由后续移动包覆盖。过期持续输入 500 ms 自动释放。
- 权威射击事件带对应 `shotId`，本地声音、枪口和投掷特效按精确 ID 对账，避免重复播放。
- 驾驶预测、远端插值、最多 250 ms 命中回溯沿用现有实现。
- 连接拥塞时合并最新移动意图，保留离散射击请求；快照跳过旧帧，控制确认和终局保留。
  严重积压结束连接，避免无限排队使后续射击越来越迟。
- 云端只发送各客户端尚未收到的历史特效；规则仍保留最多 64 条事件供同步恢复。

## 构建与发布

规则包无 Three、DOM、Steam 或 Colyseus 依赖。Play 安装本仓构建的私有 tarball，
容器构建包含 `vendor/`，无需发布 npm，也不维护另一份规则源码。

```bash
# dayun-kicker 仓库
pnpm --filter @yunlefun/dayun-kicker-coop build
pnpm --filter @yunlefun/dayun-kicker-coop pack --out /absolute/play/vendor/yunlefun-dayun-kicker-coop-0.1.0.tgz
# play 仓库：更新依赖与完整性，然后构建容器
pnpm install
pnpm --filter @yunlefun/play-game-server build
pnpm prepare:server:container
```

Play 新增配置 `KICKER_COOP_ONLINE_ENABLED=true` 和 `KICKER_COOP_ONLINE_ROOM_LIMIT`，
默认关闭、上限默认 10 个房间。沿用既有 `MULTIPLAYER_ENABLED`、
`DAYUN_KICKER_REALTIME_TOKEN` 和精确 `PLAY_CONSUMER_ORIGINS`；浏览器没有服务间密钥。

普通武器命中现在由权威规则累计水平击退，霰弹枪在全部弹丸命中后统一移动，煤气罐按爆点径向击退。
速度有上限并在最多 0.4 秒内衰减；击退期间暂停追击和攻击，位移受墙体和道路边界约束。
击退速度仅保留在宿主内存，不进入快照、回溯历史或输入协议；既有侧踢的方向和 `kickId` 不变。
更新规则后仍须按上述步骤重建 Play 的固定 tarball、刷新 lockfile 完整性并重新部署容器，
否则云端继续运行旧行为。此改动不要求协议升级，城市仍使用 `dayun-city-coop-v2`；
规则版本负载更新为 `authoritative-recoil-v1` 并包含击退参数，因此新旧城市规则的 manifest 不匹配，
Play 容器和网页必须同步更新后再验收加入房间。
双人共乘的 `COOP_RULES_VERSION` 同时更新为 `delivery-recoil-v1`；SDK 会拒绝旧 `delivery-v1`
服务器的握手，避免仅更新网页却仍使用旧的云端战斗规则。

发布顺序为 Play 容器及合作开关、`dayun-kicker-api` 云函数、EdgeOne BFF 与网页。
生产当前部署是否具备合作房间需单独验收，仓库构建不会自动发布。
当前 Play 单实例部署继续使用本地 room presence；扩为多实例前需 Redis Presence/Driver
和正确的 public-address 路由，不能只提高实例数。

本地默认 `/coop-legacy.html` 仍使用开发 WebSocket。验证云端适配器时使用
`/coop-legacy.html?transport=cloud`，并通过公开构建变量 `VITE_YLF_COMPETITION_API_ORIGIN`
指向本地 Play Colyseus 服务；身份与签票仍经过 BFF，不能以开发 query 绕过鉴权。

真实云端 RTT、带宽、负载与设备帧率需在发布后测量；模拟延迟结果不能代表生产 SLA。

## 验证

本次验证通过游戏侧 1012 项单元测试、Play 服务端 166 项测试、类型检查、构建、
发布产物和既有性能预算检查。容器构建上下文与依赖归档已校验；本机 Docker daemon
未运行，镜像构建和生产部署尚未验证。

`pnpm test:coop` 覆盖共享规则与真实输入控制器的 0 / 80 / 150 / 250 ms RTT、抖动、
丢包和 250 ms 突发积压；整匣 12 发逐 ID 到达且不突破冷却。`pnpm test:sdk` 与
`pnpm test:functions` 验证票据、CSRF、输入背压与客户端状态边界；Play 的
`kicker-coop-room.test.ts` 使用真正的 Colyseus 客户端检查身份、满房、同步和断线。

本机 10 房间、最多 32 僵尸的 30 秒合成模拟含 Colyseus 消息编码，全部房间每步
P95 约 0.46 ms；增量特效快照平均约 2.62 KB，20 Hz 时每客户端约 52 KB/s。
这是本机纯模拟与编码样本，未计真实网络、CloudBase 性能或生产机器资源。

浏览器回归包含未登录时的 1280 / 390 / 320 宽度、展开资料与返回街区；
真实双客户端云端适配器联调覆盖电脑建房、手机加入、准备、整匣连续射击、换弹和房主退出结算。
连同资料编辑、手机操作和街区往返，9 项相关 E2E 通过。
此测试仅在本地夹具签发假用户票据，生产仍走同源 BFF 身份链路。

```bash
# play 仓库：固定两个测试身份，监听 localhost；不使用真实账号或云资源
node --import ./apps/game-server/node_modules/tsx/dist/loader.mjs scripts/dev-dayun-coop-fixture.ts
# dayun-kicker 仓库：另一个终端启动网页
VITE_YLF_COMPETITION_API_ORIGIN=http://127.0.0.1:43176 pnpm dev --host 127.0.0.1 --port 43175
# 再一个终端
PLAYWRIGHT_BASE_URL=http://127.0.0.1:43175 PLAY_COOP_FIXTURE_URL=http://127.0.0.1:43176 pnpm exec playwright test e2e/cloud-coop.spec.ts
```

合作战斗构建闭包为 349.3 KiB gzip / 350 KiB，网络校验与账号 SDK 延迟分包，
个人资料表单展开时加载；原有性能预算保持不变。
