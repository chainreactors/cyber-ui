# @cyber/ui

基础 UI 原语库。基于 Radix UI 无障碍原语 + Tailwind CSS，提供 30+ 可组合组件。

## 组件

| 类别 | 组件 |
|------|------|
| 按钮与操作 | `Button`, `ToggleGroup`, `ToggleGroupItem` |
| 数据展示 | `Badge`, `Card` / `CardHeader` / `CardContent` / `CardFooter` / `CardTitle` / `CardDescription`, `Skeleton` / `SkeletonCard` / `SkeletonList`, `Separator` |
| 表单输入 | `Input`, `Textarea`, `Checkbox`, `Switch`, `Select` / `SelectTrigger` / `SelectContent` / `SelectItem` / `SelectGroup` / `SelectLabel` / `SelectValue` / `SelectSeparator`, `Collapsible` |
| 反馈与状态 | `Spinner`, `EmptyState`, `StatusIndicator` / `StatusDot`, `Meter`, `Callout`, `Chip`, `StatTile` |
| 弹出层 | `Dialog` / `DialogContent` / `DialogHeader` / `DialogFooter` / `DialogTitle` / `DialogDescription` / `DialogTrigger` / `DialogClose`, `Sheet` (侧滑面板), `Popover`, `Tooltip`, `DropdownMenu`, `ContextMenu` |
| 布局 | `ScrollArea` / `ScrollBar`, `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` |
| 复合组件 | `DisclosureCard`, `ListRow`, `ResultLine`, `Field`, `ThemeToggle`, `ConfirmProvider` / `useConfirm` |

## 工具函数

- `badgeVariants` / `buttonVariants` — CVA variant 定义，可用于自定义组件复用相同样式

## 安装

```ts
import { Button, Badge, Dialog, DialogContent } from "@cyber/ui"
```

Peer dependencies: `react`, `react-dom`
