# 客户端 COS 发布

`desktop:release` 将当前源码的客户端构建、预算检查、打包、安装包校验、COS 上传与下载清单更新串成一个命令。当前仅发布 `preview`，macOS 默认使用 ad-hoc 签名；显式 `--notarize` 可使用 Developer ID 签名、Apple 公证与 Gatekeeper 验证，配置见 [macOS 发行](macos-distribution.md)。Windows / Linux 默认未签名，平台运行验收与 Steam 上架分别处理。

## 本机一键发布

凭证通过发布进程环境提供：`TENCENT_COS_SECRET_ID`、`TENCENT_COS_SECRET_KEY`，临时凭证还需 `TENCENT_COS_TOKEN`。使用限定项目发布前缀的子账号 / 临时凭证，不把密钥写进仓库、命令行参数或日志。

```sh
export TENCENT_COS_BUCKET=yunlefun-assets-prod-1325586649
export TENCENT_COS_REGION=ap-shanghai

# 默认只构建、验包并输出发布计划，不写 COS。原生平台默认 mac/arm64、win/x64 或 linux/x64。
pnpm desktop:release 0.1.0-preview.20261009.1

# 在发布环境显式上传本机平台。
pnpm desktop:release 0.1.0-preview.20261009.1 --publish
```

发布版本必须对应 `apps/dayun-kicker-desktop/package.json` 的应用版本，例如 `0.1.0-preview.20261009.1`。同一版本、平台与架构只允许同一份安装包重试；源码或包内容变化使用新的发布版本。输出位于忽略的 `apps/dayun-kicker-desktop/release/<release-version>/`。

`--platform all` 仅适用于已准备并验证各目标原生 NetworkingSockets 库的交叉打包环境；否则预检查直接停止，不生成或上传缺库包。普通本机使用原生目标，三平台发布使用下述原生 CI。本轮 macOS 交叉打包实测发现 Windows 原生库缺失，验包已阻止发布，未放宽检查。

已有**当前源码**的已验证包可以独立执行发布步骤：

```sh
pnpm desktop:publish 0.1.0-preview.20261009.1 \
  --platform mac --arch arm64 \
  --artifact apps/dayun-kicker-desktop/release/0.1.0-preview.20261009.1/GZA-0.1.0-mac-arm64.zip \
  --package-root apps/dayun-kicker-desktop/release/0.1.0-preview.20261009.1 \
  --publish
```

没有 `--publish` 时同样只输出计划。脚本拒绝旧品牌文件名、错误 profile、过期 renderer / 主进程、缺失资源、超过既有预算的包，以及归档和解包文件内容不一致的情况。ZIP / tar.gz 逐文件读取并校验，不把不可信路径解压到工作树。

## GitHub Actions

