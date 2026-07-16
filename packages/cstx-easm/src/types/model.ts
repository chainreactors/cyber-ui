import type { Ip, Port, App, Url, Framework, Vuln } from './sco_gen'

export type SCOResultModel = {
  hosts: SCOHostGroup[]
  metrics: SCOMetrics
}

export type SCOHostGroup = {
  ip: Ip
  ports: SCOPortNode[]
}

export type SCOPortNode = {
  port: Port
  app?: App
  urls: Url[]
  frameworks: Framework[]
  vulns: Vuln[]
}

export type SCOMetrics = {
  ips: number
  ports: number
  apps: number
  urls: number
  frameworks: number
  vulns: number
  duration: string
}
