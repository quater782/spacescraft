# 开发与验证

## Web 版本

直接打开 `index.html`，或使用仅监听本机的静态服务器：

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4173`。

### 本地快速战役冒烟测试

在本机服务器地址追加 `?qa-fast`：

```text
http://127.0.0.1:4173/?qa-fast
```

此模式仅在 `localhost` 或 `127.0.0.1` 生效，会把远征章节时间加速到 90 倍并降低 Boss 测试耐久，用于快速检查九战区、27 个事件、12 次遭遇、八个构筑节点、三场 Boss 和完整通关路径。测试结果不会写入出航、通关、最高分等生涯统计，也不会在正式域名或 Electron 文件协议下启用；`qa-voxel` 保持 1 倍速度，避免建模验收场被跳过。

自动化或人工检查可以读取 `#game` 上的 `data-mode`、`data-language`、`data-stage`、`data-stage-time`、`data-events`、`data-enemies`、`data-boss-phase`、`data-player-hp`、`data-fps` 与 `data-qa` 诊断属性。机库、合约、构筑与远征还提供 `data-frame`、`data-module`、`data-contract`、`data-talents`、`data-talent-count`、`data-score-multiplier`、`data-player-shield`、`data-player-speed`、`data-player-fire-rate`、`data-player-damage`、`data-player-energy-gain`、`data-achievement-count`、`data-stardust-reward`、`data-run-seed`、`data-upgrade-count`、`data-upgrades`、`data-draft-options`、`data-protocols`、`data-protocol-count`、`data-protocol-procs`、`data-player-buffs`、`data-player-debuffs`、`data-enemy-module-slots`、`data-enemy-build-catalog`、`data-qa-enemy-build`、`data-route-signature`、`data-biome`、`data-enemy-variants`、`data-active-builds`、`data-path-plan`、`data-active-path`、`data-path-options`、`data-path-selection`、`data-path-history`、`data-encounter-plan`、`data-active-encounter`、`data-encounter-progress`、`data-encounter-objects`、`data-encounter-history` 及七项 `data-rush-*` 狂潮状态。3D Canvas 还应为 `data-renderer="three-r185-instanced-voxel"`、`data-art-style="toon-glow-light-blocks"` 和 `data-model-palette="saturated-no-black"`。

### 本地机库经济测试

在本机地址追加 `?qa-wallet` 会仅在当前载入时把可用测试星尘提高到至少 3000。追加 `?qa-contracts` 会临时满足风暴与过载的显示解锁条件：

```text
http://127.0.0.1:4173/?qa-fast&qa-wallet&qa-contracts
```

这些开关只在 localhost 生效，用于检查解锁、扣款、勋章和合约签署流程。执行解锁或签署后会写入当前浏览器的本地测试存档；测试完成后应通过设置页的“清除本地记录”恢复默认状态。Electron 文件协议和正式域名无法启用这些开关。

### 恒星天赋与 v5 存档测试

使用 `?qa-wallet` 打开机库，检查恒星天赋网格的三条分支。每条分支必须按一级 80、二级 140、三级 240 星尘依次点亮；跳过前置时不能扣款。点亮后刷新页面，`data-talents` 和 `data-talent-count` 应保持，进入战斗后对应的双机属性必须变化。默认彗星的“矢量推进器”验证基准为速度 `91 → 96.46`。

旧 v4 profile 不含 `talents` 时应迁移为空数组并保留其他字段；未知 ID、重复 ID 和缺失前置的二/三级孤立节点会由 `SpaceConstellation.sanitizeUnlocks()` 移除。`npm run verify` 会验证九个节点、三条完整依赖、购买门槛、清洗与所有属性效果。

### 局内构筑与确定性种子测试

追加 `?qa-draft` 会保留章节间的三选一操作；不追加时，`qa-fast` 会自动完成选择，避免冒烟测试停在构筑页。使用 `seed` 参数可以复现同一轮候选项和战斗随机序列：

```text
http://127.0.0.1:4173/?qa-fast&qa-draft&seed=20260826
```

构筑页同样遵循“只控制方向”的产品约束：左右选择，上下确认；P1 可使用 WASD，P2 可使用方向键。`npm run verify` 会额外检查 15 项升级效果、同种子复现、类别覆盖、满级过滤、早期稀有度权重、叠层和玩法/视觉随机源隔离，并验证 9 种生态、7 个有机船体、7,168 种六维敌军构筑、第一章安全包络与后期模块多样性。

