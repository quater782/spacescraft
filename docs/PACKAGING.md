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
- `dist/SPACECRAFT-0.12.0-windows-x64.zip`

0.12.0 Windows x64 校验值：

```text
ZIP  SHA-256  248b038de11a542aba2f6abbe737324850b889b59a77d8feebfe24740ccae0eb
EXE  SHA-256  14f86745a18e33a79aac15c6e5ba7b686b74175a03dc16675fcd62340e5cbc63
```

ZIP 为 157,667,385 字节，EXE 为 244,440,576 字节，解压后内容为 384,185,898 字节，共 75 个归档条目。归档使用跨平台 ZIP 元数据，不包含 `__MACOSX` 或 `.DS_Store`；`unzip -tq` 完整性检查通过。`app.asar` 为 646,882 字节，已核对为 0.12.0，并包含 `src/constellation.js`、九项恒星天赋、v5 profile、15 项局内升级、9 种生态、7 种星门协议、5 类动态遭遇、64 种敌军构筑、真实 Electron 冒烟脚本、双语目录、游戏逻辑与 3D 渲染器。

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
