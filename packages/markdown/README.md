# @cyber/markdown

Markdown 渲染组件。提供安全的 Markdown 内容渲染和带行号的代码块。

## 组件

| 组件 | 说明 |
|------|------|
| `MarkdownContent` | Markdown 内容渲染器，支持 GFM 扩展，安全过滤 |
| `MarkdownEditor` | Markdown 编辑器（文本输入 + 实时预览） |
| `CodeBlock` | 代码块组件，支持语法高亮、行号显示、一键复制 |

## 使用

```ts
import { MarkdownContent, CodeBlock } from "@cyber/markdown"
```

Peer dependencies: `react`, `react-dom`
