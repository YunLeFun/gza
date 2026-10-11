---
title: 广州地图预览
description: 从游戏同一份地图数据构建的二维缩略，显示道路、建筑、水域和实际通行边界。
outline: false
---
<script setup>
import { data } from './mapPreview.data'
import MapDataPreview from './.vitepress/theme/components/MapDataPreview.vue'
</script>

# 广州地图预览

这张缩略图从已发布的游戏地图生成，包含旧城区地标、桥梁适配与广州塔周边扩展。它用于理解数据范围，不是实景截图，也不是街道或建筑完整性的验收图。

<MapDataPreview :data="data" />

## 地图如何保持同步

维护者使用游戏的地图合成、道路网络与实际边界函数导出预览，核对发布清单的地图版本、文件大小和 SHA-256，再将道路与面状地物的几何发布到 COS，把恢复清单和元数据快照提交到 gza。文档每次构建按清单恢复几何，并核对这些固定快照的校验值、发布状态与署名，输入缺失或内容不符时失败。

更新地图时，先完成游戏资源发布与校验，再按[同步流程](reference-sync.md)更新文档快照。页面显示固定版本，不声称与可能尚未更新的线上游戏实时一致。

也可查看[物品图鉴](./item-catalog)与[车辆建模图鉴](./vehicle-models)。
