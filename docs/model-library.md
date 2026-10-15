---
title: 模型素材目录
description: 24 件原创低模样品的双语索引、规格、源文件与接入边界。
outline: false
---
<script setup>
import ModelSampleGallery from './.vitepress/theme/components/ModelSampleGallery.vue'
</script>

# 模型素材目录

统一整理交警与电动车、9 件现有武器外观、城市场景道具、7 款丧尸候选和广府日常道具。所有条目均为美术样品；不包含小女孩素材。当前资源尚未完成 COS 发布，以下规格来自交付 GLB 和对应验证记录，不代表游戏已接入。

<ModelSampleGallery />

## 使用与接入边界

- 自包含 GLB、米制、Y 向上、无外部贴图。尺寸为静态包围盒，不是碰撞体；组合路障计作一组
- 武器与广府日常道具包含 grip 挂点；交警为静态分部件角色，无骨骼或动作。电动车包含轮轴和转向节点，未接车辆控制器
- 外卖箱、补给箱含 OpenClose；丧尸含 RigidWalk_Demo_1s 刚体演示片段，无蒙皮、攻击、受击或死亡动画。本页只检查静态外观，不播放动画
- 丧尸摆动会有约 3–3.5 厘米脚底偏差；正式接入需修正接地、动作和碰撞。面数与材质数量不是设备帧率测试
- 源文件中的组合排列、灯光与相机用于展示；每件 GLB 独立导出。正式接入还需资源注册、挂点适配、碰撞、LOD 和批处理验收
- 本批为原创程序几何，无导入的第三方网格或贴图。NOASSERTION 表示未声明公开再分发许可，上传或公开 URL 不等于授予开放许可

## 本地预览

复用现有车辆／武器查看器的旋转、缩放、复位、键盘操作及 WebGL 重试；一次只加载所选 GLB，10 秒超时，验证字节数与 SHA-256。加载失败保留规格资料，不用其他模型冒充成功。

设置 GZA_MODEL_CATALOG_BASE 为允许跨域读取的本地素材服务根，目录布局为「根／素材包名／文件名」，再运行 pnpm docs:dev。未配置时不请求未发布模型。浏览器需处于 localhost 或 HTTPS 安全上下文以进行校验。不得把未发布二进制复制进 docs/public 后直接发布，VitePress 会将其打入产物。

## 发布与恢复

正式发布沿用 [COS 共享媒体流程](./media-assets)，保留每个文件的版本、路径、字节数和 SHA-256；运行资源规划放入 docs/public/models/catalog，原稿独立归档于 assets/model-samples，不随文档站点打包。当前清单仅是素材索引，不能替代已经验证的媒体发布清单。COS 上传、匿名下载校验与共享恢复接入完成前，不启用生产下载链接。

武器的游戏资料仍以 [武器模型预览](./weapon-models) 和 [物品图鉴](./item-catalog) 为准，不在这里另建数值或玩法定义。

## 验证命令

运行 pnpm docs:models-check 检查目录结构和失败路径；附加包含各素材包目录的本地根路径，可验证全部真实 GLB、文件大小与 SHA-256。另运行 pnpm docs:typecheck、pnpm docs:build、pnpm assets:git-check 和 git diff --check。
