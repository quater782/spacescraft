# 开发与验证

## 敌我像素弹体专项

`npm run smoke:projectiles` 使用隔离 Electron/WebGL 页面，截图覆盖 20 个弹种/状态（双方脉冲、相位、追踪、重弹、常规敌弹、种雷/引信、爆破/引信及三章 Boss 弹），并输出实际尺寸、2.8 倍模型细节对照、高对比与低画质图。随后以 192 枚混合弹体检查帧率和实例丢弃，再刷新移除全部展示替换，检查正常首章 20 秒。输出目录为系统临时目录 `spacescraft-projectile-art`；放大和密度仅用于渲染验收，不改变正式弹量、判定或难度，也不代替真实特殊武器命中测试。


## 像素实体与曲面燃烧美术验收

`npm run smoke:models` 在十六敌军/三玩家画廊检查后，补充 low、balanced、high 三档画质及高画质的恢复/蓄力/攻击器官截图，另有同一甲壳体逐槽切换的推进/武器/核心/AI/载荷五张比较图，以及四种玩家核心的同机型比较图，防止把不同船体差异误当成模块差异。检查表现层批次容量后重新加载无 QA 的正常首章，等待真实章节时间 20 秒检查双机存活与渲染错误。展示状态替换仅存在于测试窗口，不进入生产源码。截图位于系统临时目录 `spacescraft-art-direction`，画廊不是自然实战或完整三章通关证明。局部美术迭代可用 `npm run smoke:models -- --gallery-only`，输出明确标记跳过正常首章；最终检查使用默认完整路径。

## 打包后的离线启动回归

`npm run smoke:packaged -- "<app.asar 的路径>"` 使用真实 Electron 通过 `file://` 载入包内页面，保持生产的 contextIsolation/nodeIntegration/sandbox 边界，并使用独立临时存档。默认指向 Windows x64 构建目录。测试覆盖渲染器初始化、WebGL2、机库和设置按钮、英文切换、教学、实际首章时间 20 秒及双机自动射击/存活，输出截图和诊断。隐藏测试窗口关闭后台节流，但不改变固定时间步或难度。

`node scripts/verify-package.cjs` 先按 Forge 排除规则检查完整模块依赖；传入 ASAR 路径时校验真实包内文件。每次 Forge 裁剪依赖后和 NSIS 压缩前也会执行，缺失间接依赖直接阻止构建。Windows 构建工作流在打包后执行相同实机脚本。


## 多路线收益与可恢复远征专项

当前实现见[可恢复远征](./PROGRESSION.md)。运行 `npm run smoke:progression`：隔离 Electron/WebGL 首先用正常速度检查首章前 20 秒，再检查 v5→v6 钱包/天赋保留、损坏/缺失回退、机库路线与购买保存、购买不改变当前局、六种蓝图实际效果、重复战区不重复发奖、双模式四次章中构筑×三章及两次章间升级、重复结算无重复收益、中英研究与结算界面。

`npm run smoke:progression -- --fixtures-only --late-sample` 跳过开局，附加 24 秒正常速度第三章十二选可达构筑场景。场景从预设满血/空场开始，随后不注入 HP/时间/无敌，P1 只发送左右方向，僚机按正式 AI 行动；它仅用于观察短峰压力，不代表自然全程通关。截图输出到系统临时目录 `spacescraft-progression`。浏览器技能若无法连接应用内浏览器，记录后使用这一真实 Electron 后备路径。

新增稳定诊断为 `data-research-ranks`、`data-research-focus`、`data-research-procs`、`data-research-caches`、`data-growth-grace` 和 `data-pressure-holds`。`verify-research.mjs` 同时验证首奖一次性、资料累计、发现保底/随机分化、定向购买和满级折算。以下旧版本章节中的八选、25%/72%、长杀伤区数据属于旧基线；当前为十四选、10%/30%/52%/75%，正式首章脚本已同步四次章中选择。

## 命中清弹、跨章继承与护盾反馈专项

