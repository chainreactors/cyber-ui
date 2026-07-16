# cyber-ui

CSTX 协议驱动的共享前端组件库。为 CyberHub、Cairn Platform 等产品提供统一的 UI 原语、CSTX 数据渲染和领域组件。

## Packages

| 包 | 说明 |
|---|---|
| [`@cyber/ui`](packages/ui) | 基础 UI 原语（Badge、Button、Card、Dialog、Select、Tabs 等 30+ 组件），基于 Radix UI + Tailwind CSS |
| [`@cyber/theme`](packages/theme) | 主题系统 — ThemeProvider、useTheme hook、设计 token 和 `cn()` 工具函数 |
| [`@cyber/cstx`](packages/cstx) | CSTX 协议核心 — 类型定义（CstxNode/CstxEdge/CstxGraphPayload）、DataTable、搜索组件、图谱工具栏、Timeline、图表、CSTX Flag 系统 |
| [`@cyber/template`](packages/template) | 安全规则模板渲染 — POCCard、FingerprintCard、SeverityBadge、CVSSScoreCircle、YamlEditor、JsonViewer、NucleiTemplatePanel |
| [`@cyber/traffic`](packages/traffic) | HTTP 流量查看 — HttpViewPanels（请求/响应分栏）、flow/record 适配器、高亮匹配、状态/方法颜色工具 |
| [`@cyber/graph`](packages/graph) | 通用图谱渲染 — SigmaGraph（sigma.js 封装，支持 force/hierarchical/electron/grid 布局）、GraphContainer |
| [`@cyber/markdown`](packages/markdown) | Markdown 渲染 — MarkdownContent、CodeBlock（行号 + 复制） |
| [`@cyber/terminal`](packages/terminal) | 终端会话 — TerminalView（xterm.js）、SessionNavigator、会话管理工具函数 |
| [`@cyber/viewer`](packages/viewer) | APG 任务查看器 — LiveGraphView、ChatPanel、ExecutionTimeline、WebSocket 实时通信 |
| [`@cyber/realtime`](packages/realtime) | 实时通信 — Gateway WebSocket 客户端、SSE 流 |
| [`@cyber/ioa`](packages/ioa) | IOA 协作 — ForumView、ThreadList、CheckpointCard、GraphPanel、消息渲染注册表 |

### 独立应用

| 应用 | 说明 |
|---|---|
| [`@cyber/cstx-viewer`](packages/cstx-viewer) | CSTX 数据独立查看器应用 |

## 使用

作为 git submodule 引入，通过 `tsconfig.json` paths 直接引用源码：

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@cyber/ui": ["./cyber-ui/packages/ui/src/index.ts"],
      "@cyber/theme": ["./cyber-ui/packages/theme/src/index.ts"],
      "@cyber/cstx": ["./cyber-ui/packages/cstx/src/index.ts"],
      "@cyber/template": ["./cyber-ui/packages/template/src/index.tsx"],
      "@cyber/traffic": ["./cyber-ui/packages/traffic/src/index.tsx"],
      "@cyber/graph": ["./cyber-ui/packages/graph/src/index.ts"],
      "@cyber/markdown": ["./cyber-ui/packages/markdown/src/index.ts"]
    }
  }
}
```

Next.js / Vite 需配置 `transpilePackages` 以编译源码。

## 设计原则

- **CSTX 协议对齐** — 数据类型（CstxNode、CstxEdge）与 CSTX 协议保持一致，不与具体业务平台耦合
- **渲染与数据获取分离** — 组件只负责渲染，数据获取通过 props/回调注入
- **Radix + Tailwind 基座** — UI 原语基于 Radix UI 无障碍原语 + Tailwind CSS 样式
- **按需引入** — 各包独立，按需通过 paths 映射引入
