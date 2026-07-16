/**
 * Node Type Configuration - Type-specific display fields and icons
 */
import {
    Globe,
    Link,
    MapPin,
    Network,
    ExternalLink,
    Activity,
    Bug,
    Building,
    Code,
    FolderTree,
    FileText,
    Server,
    ShieldCheck,
    Database,
    Route,
    GitBranch,
    KeyRound,
    ShieldAlert,
} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';

export {
    NODE_TYPE_META,
    getNodeTypeHoverText,
    getNodeTypeMeta,
    type NodeTypeMeta,
} from './nodeTypeMeta';

/** Sensitive fingerprint signal type configuration (5 categories from GoGo _classify_framework_signal) */
export const SENSITIVE_SIGNAL_CONFIG: Record<string, { label: string; color: string; bgClass: string; textClass: string; borderClass: string }> = {
    device:   { label: 'Device',   color: '#ff6b35', bgClass: 'bg-orange-100', textClass: 'text-orange-700', borderClass: 'border-orange-300' },
    vpn:      { label: 'VPN',      color: '#8b5cf6', bgClass: 'bg-violet-100', textClass: 'text-violet-700', borderClass: 'border-violet-300' },
    firewall: { label: 'Firewall', color: '#ff3b82', bgClass: 'bg-pink-100',   textClass: 'text-pink-700',   borderClass: 'border-pink-300' },
    waf:      { label: 'WAF',      color: '#ee5a6f', bgClass: 'bg-rose-100',   textClass: 'text-rose-700',   borderClass: 'border-rose-300' },
    info:     { label: 'Notable',  color: '#feca57', bgClass: 'bg-yellow-100', textClass: 'text-yellow-700', borderClass: 'border-yellow-300' },
};

export interface NodeTypeConfig {
    icon: LucideIcon;
    primaryFields: string[];
    badges: string[];
    stats: string[];
    relationshipTypes: string[];
}

export interface ParsedNodeAttributes {
    badges: Array<{key: string; value: string; label: string; fixed: boolean; importance?: FieldImportance}>;
    fields: Array<{key: string; value: any; label: string; fixed: boolean; importance?: FieldImportance}>;
    stats: Array<{key: string; count: number; label: string}>;
    extraFields: Array<{key: string; value: any}>;
}

export type FieldImportance = 'important' | 'normal';

const BADGE_FIELD_KEYS = new Set([
    'severity', 'status_code', 'cdn_name', 'waf_name', 'cloud_name',
    'protocol', 'product', 'content_type', 'language',
    'status', 'registrar', 'cve', 'cve_id',
    'vuln_type', 'signal_type', 'fingerprint_type',
]);

const CDN_FLAG_KEYS = new Set(['cdn', 'cloud', 'waf']);
const BOOLEANISH_CDN_FLAG_VALUES = new Set<unknown>([true, false, 1, 0, 'true', 'false', '1', '0']);

const META_FIELD_KEYS = new Set([
    'source', 'sources', 'tags',
    'name', 'type', 'cstx_id',
    'created_time', 'updated_time', 'last_seen',
    'value',
    '_extra',
    'project_id', 'project',
]);

const IMPORTANT_FIELD_KEYS = new Set([
    'title', 'url', 'host',
    'ip', 'domain', 'port', 'protocol', 'service',
    'product', 'version', 'server', 'banner',
    'framework', 'frameworks', 'semantic_frameworks', 'language',
    'vuln_id', 'vuln_name', 'vuln_type', 'severity',
    'cvss_score', 'cvssscore', 'cve', 'cve_id',
    'signal_type', 'fingerprint_type', 'focus_fingerprint',
]);

const IMPORTANT_FIELD_PATTERNS = [
    /^cvss/i,
    /^cve(_id)?$/i,
    /(^|_)vuln(_|$)/i,
    /(^|_)frameworks?$/i,
    /fingerprint/i,
];

const getFieldImportance = (key: string, fixed: boolean): FieldImportance => {
    if (fixed) return 'important';
    if (IMPORTANT_FIELD_KEYS.has(key)) return 'important';
    return IMPORTANT_FIELD_PATTERNS.some(pattern => pattern.test(key)) ? 'important' : 'normal';
};

