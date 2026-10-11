# Steam App ID 与抢先体验发布

本文记录本项目的 Steam 构建、商店与发布准备。当前正式 App ID 和价格尚未确认；客户端使用 `appId: 0`。发行主体登记、付款回执、身份、银行和税务办理记录由发行者在仓库外保管。官方流程资料核对日期：2026-10-07；平台要求以实际后台为准。

## 申请 App ID

个人 / 公司主体选择、登记字段对照和中国大陆发行的独立准备见 [登记草稿](https://github.com/YunLeFun/dayun-kicker/blob/main/steam/onboarding-draft.md)。

1. 从 [Steam Direct 官方入口](https://partner.steamgames.com/steamdirect) 登录用于发行的 Steam 账号，加入 Steamworks。
2. 根据实际发行权、签约和收款主体选择个人或公司登记。工作室展示名不能代替法定主体名称；身份、银行与税务资料由发行者在官方页面填写，核对和办理记录保存在仓库外。
3. 按注册页面顺序支付每个产品 US$100 的 Steam Direct 费用，地区税费以付款页为准。费用不可退款；产品达到 US$1,000 调整后总收入后可在后续结算中收回。已有合作伙伴由具有 Admin 权限的账号支付并激活 App Credit。[费用说明](https://partner.steamgames.com/doc/gettingstarted/appfee)
4. 完成账户审核，激活用于本游戏的 App Credit / 创建应用，从应用后台记录 Valve 分配的 App ID 和各 Depot ID。Depot ID 单独核对，不能假设为 App ID + 1。[入驻资料](https://partner.steamgames.com/doc/gettingstarted/onboarding)


Steam Direct 页面目前写首批产品付款后等待 30 天，但英文 Onboarding 文档写 21 天；以实际应用后台允许发布日期及 Valve 答复为准，排期先预留 30 天。两份页面都要求 Coming Soon 商店页公开至少两周。付款等待与 Coming Soon 时长可重叠，不直接相加。[Direct](https://partner.steamgames.com/steamdirect?l=english)、[Onboarding](https://partner.steamgames.com/doc/gettingstarted/onboarding)

## 本项目发布路线

先申请应用、准备商店页并进入 Coming Soon，修复发布候选缺口，再发抢先体验；是否先做免费测试由发行者选择。Early Access 与正式 1.0 使用同一个主游戏 App ID；版本完善后在原应用的发布选项中转为正式发行。Early Access 是向玩家提供可玩的开发中版本，仍需商店页和构建审核。[官方说明](https://partner.steamgames.com/doc/store/earlyaccess)

| 阶段 | 交付与验收 |
| --- | --- |
| 应用创建 | 正式 App ID、发行主体、至少一个 Depot、开发者测试包关联 |
| 商店页 | 已实现内容的说明、真实截图、胶囊图、语言与系统需求、价格、内容问卷、六项 EA 问答 |
| Coming Soon | 商店页送审通过后公开，累计至少两周；允许先收集愿望单 |
| 内部构建 | 平台解包目录上传，安装启动项正确，在自建测试分支验证；正式 ID 验证 Overlay / Cloud |
| EA 审核 | 构建与商店内容一致，所有声明的操作系统启动成功，提交当前可玩构建 |
| EA 发售 | 通过审核、等待期满足、候选版本验收后，在后台完成 Release App 流程 |
| 1.0 | 上传已完成的版本，更新文案与价格，在同一个应用转为正式发行 |

商店页和构建通常各需 3–5 个工作日审核，至少预留 7 个工作日及返工时间，先提交商店页再提交构建。通过审核不会自动发售；发售日期由发行者在后台控制。[审核](https://partner.steamgames.com/doc/store/review_process)、[发布](https://partner.steamgames.com/doc/store/releasing)

## 发布候选的范围

第一版使用《GZA：暴力电驴》，与当前客户端名称一致。GZA 是广州行动（GuangZhou Action）的缩写；品牌与内容范围见[项目方向](gza-direction.md)。

首个候选建议 Windows x64；实际 Windows 启动验收通过后再勾选支持。现有 macOS 本机测试、跨平台打包与 CI 配置是基础，不等于 Windows / Linux / Intel Mac 已完成实机验收。其他平台通过同等测试再加入商店支持列表。

2026-10-11 已选定首发重点：Steam 离线单人第一章「粥还热」。先完成客村配送、阿婆救援、密送解药、陈家祠恢复和独立收尾。实现范围见 [章节设计](story-chapter-one.md)，本地包与验证进度见 [首章候选记录](https://github.com/YunLeFun/dayun-kicker/blob/main/steam/chapter-one-candidate.md)。这次范围选择不代表已确定售价、发售日期或完成 Valve 审核。

| 可写入当前内容草稿 | 尚不能勾选为 Steam 已支持功能 |
| --- | --- |
| 经典街机骑行 / 竞速、广州部分街区探索、配送、塔内观光、车辆交互、离线进度、昼夜天气设置 | Workshop 城市导入 / 任意城市切换、Steam 多人、Steam 成就 |
| 键鼠与标准映射手柄输入；完整手柄支持级别待实体设备全流程验收 | Steam Deck Verified、未经 Steam 实测的 Cloud / Overlay 特性、已覆盖广州 10 km 圆内全部街区 |

Steam 内购尚未接入：候选版不宣传云币商店或网页付费解锁为 Steam 购买能力，收费功能需要 Steam Wallet 路径和独立验收。[构建审核要求](https://partner.steamgames.com/doc/store/review_process)

## 当前剩余项

- [ ] 完成 Steamworks 注册审核并取得 App ID / Depot IDs。
- [ ] 由发行者在仓库外核对发行权与登记资料；确认可公开的发行名、售价、EA 范围与支持渠道。
- [ ] 完成第一次玩家流程的实际游玩，确认接单、结算、奖励、车库及重启恢复足够完整。
- [ ] 修复已有发布预算超限。上次测量：城市弱网首次可操作约 20.1 秒 / 15 秒，Web 总资源约 11.76 MiB / 11.25 MiB；打包候选前按当前版本重测，预算不等同 Valve 审核规则。
- [ ] Windows 干净安装、更新 / 回滚、存档兼容、键鼠与实体手柄全程测试；选定其他系统后分别验收。
- [ ] 在正式 ID 上从 Steam 启动验证 API、Overlay 和 Cloud；不把原生库装载成功当作 Steam 连接成功。
- [ ] 准备正版授权与署名记录（开放地图、音乐、字体、图标等），确认玩家实际看到的预生成 AI 内容及内容问卷答案。[内容问卷](https://partner.steamgames.com/doc/gettingstarted/contentsurvey)
- [ ] 补齐真实截图、商店与游戏库素材、实机视频、已测最低 / 推荐系统需求。
- [ ] 在后台勾选 Early Access，填写六项问答，完成商店页和构建审核。

商店草稿和素材清单见 [steam/store-draft.md](https://github.com/YunLeFun/dayun-kicker/blob/main/steam/store-draft.md)。尚未定价或承诺更新日期；商店文案不把计划中的功能当作已交付内容。

## SteamPipe 上传准备

1. 在 Steamworks 设置 Windows Depot 和启动项 `GZA.exe`，确认开发者测试 Package 包含该 Depot；其他平台分别配置 OS 条件。macOS 使用完整名称 `GZA：暴力电驴.app` 启动项。[上传设置](https://partner.steamgames.com/doc/sdk/uploading)
2. 将正式数字 ID 写入 `apps/dayun-kicker-desktop/steam.config.json`；`DAYUN_STEAM_APP_ID` 仅覆盖本地运行，不会改变已经打包的 App ID。重新构建与打包，使用 `release/win-unpacked` 等完整目录上传，不传 ZIP。
3. 复制 `steam/release.example.json` 为 `steam/release.local.json`，填 App ID、实际 Depot ID 和本机解包目录。配置中不保存密码。
4. 运行本仓库生成器：

```sh
pnpm desktop:package:win
pnpm verify:desktop
pnpm steam:prepare
```

生成器验证程序、离线入口、地图、Steam 原生文件及 ASAR 内嵌 App ID 是否匹配，写入 `steam/generated/` 的 depot VDF、预览 VDF、上传 VDF和 `build-plan.json`。占位 ID、测试游戏 480、重复 Depot、缺包及内嵌 App ID 不一致会被拒绝。准备动作只写本地配置，不连接 Steam。

从已登录的 Steamworks 下载 SDK，在其 ContentBuilder 的 SteamCMD 中交互登录（密码和 Steam Guard 直接输入 SteamCMD），然后先执行预览脚本，检查文件清单，再执行上传脚本：

```text
login YOUR_BUILD_ACCOUNT
run_app_build /absolute/path/to/steam/generated/app_build_preview.vdf
run_app_build /absolute/path/to/steam/generated/app_build_upload.vdf
quit
```

生成器不写 `SetLive`：上传成功后记录 BuildID，在后台选择测试分支；完成测试后再指定审核用默认构建。上传、分支赋值、公开商店和发售是分开的操作。[SteamPipe 参数](https://partner.steamgames.com/doc/sdk/uploading)

在 `steam/generated/build-plan.json`、QA 记录和后台记录中对齐应用版本、源码提交、打包平台、BuildID、发布时间及上一有效构建。更新先进入测试分支，确认存档兼容后再推进；回滚同时保留迁移前存档。
