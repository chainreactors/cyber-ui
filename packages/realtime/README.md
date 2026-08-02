# @cyber/realtime

SSE 工具包。应用 WebSocket 由 `@cyber/aop` 的 `AOPClient` 独占。

## 导出

| 函数 | 说明 |
|------|------|
| `streamSse(url, opts)` | SSE 事件流消费，返回异步迭代器 |
| `joinUrl(base, path)` | URL 路径拼接工具 |

## 类型

- `SseEvent` / `SseEventListener` — SSE 事件

## 使用

```ts
import { streamSse } from "@cyber/realtime"
```

无框架依赖，纯 JavaScript 运行时。
