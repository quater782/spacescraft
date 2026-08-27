# 0.17.0 发行说明：Toon 光块锻造

0.17.0 的 Major 主题是把 0.16 的航空/异形轮廓真正落成可售卖方向的卡通像素 3D 美术：舰体不再依赖暗色 PBR，而是使用高饱和多色积木、三阶 Toon 明暗和克制的同色 Glow。模型同时执行奥卡姆剃刀，优先少量大块与清楚轮廓，不用黑色隐藏结构，也不用重复微方块假装细节。本版本代号为 Toon Light Forge，仍不是 Steam 发布候选版。

## Toon + Glow 渲染

- 舰体主体使用 Three.js `MeshToonMaterial`；3×1 单通道 `DataTexture` 提供 72/152/232 三阶亮度，并以 `NearestFilter` 保持硬朗卡通分界。
- 每种颜色拥有缓存的 Toon `InstancedMesh` 批次，紫、蓝、青、粉、红、橙和黄直接成为材质颜色，避开 Electron/Three.js 当前组合下 `instanceColor` 让 Toon 主体发黑的路径。
- Toon 材质加入 0.08 同色自发光下限，暗宇宙中仍能认出机体颜色；完全发亮的弹体/能量核与 5.5% 不透明度的加法 Glow 外壳分别进入独立批次。
- ACES 曝光降至 1.02，并重新标定环境光、半球光、方向光、边缘光与双机点光源，防止高饱和色被压成粉白。
- 3D Canvas 新增 `data-art-style="toon-glow-light-blocks"` 和 `data-model-palette="saturated-no-black"`，桌面冒烟会直接拒绝材质契约回退。

## 少即是多的模型语言

玩家三机体保留航空战斗机必须的长纵轴、尖鼻、低矮截面、后掠翼、尾翼与推进焰，但删除重复装饰条：

- 机鼻固定为四个积木体；单侧主翼最多四块；单侧尾翼两块；单个推进器两块。
- P1 使用蓝/青/紫，P2 使用紫粉/珊瑚红/橙黄，所有主体结构件都来自饱和色板，不含近黑色。
- 武库、纳米维修、神盾和通量 Buff 改成少量贴体炮轨/脊柱/翼缘；霜冻、扰频和裂解改成一条贴合截面的状态带。

敌军继续使用与人类战机完全分离的异形构造器：

- 弯月单侧最多三块；触须以一条规则生成三节渐细彩色器官；眼核压缩为甲壳底座与高亮瞳核两块。
- 七个船体分别使用紫黄、红橙、紫粉、蓝青等高饱和三色组；模块会重塑推进尾、武器颚、核心甲壳、眼阵和载荷脉络，而不是贴黑色外挂。
- 四类玩家弹体和四类敌军弹幕移除白色内芯，按职责保留一至两种彩色体积；拾取核心与环绕节点也统一为有色光块。

## 验证证据

- `scripts/verify-renderer3d.mjs` 检查 `MeshToonMaterial`、三阶红通道梯度、最近邻采样、按色 Toon/Glow 批次、无近黑舰体色及机鼻/翼/尾翼/弯月/触须五项块数预算。
- `npm run smoke:electron` 真实启动隔离 Electron/WebGL2，会验证方向输入完成信标、自动协议与狂潮、六维 7,168 构筑、四 Buff/冰冻状态，以及 Toon+Glow/饱和无黑色诊断。
- 干净机体截图强制 `lancer.rush.sniper.volatile.hunter.fracture`；完整状态截图强制 `carrier.drift.orbit.barrier.oracle.cryo`。人工检查确认双机机头朝航线前方，敌军反向来袭，主体饱和彩色、可见三阶受光且没有过曝或黑色回归。
- 当前宿主的内置浏览器控制运行时存在初始化冲突，未列为通过；使用真实 Electron/WebGL 窗口截图完成视觉回归。

## Windows x64 归档

- 发布归档：`dist/SPACECRAFT-0.17.0-windows-x64.zip`
- ZIP SHA-256：`3bb338758979a731f0d8a4840513e9c3712ed45a8d0769ef330eb4cd64405196`
- EXE SHA-256：`1948ddeaad267a6b35b5c5b87bce239fdc8c6280ff07d4d54f6acef2903117f2`
- ASAR SHA-256：`c5987988d5c72a56cc07dc16d77356f5600ca2164f5be872196f5a9720d9011d`

ZIP 为 157,779,549 字节，EXE 为 244,440,576 字节，ASAR 为 1,095,389 字节；归档含 76 个条目，解压后文件内容为 384,634,405 字节。ASCII 根目录、无 macOS 垃圾文件、`unzip -tq` 完整性及 ZIP 内外 EXE/ASAR 哈希一致性均通过。ASAR 已读取确认为 0.17.0，并包含 Toon+Glow/饱和无黑色诊断、奥卡姆模型构造器、0.17 版本门禁及 365,552 字节的 Three.js 运行模块（SHA-256 `86bcee248b64f44bcfc23c331ae74619061957d59cab040171dcb6fb5900beb6`）。详情见[打包指南](./PACKAGING.md)。

## 尚未解除的发行阻断

- 原生 Windows 10/11 多 GPU、分辨率和双手柄矩阵。
- 正常速度 30 分钟完整航行、全部 Boss/生态/船体组合的长时间稳定性。
- 代码签名、安装器、Steamworks、SteamPipe、成就、云存档与 Overlay。
- Steam 商店 Capsule、预告片、双语商店文案和正式支持资料。