### 遗物协议测试

第一次构筑选择任意协议组件后，下一次三选一必须至少包含一件仍可升级的配套组件，并用协议色矢量徽记标记“将激活”；同一 seed 和选择历史必须复现相同配套项。可用 `qa-protocol` 在本机直接预置任一两件套：

```text
http://127.0.0.1:4173/?qa-fast&qa-protocol=cometDrive&qa-path=1&qa-encounter=relay&seed=2
```

可选稳定 ID：`cometDrive`、`phaseLance`、`prismChoir`、`stormCircuit`、`aegisNova`、`salvageReactor`、`resonantGyro`。检查 `data-protocols`、`data-protocol-count` 和 `data-protocol-procs`，并确认构筑托盘 SVG、HUD、3D 轨道遗物与自动触发音效。测试期间只发送方向输入，不得出现协议触发键。

### Three.js Toon+Glow 航空战机、异形六维敌军与状态测试

使用专用正常速度建模面，不触发动态遭遇或 Boss，并强制船体以及推进/武器/核心/AI/载荷六维敌型：

```text
http://127.0.0.1:4173/?qa-voxel&qa-buffs&qa-status=chill&qa-path=1&qa-hull=carrier&qa-enemy=drift.orbit.barrier.oracle.cryo&seed=2
```

`qa-hull=scout|dart|tank|spinner|mine|lancer|carrier` 强制基础机体，`qa-enemy` 必须是五段功能模块稳定 ID；七个船体与每槽四种模块形成 7,168 个完整构筑。`qa-buffs` 自动给双机上线军械超频、纳米花簇、神盾矩阵和磁通核心；`qa-status=chill|jam|fracture` 只给 P1 施加对应异常。全部开关仅在 localhost 生效，不增加战斗键。

视觉验收必须同时检查：玩家尖鼻朝屏幕上方、敌军绕 Y 轴 180° 朝屏幕下方；玩家具有细长机身、纵向座舱、连续阶梯薄翼、倾斜尾翼与独立推进焰，不得呈现甲虫/装甲车式粗短截面；敌军不得调用玩家的机鼻/机翼/尾翼构造器，必须以弯月骨翼、分叉颚、甲壳、触须和非对称眼阵形成异形剪影；Buff/Debuff 贴合主体结构。玩家与敌军主体必须保持蓝、青、紫、粉、橙等饱和颜色，不得使用近黑色结构块，也不得因曝光过高变成粉白；表面应可见三阶 Toon 明暗，Glow 只形成略大于实体的同色边缘。单个机鼻不超过四块、单侧翼不超过四块、单侧尾翼不超过两块、单侧弯月不超过三块；彩色体素弹幕、体素星球/生态、3D 网格和远近雾有纵深；静止截图和连续运行中均无共面闪烁。`npm run verify` 会拒绝近黑舰体色、超预算核心构造器、敌方复用人类战机构造器、原生 shader/buffer/draw call、手写面片以及 Plane/Sphere/Torus/Octahedron/Cone 几何回退。

### 三机体 × 七敌舰近景模型矩阵

`qa-model-gallery` 只在 localhost/127.0.0.1 生效，会暂停普通战斗实体并在干净星空/网格中同屏展示三架玩家战机与七类敌舰：

```text
http://127.0.0.1:4173/?qa-model-gallery&seed=2
```

运行 `npm run smoke:models` 会真实启动 Electron/WebGL，检查 `data-model-families="3-player-7-alien"`、`data-module-anatomy="integrated-large-form"`、Toon+Glow、饱和无黑色、50 FPS 下限和零应用控制台错误，并把近景截图写入系统临时目录。人工验收重点是玩家三机体长宽比例、敌军七种独立剪影、敌我相反机头，以及推进/武器/核心/AI/载荷是否表现为大型主体器官而非细杆或悬浮小方块。

### 三章 Boss 阶段矩阵

`qa-boss-gallery` 会在干净场景同屏排列三章 Boss；使用 `qa-boss-phase=1|2|3` 选择同一阶段，方便逐帧比较大型器官生长：

