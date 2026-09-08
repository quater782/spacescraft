# 系统架构

2026-09-06 更新：新增 `src/research.js` 管理三条收益路线、六种三阶蓝图、发现/购买、研究余量与首奖标记清洗；`game.js` 在出航快照效果、在各玩法事件执行效果，并在结算写回 v6 profile。研究使用独立整数混合 RNG，不消费既有五条流。当前每章四次章中构筑、全局十四次；默认合约移除成功动量加压，第三章为 21 秒高压/15.4 秒释放。具体新规则与存档字段见[可恢复远征](./PROGRESSION.md)，下文未更新的时间线描述属于 0.27.0 初始架构基线。

## 运行时分层

| 层 | 主要文件 | 责任 |
| --- | --- | --- |
| 产品外壳 | `index.html`, `style.css` | 菜单、设置、机库、构筑、结果页、响应式布局与可访问语义 |
| 游戏模拟 | `src/game.js` | 60 Hz 固定步世界、输入、AI、刷怪、Boss、碰撞、经济、局内构筑和 HUD |
| 构筑规则 | `src/roguelike.js` | 22 项四流派升级、首两次路径覆盖、专精/补强候选、稀有/传说保底、满级过滤与玩家效果 |
| 遗物协议 | `src/relics.js` | 7 个两件套配对、全部已完成协议共存、两次构筑内的确定性配套候选与自动协同倍率 |
| 状态模块 | `src/status.js` | 4 种拾取 Buff、3 种敌方 Debuff、计时器目录与自动战斗倍率 |
| 长期成长 | `src/constellation.js` | 9 项恒星天赋、三分支前置依赖、存档清洗、购买判定与玩家效果汇总 |
| 反应堆/狂潮 | `src/rush.js` | 120 能量共享 Nova、局部清弹/伤害半径、14 秒冷却，以及 6 秒狂潮、9 秒冷却、卡牌充能源与战斗倍率 |
| 随机分流 | `src/rng.js` | 从航行种子派生战斗、构筑、掉落、航线和表现五条互不消耗的可复现 RNG 流 |
| 掉落调度 | `src/loot.js` | 普通击破累积预算、重型敌人加成、四类洗牌袋和最长旱期约束 |
| 碰撞语义 | `src/collision.js` | 彗星/壁垒/脉冲的受弹、机体和拾取半径，以及弹体/爆破/机体/拾取各自的圆形相交判定 |
| 远征导演 | `src/director.js` | 30 分钟章节时长、九战区、事件/遭遇/构筑阈值、强度曲线与 QA 时间倍率 |
| 威胁导演 | `src/threat.js` | 五级动态压力配置、评分、保护包络、迟滞步进与合约压力映射 |
| 战斗学说 | `src/combat.js` | 三套章别节拍轮廓、四段压力波、七职责状态机、六编队、21 种弹幕选择、常规精英概率、持续追猎和普通敌弹预算 |
| 星域异象 | `src/anomalies.js` | 九种确定性战区异象、章节安全池、玩家力场、敌我非对称弹道和经济/音乐倍率 |
| 远征规则 | `src/expedition.js` | 9 种生态、7 种星门协议、5 类动态遭遇、确定性计划/判定、16 个船体与推进/武器/核心/AI/载荷六维组装 |
| 3D 渲染 | `src/renderer3d.js` | Three.js WebGL2 透视相机、原生分辨率 + SMAA、0.12 粗体素、按颜色缓存的 `BoxGeometry` 实例批次、三阶 Toon/轻辉光/HDR 能量层、五级选择性 Bloom、人类风筝战机构造器、独立虚空生物构造器、开放深空生态与局部异象 |
| 本地化 | `src/i18n.js` | `zh`/`en` 目录、变量插值、DOM/元数据/ARIA 同步 |
| 音频 | `AudioEngine` in `src/game.js` | Web Audio 多轨 8-bit 音序、分层 SFX、音量与静音 |
| 桌面壳 | `electron/main.cjs` | 最小权限 BrowserWindow 与应用生命周期 |
| 发行 | `forge.config.cjs`, `.github/workflows/build-windows.yml` | ASAR、桌面图标、Windows 打包和 CI 产物 |

