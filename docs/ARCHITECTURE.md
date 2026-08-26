# 系统架构

## 运行时分层

| 层 | 主要文件 | 责任 |
| --- | --- | --- |
| 产品外壳 | `index.html`, `style.css` | 菜单、设置、机库、构筑、结果页、响应式布局与可访问语义 |
| 游戏模拟 | `src/game.js` | 60 Hz 固定步世界、输入、AI、刷怪、Boss、碰撞、经济、局内构筑和 HUD |
| 构筑规则 | `src/roguelike.js` | 15 项升级定义、确定性随机源、候选权重、满级过滤与玩家效果 |
| 3D 渲染 | `src/renderer3d.js` | WebGL 透视相机、网格、深度、光照、雾、粒子与三章场景 |
| 本地化 | `src/i18n.js` | `zh`/`en` 目录、变量插值、DOM/元数据/ARIA 同步 |
| 音频 | `AudioEngine` in `src/game.js` | Web Audio 多轨 8-bit 音序、分层 SFX、音量与静音 |
| 桌面壳 | `electron/main.cjs` | 最小权限 BrowserWindow 与应用生命周期 |
| 发行 | `forge.config.cjs`, `.github/workflows/build-windows.yml` | ASAR、桌面图标、Windows 打包和 CI 产物 |

## 一帧的数据流

浏览器输入与手柄状态先进入 `InputManager`；`requestAnimationFrame` 只累计真实时间，世界以 `STEP = 1 / 60` 重复更新。模拟更新玩家/AI、敌人、Boss、弹体、拾取、碰撞、关卡和局内构筑，然后同一世界快照分别交给 WebGL 场景、透明 Canvas HUD、DOM 状态与 Web Audio 反馈。这样显示刷新率不会改变玩法速度。

战役开始时，机体、模组、合约、模式与设置从 profile 生成运行时玩家参数。章节结束进入方向控制的三选一构筑；确定性 run seed 只驱动敌人、弹幕、掉落与候选等玩法随机，星空、粒子和随机音色使用独立来源，不会扰动后续玩法序列。任务结束后只把长期生涯、星尘、解锁、合约与设置写回存档，局内升级留在本次航行。

## 清晰度与坐标空间

游戏模拟与 HUD 保持 480×270 逻辑坐标，确保碰撞、布局和像素节奏稳定。3D WebGL 与透明 HUD Canvas 各自按 CSS 显示尺寸和设备像素比建立高清缓冲区；HUD 绘制前用变换映射回逻辑坐标，因此窗口和全屏放大不会再把 480×270 字形直接拉伸。`data-hud-resolution` 与 `data-hud-scale` 用于观察实际缓冲分辨率。

## 状态与持久化

- localStorage key 为 `spacecraft-career-v1`；内部 profile `version` 当前为 4。
- v4 保存生涯统计、星尘、机体/模组解锁、合约通关、勋章、模式和可访问性/音量/语言设置。
- `loadProfile()` 通过默认值合并、合法 ID 过滤、数值钳制和语言回退迁移旧记录；解析或存储失败时安全回到本地默认值。
- 静音还兼容独立 key `spacecraft-muted`。当前没有账户、网络后端或云存档。

## 观察与测试接口

`#game` Canvas 的 `data-*` 属性公开模式、语言、章节、事件、Boss 阶段、敌人数、玩家耐久、FPS、QA 状态、装备、合约、倍率、构筑、HUD 分辨率和奖励等稳定摘要。本地参数 `qa-fast`、`qa-wallet`、`qa-contracts`、`qa-draft` 与 `seed` 用于复现测试；会改变进度或钱包的开关只在 localhost/127.0.0.1 生效。

完整用法见[开发与验证](./DEVELOPMENT.md)。改变模块所有权、存档边界、固定步模型或桌面安全模型时，同步更新本文。
