/**
 * Search Utilities - Formatting and color mapping functions
 */
import {
    formatRelativeTimeValue,
    formatTimeValue,
    type TimeDisplayValue,
} from './timeDisplay';

const isTimeLikeField = (key: string): boolean => (
    key.includes('date')
    || key.includes('time')
    || key.endsWith('_at')
    || key === 'last_scan'
);

export const formatFieldValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return '-';

    if (isTimeLikeField(key)) {
        try {
            const formatted = formatTimeValue(value, '');
            if (formatted) return formatted;
            return String(value);
        } catch {
            return String(value);
        }
    }

    if (typeof value === 'number') {
        return formatCount(value);
    }

    if (Array.isArray(value)) {
        return value.join(', ');
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
};

export const getStatusColor = (statusCode: number | string): string => {
    const code = Number(statusCode);
    if (isNaN(code)) return 'bg-gray-100 text-gray-700 border-gray-300';

    if (code >= 200 && code < 300) {
        return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800';
    }
    if (code >= 300 && code < 400) {
        return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
    }
    if (code >= 400 && code < 500) {
        return 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800';
    }
    if (code >= 500) {
        return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800';
    }

    return 'bg-gray-100 text-gray-700 border-gray-300';
};

export const getSeverityColor = (severity: string): string => {
    const sev = severity?.toLowerCase();

    switch (sev) {
        case 'critical':
            return 'bg-red-500 text-white border-red-600';
        case 'high':
            return 'bg-orange-500 text-white border-orange-600';
        case 'medium':
            return 'bg-yellow-400 text-black border-yellow-500';
        case 'low':
            return 'bg-green-500 text-white border-green-600';
        case 'info':
            return 'bg-blue-500 text-white border-blue-600';
        default:
            return 'bg-gray-100 text-gray-700 border-gray-300';
    }
};

export const getBorderAccent = (node: any): string => {
    if (node.type === 'vuln' && node.attributes?.severity?.toLowerCase() === 'critical') {
        return 'border-l-4 border-l-red-500';
    }

    if (node.type === 'vuln' && node.attributes?.severity?.toLowerCase() === 'high') {
        return 'border-l-4 border-l-orange-500';
    }

    return '';
};

export const isFingerprintSourceCode = (src: string): boolean =>
    /^\d+$/.test(src.trim());

const FINGERPRINT_FROM_MAP: Record<string, {label: string; desc: string}> = {
    '0': {label: 'Rule Match', desc: 'Default rule match (header / body keyword features)'},
    '1': {label: 'Active Probe', desc: 'Active probing match'},
    '2': {label: 'Icon Match', desc: 'Favicon icon hash match'},
    '3': {label: '404 Feature', desc: '404 page feature match'},
    '4': {label: 'Inference', desc: 'Inference / weak feature match, lower confidence'},
    '5': {label: 'Redirect', desc: 'Identified during redirect'},
    '6': {label: 'Fingers Rules', desc: 'Identified by fingers built-in rule set'},
    '7': {label: 'FingerprintHub', desc: 'Identified by FingerprintHub rules'},
    '8': {label: 'Wappalyzer', desc: 'Identified by Wappalyzer rules'},
    '9': {label: 'EHole', desc: 'Identified by EHole rules'},
    '10': {label: 'Goby', desc: 'Identified by Goby rules'},
    '11': {label: 'Nmap', desc: 'Identified by Nmap service fingerprints'},
};

export const fingerprintSourceLabel = (src: string): string => {
    const code = src.trim();
    return FINGERPRINT_FROM_MAP[code]?.label ?? `Source ${code}`;
};

export const fingerprintSourceTitle = (src: string): string => {
    const code = src.trim();
    const entry = FINGERPRINT_FROM_MAP[code];
    const what = entry ? `${entry.label}: ${entry.desc}` : `Unknown identification method (code ${code})`;
    return `Fingerprint identification - ${what} (gogo/fingers From=${code})`;
};

export const formatCount = (count: number): string => {
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`;
    }
    return String(count);
};

export const parseRelationships = (node: any): Array<{type: string; count: number}> => {
    const relationships: Array<{type: string; count: number}> = [];
    const attributes = node.attributes || {};

    const relationshipKeys = Object.keys(attributes).filter(key =>
        key.endsWith('_count') && !['port_count', 'vuln_count'].includes(key)
    );

    relationshipKeys.forEach(key => {
        const count = Number(attributes[key]);
        if (count > 0) {
            const type = key.replace('_count', '');
            relationships.push({type, count});
        }
    });

    if (attributes.connected_ips && Array.isArray(attributes.connected_ips)) {
        relationships.push({type: 'ip', count: attributes.connected_ips.length});
    }
    if (attributes.connected_domains && Array.isArray(attributes.connected_domains)) {
        relationships.push({type: 'domain', count: attributes.connected_domains.length});
    }
    if (attributes.connected_ports && Array.isArray(attributes.connected_ports)) {
        relationships.push({type: 'port', count: attributes.connected_ports.length});
    }
    if (attributes.connected_vulnerabilities && Array.isArray(attributes.connected_vulnerabilities)) {
        relationships.push({type: 'vuln', count: attributes.connected_vulnerabilities.length});
    }

    return relationships;
};

export const getRelationshipIcon = (relType: string): string => {
    const iconMap: Record<string, string> = {
        ip: '\u{1F310}',
        domain: '\u{1F517}',
        subdomain: '\u{1F517}',
        port: '\u{1F50C}',
        vuln: '\u{1F41B}',
        sarif_vuln: '\u{1F41B}',
        app: '\u{1F4F1}',
        company: '\u{1F3E2}',
        framework: '\u{1F527}',
        cidr: '\u{1F310}',
        url: '\u{1F517}',
        certificate: '\u{1F512}',
        icp: '\u{1F4C4}',
        bucket: '\u{1F4E6}',
        endpoint: '\u{1F6A9}',
        host: '\u{1F5A5}',
        repository: '\u{1F4C2}',
        secret: '\u{1F511}',
    };
    return iconMap[relType] ?? '→';
};

export const formatRelativeTime = (timestamp: TimeDisplayValue): string => {
    return formatRelativeTimeValue(timestamp, {fallbackText: ''}) || '';
};

export const formatAbsoluteDate = (timestamp: TimeDisplayValue): string => {
    return formatTimeValue(timestamp, '');
};

const TYPE_COLORS: Record<string, string> = {
    ip: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300',
    domain: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300',
    subdomain: 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-950 dark:text-teal-300',
    url: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300',
    app: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300',
    vuln: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300',
    sarif_vuln: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300',
    port: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300',
    company: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300',
    framework: 'bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-950 dark:text-pink-300',
    cidr: 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-950 dark:text-sky-300',
    certificate: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
    icp: 'bg-lime-100 text-lime-700 border-lime-300 dark:bg-lime-950 dark:text-lime-300',
    bucket: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300 dark:bg-fuchsia-950 dark:text-fuchsia-300',
    endpoint: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300',
    host: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-950 dark:text-slate-300',
    repository: 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-950 dark:text-violet-300',
    secret: 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-950 dark:text-stone-300',
};

export const getTypeColor = (type: string): string => {
    if (type === 'vulnerability') return TYPE_COLORS.vuln;
    return TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-700 border-gray-300';
};
