import { useCallback, useRef, useState } from 'react';
import { Upload, FileJson, Loader2 } from 'lucide-react';
import { useT } from '../lib/i18n';

interface SnapshotLoaderProps {
  onFileLoad: (file: File) => Promise<void>;
  loading: boolean;
}

export function SnapshotLoader({ onFileLoad, loading }: SnapshotLoaderProps) {
  const t = useT();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void onFileLoad(file);
  }, [onFileLoad]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void onFileLoad(file);
    if (inputRef.current) inputRef.current.value = '';
  }, [onFileLoad]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="text-sm">{t('loader.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex w-full max-w-lg cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-12 transition-all ${
          dragOver
            ? 'border-blue-400 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-900/20'
            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
        }`}
      >
        <div className={`rounded-xl p-4 ${dragOver ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
          {dragOver ? <Upload className="h-8 w-8 text-blue-500" /> : <FileJson className="h-8 w-8 text-slate-400" />}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('loader.drop')}</p>
          <p className="mt-1 text-xs text-slate-400">{t('loader.browse')}</p>
        </div>
        <input ref={inputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
      </div>
    </div>
  );
}
