# `electron/` 桌面安全规则

本目录继承根级 [AGENTS.md](../AGENTS.md)。桌面壳是安全边界，不承载游戏规则。

- 保持 `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`，并在打包版关闭 DevTools。
- 默认只载入仓库内 `index.html`；引入远程导航、外部窗口、下载、IPC 或 preload 前必须说明威胁模型和最小权限方案。
- 不在渲染进程暴露 Node、文件系统、Shell、环境变量或任意 IPC。
- 保持严格 CSP 和无应用菜单的发行行为；外链若未来开放，应使用明确 allowlist 和系统浏览器。
- 修改窗口、生命周期或打包边界后至少运行 `npm run verify` 与 `npm start`；发行验证遵循[打包指南](../docs/PACKAGING.md)。
