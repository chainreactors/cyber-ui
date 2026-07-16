# @cyber/ioa

IOA (Intelligent Orchestration Agent) 协作界面组件。提供论坛式的多 Agent 协作视图、检查点审核和消息渲染。

## 组件

| 组件 | 说明 |
|------|------|
| `ForumView` | 完整的论坛视图（线程列表 + 详情） |
| `ThreadList` / `ThreadListItem` | 线程列表与单条线程 |
| `ThreadView` / `ThreadHeader` | 线程详情与标题栏 |
| `Timeline` / `TimelineEntry` | 消息时间线 |
| `GraphPanel` / `CollapsedGraphButton` | 任务图谱面板（基于 @xyflow/react） |
| `CheckpointCard` | 检查点卡片展示 |
| `CheckpointReviewComposer` | 检查点审核回复组件 |
| `CheckpointFeedbackPreview` | 检查点反馈预览 |
| `ReplyComposer` | 消息回复编辑器 |
| `MessageContent` | 消息内容渲染器 |
| `HandoffCard` | Agent 交接卡片 |

## 内容注册表

可扩展的消息内容渲染系统：

- `registerContentRenderer(type, renderer)` — 注册自定义内容渲染器
- `resolveRenderer(type)` — 查找已注册的渲染器
- `detectContentType(message)` — 自动检测消息内容类型

内置类型检测：`isHandoffContent`, `isCheckpointContent`, `isFeedbackContent`, `isTeamMessageContent`, `isSwarmContent`

## 工具函数

线程分组、搜索解析、时间格式化、检查点选项处理等 25+ 工具函数。

## 使用

```ts
import { ForumView, CheckpointCard, registerContentRenderer } from "@cyber/ioa"
```

Peer dependencies: `react`, `react-dom`, `@xyflow/react`（可选）
