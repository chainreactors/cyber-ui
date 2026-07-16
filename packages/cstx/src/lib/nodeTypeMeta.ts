/**
 * Bilingual labels + one-line description for each node type. Kept separate
 * from nodeTypeConfig so generic term UI can use the dictionary without pulling
 * in the icon-heavy search configuration.
 */
export interface NodeTypeMeta {
    label: string;
    labelZh: string;
    description: string;
}

export const NODE_TYPE_META: Record<string, NodeTypeMeta> = {
    ip: {
        label: 'IP',
        labelZh: 'IP Address',
        description: 'Single IPv4 / IPv6 address',
    },
    domain: {
        label: 'Domain',
        labelZh: 'Domain',
        description: 'Top-level or registered domain (e.g. example.com)',
    },
    subdomain: {
        label: 'Subdomain',
        labelZh: 'Subdomain',
        description: 'Subdomain record under a registered domain (e.g. www.example.com)',
    },
    url: {
        label: 'URL',
        labelZh: 'URL',
        description: 'HTTP/HTTPS resource address with protocol',
    },
    app: {
        label: 'App',
        labelZh: 'App Fingerprint',
        description: 'Web application or service instance identified on a port',
    },
    host: {
        label: 'Host',
        labelZh: 'Host',
        description: 'Endpoint or server host entity including hostname, local IP, gateway, DNS, and domain role',
    },
    vulnerability: {
        label: 'Vulnerability',
        labelZh: 'Vulnerability',
        description: 'Confirmed or potential security weakness (POC / scanner output)',
    },
    vuln: {
        label: 'Vulnerability',
        labelZh: 'Vulnerability',
        description: 'Confirmed or potential security weakness (POC / scanner output)',
    },
    port: {
        label: 'Port',
        labelZh: 'Port',
        description: 'Externally accessible network port on an IP',
    },
    framework: {
        label: 'Framework',
        labelZh: 'Framework',
        description: 'Identified technology stack or middleware (Spring / Tomcat etc.)',
    },
    company: {
        label: 'Company',
        labelZh: 'Company',
        description: 'Corporate entity, usually identified via ICP / business registration',
    },
    cidr: {
        label: 'CIDR',
        labelZh: 'CIDR Block',
        description: 'IP address range (e.g. 10.0.0.0/16)',
    },
    icp: {
        label: 'ICP',
        labelZh: 'ICP Filing',
        description: 'ICP filing number (China mainland)',
    },
    project: {
        label: 'Project',
        labelZh: 'Project',
        description: 'Isolation boundary for assets and tasks',
    },
    certificate: {
        label: 'Certificate',
        labelZh: 'Certificate',
        description: 'TLS/SSL X.509 certificate identified on an endpoint',
    },
    bucket: {
        label: 'Bucket',
        labelZh: 'Bucket',
        description: 'Cloud object storage bucket (S3 / OSS / GCS)',
    },
    endpoint: {
        label: 'Endpoint',
        labelZh: 'Endpoint',
        description: 'HTTP API endpoint discovered via crawling or source analysis',
    },
    repository: {
        label: 'Repository',
        labelZh: 'Repository',
        description: 'Source code repository (GitHub / GitLab / Gitee)',
    },
    secret: {
        label: 'Secret',
        labelZh: 'Secret',
        description: 'Leaked credential or API key found in source / config',
    },
    sarif_vuln: {
        label: 'SARIF Vuln',
        labelZh: 'SARIF Vuln',
        description: 'SARIF v2.1.0 aligned vulnerability finding with lifecycle management',
    },
};

export const getNodeTypeMeta = (type?: string | null): NodeTypeMeta => {
    if (!type) return {label: 'Unknown', labelZh: 'Unknown', description: 'Unrecognized node type'};
    const meta = NODE_TYPE_META[type];
    if (meta) return meta;
    return {label: type, labelZh: type, description: 'Node type not registered in dictionary'};
};

export const getNodeTypeHoverText = (type?: string | null): string => {
    const meta = getNodeTypeMeta(type);
    return `${meta.label} - ${meta.description}`;
};
