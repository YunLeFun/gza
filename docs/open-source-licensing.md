# 开源许可与完整游戏迁移方案

源码 Apache-2.0、文档 CC BY 4.0 的组合已确认并在 gza 的明确范围内生效。完整游戏、剧情、品牌与其余素材仍按下文逐项处理；当前范围以[许可证](licensing.md)为准。

## 推荐组合

| 内容 | 建议 / 既有许可 | 范围与处理 |
| --- | --- | --- |
| 项目原创源码、测试、构建脚本与配置 | Apache-2.0（已确认） | 明确排除下面列出的第三方代码、数据与独立创作素材；允许修改、再分发和商用 |
| 原创开发说明与玩家手册 | CC BY 4.0（已确认） | 署名、链接许可并说明修改；图片、引用、剧情正文与第三方资料分别标注 |
| ADV.JS 固定快照及公开对应源码 | 现有 MPL-2.0 | `vendor/advjs/`、`apps/dayun-kicker/public/third-party/advjs-source/`；保留原许可、来源、修改记录与对应源码 |
| GameNetworkingSockets 公共头文件 | 现有 BSD-3-Clause | `packages/dayun-kicker-steam-sockets/native/vendor/`；保留 Valve 版权与许可全文 |
| OSM 派生数据库和地图数据 | 现有 ODbL-1.0 | `apps/dayun-kicker/public/maps/` 中的 OSM 派生 JSON、COS 的 `canton-5km` 数据及相应来源记录；保留署名与数据库共享要求 |
| 三首外部背景音乐 | 现有 CC0-1.0 | 原作者与来源见下文；保留来源与转码、循环处理记录，不改成项目源码许可 |
| 官方图标、分享卡片、独立美术与剧情正文 | 建议单独保留权利 | 先确认权属，再明确授予本项目原版构建、运行与分发所需权限；不自动授予独立提取、换牌或其他游戏复用权限 |
| YunLeFun、GZA、暴力电驴的名称与标识 | 品牌政策，单独确认 | 不把源码许可解释为官方身份、商标或背书许可；允许如实说明来源，衍生发行使用自己的名称与图标 |

