import type {SearchPresetRankingContext} from './searchPresets';

export type SearchRankingContext = 'default' | SearchPresetRankingContext;

const FOCUS_SIGNAL_TYPES = new Set(['device', 'vpn', 'firewall', 'waf', 'info']);
const FOCUS_TEXT_TOKENS = ['device', 'vpn', 'firewall', 'waf'];
const FOCUS_FINGERPRINT_KEYS = [
    'focus_fingerprint',
    'focus_fingerprint_hit',
    'focused_fingerprint',
    'is_focus_fingerprint',
    'has_focus_fingerprint',
    'focus_signal',
];
const FINGERPRINT_KEYS = [
    'fingerprint',
    'fingerprints',
    'has_fingerprint',
    'is_fingerprint',
    'fingerprint_hit',
    'frameworks',
    'framework',
    'semantic_frameworks',
    'product',
    'service',
    'framework',
    'banner',
    'server',
];
const SIGNAL_TYPE_KEYS = ['signal_type', 'vuln_type', 'fingerprint_type'];
const TEXT_SIGNAL_KEYS = ['name', 'title', 'url', 'host', 'value', 'service', 'product', 'server'];
const RECENCY_KEYS = ['updated_time', 'created_time', 'last_seen', 'last_scan'];

export interface SearchPrioritySignals {
    fingerprintTier: number;
    severityTier: number;
    cvssScore: number;
    connectionCount: number;
    recencyScore: number;
}

const isTruthyValue = (value: unknown): boolean => {
    if (value == null) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) && value > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
    return false;
};

const toBooleanish = (value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
    }
    return false;
};

const getNodeValue = (node: any, key: string): unknown => {
    if (!node || typeof node !== 'object') return undefined;
    if (node[key] !== undefined) return node[key];
    const attributes = node.attributes;
    if (attributes && typeof attributes === 'object') {
        return attributes[key];
    }
    return undefined;
};

const getNodeStringValues = (node: any, key: string): string[] => {
    const raw = getNodeValue(node, key);
    if (Array.isArray(raw)) {
        return raw
            .map(item => String(item).trim().toLowerCase())
            .filter(Boolean);
    }
    if (raw && typeof raw === 'object') {
        return Object.values(raw as Record<string, unknown>)
            .map(item => String(item).trim().toLowerCase())
            .filter(Boolean);
    }
    if (typeof raw === 'string') {
        return raw
            .split(',')
            .map(item => item.trim().toLowerCase())
            .filter(Boolean);
    }
    if (raw == null) return [];
    return [String(raw).trim().toLowerCase()].filter(Boolean);
};

const getSeverityTier = (node: any): number => {
    const raw = getNodeValue(node, 'severity');
    const numericSeverity = Number(raw);
    if (Number.isFinite(numericSeverity)) {
        return numericSeverity;
    }
    const severity = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    switch (severity) {
        case 'critical':
            return 4;
        case 'high':
            return 3;
        case 'medium':
            return 2;
        case 'low':
            return 1;
        case 'info':
            return 0;
        default:
            return -1;
    }
};

const getCvssScore = (node: any): number => {
    const raw = getNodeValue(node, 'cvss_score') ?? getNodeValue(node, 'cvssScore');
    const value = Number(raw);
    return Number.isFinite(value) ? value : -1;
};

const getConnectionCount = (node: any): number => {
    const buckets = [
        node,
        node?.attributes && typeof node.attributes === 'object' ? node.attributes : null,
    ].filter(Boolean) as Array<Record<string, unknown>>;

    return buckets.reduce((total, bucket) => {
        return total + Object.entries(bucket).reduce((sum, [key, value]) => {
            if (!key.endsWith('_count')) return sum;
            const count = Number(value);
            return Number.isFinite(count) && count > 0 ? sum + count : sum;
        }, 0);
    }, 0);
};

const getRecencyScore = (node: any): number => {
    return RECENCY_KEYS.reduce((max, key) => {
        const raw = getNodeValue(node, key);
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0) return max;
        const normalized = value < 1e12 ? value * 1000 : value;
        return Math.max(max, normalized);
    }, -1);
};

const hasTokenMatch = (node: any, keys: string[], tokens: string[]): boolean => {
    return keys.some(key => {
        const values = getNodeStringValues(node, key);
        return values.some(value => tokens.some(token => value.includes(token)));
    });
};

const hasFocusFingerprint = (node: any): boolean => {
    if (FOCUS_FINGERPRINT_KEYS.some(key => toBooleanish(getNodeValue(node, key)))) {
        return true;
    }

    if (SIGNAL_TYPE_KEYS.some(key => {
        const values = getNodeStringValues(node, key);
        return values.some(value => FOCUS_SIGNAL_TYPES.has(value));
    })) {
        return true;
    }

    return hasTokenMatch(node, ['tags', 'frameworks', 'semantic_frameworks', ...TEXT_SIGNAL_KEYS], FOCUS_TEXT_TOKENS);
};

const hasFingerprint = (node: any): boolean => {
    if (hasFocusFingerprint(node)) return true;

    if (FINGERPRINT_KEYS.some(key => {
        const value = getNodeValue(node, key);
        return key.startsWith('has_') || key.startsWith('is_')
            ? toBooleanish(value)
            : isTruthyValue(value);
    })) {
        return true;
    }

    return SIGNAL_TYPE_KEYS.some(key => getNodeStringValues(node, key).length > 0);
};

export const getSearchPrioritySignals = (node: any): SearchPrioritySignals => {
    const fingerprintTier = hasFocusFingerprint(node)
        ? 2
        : hasFingerprint(node)
            ? 1
            : 0;

    return {
        fingerprintTier,
        severityTier: getSeverityTier(node),
        cvssScore: getCvssScore(node),
        connectionCount: getConnectionCount(node),
        recencyScore: getRecencyScore(node),
    };
};

const getRankingTuple = (node: any, context: SearchRankingContext): number[] => {
    const signals = getSearchPrioritySignals(node);

    if (context === 'vulnerabilities') {
        return [
            signals.severityTier,
            signals.fingerprintTier,
            signals.cvssScore,
            signals.connectionCount,
            signals.recencyScore,
        ];
    }

    if (context === 'fingerprints') {
        return [
            signals.fingerprintTier,
            signals.severityTier,
            signals.cvssScore,
            signals.connectionCount,
            signals.recencyScore,
        ];
    }

    return [
        signals.fingerprintTier,
        signals.severityTier,
        signals.cvssScore,
        signals.connectionCount,
        signals.recencyScore,
    ];
};

const compareString = (a: unknown, b: unknown): number => {
    return String(a ?? '').localeCompare(String(b ?? ''), 'zh-CN');
};

export const rankSearchItems = (
    items: any[],
    context: SearchRankingContext = 'default',
): any[] => {
    return [...items].sort((left, right) => {
        const leftTuple = getRankingTuple(left, context);
        const rightTuple = getRankingTuple(right, context);

        for (let i = 0; i < leftTuple.length; i += 1) {
            const diff = rightTuple[i] - leftTuple[i];
            if (diff !== 0) return diff;
        }

        const nameDiff = compareString(left?.name, right?.name);
        if (nameDiff !== 0) return nameDiff;

        return compareString(left?.cstx_id ?? left?.id, right?.cstx_id ?? right?.id);
    });
};
