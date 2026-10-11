# GZA：暴力电驴

`gza` 当前是私有的构建与迁移准备仓库。游戏源码和既有 Git 历史继续保留在私有 `YunLeFun/dayun-kicker`；这里仅保存工作流、许可证和说明，不包含游戏源码、媒体、旧 CI 日志或附件。

手动工作流用只读凭证临时克隆旧仓库的指定提交，执行 Web 类型检查、单元测试、构建和发布预算检查。可选构建文档；不上传产物、不保存缓存，也不自动部署。未提交的本地修改不会参与远程构建。桌面打包、签名、Steam 发布和浏览器 E2E 不在初版范围内。

私有新仓库仍消耗组织共享的 GitHub-hosted CI 额度，并不能通过换仓库重置额度。当前流程设有私有仓库检查，公开后会自动跳过；改变可见性前需要重新审查日志、凭证、产物和 GitHub 使用条款。[GitHub Actions 计费](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

- [构建配置和触发方法](docs/private-build.md)
- [许可范围及未来源码迁移方案](docs/licensing.md)
- [素材处理边界](ASSETS.md)
- [品牌使用政策](BRANDING.md)

本仓库原创构建配置和脚本采用 [Apache-2.0](LICENSE)；原创说明文档采用 [CC BY 4.0](LICENSES/CC-BY-4.0.txt)。完整范围见 [LICENSES.md](LICENSES.md)。这些授权不覆盖旧私有仓库中的游戏源码、文档、素材或构建产物；未来迁入时再按已确认方案落实逐项授权。
