# Codex 工作流

本流程把一次更新从“想法”推进到可验证、可追踪的仓库状态。

## 1. 建立上下文

1. 从根级 [AGENTS.md](../AGENTS.md) 开始，并读取目标目录的局部规则。
2. 阅读[当前项目状态](./PROJECT-STATE.md)、[更新日志](../CHANGELOG.md)与任务专题文档。
3. 检查 Git 状态和相关源码，区分用户已有修改、生成物与本轮范围。
4. 用一句话写出 Major 主题和玩家结果；同一轮的代码、音频、视觉、文档与测试都服务于该主题。

## 2. 按改动类型定位

| 改动 | 首要文件 | 必查回归 |
| --- | --- | --- |
| 玩法、AI、难度、构筑、存档 | `src/game.js` | 固定步、首章难度、自动战斗、单人 AI、迁移 |
| 3D 几何、相机、光照、场景 | `src/renderer3d.js` | WebGL 编译、深度关系、帧率、三档画质 |
| 菜单、HUD、可访问性、矢量图标 | `index.html`, `style.css` | 键盘焦点、响应式、SVG 清晰度、中英文长度 |
| 文案与语言 | `src/i18n.js` | 两种语言、动态 key、ARIA、结算即时重绘 |
| 音乐与音效 | `AudioEngine` | 分层辨识度、独立音量、静音、浏览器首次交互 |
| Electron 与发行 | `electron/`, `forge.config.cjs` | 安全开关、离线载入、版本一致性、产物校验 |

## 3. 实施与验证

- 小步修改源文件，不编辑 `out/`、`dist/` 或 `node_modules/`。
- 先运行 `npm run verify`，再执行与风险相称的实机路径。
- 玩法改动至少检查标题页、正常速度前 20 秒、单人 AI、本地双人和相关 Boss/章节；跨章系统使用固定 `seed` 与 `qa-fast` 复现。
- UI/本地化改动分别从中英文启动，覆盖菜单、机库、战斗、暂停和结算。
- Electron 或发行改动执行桌面启动；只有实际重建并校验后才更新产物路径和哈希。
- 记录失败现象与复现条件；修复后重跑失败路径和相邻高风险路径。

详细清单与 QA 参数见[开发与验证](./DEVELOPMENT.md)，发行步骤见[打包指南](./PACKAGING.md)。

## 4. 文档与版本

- 每轮都更新 `CHANGELOG.md`，把玩家可见变化、技术边界和验证证据分开写。
- 当前能力或缺口改变时更新 `PROJECT-STATE.md`；模块责任改变时更新 `ARCHITECTURE.md`。
- 只有达到完整、可验证的版本闭环时才同步 package、界面版本与 release 文档。开发快照不得复用旧包哈希。
- 发行说明采用 `RELEASE-x.y.z.md`，包含 Major 主题、覆盖范围、技术实现、实机验证、发行物和下一阶段。

## 5. Git 交付

提交前运行：

```bash
git diff --check
npm run verify
git status --short
```

提交信息使用简短祈使语气和类型前缀，例如 `feat: add endless route modifiers`、`fix: rebalance stage one bullets`、`docs: establish Codex knowledge system`。不要把无关用户修改混入提交；不要提交依赖目录、打包目录、日志或本地环境文件。

交付摘要应说明：完成的玩家结果、主要文件、验证结果、当前版本/产物边界和真实未完成项。