运行 `npm run smoke:survival`，使用独立临时存档和仅监听 127.0.0.1 的测试服务器。先检查正常速度第一章 20 秒无倒地与 WebGL 帧率，再同步调用真实构筑、章节推进和碰撞函数，覆盖单人/双人、八次构筑/全部强化、第二/第三章实际参数继承。这里的“全部强化”是接线压力夹具，不声称自然八次选择能拿满所有卡。

专项还验证未击杀目标的命中充能、全队每秒预算、无敌 Boss 不回能、Nova 不给自身回能、空场满槽保留、有近处弹幕时自动清弹，以及护盾抵伤/溢出扣血。截图位于系统临时目录 `spacescraft-survival-feedback`，包括正常开局、中英说明、护盾存在/吸收/破碎、60%/30% 受损。用 `npm run smoke:survival -- --fixtures-only` 可单独复查状态夹具，输出会明确标记跳过正常开局；不把夹具当作难度实测。

新增诊断：`data-nova-hit-charge-earned`、`data-nova-charge-rate`、`data-nova-clear-radius`、`data-player-shield-absorbed`、`data-player-hull-damage`、`data-player-damage-state`、`data-player-hit-feedback`。最后一项按双机输出吸收/破盾/机体受击计时器。3D 诊断为 `data-shield-language="segmented-shell-hit-break"` 与 `data-hull-damage-language="scorch-cracks-smoke-60-30"`。

2026-09-06：正常速度前 20 秒检查通过；夹具验证 3/7 套协议共存并保留实际属性，护盾两次受击共吸收 2 点、机体只承受溢出的 2 点；命中未击杀目标可回能，禁用来源无回能。应用内浏览器后端不可连接，本轮使用真实 Electron/WebGL 截图；正常 30 分钟真人体验和双手柄仍未验证。

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

自动化或人工检查可以读取 `#game` 上的 `data-mode`、`data-language`、`data-stage`、`data-stage-time`、`data-events`、`data-enemies`、`data-enemy-bullets`、`data-enemy-beams`、`data-enemy-homing-bullets`、`data-enemy-blast-bullets`、`data-enemy-bullet-speed`、`data-enemy-homing-speed`、`data-enemy-beam-finite`、`data-combat-invalid-projectiles`、`data-enemy-overlap-pairs`、`data-enemy-close-pairs`、`data-enemy-min-clearance`、`data-enemy-spread`、`data-enemy-standoff-error`、`data-enemy-telegraph-patterns`、`data-boss-phase`、`data-player-hp`、`data-player-max-hp`、`data-player-position`、`data-player-damage-taken`、`data-player-downed`、`data-player-down-count`、`data-player-rescue-count`、`data-fps` 与 `data-qa` 诊断属性。机库、合约、构筑与远征还提供 `data-frame`、`data-module`、`data-contract`、`data-talents`、`data-talent-count`、`data-score-multiplier`、`data-player-shield`、`data-player-speed`、`data-player-fire-rate`、`data-player-damage`、`data-player-energy-gain`、`data-player-shots`、`data-player-projectiles`、`data-growth-capstones`、`data-growth-capstone-procs`、`data-qa-growth`、`data-achievement-count`、`data-stardust-reward`、`data-run-seed`、`data-upgrade-count`、`data-upgrades`、`data-draft-options`、`data-protocols`、`data-protocol-count`、`data-protocol-procs`、`data-player-buffs`、`data-player-debuffs`、`data-enemy-module-slots`、`data-enemy-build-catalog`、`data-qa-enemy-build`、`data-route-signature`、`data-biome`、`data-enemy-variants`、`data-active-builds`、`data-path-plan`、`data-active-path`、`data-path-options`、`data-path-selection`、`data-path-history`、`data-encounter-plan`、`data-active-encounter`、`data-encounter-progress`、`data-encounter-objects`、`data-encounter-history` 及七项 `data-rush-*` 狂潮状态。战斗重构另提供 `data-combat-beat`、`data-combat-pressure`、`data-combat-pattern-tier`、`data-combat-bullet-cap`、`data-combat-state-transitions`、`data-combat-telegraphs`、`data-combat-patterns`、`data-enemy-ai-states`、`data-enemy-formations`、`data-enemy-hulls`、`data-enemy-weapons`、`data-enemy-species`、`data-enemy-ai-doctrines`、`data-enemy-native-count`、`data-enemy-elite-count`、`data-enemy-max-hp`、`data-enemy-max-age`、`data-enemy-max-cycles`、`data-combat-laser-hits`、`data-combat-homing-hits`、`data-combat-blast-hits`、`data-combat-deathrattles`、`data-combat-body-collisions`、`data-combat-friendly-collisions`、`data-ambient-elite-spawns`、`data-run-growth` 和 `data-ai-intent`。3D Canvas 还应为 `data-renderer="three-r185-instanced-voxel"`、`data-art-style="toon-glow-light-blocks"`、`data-pixel-grammar="coarse-emissive-012"`、`data-space-composition="open-celestial-parallax"`、`data-ecosystem-composition="9-macro-mid-sparse"`、`data-combat-negative-space="center-55-clear"`、`data-nebula-parallax="3d-additive-dust"`、`data-faction-language="human-kites-vs-void-organisms"`、`data-player-modules="4-integrated-silhouette-parts"`、`data-model-families="3-player-16-alien"`、`data-enemy-tactics="role-doctrine-6-state"`、`data-enemy-spacing="live-target-standoff"`、`data-warning-grammar="local-charge-laser-sight-ram-chevrons-blast-rings"`、`data-laser-vfx="layered-core-edge-packets"`、`data-bullet-grammar="locked-safe-lanes-curves-mines-lasers-seekers-blasts"` 和 `data-player-projectile-density="capstone-low-bloom"`。

