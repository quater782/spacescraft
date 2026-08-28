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
- `dist/SPACECRAFT-0.20.0-windows-x64.zip`

0.20.0 Windows x64 校验值：

```text
ZIP   SHA-256  bc0226114a8aa19c999d5bde93eeab0cd644cee580fcf0847b38a17635ff8628
EXE   SHA-256  a4695464b5845f2ba68d5c56cda79422c206935e77553643ee6eb3db61475596
ASAR  SHA-256  31bd5069aac349664a9186c4c22189360436cf275821f0a35a4882958bee1fab
```

ZIP 为 157,789,279 字节，EXE 为 244,440,576 字节，共 76 个归档条目。ZIP 内部根目录使用 ASCII `SPACECRAFT-win32-x64`，避免跨平台解压工具误判中文文件夹编码；归档不包含 `__MACOSX` 或 `.DS_Store`，`unzip -tq` 完整性检查通过。ZIP 内 EXE 与 ASAR 的 SHA-256 已分别与构建目录一致。

`app.asar` 为 1,128,688 字节，已核对为 0.20.0。它包含 Three.js `three.module.min.js`、按色实例化三阶 Toon+Glow、三种玩家战机、七类异形舰、大型有机模块、三套阶段生长 Boss、三章专属弹体、`qa-boss-gallery`/`smoke:bosses`，以及九套生态、三层航路、分段拖尾、4 Buff/3 Debuff、六维 7,168 构筑、15 项升级、9 项天赋、7 项遗物协议、星链狂潮、7 种星门协议和 5 类动态遭遇。ASAR 内 package 版本、0.20.0 页脚、`3-organic-phase-forms` 和版本门禁均已读取确认。未使用的 Three.js 源码、示例与非运行构建继续由 Forge 排除。

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
