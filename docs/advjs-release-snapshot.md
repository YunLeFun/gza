# ADV.JS 发布依赖与公开源码

2026-10-10，游戏使用 `vendor/advjs/` workspace 快照 `0.1.4-dayun.2`：沿用已提交的上游源码，升级固定依赖并在仓库内重建 lib。独立 checkout 不需要旁边存在 `YunYouJun/advjs` 仓库。

## 依赖边界

应用的 `@advjs/core` 与 `@advjs/types` 使用 `workspace:*`。`pnpm-workspace.yaml` 纳入 `vendor/advjs/*`；core 的 parser / types 依赖同样指向这份固定快照，外部依赖使用固定版本并由锁文件记录 integrity。常规游戏构建读取预编译 `lib`，没有重新实现 ADV.JS 运行时。

core 只导出游戏所需 `/runtime` 与 `/compiler`。parser 保留根入口与 `/fs`，types 保留完整共享定义。游戏按需加载 headless 运行时，Markdown 编译器只在构建脚本中使用，不向游戏引入 ADV.JS Client、默认主题或编辑器。

npm `@advjs/core@0.1.2` 缺少两个子入口，`@advjs/parser@0.1.3` 缺少当前编译器使用的 `AdvScriptSyntaxError`，因此不能直接替换为这些旧发布版。后续优先切换到覆盖所需公共入口的正式上游固定版本。

## 来源与对应源码

上游：[YunYouJun/advjs](https://github.com/YunYouJun/advjs)，基线提交 `8c6557e9dbd5f84a16b8268d3ac83a11a5665b2a`，上游版本 `0.1.4`。固定快照由游戏提交 `1a8e00b build(story): pin the ADV.JS SDK for standalone builds` 引入；原集成包含上游尚未提交的 headless 入口与独立 `end` 节点编译修复，记录在 `vendor/advjs/upstream-integration.patch`，不称为干净上游提交的构建。

MPL-2.0 许可证、对应 preferred TS 源码、包 / 构建元数据及集成补丁保留在已提交的 vendor 中。网页公开相同的普通源码文件：

- `/third-party/advjs-NOTICE.md`
- `/third-party/advjs-source/README.md`
- `/third-party/advjs-source/PROVENANCE.json`
- `/third-party/advjs-source/core/src/`、`parser/src/`、`types/src/`
- 各包的 `LICENSE`、`package.json`、`build.config.ts`，以及共享 `tsconfig.json` 和集成补丁

公开文件逐字节取自固定 vendor，provenance 记录来源与源码 / lib 的 SHA-256。没有 `node_modules`、隐藏文件、账号配置、测试数据或凭据，也没有压缩包、Base64 或扩展名伪装。源码保持原来的 `.ts` 文件与目录结构，服务于许可证分发与检查；按现有 Git 资源策略检查，不增加归档例外或修改体积上限。

## 与原集成的差异

core 的 57 个 TS 源文件、parser 的 17 个 TS 源文件与原本机集成逐字节一致，parser 的预编译 JS 与共享产物也一致。workspace core 只以 runtime/compiler 两个入口重建，原本机构建还包含根入口，因此 lib 的拆块方式不同，不能称全部 JS 逐字节相同；compiler 声明一致，runtime 声明仅 import / union 顺序变化。完整 types 沿用同一上游工作区的定义与运行时常量。

发布前继续用现有剧情产物校验、剧情与存档测试、类型检查、游戏构建和性能预算确认行为及加载边界；源码相同不代替实际验证。

## 更新与发布校验

更新方式沿用 [固定 workspace 快照说明](https://github.com/YunLeFun/dayun-kicker/blob/main/vendor/advjs/README.md)：同步指定上游版本的源码、lib、来源和锁文件，复核公开源码及许可证，再检查剧情和发布产物。不要自动同步本机上游工作区。

```sh
pnpm install --frozen-lockfile --offline
pnpm story:check
pnpm typecheck
pnpm test
pnpm build
pnpm verify:performance
pnpm verify:release
```

网页发布候选还需确认 `dist/third-party/advjs-source/` 包含对应源码和来源；本机成功不代替独立 checkout 与正式部署验证。
