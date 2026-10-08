# @cyber/traffic

HTTP 流量查看组件。提供 Burp 风格的请求/响应分栏视图、多数据源适配器和匹配高亮。

## 组件

| 组件 | 说明 |
|------|------|
| `HttpViewPanels` | 请求/响应分栏视图，支持语法高亮、匹配文本高亮、Header 折叠 |
| `TrafficPanel` | 直接接收原生 `aop.traffic.Flow[]`，提供搜索、流量列表及请求/响应详情 |
| `HttpEvidenceView` | 展示原始请求/响应证据文本 |

## 适配器

将不同数据源转换为统一的 `TrafficHttpView` 视图模型：

- `recordToHttpView(record)` — 扫描结果流量记录 → 视图模型
- `flowToHttpView(flow)` — mitmproxy 实时 flow → 视图模型
- `evidenceExchangeToHttpView(exchange)` — 证据交换记录 → 视图模型
- `aopFlowToHttpView(flow)` — 原生 AOP flow → 已有视图模型，保留重复 header，支持 UTF-8 和二进制正文

`useTrafficFlows(events)` 从现有 AOP `Event[]` 中提取 `aop.traffic.Flow` extension，支持追加更新、去重和历史替换。组件和 hook 不访问服务端；宿主沿用已有会话事件订阅及历史接口，不需要额外 DTO。

```tsx
const flows = useTrafficFlows(events)
return <TrafficPanel flows={flows} />
```

## 工具函数

- `getStatusColor(code)` — HTTP 状态码 → Tailwind 颜色类
- `getMethodColor(method)` — HTTP 方法 → Tailwind 颜色类
- `collectHighlightTexts(source)` — 从匹配结果提取高亮文本
- `findHighlightRanges(text, highlights)` — 计算高亮区间
- `normalizeHttpBodyForDisplay(body)` — 规范化 HTTP body 显示

## 类型

- `TrafficHttpView` — 统一 HTTP 流量视图模型
- `TrafficRecordLike` / `MitmFlowLike` / `EvidenceExchangeLike` — 数据源接口
- `TrafficHighlightSource` — 匹配高亮数据源
- `HighlightRange` — 高亮区间

## 使用

```ts
import { HttpViewPanels, flowToHttpView, getStatusColor } from "@cyber/traffic"
```

Peer dependencies: `react`, `react-dom`
