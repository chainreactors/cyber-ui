import type { SCONode, Ip, Port, App, Url, Framework, Vuln, SCOResultModel, SCOHostGroup, SCOPortNode, WithJoinKeys } from '../types'

export function buildSCOModel(nodes: SCONode[], duration = ''): SCOResultModel {
  const ips: Ip[] = []
  const ports: Port[] = []
  const apps: WithJoinKeys<App>[] = []
  const urls: WithJoinKeys<Url>[] = []
  const frameworks: Framework[] = []
  const vulns: Vuln[] = []

  for (const node of nodes) {
    switch (node.cstx_type) {
      case 'ip': ips.push(node as Ip); break
      case 'port': ports.push(node as Port); break
      case 'app': apps.push(node as WithJoinKeys<App>); break
      case 'url': urls.push(node as WithJoinKeys<Url>); break
      case 'framework': frameworks.push(node as Framework); break
      case 'vuln': vulns.push(node as Vuln); break
    }
  }

  const portIndex = new Map<string, SCOPortNode>()
  for (const p of ports) {
    portIndex.set(`${p.ip}:${p.port}`, { port: p, urls: [], frameworks: [], vulns: [] })
  }

  for (const app of apps) {
    const node = portIndex.get(`${app._ip}:${app._port}`)
    if (node) node.app = app
  }

  for (const url of urls) {
    const key = urlToPortKey(url)
    const node = key ? portIndex.get(key) : undefined
    if (node) node.urls.push(url)
  }

  for (const fw of frameworks) {
    for (const [, node] of portIndex) {
      if (node.app?.frameworks?.includes(fw.name)) {
        node.frameworks.push(fw)
        break
      }
    }
  }

  for (const v of vulns) {
    const key = v.ip && v.port ? `${v.ip}:${v.port}` : undefined
    const node = key ? portIndex.get(key) : undefined
    if (node) node.vulns.push(v)
  }

  const ipGroups = new Map<string, SCOHostGroup>()
  for (const ip of ips) {
    ipGroups.set(ip.ip, { ip, ports: [] })
  }

  for (const [key, node] of portIndex) {
    const ipStr = key.split(':')[0]
    let group = ipGroups.get(ipStr)
    if (!group) {
      group = { ip: { cstx_type: 'ip', cstx_id: `ip:${ipStr}`, ip: ipStr }, ports: [] }
      ipGroups.set(ipStr, group)
    }
    group.ports.push(node)
  }

  for (const group of ipGroups.values()) {
    group.ports.sort((a, b) => parseInt(a.port.port, 10) - parseInt(b.port.port, 10))
  }

  const hosts = Array.from(ipGroups.values()).sort((a, b) => a.ip.ip.localeCompare(b.ip.ip))

  return {
    hosts,
    metrics: { ips: ips.length, ports: ports.length, apps: apps.length, urls: urls.length, frameworks: frameworks.length, vulns: vulns.length, duration },
  }
}

function urlToPortKey(url: Url): string | undefined {
  if (url._ip && url._port) return `${url._ip}:${url._port}`
  if (url.ip && url.port != null) return `${url.ip}:${url.port}`
  try {
    const raw = url.scheme.includes('://') ? url.scheme : `${url.scheme}://${url.host || 'localhost'}`
    const parsed = new globalThis.URL(raw)
    const host = parsed.hostname
    const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80')
    return `${host}:${port}`
  } catch { return undefined }
}