const compareImportance = (
    left: {fixed: boolean; importance?: FieldImportance},
    right: {fixed: boolean; importance?: FieldImportance},
): number => {
    const importanceDiff = Number(right.importance === 'important') - Number(left.importance === 'important');
    if (importanceDiff !== 0) return importanceDiff;
    return Number(right.fixed) - Number(left.fixed);
};

export const NODE_TYPE_CONFIG: Record<string, NodeTypeConfig> = {
    ip: {
        icon: MapPin,
        primaryFields: ['country', 'asn_number', 'as_name', 'area', 'cdn_name', 'waf_name', 'cloud_name'],
        badges: ['cdn_name', 'waf_name', 'cloud_name'],
        stats: ['port_count', 'vuln_count', 'domain_count'],
        relationshipTypes: ['domain', 'port', 'vuln'],
    },
    domain: {
        icon: Globe,
        primaryFields: ['registrar', 'ns', 'icp_number'],
        badges: ['registrar'],
        stats: ['subdomain_count', 'ip_count'],
        relationshipTypes: ['subdomain', 'ip', 'company', 'icp'],
    },
    subdomain: {
        icon: Link,
        primaryFields: ['domain', 'ip', 'cname', 'source'],
        badges: ['source'],
        stats: ['ip_count'],
        relationshipTypes: ['domain', 'ip', 'url'],
    },
    url: {
        icon: ExternalLink,
        primaryFields: ['title', 'status_code', 'content_type', 'server'],
        badges: ['status_code', 'content_type'],
        stats: [],
        relationshipTypes: ['subdomain', 'app'],
    },
    app: {
        icon: Activity,
        primaryFields: ['port', 'protocol', 'title', 'status_code', 'product', 'version'],
        badges: ['protocol', 'status_code', 'product'],
        stats: ['vuln_count'],
        relationshipTypes: ['ip', 'port', 'vuln', 'framework'],
    },
    host: {
        icon: Server,
        primaryFields: ['hostname', 'domain_name', 'local_ips', 'gateway_ips', 'dns_servers'],
        badges: ['domain_role'],
        stats: ['ip_count', 'app_count', 'vuln_count'],
        relationshipTypes: ['ip', 'domain', 'app'],
    },
    vuln: {
        icon: Bug,
        primaryFields: ['vuln_id', 'vuln_name', 'severity', 'cvss_score', 'cvssscore', 'cve', 'cve_id', 'vuln_type'],
        badges: ['severity', 'cve', 'cve_id', 'vuln_type'],
        stats: ['affected_count'],
        relationshipTypes: ['ip', 'app', 'port', 'url'],
    },
    port: {
        icon: Network,
        primaryFields: ['port', 'protocol', 'service', 'product', 'banner'],
        badges: ['protocol', 'service'],
        stats: [],
        relationshipTypes: ['ip', 'vuln'],
    },
    company: {
        icon: Building,
        primaryFields: ['company_name', 'registration', 'icp_number'],
        badges: ['icp_number'],
        stats: ['domain_count', 'ip_count', 'asn_count'],
        relationshipTypes: ['domain', 'ip', 'icp'],
    },
    cidr: {
        icon: Network,
        primaryFields: ['cidr', 'country', 'asn_number', 'subnet_mask'],
        badges: ['country'],
        stats: ['ip_count'],
        relationshipTypes: ['ip', 'asn'],
    },
    framework: {
        icon: Code,
        primaryFields: ['framework', 'version', 'language'],
        badges: ['language'],
        stats: ['app_count'],
        relationshipTypes: ['app', 'url'],
    },
    project: {
        icon: FolderTree,
        primaryFields: ['project_name', 'last_scan'],
        badges: [],
        stats: ['asset_count', 'ip_count', 'domain_count'],
        relationshipTypes: [],
    },
    icp: {
        icon: FileText,
        primaryFields: ['icp_number', 'company_name', 'status'],
        badges: ['status'],
        stats: ['domain_count'],
        relationshipTypes: ['company', 'domain'],
    },
    certificate: {
        icon: ShieldCheck,
        primaryFields: ['fingerprint', 'issuer', 'subject', 'not_before', 'not_after'],
        badges: [],
        stats: [],
        relationshipTypes: ['ip', 'domain', 'subdomain'],
    },
    bucket: {
        icon: Database,
        primaryFields: ['provider', 'name', 'region', 'endpoint', 'acl'],
        badges: ['provider', 'acl'],
        stats: ['object_count'],
        relationshipTypes: ['domain', 'ip'],
    },
    endpoint: {
        icon: Route,
        primaryFields: ['url', 'method', 'path', 'status_code', 'content_type'],
        badges: ['method', 'status_code'],
        stats: [],
        relationshipTypes: ['app', 'url'],
    },
    repository: {
        icon: GitBranch,
        primaryFields: ['provider', 'name', 'owner', 'description', 'stars'],
        badges: ['provider'],
        stats: ['stars'],
        relationshipTypes: ['company', 'secret'],
    },
    secret: {
        icon: KeyRound,
        primaryFields: ['kind', 'detector', 'severity', 'file_path', 'verified'],
        badges: ['severity', 'kind'],
        stats: [],
        relationshipTypes: ['repository', 'endpoint'],
    },
    sarif_vuln: {
        icon: ShieldAlert,
        primaryFields: ['vuln_id', 'title', 'level', 'kind', 'rule_id', 'baseline_state'],
        badges: ['level', 'kind'],
        stats: [],
        relationshipTypes: ['app', 'endpoint'],
    },
};

