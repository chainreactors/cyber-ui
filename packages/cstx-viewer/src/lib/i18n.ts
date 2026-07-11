import { createContext, useContext } from 'react';

export type Locale = 'zh' | 'en';

const dict = {
  // App shell
  'app.title': { zh: 'CSTX Viewer', en: 'CSTX Viewer' },

  // Tabs
  'tab.overview': { zh: '概览', en: 'Overview' },
  'tab.threat': { zh: '威胁', en: 'Threat' },
  'tab.assets': { zh: '资产', en: 'Assets' },
  'tab.relations': { zh: '关系', en: 'Relations' },
  'tab.graph': { zh: '图谱', en: 'Graph' },
  'tab.export': { zh: '导出', en: 'Export' },

  // Overview
  'ov.title': { zh: '攻击面概览', en: 'Attack Surface Overview' },
  'ov.vulns': { zh: '漏洞', en: 'Vulnerabilities' },
  'ov.affected': { zh: '受影响资产', en: 'Affected Assets' },
  'ov.totalAssets': { zh: '总资产', en: 'Total Assets' },
  'ov.assetTypes': { zh: '资产类型', en: 'Asset Types' },
  'ov.ips': { zh: 'IP 地址', en: 'IP Addresses' },
  'ov.sources': { zh: '数据源', en: 'Data Sources' },
  'ov.assetDist': { zh: '资产分布', en: 'Asset Distribution' },
  'ov.ipCoverage': { zh: 'IP 防护覆盖', en: 'IP Protection Coverage' },
  'ov.topDomains': { zh: 'Top 域名', en: 'Top Domains' },
  'ov.topPorts': { zh: 'Top 端口', en: 'Top Ports' },
  'ov.sub': { zh: '子域', en: 'sub' },

  // Threat
  'threat.title': { zh: '威胁态势', en: 'Threat Landscape' },
  'threat.severity': { zh: '严重程度分布', en: 'Severity Breakdown' },
  'threat.findings': { zh: '发现列表', en: 'Findings' },
  'threat.col.severity': { zh: '等级', en: 'Severity' },
  'threat.col.vuln': { zh: '漏洞', en: 'Vulnerability' },
  'threat.col.affected': { zh: '影响', en: 'Affected' },
  'threat.affectedByType': { zh: '受影响资产类型', en: 'Affected Asset Types' },
  'threat.noVulns': { zh: '未发现漏洞', en: 'No vulnerabilities found' },

  // Assets
  'assets.search': { zh: '搜索资产...', en: 'Search assets...' },
  'assets.all': { zh: '全部', en: 'All' },

  // Relations
  'rel.search': { zh: '搜索关系...', en: 'Search relations...' },
  'rel.all': { zh: '全部', en: 'All' },
  'rel.col.source': { zh: '源节点', en: 'Source' },
  'rel.col.relation': { zh: '关系', en: 'Relation' },
  'rel.col.target': { zh: '目标节点', en: 'Target' },

  // Export
  'export.title': { zh: '导出格式', en: 'Export Formats' },
  'export.snapshot': { zh: 'Snapshot JSON', en: 'Snapshot JSON' },
  'export.snapshotDesc': { zh: '完整图谱快照，可重新导入', en: 'Full graph snapshot for re-import' },
  'export.nodesCsv': { zh: '节点 CSV', en: 'Nodes CSV' },
  'export.nodesCsvDesc': { zh: '所有节点及字段展平', en: 'All nodes with fields flattened' },
  'export.edgesCsv': { zh: '边 CSV', en: 'Edges CSV' },
  'export.edgesCsvDesc': { zh: '所有边及关系类型', en: 'All edges with relation types' },
  'export.markdown': { zh: 'Markdown 报告', en: 'Markdown Report' },
  'export.markdownDesc': { zh: '摘要报告含统计表格', en: 'Summary report with stats tables' },

  // Loader
  'loader.drop': { zh: '拖放 CSTX 快照文件到此处', en: 'Drop a CSTX snapshot file here' },
  'loader.browse': { zh: '或点击浏览 — 支持 .json / .snapshot.json', en: 'or click to browse — supports .json / .snapshot.json' },
  'loader.loading': { zh: '加载中...', en: 'Loading snapshot...' },

  // Severity names
  'sev.critical': { zh: '严重', en: 'Critical' },
  'sev.high': { zh: '高危', en: 'High' },
  'sev.medium': { zh: '中危', en: 'Medium' },
  'sev.low': { zh: '低危', en: 'Low' },
  'sev.info': { zh: '信息', en: 'Info' },
  'sev.unknown': { zh: '未知', en: 'Unknown' },
} as const;

export type I18nKey = keyof typeof dict;

export function t(key: I18nKey, locale: Locale): string {
  return dict[key]?.[locale] ?? key;
}

export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language || '';
  return lang.startsWith('zh') ? 'zh' : 'en';
}

export const LocaleContext = createContext<Locale>('en');

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useLocale();
  return (key: I18nKey) => t(key, locale);
}