```text
http://127.0.0.1:4173/?qa-boss-gallery&qa-boss-phase=3&seed=2
```

运行 `npm run smoke:bosses` 会依次验证三个阶段的 `data-boss-families="3-organic-phase-forms"`、Toon+Glow、无黑色、大型有机模块、WebGL、50 FPS 下限和零应用控制台错误，并输出 `boss-phase-1.png` 到 `boss-phase-3.png`。人工验收必须确认花瓣魟翼、雷枪熔炉、双体虚空冠三套剪影互不复用普通敌舰附肢，第二/三阶段器官确实改变主体轮廓，且下方三种章别弹体分别是花瓣、雷枪和旋转棱体。

### Boss 攻击状态机实战

`qa-boss-state` 建立仅 localhost 有效的长耐久第一章 Boss 会话，并把章节计时加速到 180 倍；Boss 出现后玩家临时免伤，便于动态观察编舞，正式战役不会启用：

```text
http://127.0.0.1:4173/?qa-fast&qa-boss-state&qa-path=1&seed=7
```

`#game` 会公开 `data-boss-attack-state`、`data-boss-attack`、`data-boss-attack-charge` 与 `data-enemy-bullets`。运行 `npm run smoke:boss-state` 必须动态捕获 recover/telegraph、至少两种连续攻击、charge ≥ 0.6、实际敌弹、`telegraph-state-arena`、WebGL、50 FPS 下限和零应用控制台错误。生成的 `spacescraft-boss-state.png` 应显示搏动核心、旋转蓄力块、章别竞技场信标及目标危险光路。

### 九生态微缩世界与弹体特效矩阵

`qa-biome` 只在 localhost/127.0.0.1 生效，可把任意生态强制到第一章，方便在相同战斗节奏下比较场景：

```text
http://127.0.0.1:4173/?qa-biome=eclipseCarnival&seed=2
```

稳定 ID 为 `sugarBloom`、`crystalOrchard`、`cometTide`、`auroraFoundry`、`thunderWorks`、`cloudReef`、`eclipseCarnival`、`prismGrave` 和 `voidGarden`。逐项检查近景航标、中景生态件、远景地标是否形成三层纵深并向镜头推进；生态必须具有不同剪影，第三章不得出现黑色巨墙或黑色蚀月。玩家/敌军弹体应沿速度方向拥有渐缩拖尾，命中与爆炸应表现为拉伸体积光屑；低画质允许拖尾缩为一节。

运行真实 Electron/WebGL 九项矩阵：

```bash
npm run smoke:biomes
```

每项必须返回正确 `biome`、`worldDepthLayers: "3"`、`biomeDioramas: "9"`、`projectileVfx: "segmented-toon-trails"`、WebGL true、不低于 45 FPS 和零控制台错误。截图写入系统临时目录 `spacescraft-biome-matrix`，仍需人工检查剪影、纵深、遮挡、色彩和运动方向。

### 星门分支测试

每章开场的三座星门通过实际移动选取：双机驶入同一门并保持 0.68 秒自动锁定；单人 AI 跟随 P1，5.8 秒超时按双机平均位置所在航道自动选择。用固定种子复现三章候选，并用 `qa-path` 强制快速冒烟选择左、中或右门：

```text
http://127.0.0.1:4173/?qa-fast&qa-path=2&seed=20260827
```

`qa-path` 只接受 `0`、`1`、`2`，只在 localhost 生效。检查 `data-path-plan` 的三组计划、选择期间的 `data-path-options`/`data-path-selection`、锁定后的 `data-active-path` 和跨章累积的 `data-path-history`。`npm run verify` 会验证每组恰有支援/火力/高风险各一条、同种子复现、不同种子分化、航道汇合判定、单人 AI 接线、协议模块偏好和第一章危险倍率钳制。

### 动态遭遇测试

默认每章在 14%、34%、58% 与 79% 进度各生成一次目标，每局共十二个；同类目标不会连续出现，连续目标也不会占用同一航道。用 `qa-encounter` 强制覆盖某一类遭遇；可选值为 `relay`、`salvage`、`courier`、`meteor`、`rift`。陨星与裂隙遵守正式章节门槛，只会从第二章开始替换首个目标：

```text
http://127.0.0.1:4173/?qa-fast&qa-path=1&qa-encounter=salvage&seed=2
```

