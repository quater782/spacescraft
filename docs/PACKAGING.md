# 桌面与 Windows EXE 打包

## 2026-09-21 — 0.29.0 正式发行链

`v0.29.0` 已由[桌面工作流 #35521929067](https://github.com/quater782/spacescraft/actions/runs/35521929067)生成 Windows x64 安装器、Windows x64 免安装 ZIP、Apple Silicon macOS arm64 DMG 及两份平台 SHA-256 清单，并从两个桌面包内完成动态启动检查；附件见[v0.29.0 Release](https://github.com/quater782/spacescraft/releases/tag/v0.29.0)。标签分发的 Pages 构建和 WebGL 冒烟通过，但环境规则拒绝标签部署；确认 `main` 与标签同一提交后，[main Pages 运行 #35522214705](https://github.com/quater782/spacescraft/actions/runs/35522214705)成功部署网页端。

## 2026-09-18 — 0.28.0 正式网页发行链

`.github/workflows/deploy-pages.yml` 在手动触发或正式 Release 发布时运行完整验证，以对应 ref 执行 `npm run stage:web`，并从 `dist/web` 进行 WebGL2、菜单、机库、设置、中英切换及快速自动战斗冒烟；全部通过后由 GitHub Pages 部署到 <https://quater782.github.io/spacescraft/>。

网页产物沿用桌面版的依赖闭包解析器，包含入口、CSS、favicon、生产脚本及实际使用到的 Three.js build/postprocessing/shader 模块，不携带 Electron、文档、测试脚本或完整 `node_modules`。浏览器存档仅属于该站点 origin；网页端不提供云存档或网络联机。

## 2026-09-18 — 0.28.0 正式桌面发行链

推送 `v*` 标签会触发 `.github/workflows/build-windows.yml`：先在 Ubuntu 执行完整 `npm run verify`，再分别在 Windows x64 与 Apple Silicon macOS arm64 构建。标签发布只有在两个桌面任务全部完成后才会创建 GitHub Release 草稿；发行文件逐个上传并在短暂网络故障时最多重试四次，全部成功后才转为稳定公开版。

0.28.0 目标附件：

- `SPACECRAFT-0.28.0-windows-x64-Setup.exe`
- `SPACECRAFT-0.28.0-windows-x64-portable.zip`
- `SPACECRAFT-0.28.0-macOS-arm64.dmg`
- 两份 `SHA256SUMS-*.txt`

两个平台先由 Forge 的裁剪后钩子检查 HTML 与 import/export 资源闭包，再从产物内 `app.asar` 以正式 `file://` 打开菜单、机库、设置、中英切换和真实 WebGL2；随后测试进程把同一 ASAR 临时映射到 `127.0.0.1`，通过只在 localhost 生效的快速模式确认航线、双机存活与自动发弹。QA 参数不会在正式域名或 Electron 文件协议生效。

Windows 安装器使用 Squirrel，主进程通过 `electron-squirrel-startup` 处理安装、更新和卸载调用；免安装 ZIP 必须完整解压，不能只复制 `SPACECRAFT.exe`。macOS 只发布 Apple Silicon arm64，当前没有 Developer ID 签名或 Apple 公证。

## 2026-09-08 — 桌面启动依赖修复（fix1）

本次主题：恢复桌面包的 3D 初始化和菜单交互，并将当前完整源码上传至私有仓库 `quater782/spacescraft`。

旧 Windows 包遗漏 `three.core.min.js`，通过真实 Electron 使用 `file://` 加载旧 ASAR 复现 `ERR_FILE_NOT_FOUND` 与 `SpaceRenderer3D is not defined`，游戏在绑定按钮前终止。修复 Forge 过滤规则；新增 `verify-package.cjs` 遍历 HTML 入口和 import/export 依赖链，校验 33 个实际浏览器资源，接入 `npm run verify`、打包裁剪完成钩子和 NSIS 构建入口。旧包会被检查明确拒绝。

修复后的 Windows ASAR 在 macOS Electron 44 下离线检查通过：菜单、机库、设置、切换英文、首航教学、真实 WebGL2 与正常章节时间 20.53 秒，双机 7/7 HP、各 141 次射击、60 FPS、零应用/资源错误；实战截图已检查。测试采用隔离存档，等待实际章节时间，避免把开场选路时间算作战斗。`npm start` 已启动桌面壳。该检查不是在用户 PC 上执行，不证明 Windows 显卡、安装或卸载兼容性。

安装快照维持 0.27.0，重新生成时带 `fix1` 文件后缀，避免继续下载旧 EXE。Windows CI 增加打包后 `smoke:packaged`，首次运行结果待核对。此前 2026-09-07 安装包存在上述启动缺陷，不应继续使用；历史构建成功不等于游戏可用。


## 2026-09-07 Windows x64 安装快照

本次主题：交付当前源码的单文件 Windows 安装器，版本仍为 0.27.0 开发快照。使用 Forge 相同 packagerConfig 与缓存 Electron 44.0.0 重建 Windows x64 应用；新增 NSIS 中英文安装向导、当前用户安装、桌面/开始菜单快捷方式和系统卸载入口。卸载只移除打包文件，保留外部游戏存档和用户额外文件。

安装器构建入口：先生成 Windows 应用目录，再安装 NSIS 并运行 `node scripts/build-windows-installer.mjs`。本机使用 Homebrew 官方 `makensis` 3.12；此路径无需 Wine/Mono，不改变现有 Squirrel 工作流。产物为 `dist/SPACECRAFT-0.27.0-snapshot-20260907-windows-x64-Setup.exe`。包内元数据 0.27.0 与最新 research.js 已读取确认。

本轮 `npm run verify` 的本地规则与双语检查通过，在线依赖审计因 DNS 失败，完整命令未通过。未配置 Windows 代码签名；当前没有 Windows 实机，安装、卸载和游戏启动未实机验证。下方旧 Windows 产物说明是本次打包前的历史记录。完整三章与手柄验证边界继续保留。


## 2026-09-07 macOS 安装快照

本次主题：将当前可恢复远征源码交付为 Apple 芯片 Mac 可安装 DMG。版本元数据保持 0.27.0，文件名使用日期及 snapshot 区分初始版本；包含此前两轮未发布优化，不代表新的正式版本或 Steam 候选版。

已生成 `dist/SPACECRAFT-0.27.0-snapshot-20260907-mac-arm64.dmg`，打开后将应用拖入 Applications。Forge 默认下载因 DNS 失败，改用同一 `forge.config.cjs` 的 packagerConfig 和本机缓存 Electron 44.0.0，通过 @electron/packager 离线重建，再用 macOS hdiutil 生成压缩镜像。未使用开发者证书签名或 Apple 公证。

本轮 verify 本地规则及 487 个中英引用检查通过，在线 npm audit 因 DNS 不可用未完成，因此完整命令未通过。包内程序沙盒启动退出码 134；窗口检查因 Mac 锁屏无法完成，安装后启动与游戏实玩未验证。Windows 仍为历史产物。下方“无 0.27.0 桌面包”的描述为此次打包前历史记录。


项目采用 Electron Forge。Electron 官方也推荐使用 Forge 完成应用打包与发行。

## 本机调试

```bash
npm install
npm start
```

## 生成当前平台产物

```bash
npm run make
```

产物位于 `out/make/`。

## 生成 Windows x64 EXE

推荐在 GitHub Actions 的 Windows runner 或实体 Windows 构建机执行：

```powershell
npm ci
npm run package:win
npm run make:win
```

`npm run package:win` 会生成包含 `SPACECRAFT.exe` 的免安装目录；`npm run make:win` 进一步生成安装器。

历史已验证产物（0.23.0）：

- `out/SPACECRAFT 星航双子-win32-x64/SPACECRAFT.exe`
- `dist/SPACECRAFT-0.23.0-windows-x64.zip`

0.23.0 Windows x64 校验值：

```text
ZIP   SHA-256  fdab084672b53b85030e80ef6247fb2cfe395e780ca224871e08fafbe2bb012f
EXE   SHA-256  dc6058b1cf932d934af47e79fe7297eef66c84d646d39cc2b21a0e0a1dffe639
ASAR  SHA-256  141e222065425d215c512c89e212552ef979ed9050cd48f491d8313f5174db7c
```

ZIP 为 157,798,943 字节，EXE 为 244,440,576 字节，共 76 个归档条目。ZIP 内部根目录使用 ASCII `SPACECRAFT-win32-x64`，避免跨平台解压工具误判中文文件夹编码；归档不包含 `__MACOSX` 或 `.DS_Store`，`unzip -tq` 完整性检查通过。ZIP 内 EXE 与 ASAR 的 SHA-256 已分别与构建目录一致。

`app.asar` 为 1,189,915 字节，含 72 个文件条目，已读取核对 package 0.23.0、`ADAPTIVE THREAT MATRIX 0.23.0` 页脚、`src/threat.js`、五个等级配置、紧急减压接线、localhost QA 隔离与 1× 开局安全回归。它还包含 Three.js `three.module.min.js`、三阶 Toon+Glow、三种玩家战机、七类异形舰、三套阶段生长 Boss、12 种攻击状态、体素蓄力器官、竞技场光路与阶段 8-bit 编曲；以及 `SpaceDirector`、570/600/630 秒时长、九战区体素门架、27 编队、12 遭遇、八构筑节点、90× QA 压缩模拟、九生态、4 Buff/3 Debuff、六维 7,168 构筑、15 项升级、9 项天赋、7 项遗物协议、星链狂潮和 7 种星门协议。

0.24.0 macOS arm64 开发快照已执行 `npm run package` 并从包内可执行文件实际启动。其 ASAR 已逐项读取确认包含 v25 `renderer3d.js` 入口、`three.module.min.js`、EffectComposer、RenderPass、UnrealBloomPass、SMAAPass、OutputPass、SMAAShader 与 LuminosityHighPassShader。`forge.config.cjs` 必须同时放行 `examples`、`examples/jsm` 父目录及 `postprocessing`/`shaders` 子树；只放行叶子目录会被 Forge 在遍历父目录时提前排除。该本机快照仅作为 0.24.0 视觉发行链证据，不替代 Windows x64 签名归档。

0.27.0「协同反应堆」仅发布过开发快照；其 macOS 初始包和 Windows 初始包均有未完成验证或已知启动缺陷。0.28.0 发行前不得把下方旧 ASAR、旧哈希或旧启动记录描述为当前产物。

Windows EXE 使用 `assets/icon.ico`，其中包含从 `favicon.svg` 直接渲染的 16、24、32、48、64、128 和 256px 图像。macOS 上可运行 `npm run icons` 重新生成 ICO、PNG 与 ICNS。

注意：Windows 免安装版必须保留同目录的 DLL、resources 和 locales，不能只复制单独的 EXE。

仓库包含 `.github/workflows/build-windows.yml`。手动运行会生成 Windows x64 与 macOS arm64 Actions 构建物但不创建 Release；推送版本标签且所有门禁通过后才自动创建稳定 Release。

## 正式售卖前仍需完成

- 购买并配置 Windows 代码签名证书。
- 生成 Steam 商店 Capsule、截图和预告片素材。
- 设置正式应用 ID、厂商信息与隐私政策。
- 接入 Steamworks SDK、成就、云存档和 Overlay。
- 在 Windows 10/11、不同显卡和手柄组合上完成 QA。
- 构建与上传 SteamPipe depot。

参考：[Electron 打包概览](https://www.electronjs.org/docs/latest/tutorial/distribution-overview) 与 [Electron Forge 打包教程](https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging)。
