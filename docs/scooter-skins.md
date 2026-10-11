---
title: 玩家电动车皮肤
description: 展示 GZA 的 7 款玩家电动车与骑手套装，旋转查看制服、头盔、配送箱和车辆涂装，并了解获得与装备方式。
outline: 2
---

<script setup lang="ts">
import { SCOOTER_SKIN_CATALOG } from "./.vitepress/theme/components/vehicles/scooterSkinCatalog";
</script>

# 玩家电动车皮肤

电动车皮肤是一整套骑行外观：车身涂装与骑手服装一起变化，任务制服还配有对应的头盔和配送箱。这里展示原厂灰黑、五套配送任务制服，以及霓虹鬼火，共 7 款套装。

## 套装展示

点击图片打开 3D 预览，查看电动车与骑手的完整组合。拖动旋转，滚轮或双指缩放，也可以开启自动旋转、复位视角；聚焦模型后，方向键旋转，`+` / `-` 缩放，`0` 复位，`Esc` 关闭。预览沿用车辆图鉴的主光、补光、环境反射和落地阴影。

<VehicleModelGallery :vehicles="SCOOTER_SKIN_CATALOG" label="玩家电动车皮肤图鉴" item-label="皮肤" :show-filters="false" />

## 获得与装备

原厂灰黑初始可用。去客村骑手站找陈叔登记后，完成配送可依次获得任务制服；登记前的订单不计入制服任务进度。每款卡片显示所需的累计配送单数。

霓虹鬼火通过在线商店权益获得，价格以当前商品页面为准。音乐和动态灯效可在游戏内检视时体验。

在主菜单打开「车库」，选择套装预览、检视，并装备已解锁外观。比赛和自由骑行共用已装备套装。街区的「7 号电动车 · 新港中路店」也提供已解锁套装换肤，以及独立车身涂装和头盔。

人物、骑手登记与载具玩法见[人物与载具](/game/characters)，街景和比赛车流模型见[车辆建模图鉴](/vehicle-models)。

## 模型与外观来源

套装名称、说明、装备特征和配送解锁条件复用[游戏皮肤目录](https://github.com/YunLeFun/gza/blob/main/docs/.vitepress/game-reference/apps/dayun-kicker/src/game/skins.ts)。展示图与 3D 预览均由实际游戏模型生成，颜色为套装原色；独立改色、动作与音乐表现以游戏内为准。
