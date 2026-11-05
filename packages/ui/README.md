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

## 弹出层兼容选项

| 组件 | 属性 | 默认值 | 行为 |
|------|------|--------|------|
| `DialogContent` | `hideCloseButton` | `false` | 隐藏内置关闭按钮；自定义 `DialogClose` 和原有关闭交互不受影响 |
| `SheetContent` | `srTitle` | 未设置 | 渲染仅供屏幕阅读器使用的标题，为面板提供可访问名称；已有 `SheetTitle` 时无需重复设置 |
| `PopoverContent` | `disablePortal` | `false` | 在当前位置渲染内容，不使用 Portal；内容会受父级裁剪和层叠上下文影响 |

未传入这些选项时，保留原有关闭按钮、标题和 Portal 行为。

## 工具函数

- `badgeVariants` / `buttonVariants` — CVA variant 定义，可用于自定义组件复用相同样式

## 安装

```ts
import { Button, Badge, Dialog, DialogContent } from "@cyber/ui"
```

Peer dependencies: `react`, `react-dom`
