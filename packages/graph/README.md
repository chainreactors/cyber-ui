# @cyber/graph

通用图谱渲染引擎。基于 sigma.js + graphology，支持多种布局算法和交互。

## 组件

| 组件 | 说明 |
|------|------|
| `SigmaGraph` | 底层 sigma.js 封装，支持自定义节点/边渲染、颜色映射、字段映射、力导向调参面板 |
| `GraphContainer` | SigmaGraph 上层封装，提供 `typeColorMap`、`fieldMapping`、布局切换等简化接口 |

## 布局

通过 `layoutOptions.type` 切换：

- `force` — ForceAtlas2 力导向布局（默认）
- `hierarchical` — 按节点类型分层布局
- `electron` — 电子层级同心环布局
- `grid` — 网格布局
- `circular` — 环形布局

## 交互

- 节点点击 / 双击 / 右键
- 边点击 / 双击 / 悬停（边标签显示）
- 节点高亮 + 邻居淡化
- 搜索过滤高亮（`matchingNodeIds`）
- 相机缩放 / 重置 / 聚焦

## 类型

- `SignalConfig` — 信号节点配置（标签、颜色、样式类）
- `ColorManager` — 颜色管理器接口（severity / signal / node / edge 颜色回调）

## 使用

```ts
import { SigmaGraph, GraphContainer } from "@cyber/graph"

<GraphContainer
  nodes={nodes}
  edges={edges}
  typeColorMap={{ host: "#3b82f6", vuln: "#ef4444" }}
  layoutType="force"
  height="500px"
/>
```

Peer dependencies: `react`, `react-dom`
