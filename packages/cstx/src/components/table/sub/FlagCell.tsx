import React from 'react';
import {
  Flag, ChevronDown,
  Bug, Radio, ShieldOff, EyeOff, AlertTriangle, Clock,
  type LucideIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@cyber/ui';
import {
  CSTX_FLAG_OPTIONS,
  hasCstxFlag,
  getCstxFlagAddLabel,
  getCstxFlagRemoveLabel,
  type CstxFlagOption,
} from '../../../lib/cstxFlags';
import type {CSTXNode} from '../../../types/transport.gen';

type Row = Record<string, unknown>;

function flagMessage(i18n: Record<string, unknown> | undefined, key: string, fallback: string): string {
  return typeof i18n?.[key] === 'string' ? i18n[key] as string : fallback;
}

function flagLabel(option: CstxFlagOption, i18n?: Record<string, unknown>): string {
  return flagMessage(i18n, `flag.${option.key}`, option.label);
}

export function flagDescription(option: CstxFlagOption, i18n?: Record<string, unknown>): string {
  return flagMessage(i18n, `flagDescription.${option.key}`, FLAG_DESCRIPTION_MAP[option.key] ?? option.label);
}

function flagAction(option: CstxFlagOption, active: boolean, i18n?: Record<string, unknown>): string {
  return flagMessage(i18n, `${active ? 'removeFlag' : 'addFlag'}.${option.key}`,
    active ? getCstxFlagRemoveLabel(option) : getCstxFlagAddLabel(option));
}

export const FLAG_ICON_MAP: Record<string, LucideIcon> = {
  HONEYPOT: Bug,
  NOISE: Radio,
  FALSE_POSITIVE: ShieldOff,
  MANUAL_IGNORED: EyeOff,
  THREAT_PRESENT: AlertTriangle,
  HISTORIC_VULNERABLE: Clock,
};

export const FLAG_COLOR_MAP: Record<string, string> = {
  HONEYPOT: '#b57bff',
  NOISE: 'var(--c-faint, #8293b2)',
  FALSE_POSITIVE: 'var(--c-danger, #e5705c)',
  MANUAL_IGNORED: 'var(--c-faint, #8293b2)',
  THREAT_PRESENT: 'var(--c-warn, #edb35c)',
  HISTORIC_VULNERABLE: 'var(--c-accent, #5f9df7)',
};

export const FLAG_DESCRIPTION_MAP: Record<string, string> = {
  HONEYPOT: '蜜罐 — 该资产被识别为蜜罐，数据可能不可信',
  NOISE: '噪声 — 低质量或干扰数据，建议忽略',
  FALSE_POSITIVE: '误报 — 检测结果为误报，实际不存在该问题',
  MANUAL_IGNORED: '人工忽略 — 已由操作员手动标记为忽略',
  THREAT_PRESENT: '存在威胁 — 该资产存在活跃安全威胁',
  HISTORIC_VULNERABLE: '历史漏洞 — 该资产曾存在已知漏洞',
};

export interface FlagCellProps {
  row: Row;
  onToggle: (flag: CstxFlagOption, active: boolean) => void;
  /** Optional host-provided labels, descriptions, and action text. */
  i18n?: Record<string, unknown>;
}

export function FlagCell({ row, onToggle, i18n }: FlagCellProps) {
  const node = row as unknown as CSTXNode;
  const activeFlags = CSTX_FLAG_OPTIONS.filter(opt => hasCstxFlag(node, opt.value));
  const hasFlags = activeFlags.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="flex items-center gap-0.5 rounded-md border px-1.5 py-1 text-[11px] transition-colors"
          style={{
            background: hasFlags ? 'var(--c-accent-soft, rgba(95,157,247,0.1))' : 'var(--c-raise, #1d2a3d)',
            borderColor: hasFlags ? 'var(--c-accent, #5f9df7)' : 'var(--c-line, rgba(150,178,224,0.15))',
            color: hasFlags ? 'var(--c-accent-fg, #97bffb)' : 'var(--c-faint, #8293b2)',
          }}
          title={hasFlags ? activeFlags.map(f => flagLabel(f, i18n)).join(', ') : flagMessage(i18n, 'setFlag', 'Set flag')}
        >
          {hasFlags
            ? activeFlags.slice(0, 2).map(f => {
                const Icon = FLAG_ICON_MAP[f.key] ?? Flag;
                return (
                  <span key={f.key} title={flagDescription(f, i18n)}>
                    <Icon className="h-3 w-3" style={{ color: FLAG_COLOR_MAP[f.key] }} />
                  </span>
                );
              })
            : <Flag className="h-3 w-3" />}
          {activeFlags.length > 2 && <span className="text-[10px] opacity-70">+{activeFlags.length - 2}</span>}
          <ChevronDown className="h-2.5 w-2.5 opacity-40" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[100] min-w-44"
        style={{
          background: 'hsl(var(--popover, 0 0% 100%))',
          borderColor: 'var(--c-line, rgba(150,178,224,0.15))',
        }}
      >
        <DropdownMenuLabel className="text-xs" style={{ color: 'var(--c-faint)' }}>
          {flagMessage(i18n, 'flags', '标记')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CSTX_FLAG_OPTIONS.map(option => {
          const active = hasCstxFlag(node, option.value);
          const Icon = FLAG_ICON_MAP[option.key] ?? Flag;
          return (
            <DropdownMenuItem
              key={option.key}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onToggle(option, active);
              }}
              className="gap-2 cursor-pointer"
              title={flagDescription(option, i18n)}
            >
              <Icon className="h-3.5 w-3.5" style={{ color: FLAG_COLOR_MAP[option.key] }} />
              <span className="flex-1">{flagAction(option, active, i18n)}</span>
              {active && <span className="h-1.5 w-1.5 rounded-full" style={{ background: FLAG_COLOR_MAP[option.key] }} />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type BatchFlagMode = 'add' | 'remove';

export interface BatchFlagMenuProps {
  onApply: (flag: CstxFlagOption, mode: BatchFlagMode) => void;
  disabled?: boolean;
  i18n?: Record<string, unknown>;
}

/**
 * Batch flag menu for a multi-row selection. Unlike the per-row {@link FlagCell},
 * a selection has no single "active" state to toggle against, so add and remove are
 * offered as two explicit groups — otherwise the only reachable batch action is
 * "add", leaving no way to clear a flag from many rows at once.
 */
export function BatchFlagMenu({ onApply, disabled, i18n }: BatchFlagMenuProps) {
  const groups: { mode: BatchFlagMode; label: string; makeLabel: (o: CstxFlagOption) => string }[] = [
    { mode: 'add', label: flagMessage(i18n, 'addFlags', '添加标记'), makeLabel: o => flagAction(o, false, i18n) },
    { mode: 'remove', label: flagMessage(i18n, 'removeFlags', '移除标记'), makeLabel: o => flagAction(o, true, i18n) },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="flex items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40"
          style={{
            background: 'var(--c-raise, #1d2a3d)',
            borderColor: 'var(--c-line, rgba(150,178,224,0.15))',
            color: 'var(--c-faint, #8293b2)',
          }}
          title={flagMessage(i18n, 'batchFlags', '批量标记 / 取消标记')}
        >
          <Flag className="h-3 w-3" />
          <span>{flagMessage(i18n, 'flags', '标记')}</span>
          <ChevronDown className="h-2.5 w-2.5 opacity-40" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[100] min-w-44"
        style={{
          background: 'hsl(var(--popover, 0 0% 100%))',
          borderColor: 'var(--c-line, rgba(150,178,224,0.15))',
        }}
      >
        {groups.map((group, gi) => (
          <React.Fragment key={group.mode}>
            {gi > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs" style={{ color: 'var(--c-faint)' }}>
              {group.label}
            </DropdownMenuLabel>
            {CSTX_FLAG_OPTIONS.map(option => {
              const Icon = FLAG_ICON_MAP[option.key] ?? Flag;
              return (
                <DropdownMenuItem
                  key={option.key}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onApply(option, group.mode);
                  }}
                  className="gap-2 cursor-pointer"
                  title={flagDescription(option, i18n)}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: FLAG_COLOR_MAP[option.key] }} />
                  <span className="flex-1">{group.makeLabel(option)}</span>
                </DropdownMenuItem>
              );
            })}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
