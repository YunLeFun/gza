# GZA：暴力电驴

`gza` 是 GZA：暴力电驴的公开构建与迁移准备仓库。过渡阶段，游戏源码和既有 Git 历史继续保留在私有 `YunLeFun/dayun-kicker`；这里维护公开文档站、文档必需的展示源码与固定数据，以及工作流和许可证；不导入旧历史、私人资料、日志或附件。后续将按已确认的许可方案迁入经过审核的源码。

手动工作流用只读凭证临时克隆旧仓库的指定提交，执行 Web 类型检查、单元测试、构建和发布预算检查。可选验证本仓库公开文档；游戏构建不上传产物、不保存缓存。文档由 EdgeOne Git 集成独立发布。未提交的本地修改不会参与远程构建。桌面打包、签名、Steam 发布和浏览器 E2E 不在初版范围内。

公开仓库使用标准 GitHub-hosted runner，按当前规则免费使用构建分钟；本工作流构建同一 GZA 项目，不配置 larger runner、收费存储或自动发布。工作流日志公开，可包含私有源仓库的文件名、诊断内容或源码片段，维护者已接受这一过渡方式。[GitHub Actions 计费](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

- [官方文档与玩家手册](https://docs.gza.yunle.fun/)
- [文档维护与部署](docs/README.md)
- [构建配置和触发方法](docs/private-build.md)
- [许可范围及未来源码迁移方案](docs/licensing.md)
- [素材处理边界](ASSETS.md)
- [品牌使用政策](BRANDING.md)

本仓库原创构建配置和脚本采用 [Apache-2.0](LICENSE)；原创说明文档采用 [CC BY 4.0](LICENSES/CC-BY-4.0.txt)。完整范围见 [LICENSES.md](LICENSES.md)。这些授权不覆盖旧私有仓库中的游戏源码、文档、素材或构建产物；未来迁入时再按已确认方案落实逐项授权。
