# 桌面与 Windows EXE 打包

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

当前已验证产物：

- `out/SPACECRAFT 星航双子-win32-x64/SPACECRAFT.exe`
- `dist/SPACECRAFT-0.17.0-windows-x64.zip`

0.17.0 Windows x64 校验值：

```text
ZIP   SHA-256  3bb338758979a731f0d8a4840513e9c3712ed45a8d0769ef330eb4cd64405196
EXE   SHA-256  1948ddeaad267a6b35b5c5b87bce239fdc8c6280ff07d4d54f6acef2903117f2
ASAR  SHA-256  c5987988d5c72a56cc07dc16d77356f5600ca2164f5be872196f5a9720d9011d
```

ZIP 为 157,779,549 字节，EXE 为 244,440,576 字节，解压后文件内容为 384,634,405 字节，共 76 个归档条目。ZIP 内部根目录使用 ASCII `SPACECRAFT-win32-x64`，避免跨平台解压工具误判中文文件夹编码；归档不包含 `__MACOSX` 或 `.DS_Store`，`unzip -tq` 完整性检查通过。ZIP 内 EXE 与 ASAR 的 SHA-256 已分别与构建目录一致。

`app.asar` 为 1,095,389 字节，已核对为 0.17.0。它包含 Three.js `three.module.min.js`、按色实例化的三阶 Toon+Glow 渲染器、饱和无黑色航空战机/异形器官、奥卡姆块数门禁、4 Buff/3 Debuff 状态模块、7 个船体与六维 7,168 构筑、15 项局内升级、9 项天赋、7 项遗物协议、星链狂潮、9 种生态、7 种星门协议、5 类动态遭遇、真实 Electron 冒烟和全部验证脚本。ASAR 内 package 版本、0.17.0 页脚、`MeshToonMaterial`、红通道梯度、`toon-glow-light-blocks`、`saturated-no-black` 与 0.17 版本门禁均已读取确认。未使用的 Three.js 源码、示例与非运行构建被 Forge 忽略，只保留 365,552 字节的运行模块；该模块 SHA-256 为 `86bcee248b64f44bcfc23c331ae74619061957d59cab040171dcb6fb5900beb6`。

Windows EXE 使用 `assets/icon.ico`，其中包含从 `favicon.svg` 直接渲染的 16、24、32、48、64、128 和 256px 图像。macOS 上可运行 `npm run icons` 重新生成 ICO、PNG 与 ICNS。

注意：Windows 免安装版必须保留同目录的 DLL、resources 和 locales，不能只复制单独的 EXE。

仓库包含 `.github/workflows/build-windows.yml`。手动运行该工作流后会上传 Windows x64 构建产物。

## 正式售卖前仍需完成

- 购买并配置 Windows 代码签名证书。
- 生成 Steam 商店 Capsule、截图和预告片素材。
- 设置正式应用 ID、厂商信息与隐私政策。
- 接入 Steamworks SDK、成就、云存档和 Overlay。
- 在 Windows 10/11、不同显卡和手柄组合上完成 QA。
- 构建与上传 SteamPipe depot。

参考：[Electron 打包概览](https://www.electronjs.org/docs/latest/tutorial/distribution-overview) 与 [Electron Forge 打包教程](https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging)。