`data-enemy-telegraph-targets` 以 `敌机 ID|弹幕 ID|玩家索引|起点 X|起点 Y|采样目标 X|采样目标 Y|承诺终点 X|承诺终点 Y` 记录当前预警几何；策略测试据此只移动真正被激光或冲撞瞄准的战机，不把普通局部蓄力误判成跨屏方向指令。

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

构筑页同样遵循“只控制方向”的产品约束：左右选择，上下确认；P1 可使用 WASD，P2 可使用方向键。`npm run verify` 会检查 22 张四路径升级、首次直接生存牌、首两抽路径覆盖、主路径/弱项候选、稀有/传说保底、满级过滤、五个隔离随机域和全部效果，并验证 9 种生态、16 个有机船体、43,008 种六维敌军构筑、第一章分阶段安全包络与后期模块多样性。

需要比较真实火力成长时，使用只在 localhost 且同时带 `qa-voxel` 时生效的 `qa-growth=mid|capstone`：

```text
http://127.0.0.1:4173/?qa-voxel&qa-growth=capstone&qa-path=1&qa-combat-stage=2&qa-combat-progress=0.5&seed=2701
```

`mid` 装载超频 2、棱镜 1、僚机 1 共四次选择；`capstone` 装载超频 3、棱镜 3、僚机 2，恰好对应一局八次选择。运行 `npm run smoke:growth` 会在相同第二章场景对比空构筑、中期和终阶的射速、齐射轮数、同屏玩家弹、成长分、棱镜蜂群协议、三种终阶触发、双机存活、WebGL、帧率与控制台，并输出 `spacescraft-growth-doctrine/capstone.png`。当前 6 秒三档射速为 1.00/1.12/1.19、P1 齐射增量 33/41/48、玩家弹峰值 16/55/98，双机三种终阶触发均为 6|12|16。该测试不模拟自然三选一决策，候选复现仍由静态门禁和正常长局负责。

### 遗物协议测试

