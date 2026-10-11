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

## 触发构建

先在旧仓库提交并推送需要构建的改动，再取得远程 `main` 的完整 SHA：

```sh
git -C /path/to/dayun-kicker fetch origin
git -C /path/to/dayun-kicker rev-parse origin/main
```

在 `gza` 的 Actions 中选择 **Build private GZA source**，从 `main` 手动运行并填入这个 SHA。也可以将下面占位符替换后使用 CLI：

```sh
gh workflow run build-private-source.yml \
  --repo YunLeFun/gza --ref main \
  -f source_sha=FULL_40_CHARACTER_COMMIT_SHA \
  -F build_docs=false
```

只使用已经审核的可信提交。完整 SHA 固定构建输入，但不证明代码可信；安装依赖和构建脚本会执行源仓库代码。不要用此流程执行未审核的 PR 提交。

流水线按源仓库 `package.json` 的 `packageManager` 安装 pnpm，并使用 frozen lockfile。COS 运行素材由旧仓库既有 `assets:pull --runtime-only` 按 SHA-256 恢复，不需要提供 COS 写入凭证。初版执行类型检查、单元测试、Web 构建、发布检查与性能预算；文档检查可选，浏览器 E2E 和桌面发行另行准备。

初版没有 artifact 或 cache 上传，构建文件在一次性的 GitHub-hosted runner 中使用，任务结束后不提供下载。需要下载、部署或发布时，先确定私有存储目标及素材许可，再增加相应步骤。

## 额度和公开前处理

私有 `gza` 与旧仓库共享 `YunLeFun` 的 hosted runner 额度。公开仓库的标准 runner 和 self-hosted runner 按当前计费文档免 GitHub Actions 使用费用；自托管机器仍有自身资源与维护成本。[GitHub Actions 计费](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

公开仓库可以在技术上凭 token 克隆私有源码，但公开工作流日志可能暴露文件名、源码片段、配置和错误内容；产物、source map、测试报告和缓存也可能包含私有内容。Secret 掩码不会自动隐藏所有这些信息。[GitHub Actions 安全指南](https://docs.github.com/en/actions/reference/security/secure-use)

GitHub 条款要求 hosted runner 的任务关联执行仓库的软件项目，并未直接禁止跨仓库 checkout。这里不能据此保证“只放 CI 的公开仓库构建私有游戏”一定属于可持续的免费使用；若拟采用该模式，应向 GitHub 确认适用范围。[Actions 使用条款](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#actions)

当前 job 同时要求仓库私有且工作流来自 `main`；仅有 `workflow_dispatch`，没有 push、PR、定时或外部派发触发。token 不持久写入 Git 配置；官方 action 固定到完整 SHA；不配置私有源码缓存和产物上传。这些措施不替代对可信构建脚本的审查。

当前不公开 `gza`。未来若改变可见性，需要先审查并处理此前的运行日志、artifact、cache、分支与标签，以及旧 token 的范围和有效期，不能只检查工作树。初版的私有检查需在新评审后才调整。暂时解决额度问题可以在旧私有仓库或 `gza` 使用独立的 self-hosted runner，无需先迁移源码；本次没有安装、注册或启动自托管 runner。
