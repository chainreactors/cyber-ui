// SCO/SRO types generated from easm.proto via cstx-codegen.
// One extension is one file: `easm.ts` replaces the old sco_gen/sro_gen pair.
export type {
  SCOBase, SCONode, SCONodeType, SCONodeTypeInterfaces,
  Domain, Subdomain, Ip, Cidr, Port, App, Url, Framework,
  Vuln, SarifVuln, Certificate, Company, Icp,
  Bucket, Endpoint, Host, Repository, Secret,
} from './easm'
export { SCO_TYPE_MAP, SCO_NODE_TYPES } from './easm'

export type { RelationType, SROBase } from './easm'
export { RELATION_TYPES } from './easm'

// Runtime join-key extensions (not in proto, computed by pipeline)
export type WithJoinKeys<T> = T & { _ip?: string; _port?: string; _cidr?: string }

// View model types
export type { SCOResultModel, SCOHostGroup, SCOPortNode, SCOMetrics } from './model'