第一次构筑选择任意协议组件后，随后两次三选一窗口内必须恰好保证一次仍可升级的配套组件，并用协议色矢量徽记标记“将激活”；若第一次窗口已经出现，第二次不会再次强塞。全部已完成的协议同时生效并跨章保留；同一 seed 和选择历史必须复现相同配套项。可用 `qa-protocol` 在本机直接预置任一两件套：

```text
http://127.0.0.1:4173/?qa-fast&qa-protocol=cometDrive&qa-path=1&qa-encounter=relay&seed=2
```

可选稳定 ID：`cometDrive`、`phaseLance`、`prismChoir`、`stormCircuit`、`aegisNova`、`salvageReactor`、`resonantGyro`。检查 `data-protocols`、`data-protocol-count` 和 `data-protocol-procs`，并确认构筑托盘 SVG、HUD、3D 轨道遗物与自动触发音效。测试期间只发送方向输入，不得出现协议触发键。

### Three.js Toon+Glow 航空战机、异形六维敌军与状态测试

使用专用正常速度建模面，不触发动态遭遇或 Boss，并强制船体以及推进/武器/核心/AI/载荷六维敌型：

```text
http://127.0.0.1:4173/?qa-voxel&qa-buffs&qa-status=chill&qa-path=1&qa-hull=carrier&qa-enemy=drift.orbit.barrier.oracle.cryo&seed=2
```

`qa-hull=scout|dart|tank|spinner|mine|lancer|carrier|nectarMoth|prismRay|cometRammer|auroraLeech|railBeetle|reefMedusa|eclipseReaper|graveMirror|gardenSpore` 强制机体，`qa-enemy` 必须是五段功能模块稳定 ID；16 个船体与 4 航行、7 武器、4 核心、6 AI、4 载荷形成 43,008 个完整构筑。`qa-buffs` 自动给双机上线军械超频、纳米花簇、神盾矩阵和磁通核心；`qa-status=chill|jam|fracture` 只给 P1 施加对应异常。全部开关仅在 localhost 生效，不增加战斗键。

视觉验收必须同时检查：玩家尖鼻朝屏幕上方、敌军绕 Y 轴 180° 朝屏幕下方；玩家主体是大面积暖白陶瓷连续面，P1/P2 只用青蓝/珊瑚作为识别色，并具有长鼻、纵向座舱、薄翼、倾斜尾翼与独立推进焰；敌军不得调用玩家构造器，必须以深紫甲壳、血红结构、少量酸性眼核以及弯月骨翼、分叉颚、触须和非对称眼阵形成异形剪影。四模组与 Buff/Debuff 贴合主体结构，敌军五维模块必须改写表面脉络、口器、尾器官、甲壳缝或眼阵，酸性颜色不得铺满大翼面。表面应可见三阶 Toon 明暗，每块体素有克制同色 Glow；只有座舱、引擎、眼核、口器和裂缝触发 HDR Bloom，白色装甲不得泛光。原生分辨率和 SMAA 负责平滑屏幕边缘，世界尺寸不低于 0.12 的粗几何负责像素感。场景至少保留大面积深空负空间，连续地板、成对护栏、中央门架和横贯画面的力场光轨均视为隧道回归；导航网格只能低透明度跟随玩家。玩家普通弹是低亮短矢，敌弹是珊瑚/紫色倒刺生物体；只有狙击职责允许长轴。完整色彩、构图和粒度规则见[3D 像素视觉方向](./VISUAL-DIRECTION.md)。

### 三机体 × 十六敌舰近景模型矩阵

`qa-model-gallery` 只在 localhost/127.0.0.1 生效，会暂停普通战斗实体并在干净星空/网格中同屏展示三架玩家战机与十六类敌舰：

```text
http://127.0.0.1:4173/?qa-model-gallery&seed=2
```

