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
| `encodeTerminalData` | 将终端输入编码为规范 PTY 帧的 UTF-8 字节 |
| `encodePTYFrame` / `decodePTYFrame` | 编解码规范 Protobuf PTY 二进制帧 |
| `writeTerminalData` | 写入终端数据 |
| `sessionsFromFrame` / `sessionFromFrame` | 从 PTY 帧读取会话数据 |
| `mergeSession` / `upsertSession` | 会话合并/更新 |
| `compareSessionsByActivity` | 按活跃度排序 |
| `sessionTitle` / `sessionDetails` / `stateLabel` | 会话信息格式化 |
| `terminalStatusColor` | 状态颜色映射 |
| `formatDateTime` / `formatBytes` | 格式化工具 |

## 类型

- `TerminalStatus` — 终端状态
- `PTYFrame` — 规范 Protobuf PTY 帧
- `PTYSession` — PTY 会话数据

## 使用

```ts
import { TerminalView, SessionNavigator, decodePTYFrame } from "@cyber/terminal"
```

应用负责建立 WebSocket，并以一条二进制 WebSocket 消息承载一个规范 `aop.pty.ProtocolMessage`；终端组件不持有网络连接。

Peer dependencies: `react`, `react-dom`
