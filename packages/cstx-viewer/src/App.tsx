import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Table2, Network, Download, Moon, Sun, FileJson, X, Shield, GitFork } from 'lucide-react';
import { useSnapshot } from './hooks/useSnapshot';
import { SnapshotLoader } from './components/SnapshotLoader';
import { OverviewTab } from './components/OverviewTab';
import { ThreatTab } from './components/ThreatTab';
import { AssetsTab } from './components/AssetsTab';
import { RelationsTab } from './components/RelationsTab';
import { GraphTab } from './components/GraphTab';
import { ExportTab } from './components/ExportTab';
import { LocaleContext, detectLocale, useT, type Locale } from './lib/i18n';

type Tab = 'overview' | 'threat' | 'assets' | 'relations' | 'graph' | 'export';

declare global {
  interface Window {
    __CSTX_SNAPSHOT__?: unknown;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [locale, setLocale] = useState<Locale>(detectLocale);
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const snapshot = useSnapshot();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    if (window.__CSTX_SNAPSHOT__) {
      snapshot.loadFromJson(window.__CSTX_SNAPSHOT__, 'embedded');
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const dataUrl = params.get('data');
    if (dataUrl) {
      void snapshot.loadFromUrl(dataUrl);
    }
  }, []);

  const handleGlobalDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void snapshot.loadFromFile(file);
  }, [snapshot]);

  const hasData = snapshot.payload !== null;
  const hasVulns = (snapshot.stats?.vuln.total ?? 0) > 0;

  const tabs: { id: Tab; labelKey: Parameters<ReturnType<typeof useT>>[0]; icon: typeof BarChart3 }[] = [
    { id: 'overview', labelKey: 'tab.overview', icon: BarChart3 },
    ...(hasVulns ? [{ id: 'threat' as Tab, labelKey: 'tab.threat' as const, icon: Shield }] : []),
    { id: 'assets', labelKey: 'tab.assets', icon: Table2 },
    { id: 'relations', labelKey: 'tab.relations', icon: GitFork },
    { id: 'graph', labelKey: 'tab.graph', icon: Network },
    { id: 'export', labelKey: 'tab.export', icon: Download },
  ];

  return (
    <LocaleContext.Provider value={locale}>
      <AppInner
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        locale={locale}
        setLocale={setLocale}
        dark={dark}
        setDark={setDark}
        snapshot={snapshot}
        hasData={hasData}
        tabs={tabs}
        handleGlobalDrop={handleGlobalDrop}
      />
    </LocaleContext.Provider>
  );
}

function AppInner({
  activeTab, setActiveTab, locale, setLocale, dark, setDark,
  snapshot, hasData, tabs, handleGlobalDrop,
}: any) {
  const t = useT();

  return (
    <div
      className="flex h-full flex-col overflow-hidden bg-background text-foreground"
      onDragOver={e => e.preventDefault()}
      onDrop={handleGlobalDrop}
    >
      <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-2 shrink-0 dark:border-slate-700">
        <FileJson className="h-5 w-5 text-blue-500" />
        <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('app.title')}</h1>
        {snapshot.filename && (
          <span className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {snapshot.filename}
            {hasData && (
              <span className="tabular-nums text-slate-400">
                ({snapshot.stats?.summary.nodes}n / {snapshot.stats?.summary.edges}e)
              </span>
            )}
            <button
              type="button"
              onClick={snapshot.clear}
              className="ml-1 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setLocale((l: Locale) => l === 'zh' ? 'en' : 'zh')}
          className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          {locale === 'zh' ? 'EN' : '中'}
        </button>
        <button
          type="button"
          onClick={() => setDark((d: boolean) => !d)}
          className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </header>

      {!hasData ? (
        <SnapshotLoader onFileLoad={snapshot.loadFromFile} loading={snapshot.loading} />
      ) : (
        <>
          <div className="flex items-center gap-0.5 border-b border-slate-200 px-4 shrink-0 dark:border-slate-700">
            {tabs.map((tab: any) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {t(tab.labelKey)}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === 'overview' && snapshot.stats && (
              <OverviewTab stats={snapshot.stats} />
            )}
            {activeTab === 'threat' && snapshot.stats && (
              <ThreatTab stats={snapshot.stats} />
            )}
            {activeTab === 'assets' && (
              <AssetsTab nodes={snapshot.payload!.nodes} />
            )}
            {activeTab === 'relations' && (
              <RelationsTab edges={snapshot.payload!.edges} />
            )}
            {activeTab === 'graph' && (
              <GraphTab nodes={snapshot.payload!.nodes} edges={snapshot.payload!.edges} />
            )}
            {activeTab === 'export' && snapshot.stats && (
              <ExportTab payload={snapshot.payload!} stats={snapshot.stats} filename={snapshot.filename} />
            )}
          </div>
        </>
      )}

      {snapshot.error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600 shadow-lg dark:border-red-800 dark:bg-red-900/50 dark:text-red-300">
          {snapshot.error}
        </div>
      )}
    </div>
  );
}
