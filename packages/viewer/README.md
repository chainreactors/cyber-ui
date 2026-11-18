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
| `ToolResultDisplay` | 原生工具结果，包含文件、录制及关联的观察卡片 |
| `ToolDefinitionCard` | 原生工具声明与命令定义，按需展开输入参数、用法、说明及别名 |
| `ObservationDisplay` / `ObservationList` | 原生流量、文件、CSTX 和操作生命周期展示 |
| `ObservabilityPanel` | 直接接收 `Event[]`，提供活动/原始事件、分类搜索、移动端详情，以及已有资产库插槽 |
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
| `APGEventProvider` | 注入宿主已经解码的 APG/AOP 事件，不拥有传输连接 |
| `StaticEventProvider` | 静态事件数据注入 |
| `ChatSessionProvider` | 聊天会话状态管理 |
| `APGViewer` | 完整的 APG 查看器（Dashboard 级） |

## 状态 Reducer

`createAOPTimelineReducer` 按显式原生 `operation.Ref.call_id` 将观察事件归入对应调用，隔离 session、emitter 和 turn，并支持事件先于调用到达。`useObservations(events)` 保留原始事件对象，处理追加、重放去重及历史替换；宿主无需新的观察 DTO 或接口。`AOPChatPanel` 默认复用这些专用卡片；媒体 URI 由宿主通过 `toolProps.resolveMedia` 解析。

`observationActivity(events)` 仍返回原始事件对象，合并调用和操作阶段并省略显式关联的成功工具生命周期重复项；失败及其他嵌套操作保留。活动视图不改变原始记录。文件卡片默认收起元信息，CSTX 卡片使用非零指标摘要；完整结果和事件关联可按需展开。

纯函数，用于处理实时事件流：

- `reduceGraphState` / `reduceChatState` / `reduceTimeline` — 实时模式
- `reduceExecutionGraphState` / `reduceExecutionTimeline` — 执行模式
- `reduceExecutionHistoryGraphState` / `reduceExecutionHistoryTimeline` — 历史回放

## 使用

```ts
import { APGViewer, ChatPanel, useAPGEvents } from "@cyber/viewer"
```

Peer dependencies: `react`, `react-dom`, `@xyflow/react`
