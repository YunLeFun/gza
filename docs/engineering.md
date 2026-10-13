# GZA：暴力电驴

**GZA：暴力电驴** 是第一视角街机驾驶与广州城市探索游戏原型。GZA 是广州行动（GuangZhou Action）的缩写，「暴力电驴」是第一版副标题。核心幻想是骑电驴穿过密集城市车流，并用夸张物理反馈把大云汽车踹飞。

## 当前支柱

- 第一视角电驴驾驶。
- 快速变道和近距离擦车压力。
- 脚踹命中后有 hit-stop、屏幕震动、火花和车辆飞出。
- 低遮挡 HUD，保证道路可读。
- 桌面键鼠和移动端触摸控制。

## 仓库方向

项目从单游戏仓库开始，但保留 monorepo-ready 结构：

```text
apps/dayun-kicker
packages/dayun-kicker-platform
packages/dayun-kicker-bff
cloud-functions
cloudfunctions
docs
```

通用比赛结果与排行榜契约由 `@yunlefun/play-competition` 承载。本仓库的
`packages/dayun-kicker-platform` 只负责 Dayun 的账号、商业化和遗留榜单适配，
不再作为通用游戏 SDK 扩张。

## 相关文档

- [玩家手册](index.md)
- [VitePress 文档 workspace 与部署](README.md)
- [GZA：暴力电驴 · 方向与分阶段计划](gza-direction.md)
- [游戏设计](game-design.md)
- [游戏流程、地点入口与生活物品武器](game-flow.md)
- [旧双座路线兼容记录、开发试玩与验证边界](zombie-coop.md)
- [僵尸突围：步行、骑行、双座共乘与验证边界](city-zombie-coop.md)
- [云乐坊云端合作：复用 Play、射击同步与发布](cloud-zombie-coop.md)
- [双座电驴与僵尸突围实施计划](two-seat-zombie-coop-plan.md)
- [路线图](roadmap.md)
- [AI 自定义玩法：玩法包、MCP 与 Skills 设计草案](ai-gameplay.md)
- [僵尸生存：局内成长、武器组合与骑行分工设计草案](zombie-survival.md)
- [UI 组件复用约定](ui-components.md)
- [按需加载与离线资源](lazy-loading.md)
- [Steam App ID 与抢先体验发布](steam-release.md)
- [地图与影像资料索引](map-data-sources.md)
- [琶洲互联网总部逐栋还原与参考](pazhou-internet-headquarters.md)
- [广州街景参考与素材边界](street-photo-references.md)
- [公开前检查记录](open-source-readiness.md)
- [源码、素材与品牌许可证方案](open-source-licensing.md)
- [省二医琶洲院区建模与参考流程](guangdong-second-hospital.md)
- [街区渲染性能、GPU 采样与预算](rendering-performance.md)
- [游戏性能优化手册、后续优先级与 Goal 模板](game-performance-playbook.md)
- [卡通画面氛围、社区参考与人物弹性动画](cartoon-atmosphere.md)
- [丽园雅庭夜间实景精修](liyuan-night-reference.md)
- [EdgeOne Pages 部署](deploy-edgeone.md)
- [SSO 0.4 + 同源 BFF](auth-bff.md)
- [弯道试跑与节拍同步](curved-track.md)
- [城市闭环竞速](circuit-race.md)
- [随机城市赛道](random-map.md)
- [广州城市地图与统一自由骑行入口](district-free-ride.md)
- [新港中路公交站与运行机制](bus-transit.md)
- [广州塔漫游](canton-tower-visit.md)
- [琶洲地图与通勤](pazhou-district.md)
- [玩法分类与道具赛](item-race.md)
