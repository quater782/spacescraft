# 3D 像素视觉方向

本规范是场景、玩家、敌军、模组、弹体和后处理的共同美术约束。目标不是把低分辨率画面放大，而是在真实 WebGL 3D、透视与光照中使用清楚的大颗粒几何，得到可读、克制、会发光的立体像素风。

## 当前方向：像素实体、曲面燃烧与固定模块

2026-09-10 用户再次明确：像素风不能丢。实体统一采用阶梯轮廓、硬切面与三阶明暗；细节通过甲片、栅格、接缝、识别条和独立模块补足。曲面燃烧继续保留，瞄准与连线使用克制的渲染细线；不再将实体处理成圆润倒角与写实高光。

策划追溯以[空战高压设计基线](./COMBAT-DESIGN.md)的六维构筑和[可恢复远征](./PROGRESSION.md)的成长所有权为依据。仓库未找到单独命名的 PRD；若另有外部 PRD，仍需对照，不把本次修改声称为该外部文档的验收。

| 层级 | 当前表现方式 | 功能与限制 |
| --- | --- | --- |
| 船体 | 阶梯陶瓷面、深色金属接缝、像素座舱、进气栅格与识别条 | 三阶色带和暗缝解释厚度；避免随机堆块 |
| 生物甲壳 | 阶梯轮廓配分层背甲、像素眼核和关节 | 保留原生种轮廓、扑翼、伞体与触须动态 |
| 燃烧 | 12 段旋转曲面和时间驱动着色器 | 弯曲收束、颜色过渡、明暗流动、透明尾端；不参与碰撞 |
| 瞄准 | 原生 `LineSegments` 断续线 | 读取实际激光射线，不受 0.12 体素最小宽度限制 |
| 激光 | 连续圆截面双边、热芯和沿射线运动的能量段 | 保留实际起终点，时间控制脉动；沿用伤害规则 |
| 弹道与共振 | 细线拖迹、连续中心线和轻微高度波动的侧丝 | 弹头保持判定位置，连线主干沿实际伤害线，不制造侧向假判定 |

六维构筑中，船体拥有前部武器、后部推进、背部核心、前上方 AI 和侧部载荷五个独立安装位；十六种船体分别配置位置。模块本体跟随已装配的稳定 ID，招式切换仅改变姿态、后坐和发光，不把已装的激光器突然变成脉冲炮。原生招牌器官属于船体，保留与通用武器模块共存。

- 四推进：常规双喷口、摆动导流翼、加力推进器、侧向矢量喷口。
- 七武器：单管脉冲、双联、狙击导轨、环形发射器、激光双轨、四孔追踪弹巢、开瓣爆破腺体。
- 四核心：轻核、双片装甲、带能量球的屏障环、带约束夹的爆裂核；屏障耗尽时能量球变暗。
- 六 AI：单镜哨兵、双镜猎手、偏置侧袭镜、预测环、三镜集群和遮罩伏击器。
- 四载荷：无载荷、冷却舱、双片干扰器、三齿破甲件；有载荷时可看到通向武器的细管。
- 四玩家核心：通量线圈、两侧护盾发生器、双舱维修组件、双环共振天线。永久研究和临时 Buff 的所有权继续按游戏规则处理。

`src/render-surfaces.js` 缓存五类几何、六种材质及有容量上限的实例批次；线缓冲区复用，着色器时间读取模拟时钟，不增加运行时依赖。新增 `data-energy-geometry="curved-flame-native-lines-round-beams"`、`data-module-identity="fixed-six-slot-hardpoints"`、`data-surface-batches`、`data-surface-dropped` 和 `data-rendered-line-vertices`。实体方向另由 `data-enemy-art-direction="pixel-solid-curved-combustion"` 和 `data-solid-material="four-pixel-toon-ramps"` 标记。旧体素诊断保留兼容，不能据此推断全部几何仍为方块。

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
- 原有体素主体保持 0.12 最小边长和 0.04 步长；新增实体细节尺寸按 0.04、局部位置按 0.02 量化。座舱和眼核由十九格阶梯体组成，实体环为无倒角阶梯挤出。曲面燃烧和渲染线不套用实体粒度下限。
- 所有实体体素都有同色自发光下限，并进入 3.8% 不透明度的略大加法 Glow 壳；它只让每块像素边缘“带电”，不能把固有色冲成白色。
- 旧 HDR 体素批次只用于功能光源；新座舱和眼核主要使用深色三阶色带，尾焰使用独立透明曲面。Unreal Bloom 使用五级模糊链、1.03 亮度阈值、0.30 强度和 0.10 半径，显示白以下的陶瓷装甲、环境岩体与普通甲壳不得触发 Bloom。
- 实体统一使用三阶 Toon；陶瓷、金属、甲壳和座舱分别配置明暗色带，最近邻采样保持色阶边界。禁用实体 PBR 高光、清漆和圆润倒角，有限色阶承担质感区分。
- 屏幕边缘保持抗锯齿，实体轮廓保留阶梯，燃烧允许曲面；“像素化”不等于关闭抗锯齿。

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

- 70% 灰蓝/暖灰哑光陶瓷阶梯面，20% 玩家识别色，10% 深色座舱和功能核心；陶瓷值域必须低于 Bloom 阈值，不能在实战中冲成粉白。
- P1 使用深蓝与青色；P2 使用酒红与珊瑚红。两者共享人类风筝形语法：长鼻、薄翼、清楚尾焰。
- 模组嵌入背脊、翼根或护盾肩，不悬浮，不给主体增加第三套装饰色；以线圈、发生器、维修舱、天线等实体结构区分。四种模组必须从轮廓位置而非碎块数量辨认。
- 机体追求少而完整的大块面。单侧翼与尾翼不得靠多层重复小方块堆厚。
- 护盾使用围绕机体的四片开放弧形护壳，吸收时局部亮起，耗尽时向外碎裂；耐久 ≤60% 出现焦痕和烟迹、≤30% 增加灼红裂痕，维修后随实际耐久恢复；共振光链使用低白度青色连续主干和细线侧丝，不得盖过舰体。

