# 系统架构

## 运行时分层

| 层 | 主要文件 | 责任 |
| --- | --- | --- |
| 产品外壳 | `index.html`, `style.css` | 菜单、设置、机库、构筑、结果页、响应式布局与可访问语义 |
| 游戏模拟 | `src/game.js` | 60 Hz 固定步世界、输入、AI、刷怪、Boss、碰撞、经济、局内构筑和 HUD |
| 构筑规则 | `src/roguelike.js` | 15 项升级定义、确定性随机源、候选权重、满级过滤与玩家效果 |
| 遗物协议 | `src/relics.js` | 7 个两件套配对、激活判定、确定性配套候选注入与自动协同倍率 |
| 状态模块 | `src/status.js` | 4 种拾取 Buff、3 种敌方 Debuff、计时器目录与自动战斗倍率 |
| 长期成长 | `src/constellation.js` | 9 项恒星天赋、三分支前置依赖、存档清洗、购买判定与玩家效果汇总 |
| 爽感循环 | `src/rush.js` | 星链狂潮阈值、六类事件充能、共振增益、温和衰减与自动战斗倍率 |
| 远征导演 | `src/director.js` | 30 分钟章节时长、九战区、事件/遭遇/构筑阈值、强度曲线与 QA 时间倍率 |
| 远征规则 | `src/expedition.js` | 9 种生态、7 种星门协议、5 类动态遭遇、确定性计划/判定、7 个功能船体与推进/武器/核心/AI/载荷六维组装 |
| 3D 渲染 | `src/renderer3d.js` | Three.js WebGL2 透视相机、按颜色缓存的 `BoxGeometry` 实例批次、三阶 Toon/自发光/轻辉光深度层、航空战机构造器、独立异形器官构造器、九生态三层微缩世界与分段弹体拖尾 |
| 本地化 | `src/i18n.js` | `zh`/`en` 目录、变量插值、DOM/元数据/ARIA 同步 |
| 音频 | `AudioEngine` in `src/game.js` | Web Audio 多轨 8-bit 音序、分层 SFX、音量与静音 |
| 桌面壳 | `electron/main.cjs` | 最小权限 BrowserWindow 与应用生命周期 |
| 发行 | `forge.config.cjs`, `.github/workflows/build-windows.yml` | ASAR、桌面图标、Windows 打包和 CI 产物 |

## 一帧的数据流

浏览器输入与手柄状态先进入 `InputManager`；`requestAnimationFrame` 只累计真实时间，世界以 `STEP = 1 / 60` 重复更新。模拟更新玩家/AI、敌人、Boss、弹体、拾取、碰撞、关卡和局内构筑，然后同一世界快照分别交给 WebGL 场景、透明 Canvas HUD、DOM 状态与 Web Audio 反馈。这样显示刷新率不会改变玩法速度。

战役开始时，机体、模组、合约、恒星天赋、模式与设置从 profile 生成运行时玩家参数；永久天赋先按前置关系清洗，再统一叠加到双机和单人 AI 的同一套属性。`SpaceDirector` 把三章固定为 570/600/630 秒，并按相对进度生成每章三个战区、九个编队事件、四个遭遇和两个章中构筑；前两章 Boss 后再提供章间构筑，完整路线共有八次选择。同一枚 run seed 使用不同盐独立固定三章生态、三组三岔星门和每章四个动态遭遇，再驱动敌军六维模块、弹幕、掉落与升级候选。七种船体先定义角色、耐久、半径、得分和主体轮廓，推进、武器、核心、AI 与载荷再同时改变玩法参数与机体结构，形成 7,168 个唯一签名。敌军预算按章节、战区与进度逐层开放后五维；第一章前 40% 固定为 `scout.standard.pulse.light.sentry.clean`，终章才允许普通敌人携带 Debuff。星门每组恰含支援、火力和高风险协议各一条；遭遇从信标、回收、护航、陨星和裂隙规则中按章节安全池抽取，并确定出现进度、航道与几何变体。每次方向控制的共享构筑暂停战斗，确认后章中节点返回原战区，章间节点才推进下一章；基础三选一生成后，遗物协议层检查已持有组件，并在需要时使用同一玩法 RNG 注入一件可配套候选。拾取物在提供既有效果后还会按类型自动激活 `SpaceStatus` Buff，敌方载荷命中后写入短时 Debuff；两者都由固定步倒计时，不增加输入。模拟层推进目标、碰撞、成功/失败和共享奖励；击破、精英、拾取、遭遇、救援与 Boss 阶段同时向不消耗 RNG 的星链计量器发出事件，双机共振还按固定步持续充能，满槽后自动启动狂潮。Three.js 渲染器只读取世界快照，用共享 `BoxGeometry` 和按颜色缓存的动态 `InstancedMesh` 组合全部可见实体；玩家向航线前方，使用细长机身、低矮截面、连续阶梯薄翼与航空尾翼；敌军绕 Y 轴 180° 朝向玩家，使用完全独立的弯月骨翼、分叉颚、甲壳、触须与眼阵构造器，功能模块改写这些主体器官而非悬浮外挂。每个实体颜色使用最近邻三阶 `DataTexture` 驱动 `MeshToonMaterial`，低强度同色自发光保证暗场可读；全亮能量件和整体放大的加法 Glow 外壳进入独立深度层。九战区的流动门架、边缘光强、刷怪预算和 8-bit 调性抬升读取同一战区状态。表现随机源不会扰动后续玩法序列。任务结束后只把长期生涯、星尘、解锁、天赋、合约与设置写回存档，临时状态留在本次航行。