`qa-fast` 会同比缩短非生存目标量和遭遇时长，奖励规则不变。检查 `data-encounter-plan`、`data-active-encounter`、`data-encounter-progress`、`data-encounter-objects` 和 `data-encounter-history`。第一章必须只出现信标、回收或护航，且同期增援倍率不得高于 1。

### 30 分钟远征导演测试

正常模式三章基础航行必须分别为 570、600、630 秒，合计 1,800 秒；Boss、星门和构筑暂停会让实际完整一局略长于 30 分钟。每章在三分之一和三分之二进度切换战区，25%/72% 处暂停进入章中构筑，九次编队事件分布在 8%–88%。运行：

```bash
npm run smoke:director
```

该脚本使用 90 倍 localhost QA 时间在真实 Electron/WebGL 中压缩模拟第一章，必须观察全局战区 1/2/3、事件 9/9、遭遇 4/4、至少两次 `mid-stage` 构筑并进入 Boss，同时断言 `data-run-target-seconds="1800"`、`data-expedition-sectors="9-progressive-voxel-gates"`、40 FPS 下限和零控制台错误。`scripts/verify-director.mjs` 另行精确检查 1× 正常倍率、全部相对阈值、27/12/8 总数和 90× QA 隔离。两者证明结构与压缩执行路径成立，但不能替代一次正常 1×、含三 Boss 和所有选择暂停的完整 30 分钟实玩/性能长测。

### 自适应威胁矩阵测试

正常航行会自动在缓冲、巡航、交锋、激涌和极限五级之间调整压力。首章前 40% 最高只能处于巡航；双机平均耐久低于 52% 同样封顶巡航，低于 34% 或任一队员倒地会强制缓冲。候选状态需连续保持 1.25 秒，且一次只升降一级。检查 HUD 右侧等级/刻度、同色 3D 航道信标、升降级专属音效、配乐节拍/密度变化，以及结算页峰值/调整/累计秒数。

本机可用 `qa-threat=0|1|2|3|4` 强制任一级，不修改正式域名或 Electron 文件协议：

```text
http://127.0.0.1:4173/?qa-fast&qa-path=0&qa-threat=4&seed=2304
```

`#game` 公开 `data-threat-tier`、`data-threat-id`、`data-threat-score`、`data-threat-target`、`data-threat-peak`、`data-threat-changes`、`data-threat-relief-seconds`、`data-threat-apex-seconds` 以及五项战斗倍率；3D Canvas 公开 `data-adaptive-threat="5-tier-telegraphed"`、`data-threat-tier`、`data-threat-color` 和脉冲值。运行：

```bash
npm run smoke:threat
```

脚本先比较缓冲与极限强制端点，再以 1× 时间运行首章前 20 秒；它会断言增援/弹速/开火/耐久单调提高、瞄准误差收紧、WebGL 有效、40 FPS 下限、首章不越过巡航、前六秒零敌弹、普通敌军不超过六架、双机未倒地和零应用控制台错误，并把 `relief.png` 与 `apex.png` 写入系统临时目录。该矩阵证明两端接线与开局安全，但不能代替一次正常 1× 长局对自然等级分布、倒地减压和恢复升档的观察。

### 星链狂潮测试

正式玩法中，保持共振、击破、精英、拾取、遭遇成功、自动救援和 Boss 阶段会自然把星链充到 100 并自动启动。需要快速目视检查时追加只在 localhost 生效的 `qa-rush`：

```text
http://127.0.0.1:4173/?qa-fast&qa-rush&qa-path=1&qa-encounter=relay&seed=2
```

选择星门后狂潮应自动启动；检查两架 3D 战机外围的双层能量环、六枚体素轨道碎片、中央共振核心、HUD 倒计时和链数。`data-rush-charge`、`data-rush-active`、`data-rush-timer`、`data-rush-chain`、`data-rush-best-chain`、`data-rush-count` 和 `data-rush-last-bonus` 提供稳定诊断。战斗期间只发送方向输入；不应出现任何手动技能按键。

项目提供真实 Electron 隐藏窗口冒烟，使用隔离临时存档、本地测试钱包、WebGL 场景和实际方向键事件：先购买“矢量推进器”并截取机库，再验证双机速度提升、完成信标并截取战斗画面：

