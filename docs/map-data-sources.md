# 广州地图、影像与模型资料索引

核查日期：2026-10-07。用于快速查找来源和记录后续导入依据；“候选”表示已查到官方入口，尚未对广州样本做覆盖、精度与性能验收。

## 快速选择

| 需求 | 优先入口 | 本项目用途与状态 |
| --- | --- | --- |
| 自行拍摄的广州街景、建筑立面与沿街细节 | 经权利人确认可用的建模参考 | 使用前核对素材许可与署名；本项目不记录个人图库、设备或同步配置 |
| 路网、路口连接、建筑轮廓、水域、桥梁 | [OpenStreetMap](https://www.openstreetmap.org/)、[数据许可](https://www.openstreetmap.org/copyright) | 当前底座，WGS84 / ODbL；保留原始节点 ID、桥梁 layer、单双向和来源时间 |
| 新港中路公交站 | [OSM 赤岗路口②](https://www.openstreetmap.org/node/4391903252)、[交通局站序](https://jtj.gz.gov.cn/zwgg/ywgg/ggjt/gjxldzgg/content/post_10445367.html) | 已接入丽园附近等六个站台；坐标、2026-06-01 快照、原始响应和游戏接驳线路区别见[公交资料](bus-transit.md) |
| 广州塔中心道路与建筑补全 | [中心窗口原始 API](https://api.openstreetmap.org/api/0.6/map?bbox=113.3085,23.104,113.326,23.1125) | 2026-10-08 已导入 229 条道路、62 个建筑，分别新增 35 条与 9 个；来源版本、节点刷新、精度与重建方式见[中心街区更新](canton-tower-center.md) |
| 现有开放矩形内的道路、建筑、公园与西侧珠江补全 | [OSM API](https://wiki.openstreetmap.org/wiki/API_v0.6) | 2026-10-09 新增 585 段地面道路、两座公共步行桥、665 个建筑轮廓、28 处公园；七份输入来源、估计桥面及离线重建见[街区补全](district-infill.md) |
| 陈家祠与中山路西向连接 | [OSM 陈家祠](https://www.openstreetmap.org/way/520935699)、[高德南门导航参考](https://www.amap.com/place/B00140H88E) | 2026-10-11 离线导入道路、祠堂与广场轮廓，三路三进程序建模；WGS84 坐标与导航参考分开，见[陈家祠地图](chen-clan.md) |
| 大范围 OSM 离线提取 | [Geofabrik 中国提取包](https://download.geofabrik.de/asia/china.html) | 半径 5 km 扩建的候选。先下载 10 × 10 km 包围盒，再按圆形 AOI 裁剪与分块，避免运行时请求公共地图 API |
| 补齐普通建筑与可用高度属性 | [Overture Buildings](https://docs.overturemaps.org/guides/buildings/)、[可视化浏览](https://explore.overturemaps.org/)、[区域下载](https://docs.overturemaps.org/getting-data/) | 候选；包含 building / building_part，可按高度挤出，不能默认每栋都有可靠楼高。广州需与现有 OSM 去重并抽样比较 |
| 广州城市构成和重点地标 | [guangzhou-3d](https://github.com/Tsdsj/guangzhou-3d)、[在线浏览](https://tsdsj.github.io/guangzhou-3d/) | 已记录的建模参考；地标、骑楼、屋顶、街区布局。部分高度和立面为程序生成，具体资料见[社区参考文档](community-city-reference.md) |
| 阿里巴巴华南运营中心建筑实景与高度 | [SFAP 原始摄影](https://www.sfap.com.cn/9191.html)、[海珠区政府](https://www.haizhu.gov.cn/hzdt/ztlm/tzhz/yshj/yshl/content/post_9843394.html) | 南塔 207 m、北楼 57.5 m，折角、格栅与连廊参考；[照片索引、精度和实现记录](alibaba-south-china.md)。照片仅供观察，不作为游戏贴图 |
| 琶洲周边互联网总部外观、总平面与高度 | [总部逐栋参考索引](pazhou-internet-headquarters.md)；[唯品会 gmp](https://www.gmp.de/en/news/41/press/9244/modern-office-design-for-vip-com-gmp-completes-head-office-for-e-commerce-corporation-in-guangzhou)、[小米实景](https://commons.wikimedia.org/wiki/File:广州小米大厦.jpg)、[国美维业](https://www.szweiye.com/SuccessStories/OfficeSpace/78.html)、[TCL 运营方](https://kexingservice.com/Project/Detail/6935) | 本轮新增小米、唯品会、国美、TCL；索引含 OSM ID、实景／方案区别、暂估尺寸及科大讯飞、三七互娱、树根互联的下一批入口 |
| NPC 人物运动与动作衔接 | [Mixamo](https://www.mixamo.com/) | 人物动画参考；后续优化 NPC 待机、步行、跑步的姿态、步态节奏、重心变化与动作衔接，结合现有方块人物比例调整 |
| 高分辨率卫星观察、道路与入口核对 | [高德地图](https://www.amap.com/)、[官方卫星图示例](https://lbs.amap.com/demo/javascript-api-v2/example/layers/satellite) | 影像参考入口；卫星图 SDK 能力已核查。建筑立面应结合街景、公开建筑资料或自行拍摄照片；本轮没有核实到高德等价的开放街景 API |
| 腾讯影像与地点核对 | [腾讯地图](https://map.qq.com/)、[腾讯位置服务](https://lbs.qq.com/)、[地图产品](https://lbs.qq.com/map/) | 影像参考入口；具体地点的卫星/街景覆盖以客户端实际呈现为准。当前公开抓取未能读到可用街景 API 文档，后续接入时重新核查产品与 Key 权限 |
| 植被、水域与城市大尺度变化 | [Copernicus Sentinel-2](https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-2)、[浏览器](https://browser.dataspace.copernicus.eu/) | 候选；最高 10 m 波段适合区域地貌、绿地和水域对照，不足以确定路边栏杆与单个门窗 |
| 草地、林地、水体、建筑用地分类 | [ESA WorldCover](https://esa-worldcover.org/en) | 候选；10 m 全球土地覆盖，历史产品年份要随记录保留，不当作当天实景 |
| 官方城市三维底图 | [广州 CIM 介绍](https://zsj.gz.gov.cn/zwgk/zfxxgkml/zfxxgkml/qt/rddbjyhzxta/content/post_8524533.html)、[2024 白皮书](https://zfcj.gz.gov.cn/sjb/bmwj/content/post_9783013.html) | 平台与数据存在；尚未找到可直接复用到公开游戏的完整模型包与开放许可 |
| 官方规划图、街道构件图集与建筑总平面 | [下方规划图索引](#官方规划图与城市设计图集) | 2026-10-08 补充核查：优先用带日期、比例尺和明确范围的图校准空间尺度；规划批准状态与实际建成状态分别记录 |

Overture 的建筑主题使用 ODbL，其他主题与组成来源可能不同；具体引用以其[授权与署名页](https://docs.overturemaps.org/attribution/)为准。广州质量验收后再决定是否补入本项目，不能把“全球覆盖”当作本地逐栋精确。

## 官方规划图与城市设计图集

补充核查日期：2026-10-08。城市控规图用于道路红线、地块与用地关系；街道设计图集用于构件和公共空间尺度；逐栋建筑总平面、立面与剖面用于建筑精修。以下公开图纸可作为建模参考，未找到覆盖广州塔中心半径 5 km、包含全部竣工建筑施工图的统一公开图包。

| 图纸 | 官方／原始入口及版本 | 可参考内容 | 范围与限制 |
| --- | --- | --- | --- |
| 广东省第二人民医院琶洲院区平面图与楼层索引 | [官网平面图](https://www.gd2h.com/static/seygw/assets/img/plane.jpg)、[楼层分布](https://www.gd2h.com/site/column/144_1_20.html)；2026-10-08 实际浏览器核查 | 临街 7 号楼、中央 1／2 号楼和南侧 3 号楼关系；5／10／16／21 层索引 | 南朝上示意图，无比例尺与高度；结合卫星轮廓目视对应，估算边界与来源见[医院记录](guangdong-second-hospital.md) |
| 琶洲西区海洲路（阅江路—新港东路）控规修正通告附图 | [批准公告](https://www.haizhu.gov.cn/hzdt/tzgg/qttz/content/post_10402577.html)、[1 页 PDF](https://www.haizhu.gov.cn/attachment/7/7866/7866954/10402577.pdf)；2025-07-30 批准，2025-08-15 发布 | 现行／修正后规划对照、道路红线、AH040201／AH040274 等地块及绿地关系 | 已批准的局部控规修正，不是整个琶洲西区竣工道路图；与 2024-12 的征求意见图分别保存，以此批准版本为优先 |
| 琶洲西区地下空间及配套设施工程批后公布图 | [项目页面](https://ghzyj.gz.gov.cn/ywpd/cxgh/ghxkgsgb/phgbnew/gbt/content/post_9789771.html)、[盖章 PDF](https://ghzyj.gz.gov.cn/attachment/7/7642/7642921/9789771.pdf)；2024-07-30 批准，2024-07-31 公布 | 总平面示意、海洲路与规划七／八路的关系、地下室轮廓、调整的出入口；有指北针及 0—30 m 图示比例尺 | 图纸附注明确仅示意本次调整的地下出入口，总平面与建筑立面以规划许可附图为准；不代表各总部建筑全套施工图或全部设施已经建成 |
| 广州街道工程建设全要素操作手册 | [政府网站 PDF，1.0 版](https://kgw.gz.gov.cn/attachment/7/7592/7592600/7008583.pdf) | 街道与城市家具的设计参考；已核查第 4.5.3 节“路灯杆”（印刷页码 72）的灯杆类型、功能分布与高度示意 | 官方 PDF 约 34 MB；本轮通过搜索索引核查标题及该节，浏览器未完整显示全文。不能将历史图集引用的旧标准当作 2026 年现行规范；也不能把通用构件图当作某条街道的实测断面 |
| 唯品会总部总平面图 | [gmp 原始 Siteplan 1:1500](https://www.gmp.de/images/gmp_3238_3238_201120_Siteplan_1_1500.jpg?w=1600)、[项目发布](https://www.gmp.de/en/news/41/press/9244/modern-office-design-for-vip-com-gmp-completes-head-office-for-e-commerce-corporation-in-guangzhou)；2020-11-30 发布 | 高低双塔、L 形连接体、街道和相邻地块的布局关系 | 原始设计方公开图纸，用来校准建筑布局；不是可直接导入的 CAD／BIM，立面材料和竣工变化继续对照实景 |
| 唯品会各层平面与剖面 | [F01](https://www.gmp.de/images/gmp_3238_3238_201120_Floorplan_F01_1_1000.jpg?w=1600)、[F10](https://www.gmp.de/images/gmp_3238_3238_201120_Floorplan_F10_1_1000.jpg?w=1600)、[F21–24](https://www.gmp.de/images/gmp_3238_3238_201120_Floorplan_F21_F24_1_1000.jpg?w=1600)、[D-D](https://www.gmp.de/images/gmp_3238_3238_201120_Section_DD_1_1000.jpg?w=1600)；同一 gmp 项目发布中的 Plans 图集 | 三个落地体块、第四层退进、跨街连接和屋顶设施 | 已用于首批结构校准；图纸与底图配准尺度约差 9%，标高未取得数字标注，精度限制见[校准记录](pazhou-internet-headquarters.md#2026-10-08首批图纸校准唯品会) |

逐栋图纸继续从[规划许可批后公布图](https://ghzyj.gz.gov.cn/ywpd/cxgh/ghxkgsgb/phgbnew/gbt/index.html)及建设工程规划条件核实栏目按项目名、地块编号查询。已找到的 [TCL 许可证](https://ghzyj.gz.gov.cn/ywpd/cxgh/ghxkgsgb/phgbnew/gcghxkz/content/mpost_7660916.html)列有建筑施工图附件和 38／26 层信息，但公开页面未提供该施工图的直接下载链接，不能记成已取得完整立面／剖面图。

建模时先按指北针、比例尺和多个已知路口将图纸与 WGS84 底图配准，记录误差；图纸未声明坐标系时保留“未说明”。控规确定的红线、限高或设计意图与实测建筑尺寸分开保存，再用近期实景、竣工资料核对。当前入口以 PDF／图片为主，不具备直接生成精确三维建筑的条件。唯品会首层轮廓、跨街结构和屋顶设施已开始按图纸校准；两个塔楼锚点用于相似配准，不能当作已完成多路口测绘配准。城市道路红线与路网尚未按新增规划图改写。

## 高德、腾讯的使用方式

在提供相应覆盖的官方客户端中观察卫星影像、街景和地点入口；需要在应用中显示影像时，使用平台当前官方 SDK 与相应授权。卫星/街景影像导出、批量缓存或做游戏贴图并未因此获得开放数据许可。高德[服务协议](https://lbs.amap.com/pages/terms/)明确约束数据提取与内容复用；腾讯[服务协议入口](https://ugc.map.qq.com/AppBox/Landlord/serveagreement.html)本轮抓取返回 502，接入前应从客户端或控制台核查适用版本。

游戏底座保持 WGS84，再投影为本地米制坐标。高德坐标使用 GCJ-02，转换可查[官方坐标转换说明](https://lbs.amap.com/api/javascript-api-v2/guide/transform/convertfrom)。腾讯接入同样要按所选接口声明记录坐标系；不得把商业地图坐标直接写入 WGS84 JSON。任何坐标对照都保留原值、坐标系和转换方式。自行测量、拍摄及开放授权资料用于模型生产；商业影像观察记录单独存放，不覆盖原始 OSM 提取数据。

## 已核查的底座数据文件

| 文件 | 范围 | 数据时间 |
| --- | --- | --- |
| `apps/dayun-kicker/public/maps/kecun.json` | TIT、客村、赤岗 | OSM 基准时间 2026-10-06T20:58:23Z |
| `apps/dayun-kicker/public/maps/riverside.json` | 广州塔、海心桥、广州大桥、珠江两岸局部 | 路网 2026-06-01T08:52:28Z；水域 2026-05-31T22:37:44Z |
| `apps/dayun-kicker/public/maps/pazhou.json` | 琶洲医院、腾讯、欢聚、阿里、小米、唯品会、国美、TCL 轮廓及通勤路段 | 路网 / 水域 2026-10-06T16:44:36Z |
| `apps/dayun-kicker/public/maps/liying.json` | 丽影广场、丽影华庭楼栋与场地补丁；不覆盖路网 | OSM 抓取 2026-10-07T10:44:47.160Z；各要素版本与编辑时间在 `source.elements` |
| `apps/dayun-kicker/public/maps/district-infill.json` | 现有开放范围 `[113.3025, 23.094, 113.349, 23.1185]` 内的缺失道路、建筑、公园与完整水域 | 最后采集 2026-10-09T15:47:12.562Z；保留的道路／建筑／公园 way 最近编辑 2026-10-02T10:37:51Z，节点可单独更新 |

时间是数据提取元信息，不能代表每栋建筑都在该日重新测绘。后续优先刷新较旧的滨江提取，并对桥头接续、通道净宽与建筑冲突做回归。

## 广州塔 5 km 空间范围

- 广州塔模型中心：现有 OSM 建筑轮廓均值，约 WGS84 `113.3191314, 23.1090007`；运行时从同一轮廓计算，避免与模型分离。
- 半径：5,000 m，直径 10,000 m，面积约 78.54 km²；活动范围按与广州塔中心的直线距离校验。
- 候选下载包围盒：WGS84 `[113.270301, 23.064085, 113.367962, 23.153916]`，东西与南北各约 10 km；按项目本地米制投影反算，导入后仍以同一广州塔模型中心、半径 5 km 的圆形 AOI 裁剪，包围盒四角不属于活动范围。
- 扩建前精细内容集中在客村、滨江、琶洲，旧提取矩形边缘曾限制骑行。本次已接入 Geofabrik 快照的 5 km 地面道路、建筑轮廓和完整组装水域，地图按钮展示实际接入内容与目标圆；普通新增建筑仍为简化体块，不能按范围面积推断逐栋完整。
- 本次运行时范围已扩到广州塔半径 5 km，骑行与游览保留圆形边界保护，新道路中心线在 4,975 m 内裁剪以留宽度余量；南、西外圈已按源共享节点补入三座短桥，修正四方向探针连接；[桥梁来源、游戏近似高度及仍缺内容](canton-connectivity.md)。其他新高架/隧道及不可靠建筑体量未强行接入。范围可到达不等于每条道路均从起点连续可骑，也不等于完整街景。

后续快速抽样建筑可使用 Overture 官方客户端，先检查版本与署名条件，再下载包围盒：

```sh
overturemaps download \
  --bbox=113.270301,23.064085,113.367962,23.153916 \
  -f geojson --type=building -o guangzhou-tower-radius-5km-buildings.geojson
```

## 新资料记录模板

每批资料放在同一索引下，填写：来源名 / 官方链接 / 版本或采集日期 / 获取日期 / 覆盖范围 / 原始坐标系 / 许可和署名 / 可用字段 / 缺失字段 / 原始文件 SHA-256 / 导入脚本 / 对应街区或地标 / 抽样验收结果。照片另记拍摄地点、方向、作者、拍摄日期和可引用条件。

普通建筑至少抽查轮廓与道路交叠、重复建筑和水域侵入；地标核对位置、朝向、尺度、入口及立面。估计楼高、推断材质与未建片区保持显式标记，优先保证实际可骑行道路连通。

分区扩建、真实天气接入和可破坏物品见[待办](roadmap.md#guangzhou-exploration)。

## 地铁入口与站点线路

首期五站与17个出入口使用可追溯的 OSM 节点坐标，站点归属与近期换乘信息结合政府及运营方公开资料核对。代码数据、入口模型替换规则、资料日期与许可、近似范围见 [广州地铁资料](guangzhou-metro.md)。当前提供地图内线路子图，入口形制及站厅均为简化程序模型；源码中公开坐标的精度不代表实测精度。

## 2026-10-10 广州塔 5 km 数据扩建

已固定 Geofabrik 2026-10-09 广东 OSM 提取，补入 7,905 个地面路段、7,066 个简单建筑轮廓，并组装 141 个水域多边形，保留原地标与桥梁。新增建筑采用实际渲染/碰撞空间窗口；数据按 COS 清单分发。范围、未纳入的高架/建筑部件、许可证、哈希、坐标转换、复现和验收边界见[扩建记录](canton-five-kilometre-data.md)。这是 OSM 社区数据，不是政府完整测绘或逐栋高保真。
