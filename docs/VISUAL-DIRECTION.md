# 3D 像素视觉方向

本规范是场景、玩家、敌军、模组、弹体和后处理的共同美术约束。目标不是把低分辨率画面放大，而是在真实 WebGL 3D、透视与光照中使用清楚的大颗粒几何，得到可读、克制、会发光的立体像素风。

## 参考研究

本轮从 ArtStation 项目中提取构图与形体原则，不复制具体资产：

- [Voxel Ship — John Kearney](https://johnkearney.artstation.com/projects/LNJVr)：远距离先读出完整船体轮廓，体素服务于大形，不用碎块制造复杂感。
- [Voxel Sci-Fi Drone — John Kearney](https://johnkearney.artstation.com/projects/lbqqG)：少量高亮核心可以说明功能，主体仍由统一材质和有限色组控制。
- [Voxel Foliage and Lighting Tests — John Kearney](https://johnkearney.artstation.com/projects/rREJRe)：大块体素、分层光照和背景负空间共同建立深度。
- [Neon Harbor: Voxel Art](https://www.artstation.com/artwork/K3wJ5B)：夜景发光依靠明暗层级与局部霓虹，不靠整屏高饱和。
- [Space Trawler](https://www.artstation.com/artwork/bl9den)：Blockbench 低模飞船以功能分区和剪影组织有限几何。
- [Alien Organic Space Station](https://www.artstation.com/artwork/oJg944)：商业主视觉先用单一强剪影、纵向核心和外层附肢建立异形身份，再让小型发光器官解释尺度。
- [3D SEN Key Art](https://daniellieske.artstation.com/projects/4N4KoY)：面向 Steam Capsule 的体素画面依靠多层渲染与合成分离实体、能量和气氛，而不是把所有表面一起提亮。
- [Voxel Space Station Environment](https://voxelaliens.artstation.com/projects/KeQ1Px)：大型空间站以连续分段结构和留白形成尺度，不用均匀小方块填满轮廓。
- [Voxel Neon Building](https://www.artstation.com/artwork/zA0YZm)：霓虹只占结构中的少数功能线，暗部仍保留可辨材质和体量。

最终结论：像素感来自统一粒度、明确轮廓和有限色阶；清晰度来自原生分辨率与后处理边缘抗锯齿；发光感来自克制的每体素轮廓辉光和只作用于能量器官的 HDR Bloom。三者不能用整屏最近邻放大、全屏泛光或碎块堆砌互相替代。

## 渲染语法

- WebGL 使用原生 CSS 像素采样；高画质设备像素比上限为 1.5，平衡档为 1，低档为 0.72。离屏合成使用 SMAA，避免 EffectComposer 绕开默认帧缓冲多重采样后重新出现锯齿。
- 所有体素边长至少为 0.12 世界单位，并按 0.04 步长量化。禁止用 0.03–0.08 的细碎方块假装细节。
- 所有实体体素都有同色自发光下限，并进入 3.8% 不透明度的略大加法 Glow 壳；它只让每块像素边缘“带电”，不能把固有色冲成白色。
- 只有座舱、引擎、眼核、口器、裂缝和天体能量环进入 1.65× HDR 能量批次。Unreal Bloom 使用五级模糊链、1.03 亮度阈值、0.30 强度和 0.10 半径，显示白以下的陶瓷装甲、环境岩体与普通甲壳不得触发 Bloom。
- 实体使用三阶 Toon 明暗。高光由大块面转折产生，不在表面撒噪点或棋盘格。
- 屏幕边缘必须平滑，几何边界必须粗颗粒；“像素化”不等于关闭抗锯齿。

稳定诊断：`data-pixel-grammar="coarse-emissive-012"`、`data-energy-bloom="unreal-selective-5mip"`、`data-edge-aa="native-smaa"`、`data-ring-grammar="continuous-segmented-arcs"`。

## 深空构图

- 画面至少 55% 保持深色负空间；星点分为三层视差，不能铺成均匀噪声。
- 禁止连续地板、导航网格、左右成对护栏、贯穿画面的门架和周期性透视线；任何透视地面都会重新制造隧道感。
- 行星、奇点、遗迹和异象放在偏轴远景，不占据中央射击通道；同屏大型地标原则上只有一个。
- 生态件使用低饱和海军蓝、灰紫和冷岩色。生态原色只作为局部边缘或核心，不与敌军争夺饱和度。
- 异象必须是局部天象：短脉冲、偏轴环、远景极光、稀疏晶体。禁止把力场画成左右对称的跑道或隧道。

每个生态使用同一套远中近构图纪律，但不共用同一画面模板：巨型身份剪影在左侧、右侧和顶部安全区之间交替，占画面约 18–25%；更远一层的行星、彗核、碎月或云胞放到主体相对侧，形成斜向尺度关系；近景只保留两个远距航标。战斗中心 55% 不放门架、地标或连续装饰。远景不是静态贴图，而是拥有真实世界坐标、雾衰减和缓慢视差的 3D 体素；背景生态严格限制在 -48 至 -18 的世界深度带，不能按旧航道取模进入玩家层。背景另有两层运行时生成的软圆点星云，移动速度低于三层全画幅星点；它只建立低亮色雾，不替代体素主体，也不参与碰撞。

| 生态 | 巨型远景身份 | 中景生态与局部高光 |
| --- | --- | --- |
| `sugarBloom` | 双叶发光种荚母巢 | 少量孢子环与幼体种荚；琥珀只用于缝隙和核心 |
| `crystalOrchard` | 三叉水晶冠冕 | 两簇低饱和晶苗；冷白只落在晶尖 |
| `cometTide` | 圆核彗星巨兽与三段尾迹 | 两枚不同航向的小彗核；蓝青只用于冻结核和尾流 |
| `auroraFoundry` | 菱形工业骨架与双层极光轨 | 两座偏轴遗迹塔；青色只标记内轨和反应核 |
| `thunderWorks` | 双层电磁线圈与离散电弧 | 两座避雷遗迹；金色只标记电弧和线圈核心 |
| `cloudReef` | 五枚带断续发光膜的星云胞礁 | 两枚游离云胞；暖白只标记胞核，橙色膜与蓝灰胞体分层 |
| `eclipseCarnival` | 带双层日冕的蚀月 | 两段断裂信标；珊瑚色只标记日冕和残余灯 |
| `prismGrave` | 高低错落三碑与两段断裂拱门 | 两簇低矮墓晶；高亮只落在碑顶和拱门内缘 |
| `voidGarden` | 双吸积环奇点与三条弯折虚空枝 | 两株远距幼枝；青紫只标记枝尖和吸积环 |

稳定诊断：`data-space-composition="open-celestial-parallax"`、`data-ecosystem-composition="9-macro-mid-sparse"`、`data-combat-negative-space="center-55-clear"`、`data-nebula-parallax="3d-additive-dust"`、`data-sky-atmosphere="layered-soft-voxel-nebula"`、`data-ground-plane="none-open-space"`、`data-depth-scaffolding="macro-mid-distant"`、`data-macro-layout="alternating-edge-anchors"`、`data-celestial-scaffolding="opposed-biome-horizon-bodies"`。

## 阵营识别

### 玩家

- 70% 灰蓝/暖灰哑光陶瓷连续面，20% 玩家识别色，10% 深色座舱和功能核心；陶瓷值域必须低于 Bloom 阈值，不能在实战中冲成粉白。
- P1 使用深蓝与青色；P2 使用酒红与珊瑚红。两者共享人类风筝形语法：长鼻、薄翼、清楚尾焰。
- 模组嵌入背脊、翼根或护盾肩，不悬浮，不给主体增加第三套装饰色；常规状态只露出一个凹入式功能灯。四种模组必须从轮廓位置而非碎块数量辨认。
- 机体追求少而完整的大块面。单侧翼与尾翼不得靠多层重复小方块堆厚。
- 护盾只使用四片贴翼表面板，不再使用八颗悬浮白点；共振光链使用低白度青色分节，不得盖过舰体。

### 敌军

- 70% 深紫甲壳，20% 血红结构，10% 酸性黄绿眼核/武器尖端。
- 使用新月、甲壳、分叉颚、触须、眼核和不对称重心；禁止复用玩家机鼻、机翼和尾翼构造器。
- 酸性颜色只能出现在眼睛、尖端、核心和弹体载荷，不得铺满大翼面。
- 七类船体先以针刺、甲虫、星镰、水母、双枪、母巢和新月剪影区分职责；五个功能模块改写表面脉络、尾器官、口器、甲壳缝与眼阵，不能表现成散落积木或人类外挂武器。

三套 Boss 只看轮廓也必须成立：花瓣母巢使用六瓣放射体，熔炉脊兽使用纵向脊柱与肩塔，虚空冠使用中央裂隙和双镰体。中性画廊负责证明本体差异，telegraph 实战负责证明攻击预告，不能用蓄力泛光掩盖模型。

稳定诊断：`data-faction-language="human-kites-vs-void-organisms"`、`data-player-modules="4-integrated-silhouette-parts"`、`data-enemy-module-language="surface-organs"`、`data-player-material-separation="ceramic-core-engine"`、`data-hull-exposure="matte-ceramic-no-bloom"`、`data-shield-language="four-hugging-plates"`、`data-boss-gallery-view="neutral-silhouette"`。

## 弹体

- 玩家普通弹是低亮玩家色短矢，不再携带会连成灯珠轨道的白色核心；相位、追踪和重弹才允许白芯与第二段短拖尾。只有明确的狙击/长枪职责可以使用长轴。
- 敌弹统一使用珊瑚红主体、紫色倒刺和少量酸性载荷核，形成生物种子、双联颚、旋转叉或狙击刺。
- 弹体要比环境更饱和，但不能用贯穿画面的长光轨制造伪隧道。

稳定诊断：`data-projectile-readability="dim-friendly-hot-hostile"`。

## 实机验收

1. `npm run smoke:models`：同屏检查三架玩家与七类敌军的剪影、色组、陶瓷/能量材质分离与表面器官模块归属。
2. `npm run smoke:biomes`：逐一检查九生态是否能仅凭巨型剪影辨认，中心 55% 是否留白，是否存在远景/中景/星云视差与连续分段曲线，同时排除连续地板、护栏或屏幕中心门架。
3. `npm run smoke:anomalies`：逐一检查九异象是否为偏轴局部天象，且第一章正常速度仍可读、可躲避。
4. `npm run smoke:electron`：检查真实自动战斗中的敌我弹体、近景机体、选择性 Bloom、SMAA、帧率和控制台。
5. `npm run verify`：完成静态结构、本地化、渲染契约和依赖验证。