九个生态各自拥有渲染构造分支；近景航标、中景生态件和远景地标通过 `streamZ` 循环向镜头推进。弹体沿速度朝向绘制最多三节渐缩拖尾，低画质压缩为一节；命中粒子按速度拉伸。这些表现系统只读取模拟状态与渲染时间，不消耗玩法随机源。

## 清晰度与坐标空间

游戏模拟与 HUD 保持 480×270 逻辑坐标，确保碰撞、布局和像素节奏稳定。3D WebGL 与透明 HUD Canvas 各自按 CSS 显示尺寸和设备像素比建立高清缓冲区；HUD 绘制前用变换映射回逻辑坐标，因此窗口和全屏放大不会再把 480×270 字形直接拉伸。`data-hud-resolution` 与 `data-hud-scale` 用于观察实际缓冲分辨率。

## 状态与持久化

- localStorage key 为 `spacecraft-career-v1`；内部 profile `version` 当前为 5。
- v5 保存生涯统计、星尘、机体/模组解锁、九节点恒星天赋、合约通关、勋章、模式和可访问性/音量/语言设置。
- `loadProfile()` 通过默认值合并、合法 ID 过滤、数值钳制和语言回退迁移旧记录；解析或存储失败时安全回到本地默认值。
- 静音还兼容独立 key `spacecraft-muted`。当前没有账户、网络后端或云存档。

## 观察与测试接口

`#game` Canvas 的 `data-*` 属性公开模式、语言、章节、事件、Boss 阶段/攻击/状态/蓄力、敌人数/敌弹数、玩家耐久、FPS、QA 状态、装备、合约、天赋、倍率、构筑、协议、Buff/Debuff、六槽/7,168 构筑目录、生态、星门、遭遇、狂潮、HUD 分辨率和奖励等稳定摘要。远征导演额外公开 `data-run-target-seconds="1800"`、全局/章内战区、战区转场、事件、遭遇、构筑次数和构筑上下文。3D Canvas 公开 `data-renderer="three-r185-instanced-voxel"`、`data-art-style="toon-glow-light-blocks"`、`data-model-palette="saturated-no-black"`、`data-model-families="3-player-7-alien"`、`data-module-anatomy="integrated-large-form"`、`data-boss-families="3-organic-phase-forms"`、`data-boss-choreography="telegraph-state-arena"` 与 `data-expedition-sectors="9-progressive-voxel-gates"`。`smoke:director` 在真实 Electron/WebGL 中压缩运行一章，验证三战区、九事件、四遭遇、两次章中构筑、Boss 接续、帧率和控制台。

3D Canvas 还公开 `data-world-depth-layers="3"`、`data-biome-dioramas="9"` 与 `data-projectile-vfx="segmented-toon-trails"`。仅本机有效的 `qa-biome=<id>` 可以强制九个生态之一；`scripts/smoke-biomes.cjs` 逐项启动真实 Electron/WebGL、断言 45 FPS 下限与零控制台错误并生成截图。

完整用法见[开发与验证](./DEVELOPMENT.md)。改变模块所有权、存档边界、固定步模型或桌面安全模型时，同步更新本文。
