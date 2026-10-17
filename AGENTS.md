# 仓库约定

- `gza` 保存公开文档、文档必需的展示源码与数据快照、构建配置和许可证。完整游戏暂留私有仓库；不导入旧历史、私人资料、凭证、日志、附件或媒体原稿。
- `gza` 已获准公开，作为同一 GZA 项目的过渡构建仓库。旧 `dayun-kicker` 仍保持私有，迁入游戏源码需要新的明确指令。
- 维护者已接受公开工作流日志可能包含私有源仓库的文件名、诊断内容或源码片段；访问凭证仍必须保密。
- 私有源码构建固定完整可信提交 SHA，只在官方 main 运行。维护者可手动触发；dayun-kicker/main 的推送由独立 CloudBase Webhook 校验 GitHub HMAC-SHA256 签名后派发。不得接受其他仓库、分支或未审核 PR 的自动构建。文档工作流可在 PR、main 推送或手动运行时检查公开内容，不能读取跨库凭证；生产发布沿用 EdgeOne，正式域名为 gza.yunle.fun；docs.gza.yunle.fun 保留为按路径 301 跳转的旧入口。
- 跨库凭证仅使用单源仓库 Contents 只读权限，存储于 GitHub Actions Secrets。不写入文件、命令参数或日志。
- Webhook 派发凭证与源码读取凭证分开；仅授予 gza 的 Actions 读写及必需 Metadata 只读权限，存储于转发函数环境变量。Webhook 密钥同样仅存于函数环境和源仓库 Webhook 设置，禁止输出完整请求头、请求体或环境变量。
- 文档静态产物可由既有 EdgeOne Git 集成发布到官方文档域名；私有游戏构建仅允许缓存 `source/.cache/dayun-media` 中已公开发布、按 SHA-256 寻址的运行媒体，不上传私有源码、构建产物或 source map。生成站点不进入 Git。
- 公开文档只在 docs/ 维护。展示依赖按 docs/reference-sync.md 同步，保留来源与校验值。提交前运行 pnpm assets:git-check 与文档检查；推送前 fetch 并检查 --base origin/main。不得提高资源策略上限或新增例外以消除失败。
- 许可范围见 `LICENSES.md`；源码、文档、素材和品牌分别处理，保留第三方原许可。
- Git 提交使用 Conventional Commits：`<type>(<scope>): <subject>`；type 仅允许 feat、fix、docs、style、refactor、perf、test、build、ci、chore、revert。
- 工作流改动运行 actionlint；提交前检查 `git diff --check` 和敏感信息。不得禁用既有推送确认钩子。
