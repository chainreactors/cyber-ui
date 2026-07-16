# @cyber/theme

主题系统与设计 token。提供 light/dark 主题切换、CSS 变量生成和 `cn()` 工具函数。

## 导出

| 类别 | 符号 |
|------|------|
| 组件 | `ThemeProvider` — 主题上下文提供者 |
| Hook | `useTheme` — 获取当前主题、isDark 状态、toggle 方法 |
| 工具 | `cn()` — clsx + tailwind-merge 的组合工具 |
| Token | `getTokens(theme)` — 获取主题 token 对象, `tokensToCSS(tokens)` — 生成 CSS 变量字符串 |
| 类型 | `Theme`, `ThemeTokens`, `ThemeContextValue` |

## 使用

```ts
import { ThemeProvider, useTheme, cn } from "@cyber/theme"
```

Peer dependencies: `react`, `react-dom`
