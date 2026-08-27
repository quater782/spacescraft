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

此模式仅在 `localhost` 或 `127.0.0.1` 生效，会加速章节时间并降低 Boss 测试耐久，用于快速检查九个事件、三场精英战、Boss 阶段和完整通关路径。测试结果不会写入出航、通关、最高分等生涯统计，也不会在正式域名或 Electron 文件协议下启用。

自动化或人工检查可以读取 `#game` 上的 `data-mode`、`data-language`、`data-stage`、`data-stage-time`、`data-events`、`data-enemies`、`data-boss-phase`、`data-player-hp`、`data-fps` 与 `data-qa` 诊断属性。机库、合约、构筑与远征还提供 `data-frame`、`data-module`、`data-contract`、`data-talents`、`data-talent-count`、`data-score-multiplier`、`data-player-shield`、`data-player-speed`、`data-player-fire-rate`、`data-player-damage`、`data-player-energy-gain`、`data-achievement-count`、`data-stardust-reward`、`data-run-seed`、`data-upgrade-count`、`data-upgrades`、`data-draft-options`、`data-route-signature`、`data-biome`、`data-enemy-variants`、`data-active-builds`、`data-path-plan`、`data-active-path`、`data-path-options`、`data-path-selection`、`data-path-history`、`data-encounter-plan`、`data-active-encounter`、`data-encounter-progress`、`data-encounter-objects` 与 `data-encounter-history`。

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

构筑页同样遵循“只控制方向”的产品约束：左右选择，上下确认；P1 可使用 WASD，P2 可使用方向键。`npm run verify` 会额外检查 15 项升级效果、同种子复现、类别覆盖、满级过滤、早期稀有度权重、叠层和玩法/视觉随机源隔离，并验证 9 种生态、64 种敌军构筑、第一章安全包络与后期模块多样性。

### 星门分支测试

每章开场的三座星门通过实际移动选取：双机驶入同一门并保持 0.68 秒自动锁定；单人 AI 跟随 P1，5.8 秒超时按双机平均位置所在航道自动选择。用固定种子复现三章候选，并用 `qa-path` 强制快速冒烟选择左、中或右门：

```text
http://127.0.0.1:4173/?qa-fast&qa-path=2&seed=20260827
```

`qa-path` 只接受 `0`、`1`、`2`，只在 localhost 生效。检查 `data-path-plan` 的三组计划、选择期间的 `data-path-options`/`data-path-selection`、锁定后的 `data-active-path` 和跨章累积的 `data-path-history`。`npm run verify` 会验证每组恰有支援/火力/高风险各一条、同种子复现、不同种子分化、航道汇合判定、单人 AI 接线、协议模块偏好和第一章危险倍率钳制。

### 动态遭遇测试

默认每章在 30% 与 64% 进度各生成一次目标。用 `qa-encounter` 强制覆盖某一类遭遇；可选值为 `relay`、`salvage`、`courier`、`meteor`、`rift`。陨星与裂隙遵守正式章节门槛，只会从第二章开始替换首个目标：

```text
http://127.0.0.1:4173/?qa-fast&qa-path=1&qa-encounter=salvage&seed=2
```

`qa-fast` 会同比缩短非生存目标量和遭遇时长，奖励规则不变。检查 `data-encounter-plan`、`data-active-encounter`、`data-encounter-progress`、`data-encounter-objects` 和 `data-encounter-history`。第一章必须只出现信标、回收或护航，且同期增援倍率不得高于 1。

项目提供真实 Electron 隐藏窗口冒烟，使用隔离临时存档、本地测试钱包、WebGL 场景和实际方向键事件：先购买“矢量推进器”并截取机库，再验证双机速度提升、完成信标并截取战斗画面：

```bash
npm run smoke:electron
```

成功输出必须同时包含 `talentPurchase.owned: true`、`talentCount: "1"`、双机 `playerSpeed` 大于 96、`encounterHistory: "relay:success"`、`webgl: true`、`consoleErrors: 0`、接近 60 的 `fps` 和不低于 CSS 显示尺寸的 `hudResolution`。这项测试不能替代可见窗口下对九天赋组合、其余四类目标、音频、双人和手柄的人工回归。

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
18. 更新 `CHANGELOG.md`、[当前项目状态](./PROJECT-STATE.md)、发行说明和相关设计文档。

## 架构

- `src/renderer3d.js`：原生 WebGL 渲染、矩阵、着色器和 3D 模型。
- `src/game.js`：固定时间步、关卡、碰撞、AI、音频和 HUD。
- `src/roguelike.js`：局内升级池、确定性 RNG、候选生成和升级效果。
- `src/constellation.js`：九项长期天赋、前置依赖、购买判定、存档清洗和玩家效果。
- `src/expedition.js`：生态航线、星门协议/航道判定、动态遭遇计划/结果判定、敌型权重与模块化敌军组装规则。
- `src/i18n.js`：简体中文/英文文案目录、插值、DOM 与元数据同步。
- `electron/main.cjs`：安全桌面窗口与生命周期。
- `forge.config.cjs`：桌面发行产物配置。
- `scripts/build-icons.mjs`：从 SVG 母版生成多分辨率桌面图标。
- `scripts/verify-localization.mjs`：收集 HTML 与游戏逻辑引用键，验证两种语言完整覆盖。
- `scripts/verify-roguelike.mjs`：验证构筑池、随机复现、权重、满级过滤与全部升级效果。
- `scripts/verify-constellation.mjs`：验证九项天赋、三条依赖、购买门槛、存档清洗与实际属性效果。
- `scripts/verify-expedition.mjs`：验证生态、星门、动态遭遇、敌军组合、早期安全、后期多样性与 3D 集成。
- `scripts/smoke-electron.cjs`：启动隔离的真实 Electron/WebGL 会话，验证方向交互并生成截图。
- `scripts/verify-docs.mjs`：检查必需文档、Codex 指令大小和仓库内 Markdown 链接。

完整模块边界与数据流见[系统架构](./ARCHITECTURE.md)。
