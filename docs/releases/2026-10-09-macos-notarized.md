# 2026-10-09 macOS 公证预览版

发布版本为 `0.1.0-preview.20261009.3`，应用版本 `0.1.0`，macOS Apple 芯片 arm64。

- Apple 状态：**Accepted / Ready for distribution**；日志 `issues: null`，包含 39 个代码票据。
- Developer ID 签名有效、Hardened Runtime 与安全时间戳有效，`Notarization Ticket=stapled`。
- `stapler validate` 通过；Gatekeeper：`accepted / source=Notarized Developer ID`。
- 安装包：`GZA-0.1.0-mac-arm64.zip`，140,959,398 字节（134.4 MiB）。
- SHA-256：`6c2666771aabaf7952f2979db8176ee5c75a32d8f640a7e0ace19ab37e8d111c`。
- [公开下载](https://yunlefun-assets-prod-1325586649.cos.ap-shanghai.myqcloud.com/dayun-kicker/releases/artifacts/6c2666771aabaf7952f2979db8176ee5c75a32d8f640a7e0ace19ab37e8d111c/GZA-0.1.0-mac-arm64.zip)；[最新频道清单](https://yunlefun-assets-prod-1325586649.cos.ap-shanghai.myqcloud.com/dayun-kicker/releases/preview/latest.json)。

签名 / 公证配置通过本机既有钥匙串使用，未导出私钥、密码或修改 Apple 账户记录。新增独立的公证模式保留默认 ad-hoc 本地预览，只有显式项目身份和 keychain profile 才会提交 Apple，拒绝和 MAS 混用。流程及商店差距见 [macOS 发行](../macos-distribution.md)。

本轮通过 35 项公证配置 / 发布单测，签名模式的 electron-builder schema 校验、脚本语法与 Git 资源检查。实际签名包通过现有离线资源与 768 MiB 解包预算、归档逐文件校验；上传后匿名完整下载 SHA-256 验证，再更新 latest。旧 `.2` 归档与不可变版本记录保留。

实际 `GZA.app` 使用独立临时 profile 启动，手动保存等待磁盘确认；正常关闭后将测试主档破坏，再真实启动，恢复有效备份的槽位和成绩、隔离坏原档、修复主档。页面异常和外部资源请求均为 0。测试 profile 已清理，用户原有存档未接触。签名与游戏主体构建指纹对应上一轮已通过 12 项浏览器存档回归的游戏产物；本轮没有重复整个浏览器或原生全屏回归。

下载页原先把所有预览版写成未签名，现已改成中性的系统 / 芯片选择提示；Web 类型构建、预算与发布资源校验通过。1440 × 900 与 390 × 844 生产预览直接读取实际 COS `.3` 清单，无 mock，验证真实下载 URL / SHA-256、文案、键盘焦点、触控尺寸、无溢出与轻量页面依赖；两项通过，手机截图已人工查看。该文字变更属于 Web 在线提示，已公证包仍使用原有 desktop renderer，离线分支不会显示此提示。官网页面仍需正常 Web 发布。

初次一键运行已完成 Apple 公证与验包，但因本次进程未设置 COS bucket / region，在输出干跑计划时停止；补齐环境后直接发布已验包，无需再次签名公证。脚本已增加目的地与发布凭证的前置检查，避免此类问题在构建之后才发现。

Apple 提交标识、原始诊断日志、信任检查 JSON、归档元数据与截图由发行维护者在仓库外保管；公开记录保留验证结论、版本与安装包 SHA-256。MAS 构建、沙盒 profile、TestFlight、商店支付和提交审核尚未执行；Windows / Linux 仍待各自原生验收。
