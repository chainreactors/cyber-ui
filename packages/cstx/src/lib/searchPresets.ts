import {Bug, Fingerprint, Search, ShieldAlert, ShieldCheck} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';

export type SearchPresetRankingContext = 'fingerprints' | 'vulnerabilities';

export type SearchPresetMetadata = {
    icon: LucideIcon;
    rankingContext: SearchPresetRankingContext;
    typeFilters?: string[];
    emptyTitle: string;
    emptyDescription: string;
};

export type SearchFilterPresetFallback = {
    presetKey: string;
    name: string;
    description: string;
    query: string;
};

const FINGERPRINT_TYPE_FILTERS = ['app', 'service', 'framework'];
const FOCUS_FINGERPRINT_TYPE_FILTERS = ['framework'];
const VULNERABILITY_TYPE_FILTERS = ['vuln'];

export const DEFAULT_SEARCH_FILTER_PRESET_KEY = 'search.fingerprints';

export const SEARCH_FILTER_PRESET_METADATA: Record<string, SearchPresetMetadata> = {
    'search.fingerprints': {
        icon: Fingerprint,
        rankingContext: 'fingerprints',
        typeFilters: FINGERPRINT_TYPE_FILTERS,
        emptyTitle: 'No Fingerprint Results',
        emptyDescription: 'No fingerprint results to display for this project yet.',
    },
    'search.focus_fingerprints': {
        icon: ShieldCheck,
        rankingContext: 'fingerprints',
        typeFilters: FOCUS_FINGERPRINT_TYPE_FILTERS,
        emptyTitle: 'No Focus Fingerprints',
        emptyDescription: 'No focus fingerprints matched in this project yet.',
    },
    'search.vulnerabilities': {
        icon: Bug,
        rankingContext: 'vulnerabilities',
        typeFilters: VULNERABILITY_TYPE_FILTERS,
        emptyTitle: 'No Vulnerabilities',
        emptyDescription: 'No vulnerabilities discovered in this project yet.',
    },
    'search.high_risk_vulnerabilities': {
        icon: ShieldAlert,
        rankingContext: 'vulnerabilities',
        typeFilters: VULNERABILITY_TYPE_FILTERS,
        emptyTitle: 'No High-Risk Vulnerabilities',
        emptyDescription: 'No high-risk vulnerabilities matched in this project yet.',
    },
};

export const SEARCH_FILTER_PRESET_FALLBACKS: SearchFilterPresetFallback[] = [
    {
        presetKey: 'search.fingerprints',
        name: 'Fingerprints',
        description: 'Prioritizes fingerprint results worth reviewing first; key assets are ranked higher.',
        query: 'type=="app" || type=="service" || type=="framework"',
    },
    {
        presetKey: 'search.focus_fingerprints',
        name: 'Focus Fingerprints',
        description: 'Quickly filter out VPN, WAF, firewall, device, and other focus fingerprints.',
        query: 'framework[is_focus==true]',
    },
    {
        presetKey: 'search.vulnerabilities',
        name: 'Vulnerabilities',
        description: 'View all vulnerability results discovered in the current project.',
        query: 'type=="vuln"',
    },
    {
        presetKey: 'search.high_risk_vulnerabilities',
        name: 'High-Risk Vulnerabilities',
        description: 'Quickly view vulnerabilities with high/critical severity or CVSS > 6.',
        query: 'type=="vuln" && (severity=="critical" || severity=="high" || severity>=4 || cvss_score>6 || cvssscore>6)',
    },
];

export const getSearchPresetMetadata = (
    presetKey?: string | null,
): SearchPresetMetadata => {
    if (presetKey && SEARCH_FILTER_PRESET_METADATA[presetKey]) {
        return SEARCH_FILTER_PRESET_METADATA[presetKey];
    }
    return {
        icon: Search,
        rankingContext: 'fingerprints',
        emptyTitle: 'No Results',
        emptyDescription: 'No assets matched the current filter criteria.',
    };
};
