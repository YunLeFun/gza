# 武器模型接入与本地验收

武器列表来自现有 `ITEM_CATALOG`，后者读取受控游戏定义快照。这里只维护英文展示名与模型接入，不复制伤害或物品目录。2026-10-14 已核对私有源 main 的 `weapons.ts` 与 `cityMelee.ts`，9 种武器与现有快照一致；此核对不表示游戏已采用新模型。

## 本地低模预览

- 自包含 GLB，米制、Y 向上、模型中心为原点；`grip` 空节点记录握持点
- 文件名使用真实 ID：`broom.glb`、`umbrella.glb`、`frying-pan.glb`、`pot-lid.glb`、`feather-duster.glb`、`gas-cylinder.glb`、`slingshot.glb`、`smg.glb`、`shotgun.glb`
- 无纹理 flat-shaded PBR；保留清单中的字节数、SHA-256、尺寸、三角面、来源与许可记录
- 将这批已生成并核验的文件放在仓库外的本地素材服务中（例如服务地址 `http://localhost:8081`，需允许 CORS），再启动：

```sh
GZA_WEAPON_MODEL_BASE=http://localhost:8081 pnpm docs:dev
```

访问 `/weapon-models`。独立素材服务地址不受 `DOCS_BASE=/manual/` 影响。也可设置经过校验、允许 CORS 的模型资源根；不是上传命令。

默认不设置该变量，页面使用现有程序模型，不发送缺失 GLB 请求。配置外部资源后按选择加载一件模型，网络请求超时为 10 秒；错误会明确标为回退并展示程序模型。WebGL 不可用时保留武器资料与重试按钮。切换模型会释放旧预览，过时的异步加载结果不会覆盖新选择。

## 发布边界

本轮 GLB 仅用于本地方案验收，未上传 COS、未部署、未修改游戏运行时。不要将未发布模型路径配置到生产环境。正式发布需使用既有共享媒体发布／恢复流程，扩充其合法目标目录和 MIME 类型（若尚未覆盖 GLB），保留内容寻址清单与许可记录，然后校验资源。不得新增武器专用下载器绕过资源策略，或将媒体直接加入 Git。

检查命令：`pnpm docs:typecheck`、`pnpm docs:build`、`pnpm assets:git-check`、`git diff --check`。浏览器验收需覆盖全部 9 件新 GLB、快速连续切换、旋转／缩放／复位、自动旋转、手机布局、中英操作切换、断网／无效模型回退与 WebGL 重试。

加载器回归测试：`pnpm docs:weapons-check` 在不需要 GLB 的情况下验证全部武器的离线、404 与无效文件回退；`pnpm docs:weapons-check /absolute/path/to/weapon-models` 另外验证全部真实 GLB 和握持节点。这是本地测试，不会下载或上传模型。

本地公开目录会进入 VitePress 构建产物。构建入口会拒绝 `docs/public/models/` 内的文件，防止误带未发布媒体；仅清空资源根配置并不会删除产物里的文件。正式 COS 接入后再按已验证的资源清单调整此限制。