运行 `npm run smoke:models` 会真实启动 Electron/WebGL，检查 `data-model-families="3-player-16-alien"`、`data-enemy-module-language="surface-organs"`、`data-player-material-separation="ceramic-core-engine"`、`data-hull-exposure="matte-ceramic-no-bloom"`、`data-shield-language="segmented-shell-hit-break"`、选择性 Bloom/SMAA、50 FPS 下限和零应用控制台错误，并把近景截图写入系统临时目录。人工验收重点是哑光陶瓷玩家与紫红敌军的一眼区分、玩家三机体长宽比例、七个通用船体与九个生态原生种的独立剪影、敌我相反机头，以及推进/武器/核心/AI/载荷是否表现为表面器官而非细杆、悬浮小方块或人类外挂件。

### 掠食武器、精英与实体碰撞专项

`qa-elite` 只在 localhost/127.0.0.1 且同时存在 `qa-voxel` 时生效，会把普通增援限制为一架高耐久精英，便于验证完整攻击循环、真实激光命中、追踪转向、爆破范围、死亡机能和撞击伤害。它不改变正式域名或 Electron 文件协议，也不会增加战斗输入：

```text
http://127.0.0.1:4173/?qa-voxel&qa-elite&qa-biome=cometTide&qa-hull=cometRammer&qa-combat-stage=2&qa-combat-progress=0.7&seed=2604
```

运行 `npm run smoke:arsenal` 会分别建立激光、爆破、追踪、撞角和独立持续追猎五个真实 Electron/WebGL 会话，断言生态原生种、武器与 AI 组合、4.8 倍常规精英、职责安全距离、激光/冲撞/爆炸预警类型、恒速限角追踪、伤害束/范围伤害及载荷、死亡机能、敌军互撞、玩家撞敌、连续攻击轮数、有限几何、非法敌弹 0、60 FPS 和零应用控制台错误。激光、爆炸和冲撞会额外保存预警阶段截图；全部结果输出到系统临时目录 `spacescraft-predator-arsenal`。

### 三章 Boss 阶段矩阵

`qa-boss-gallery` 会在干净场景同屏排列三章 Boss；使用 `qa-boss-phase=1|2|3` 选择同一阶段，方便逐帧比较大型器官生长：

```text
http://127.0.0.1:4173/?qa-boss-gallery&qa-boss-phase=3&seed=2
```

运行 `npm run smoke:bosses` 会依次验证三个阶段的 `data-boss-families="3-organic-phase-forms"`、深色异形甲壳、选择性 Bloom/SMAA、表面器官语言、WebGL、50 FPS 下限和零应用控制台错误，并输出 `boss-phase-1.png` 到 `boss-phase-3.png`。人工验收必须确认花瓣魟翼、磁炉脊兽、双镰虚空体三套剪影互不复用普通敌舰附肢或玩家推进器，第二/三阶段器官确实改变主体轮廓，且下方三种章别弹体分别是花瓣、雷枪和旋转棱体。

### Boss 攻击状态机实战

`qa-boss-state` 建立仅 localhost 有效的长耐久 Boss 会话，并把章节计时加速到 180 倍；可结合 `qa-combat-stage=1|2|3` 与 `qa-boss-phase=3` 覆盖三章终阶段。测试玩家拥有额外耐久和短受击无敌，但仍会实际受伤，正式战役不会启用这些参数：

```text
http://127.0.0.1:4173/?qa-fast&qa-boss-state&qa-boss-phase=3&qa-combat-stage=3&qa-combat-progress=0.95&qa-path=1&seed=703
```

`#game` 会公开 `data-boss-attack-state`、`data-boss-attack`、`data-boss-attack-charge`、敌弹/伤害束/追踪/爆破数量、激光命中、累计受伤、伤害束有限性与非法弹体。运行 `npm run smoke:boss-state` 必须逐章动态捕获 phase 3 的 recover/telegraph、章别攻击组、charge ≥ 0.6、实际玩家伤害、对应光束/追踪/爆破、`telegraph-state-arena`、WebGL、50 FPS 下限、有限伤害束、非法敌弹 0 和零应用控制台错误。当前三章峰值依次为 75 弹/12 束、101 弹/2 束、128 弹/4 束；截图输出为 `spacescraft-boss-arsenal/boss-stage-1.png` 到 `boss-stage-3.png`。