### 敌军

- 70% 深紫甲壳，20% 血红结构，10% 酸性黄绿眼核/武器尖端。
- 使用新月、甲壳、分叉颚、触须、眼核和不对称重心；禁止复用玩家机鼻、机翼和尾翼构造器。
- 酸性颜色只能出现在眼睛、尖端、核心和弹体载荷，不得铺满大翼面。
- 七类通用船体以针刺、甲虫、星镰、水母、双枪、母巢和新月剪影区分职责；九个生态原生种再分别以蜜露蛾翼、棱晶魟鳍、彗潮撞角、极光吸能须、雷轨甲壳、云礁伞体、蚀影双镰、墓园镜棱和虚空孢囊建立大尺度识别。航行、武器、核心、AI 与载荷模块改写表面脉络、尾器官、口器、甲壳缝与眼阵，不能表现成散落积木或人类外挂武器。

三套 Boss 只看轮廓也必须成立：花瓣母巢使用六瓣放射体，熔炉脊兽使用纵向脊柱与肩塔，虚空冠使用中央裂隙和双镰体。中性画廊负责证明本体差异，telegraph 实战负责证明攻击预告，不能用蓄力泛光掩盖模型。

稳定诊断：`data-faction-language="human-kites-vs-void-organisms"`、`data-player-modules="4-integrated-silhouette-parts"`、`data-enemy-module-language="surface-organs"`、`data-player-material-separation="ceramic-core-engine"`、`data-hull-exposure="matte-ceramic-no-bloom"`、`data-shield-language="segmented-shell-hit-break"`、`data-boss-gallery-view="neutral-silhouette"`。

## 弹体

- 玩家弹头统一采用逐格设计、带厚度的三维像素图形：普通弹为方头阶梯短矢，相位弹为分叉贯穿刃，僚机追踪弹为翼状短镖，重弹为宽肩弹。P1 青绿、P2 珊瑚，相位青蓝、追踪紫、重弹琥珀；不使用圆润眼核网格、白亮光珠或圆管拖尾。
- 敌弹使用珊瑚红像素主体、深紫切口和嵌入式亮核。普通种刺、双颚、针枪、旋镰、弯刃、横向弹墙、叉形追踪弹、种雷、爆破种与三种 Boss 弹分别有独立轮廓；载荷只替换内部核心色（冰冻青、干扰粉紫、破甲橙），不添加会误导碰撞的游离外核。高对比模式统一黄体、深红边与白芯。
- 种雷和爆破种在实际引信进度 65% 后切换开裂像素帧；追踪弹在实际制导窗口结束后收翼并熄掉感知亮核；旋镰/种雷/虚空弹仅将装饰旋转采样为 12 帧，位置、速度与碰撞继续读取真实模拟。
- `src/projectile-art.js` 将每种轮廓和三色板一次合并成共享三维网格；每枚弹仅写入一个实例，单组合容量 512。顶面、侧面和底面使用离散色阶，弹头不使用 Bloom 壳；低画质也保留全部识别细节。特殊弹的短拖迹为低亮原生线，普通弹依靠像素尾端表达方向。
- 普通射击不得用一条线连接敌机和玩家；口器蓄力、局部警戒环和弹体朝向已经足够。只有瞬发激光可显示跨屏方向预警，使用细窄断续刻度贯穿实际射线方向，不能在玩家处终止成牵引绳，也不能靠加粗或过曝冒充清晰度。实体激光必须沿真实伤害段显示双侧能量边缘、连续热芯与沿方向运动的能量包；有限追踪弹使用偏转尾迹，范围爆破种以对应实际半径的断续危险环区分飞行与引爆阶段，撞角单位则用机鼻前方的短距离冲锋箭头。
- 死亡机能沿原机体器官语言发射扇片、交叉、种荚或爆震，精英只放大主体和局部能量强度，不允许用全身白光代替危险等级。
- 弹体要比环境更饱和，但不能用贯穿画面的长光轨制造伪隧道。

稳定诊断：`data-projectile-readability="dim-friendly-hot-hostile"`、`data-bullet-grammar="locked-safe-lanes-curves-mines-lasers-seekers-blasts"`、`data-projectile-art="extruded-pixel-stamps"`、`data-projectile-batches`、`data-projectile-dropped`。

## 实机验收

1. `npm run smoke:models`：同屏检查三架玩家与十六类敌军的剪影、色组、陶瓷/能量材质分离与表面器官模块归属。
2. `npm run smoke:biomes`：逐一检查九生态是否能仅凭巨型剪影辨认，中心 55% 是否留白，是否存在远景/中景/星云视差与连续分段曲线，同时排除连续地板、护栏或屏幕中心门架。
3. `npm run smoke:anomalies`：逐一检查九异象是否为偏轴局部天象，且第一章正常速度仍可读、可躲避。
4. `npm run smoke:arsenal`：分别检查真实激光、追踪、爆破、死亡机能、精英与实体撞击的视觉判定一致性。
5. `npm run smoke:electron`：检查真实自动战斗中的敌我弹体、近景机体、选择性 Bloom、SMAA、帧率和控制台。
6. `npm run smoke:projectiles`：20 个敌我弹体/状态样本、真实尺寸/2.8 倍细节图、高对比/低画质、192 枚渲染密度夹具以及正常首章 20 秒；放大图和密度夹具不代表正式弹体大小或自然弹量。
7. `npm run verify`：完成静态结构、本地化、渲染契约和依赖验证。
