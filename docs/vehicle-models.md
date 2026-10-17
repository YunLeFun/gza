---
title: 车辆建模图鉴
description: 查看 GZA 的电动车、面包车、公交、大云货车、城市服务车与工程车辆模型，了解它们在街区和比赛中的用途。
outline: 2
---

# 车辆建模图鉴

GZA 的车辆用程序生成低多边形模型，通过车头、车身比例、窗带和工作部件区分车型。日常面包车、公交、城市服务车与工程车辆一起组成广州街景，电动车则是玩家骑行、配送与比赛的主要载具。

玩家电动车的完整骑手套装、装备特征与获得方式，另见[电动车皮肤展示](/scooter-skins)。

## 模型展示

按用途筛选车型，点击图片即可打开 3D 预览。拖动旋转、滚轮或双指缩放，也可以开启自动旋转或复位视角；聚焦模型区域后，方向键旋转、`+` / `-` 缩放、`0` 复位。按 `Esc` 关闭预览。

预览使用与展示图方向一致的主光，搭配柔和补光、环境反射与落地阴影，方便旋转查看车身层次和材质。

<VehicleModelGallery />

微面采用五菱宏光一类的短车头与紧凑车身比例；平头面包车参考金杯一类的长车身与高车顶。两款均为游戏原创的简化造型，使用虚构涂装。

## 广州街区车型