```bash
npm run smoke:electron
```

成功输出必须同时包含 `talentPurchase.owned: true`、`talentCount: "1"`、`protocols: "cometDrive"`、`protocolCount: "1"`、大于 0 的 `protocolProcs`、双机 `playerSpeed` 大于 109、`rushActive: "true"`、`rushCount: "1"`、`encounterHistory: "relay:success"`、`rendererState.backend: "three-r185-instanced-voxel"`、`rendererState.artStyle: "toon-glow-light-blocks"`、`rendererState.modelPalette: "saturated-no-black"`、`webgl: true`、`consoleErrors: 0`、接近 60 的 `fps` 和不低于 CSS 显示尺寸的 `hudResolution`；`settledRush` 还必须记录 `rushActive: "false"` 和大于 0 的 `rushLastBonus`。脚本依次生成完整战斗、状态体素和无 Buff 干净机体三张截图。这项测试不能替代可见窗口下对其余六协议、自然构筑/充能、九天赋组合、其余四类目标、Boss 音频、双人和手柄的人工回归。

## 桌面版本

```bash
npm install
npm start
```

桌面壳默认启用以下安全配置：

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- 严格 Content Security Policy

## 每次更新的最低验证清单

1. 运行 `npm run verify`，确认文档链接、语法、本地化引用键和正式依赖审计通过。
2. 打开标题页，确认 WebGL 场景、SVG 图标和响应式布局。
3. 分别验证单人 AI 与本地双人模式；开局等待至少 20 秒，检查自动开火、刷怪、弹幕速度和生命变化。
4. 检查 AI 僚机闪避、编队、集火和倒地救援，并测试两名玩家的四方向移动。
5. 测试首次教学、DOM 暂停、设置、静音、全屏、三阶段 Boss 与章节切换。
6. 调整语言、音乐、音效、画质、震动、闪光和弹幕配色设置，刷新后确认用户可见状态保持一致。
7. 检查机库余额、解锁扣款、刷新持久化、装备参数、清档恢复和三种 3D 机体辨识度。
8. 检查合约锁定条件、倍率属性、签署持久化、勋章触发与陈列计数。
9. 使用本地快速模式分别跑通巡航与过载合约，并抽样检查正常速度战役的难度、AI 和 Boss 转场。
10. 分别从中英文启动，检查教程、机库、战斗事件、Boss 阶段和结算；在结算页切换语言并确认当前结果即时重绘。
11. 检查浏览器或 Electron 开发者控制台无错误。
12. 使用固定 `seed` 检查局内三选一、升级叠层、章节恢复和结算构筑摘要。
13. 检查 `data-hud-resolution` 不低于 HUD 的 CSS 显示尺寸，确认正常窗口与全屏下战斗文字清晰。
14. 使用固定 `seed` 检查三段生态航线一致，观察至少三种移动/武器/核心外挂、屏障破碎、爆裂连锁和模块扫描 HUD。
15. 分别让两机汇合到左、中、右 3D 星门，检查单人 AI 跟随、双人分歧、超时回退、七种协议效果、分支音乐和结算历史。
16. 覆盖信标、回收、护航、陨星和裂隙，检查单人 AI、双人目标、成功/错失、奖励、3D 实体、遭遇音乐和结果历史；运行 `npm run smoke:electron`。
17. 使用测试钱包按三条依赖链点亮九项天赋，检查精确扣款、刷新持久化、双机属性、前置拒绝、v4 迁移和清档恢复。
18. 在自然充能和 `qa-rush` 两条路径检查自动触发、火力倍率、拾取牵引、光链消弹、击破延时、3D 能量环、动态音乐、结算与七项诊断。
19. 逐项覆盖七种遗物协议，检查第二次构筑配套注入、方向确认、自动触发、SVG/HUD/3D、协议音乐、结果摘要与 CSP 控制台。
20. 用有/无状态两种 `qa-voxel` 画面检查玩家/敌军相反朝向、尖鼻/连续承力翼/尾焰、六维模块对主体轮廓的改变、饱和 Toon 色块、轻微 Glow、体素弹幕/背景和 60 FPS；确认没有近黑舰体、过曝粉白、悬浮微方块、面片堆砌或共面闪烁。
21. 运行 `npm run smoke:biomes`，逐项人工检查九生态截图的近/中/远纵深、独立剪影、饱和 Toon+Glow、分段弹体拖尾与无黑色地标。
22. 运行 `npm run smoke:director`，确认第一章三战区、九事件、四遭遇、两次章中构筑、Boss 接续、60 FPS 目标和零控制台错误。
23. 运行 `npm run smoke:threat`，复核缓冲/极限倍率、HUD、3D 信标、WebGL、帧率和零错误；正常速度抽样观察自然升降档与残血/倒地保护。
24. 更新 `CHANGELOG.md`、[当前项目状态](./PROJECT-STATE.md)、发行说明和相关设计文档。

