---
description: GZA 的公开文档、贡献与工程维护入口。
---

# 开发与文档维护

公开文档统一在 [YunLeFun/gza](https://github.com/YunLeFun/gza) 维护，文档站可以独立构建。游戏源码暂时保存在私有 `dayun-kicker`，由 gza 的受控工作流读取指定提交进行验证。

- [工程文档索引](engineering.md)
- [路线图](roadmap.md)
- [报告问题](https://github.com/YunLeFun/gza/issues)
- [文档维护与部署](README.md)
- [许可与素材边界](licensing.md)

工程文档包含草案、未来计划和历史验收记录；是否可玩、是否可下载，以玩家手册和实际发行版本为准。源码路径的 GitHub 链接在游戏迁移前需要私有仓库访问权限。

```sh
pnpm install --frozen-lockfile
pnpm docs:dev
pnpm docs:typecheck
pnpm docs:build
pnpm docs:preview
```

页面下方的编辑链接直接指向 gza 中对应的 Markdown。构建检查内部链接、展示依赖和地图快照，生成静态 HTML 与中文搜索索引，不需要游戏媒体或云服务凭证。

玩家手册文字采用 CC BY 4.0，程序和可执行示例采用 Apache-2.0，素材、品牌与第三方数据分别授权。修改游戏行为时同步更新这里的手册；模型、物品、地图和下载清单按[同步流程](reference-sync.md)更新。离线手册以后也从这份内容生成。