| 类型 | 造型特征 | 当前用途 |
| --- | --- | --- |
| 玩家电动车 | 踏板车身、前后轮、车灯、后视镜与配送货箱；可更换套装和涂装 | 自由骑行、配送与比赛；停稳后可以上下车 |
| 双座电动车 | 在电动车上增加后座、脚踏与扶手 | 僵尸突围的双座共乘载具，线上开放状态见[玩法设定](/game/modes#僵尸突围) |
| 路边电动车 | 简化车身、车把、座垫与双轮 | 街区停放景物，参与停车碰撞 |
| 街区小汽车 `car` | 低车身、独立车顶、窗带和四轮 | 街区路边停车，参与碰撞 |
| 紧凑微面 `microvan` | 短车头、三段侧窗、滑门导轨与门缝 | 街区路边停车，参与碰撞 |
| 平头面包车 `van` | 平头、较长车身、高车顶与三段侧窗 | 街区路边停车，参与碰撞 |
| 标准公交 `bus` | 长车身、六段侧窗、双乘客门、车顶空调与线路牌 | 街区停放与新港中路西向环境公交 |
| 短轴接驳车 `minibus` | 短车身、四段侧窗、单乘客门与车顶电池舱 | 街区停放与新港中路东向环境公交 |
| PANZER 坦克 | 履带、负重轮、可转动炮塔与炮管 | 在街区激活彩蛋后可以上车、驾驶与开火 |
| 云骑共享单车 | 青绿车架、前车筐、后置智能锁与脚撑；原创虚构品牌 | Godot 城市停放点扫码骑行，见[共享单车](/city-traffic#共享单车) |

两款面包车各有**瓷白、银灰、米金、雾蓝、墨绿**五种配色。公交和接驳车各有**木棉红、日落橙、暖阳黄、榕荫绿、珠江蓝、晚霞紫**六种涂装。

新港中路运行公交显示游戏线路「社区接驳 01」，沿路行驶、遵循信号、避让玩家并停靠开门。当前没有公交乘车交互；面包车、小汽车与路边电动车也尚未接入玩家驾驶。玩家电动车、双座合作载具和 PANZER 的操作见[人物与载具](/game/characters)及[操作说明](/guide/controls)。

## 比赛车流与工程车辆

比赛中的大云汽车共用货车车头，再以货厢或工作部件区分用途。洒水车和环卫车使用白车身、绿色腰线与琥珀色作业灯的原创城市服务涂装，不贴「大云汽车」侧标。压路机和装载机采用独立的工程机械外形。它们作为比赛车流或干扰车辆参与碰撞、踢击和撞飞表现。

| 类型 | 技术标识 | 主要辨识特征 |
| --- | --- | --- |
| 厢式货车 | `cargo` | 封闭矩形货厢与「大云汽车」侧标 |
| 罐式货车 | `tanker` | 圆柱罐体与环形束带 |
| 洒水车 | `sprinkler` | 椭圆截面水罐、尾部喷杆与喷头、侧前喷头、后爬梯与罐顶护栏 |
| 压缩式环卫车 | `sanitation` | 高箱体、后倾的后装填斗、翻桶挂架与尾部红白警示条 |
| 平板货车 | `flatbed` | 开放货台与堆放货箱 |
| 自卸货车 | `dump` | 高侧板车斗与外侧加强筋 |
| 混凝土搅拌车 | `mixer` | 锥形搅拌罐、后部料斗与卸料槽 |
| 起重车 | `crane` | 折叠伸缩吊臂、吊钩与收起的支腿 |
| 挖机运输车 | `excavator` | 平板上搭载小型履带挖机，挖臂保持收拢姿态 |
| 压路机 | `roller` | 前钢轮、后橡胶轮与高置驾驶舱 |
| 装载机 | `loader` | 四个大轮胎、举升臂与前铲斗 |
| 重型货车 | `heavy` | 四轴车轮、加高车头、导流罩与双侧排气管 |
| 路口横向小汽车 | — | 三厢轿车轮廓、独立车顶、灯具与四轮 |

洒水车和环卫车在比赛中还有各自的行驶节奏：

- **洒水车**：尾部喷杆和侧前喷头持续喷出水幕，车后拖着一段湿路面。骑手进入车尾约 7 米的水幕范围时会提示「被洒水车淋湿」并听到水声，只有轻微镜头抖动，不影响分数、能量和速度；每辆车只淋一次。靠近时会听到一段原创的音乐盒提示曲，声音随距离减弱并按左右方位偏移。
- **环卫车**：按约 11 秒的周期行驶、平稳减速，在收运点停靠约 2 秒后再起步。每辆车的周期错开，后方车流会自动跟车减速；停靠时也要提前变道。
- 两款车的车顶作业灯会闪烁；被撞飞或踢飞时，水幕会暂停。

这些车型目前属于比赛中的环境车辆，玩家驾驶电动车穿过车流。横向小汽车用于路口穿行，其模型与街区停放小汽车分别实现。

## 建模与维护入口

模型由 TypeScript 描述几何体、材料和部件位置。面包车与公交将车身和车轮拆为共享部件，用于街区批量绘制。3D 预览按需加载游戏的模型构造函数，每次打开一款车型；关闭后释放渲染资源。文档缩略图从同一份游戏模型生成，车型改动后需要重新生成。

维护者先运行 `pnpm dev` 启动游戏开发服务器，再运行 `pnpm docs:vehicles` 更新 SVG。生成脚本默认使用 `http://127.0.0.1:5173`；开发服务器使用其他端口时，附加 `--base-url http://127.0.0.1:端口`。图鉴展示车辆外观，动画、碰撞与驾驶行为以游戏为准。浏览器无法运行 WebGL 时仍可查看静态大图。

| 内容 | 源码与说明 |
| --- | --- |
| 面包车 | [车辆模型目录](https://github.com/YunLeFun/dayun-kicker/tree/main/apps/dayun-kicker/src/render)、[尺寸与涂装](https://github.com/YunLeFun/gza/blob/main/docs/.vitepress/game-reference/apps/dayun-kicker/src/config/district/streetActivity.ts) |
| 公交与接驳车 | [模型部件](https://github.com/YunLeFun/gza/blob/main/docs/.vitepress/game-reference/apps/dayun-kicker/src/render/busModel.ts)、[新港中路公交机制](https://github.com/YunLeFun/gza/blob/main/docs/bus-transit.md) |
| 街区停放车辆 | [停车布置](https://github.com/YunLeFun/dayun-kicker/blob/main/apps/dayun-kicker/src/district/streetActivity.ts)、[街区绘制](https://github.com/YunLeFun/dayun-kicker/blob/main/apps/dayun-kicker/src/district/people.ts) |
| 大云货车与工程车辆 | [货车模型](https://github.com/YunLeFun/gza/blob/main/docs/.vitepress/game-reference/apps/dayun-kicker/src/render/truckModel.ts)、[洒水车与环卫车](https://github.com/YunLeFun/gza/blob/main/docs/.vitepress/game-reference/apps/dayun-kicker/src/render/municipalVehicle.ts)、[工程机械](https://github.com/YunLeFun/gza/blob/main/docs/.vitepress/game-reference/apps/dayun-kicker/src/render/workVehicle.ts)、[吊臂与挖机](https://github.com/YunLeFun/gza/blob/main/docs/.vitepress/game-reference/apps/dayun-kicker/src/render/constructionVehicle.ts) |
| 电动车 | [完整车辆构造](https://github.com/YunLeFun/gza/blob/main/docs/.vitepress/game-reference/apps/dayun-kicker/src/render/cockpitModel.ts)、[车身与双座结构](https://github.com/YunLeFun/gza/blob/main/docs/.vitepress/game-reference/apps/dayun-kicker/src/render/scooterBody.ts)、[骑手与载具组合](https://github.com/YunLeFun/dayun-kicker/blob/main/apps/dayun-kicker/src/render/scooterRig.ts) |
| PANZER | [坦克模型](https://github.com/YunLeFun/gza/blob/main/docs/.vitepress/game-reference/apps/dayun-kicker/src/district/tankModel.ts) |
| 路口小汽车 | [车辆模型](https://github.com/YunLeFun/gza/blob/main/docs/.vitepress/game-reference/apps/dayun-kicker/src/render/carModel.ts)、[横向车流](https://github.com/YunLeFun/dayun-kicker/blob/main/apps/dayun-kicker/src/render/crossTrafficCar.ts) |

增加外部模型、贴图或建模原稿时，遵循 [COS 资源与离线构建](https://github.com/YunLeFun/gza/blob/main/docs/media-assets.md)中的发布、恢复与许可记录流程。
