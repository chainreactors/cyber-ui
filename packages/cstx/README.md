# @cyber/cstx

CSTX 协议核心包。提供 CSTX 数据类型定义、数据表格、搜索组件、图谱工具栏、时间线、图表和 Flag 系统。

## 类型定义

CSTX 协议对齐的核心数据结构：

- `CstxNode` / `CstxEdge` / `CstxGraphPayload` — 图谱节点、边和数据载荷
- `CSTXDelta` / `CSTXStat` — 图谱变更统计
- `CstxHistoryEntry` / `CstxChangeKind` / `CstxFieldChange` — 变更历史
- `AssetNode` / `AssetRelationship` / `AssetGraphData` — 资产图谱视图
- `CstxFilterDefinition` / `CstxFilterCategory` / `CstxFilterStage` — 过滤器

## 组件

| 类别 | 组件 |
|------|------|
| 数据表格 | `CSTXTable`, `DataTable`, `FlagCell` |
| 搜索 | `SearchInput`, `QueryPicker`, `NodeCard`, `FacetSidebar`, `ResultList`, `SyntaxGuide` |
| 图谱工具 | `GraphShell`, `GraphToolbar`, `GraphPanelHeader`, `GraphQueryControls` |
| 时间线 | `CommitGraph`, `CommitTimeline`, `HistoryTimeline`, `TaskTimeline`, `VerticalTimeline` |
| 生命周期 | `LifecyclePlayer`, `LifeRing` |
| 图表 | `StatCard`, `Sparkline`, `DistributionBar`, `TrendChart`, `BarChart`, `PieChart` |
| 布局 | `PageHeader`, `Section`, `DataState`, `LinkRow`, `ItemList` |
| 加载状态 | `LoadingSpinner`, `PageLoader`, `InlineLoader`, `ButtonLoader`, `EmptyState` |
| CSTX Flag | `CstxFlagToolbar`, `CstxCommitSelect`, `DiffMetricCard`, `DiffObjectChangeSvg`, `DiffObjectChangeBadge` |
| 时间显示 | `TimeDisplay`, `TimePairDisplay` |

## 运行时

- `CstxUiProvider` / `useCstxUi` — CSTX UI 上下文
- `ComponentRegistry` / `defaultRegistry` — 组件注册表
- `CellRendererRegistry` / `defaultCellRenderers` — 单元格渲染注册表
- `ColorManager` / `defaultColorManager` — 颜色管理器

## 工具函数

CSTX Flag 操作、CSTX 查询 DSL 解析、快照管理、下载工具、安全类型转换等 60+ 工具函数。

## 使用

```ts
import { CstxNode, CstxEdge, CSTXTable, SearchInput } from "@cyber/cstx"
```

Peer dependencies: `react`, `react-dom`, `recharts`