[Desktop packages](https://github.com/YunLeFun/dayun-kicker/blob/main/.github/workflows/desktop.yml) 仅在 GitHub Release 发布时触发（`release.published`，包含已发布的预发布版），PR、分支或标签 push、Release 草稿均不触发桌面打包；普通 CI 仍执行代码与网页验收。触发规则见 [GitHub 官方说明](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#release)。

工作流从该 Release 对应的源码提交构建，在 Windows x64、macOS arm64、Linux x64 原生 runner 上执行类型、单测、ABI、构建与验包；Windows / macOS 保留桌面启动、全屏与文件存档检查。三平台全部通过后，将 ZIP / tar.gz 上传到该 Release 的附件中，同时保留 Actions 构建附件。Windows ZIP 解压后运行 `GZA.exe`，无需安装器。GitHub 附件上传使用工作流自带的 `GITHUB_TOKEN`，仅该上传任务有 `contents: write`，无需配置 COS 密钥。已存在的同名 Release 附件不会自动覆盖。

可先推送包含此工作流的版本提交与标签，再在 GitHub Releases 页面选择该标签并发布。建议标签使用 `v0.1.0` 或 `v0.1.0-preview.20261009.1`，归档中的应用版本取自桌面 `package.json`。

需要同时更新官网 COS 预览版下载时，将仓库 Actions Variable `DESKTOP_RELEASE_PUBLISH_COS` 设为 `true`，并配置 Secrets：

- `TENCENT_COS_SECRET_ID`、`TENCENT_COS_SECRET_KEY`；临时凭证增加 `TENCENT_COS_TOKEN`。
- `DESKTOP_RELEASE_VERIFICATION_KEY`：至少 32 字符的独立随机密钥，用于将原生任务验过的包绑定到源码提交。准备与消费验证凭据使用同一密钥，密钥不进入附件。

COS 发布版本从 Release 标签读取，支持 `v<release-version>`、`desktop-preview-<release-version>` 或裸版本号，必须对应桌面 `package.json` 的应用版本。Bucket / Region 固定为上述项目配置。三个原生任务成功后，一个独立发布任务下载归档与小型 HMAC 验证凭据，再核对源码提交、安装包字节数和 SHA-256，按顺序发布各平台。版本构建指纹覆盖全部 renderer 文件（包括地图、音频等原路径 public 资源）与客户端主进程文件；同版本不能混合不同源码或资源。不传递整套解包目录，不在 Linux 上冒充 macOS 签名检查。工作流与 COS 私有频道锁共同防止并行覆盖清单。

2026-10-09 检查时，GitHub Actions 的账户预算曾阻止任务启动，仓库 Secrets 为空。仅打包并上传 GitHub Release 附件不需要上述 Secrets；可选 COS 自动发布需要配置。远端构建仍须有可用的 Actions 额度，未启动或未完成的流水线不能记为发布成功。

## 对象、清单与失败恢复

安装包复用 [媒体发布工具](https://github.com/YunLeFun/dayun-kicker/blob/main/scripts/publish-media-assets.mjs) 的 COS provider、MIME、匿名流式 SHA-256 校验和原子 JSON 写入：

```text
dayun-kicker/releases/artifacts/<sha256>/GZA-<app-version>-<platform>-<arch>.zip
dayun-kicker/releases/artifacts/<sha256>/GZA-<app-version>-linux-x64.tar.gz
dayun-kicker/releases/preview/versions/<release-version>/<platform>-<arch>.json
dayun-kicker/releases/preview/versions/<release-version>/<manifest-sha256>.json
dayun-kicker/releases/preview/latest.json
```

归档、平台版本记录与聚合版本清单不可覆盖，下载 URL 不含签名或有效期。匿名完整下载的字节数与 SHA-256 全部通过后才更新可变 `latest.json`；失败保留旧下载清单，已上传的内容寻址对象可安全重试。添加平台会合并既有平台，旧版本不能回退覆盖最新链接。

发布结果写入 `assets/desktop-releases/preview/` 的轻量版本清单，可纳入 Git；包、恢复缓存和构建产物继续忽略。安装包包含项目与依赖的既有许可文件，资源来源 / 许可继续由媒体清单和来源文档记录。安装后游戏使用包内资源，无需请求 COS。

频道锁需要 `GetBucketVersioning`、发布前缀下 `GetObject` / `PutObject`，以及仅锁对象的 `DeleteObject` 权限。不会修改桶 ACL、CORS、版本控制或删除安装包。既有桶 GET / HEAD CORS 已允许官网读取；未开启过版本控制的桶才能安全使用禁止覆盖锁，检测到已开启或已暂停则拒绝发布，依据 [COS 官方规则](https://intl.cloud.tencent.com/document/product/436/43256?lang=en)。异常终止留下锁时，先核实没有发布进程再清理该锁，不能删除整个发布目录。

## 切换 Steam

[clientDownloads.ts](https://github.com/YunLeFun/gza/blob/main/docs/.vitepress/game-reference/apps/dayun-kicker/src/config/clientDownloads.ts) 统一控制官网入口。当前 `provider: "cos"` 从公开 `preview/latest.json` 获取已验证链接，未发布平台显示「待发布」，网络失败提供重试。下载页只加载 Vue 和页面展示模块，不载入游戏场景或平台 SDK。

正式 Steam 商店页面公开后，将 `steamUrl` 设置为真实 `https://store.steampowered.com/app/<APP_ID>/`，再将 `provider` 改为 `"steam"` 并发布网页。页面会展示 Steam 商店按钮并停止获取 COS 清单；不需要改游戏、存档或客户端代码。当前正式 App ID 尚未分配，因此不设置占位商店链接。历史 COS 版本仍可追溯。