[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)包含专利许可及相关终止条款，第 6 节不授予通常的商标使用权；[MIT](https://choosealicense.com/licenses/mit/)可以作为更简短的宽松许可备选。建议采用 Apache-2.0，方便明确专利和品牌边界。两者都允许他人商业复用源码；如果希望禁止商业复用，就需要重新选择目标，不能在标准开源许可证上增加“禁止商用”再称为开源。[开放源代码定义](https://opensource.org/osd)

文档建议采用 [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)，避免将图文授权混入软件许可。ADV.JS 的 MPL 是文件层面的要求，不能用新增根许可替换；发布时继续提供修改过的 MPL 文件对应源码。[Mozilla FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/)

## 素材与地图核对

当前 `assets/media-manifest.json` 固定 33 个资源，仅记录路径、字节数、SHA-256 与 URL；本次新增的 [素材许可索引](https://github.com/YunLeFun/dayun-kicker/blob/main/assets/asset-license-inventory.json)逐项对应其路径与校验值，不改变现有资源恢复协议或发布版本。该索引记录核对状态与建议，不授予新的素材权利。

三首音乐的作者发布页面在 2026-10-11 均显示 CC0：

- `city-loop.mp3`：wipics，[City Loop](https://opengameart.org/content/city-loop-0)。
- `turbo-160.mp3`：RUOK，[160BPM Electronic Loop](https://opengameart.org/content/160bpm-electronic-loop)。
- `neon-wave.mp3`：hatmix，[Lost in the Snow Wave](https://opengameart.org/content/lost-in-the-snow-wave)，使用 lower bass-lead mix。

作者、来源和现有转码 / 循环修改说明保留在 [音频说明](https://github.com/YunLeFun/dayun-kicker/blob/main/apps/dayun-kicker/public/audio/README.md)。本次核实了发布页面与本地资源校验，没有声称重新取得未经处理的原始音频并完成逐字节比对。

OSM 数据依据 [OSM 版权说明](https://www.openstreetmap.org/copyright)保留 ODbL。地图导入代码可以采用源码许可，输入和派生数据库仍按数据许可处理；在 TypeScript 中内嵌的 OSM 节点、坐标和站序同样要标明数据来源，不能因为换了文件扩展名就全部改成 Apache-2.0。参见 [地图来源](map-data-sources.md)、[地铁数据](guangzhou-metro.md)与 [5 km 扩建](canton-five-kilometre-data.md)。

24 个图像 / 图标文件尚无完整的对外许可：其中 20 个 v2 图标或平台导出有生成与加工记录，3 个旧图标缺少足够的原始来源记录，1 张分享卡片有游戏首屏用途说明，但仍需确认所含素材的权利。生成工具记录不能自动证明排他著作权或替他人授予权利；由权利人确认许可范围后再标记为可分发。

私人街景原片仅用于观察，未随游戏分发。照片原片、私人图库和授权凭据在仓库外保管，公开记录使用 [参考编号](street-photo-references.md)。商业地图影像、建筑师照片、外部品牌标识与公示图纸不因可浏览而获得再分发许可。

## 源码与创作内容的具体边界

原创程序模型、材质生成器和运行时合成音效属于源码许可范围。若将这些源码按 Apache-2.0 公开，不能再用“素材保留权利”笼统禁止依许可修改、运行和分发这些代码。需要单独保留的可分离模型数据、插画、独立 SVG 展示图、剧情台词和配方，应逐路径列出。

当前剧情正文包括 `apps/dayun-kicker/src/district/story/*.adv.md` 及其编译的 `*.program.json`；剧情运行器按源码许可处理，台词和故事内容建议另行确认。`docs/public/vehicle-models/`、`docs/public/scooter-skins/` 的生成 SVG 也应明确选择随模型源码开放，还是作为单独素材授权，不能依扩展名默认处理。

完整游戏使用“开源代码与分别授权的素材”这一描述。若官方素材仅允许原版分发，第三方 fork 的分发可能需要替换图标、剧情或其他保留内容；公开前应明确是否提供替代素材或可直接合法构建的社区版本。COS 匿名下载只说明文件可取得，不提供额外授权。

## 品牌政策草案

确认后建议写入 `BRANDING.md`：

> 源码许可不授予 YunLeFun、GZA、暴力电驴的名称、官方图标、域名或其他标识的商标许可。可以为说明来源而如实提及项目名称；不得暗示由官方发布或获得官方背书。衍生发行应使用自己的显示名和图标，保留需要的版权与许可通知。仅在获得权利人授权的范围内使用官方品牌素材。

这是拟议政策，不代表这些名称已经注册商标，也不宣称项目拥有现实街区中出现的第三方标识。Apache-2.0 的品牌条款不能代替图标版权许可；两者需要分别说明。

## 实施清单

1. 确认原创代码与文档的实际权利人，以及外部贡献的授权；清理历史后保留贡献署名。
2. 确认 Apache-2.0 或 MIT 选择，以及文档、剧情和展示图的授权范围，再添加根 `LICENSE`、必要的 `NOTICE`、`BRANDING.md` 和素材许可文件；标准许可正文保持完整。
3. 将自有包中缺失或 `UNLICENSED` 的许可字段更新为确认结果，保持 `private: true` 防止 npm 误发布；ADV.JS 字段仍为 MPL-2.0。
4. 补齐 24 个图标 / 图片的权属与分发范围；为未来新增媒体记录作者、来源、许可、生成或修改说明，并与固定 SHA-256 对齐。
5. 核对发布产物中的 Electron、steamworks.js、CloudBase 和其他依赖通知。已安装 steamworks.js 包许可为 MIT；其附带 Valve Steamworks 运行库的分发条件需按适用 SDK 条款单独核对，不能用包装层的 MIT 代替。[Steamworks SDK](https://partner.steamgames.com/doc/sdk)
6. 确认本地 lodash 兼容替代包的源码归属，再标注许可；不要仅因包名为 lodash 就推定代码直接来自 lodash。复核网页、桌面安装包和文档的实际署名入口。

开源授权应在上述范围明确后一次性写入。gza 已落实文档、展示程序与构建工具的许可；完整游戏迁移继续按剩余清单核对。
