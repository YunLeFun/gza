# Roadmap

## GZA：暴力电驴 · GuangZhou Action

The first release is **GZA：暴力电驴**. **GZA** stands for **GuangZhou Action（广州行动）**, with **暴力电驴** as the first release subtitle. Classic scooter modes and city exploration share this brand. See [the direction and acceptance criteria](gza-direction.md).

- [ ] Connect rider registration, NPC task interaction, delivery, rewards and garage equipment into one complete Kecun–Canton Tower–Pazhou mission loop.
- [ ] Persist mission progress and settle rewards once; validate restart, retry, dismounting, mode switching, touch and gamepad controls.
- [ ] Deepen the existing districts with distinct tasks, shops and characters after the current whole-frame and mobile budgets pass.
- [ ] Complete reproducible map imports and bounded cell streaming before expanding the playable area.
- [x] Unify app display names and launch / game-center branding as GZA：暴力电驴, preserving app identifiers, saves and purchased entitlements.

## AI 自定义玩法（后续设计） {#ai-gameplay}

[玩法包、MCP 与 Skills 设计草案](ai-gameplay.md)已于 2026-10-13 整理；以下均为待实现能力，在现有城市任务体验与性能门禁完成后分阶段推进，不承诺发布日期。

- [ ] P0：冻结 `dayun-gameplay` 玩法包 schema、地图 / 规则依赖、能力目录、预算、校验与错误契约；准备配送、探索和分支对白模板。
- [ ] P1：实现统一校验、本地导入、受控任务执行和隔离存档；验收十分钟任务、两个结局、失败重试、恢复与离线游玩，不写官方奖励或成绩。
- [ ] P2：提供 MCP 能力 / 地点查询、草稿版本管理、校验、独立试玩、结果读取和导出；发布创作 Skill，验收“一句话创作 → 试玩 → 自然语言修改 → 再试玩 → 导出”闭环。
- [ ] P3：增加固定版本分享与合作试玩，匹配玩法包 / 地图 / 宿主规则 hash 和种子，验收更新失败回退与权威端一致性；再开放受控救援 / 战斗模板。
- [ ] P4：探索实时 AI 导演与 NPC，限制为离散事件后的动作提案，验收费用控制、超时 / 断线兜底、过期回复拒绝及读档不重复执行。

