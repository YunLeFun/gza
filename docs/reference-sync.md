# 文档数据同步

文档源文件只在 gza 修改。`data/game-reference.json` 记录支持图鉴与下载页的受控游戏源码快照；当前快照包含迁移时已检查的工作区内容，不代表全部功能已推送或发布。

在仍有游戏源码访问权限的维护者机器上，游戏变更后按来源记录逐项核对：

1. 从目标游戏版本更新 `game-reference/` 中对应的程序模型、配置、纯工具和类型；保留相对目录。只同步文档所需依赖，不复制游戏入口、凭证、SDK、日志、历史或媒体原稿。
2. 对需要的包级导入使用 `packages/dayun-kicker-coop/src/docs.ts` 门面；这里只导出文档所需符号。源码引用与类型引用都要可在 gza 内解析。
3. 使用游戏 `tools/docs/mapPreviewData.ts` 的 `loadMapPreview` 从已发布且校验通过的地图导出预览，分别更新 `map-preview.json`、`map-roads.json` 和 `map-shapes.json`，保留 OSM 署名、输入路径、版本、字节数和 SHA-256。两份几何 JSON 已被 Git 忽略；本地更新后先执行 `pnpm assets:publish <resource-version>`，确认新版清单与许可，再运行恢复或构建，避免未发布修改被覆盖。
4. 同步车型 / 皮肤 SVG、目录文字和客户端发布清单；小型 SVG 保持现有 64 KiB 上限，其他媒体走 COS 流程。导出的展示图仍按素材政策授权。
5. 在 `game-reference.json` 中更新目标来源提交、工作区状态及每个文件的字节数和 SHA-256。保留来源和修改说明，不把未发布功能写成玩家已可使用。
6. 运行 `pnpm docs:typecheck`、`pnpm docs:build`、`pnpm assets:git-check`，检查图鉴、下载页、地图、搜索与手机布局，再提交到 gza。

文档 CI 读取 gza 中的固定源码与清单，并从永久 COS URL 恢复地图几何。首次构建需联网；恢复完成后 `pnpm assets:pull --offline` 可从本地内容缓存重建输入，不需要私有仓库凭证。游戏未来迁入 gza 后，可将参考快照改成同仓库模块引用；届时删除不再需要的副本，并保留来源记录。不要在文档 CI 中临时克隆整个私有仓库来隐藏未声明依赖。
