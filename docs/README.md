# SPACECRAFT 文档中心

这里是项目知识的统一入口。Codex 和贡献者先读根级 [AGENTS.md](../AGENTS.md)，再按任务进入对应专题。

## 按问题查找

| 要解决的问题 | 权威文档 |
| --- | --- |
| 当前版本到底是什么、哪些能力已验证 | [当前项目状态](./PROJECT-STATE.md) |
| Codex 应怎样规划、验证和交付一次更新 | [Codex 工作流](./CODEX-WORKFLOW.md) |
| 运行时模块如何协作、数据保存在哪里 | [系统架构](./ARCHITECTURE.md) |
| 如何本地运行、使用 QA 开关和做回归 | [开发与验证](./DEVELOPMENT.md) |
| 如何生成桌面版、Windows EXE 和校验发行物 | [打包指南](./PACKAGING.md) |
| 距离 Steam 售卖还有哪些缺口 | [Steam 路线图](./STEAM-ROADMAP.md) |
| 每个版本改了什么 | [更新日志](../CHANGELOG.md) |
| 0.11.0 发行证据 | [0.11.0 发行说明](./RELEASE-0.11.0.md) |

历史发行说明：[0.10.0](./RELEASE-0.10.0.md)、[0.9.0](./RELEASE-0.9.0.md)、[0.8.0](./RELEASE-0.8.0.md)、[0.7.0](./RELEASE-0.7.0.md)、[0.6.0](./RELEASE-0.6.0.md)、[0.5.0](./RELEASE-0.5.0.md)、[0.4.0](./RELEASE-0.4.0.md)、[0.3.0](./RELEASE-0.3.0.md)。

## 事实优先级

出现冲突时按以下顺序处理，而不是静默选一个看起来更新的数字：

1. 实际源码、可重复的命令输出和产物哈希。
2. `PROJECT-STATE.md` 的当前快照。
3. `CHANGELOG.md` 与对应版本发行说明。
4. README、路线图和计划性文字。

发现冲突必须在本轮修正文档，或在状态快照中记录为明确缺口。发布状态与开发状态可以不同，但必须分别命名。

## 维护机制

`npm run verify` 会检查必需文档、所有 `AGENTS.md` 的体积、仓库内 Markdown 链接、JavaScript 语法、本地化完整性和正式依赖审计。文档变更与代码变更使用同一条验证入口。
