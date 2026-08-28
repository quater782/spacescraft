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
- `dist/SPACECRAFT-0.22.0-windows-x64.zip`

0.22.0 Windows x64 校验值：

```text
ZIP   SHA-256  dfc2895f73e6243c9d66c20dd0fdcaea15e81dd78a1588b639a180693186346e
EXE   SHA-256  0acfa7e2989bf52ba7a6b5df54fd8e0ac553bf2348ab7d57546501da1a0ea09c
ASAR  SHA-256  5d3b1309294a912f1e35293435c4f656349c350b35b868480511237c40b8123f
```

ZIP 为 157,793,236 字节，EXE 为 244,440,576 字节，共 76 个归档条目。ZIP 内部根目录使用 ASCII `SPACECRAFT-win32-x64`，避免跨平台解压工具误判中文文件夹编码；归档不包含 `__MACOSX` 或 `.DS_Store`，`unzip -tq` 完整性检查通过。ZIP 内 EXE 与 ASAR 的 SHA-256 已分别与构建目录一致。

`app.asar` 为 1,164,169 字节，已核对为 0.22.0。它包含 Three.js `three.module.min.js`、三阶 Toon+Glow、三种玩家战机、七类异形舰、三套阶段生长 Boss、12 种攻击状态、体素蓄力器官、竞技场光路与阶段 8-bit 编曲；还包含 `SpaceDirector`、570/600/630 秒时长、九战区体素门架、27 编队、12 遭遇、八构筑节点、90× QA 压缩模拟，以及九生态、4 Buff/3 Debuff、六维 7,168 构筑、15 项升级、9 项天赋、7 项遗物协议、星链狂潮和 7 种星门协议。ASAR 内 package 版本、0.22.0 页脚、`src/director.js`、时长数组和版本门禁均已读取确认。

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
