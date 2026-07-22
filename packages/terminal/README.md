# @cyber/terminal

终端会话组件。基于 xterm.js，提供终端视图、会话导航和会话管理工具。

## 组件

| 组件 | 说明 |
|------|------|
| `TerminalView` | xterm.js 终端渲染器 |
| `TerminalHeader` | 终端标题栏 |
| `WebSocketTerminal` | 完整 PTY WebSocket 生命周期、重连、输入输出与 resize |
| `SessionNavigator` | 会话列表导航面板 |
| `SessionButton` | 单个会话切换按钮 |
| `DetailPanel` / `DetailGroup` / `DetailRow` | 会话详情展示 |

## 工具函数

| 函数 | 说明 |
|------|------|
| `parsePTYFrame` | 解析规范化 PTY 帧 |
| `encodeTerminalData` | 将终端输入编码为 PTY 帧的 base64 数据 |
| `writeTerminalData` | 写入终端数据 |
| `sessionsFromFrame` / `sessionFromFrame` | 从 PTY 帧读取会话数据 |
| `mergeSession` / `upsertSession` | 会话合并/更新 |
| `compareSessionsByActivity` | 按活跃度排序 |
| `sessionTitle` / `sessionDetails` / `stateLabel` | 会话信息格式化 |
| `terminalStatusColor` | 状态颜色映射 |
| `formatDateTime` / `formatBytes` | 格式化工具 |

## 类型

- `TerminalStatus` — 终端状态
- `PTYFrame` / `PTYFrameType` — PTY 帧及类型
- `PTYSession` — PTY 会话数据

## 使用

```ts
import { WebSocketTerminal, TerminalView, SessionNavigator, parsePTYFrame } from "@cyber/terminal"
```

Peer dependencies: `react`, `react-dom`