export const getNodeIcon = (type: string): LucideIcon => {
    return NODE_TYPE_CONFIG[type]?.icon ?? Globe;
};

/**
 * Dynamically classify all node attributes into badges, key-value fields, and stats.
 * - `*_count` suffix -> stats (shown only when > 0)
 * - BADGE_FIELD_KEYS -> badge pills in Attributes section
 * - META_FIELD_KEYS (source, tags) -> excluded (shown in Metadata footer separately)
 * - Everything else -> regular key-value fields
 */
export const parseNodeAttributes = (
    attributes: Record<string, any>,
    type?: string,
): ParsedNodeAttributes => {
    const badges: ParsedNodeAttributes['badges'] = [];
    const fields: ParsedNodeAttributes['fields'] = [];
    const stats: ParsedNodeAttributes['stats'] = [];
    const extraFields: ParsedNodeAttributes['extraFields'] = [];

    const primaryFields = new Set(NODE_TYPE_CONFIG[type ?? '']?.primaryFields ?? []);

    for (const [key, value] of Object.entries(attributes)) {
        if (value === null || value === undefined || value === '') continue;
        if (Array.isArray(value) && value.length === 0) continue;
        if (META_FIELD_KEYS.has(key)) continue;

        if (CDN_FLAG_KEYS.has(key) && BOOLEANISH_CDN_FLAG_VALUES.has(value)) {
            const truthy = value === true || value === 'true' || value === 1 || value === '1';
            const nameVal = attributes[`${key}_name`];
            const hasName = nameVal !== null && nameVal !== undefined && String(nameVal).trim() !== '';
            if (truthy && !hasName) {
                badges.push({
                    key,
                    value: 'Yes',
                    label: formatFieldLabel(key),
                    fixed: true,
                    importance: 'important',
                });
            }
            continue;
        }

        const fixed = primaryFields.has(key);
        const importance = value === 0 || value === false ? undefined : getFieldImportance(key, fixed);

        if (key.endsWith('_count')) {
            const count = Number(value);
            if (count > 0) stats.push({key, count, label: formatFieldLabel(key)});
        } else if (BADGE_FIELD_KEYS.has(key)) {
            badges.push({
                key,
                value: String(value),
                label: formatFieldLabel(key),
                fixed,
                ...(importance ? {importance} : {}),
            });
        } else {
            fields.push({
                key,
                value,
                label: formatFieldLabel(key),
                fixed,
                ...(importance ? {importance} : {}),
            });
        }
    }

    badges.sort(compareImportance);
    fields.sort(compareImportance);

    return {badges, fields, stats, extraFields};
};

export const getRelationshipTypes = (type: string): string[] => {
    return [...(NODE_TYPE_CONFIG[type]?.relationshipTypes ?? [])];
};

