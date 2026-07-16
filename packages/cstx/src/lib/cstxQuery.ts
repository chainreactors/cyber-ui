/**
 * CSTX DSL query-string utilities.
 *
 * Pure helpers for escaping, quoting, and normalizing user input
 * into valid CSTX path-DSL expressions.
 */

// ── CSTX DSL constants ──────────────────────────────────────────

export const CSTX_NODE_TYPE_NAMES = new Set([
    '*',
    'ip', 'domain', 'subdomain', 'certificate', 'url', 'app', 'vuln',
    'sarif_vuln', 'company', 'icp', 'cidr', 'port', 'framework',
    'bucket', 'endpoint', 'host', 'repository', 'secret',
]);

export const IPV4_LITERAL_RE = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
export const CIDR_LITERAL_RE = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\/(?:[0-9]|[12]\d|3[0-2])$/;
export const CSTX_PATH_OPERATOR_RE = /->|<-|\.\./;
export const CSTX_NODE_FILTER_RE = /^\s*(\*|[a-zA-Z_][a-zA-Z0-9_-]*)\s*\[/;
// A bare property-filter expression like `type=="vuln"` or
// `tags="x" || vuln_type=="y"`: a field identifier followed by a comparison
// operator. These must be bracket-wrapped (`*[expr]`) rather than quoted as a
// keyword value, otherwise multi-clause forms get mangled into an empty search.
// Parenthesised grouping (e.g. `a && (b || c)`) is excluded — the CSTX path
// DSL property filter cannot parse `(`, so those fall back to the keyword path.
export const CSTX_FILTER_EXPR_RE = /[a-zA-Z_][\w.]*\s*(==|!=|>=|<=|>|<|=)/;
export const CSTX_BARE_NODE_TYPE_RE = /^\s*(\*|[a-zA-Z_][a-zA-Z0-9_-]*)\s*$/;

// ── Query helpers ────────────────────────────────────────────────

export function escapeCstxString(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function buildCstxNameSelector(value: string): string {
    return `*[name=="${escapeCstxString(value)}"]`;
}

export function quoteCstxFilterValue(value: string): string {
    const cleaned = value.replace(/[\r\n\t]+/g, ' ').trim();
    if (!cleaned.includes('"')) return `"${cleaned}"`;
    if (!cleaned.includes("'")) return `'${cleaned}'`;
    return `"${cleaned.replace(/"/g, ' ')}"`;
}

export function normalizeCstxQueryExpression(query: string): string {
    const trimmed = query.trim();
    if (!trimmed) return trimmed;
    if (CSTX_PATH_OPERATOR_RE.test(trimmed) || CSTX_NODE_FILTER_RE.test(trimmed)) {
        return trimmed;
    }

    const bareType = trimmed.match(CSTX_BARE_NODE_TYPE_RE)?.[1]?.toLowerCase();
    if (bareType && CSTX_NODE_TYPE_NAMES.has(bareType)) {
        return trimmed;
    }

    if (CSTX_FILTER_EXPR_RE.test(trimmed) && !trimmed.includes('(')) {
        return `*[${trimmed}]`;
    }

    const quoted = quoteCstxFilterValue(trimmed);
    if (CIDR_LITERAL_RE.test(trimmed)) {
        return `cidr[cidr==${quoted}]`;
    }
    if (IPV4_LITERAL_RE.test(trimmed)) {
        return `ip[ip==${quoted}]`;
    }
    return `*[${quoted}]`;
}