执行细分见 [AI 可执行待办计划](ai-gameplay.md#implementation-backlog)：A0 冻结当前门禁，A1–A2 先交付无界面的能力快照与纯校验器，A3–A5 才接离线宿主，A6–A8 完成 MCP / Skill 闭环。每项必须有测试与证据才能勾选；文档细化不等于功能实现。

玩法包依赖固定地图，与[城市地图包和 Workshop](desktop-steam.md#创意工坊-城市地图包)分开管理。生成内容复用同一宿主契约；MCP 提供创作工具，Skills 提供创作流程，实时模型不是离线游玩的必要依赖。

## Desktop and Steam

- [x] Share standard gamepad driving, camera, actions and menu navigation across races and free ride.
- [x] Add persisted render resolution / FPS caps, Alt+Enter fullscreen and window-blur pause.
- [ ] Validate physical controllers and Windows / Steam Deck builds; add native Steam Input and controller rumble where useful.
- [x] Package offline local assets in Electron with sandboxed IPC, native fullscreen and per-user file saves.
- [x] Build Web and desktop renderers into separate outputs, enforce their own existing budgets, and reject an incorrect renderer profile in client builds and packages.
- [x] Add a lightweight client download page and Web menu entry, preserving keyboard, touch and controller navigation. The verified macOS arm64 preview is public on COS; the website still needs deployment.
- [ ] Define the Web trial's playable scope, then exclude full-city modules and resources at build time while adapting routes, activities and existing saves. See [distribution boundaries](distribution.md).
- [x] Automate native installer verification, COS upload and version catalog updates; publish the verified macOS arm64 preview with a permanent public URL and SHA-256. See [release workflow](desktop-release.md).
- [x] Sign the macOS arm64 preview with Developer ID, obtain and staple Apple notarization, validate Gatekeeper and publish the verified archive; document the separate [Mac App Store path](macos-distribution.md).
- [ ] Run native Windows / Linux release acceptance, configure CI publishing secrets / available Actions budget, and deploy the download page.
- [x] Add optional Steam identity, Overlay, RemoteStorage cloud saves and Workshop subscription / download adapters.
- [x] Split settings into fixed Graphics / Audio / Controls / General tabs with keyboard and controller navigation.
- [ ] Validate Steam SDK behavior with the formal App ID and adapt backend authentication / online services.
- [ ] Generalize Guangzhou-specific scenery and destinations into city profiles.
- [ ] Define and validate city packages, then add local imports and city switching before Workshop subscription / publishing.
- [ ] Integrate Steam Workshop downloads, installed-content discovery and author updates.

See [desktop and city-map implementation plan](desktop-steam.md) for current behavior and the proposed package format.

## Cooperative Zombie Escape

- [x] Implement the independent two-seat zombie escape mode with shared authoritative rules, Steam friend rooms and development WebSocket rooms.
- [x] Deploy Play cooperation rooms and CloudBase ticket issuance; validate two dedicated production test clients creating/joining, starting, shooting, reloading and releasing the room. See [the 2026-10-09 release evidence](releases/2026-10-09-coop.md).
- [ ] Validate the deployed webpage with real player sessions, measure production RTT / bandwidth / load, and complete formal Steam App ID, cross-network and physical-device acceptance. Backend smoke and local GPU tests do not complete these checks; see [the implementation plan](two-seat-zombie-coop-plan.md).

## 僵尸生存与局内成长（后续设计） {#zombie-survival}

[吸血鬼猎人式僵尸生存设计](zombie-survival.md)已于 2026-10-13 整理；以下均待实现。作为城市僵尸突围的生存规则变体，先验证单人，再扩展合作与 AI 战斗模板，不承诺发布日期。

- [ ] S0：确定一个街区、十分钟、三种基础武器和六种升级的原型规则，明确经验、三选一、组合上限和骑行／步行／后座职责。
- [ ] S1：验收单人生存循环：骑行找物资 → 停车清路 → 补给升级 → 救人 → 集合撤离；验证五次选择机会、至少两种有效组合、失败重试与退出恢复街区。
- [ ] S2：扩展共享经验、个人升级选择和全队补给阶段，验收双座分工、倒地救援、选择超时／成员退出、键鼠／触屏／手柄与真实联机。
- [ ] S3：按预算逐项扩展敌人组合、自动辅助装备和任务变体，保留遮挡、冷却、姿态限制，完成手机可读性、整帧性能与发布验收。
- [ ] S4：在原生玩法验证后开放受控波次、升级池、路线和撤离条件，接入 AI 玩法包 P3 的战斗模板；不扩大第一版 AI 内容范围。

局内升级在结束或重开时清除，不写官方经济或探索背包。司机负责转移和停车，后座负责枪械掩护，步行负责清路、搜刮与救援；新增规则不代表既有合作房或生产服务已升级。

## Prototype

- [x] First-person scooter camera
- [x] Procedural road and city props
- [x] Truck traffic
- [x] Bidirectional lanes and signalized intersections
- [x] Left and right kick input
- [x] Exaggerated kick impact feedback
- [x] Desktop and mobile controls

## Next

- [x] Start menu polish
- [x] Combo scoring rules
- [x] More truck variants
- [x] Near-miss score and risk boost
- [x] Checkpoint sectors and split times
- [x] Simple stage timer
- [x] Per-run statistics and idempotent run records
- [x] Purchase confirmation with server-authoritative pricing
- [x] Audio mix controls and engine-noise pass
- [x] Background music loop
- [x] Music mode beatmap prototype
- [x] EdgeOne Pages deployment guide

## Later

- [x] Leaderboard API
- [x] Cloud coin scooter skin shop
- [x] YunLeFun game center card and install metadata
- [x] Save best score locally
- [x] Replayable challenge modes
- [x] Shared game SDK extraction

## Racing Direction

Borrow the readable race structure of arcade kart games without copying a drift-first handling model:

1. [x] Add checkpoint sectors and split times to the existing 90-second run.
2. [x] Retire personal-best and asynchronous ghost replays after introducing real-time multiplayer; preserve scoreboards and live online opponents.
3. [x] Reward near misses, clean sectors, and successful kicks with short boosts.
4. [x] Add route branches and truck interference as the game's own overtaking mechanic.
5. Live races now use Play-authoritative 60 Hz simulation with latency-tolerant soft collisions, scoped tickets, and repeated-ram penalties.

The current circuit and seeded routes support two laps, ordered checkpoints, drifting, item boxes and a full-course minimap. Item racing is still a solo run; traffic vehicles do not compete for race positions.

## Experience Polish

- [x] Align sunlight and moonlight with their visible sky positions.
- [x] Stabilize the moving shadow region in light space, including curved and seeded routes.
- [x] Improve dusk/night road readability, warm streetlight pools and the scooter beam.
- [x] Batch vehicle contact shadows and fade them as kicked vehicles lift off.
- [x] Cache procedural HDR environment reflections for paint and metal across day, dusk and night.
- [x] Add world-anchored asphalt normal/roughness detail and soften vehicle edges and distant hills.
- [x] Add shared cloud and celestial halo layers plus a single HDR presentation pass with a direct-render fallback.
- [ ] Add a few AI racers with overtaking, race positions and fair item interactions.
- [ ] Add a timed start, finish celebration and clear reward feedback for clean driving.
- [x] Author the fixed Yun Harbor Circuit with four districts, repeatable landmarks and a consistent vehicle / streetscape palette.
- [ ] Add further circuits with distinct settings and matching seeded scenery.
- [ ] Replace repeated primitive silhouettes with authored hero vehicles, varied buildings and consistent material detail.
- [ ] Validate steering, braking, kicking and sustained rendering on physical Android and iPhone devices.

## Guangzhou Exploration

- [x] Record reusable map, imagery and model references, coordinates, timestamps and attribution in [the source index](map-data-sources.md).
- [x] Define the initial area as a circle with a 5 km radius around Canton Tower, approximately 78.5 km²; add physics boundaries at the available map edges, radial position guards, a scope overview and construction fences labelled “小云重工 施工中...”.
- [x] Add sightseeing cameras and six modelled landmark viewpoints; preserve riding, delivery and tower-visit state when switching modes.
- [x] Add a 24-hour clock, optional day/night cycle and clear, cloudy, rain and fog presentation with mobile and reduced-motion support.
- [ ] Extend the actual roads, building footprints and water coverage throughout the 5 km radius circle in batches; keep unbuilt areas explicit behind construction fences. Refresh older riverside data first.
- [x] Refresh the initial Canton Tower / Yizhou / Binjiang ground-road window from current OSM: add 35 roads and nine footprints, update shared junctions, distinguish pedestrian paving and one-way lane paint, preserve plaza-furniture collision and correct the Haixin south landing. See [the centre update](canton-tower-center.md).
- [ ] Build a reproducible AOI import with preserved road node IDs, bridge layers, source metadata and OSM/Overture building deduplication. Sample Guangzhou coverage before choosing replacement data.
- [ ] Stream roughly 1 km cells with local detail, distant silhouettes, bounded caches and nearby prefetch; measure mobile memory, GPU and cold-network startup before expanding loaded content.
- [ ] Refine landmarks and streets with public architectural references, licensed photos and observations from Gaode/Tencent imagery; validate coordinate conversions and product access for any SDK integration.
- [x] Correct the Tencent river-facing middle using the supplied frontal photos: remove the exterior stair tubes and their platform holes; reconstruct inclined curtain walls with wider, outward upper edges and narrower, recessed lower edges in an open canyon while retaining the entrance and cross-street escalators. See [the screenshot review](pazhou-district.md#腾讯游览截图的辨识与限制).
- [x] Add photo-referenced Tencent night lighting: irregular blue/cyan soffit stars, cyan terrace and roof edges, and warm-white window and entrance strips; reuse batched emissive materials across day, dusk and night.
- [ ] Further calibrate Tencent's platform heights, cantilever depths, canyon angle and village pavilions against same-facing as-built photos; retain mapped footprints and separate photo estimates from measured dimensions.
- [x] Reconstruct the adjacent Alibaba South China Operations Center from original architectural photos: 207 m south tower, 57.5 m north block, alternating folded corners, vertical fins, planted podiums and a street-spanning link; add a tour stop and [reference index](alibaba-south-china.md).
- [ ] Calibrate Alibaba's notch levels, podium proportions and link location with additional same-facing photos or licensed measured drawings; refine atrium structure and roof-garden planting without changing mapped footprints.
- [x] Cull offscreen parts and invisible faces inside generic building-detail and Canton Tower silhouette batches, retaining authored geometry, per-camera shadows / reflections and destruction recovery. The 2026-10-09 same-view complete-frame triangle peaks fell by 17%–31%; TIT west gate and Liyuan desktop / phone budget regressions now pass. See [the implementation and bounded acceptance](rendering-performance.md#2026-10-09-静态合批可见面剔除).
- [x] Reduce remaining street and Pazhou capture-frame draw submissions below the existing `<300 calls / <90,000 triangles` whole-frame limits. Final 2026-10-09 GPU budget regressions pass all 18 street view / lighting / repeat samples and all 14 headquarters day/night views, sampling every frame for 800 ms to include water captures. Cross-cell batches preserve original cell visibility, water layers and destruction; camera selection retains authored geometry. The earlier 301-call street and 347-call / 95,152-triangle Tencent failures remain historical measurements. See [the final implementation and verification](rendering-performance.md#2026-10-09-跨格合批与冷启动复测).
- [x] Before the surrounding-headquarters expansion, pass the Tencent entrance, cross-street and river-front day/night riding regression below the existing 300-call / 90k-triangle whole-frame budget, including water captures, shadows and cockpit rendering; batch emissive strips with existing metal fixtures and verify warmed resource reuse.
- [x] Replace nine mapped Xiaomi, Vipshop, Gome and TCL building objects with reference-based envelopes, slats, gardens and night accents; add four sightseeing stops and [per-building sources and accuracy](pazhou-internet-headquarters.md).
- [x] Refine the seven Pazhou headquarters' glass palettes, metre-aligned window grids, neutral metal ribs and clustered office lights; add continuous warm Vipshop strips and TCL front/roof ribs. Keep photo-derived estimates and measured dimensions distinct in [the facade record](building-glazing.md#2026-10-08-琶洲总部材质更新).
- [x] Start drawing-based reconstruction with Vipshop's F01/F10/F21–24 and D-D references: three occupied ground blocks, a fourth-level incision, open cross-street spans, shared collision/paving and traced roof pool/court. Record the two-anchor registration and its approximately 9% scale disagreement in [the reconstruction record](pazhou-internet-headquarters.md).
- [ ] Resolve Vipshop's drawing/OSM scale disagreement with independently verified control points or licensed survey/as-built coordinates; calibrate floor elevations, tower side recesses, column grid, riverside stairs and roof service rooms before claiming 1:1 accuracy. Keep the planning street layout separate from verified current roads.
- [ ] Obtain TCL's measured west-tower height and confirmed east/west A/B correspondence; the operator now verifies 185 m project height and 4.5 m standard floors. Calibrate podium, recess and canopy levels with as-built elevations.
- [ ] Match verified footprints and current as-built references for iFlytek, 37 Interactive Entertainment, Sany RootCloud and the actual ByteDance/UC office buildings before adding them; keep planning schemes distinct from completed buildings.
- [x] Pass the current Web packaging budget: 20 MiB total resources and 350 KiB gzip per startup entry, approved on 2026-10-08 and verified in [the 2026-10-09 release checks](releases/2026-10-09-coop.md). The earlier isolated headquarters build of 12,011.8 KiB failed the historical 11.25 MiB cap; that result remains a historical measurement, not an unresolved failure against the current [budget configuration](https://github.com/YunLeFun/dayun-kicker/blob/main/scripts/performance-budgets.mjs).
- [ ] Reduce district cold startup to the existing 15-second mobile / Fast 3G / 4× CPU budget. Final 2026-10-09 ANGLE Metal samples measured 16,671–17,362 ms, against a 19,044 ms same-condition Git HEAD sample; the unmodified performance configuration used SwiftShader and measured 39,274 ms. Both conditions still exceed the real playable-frame budget. The earlier 21,230 / 19,593 ms release snapshot remains historical; loading marks, packaging acceptance and isolated indexing gains do not complete this check. See [the repeated measurements](rendering-performance.md#2026-10-09-跨格合批与冷启动复测).
- [ ] Add further distinctive viewpoints and tour routes within the circle after their locations and local model coverage are verified.
- [x] Implement PANZER projectile destruction for identified bridge-rail sections and roadside signs, signals, lamps, benches and trees: hit-count health, intact/broken state, matching model / distant / water-capture updates, collider removal and bounded short-lived debris. Geographic construction fences, bridge decks and shore retaining walls remain protected. See [the implementation and recorded regression checks](district-free-ride.md#坦克炮击与场景破坏2026-10-07).
- [x] Keep PANZER damage temporary within the live session: graphics-context recovery retains damage; reload, location / vehicle reset and save restoration rebuild intact props. Broken-state data is excluded from district saves; damage and view reset paths restore collision and appearance.
- [ ] Add riding-impact thresholds and destructible roadside fences / bollards; the existing prototype is triggered by PANZER projectiles, not scooter collisions.
- [ ] Validate riding collision, camera, route connectivity and safe bridge / shore traversal after rail destruction, plus complete-scene performance before expanding destruction. Existing projectile, local collider-gap and reset checks do not constitute comprehensive traversal or physical-device acceptance; longer-lived repairs or persistent damage remain future design work.
- [ ] Consider real weather data, stronger weather variations and balanced wet-road handling; keep presentation weather usable offline.
- [ ] Consider areas outside the initial circle after the content and mobile budgets pass for the first 78.5 km².
