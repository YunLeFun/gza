# 广州塔与广州塔广场漫游

街区入口为 `/district.html`。欢迎页或地图中点击「从广州塔广场出发」，停稳后按 **X** 下车，沿南侧门厅直接步行进入广州塔；不用按入塔按钮。门厅与广场共用地面高度，穿过入口保持人物位置、朝向和视角。沿原路走出仍处于步行状态，车辆保留在原处，靠近按 **X** 上车。**G** /「进入广州塔」保留快速参观入口。

两座下沉庭院北侧均留出 9 米宽的楼梯通道，沿 30 级楼梯步行下到 **B1（游戏标高 −5.1 m）**，也可沿楼梯走回地面。地下游廊连接两个庭院、塔内电梯厅和商铺立面；东侧楼梯连接 **B2（游戏标高 −10.2 m）**。电梯支持大厅、B1、B2、空中影院，以及 433 / 450 / 488 米观景层。升降仍包含走入、关门、连续升降和开门，楼梯高度随位置连续变化。

选择「空中影院」到候场区，沿标识向左走进 1 号厅，靠近座位按 **E** 或「入座」观看，再按 **E** 起身。影厅有声学墙面、阶梯座席、扶手、走道灯和银幕；银幕循环播放本地生成的原创动画《珠江夜航》，可暂停 / 继续，无外部电影资源请求。影院内默认收起电梯列表，展开「乘梯离开影院」可返程。影院标高采用约 100 米的游戏锚点，界面显示近似符号。

参观时 **W / S** 前后移动、**A / D** 左右平移，均相对当前视角；斜向移动保持同一步行速度。点击画面后移动鼠标或触屏拖动环顾；手机提供前后 / 左右移动、抬头 / 俯瞰、入座和放映按钮，手柄左摇杆移动、右摇杆环顾，也可导航参观面板。**Esc**、暂停、地图或后台会冻结电梯与放映。参观期间车辆操作暂停；观景层核心筒 / 护栏和影院座椅由独立 Rapier 世界提供碰撞，入口、地下通路与楼梯共用米制步行边界。

## 尺度与还原范围

场景沿用街区的米制坐标，**1 场景单位 = 1 米**。塔的位置取自已有 OSM 楼栋轮廓；塔高 600 米，主体顶部 454 米，24 根立柱、46 道环梁、135° 扭转、280 米处的窄腰，与观景层高度按公开资料校准。椭圆截面使用底部 **80 × 50 m**、腰部 **27.5 × 20.65 m**、顶部 **55 × 41 m** 三组参数插值；钢构曲线、斜撑、分段玻璃体、倾斜塔冠、16 个摩天轮球舱、桅杆及 488 米平台均为可渲染几何。

广州塔广场参考 2024 年底开业后的官方航拍及实景，重建塔南侧的两个椭圆下沉庭院、阶梯、商铺立面、映塔水池、曲线绿化、树木、长椅、入口雨棚及双语标识。下沉庭院同时切开广场和街区地面，不会被底层草地填平；庭院栏杆在楼梯处留出对应缺口，步行支持进入；原有水池骑行规则保留。近景水池使用 384 像素平面反射，额外渲染塔身与天空；远处及高空视角使用水面材质，限制反射开销。

**塔身外包尺寸按公开参数校准；广场平面、层高及室内装修属于照片参考重建，尚未达到测绘级逐构件一比一。** 公开的 11.4 万平方米是广场项目总建筑面积，不能直接当作地面广场面积。当前公共平台接入游戏地面基准，下沉庭院约低 5.1 米；门厅现与地面基准齐平，大厅高度为 0 米；B2 为 −10.2 米，均为游戏基准，不能当作实际建筑标高。影院所在 18–21 层参考公开地图地址，约 100 米的标高、单厅平面、座椅数量及装修尚无测绘资料验证。地下层高、南侧门厅导向、商铺立面、地铁连接口、电梯轿厢、自动走入路线和楼层间直达功能为游戏体验设计，未复刻真实售票、换乘及设备内部布局。

