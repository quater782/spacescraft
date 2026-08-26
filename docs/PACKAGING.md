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
- `dist/SPACECRAFT-0.7.0-windows-x64.zip`

0.7.0 Windows x64 校验值：

```text
ZIP  SHA-256  be4298dd879eab382e1fd14e0320723ff23fbf793d081d6c75836082a7ea3f5d
EXE  SHA-256  28770d64f4890ad37bc8f69f11fd4e21879adeb8dbe92b8dac0936652a11fbf2
```

ZIP 约 150 MiB，解压后目录约 366 MiB，共 76 个归档条目。归档使用跨平台 ZIP 元数据，不包含 `__MACOSX` 或 `.DS_Store`；`unzip -tq` 完整性检查通过。`app.asar` 已核对为 0.7.0，并包含 `src/i18n.js`、简体中文/英文目录、v4 语言存档、航线合约、星航勋章、游戏逻辑、3D 渲染器和桌面图标。

> 当前源码界面已经进入 0.8.0 Roguelike Alpha 开发快照，但上述产物与校验值只证明 0.7.0。完成版本号同步、全量回归和重新打包前，不得把旧校验值用于新的候选版本。详见[当前项目状态](./PROJECT-STATE.md)。

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