### 九生态微缩世界与弹体特效矩阵

`qa-biome` 只在 localhost/127.0.0.1 生效，可把任意生态强制到第一章，方便在相同战斗节奏下比较场景：

```text
http://127.0.0.1:4173/?qa-biome=eclipseCarnival&seed=2
```

稳定 ID 为 `sugarBloom`、`crystalOrchard`、`cometTide`、`auroraFoundry`、`thunderWorks`、`cloudReef`、`eclipseCarnival`、`prismGrave` 和 `voidGarden`。逐项检查左侧三分线的巨型远景、中景生态群、两层星云尘带和稀疏航标是否形成不同速度的真实 3D 纵深；九区应分别读成种荚、水晶冠、彗星巨兽、极光环锻炉、电磁线圈、云胞礁、蚀月、三碑墓园和奇点花园。中心 55% 必须保持战斗负空间，敌机不能与巨型地标重叠；第三章不得出现黑色巨墙。玩家/敌军弹体应沿速度方向拥有渐缩拖尾，命中与爆炸应表现为拉伸体积光屑；低画质允许拖尾缩为一节。

运行真实 Electron/WebGL 九项矩阵：

```bash
npm run smoke:biomes
```

每项必须返回正确 `biome`、`worldDepthLayers: "3"`、`biomeDioramas: "9"`、`energyBloom: "unreal-selective-5mip"`、`edgeAA: "native-smaa"`、`ringGrammar: "continuous-segmented-arcs"`、`projectileReadability: "dim-friendly-hot-hostile"`、`groundPlane: "none-open-space"`、`depthScaffolding: "macro-mid-distant"`、WebGL true、不低于 45 FPS 和零控制台错误。截图写入系统临时目录 `spacescraft-biome-matrix`，仍需人工检查剪影、纵深、遮挡、色彩、运动方向、环境是否进入玩家层和 Bloom 污染。

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

### 空战高压与敌军状态机测试

常规战斗每轮依次经过突入、交锋、杀伤区和释放四个节拍；三章分别使用 24%/60%/82%、16%/43%/72%、12%/36%/84% 的边界以及不同压力、开火、弹速、航速、并发和编队向量。章节、战区、自适应威胁与当前节拍共同决定最终强度。普通敌军使用入场→占位→预警→攻击→脱离/重组状态机；三机编队共享目标但错开齐射。每种弹幕必须保留可观察的锁定、空隙、曲率、恒速限角追踪或目标距离引信，完整设计见[空战高压设计基线](./COMBAT-DESIGN.md)。

本机可结合 `qa-voxel` 使用 `qa-combat-stage=1|2|3` 和 `qa-combat-progress=0..0.96` 固定章节与进度；正式域名和 Electron 文件协议会忽略这些参数：

```text
http://127.0.0.1:4173/?qa-voxel&qa-path=2&qa-threat=4&qa-combat-stage=3&qa-combat-progress=0.7&seed=2501
```

检查 `data-combat-beat`、`data-combat-pressure`、`data-combat-pattern-tier`、`data-combat-bullet-cap`、`data-combat-hard-bullet-cap`、`data-enemy-ai-states`、`data-enemy-formations`、`data-combat-patterns`、`data-combat-telegraphs`、`data-combat-state-transitions`、`data-run-growth` 和 `data-ai-intent`。运行：

```bash
npm run smoke:combat
```