export const getNodeConnectionCounts = (type: string, attributes: Record<string, any>): number => {
    const config = NODE_TYPE_CONFIG[type];
    if (!config) return 0;

    return config.stats.reduce((total, field) => {
        return total + (Number(attributes[field]) || 0);
    }, 0);
};

export const formatFieldLabel = (key: string): string => {
    const labelMap: Record<string, string> = {
        country: 'Country',
        asn_number: 'ASN',
        as_name: 'AS Name',
        area: 'Region',
        cdn_name: 'CDN',
        waf_name: 'WAF',
        cloud_name: 'Cloud Provider',
        cdn: 'CDN',
        waf: 'WAF',
        cloud: 'Cloud Provider',
        registrar: 'Registrar',
        ns: 'NS',
        icp_number: 'ICP Filing',
        domain: 'Domain',
        ip: 'IP',
        cname: 'CNAME',
        source: 'Source',
        title: 'Title',
        status_code: 'Status Code',
        content_type: 'Content Type',
        content_length: 'Content Length',
        server: 'Server',
        webserver: 'Server',
        midware: 'Middleware',
        jarm: 'JARM',
        favicon: 'Favicon',
        favicon_path: 'Favicon Path',
        location: 'Redirect',
        tls: 'TLS',
        tls_version: 'TLS Version',
        cipher: 'Cipher Suite',
        sni: 'SNI',
        subject_cn: 'Cert Subject',
        issuer_cn: 'Issuer',
        issuer_org: 'Issuer Org',
        not_before: 'Valid From',
        not_after: 'Expires',
        ja3_hash: 'JA3',
        ja3s_hash: 'JA3S',
        port: 'Port',
        protocol: 'Protocol',
        product: 'Product',
        version: 'Version',
        vuln_id: 'Vuln ID',
        vuln_name: 'Vuln Name',
        vuln_type: 'Vuln Type',
        severity: 'Severity',
        cvss_score: 'CVSS',
        cvssscore: 'CVSS',
        cve: 'CVE',
        cve_id: 'CVE',
        service: 'Service',
        banner: 'Banner',
        company_name: 'Company',
        registration: 'Registration',
        cidr: 'CIDR',
        subnet_mask: 'Subnet Mask',
        framework: 'Framework',
        frameworks: 'Fingerprints',
        semantic_frameworks: 'Semantic Fingerprints',
        signal_type: 'Signal Type',
        fingerprint_type: 'Fingerprint Type',
        focus_fingerprint: 'Focus Fingerprint',
        url: 'URL',
        host: 'Host',
        app_id: 'Application',
        language: 'Language',
        project_name: 'Project Name',
        last_scan: 'Last Scan',
        status: 'Status',
        port_count: 'Ports',
        vuln_count: 'Vulnerabilities',
        domain_count: 'Domains',
        subdomain_count: 'Subdomains',
        ip_count: 'IPs',
        affected_count: 'Affected',
        asn_count: 'ASNs',
        app_count: 'Applications',
        asset_count: 'Assets',
        // Certificate
        fingerprint: 'Fingerprint',
        serial: 'Serial',
        issuer: 'Issuer',
        subject: 'Subject',
        san: 'SAN',
        // Bucket
        provider: 'Provider',
        region: 'Region',
        endpoint: 'Endpoint',
        acl: 'ACL',
        object_count: 'Objects',
        // Endpoint
        method: 'Method',
        path: 'Path',
        parameters: 'Parameters',
        // Repository
        owner: 'Owner',
        description: 'Description',
        stars: 'Stars',
        is_fork: 'Fork',
        matched_dorks: 'Matched Dorks',
        // Secret
        kind: 'Kind',
        detector: 'Detector',
        redacted: 'Redacted',
        file_path: 'File',
        line: 'Line',
        commit: 'Commit',
        verified: 'Verified',
        // SarifVuln
        rule_id: 'Rule ID',
        level: 'Level',
        baseline_state: 'Baseline',
        evidence: 'Evidence',
        asset_cstx_id: 'Asset ID',
    };
    return labelMap[key] ?? key;
};
