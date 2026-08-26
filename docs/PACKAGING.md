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
- `dist/SPACECRAFT-0.8.0-windows-x64.zip`

0.8.0 Windows x64 校验值：

```text
ZIP  SHA-256  555715774897fffa47f2a5fda76d47a49eba3bccdf8eff0c2ba4c4cd3e300cc4
EXE  SHA-256  596ed76b01ec11159109ddaf82cbd8405d26656959a07d8d544cc021e3a2cf0d
```

ZIP 为 157,645,435 字节，EXE 为 244,440,576 字节，解压后目录约 366 MiB，共 76 个归档条目。归档使用跨平台 ZIP 元数据，不包含 `__MACOSX` 或 `.DS_Store`；`unzip -tq` 完整性检查通过。`app.asar` 已核对为 0.8.0，并包含 `src/i18n.js`、`src/roguelike.js`、15 项局内升级、双语目录、v4 语言存档、航线合约、星航勋章、游戏逻辑、3D 渲染器和桌面图标。

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