脚本先以正常 1× 时间检查第一章前 20 秒的学习窗口，再强制第三章极限杀伤区并持续发送方向输入，最后逐项运行三章 × 四节拍的 12 格曲线矩阵。必须同时看到至少五种 AI 状态、三种弹幕语法、三个战术编队、60 枚以上同屏敌弹、普通/死亡机能预算零越界、敌军重叠不超过 5 对且近距挤压不超过 12 对、单人 AI 的编队/集火/闪避意图、章节压力单调递增、杀伤区高于释放段、章间压力比值跨度足以证明不是比例复制、40 FPS 下限和零应用控制台错误。当前开场为 4 敌/4 弹且双机满耐久，第三章 6 秒动态峰值为 21 敌/112 弹/8 编队/6 种实发弹幕/60 FPS；普通 132 与死亡机能 144 硬预算均零越界。12 格压力/上限数据见设计基线。高压截图与左侧紧凑模块扫描截图写入系统临时目录 `spacescraft-combat-doctrine`；这项压力样本不能替代正常 1× 三十分钟真人实玩、双人/双手柄和全部章节自然曲线回归。

运行 `npm run smoke:strategy` 会在相同第三章极限杀伤区和相同种子下各运行 12 秒：第一组完全不发送玩家输入，第二组只在新预警出现时向相反半场发送 P1 左右方向。门禁要求两组均达到 80 枚以上敌弹和 40 FPS，且预警换位后的双机累计伤害与倒地综合代价必须严格低于零输入组；同时验证实际横向位移、单人 AI 编队/集火/闪避、WebGL 与零应用控制台错误。当前被动样本为 14 点伤害、双机各倒地 1 次；换位样本为 13 点伤害、AI 倒地 1 次，P1 横移 97.3 并以 1 HP 存活，峰值 129 弹。截图写入 `spacescraft-strategy-doctrine/passive.png` 和 `evasive.png`。该对照验证空间反制有实际协作收益，不代表自然 30 分钟或所有玩家策略已经平衡。

### 自适应威胁矩阵测试

正常航行会自动在缓冲、巡航、交锋、激涌和极限五级之间调整压力。首章前 8% 最高只能处于巡航；双机平均耐久低于 52% 同样封顶巡航，低于 34%、任一存活战机低于 29% 或任一队员倒地会强制缓冲。候选状态需连续保持 1.25 秒，且一次只升降一级。检查 HUD 右侧等级/刻度、同色 3D 航道信标、升降级专属音效、配乐节拍/密度变化，以及结算页峰值/调整/累计秒数。

本机可用 `qa-threat=0|1|2|3|4` 强制任一级，不修改正式域名或 Electron 文件协议：

```text
http://127.0.0.1:4173/?qa-fast&qa-path=0&qa-threat=4&seed=2304
```

`#game` 公开 `data-threat-tier`、`data-threat-id`、`data-threat-score`、`data-threat-target`、`data-threat-peak`、`data-threat-changes`、`data-threat-relief-seconds`、`data-threat-apex-seconds` 以及五项战斗倍率；3D Canvas 公开 `data-adaptive-threat="5-tier-telegraphed"`、`data-threat-tier`、`data-threat-color` 和脉冲值。运行：

```bash
npm run smoke:threat
```

脚本先比较缓冲与极限强制端点，再以 1× 时间运行首章前 20 秒；它会断言增援/弹速/开火/耐久单调提高、瞄准误差收紧、WebGL 有效、40 FPS 下限、首章不越过巡航、前六秒零敌弹、普通敌军不超过六架、双机未倒地和零应用控制台错误。当前独立开场峰值为 4 敌/4 弹、双机满耐久，缓冲/极限端点为 49/60 FPS。`relief.png` 与 `apex.png` 写入系统临时目录；该矩阵证明两端接线与开局安全，但不能代替一次正常 1× 长局对自然等级分布、倒地减压和恢复升档的观察。

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

