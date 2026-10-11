# EdgeOne Pages 部署

本文档用于把 `YunLeFun/dayun-kicker` 作为 GitHub 仓库接入 EdgeOne Pages，并同时发布静态游戏与同源 `/api` Node Functions。

## 推荐配置

| 项目 | 配置 |
| --- | --- |
| Repository | `YunLeFun/dayun-kicker` |
| Branch | `main` |
| Framework | Vite / Static Site |
| Root Directory | `/` |
| Node.js Version | `22` |
| Package Manager | `pnpm@11.10.0` |
| Install Command | `pnpm install` |
| Build Command | `pnpm build` |
| Output Directory | `apps/dayun-kicker/dist` |
| Build Environment | `VITE_YLF_CLOUDBASE_ACCESS_KEY=<CloudBase Web publishable key>` |
| Server Environment | `CLOUDBASE_ACCESS_KEY`、`SESSION_CSRF_SECRET`、`ACCOUNT_API_INTERNAL_TOKEN`、`DAYUN_KICKER_BFF_TOKEN` |
| Staging Overrides | `APP_ORIGIN`、`CLOUDBASE_ENV_ID`、`CLOUDBASE_GAME_FUNCTION_NAME`、`WALLET_URL`、`VITE_YLF_*` |
| Project Name | `dayun-kicker` |
| Custom Domain | `dayun-kicker.yunle.fun` |

项目使用 Vite 8 和 Vitest 5，要求 Node.js `^22.12.0 || ^24.0.0 || >=26.0.0`；EdgeOne 控制台建议选择 Node.js 22，并使用 pnpm 11.10.0。根构建会依次构建 BFF 契约包、浏览器 SDK 与游戏。生产构建必须注入 CloudBase Web publishable key，否则公开排行榜和商品目录会进入不可用降级状态。

同源 BFF 位于 `cloud-functions/api/[[default]].ts`。服务端环境变量、CloudBase `ylf_app_sessions` 集合、索引与发布顺序见 [SSO + BFF 架构](auth-bff.md)。`CLOUDBASE_ACCESS_KEY` 和三个内部 secret 不得使用 `VITE_` 前缀，也不得出现在前端构建日志或浏览器资源中。

滚动轮换 `DAYUN_KICKER_BFF_TOKEN` 时，云函数可临时配置 `DAYUN_KICKER_BFF_TOKEN_PREVIOUS` 接受上一值；确认 EdgeOne 新部署已全部切换后必须删除该临时变量。

## 当前 EdgeOne 项目

| 项目 | 值 |
| --- | --- |
| EdgeOne Project Name | `dayun-kicker` |
| EdgeOne Project ID | `makers-jer1nkz5qzw4` |
| Provider | GitHub |
| Console URL | `https://console.cloud.tencent.com/edgeone/pages/project/makers-jer1nkz5qzw4` |

`.edgeone/project.json` 已记录本地项目链接信息。`.edgeone/.token` 必须只保存在本机，已经加入 `.gitignore`。

## GitHub 接入流程

1. 在 EdgeOne Makers 创建项目，选择 Import Git Repository。
2. 选择 GitHub 仓库 `YunLeFun/dayun-kicker`。
3. 选择 `main` 分支。
4. 按上面的推荐配置填写安装、构建和输出目录。
5. 配置 BFF 服务端环境变量，并确认 `APP_ORIGIN` 与预发/生产域名完全一致。
6. 首次部署成功后绑定自定义域名。

项目当前是 GitHub Provider。更新代码后推送到 `main`，由 EdgeOne 拉取仓库构建部署；不要再用 `edgeone makers deploy apps/dayun-kicker/dist -n dayun-kicker` 直传文件夹，因为 GitHub Provider 项目不支持 direct upload。

## CLI 说明

当前安装的 EdgeOne CLI `1.5.9` 仍只暴露 `edgeone pages` 子命令。本项目是 GitHub Provider 项目，正式发布以推送 `main` 触发 EdgeOne 控制台构建为准。

```bash
PAGES_SOURCE=skills edgeone pages link
PAGES_SOURCE=skills edgeone pages dev
```

`pages dev` 会按 `edgeone.json` 同时装配静态站点和 `cloud-functions/`。本项目已接入 GitHub Provider，正式发布以推送 `main` 触发 EdgeOne 控制台构建为准；不要使用 direct upload 绕过 Node Functions 与环境变量配置。

## 域名建议

游戏主域名：

```text
dayun-kicker.yunle.fun
```

理由：

- `dayun-kicker` 与英文名一致，适合作为公开 URL。
- `yunle.fun` 下的独立三级域名比再套一层 `game.yunle.fun` 更短。
- 如果后续做小游戏中心，可以把 `game.yunle.fun` 或 `games.yunle.fun` 留给中心站，再从中心站链接到 `dayun-kicker.yunle.fun`。

## DNS

Cloudflare DNS 已创建：

```text
dayun-kicker.yunle.fun CNAME dayun-kicker.yunle.fun.pages.dnsoe5.com
```

该记录当前为 DNS-only。EdgeOne 控制台还需要在 `dayun-kicker` 项目的 Domain Management 中添加 `dayun-kicker.yunle.fun` 并等待证书签发；如果控制台给出新的 CNAME 目标，以控制台为准更新 Cloudflare DNS。

## 发布前检查

```bash
pnpm install
VITE_YLF_CLOUDBASE_ACCESS_KEY=<CloudBase Web publishable key> pnpm release:check
```

确认完整发布门禁通过后再推送到 `main`，EdgeOne Makers 会按 GitHub 连接配置触发部署。
`verify:release` 会阻止开发调试页、source map 或缺失的清单资源进入发布流程，并检查
`edgeone.json` 中生产站点所需的安全响应头。
完整门禁还包含性能预算与 Chromium E2E；CloudBase 登录、钱包、购买、Play 权威成绩 outbox 重试和函数版本
需要按 [发布验收清单](release-checklist.md) 在预发环境签字。