## 一帧的数据流

浏览器输入与手柄状态先进入 `InputManager`；`requestAnimationFrame` 只累计真实时间，世界以 `STEP = 1 / 60` 重复更新。模拟更新玩家/AI、敌人、Boss、弹体、拾取、碰撞、关卡和局内构筑，然后同一世界快照分别交给 WebGL 场景、透明 Canvas HUD、DOM 状态与 Web Audio 反馈。这样显示刷新率不会改变玩法速度。

战役开始时，机体、模组、合约、恒星天赋、模式与设置从 profile 生成运行时玩家参数；永久天赋先按前置关系清洗，再统一叠加到双机和单人 AI 的同一套属性。`SpaceDirector` 把三章固定为 570/600/630 秒，并按相对进度生成每章三个战区、九个编队事件、四个遭遇和两个章中构筑；前两章 Boss 后再提供章间构筑，完整路线共有八次选择。`SpaceCombat` 在每个编队事件间循环突入、交锋、杀伤区和释放节拍，三章分别使用 24%/60%/82%、16%/43%/72%、12%/36%/84% 的边界和独立压力向量。`SpaceThreat` 再以 1.25 秒迟滞和单级步进将章节、战区、进度、合约、击破动量、共振、耐久、倒地和近期受击组合为 0–4 级压力；首章前 8%、残血和倒地保护会覆盖高压目标。

`SpaceRng` 从一枚 run seed 以五个稳定盐派生 `combat`、`draft`、`loot`、`route` 和 `cosmetic` 五条独立流。敌军模块/弹幕、三选一、掉落、生态/星门/遭遇路线与视觉/音色表现各自只消耗对应流，因此任一子系统的采样次数不会改写其他序列。16 种船体先定义角色、耐久、半径、得分、生态归属、死亡机能和主体轮廓，4 航行、7 武器、4 核心、6 AI 与 4 载荷形成 43,008 个唯一签名。敌机按职责执行入场、占位、预警、攻击和盘旋/重组六态循环，持续追踪玩家当前站位并在职责交战距离附近接近或后撤，存活单位不按轮数或寿命退场；激光束、恒速限角追踪弹、目标距离引信爆破种、敌我碰撞和九类死亡机能均在固定步模拟中改变耐久，死亡爆炸与爆裂核心先生成锚定半径预警再延迟结算，普通敌弹由 46–132 预算封顶。渲染器不把通用预警解释为牵引线：普通蓄力只显示局部器官，跨屏方向线仅用于即将生成实体伤害束的激光。

每次方向控制的共享构筑暂停战斗，确认后章中节点返回原战区，章间节点才推进下一章。`SpaceRoguelike` 在 22 张卡中构建武装、机动/生存、Nova 和狂潮四条路径：首两次构筑合计覆盖全部路径，后续候选同时保留已选核心路径和当前最弱路径；每两次至少一张稀有/传说，第 5–7 次选择窗口保底传说。遗物层让全部已完成的协议同时生效，拿到首组件后的配套件只在之后两次构筑内确定性出现一次。`SpaceLoot` 对普通击破累积 0.08–0.105 掉落预算，重型敌人额外 +0.1；实际掉落类型从武器、维修、护盾和能量四类洗牌袋中抽取，普通击破的最长旱期为 13 次。

双机的能量显示镜像同一个 `world.novaCharge`，120 能量满后只能释放一次共享 Nova；基线被动充能为 1.2/秒，有效命中每次 0.65 且全队基础预算 4.8/秒，释放后冷却 14 秒，只清除两机 76 半径内普通敌弹并伤害 96 半径内敌人，已生成激光与远弹保留。`novaPurifier` 才将净化扩到全屏，Nova 击破本身不会反向充能。星链狂潮独立使用 100 点星链槽；基线满槽后自动进入 6 秒机动爆发，结束后冷却 9 秒，只保留移速 ×1.12 与操控 ×1.18，射速、伤害、光链、牵引和得分均为 ×1。遭遇/救援/Boss 阶段提供 5/7/5 点基础事件能量；击破/精英/拾取充能、过驱输出和有限光链偏转由卡牌解锁。

