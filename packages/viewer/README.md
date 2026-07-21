# @cyber/viewer

Agent 任务查看器。**AOP（@cyber/agent-protocol）是唯一在用的消息实现**：agent 输出经 `reduceAOPToTimeline` 归约为时间线，由 `ChatPanel` / `AOPChatPanel` 渲染。

包内同时保留一套 LEGACY APG（Python 时代）组件（`LiveGraphView`、`APGWebSocketProvider`、`reduceGraphState` 等）：仓库内已无任何消费方，Go 后端也不再产生 APG 事件。这些文件保留原样，等待消费方后续重构到 AOP；`src/index.ts` 中已用 "LEGACY APG" 注释标记。

## 组件

### 展示层（Layer 1）

| 组件 | 说明 |
|------|------|
| `ChatPanel` / `AOPChatPanel` | 聊天面板（AOP 时间线） |
| `ChatInput` | 消息输入框（支持附件、命令提示、装饰器） |
| `MessageBubble` | 消息气泡 |
| `AssistantResponse` | AI 助手响应渲染 |
| `ToolCallDisplay` / `CodeCallDisplay` | 工具调用展示 |
| `ChatThinking` / `ThinkingDots` / `StreamingCursor` | 思考状态指示 |
| `PromptContent` | Prompt 内容渲染 |
| `LiveGraphView` | 实时任务图谱视图（LEGACY APG） |
| `StaticGraphView` | 静态图谱视图（LEGACY APG） |
| `NodeDetailPanel` | 节点详情面板（LEGACY APG） |
| `LiveAPGNode` | APG 节点渲染器（LEGACY APG） |
| `ExecutionTimeline` | 执行时间线（LEGACY APG） |
| `ExecutionGraphView` | 执行流程图（LEGACY APG） |

### 连接层（Layer 2，均为 LEGACY APG）

| 组件 | 说明 |
|------|------|
| `ConnectedGraphView` | 绑定 WebSocket 事件的图谱视图 |
| `ConnectedChatPanel` | 绑定 WebSocket 事件的聊天面板 |
| `ConnectedTimeline` | 绑定 WebSocket 事件的时间线 |

### Provider 层

| 组件 | 说明 |
|------|------|
| `ChatSessionProvider` | 聊天会话状态管理 |
| `APGWebSocketProvider` | APG WebSocket 连接管理（LEGACY APG） |
| `StaticEventProvider` | 静态事件数据注入（LEGACY APG） |
| `APGViewer` | 完整的 APG 查看器（LEGACY APG，Dashboard 级） |

## 状态 Reducer

纯函数，用于处理实时事件流：

- `reduceAOPToTimeline` — AOP 事件 → 聊天时间线（唯一在用实现）
- `reduceGraphState` / `reduceChatState` / `reduceTimeline` — 实时模式（LEGACY APG）
- `reduceExecutionGraphState` / `reduceExecutionTimeline` — 执行模式（LEGACY APG）
- `reduceExecutionHistoryGraphState` / `reduceExecutionHistoryTimeline` — 历史回放（LEGACY APG）

## 使用

```ts
import { ChatPanel, reduceAOPToTimeline } from "@cyber/viewer"
```

Peer dependencies: `react`, `react-dom`, `@xyflow/react`
