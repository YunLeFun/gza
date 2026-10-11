# 广州地图后台发布客户端

`scripts/publish-map-assets.mjs` 是管理员后台短期授权的专用上传入口；继续使用现有 `assets/media-manifest.json` 格式与 `assets:map-select` / `assets:pull` / `assets:check`，不会改变原有媒体资源发布命令。此实现不包含生产凭证配置、服务器部署或权限开通；只有管理员后台和 COS 权限边界部署完成后才能真实发布。

## 检查本地文件（默认，无网络）

```sh
node scripts/publish-map-assets.mjs --version 2026-10-10-ground-v2
```

默认读取仓库的 `apps/dayun-kicker/public/maps/canton-5km`。可用 `--root /absolute/path` 指定同名文件所在目录。只处理 `ground-0.json` 至 `ground-4.json` 和 `region.json` 六件；其他说明文件不上传。版本必须匹配 `[a-z0-9][a-z0-9-]{0,63}`，不允许点号、斜杠；内容更新使用新版本。检查 UTF-8 JSON、每件至多 32 MiB、合计至多 128 MiB、非符号链接及 SHA-256。

## 明确执行上传

先通过组织批准的方式取得短期后台访问 token。不要把 token 写入命令参数、Git、聊天或日志。脚本从 `YLF_ACCESS_TOKEN` 读取；也可指定已有的安全 token 文件，脚本只读取，不创建或保存凭证。文件权限和使用后的清理由操作者负责。

```sh
# 前提：YLF_ACCESS_TOKEN 已由安全的本地凭证流程注入。
node scripts/publish-map-assets.mjs --version 2026-10-10-ground-v2 --apply
# 或使用已有文件；不会同时使用环境中的 token。
node scripts/publish-map-assets.mjs --version 2026-10-10-ground-v2 --apply --token-file /secure/session-token
```

默认认证标记为 `device`。CI 使用已批准的短期 GitHub OIDC token 时传 `--auth-method github-oidc`。脚本不会自动申请或持久化权限。生产 CLI 没有 API/COS 地址覆盖开关。

发布顺序：

1. 内存中读取、校验、计算六件文件的哈希，上传始终使用同一份字节快照
2. 带 bearer token POST `https://admin.yunle.fun/api/dayun-assets/releases/plan`
3. 校验返回版本、releaseId、文件子集和全部签名 URL；只接受固定生产 COS origin 与该版本、releaseId、哈希组成的 staging key
4. 将文件 PUT 到私有 staging，使用 `content-type`、`content-length`、`x-cos-acl: private`、`x-cos-forbid-overwrite: true`，不把后台 token 发送给 COS
5. POST finalize，服务器独立核对六件完整数据，再复制到公开、不可变的 runtime 对象
6. 只在返回 `published`、相同版本、六件完整哈希/长度/永久 URL 全部通过后，原子创建 `assets/maps/guangzhou/<version>.json`；已有相同内容可复用，不覆盖不同版本内容

所有 HTTP 请求拒绝重定向并有 60 秒超时。过期计划或签名不会继续上传。不打印 token、签名 URL、HTTP 原始错误体。失败命令只输出固定、安全的提示。上传或 finalize 失败不会写本地发布清单。需要恢复时重新执行相同版本和相同内容：后台可返回尚未上传的子集，已发布版本可返回空上传列表，再通过 finalize 读取核验结果。不要在失败后修改同一版本内容；改内容需要新版本。最终本地写入失败时后台可能已发布，再执行同一版本可重建本地清单。

当前构建清单不会自动改变。发布清单生成后按现有流程显式选择并校验：

```sh
pnpm assets:map-select guangzhou 2026-10-10-ground-v2
pnpm assets:check
pnpm assets:git-check
```

选择地图版本会更改当前地图文件和 `assets/media-manifest.json`，应先审查和保存本地改动。此版本只包含六件广州运行 JSON；如果当前城市另外包含外部模型/原稿，应先确认完整城市清单要求，不能把只含六件文件的版本当成整套外部建模资源版本。

## 离线测试

```sh
node --test test/publish-map-assets.test.mjs
```

测试通过注入内存 fetcher 模拟 plan → 私有 PUT → finalize，不连接真实服务。覆盖默认 dry-run、完整发布、幂等重试、部分恢复、不可信 URL/header、过期签名、路径/符号链接、无效 JSON/超大文件、finalize 不完整或哈希不符、错误日志脱敏、token 文件和不提前写清单。测试成功不代表生产 IAM、私有 staging 桶策略、后台部署或网络访问已通过验证。
