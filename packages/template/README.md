# @cyber/template

安全规则模板渲染组件。提供 POC / 指纹规则的展示卡片、严重性徽章、CVSS 评分圆环、YAML 编辑器和 Nuclei 模板面板。

## 组件

| 组件 | 说明 |
|------|------|
| `POCCard` | POC 展示卡片，支持 default / compact 两种变体，显示 severity、CVE、CVSS、CWE、EPSS、tags |
| `FingerprintCard` | 指纹展示卡片，显示 protocol、vendor/product/category、tags、match_count |
| `SeverityBadge` | 严重性等级徽章（critical / high / medium / low / info） |
| `POCStatusBadge` | POC 状态徽章（active / pending / draft / inactive） |
| `CVSSScoreCircle` | CVSS 评分圆环可视化 |
| `ResultCard` | 扫描结果展示卡片（漏洞 / 匹配器 / 提取器详情） |
| `MatcherDetailDialog` | 匹配器详情弹窗 |
| `JsonViewer` | JSON 数据可折叠查看器 |
| `YamlEditor` | Monaco YAML 编辑器 |
| `NucleiTemplatePanel` | Nuclei 模板完整展示面板 |
| `CyberHubPocTemplateViewer` | POC 模板查看器 Shell（slot 化，接受 testPanel / associationPanel 等） |

## 类型

- `CyberHubPocTemplate` — POC 模板数据结构
- `CyberHubFingerprintTemplate` — 指纹模板数据结构（含 alias）
- `ScanResultData` / `ResultCardProps` — 扫描结果
- `NucleiTemplateModel` / `NucleiHttpTemplate` — Nuclei 模板解析结果
- `SeverityLevel` / `SeverityConfig` — 严重性等级配置
- `POCStatusValue` — POC 状态枚举

## 工具函数

- `parseNucleiTemplate` / `normalizeRuleEntries` — Nuclei YAML 解析
- `getSeverityConfig` / `getSeverityClassName` — 严重性样式工具
- `copyToClipboard` — 剪贴板操作
- `formatRelativeTime` / `formatFullTime` — 日期格式化

## 使用

```ts
import { POCCard, SeverityBadge, YamlEditor, CyberHubPocTemplate } from "@cyber/template"
```

Peer dependencies: `react`, `react-dom`
