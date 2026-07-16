// SCO/SRO types generated from proto via cstx-codegen
export type {
  SCOBase, SCONode, SCONodeType, SCONodeTypeInterfaces,
  Domain, Subdomain, Ip, Cidr, Port, App, Url, Framework,
  Vuln, SarifVuln, Certificate, Company, Icp,
  Bucket, Endpoint, Host, Repository, Secret,
} from './sco_gen'
export { SCO_TYPE_MAP, SCO_NODE_TYPES } from './sco_gen'

export type { RelationType, SROBase } from './sro_gen'
export { RELATION_TYPES } from './sro_gen'

// Runtime join-key extensions (not in proto, computed by pipeline)
export type WithJoinKeys<T> = T & { _ip?: string; _port?: string; _cidr?: string }

// View model types
export type { SCOResultModel, SCOHostGroup, SCOPortNode, SCOMetrics } from './model'