`SpaceCollision` 让每架玩家机同时持有受弹核心、机体接触和拾取感应三类半径，敌弹/爆破、机体碰撞和拾取分别读取对应语义。默认受击无敌是 0.72 秒，相位升级后上限 0.94 秒。Three.js 渲染器只读世界快照；55° 透视相机、0.82 实战玩家模型比例与普通/精英/Boss 1.18/1.40/1.32 敌机比例各自独立，预警和敌方弹体不借用机体缩放。全部可见实体仍由共享 `BoxGeometry` 和按颜色缓存的动态 `InstancedMesh` 组合，只有能量器官进入 HDR 批次；`EffectComposer` 按 Render → Unreal Bloom → SMAA → Output 合成。表现只消耗 `cosmetic` 流，任务结束后只把长期生涯、星尘、解锁、天赋、合约与设置写回存档。

九个生态由正式 `drawSpaceEcology` 路径分别构造；每个分支采用“一个巨型远景身份 + 一组偏轴中景生态 + 两个稀疏远距航标”，宏观主体在左右与顶部安全区间交替，`drawDistantCelestial` 再把行星、彗核、碎月或云胞放到相对侧。三层全画幅星空和两层带运行时径向纹理的加色 3D 星云点云提供更慢的背景视差，中央 55% 战斗通道保持负空间。连续地板、导航网格、成对护栏、常驻战区门架和贯穿画面的光轨不参与正式场景，战区几何只在转场瞬间形成跃迁环；大型圆环、闪电、彗尾、胞膜和枝条使用连续分段曲线，不再排列成方点门。九种异象读取同一世界快照并表现为偏轴环、远景极光、短脉冲或稀疏晶体，禁止构成左右对称跑道。玩家普通弹使用低亮玩家色短矢，敌弹使用高饱和倒刺生物轮廓；特殊弹最多两节，低画质压缩为一节。命中粒子按速度拉伸。这些表现系统只读取模拟状态与渲染时间，不消耗玩法随机源。

## 清晰度与坐标空间

游戏模拟与 HUD 保持 480×270 逻辑坐标，确保碰撞、布局和像素节奏稳定。3D WebGL 与透明 HUD Canvas 各自按 CSS 显示尺寸和设备像素比建立高清缓冲区；HUD 绘制前用变换映射回逻辑坐标，因此窗口和全屏放大不会再把 480×270 字形直接拉伸。`data-hud-resolution` 与 `data-hud-scale` 用于观察实际缓冲分辨率。

## 状态与持久化

- localStorage key 为 `spacecraft-career-v1`；内部 profile `version` 当前为 5。
- v5 保存生涯统计、星尘、机体/模组解锁、九节点恒星天赋、合约通关、勋章、模式和可访问性/音量/语言设置。
- `loadProfile()` 通过默认值合并、合法 ID 过滤、数值钳制和语言回退迁移旧记录；解析或存储失败时安全回到本地默认值。
- 静音还兼容独立 key `spacecraft-muted`。当前没有账户、网络后端或云存档。

## 观察与测试接口

