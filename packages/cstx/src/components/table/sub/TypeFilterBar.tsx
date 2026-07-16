import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../lib/cn';

export interface TypeFilterBarProps {
  allValues: string[];
  selected: Set<string>;
  onToggle: (val: string) => void;
  onClear: () => void;
  compact?: boolean;
  colorMap?: Record<string, string>;
  counts?: Record<string, number>;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

export function TypeFilterBar({
  allValues,
  selected,
  onToggle,
  onClear,
  compact,
  colorMap,
  counts,
}: TypeFilterBarProps) {
  const isFiltered = selected.size > 0 && selected.size < allValues.length;

  const colorStyles = useMemo(() => {
    if (!colorMap) return null;
    const styles: Record<string, { active: React.CSSProperties; inactive: React.CSSProperties }> = {};
    for (const [type, hex] of Object.entries(colorMap)) {
      const rgb = hexToRgb(hex);
      if (!rgb) continue;
      styles[type] = {
        active: {
          backgroundColor: hex,
          color: '#fff',
          borderColor: hex,
        },
        inactive: {
          backgroundColor: 'transparent',
          color: hex,
          borderColor: hex,
          borderWidth: '1px',
          borderStyle: 'solid',
          opacity: 0.5,
        },
      };
    }
    return styles;
  }, [colorMap]);

  return (
    <div className={cn(
      'flex flex-wrap items-center gap-1.5 bg-slate-50/60 dark:bg-slate-800/30',
      compact ? 'px-3 py-1.5' : 'px-4 py-2',
    )}>
      {allValues.map((val) => {
        const active = selected.size === 0 || selected.has(val);
        const customStyle = colorStyles?.[val];
        const count = counts?.[val];
        return (
          <button
            key={val}
            type="button"
            onClick={() => onToggle(val)}
            className={cn(
              'inline-flex items-center rounded-full font-medium transition-colors',
              compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
              !customStyle && (active
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'),
            )}
            style={customStyle ? (active ? customStyle.active : customStyle.inactive) : undefined}
          >
            {val}
            {count != null && (
              <span className="ml-1 opacity-60">{count}</span>
            )}
          </button>
        );
      })}
      {isFiltered && (
        <button
          type="button"
          onClick={onClear}
          className={cn(
            'ml-1 inline-flex items-center gap-0.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800',
            compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs',
          )}
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}
    </div>
  );
}
