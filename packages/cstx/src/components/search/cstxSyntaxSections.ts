import { Braces, Code2, Columns2, GitBranch, Hash, Route, Sparkles } from 'lucide-react';
import type { SyntaxSection } from './SyntaxGuide';

export const CSTX_SYNTAX_SECTIONS: SyntaxSection[] = [
  {
    icon: Hash,
    title: '关键词搜索',
    color: 'text-orange-500',
    items: [
      { syntax: 'nginx', desc: '直接全文匹配名称和属性' },
      { syntax: '192.168.1.0', desc: '按 IP、域名、标题等文本直接查' },
      { syntax: 'subdomain["staging"]', desc: '在指定节点类型内做关键字匹配' },
      { syntax: 'app["vpn portal"]', desc: '应用类节点关键字搜索' },
    ],
  },
  {
    icon: Route,
    title: '图遍历',
    color: 'text-cyan-500',
    items: [
      { syntax: 'ip .. port', desc: '自动推断关系遍历' },
      { syntax: 'subdomain["login"] .. ip .. port', desc: '按关键字命中子域后继续自动遍历' },
      { syntax: 'ip .. port .. app .. vuln', desc: '从 IP 一路扩展到漏洞' },
      { syntax: 'ip -> open -> port', desc: '显式指定关系' },
      { syntax: 'ip -> open -> port -> hosts -> app', desc: '精确沿关系走到应用' },
      { syntax: 'subdomain -> resolve -> ip', desc: '子域名解析到 IP' },
      { syntax: 'domain ->*3 port', desc: '通配 BFS（限 3 跳）' },
      { syntax: 'ip ->* app', desc: '查找 IP 在任意关系下可达的应用' },
      { syntax: 'vuln ..< app', desc: '反向遍历' },
      { syntax: 'vuln <- exploit <- app', desc: '按显式反向关系回溯' },
      { syntax: 'ip ->* *', desc: '所有可达节点' },
    ],
  },
  {
    icon: Sparkles,
    title: '语义搜索',
    color: 'text-amber-500',
    items: [
      { syntax: '管理员后台', desc: '开启语义搜索后，纯文本直接按语义查找' },
      { syntax: 'ip["cdn"]', desc: 'DSL 关键字查询按语义匹配同类节点' },
      { syntax: 'app["vpn login portal"]', desc: '应用类节点语义匹配' },
      { syntax: 'ip .. app["payment gateway"]', desc: '图遍历与语义过滤组合使用' },
    ],
  },
  {
    icon: Code2,
    title: '属性过滤',
    color: 'text-blue-500',
    items: [
      { syntax: 'field="value"', desc: '模糊匹配 (子串)' },
      { syntax: 'field=="value"', desc: '精确匹配' },
      { syntax: 'field!=""', desc: '筛出该字段有值的结果' },
      { syntax: 'field!="value"', desc: '排除指定值' },
      { syntax: 'field>value', desc: '数值比较 (> < >= <=)' },
    ],
  },
  {
    icon: Braces,
    title: '逻辑组合',
    color: 'text-violet-500',
    items: [
      { syntax: '&&', desc: 'AND - 同时满足' },
      { syntax: '||', desc: 'OR - 满足其一' },
      { syntax: '( )', desc: '括号分组' },
    ],
  },
  {
    icon: GitBranch,
    title: '常用关系',
    color: 'text-emerald-500',
    items: [
      { syntax: 'contain', desc: 'domain -> subdomain, cidr -> ip' },
      { syntax: 'resolve', desc: 'subdomain -> ip' },
      { syntax: 'open', desc: 'ip -> port' },
      { syntax: 'hosts', desc: 'port -> app' },
      { syntax: 'exploit / affect', desc: 'app -> vuln -> target' },
    ],
  },
  {
    icon: Columns2,
    title: '通用字段',
    color: 'text-teal-500',
    items: [
      { syntax: 'name, type', desc: '节点名称 / 类型' },
      { syntax: 'ip, country, asn_number', desc: 'IP 相关' },
      { syntax: 'host, port, title', desc: '域名/端口/应用' },
      { syntax: 'vuln_id, severity, tags', desc: '漏洞相关' },
    ],
  },
];
