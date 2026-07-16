import React, { useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';
import { SearchInput, type DropdownActions } from './SearchInput';
import type { SearchHistoryEntry } from './useSearchHistory';

export interface QueryPresetItem {
  key: string;
  label: string;
  description?: string;
  query?: string;
  disabled?: boolean;
  data?: unknown;
}

export interface QueryPickerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  compact?: boolean;
  trailingAction?: React.ReactNode;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onFocus?: () => void;

  history?: SearchHistoryEntry[];
  onSelectHistory?: (query: string) => void;
  onRemoveHistory?: (query: string) => void;
  onClearHistory?: () => void;
  saved?: SearchHistoryEntry[];
  onSave?: (query: string) => void;
  onUnsave?: (query: string) => void;
  isSaved?: (query: string) => boolean;

  presets?: QueryPresetItem[];
  presetsLoading?: boolean;
  presetsTitle?: string;
  onSelectPreset?: (item: QueryPresetItem) => void;
  renderPreset?: (item: QueryPresetItem) => React.ReactNode;
}

function DefaultPresetItem({ item }: { item: QueryPresetItem }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="truncate text-sm">{item.label}</div>
      {item.description && (
        <div className="truncate text-[11px] text-slate-400">
          {item.description}
        </div>
      )}
    </div>
  );
}

export function QueryPicker({
  presets,
  presetsLoading = false,
  presetsTitle = 'Presets',
  onSelectPreset,
  renderPreset,
  history,
  onSelectHistory,
  ...inputProps
}: QueryPickerProps): React.JSX.Element {
  const hasPresets = (presets && presets.length > 0) || presetsLoading;

  const renderPresetsSection = useCallback(
    (actions: DropdownActions) => {
      if (!hasPresets) return null;
      return (
        <div>
          <div className="flex items-center gap-1.5 px-3 pb-1 pt-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {presetsTitle}
            </span>
            {presetsLoading && (
              <Loader2 className="ml-auto h-3 w-3 animate-spin text-slate-400" />
            )}
          </div>
          {presets?.map((item) => (
            <div
              key={item.key}
              className={cn(
                'flex cursor-pointer items-start gap-2 px-3 py-1.5 text-sm',
                'hover:bg-slate-50 dark:hover:bg-slate-800',
                item.disabled && 'pointer-events-none opacity-50',
              )}
              onClick={() => {
                if (!item.disabled) {
                  onSelectPreset?.(item);
                  if (item.query) actions.select(item.query);
                  else actions.close();
                }
              }}
            >
              {renderPreset ? renderPreset(item) : <DefaultPresetItem item={item} />}
            </div>
          ))}
        </div>
      );
    },
    [hasPresets, presets, presetsLoading, presetsTitle, onSelectPreset, renderPreset],
  );

  return (
    <SearchInput
      {...inputProps}
      history={history}
      onSelectHistory={onSelectHistory}
      dropdownExtra={hasPresets ? renderPresetsSection : undefined}
    />
  );
}