`#game` Canvas 的 `data-*` 属性公开模式、语言、章节、事件、Boss 阶段/攻击/状态/蓄力、敌人数/普通弹/伤害束/追踪弹/爆破弹、敌弹和追踪速度、伤害束有限性、非法敌弹、敌军重叠/近距挤压/净距/展开、交战距离误差、当前预警类型、激光/追踪/爆破/死亡机能/实体碰撞计数、敌军船体/武器/物种/AI、原生种/精英数量、最大耐久/存活时间/攻击轮数、玩家耐久/上限/位置/累计受击/倒地/救援、FPS、QA 状态、装备、合约、天赋、倍率、构筑、协议、Buff/Debuff、六槽/43,008 构筑目录、生态、异象、星门、遭遇、狂潮、HUD 分辨率和奖励等稳定摘要。远征导演额外公开 `data-run-target-seconds="1800"`、全局/章内战区、战区转场、事件、遭遇、构筑次数和构筑上下文；威胁矩阵公开当前/目标/峰值等级、连续分数、调整次数、缓冲/极限秒数以及增援、弹速、开火、耐久、瞄准倍率；战斗学说公开节拍、连续压力、弹幕阶级/预算、状态转换/预警、已触发弹幕、当前 AI 状态、编队数、成长分与僚机意图。三机小队生成时由当前站位选择五条横向航道中最空的一条，成员再用稳定 ID 分布到三层纵深；占位时编队锚点与职责交战距离共同约束目标位置。3D Canvas 公开 `data-renderer="three-r185-instanced-voxel"`、`data-art-style="toon-glow-light-blocks"`、`data-pixel-grammar="coarse-emissive-012"`、`data-space-composition="open-celestial-parallax"`、`data-ecosystem-composition="9-macro-mid-sparse"`、`data-combat-negative-space="center-55-clear"`、`data-nebula-parallax="3d-additive-dust"`、`data-sky-atmosphere="layered-soft-voxel-nebula"`、`data-ground-plane="none-open-space"`、`data-depth-scaffolding="macro-mid-distant"`、`data-macro-layout="alternating-edge-anchors"`、`data-celestial-scaffolding="opposed-biome-horizon-bodies"`、`data-hull-exposure="matte-ceramic-no-bloom"`、`data-shield-language="segmented-shell-hit-break"`、`data-boss-gallery-view="neutral-silhouette"`、`data-faction-language="human-kites-vs-void-organisms"`、`data-player-modules="4-integrated-silhouette-parts"`、`data-model-families="3-player-16-alien"`、`data-module-anatomy="integrated-large-form"`、`data-boss-families="3-organic-phase-forms"`、`data-boss-choreography="telegraph-state-arena"`、`data-expedition-sectors="9-progressive-voxel-gates"`、`data-sector-anomalies="9-seeded-gameplay-fields"`、`data-adaptive-threat="5-tier-telegraphed"`、`data-enemy-tactics="role-doctrine-6-state"`、`data-enemy-spacing="live-target-standoff"`、`data-warning-grammar="local-charge-laser-sight-ram-chevrons-blast-rings"`、`data-laser-vfx="layered-core-edge-packets"` 与 `data-bullet-grammar="locked-safe-lanes-curves-mines-lasers-seekers-blasts"`。`smoke:director` 在真实 Electron/WebGL 中压缩运行一章；`smoke:threat` 比较压力双端；`smoke:combat` 检查正常开局、第三章极限杀伤区和 12 格非比例曲线；`smoke:strategy` 同种子比较零输入与预警换位的生存结果；`smoke:arsenal` 以五场会话检查载荷激光、恒速追踪、范围爆破、死亡机能、精英、碰撞和持续追猎；`smoke:boss-state` 逐章检查 phase 3 火力；`smoke:anomalies` 逐项检查九种异象。

当前方向预警还通过 `data-enemy-telegraph-targets` 公开敌机、弹幕、目标玩家、采样目标和承诺终点；该属性仅提供可重复验证，不参与瞄准、移动或伤害计算。

3D Canvas 还公开 `data-world-depth-layers="3"`、`data-biome-dioramas="9"` 与 `data-projectile-vfx="segmented-toon-trails"`。仅本机有效的 `qa-biome=<id>` 可以强制九个生态之一；`scripts/smoke-biomes.cjs` 逐项启动真实 Electron/WebGL、断言 45 FPS 下限与零控制台错误并生成截图。

完整用法见[开发与验证](./DEVELOPMENT.md)。改变模块所有权、存档边界、固定步模型或桌面安全模型时，同步更新本文。
