# 克隆私有源码构建

## 配置只读凭证

`gza` 自带的 `GITHUB_TOKEN` 仅属于本仓库，无法读取另一个私有仓库。GitHub 官方 checkout 支持用单独的凭证克隆私有仓库。[actions/checkout](https://github.com/actions/checkout#checkout-multiple-repos-private)

创建一枚 fine-grained personal access token：

1. Resource owner 选择 `YunLeFun`，Repository access 只选择 `dayun-kicker`。
2. Repository permissions 只授予 `Contents: Read-only`；Metadata 的只读权限由 GitHub 自动附带。设置较短有效期，按组织要求完成审批。
3. 在 `gza` 的 Settings → Secrets and variables → Actions 添加仓库 Secret `PRIVATE_SOURCE_TOKEN`。不要写入源码、README、终端命令参数或聊天。

可以在自己的终端使用交互式命令录入，命令本身不包含 token：

```sh
gh secret set PRIVATE_SOURCE_TOKEN --repo YunLeFun/gza
```

不要直接复用 `gh auth token`、classic PAT 或含组织写权限的账号凭证。若组织不允许 fine-grained PAT，改用仅安装到源仓库、只有 Contents 读取权限的 GitHub App 短期 token；当前工作流未配置该方式。[GitHub token 文档](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

## 推送后自动构建

`dayun-kicker/main` 的推送通过 GitHub Webhook 发送到独立转发函数 `gza-ci-webhook`，访问地址为 `https://api.yunle.fun/gza-ci-webhook`。它运行于现有 CloudBase 环境 `yunlefun-8g7ybcxc7345c490`，实现和部署配置位于 `ci/`。此路径不运行私有仓库的 Actions job，因此不依赖私有仓库的构建预算。

转发函数校验原始请求字节的 HMAC-SHA256 签名，只接受 `YunLeFun/dayun-kicker` 的 `refs/heads/main` 推送，忽略分支删除及其他事件。取推送的完整 `after` SHA，以 `main` 上的固定 `build-private-source.yml` 发起构建。最近 100 次派发中已有运行中或成功的相同 SHA 时，不重复启动；失败的投递或构建可从源仓库 Webhook 的 Recent Deliveries 手动重新投递。

凭证分开配置：

- `PRIVATE_SOURCE_TOKEN`：仍仅有源仓库 Contents 只读权限，保存在 gza Actions Secrets。
- `GZA_DISPATCH_TOKEN`：fine-grained PAT 仅选择 `YunLeFun/gza`，授予 Actions 读写和必需 Metadata 只读权限，保存在转发函数环境。不能读写私有游戏源码，也不授予 Contents、Workflows 或仓库管理权限。
- `GITHUB_WEBHOOK_SECRET`：随机密钥，仅保存在转发函数环境和源仓库 Webhook 设置。Webhook 使用 JSON、仅订阅 push、启用 SSL 校验。

派发凭证 `gza-build-dispatch` 有效期 30 天，至 2026-11-11；源码读取凭证也需按其有效期轮换。配置密钥时使用云端环境变量或本地受保护的输入通道，不将真实值写入命令参数、提交、文档、日志或聊天。转发函数健康检查只返回固定状态，不回显请求或平台凭证。

`ci/cloudbaserc.json` 中的凭证值仅是 CloudBase CLI 的环境变量引用。部署或更新配置前必须在进程环境中提供这两个变量；不要将真实值替换进配置文件。部署函数仅操作 `gza-ci-webhook`，HTTP 路径固定为 `/gza-ci-webhook`，该函数允许网关调用并由自身验证 GitHub 签名；其他函数的调用规则保持原样。

私有仓库的原 CI 保留 PR 和手动入口；主分支 push 的游戏构建由此流程接管。GitHub Webhook 派发工作流使用只读源码凭证和独立派发凭证。[GitHub workflow dispatch API](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)

## 手动触发构建

先在旧仓库提交并推送需要构建的改动，再取得远程 `main` 的完整 SHA：

```sh
git -C /path/to/dayun-kicker fetch origin
git -C /path/to/dayun-kicker rev-parse origin/main
```

在 `gza` 的 Actions 中选择 **Build GZA**，从 `main` 手动运行并填入这个 SHA。也可以将下面占位符替换后使用 CLI：

```sh
gh workflow run build-private-source.yml \
  --repo YunLeFun/gza --ref main \
  -f source_sha=FULL_40_CHARACTER_COMMIT_SHA \
  -F build_docs=false
```

只使用已经审核的可信提交。完整 SHA 固定构建输入，但不证明代码可信；安装依赖和构建脚本会执行源仓库代码。不要用此流程执行未审核的 PR 提交。

流水线按源仓库 `package.json` 的 `packageManager` 安装 pnpm，并使用 frozen lockfile。COS 运行素材由旧仓库既有 `assets:pull --runtime-only` 按 SHA-256 恢复，不需要提供 COS 写入凭证。Web job 执行类型检查、单元测试、Web 构建、发布检查与性能预算。单元测试使用一个 worker，避免完整地图和物理测试在 hosted runner 上争抢 CPU；保留全部断言和源仓库的测试时限。成功后，16 个独立 Chromium job 克隆同一个已校验 SHA，安装浏览器依赖，先用 `pnpm test:e2e --fully-parallel --shard=N/16 --list` 枚举完整测试集合，再由 `scripts/run-private-e2e.mjs` 使用 Playwright 的精确 test-list 逐项执行。每项使用新的 Chromium 进程，释放上一项的 GPU 与音频状态；同一用例内的多窗口和多人交互仍在同一浏览器完成。Vite 服务在分片内复用，避免反复冷启动。每次核对报告确实包含唯一指定用例，缺失、重复、加载错误、跳过或测试失败都会使分片失败。按独立测试分配分片，每个 runner 只用一个 worker，保留源仓库的重试、全部测试与预算断言。软件渲染环境增加功能流程的等待时间；绘制调用、三角形、资源稳定性、800 ms 性能采样窗口与帧数要求保持原值。使用 Playwright 锁定版本的完整 Chromium，在 Xvfb 虚拟显示中通过 Mesa OpenGL 显示，渲染后端专题启用独立的 Dawn Vulkan 设备以实际覆盖 WebGPU，其余功能及性能用例沿用 Mesa OpenGL；默认无头软件图形路径会拖慢真实交互，导致同一用例在 Linux runner 上超时。源仓库通过 `PLAYWRIGHT_USE_MESA=1` 与 `PLAYWRIGHT_USE_VULKAN=1` 选择这个 CI 渲染配置，本机仍使用默认浏览器配置。另一个独立 job 枚举并逐项执行原 `pnpm test:performance` 套件，使用实际生产构建和原有 Pixel 5、Fast 3G、4 倍 CPU 限速与 15/35/60 秒预算；同样拒绝跳过、遗漏或重复。全部功能分片和性能 job 通过才算整体成功；失败不被忽略，也不缩减既有测试范围。文档检查可选，桌面发行使用独立流程。

单客户端视角与输入、四客户端网络恢复、四客户端触控这三项流程使用源仓库的服务端输入训练场景：真实广州道路、出生点、武器、碰撞和 60 Hz 权威服务保持一致，只将服务端活动边界限定为 8 米区域，直径小于原有 14 米敌人出生间距。这样截图和 GPU 恢复期间不会被战斗击倒而进入结算；客户端不能选择该地图或边界。仅这三项用例使用独立训练服务，其他城市战斗与生产构建用例仍使用完整普通城市。定向诊断工作流支持 `performance` 输入，可直接复现原生产性能套件的失败；完整构建始终运行全部功能和性能用例。

完整功能分片最多运行 45 分钟，以容纳全部逐项执行与失败重试。这是任务总时限，不改变任何性能断言；移动端冷启动仍使用软件渲染、Pixel 5、Fast 3G 和 4 倍 CPU 限速，并按原来的菜单 15 秒、赛道 35 秒、街区 60 秒预算验收。

初版没有 artifact 或 cache 上传，构建文件在一次性的 GitHub-hosted runner 中使用，任务结束后不提供下载。需要下载、部署或发布时，先确定私有存储目标及素材许可，再增加相应步骤。

## 公开构建与额度

`gza` 作为同一 GZA 项目的公开构建仓库，当前使用标准 `ubuntu-latest` runner。公开仓库的标准 runner 按当前计费文档免费使用 GitHub Actions 构建分钟；larger runner 另行收费。本流程不上传 artifact 或 cache。[GitHub Actions 计费](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

执行器按枚举结果启动真实本地测试服务：短程配送使用源仓库已有的权威地图夹具；生产城市合作使用实际构建的静态预览；云端双人合作读取固定版本 `YunLeFun/play`，运行其 Colyseus 测试服务与临时测试用户。后者单独使用 `PLAY_SOURCE_TOKEN`，仅授予 `play` 的 Contents 和必需 Metadata 只读权限，保存在 Actions Secrets。测试不使用生产账号，也不上传私有源码、缓存或构建产物。

维护者已接受公开工作流日志可能包含私有源仓库的文件名、源码片段、配置或错误内容。访问 token 和其他凭证仍保密，禁止将它们输出到日志。Secret 掩码不会自动隐藏全部私有代码和诊断信息。[GitHub Actions 安全指南](https://docs.github.com/en/actions/reference/security/secure-use)

GitHub 条款要求 hosted runner 的任务关联执行仓库的软件项目，没有直接禁止跨仓库 checkout。`gza` 的工作流用于构建本仓库所代表的 GZA 项目，私有源仓库是过渡阶段的源码输入。计费与条款以后可能变化，继续按适用规则使用，不将 Actions 用于无关项目或服务。[Actions 使用条款](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#actions)

当前游戏构建要求仓库为官方 `YunLeFun/gza` 且工作流来自 `main`；入口仍为 `workflow_dispatch`，由维护者或完成签名校验的转发函数调用。公开查看者、PR 和 fork 不会因此获得运行带凭证工作流的权限。token 不持久写入 Git 配置；官方 action 固定到完整 SHA；不配置私有源码缓存和产物上传。这些措施不替代对可信构建脚本的审查。

首次公开前已检查新仓库的完整提交历史及现有 Actions 状态，未导入旧源码、旧 Git 历史或附件，也未运行过 CI 或上传产物。后续新增下载、部署、发行、PR 或自动派发流程时，再按实际授权和数据范围审查。本次不改变旧 `dayun-kicker` 的可见性，也不注册或启动自托管 runner。
