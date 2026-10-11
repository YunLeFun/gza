# 发布验收清单

## 自动门禁

首次运行浏览器测试前安装 Chromium：

```bash
pnpm exec playwright install chromium
```

完整门禁：

```bash
VITE_YLF_CLOUDBASE_ACCESS_KEY=<CloudBase Web publishable key> pnpm release:check
```

门禁包含 TypeScript、单元测试、生产构建、产物完整性、性能预算和 Chromium 关键路径 E2E。性能预算会限制首屏 JS/CSS、CloudBase/Rapier 延迟分包、音频与总产物体积。在 Pixel 5 视口、4 倍 CPU 降速、Fast 3G（1.6 Mbps 下行、750 Kbps 上行、150 ms RTT）与默认 headless Chromium 软件渲染下，从导航开始分别要求：首页按钮可操作不超过 **15 秒**，比赛真实首帧不超过 **35 秒**，完整街区真实首帧不超过 **60 秒**。场景预算包括真实点击开始和两次 RAF，不用加载 mark 代替；浏览器版本及实际渲染器随计时附件记录。这些是依据冷启动实测制定的项目回归上限，不是行业标准或实体手机体验目标；依据见[渲染性能记录](rendering-performance.md#启动门禁按场景区分)。性能预览服务会按 EdgeOne 默认智能压缩策略为 `application/wasm` 等资源返回 Brotli，避免用未压缩的 Vite preview 代替生产 CDN。

网页默认入口 JS gzip 上限为 350 KiB，完整资源 raw 上限为 20 MiB。桌面构建运行 `pnpm verify:performance:desktop`，使用 512 KiB 入口、128 MiB 游戏资源及 64 MiB 音频预算；打包后运行 `pnpm verify:desktop`，校验完整离线资源与每架构 768 MiB 的解包应用预算。桌面 CI 使用客户端规则，网页 CI 与 `release:check` 使用网页规则；完整配置见[按需加载](lazy-loading.md)。体积预算通过与限速首次可玩验收分别记录。

## CloudBase 发布候选 smoke

优先使用独立预发环境，并显式设置 `VITE_YLF_CLOUDBASE_ENV_ID`、对应环境的 `VITE_YLF_CLOUDBASE_ACCESS_KEY` 和 `VITE_YLF_GAME_FUNCTION_NAME`；如果 SSO 有独立入口，同时设置 `VITE_YLF_SSO_ORIGIN` 与 `VITE_YLF_SSO_EXCHANGE_URL`。EdgeOne BFF 还必须配置预发 `APP_ORIGIN`、CloudBase 服务端 key 与三个独立 secret。若当前账号只有生产环境，发布负责人明确批准直接发布后，只能先在生产执行只读 smoke；任何扣币写入仍须使用专用发布测试账号与一次性 SKU。

游客态自动 smoke 只执行读取操作：排行榜、商品目录，以及排行榜存在可用轨迹时的幽灵读取。

```bash
CLOUDBASE_SMOKE=1 \
PLAYWRIGHT_BASE_URL=https://<staging-domain> \
pnpm test:e2e:cloudbase
```

登录态测试需要先用专用预发账号生成 Playwright storage state。命令会打开可见浏览器；完成 SSO、回到游戏并确认账号信息后，在终端按回车保存。`.auth/` 已被 Git 忽略：

```bash
PLAYWRIGHT_BASE_URL=https://<staging-domain> \
pnpm capture:cloudbase-auth
```

登录态只读 smoke 会校验账号与云币余额恢复、钱包参数和购买确认弹窗，但不会确认支付：

```bash
CLOUDBASE_SMOKE=1 \
CLOUDBASE_AUTH_STORAGE_STATE=/absolute/path/to/staging-auth.json \
PLAYWRIGHT_BASE_URL=https://<staging-domain> \
pnpm test:e2e:cloudbase
```

购买会写入云端，只能用专用预发账号。只有同时设置 `CLOUDBASE_MUTATION_SMOKE=1` 和一个未购买且余额足够的测试 SKU，测试才会点击最终购买确认：

```bash
CLOUDBASE_SMOKE=1 \
CLOUDBASE_MUTATION_SMOKE=1 \
CLOUDBASE_PURCHASE_SKU=<disposable-staging-sku> \
CLOUDBASE_AUTH_STORAGE_STATE="$PWD/.auth/cloudbase-staging.json" \
PLAYWRIGHT_BASE_URL=https://<staging-domain> \
pnpm test:e2e:cloudbase
```

## 需要人工签字的预发项目

以下操作涉及真实账号状态、云币或部署平台，不能放进普通 CI。发布负责人需在同一预发版本完成并记录时间、前端 commit、CloudBase 函数版本和测试账号：

- SSO 登录使用顶层 Redirect + PKCE，回跳 URL 不残留授权码；登录后昵称、会员、余额正确，刷新页面仍由 BFF Cookie 恢复会话。
- 浏览器中不存在长期 CloudBase session；BFF Cookie 名为 `__Host-dayun-kicker-session`，具有 `Secure`、`HttpOnly`、`SameSite=Lax`、`Path=/` 且没有 `Domain`。
- 缺少/错误 CSRF 的购买、钱包和成绩请求被拒绝；会话轮换后旧 Cookie 和旧 CSRF 均失效；退出后旧 Cookie 无法访问账号接口。
- 完成一次双人 `kicker_room` 比赛，确认 Play 服务端先把权威结果持久化到 `play_competition_outbox`，临时投影失败后以同一 `kicker:<matchId>` 重试，排行榜最终只产生一份结果。该路径由 Play 游戏服的 `colyseus-play-room.test.ts` 与 `competition-outbox.test.ts` 自动覆盖。
- 排行榜选中有轨迹的玩家后，下一局出现异步幽灵和米差；取消后恢复个人最佳幽灵。
- 钱包跳转包含 `appId=dayun-kicker`、`source`、`intent`、`sku`、`coin`、`shortfall` 和同源 `returnUrl`。
- 使用专用测试 SKU 或已约定可退款账号完成一次 `coinUnlock`，确认扣币、发放权益和重复请求幂等；禁止用普通玩家账号做发布验收。
- CloudBase `dayun-kicker-api` 当前部署版本与本次前端 commit 对应，`ylf_app_sessions` 为 server-only 且索引齐全，函数 secret、集合权限和 SSO 精确域名白名单无漂移。
- EdgeOne 预发响应头、PWA 清单、分享卡片和自定义域名证书正常。

未完成以上签字时，可以发布内部测试版，但不能标记为正式公开版。
