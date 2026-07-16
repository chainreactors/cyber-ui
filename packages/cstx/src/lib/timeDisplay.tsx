import * as React from 'react';
import {Clock, type LucideIcon} from 'lucide-react';
import { cn } from './cn';

export type TimeDisplayValue = Date | number | string | null | undefined;

const DATE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
};

const SHORT_DATE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
};

export const toDisplayDate = (value: TimeDisplayValue): Date | null => {
    try {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }

        if (typeof value === 'number') {
            if (!Number.isFinite(value) || value <= 0) {
                return null;
            }
            const milliseconds = value > 10_000_000_000 ? value : value * 1000;
            const date = new Date(milliseconds);
            return Number.isNaN(date.getTime()) ? null : date;
        }

        const numericValue = Number(value);
        if (Number.isFinite(numericValue) && numericValue > 0) {
            return toDisplayDate(numericValue);
        }

        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    } catch {
        return null;
    }
};

export const formatTimeValue = (value: TimeDisplayValue, fallbackText = '-'): string => {
    const date = toDisplayDate(value);
    if (!date) {
        return fallbackText;
    }
    return date.toLocaleString('zh-CN', DATE_TIME_FORMAT_OPTIONS);
};

export const formatShortTimeValue = (value: TimeDisplayValue, fallbackText = '-'): string => {
    const date = toDisplayDate(value);
    if (!date) {
        return fallbackText;
    }
    return date.toLocaleString('zh-CN', SHORT_DATE_TIME_FORMAT_OPTIONS);
};

/**
 * Format a timestamp as a Chinese relative phrase ("刚刚" / "5分钟前" / "3天前").
 * For values older than `absoluteThresholdDays` (default 7) the formatter falls
 * back to the short absolute form so the user is not greeted with "8周前".
 */
export const formatRelativeTimeValue = (
    value: TimeDisplayValue,
    {
        fallbackText = '-',
        absoluteThresholdDays = 7,
    }: {fallbackText?: string; absoluteThresholdDays?: number} = {},
): string => {
    const date = toDisplayDate(value);
    if (!date) {
        return fallbackText;
    }

    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) {
        // Future timestamps are rare here (clock skew, scheduled tasks). Show
        // the short absolute form rather than a misleading "刚刚".
        return formatShortTimeValue(value, fallbackText);
    }

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days >= absoluteThresholdDays) {
        return formatShortTimeValue(value, fallbackText);
    }
    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
};

export type TimeDisplayMode = 'absolute' | 'short' | 'relative';

interface TimeDisplayProps {
    value?: TimeDisplayValue;
    timestamp?: number | null;
    icon?: LucideIcon;
    fallbackText?: string;
    showIcon?: boolean;
    className?: string;
    textClassName?: string;
    emptyClassName?: string;
    title?: string;
    /**
     * - `absolute` (default): "2026-05-19 14:32"
     * - `short`:              "05-19 14:32"
     * - `relative`:           "3小时前" with the absolute form on the `title` hover
     */
    mode?: TimeDisplayMode;
    /** When mode='relative': fall back to short absolute past this many days. */
    absoluteThresholdDays?: number;
}

export type TimePairDisplayItem = {
    label: string;
    value?: TimeDisplayValue;
    fallbackText?: string;
    icon?: LucideIcon;
    title?: string;
};

interface TimePairDisplayProps {
    items: TimePairDisplayItem[];
    className?: string;
    emptyClassName?: string;
    emptyText?: string;
    showIcon?: boolean;
}

export const TimeDisplay = ({
                                value,
                                timestamp,
                                icon: Icon = Clock,
                                fallbackText = '-',
                                showIcon = true,
                                className,
                                textClassName,
                                emptyClassName = 'text-xs text-gray-400',
                                title,
                                mode = 'absolute',
                                absoluteThresholdDays = 7,
                            }: TimeDisplayProps) => {
    const rawValue = value !== undefined ? value : timestamp;
    const absolute = formatTimeValue(rawValue, '');

    if (!absolute) {
        return <span className={emptyClassName}>{fallbackText}</span>;
    }

    let formatted: string;
    if (mode === 'relative') {
        formatted = formatRelativeTimeValue(rawValue, {absoluteThresholdDays});
    } else if (mode === 'short') {
        formatted = formatShortTimeValue(rawValue);
    } else {
        formatted = absolute;
    }

    // In relative mode the absolute timestamp is surfaced on hover so the user
    // can still see the exact moment without changing the display.
    const hoverTitle = title ?? absolute;

    return (
        <div
            className={cn('inline-flex items-center gap-1 text-xs text-gray-600', className)}
            title={hoverTitle}
        >
            {showIcon && <Icon className="h-3 w-3 text-gray-400"/>}
            <span className={cn('tabular-nums', textClassName)}>{formatted}</span>
        </div>
    );
};

export const TimePairDisplay = ({
                                    items,
                                    className,
                                    emptyClassName = 'text-xs text-gray-400',
                                    emptyText = '-',
                                    showIcon = false,
                                }: TimePairDisplayProps) => {
    const normalizedItems = items.map((item) => ({
        ...item,
        formatted: formatTimeValue(item.value, ''),
    }));

    if (normalizedItems.length === 0 || normalizedItems.every((item) => !item.formatted && !item.fallbackText)) {
        return <span className={emptyClassName}>{emptyText}</span>;
    }

    return (
        <div className={cn('inline-flex flex-col gap-0.5 text-xs leading-4', className)}>
            {normalizedItems.map(({label, formatted, fallbackText = '-', icon: Icon = Clock, title}, index) => (
                <div
                    key={`${label}-${index}`}
                    className="flex min-w-0 items-center gap-1 text-gray-600"
                    title={title ?? (formatted || fallbackText)}
                >
                    <span className="shrink-0 text-[11px] text-gray-400">{label}</span>
                    {showIcon && <Icon className="h-3 w-3 shrink-0 text-gray-400"/>}
                    <span className="min-w-0 whitespace-nowrap tabular-nums text-gray-700">
                        {formatted || fallbackText}
                    </span>
                </div>
            ))}
        </div>
    );
};
