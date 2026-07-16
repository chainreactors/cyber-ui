# @cyber/terminal

终端会话组件。基于 xterm.js，提供终端视图、会话导航和会话管理工具。

## 组件

| 组件 | 说明 |
|------|------|
| `TerminalView` | xterm.js 终端渲染器 |
| `TerminalHeader` | 终端标题栏 |
| `SessionNavigator` | 会话列表导航面板 |
| `SessionButton` | 单个会话切换按钮 |
| `DetailPanel` / `DetailGroup` / `DetailRow` | 会话详情展示 |

## 工具函数

| 函数 | 说明 |
|------|------|
| `parseTerminalMessage` | 解析终端消息协议 |
| `writeTerminalData` | 写入终端数据 |
| `sessionPayload` / `sessionFromPayload` | 会话序列化/反序列化 |
| `mergeSession` / `upsertSession` | 会话合并/更新 |
| `compareSessionsByActivity` | 按活跃度排序 |
| `sessionTitle` / `sessionDetails` / `stateLabel` | 会话信息格式化 |
| `terminalStatusColor` | 状态颜色映射 |
| `formatDateTime` / `formatBytes` | 格式化工具 |

## 类型

- `TerminalStatus` — 终端状态
- `TerminalMessage` — 终端消息
- `PTYSession` — PTY 会话数据

## 使用

```ts
import { TerminalView, SessionNavigator, parseTerminalMessage } from "@cyber/terminal"
```

Peer dependencies: `react`, `react-dom`
