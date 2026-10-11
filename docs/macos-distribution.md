# macOS 直装公证与 Mac App Store

「未公证预览包」指当前 COS 包使用 ad-hoc 临时签名，尚未由 Developer ID 证书签名并经过 Apple 自动安全检查。它适合本地测试；互联网下载带有 quarantine 属性时，Gatekeeper 可能拦截首次运行。公证检查恶意代码和签名问题，成功后生成票据；它不代替商店的功能、内容和商业模式审核。[Apple 公证说明](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)

| 发行渠道 | 签名与检查 | 项目构建要求 |
| --- | --- | --- |
| 官网 / COS / Steam 的 macOS 直装版 | Developer ID Application、Hardened Runtime、Apple notarization、stapled ticket | 普通 Electron desktop 构建；保持离线资源和本地存档 |
| Mac App Store | Apple Distribution、商店 provisioning profile、App Sandbox、App Review | Electron MAS 构建、沙盒权限与商店支付 / 功能适配 |

Mac App Store 提交流程已包含同类安全检查，无需先把 COS ZIP 公证再申请商店上架。[Apple 公证说明](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)、[Electron MAS 指南](https://www.electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide)

## 直装版签名与公证

操作者需准备有效 Developer ID Application 证书和项目专用的 notarytool 认证。证书私钥、密码、钥匙串配置及账户办理记录在仓库外保管；项目通过环境变量显式选择签名身份和公证配置。发布前执行只读认证检查，以实际结果为准。

```sh
export DAYUN_MAC_SIGNING_IDENTITY='Developer ID Application: <证书姓名> (<TEAM_ID>)'
export DAYUN_MAC_NOTARY_PROFILE='<既有 notarytool keychain profile 名称>'
export TENCENT_COS_BUCKET=yunlefun-assets-prod-1325586649
export TENCENT_COS_REGION=ap-shanghai

# 构建、Developer ID 签名、向 Apple 提交、等待通过、附票据并验证。
# 尚不写 COS；--notarize 本身会上传待查安装包到 Apple 公证服务。
pnpm desktop:release 0.1.0-preview.20261009.3 --platform mac --notarize

# 同一流程验证成功后公开到 COS，更新频道清单。
pnpm desktop:release 0.1.0-preview.20261009.4 --platform mac --notarize --publish
```

版本号为示例，已有版本不覆盖；包或签名变化使用新版本。只设置其中一个签名变量会报错；本机一键发布配置正式认证后必须显式传 `--notarize`。两者均未配置时继续原有 ad-hoc 预览流程，不要求 Apple 认证。Windows / Linux 构建保持现有流程。

脚本先确认本机证书和 Apple 认证，再构建与打包；正式模式强制签名与 Hardened Runtime，复用 Electron 的签名工具与默认运行权限。`afterSign` 在 ZIP 生成前公证并附票据，再检查 `codesign --verify --deep --strict`、`stapler validate`、`spctl --assess`。提交不通过或任何验证失败都会阻断打包 / COS 发布。旧公开包不原地修改。最终 ZIP 必须包含已附票据的 `.app`，再由既有发布器检查完整归档、体积与匿名下载 SHA-256。[Apple 命令行公证与附票据](https://developer.apple.com/documentation/security/customizing-the-notarization-workflow)

证书可用不代表公证成功；以 Apple 的 Accepted、有效票据和 Gatekeeper 接受为准。新建认证时建议在本机交互执行 `xcrun notarytool store-credentials`，或使用专门的 CI 钥匙串；不要把密码放入聊天或命令日志。当前 GitHub Actions 尚未接入 macOS 签名私钥与公证配置，本轮本机流程不复制私钥到远端。

## Mac App Store 的最小上线方案

现有 Vue / Three 游戏、地图和大部分 UI 可以复用。增加 `mas` 发行能力配置，首版建议只保留完整单机游戏、本地存档及可工作的游戏内积分装备功能，采用免费或一次性付费下载。商店正式提交应是完整产品，测试版先走 TestFlight。[Apple 审核指南 2.2](https://developer.apple.com/app-store/review/guidelines/)

1. **建立 Apple 记录。** 在正确开发者 Team 注册稳定 Bundle ID `fun.yunle.dayun-kicker`，确认可用后创建 App Store Connect macOS 应用，显示名使用「GZA：暴力电驴」。生成对应 MAS 开发 / 分发 profile 和所需 application / installer 签名材料；已有 Apple Distribution 证书仍需匹配 Team、App ID 和 profile。若选择收费下载或 IAP，账户持有人需签署付费协议并完成税务 / 收款资料。[Apple 付费协议与资料](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/)
2. **增加 MAS 构建。** 当前 builder 仅支持普通 ZIP，需增加 `mas-dev` / `mas` 目标和 MAS 版 Electron。设置 App Sandbox 与 helper 继承权限，按真实网络、用户选中文件访问需求增加最少权限。Chromium 的 `sandbox: true` 不等于 Apple App Sandbox；普通 Electron darwin 包不能直接当 MAS 包。[Electron MAS 指南](https://www.electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide)
3. **裁掉不适用的平台模块。** 当前主进程与打包无条件包含 Steamworks、NetworkingSockets 和 Valve 动态库，App ID 0 不会从包中删掉这些依赖。MAS 首版建议移除 Steam 入口、overlay、workshop 和专有联机模块，隐藏未实现的账号、钱包与排行榜。此建议用于降低首版适配成本，不表示 Apple 一概禁止这些库。未来恢复付费皮肤 / 云币应对接 Apple IAP 与恢复购买；外部付费链接的允许范围随商店地区与授权变化，不能直接复用 Web 充值。[Apple 审核指南 3.1](https://developer.apple.com/app-store/review/guidelines/)
4. **验收存档与沙盒。** 当前使用 `appData/Dayun Kicker`，需在真实 `mas-dev` 下确认最终路径位于系统容器，发行包不能受测试 ENV 改写。保留 v1 存档格式、备份恢复和磁盘确认。旧直装版迁移应让用户选择导入文件，不直接读取容器外任意路径。测试首次启动、保存、重启、坏档恢复、用户选择导入 / 导出及离线运行。[Apple 沙盒文件访问](https://developer.apple.com/documentation/security/accessing-files-from-the-macos-app-sandbox)
5. **补齐商店资料。** 发布支持页面与隐私政策并提供应用内入口；填写实际数据收集、年龄分级、版权与媒体授权、加密申报、截图和审核说明。审核账号或完整离线模式应能覆盖所有提交功能。检查所打包 Electron / SDK 的隐私清单及适用 required-reason APIs，不能只按 SDK 名称猜测要求。[App Store 应用资料](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/)、[Apple SDK 要求](https://developer.apple.com/support/third-party-SDK-requirements/)
6. **上传、测试与提交。** 用 Apple Distribution / installer 证书和对应 profile 生成 MAS 安装包，经 Transporter 上传 App Store Connect；处理后进行 TestFlight 测试，再选择构建提交 App Review，并选择手动发布或其他发布方式。正式商店更新通过 Mac App Store。[Apple 上传流程](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)

如果选择中国大陆商店，Apple 当前要求游戏审批号和支持文件，需确认发行主体与资料；选择发行地区时应将此项单独处理。[Apple 中国大陆资质要求](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/)

## 当前验收边界

MAS 目标、profile、App Sandbox、StoreKit、TestFlight 和商店提交尚未实现或执行。本轮只读审计没有创建 Bundle ID / 商店记录或提交审核。直装版公证结果与新公开包记录在对应发布验收文档中；认证验证或有证书不能写成已公证。
