export interface CstxReportColumnSpec {
    key: string;
    title: string;
}

export interface CstxReportSheetSpec {
    id: string;
    title: string;
    primary_types: string[];
    max_depth: number;
    columns: CstxReportColumnSpec[];
}

export interface CstxReportTemplate {
    id: string;
    title: string;
    description: string;
    defaultQuery: string;
    sheets: CstxReportSheetSpec[];
}

export interface CstxReportPreviewSheet {
    id: string;
    title: string;
    columns: CstxReportColumnSpec[];
    rows: Array<Record<string, unknown>>;
    total: number;
    preview_limit?: number;
}

export interface CstxReportPreview {
    template_id: string;
    title: string;
    query?: string;
    project_id?: string;
    checkpoint_id?: string | null;
    sheets: CstxReportPreviewSheet[];
}

const IP_AGGREGATION_COLUMNS: CstxReportColumnSpec[] = [
    {key: 'cstx_id', title: 'CSTX ID'},
    {key: 'ip', title: 'IP'},
    {key: 'country', title: 'Country'},
    {key: 'area', title: 'Region'},
    {key: 'asn', title: 'ASN'},
    {key: 'as_name', title: 'AS Name'},
    {key: 'cdn', title: 'CDN'},
    {key: 'cloud', title: 'Cloud Provider'},
    {key: 'waf', title: 'WAF'},
    {key: 'domains', title: 'Associated Domains'},
    {key: 'ports', title: 'Ports'},
    {key: 'protocols', title: 'Protocols'},
    {key: 'services', title: 'Services'},
    {key: 'fingerprints', title: 'Fingerprints'},
    {key: 'vulnerability_count', title: 'Vulnerability Count'},
    {key: 'high_risk_vulnerabilities', title: 'High-Risk Vulnerabilities'},
    {key: 'sources', title: 'Sources'},
    {key: 'created_time', title: 'Discovery Time'},
];

const DOMAIN_AGGREGATION_COLUMNS: CstxReportColumnSpec[] = [
    {key: 'cstx_id', title: 'CSTX ID'},
    {key: 'domain', title: 'Domain'},
    {key: 'type', title: 'Type'},
    {key: 'resolved_ips', title: 'Resolved IPs'},
    {key: 'ports', title: 'Ports'},
    {key: 'protocols', title: 'Protocols'},
    {key: 'fingerprints', title: 'Fingerprints'},
    {key: 'vulnerability_count', title: 'Vulnerability Count'},
    {key: 'high_risk_vulnerabilities', title: 'High-Risk Vulnerabilities'},
    {key: 'icp', title: 'ICP Filing'},
    {key: 'registrar', title: 'Registrar'},
    {key: 'status', title: 'Status'},
    {key: 'sources', title: 'Sources'},
    {key: 'created_time', title: 'Discovery Time'},
];

export const SEARCH_REPORT_TEMPLATES: CstxReportTemplate[] = [
    {
        id: 'ip_domain_asset_aggregation',
        title: 'IP + Domain Asset Aggregation Report',
        description: 'Aggregates basic info, ports, fingerprints, and vulnerabilities based on CSTX paths from subdomain resolution to IP.',
        defaultQuery: 'subdomain -> ip',
        sheets: [
            {
                id: 'ip_aggregation',
                title: 'IP Aggregation',
                primary_types: ['ip'],
                max_depth: 3,
                columns: IP_AGGREGATION_COLUMNS,
            },
            {
                id: 'domain_aggregation',
                title: 'Domain Aggregation',
                primary_types: ['domain', 'subdomain'],
                max_depth: 4,
                columns: DOMAIN_AGGREGATION_COLUMNS,
            },
        ],
    },
];

export const DEFAULT_SEARCH_REPORT_TEMPLATE_ID = SEARCH_REPORT_TEMPLATES[0].id;
