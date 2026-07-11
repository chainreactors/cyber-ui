/**
 * Framework/product classification - aligned with backend export_service keyword table.
 * Products/CPE list classified by _classify_product; framework nodes classified by _fw_class.
 * The fingers fingerprint library tags do not contain midware semantic categories,
 * so classification relies on product name substring matching.
 */

const MIDWARE_KEYS = [
    'nginx', 'apache', 'httpd', 'tomcat', 'iis', 'jboss', 'weblogic',
    'websphere', 'jetty', 'openresty', 'lighttpd', 'caddy', 'haproxy',
    'kong', 'kestrel', 'undertow', 'resin', 'f5', 'bigip', 'akamaighost',
    'application-gateway', 'litespeed', 'tengine', 'envoy', 'traefik',
];
const LANGUAGE_KEYS = [
    'php', 'java', 'asp.net', 'asp ', 'python', 'ruby', 'perl', 'nodejs',
    'node.js', 'golang', '.net', 'jsp', 'coldfusion',
];
const FRAMEWORK_KEYS = [
    'wordpress', 'struts', 'spring', 'laravel', 'django', 'flask',
    'thinkphp', 'yii', 'rails', 'express', 'vue', 'react', 'angular',
    'drupal', 'joomla', 'axis2', 'shiro', 'fastjson', 'weblogic console',
];

export type FwCategory = 'midware' | 'language' | 'framework' | 'component';

export const FW_CATEGORY_LABELS: Record<FwCategory, string> = {
    midware: 'Middleware',
    language: 'Site Language',
    framework: 'Framework',
    component: 'Component',
};

/** Extract product name from CPE string or raw banner (preserves original case) */
const productDisplay = (raw: string): string => {
    const s = String(raw ?? '').trim();
    if (!s) return '';
    if (s.toLowerCase().startsWith('cpe:')) {
        const parts = s.split(':');
        const prod = parts.length >= 5 ? parts[4].trim() : '';
        return prod === '*' ? '' : prod;
    }
    return s.split('/')[0].trim();
};

const normalizeTags = (raw: unknown): string[] => {
    if (!raw) return [];
    let value = raw;
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) return [];
        try {
            value = JSON.parse(trimmed);
        } catch {
            value = trimmed;
        }
    }
    const items = Array.isArray(value) ? value : [value];
    return items.map(item => String(item).trim().toLowerCase()).filter(Boolean);
};

/** Classify by product name substring; empty name returns null, unmatched defaults to component */
export const classifyFramework = (raw: string): FwCategory | null => {
    const name = productDisplay(raw).toLowerCase();
    if (!name) return null;
    if (MIDWARE_KEYS.some(k => name.includes(k))) return 'midware';
    if (LANGUAGE_KEYS.some(k => name.includes(k))) return 'language';
    if (FRAMEWORK_KEYS.some(k => name.includes(k))) return 'framework';
    return 'component';
};

/** Classify framework-type nodes by name/product; only framework nodes return a result */
export const classifyFrameworkNode = (
    node: {type?: string; name?: string; attributes?: Record<string, any>},
): {category: FwCategory; label: string} | null => {
    if (node?.type !== 'framework') return null;
    const raw = node.name
        || node.attributes?.product
        || node.attributes?.name
        || '';
    const name = String(raw).trim().toLowerCase();
    if (!name) return null;
    const tags = normalizeTags(node.attributes?.tags);
    let category: FwCategory = 'framework';
    if (MIDWARE_KEYS.some(k => name.includes(k)) || tags.includes('midware') || tags.includes('middleware')) {
        category = 'midware';
    } else if (FRAMEWORK_KEYS.some(k => name.includes(k))) {
        category = 'framework';
    } else if (tags.includes('component')) {
        category = 'component';
    }
    return {category, label: FW_CATEGORY_LABELS[category]};
};
