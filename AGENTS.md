# 仓库约定

- `gza` 当前只保存构建配置、标准许可证和说明文档。不要把私有 `dayun-kicker` 的源码、历史、媒体、日志或附件提交到这里。
- `gza` 已获准公开，作为同一 GZA 项目的过渡构建仓库。旧 `dayun-kicker` 仍保持私有，迁入游戏源码需要新的明确指令。
- 维护者已接受公开工作流日志可能包含私有源仓库的文件名、诊断内容或源码片段；访问凭证仍必须保密。
- 工作流仅手动触发并固定完整可信提交 SHA，只在官方 `YunLeFun/gza` 的 `main` 运行。不加入 PR、push 或外部派发触发，不移除官方仓库与分支检查。
- 跨库凭证仅使用单源仓库 Contents 只读权限，存储于 GitHub Actions Secrets。不写入文件、命令参数或日志。
- 不上传源码、缓存、source map、报告或构建产物；确需新增上传流程时先明确存储目标、可见性和授权范围。
- 许可范围见 `LICENSES.md`；源码、文档、素材和品牌分别处理，保留第三方原许可。
- Git 提交使用 Conventional Commits：`<type>(<scope>): <subject>`；type 仅允许 feat、fix、docs、style、refactor、perf、test、build、ci、chore、revert。
- 工作流改动运行 actionlint；提交前检查 `git diff --check` 和敏感信息。不得禁用既有推送确认钩子。
