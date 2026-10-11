# 僵尸突围 v3 的 Play 云端适配

「僵尸突围」统一使用 1–4 人城市规则，同一局内步行、寻找电动车、骑行、双座共乘及停车下车。客户端、BFF 与 CloudBase ticket 门禁升级为 `dayun-city-coop-v3`，保留 `kicker_city_room` audience 和原有生产开关。旧两人固定路线房保留在 `/coop-legacy.html`，不会自动迁移到新规则。

原 v2 适配基于 `7d4cc665`；v3 在同一权威规则中增加上下车请求、车辆操控、座位和车辆快照，保留近战、地图组装/索引和 Steam/本地适配器。
`CityRoomState` 新增兼容 authority `cloud-server`，独立云端契约、终止 API 与 manifest payload
位于纯规则包；平台 SDK、BFF 和 Play 的房间实现负责网络。没有新后台仓库，也没有迁移权益购买。

## 接口

SDK `connectKickerCityRoom({ roomId, create, manifest, onEvent, onStatus })` 复用当前 cookie 会话和 CSRF。
manifest 由 `createCityCloudManifest(world)` 对自己的完整世界计算，包含 v3 协议、规则 hash、地图 hash 和地图 ID。
票据从同源 `/api/realtime-ticket` 的 `mode: 'city'` 分支换取，服务端使用既有信任凭证调用
Play `/v1/realtime/city-tickets`，绑定 `kicker_city_room` audience、房号和版本。
首个合法收件人的 cloud 状态必须在 3 秒内确认全部版本；确认前不接受快照或发送输入。
旧版、错地图、错身份及不支持的恢复声明都会关闭连接。

`cityCloud.ts` 的规则 hash payload 包含当前算法修订。未来修改算法时必须升级该修订，并重建
私有归档、更新 Play 的归档 integrity、部署兼容客户端；仅修改协议文本不足以证明算法兼容。车辆参数及算法修订已经进入规则 hash，不能让 v2 云端继续接受新版车辆输入。
地图 hash 使用共享排序后的纯几何 payload；不要对原始 JSON 文本摘要，也不要使用未加载的简化地图冒充完整广州。

## 可选浏览器入口

`VITE_DAYUN_CITY_CLOUD_ENABLED` 默认未设置。只有明确设为 `true` 时，网页城市入口使用
按需加载的云端 transport；Steam 优先使用既有原生房，本地/开发路径保持现状。
候场显示账号房，邀请复制/分享 `coop.html?room=<id>`；`city-coop.html` 仍可作为兼容入口。链接仅预填房号，不自动登录或加入。
未登录用户先从游戏首页登录，再显式创建/加入。没有新增地图管理界面。

云端收到断线提示时本局安全终止；房主离开也关闭房间。
SDK 禁用自动重连且不跨连接重放旧动作，状态声明 `recovery.supported=false`。
进程重启不能恢复旧房间：显式创建新房。这里没有持久化 checkpoint 或跨进程恢复实现。

本轮没有执行外部部署。发布前须让 Play 的城市房依赖使用本次 v3 权威包，重新导出完整地图 manifest，并同步私有归档 integrity、服务端版本校验和客户端。当前工作区的 Play checkout 只有旧双座房实现，不能把其已上线记录当作 v3 城市房已上线；生产开关保持关闭。真实账号、CloudBase store、镜像与容量验收仍需实际环境完成。

## 离线权威地图导出

先按现有资源流程恢复**同一版本**的完整广州 runtime 地图，再执行：

```sh
# 使用既有 Play game-server 的 tsx；三个参数都使用绝对路径。
# 在 Play 根目录执行，不需要给 Dayun 新增依赖。
pnpm --filter @yunlefun/play-game-server exec tsx \
  /absolute/dayun-kicker/scripts/export-city-authority.ts \
  /absolute/dayun-kicker/apps/dayun-kicker/public \
  /tmp/city-authority/world.json
```

输出世界文件和 `.manifest.json`；使用现有 `composeGuangzhouCityMap` 及 `createCityWorldFromMap`，
不修改地图、不联网、不上传。大文件遵循既有 COS/资源清单规则，导出物不进入源码 Git。
Play 部署时显式提供此制品及 `KICKER_CITY_WORLD_PATH`、`KICKER_CITY_WORLD_HASH`。
地图文件不是当前 Play Dockerfile 的默认内容，需先审查只读挂载/容器制品路径。

## v2 历史验证记录

以下记录对应 v2 适配，不证明本次新增上下车和共乘已经通过云端验收。

隔离克隆最初未恢复被 Git 忽略的六份 `maps/canton-5km/` runtime 数据，导出因此失败。
追加验收已使用原生 `node scripts/media-assets.mjs --runtime-only` 匿名恢复清单中的 33 个资源；
六份地图共 3,971,815 字节，SHA-256 / 大小逐一匹配。完整广州权威产物为 42,019 道路段、
8,216 建筑和 141 水域，没有用旧六份简化地图替代。资源仅在忽略目录 / 本地缓存恢复，没有更改清单或发布对象。

真实地图已运行本机双客户端战斗及四房十六客户端的 120 秒负载；账号 / BFF 会话仍是明确的本地 fixture，
不等同于真实 SSO / CloudBase 验收。候场 / 终局只在状态变化时重绘，开局后继续连续帧，
避免多个候场窗口持续争用完整地图的 GPU。生产开关继续关闭；部署前仍需真实账号与现有 CloudBase store 验收，
以及地图只读制品路径、镜像和实际部署规格的容量确认。

本次完整地图四浏览器验收覆盖邀请预填、全员准备 / 开局、共享射击 / 近战状态、客人断线结算及显式重新建房，
采用独立 Chromium / Mac Metal 图形后端，320 / 390 / 1280px。默认图形后端四画面曾 GPU 停顿触发心跳终止；
这是本机浏览器执行环境的验收限制，不放宽房间心跳。Vite 对 Vue 去重并预编译 Vue / Reka，
避免候场 / 结算懒加载期间开发优化器重载房间；生产组件仍按需加载。
可选云端 hash 契约和个人资料编辑组件单独按需分包，沿用原城市入口 350 KiB gzip 预算。