## 架构

- `src/renderer3d.js`：Three.js WebGL2、按色实例化 `BoxGeometry`、三阶 Toon/自发光/轻辉光分层、点光源、体素背景和全部 3D 模型。
- `src/game.js`：固定时间步、关卡、碰撞、AI、音频和 HUD。
- `src/roguelike.js`：局内升级池、确定性 RNG、候选生成和升级效果。
- `src/relics.js`：七种两件套协议、激活判定、配套候选注入和自动协同倍率。
- `src/status.js`：四种自动 Buff、三种敌方 Debuff、拾取映射、计时目录和战斗倍率。
- `src/constellation.js`：九项长期天赋、前置依赖、购买判定、存档清洗和玩家效果。
- `src/rush.js`：星链狂潮阈值、事件充能、共振增益/衰减和自动战斗倍率。
- `src/director.js`：30 分钟章节时长、战区、编队/遭遇/构筑阈值、强度曲线和 QA 倍率。
- `src/threat.js`：五级威胁配置、动态评分、首章/残血/倒地保护、迟滞与单级步进。
- `src/expedition.js`：生态航线、星门协议/航道判定、动态遭遇计划/结果判定、敌型权重与模块化敌军组装规则。
- `src/i18n.js`：简体中文/英文文案目录、插值、DOM 与元数据同步。
- `electron/main.cjs`：安全桌面窗口与生命周期。
- `forge.config.cjs`：桌面发行产物配置。
- `scripts/build-icons.mjs`：从 SVG 母版生成多分辨率桌面图标。
- `scripts/verify-localization.mjs`：收集 HTML 与游戏逻辑引用键，验证两种语言完整覆盖。
- `scripts/verify-roguelike.mjs`：验证构筑池、随机复现、权重、满级过滤与全部升级效果。
- `scripts/verify-relics.mjs`：验证七种精确配对、双语、候选注入、战斗效果、首章安全与 3D 接线。
- `scripts/verify-constellation.mjs`：验证九项天赋、三条依赖、购买门槛、存档清洗与实际属性效果。
- `scripts/verify-rush.mjs`：验证六类事件、充能边界、共振速率、战斗倍率、QA 与 3D 接线。
- `scripts/verify-expedition.mjs`：验证生态、星门、动态遭遇、敌军组合、早期安全、后期多样性与 3D 集成。
- `scripts/verify-director.mjs`：验证 1,800 秒基础航行、九战区、27 编队、12 遭遇、八构筑和 QA 倍率隔离。
- `scripts/verify-threat.mjs`：验证五级单调参数、保护包络、迟滞步进与战斗/收益/表现接线。
- `scripts/verify-renderer3d.mjs`：验证 Three.js 精确依赖、实例化方块、分层深度、相反机头和禁止原生面片/光滑几何回退。
- `scripts/verify-status.mjs`：验证四 Buff、三 Debuff、双语、自动规则与玩法/音频/HUD/3D 接线。
- `scripts/smoke-electron.cjs`：启动隔离的真实 Electron/WebGL 会话，验证方向交互并生成截图。
- `scripts/smoke-biomes.cjs`：逐一强制九个生态，验证 WebGL/视觉诊断/帧率/控制台并生成九张截图。
- `scripts/smoke-director.cjs`：在真实 Electron/WebGL 中压缩运行第一章导演全时线。
- `scripts/smoke-threat.cjs`：在真实 Electron/WebGL 中比较缓冲与极限两端并生成截图。
- `scripts/verify-docs.mjs`：检查必需文档、Codex 指令大小和仓库内 Markdown 链接。

完整模块边界与数据流见[系统架构](./ARCHITECTURE.md)。
