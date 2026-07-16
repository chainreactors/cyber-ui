# @cyber/realtime

实时通信客户端。提供 Gateway WebSocket 和 SSE 流的封装。

## 导出

| 函数 | 说明 |
|------|------|
| `createGatewayRealtimeClient(url, opts)` | 创建 Gateway WebSocket 客户端，支持自动重连、事件监听 |
| `streamSse(url, opts)` | SSE 事件流消费，返回异步迭代器 |
| `joinUrl(base, path)` | URL 路径拼接工具 |

## 类型

- `GatewayRealtimeClient` — WebSocket 客户端实例
- `GatewaySocketEvent` / `GatewaySocketListener` — 事件与监听器
- `GatewayConnectionListener` — 连接状态监听器
- `SseEvent` / `SseEventListener` — SSE 事件

## 使用

```ts
import { createGatewayRealtimeClient, streamSse } from "@cyber/realtime"
```

无框架依赖，纯 JavaScript 运行时。
