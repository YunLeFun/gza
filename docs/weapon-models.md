---
title: 武器模型预览
description: 选择 GZA 的生活化近战工具与现有合作武器，旋转、缩放查看 3D 模型。
outline: false
---
<script setup>
import WeaponModelGallery from './.vitepress/theme/components/WeaponModelGallery.vue'
</script>

# 武器模型预览

鸡毛掸子、煤气罐、弹弓、扫把、雨伞、平底锅和锅盖，生活里的物件也是广州求生工具。现有冲锋枪与霰弹枪收在列表末尾。

<WeaponModelGallery />

## 预览范围

目录、名称、模式和参数从[物品图鉴](./item-catalog)所用的游戏定义快照派生，不另外维护一份武器数值。参数属于对应玩法；预览不是战斗演示，不改变伤害、背包或解锁状态。

默认显示现有游戏程序模型；配置新版 GLB 后显示独立低模方案，加载失败自动回退。新版外观尚未替换游戏运行时模型，也不代表已上线。英文按钮只切换预览操作与武器名，游戏资料保留中文来源。

参见[模型接入与本地验收](./weapon-model-assets)。