升降行程采用平滑起停；运动段时长为 `高度差 / 18 + 3` 秒，另含走入、关门、开门各约 1 秒。这是压缩后的游戏行程，不代表真实电梯速度。电梯使用实际经过时间，低帧率不会放慢整段行程；步行继续使用固定物理步长。

## 资料

- [广州市文化广电旅游局：广州塔](https://wglj.gz.gov.cn/ztmb/gzhyn/ajjq/4a/content/post_8928935.html)：钢构数量、扭转角度、450 米及 488 米平台。
- [ASCE Journal of Structural Engineering：Bayesian Modeling Approach for Forecast of Structural Stress Response Using Structural Health Monitoring Data](https://ascelibrary.org/doi/full/10.1061/%28ASCE%29ST.1943-541X.0002085)：600 米总高、454 米主体、三个椭圆截面与 280 米腰部高度。
- [广州市人民政府：广州塔广场文旅融合新模式](https://www.gz.gov.cn/zt/jrshts/2025n/2025npacy/gzgn/content/post_10091729.html)：项目位置、开业时间、总建筑面积、映塔水池及航拍参考。
- [广州塔设计参与者 Stefan Al：Canton Tower](https://www.stefanal.com/projects/canton-tower)：整体形态与结构照片参考。

- [广州市政府：广州塔广场隆重开业](https://www.gz.gov.cn/ysgz/xwdt/ysdt/content/post_10050313.html)：地面 / B1 双首层、360° 游廊、2F 映塔水池、东北侧剧场。**广场剧场与塔内电影院是两种不同设施**；本次影院位于塔内，未将剧场冒充影院。
- [广州塔官方物业资料](https://www.cantontower.com/uploads/ueditor/file/20250512/6388264399094196618874082.pdf)：商业地上一层、地下两层；官网 PDF 访问受限时可通过搜索索引核对公开摘要。
- [广州塔官网](https://www.cantontower.com/?lang=zh)：列出金逸空中电影城；[高德影院地点](https://www.amap.com/place/B00141PPCD)记录阅江西路 222 号广州塔 18–21 层，非室内测绘图。

## 实现与验证

`cantonTowerSite.ts` 统一塔身尺度、广场定位和楼层数据；`cantonTower.ts`、`cantonTowerPlaza.ts`、`cantonTowerInterior.ts` 分别负责外观、广场与室内。`towerAccess.ts` 统一出入口、地下步行面和影院座位交互，`cantonTowerPublicInterior.ts` 实现门厅、地下游廊与银幕动画；`towerVisitState.ts` 提供轻量初始状态，电梯和参观运算由 `towerVisit.ts` 随室内资源按需加载，`towerVisitPhysics.ts` 提供高空碰撞，`TowerVisitPanel.vue` 展示参观操作。静态几何按材质合批，近景钢构与广场小物件使用距离细节切换，主题切换复用材质。

```sh
pnpm --filter @yunlefun/dayun-kicker typecheck
pnpm --filter @yunlefun/dayun-kicker build
pnpm exec vitest run apps/dayun-kicker/src/district/towerAccess.test.ts apps/dayun-kicker/src/district/towerVisit.test.ts apps/dayun-kicker/src/district/cantonTower.test.ts
pnpm exec playwright test e2e/tower-visit.spec.ts e2e/tower-public-spaces.spec.ts
```

单元测试覆盖入口限制、连续升降、暂停、楼层高度、步行边界、下沉庭院地面开洞与模型预算；浏览器测试覆盖步行穿门往返、B1 楼梯连续下降与返回、B2 电梯、影院入座及放映暂停、全部楼层、Rapier 核心筒碰撞、拖动视角、手机触控与截图。macOS 无头 Chromium 默认可能使用 SwiftShader；可在本地 Playwright 启动配置中选择 `--use-angle=metal`，使用真实 GPU 进行视觉试玩。