成功输出必须同时包含 `talentPurchase.owned: true`、`talentCount: "1"`、`protocols: "cometDrive"`、`protocolCount: "1"`、大于 0 的 `protocolProcs`、双机 `playerSpeed` 大于 96、`rushActive: "true"`、`rushCount: "1"`、`encounterHistory: "relay:success"`、`rendererState.backend: "three-r185-instanced-voxel"`、`rendererState.artStyle: "toon-glow-light-blocks"`、`rendererState.modelPalette: "saturated-no-black"`、`webgl: true`、`consoleErrors: 0`、接近 60 的 `fps` 和不低于 CSS 显示尺寸的 `hudResolution`；`settledRush` 还必须记录 `rushActive: "false"` 和大于 0 的 `rushLastBonus`。脚本依次生成完整战斗、状态体素和无 Buff 干净机体三张截图。这项测试不能替代可见窗口下对其余六协议、自然构筑/充能、九天赋组合、其余四类目标、Boss 音频、双人和手柄的人工回归。

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
21. 运行 `npm run smoke:biomes`，逐项人工检查九生态截图的三层纵深、偏轴天体、深空负空间、低饱和环境、短弹体拖尾，并确认没有连续地板、成对护栏、中央门架或伪隧道光轨。
22. 运行 `npm run smoke:director`，确认第一章三战区、九事件、四遭遇、两次章中构筑、Boss 接续、60 FPS 目标和零控制台错误。
23. 运行 `npm run smoke:threat`，复核缓冲/极限倍率、HUD、3D 信标、WebGL、帧率和零错误；正常速度抽样观察自然升降档与残血/倒地保护。
24. 运行 `npm run smoke:combat`，复核四段压力节拍、普通敌军状态机、编队集火、预警窗口、弹幕语法、弹量预算、单人 AI 意图和零错误。
25. 运行 `npm run smoke:growth`，比较基础/中期/八选满级的真实射速、齐射密度、终阶触发、低 Bloom 可读性、双机存活和 60 FPS。
26. 运行 `npm run smoke:strategy`，在同种子极限杀伤区比较零输入与预警换位，确认 P1 不恶化且方向决策严格减少双机总受击/倒地，AI 集火、闪避意图成立。
27. 运行 `npm run smoke:arsenal`，复核载荷激光、恒速限角追踪、目标距离爆破、精英耐久、死亡机能、碰撞、持续追猎和非法敌弹 0。
28. 运行 `npm run smoke:boss-state`，逐章复核 phase 3 的真实伤害光束、追踪/爆破技能、有限几何和非法敌弹 0。
29. 更新 `CHANGELOG.md`、[当前项目状态](./PROJECT-STATE.md)、发行说明和相关设计文档。

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
- `src/combat.js`：四段压力节拍、章节/战区曲线、七职责战术、六态循环、六编队和弹幕语法选择。
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
- `scripts/verify-combat.mjs`：验证节拍、曲线、职责、状态转换、编队、弹幕反制、预算与本机 QA 隔离。
- `scripts/verify-renderer3d.mjs`：验证 Three.js 精确依赖、实例化方块、分层深度、相反机头和禁止原生面片/光滑几何回退。
- `scripts/verify-status.mjs`：验证四 Buff、三 Debuff、双语、自动规则与玩法/音频/HUD/3D 接线。
- `scripts/smoke-electron.cjs`：启动隔离的真实 Electron/WebGL 会话，验证方向交互并生成截图。
- `scripts/smoke-biomes.cjs`：逐一强制九个生态，验证 WebGL/视觉诊断/帧率/控制台并生成九张截图。
- `scripts/smoke-director.cjs`：在真实 Electron/WebGL 中压缩运行第一章导演全时线。
- `scripts/smoke-threat.cjs`：在真实 Electron/WebGL 中比较缓冲与极限两端并生成截图。
- `scripts/smoke-combat.cjs`：在真实 Electron/WebGL 中比较开局学习窗口与第三章极限杀伤区并生成截图。
- `scripts/smoke-growth.cjs`：在真实 Electron/WebGL 中比较空构筑、四选中期和八选满级火力并生成低 Bloom 截图。
- `scripts/smoke-strategy.cjs`：在真实 Electron/WebGL 同种子压力场中比较零输入与预警换位的受击、倒地、位移和 AI 意图。
- `scripts/verify-docs.mjs`：检查必需文档、Codex 指令大小和仓库内 Markdown 链接。

完整模块边界与数据流见[系统架构](./ARCHITECTURE.md)。
