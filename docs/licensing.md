# 源码迁移与许可证方案

已确认的目标：旧 `dayun-kicker` 保持私有，新 `gza` 先公开同一 GZA 项目的构建配置和说明。未来迁入的原创源码采用 Apache-2.0，原创说明文档采用 CC BY 4.0，素材与品牌分别授权。

按最新安排，`gza` 已迁入公开文档站及所需的展示程序、配置与数据快照；完整游戏源码暂不迁入。当前标准许可证仅对本仓库明确列出的内容生效，不改变旧私有仓库的许可，也不因临时 checkout 而授予私有游戏代码或产物的再分发权利。

后续迁移使用经过审核的干净文件快照创建新提交，不导入旧 `.git`、PR refs、标签、stash、CI 日志、附件、私人文档、凭证或生成产物。保留必要的作者署名与来源通知，技术包名、应用 ID 和存档键继续使用稳定的 `dayun-kicker` 标识。

| 未来内容 | 处理方式 |
| --- | --- |
| 原创程序、测试、工具、构建配置 | Apache-2.0；逐包更新许可字段，保留 `private: true` |
| 原创开发说明与玩家手册 | CC BY 4.0；图像、剧情和第三方引用单独标注 |
| ADV.JS 快照及对应源码 | 保留现有 MPL-2.0、来源与修改记录，发布时提供所需对应源码 |
| Valve GameNetworkingSockets 公共头文件 | 保留 BSD-3-Clause 及现有完整通知 |
| OSM 派生地图与数据库 | 保留 ODbL-1.0 及署名要求；不能因文件扩展名改变许可 |
| 外部音乐、图标、剧情及独立美术 | 依 [ASSETS.md](https://github.com/YunLeFun/gza/blob/main/ASSETS.md) 单独核对 |
| 项目名称与官方标志 | 依 [BRANDING.md](https://github.com/YunLeFun/gza/blob/main/BRANDING.md) 处理 |
| 其他依赖和 SDK 运行库 | 保留各自许可与分发要求，不用包装层许可替代 SDK 条款 |

旧仓库中本地 lodash 兼容替代模块的来源与权属仍需核对；24 个图片 / 图标的对外授权仍待确认。未来源码迁移前补齐这些边界，并对选定快照与发布产物重新扫描。暂时跨库构建不会完成开源审核，也不会清理旧历史中的私人资料。

标准 [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)正文和 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)正文保持完整，许可范围由本仓库 [LICENSES.md](https://github.com/YunLeFun/gza/blob/main/LICENSES.md) 明确。不得在标准开源许可证中额外添加禁止商用、换牌限制等条件；品牌和独立素材的边界只适用于它们各自的权利。
