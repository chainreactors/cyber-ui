# @cyber/viewer

APG (Agent Process Graph) 任务查看器。提供实时图谱视图、聊天面板、执行时间线和 WebSocket 通信。

## 组件

### 展示层（Layer 1）

| 组件 | 说明 |
|------|------|
| `LiveGraphView` | 实时任务图谱视图 |
| `StaticGraphView` | 静态图谱视图 |
| `NodeDetailPanel` | 节点详情面板 |
| `LiveAPGNode` | APG 节点渲染器 |
| `ChatPanel` | 聊天面板（含输入、时间线、头部） |
| `ChatInput` | 消息输入框（支持附件、命令提示、装饰器） |
| `MessageBubble` | 消息气泡 |
| `AssistantResponse` | AI 助手响应渲染 |
| `ToolCallDisplay` / `CodeCallDisplay` | 工具调用展示 |
| `ChatThinking` / `ThinkingDots` / `StreamingCursor` | 思考状态指示 |
| `ExecutionTimeline` | 执行时间线 |
| `ExecutionGraphView` | 执行流程图（基于 @xyflow/react） |
| `PromptContent` | Prompt 内容渲染 |

### 连接层（Layer 2）

| 组件 | 说明 |
|------|------|
| `ConnectedGraphView` | 绑定 WebSocket 事件的图谱视图 |
| `ConnectedChatPanel` | 绑定 WebSocket 事件的聊天面板 |
| `ConnectedTimeline` | 绑定 WebSocket 事件的时间线 |

### Provider 层

| 组件 | 说明 |
|------|------|
| `APGWebSocketProvider` | APG WebSocket 连接管理 |
| `StaticEventProvider` | 静态事件数据注入 |
| `ChatSessionProvider` | 聊天会话状态管理 |
| `APGViewer` | 完整的 APG 查看器（Dashboard 级） |

## 状态 Reducer

纯函数，用于处理实时事件流：

- `reduceGraphState` / `reduceChatState` / `reduceTimeline` — 实时模式
- `reduceExecutionGraphState` / `reduceExecutionTimeline` — 执行模式
- `reduceExecutionHistoryGraphState` / `reduceExecutionHistoryTimeline` — 历史回放

## 使用

```ts
import { APGViewer, ChatPanel, useAPGEvents } from "@cyber/viewer"
```

Peer dependencies: `react`, `react-dom`, `@xyflow/react`
