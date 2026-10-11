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

流水线按源仓库 `package.json` 的 `packageManager` 安装 pnpm，并使用 frozen lockfile。COS 运行素材由旧仓库既有 `assets:pull --runtime-only` 按 SHA-256 恢复，不需要提供 COS 写入凭证。Web job 执行类型检查、单元测试、Web 构建、发布检查与性能预算。单元测试使用一个 worker，避免完整地图和物理测试在 hosted runner 上争抢 CPU；保留全部断言和源仓库的测试时限。成功后，16 个独立 Chromium job 克隆同一个已校验 SHA，安装浏览器依赖，分别运行 `pnpm test:e2e --fully-parallel --shard=N/16`。按独立测试分配分片，每个 runner 仍只用一个 worker，避免长文件集中在少数任务及本机图形竞争。使用 Playwright 锁定版本的完整 Chromium 新 headless 模式。全部分片通过才算整体成功；失败不被忽略，也不缩减既有测试范围。文档检查可选，桌面发行使用独立流程。

初版没有 artifact 或 cache 上传，构建文件在一次性的 GitHub-hosted runner 中使用，任务结束后不提供下载。需要下载、部署或发布时，先确定私有存储目标及素材许可，再增加相应步骤。

## 公开构建与额度

`gza` 作为同一 GZA 项目的公开构建仓库，当前使用标准 `ubuntu-latest` runner。公开仓库的标准 runner 按当前计费文档免费使用 GitHub Actions 构建分钟；larger runner 另行收费。本流程不上传 artifact 或 cache。[GitHub Actions 计费](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

维护者已接受公开工作流日志可能包含私有源仓库的文件名、源码片段、配置或错误内容。访问 token 和其他凭证仍保密，禁止将它们输出到日志。Secret 掩码不会自动隐藏全部私有代码和诊断信息。[GitHub Actions 安全指南](https://docs.github.com/en/actions/reference/security/secure-use)

GitHub 条款要求 hosted runner 的任务关联执行仓库的软件项目，没有直接禁止跨仓库 checkout。`gza` 的工作流用于构建本仓库所代表的 GZA 项目，私有源仓库是过渡阶段的源码输入。计费与条款以后可能变化，继续按适用规则使用，不将 Actions 用于无关项目或服务。[Actions 使用条款](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#actions)

当前游戏构建要求仓库为官方 `YunLeFun/gza` 且工作流来自 `main`；入口仍为 `workflow_dispatch`，由维护者或完成签名校验的转发函数调用。公开查看者、PR 和 fork 不会因此获得运行带凭证工作流的权限。token 不持久写入 Git 配置；官方 action 固定到完整 SHA；不配置私有源码缓存和产物上传。这些措施不替代对可信构建脚本的审查。

首次公开前已检查新仓库的完整提交历史及现有 Actions 状态，未导入旧源码、旧 Git 历史或附件，也未运行过 CI 或上传产物。后续新增下载、部署、发行、PR 或自动派发流程时，再按实际授权和数据范围审查。本次不改变旧 `dayun-kicker` 的可见性，也不注册或启动自托管 runner。
