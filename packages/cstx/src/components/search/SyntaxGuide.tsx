import React, {useEffect} from 'react';
import {X} from 'lucide-react';

export interface SyntaxItem {
    syntax: string;
    desc: string;
}

export interface SyntaxSection {
    title: string;
    icon: React.ElementType;
    color: string;
    items: SyntaxItem[];
}

export interface SyntaxGuideProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectSyntax?: (syntax: string) => void;
    syntaxSections: SyntaxSection[];
    title?: string;
    description?: string;
}

const DIALOG_TITLE_ID = 'search-syntax-dialog-title';
const DIALOG_DESCRIPTION_ID = 'search-syntax-dialog-description';

export function SyntaxGuide({
    isOpen,
    onClose,
    onSelectSyntax,
    syntaxSections,
    title,
    description,
}: SyntaxGuideProps) {
    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const scrollToSection = (index: number) => {
        document
            .getElementById(`search-syntax-section-${index}`)
            ?.scrollIntoView({block: 'start', behavior: 'smooth'});
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50" onClick={onClose}/>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={DIALOG_TITLE_ID}
                aria-describedby={description ? DIALOG_DESCRIPTION_ID : undefined}
                className="relative z-10 grid max-h-[92vh] w-[min(96vw,84rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-border bg-background shadow-lg"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 border-b border-border bg-background/95 px-2 py-2 pr-2">
                    <div className="min-w-0">
                        <h2 id={DIALOG_TITLE_ID} className="text-xl font-semibold">{title ?? 'Search Syntax Reference'}</h2>
                        {description && (
                            <p id={DIALOG_DESCRIPTION_ID} className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-interactive-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Close syntax reference"
                        aria-label="Close syntax reference"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="grid min-h-0 lg:grid-cols-[17rem_minmax(0,1fr)]">
                    <aside className="hidden min-h-0 border-r border-border bg-muted/25 p-2 lg:block">
                        <div className="mb-2 rounded-xl border border-border/60 bg-background p-2">
                            <p className="text-sm font-medium text-foreground">Quick Navigation</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                Select a syntax pattern to scroll to its examples.
                            </p>
                        </div>

                        <nav className="space-y-1.5">
                            {syntaxSections.map((section, index) => {
                                const SectionIcon = section.icon;
                                return (
                                    <button
                                        key={section.title}
                                        type="button"
                                        onClick={() => scrollToSection(index)}
                                        className="group flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-border/60 hover:bg-interactive-hover hover:text-foreground"
                                    >
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background ring-1 ring-border/60 transition-colors group-hover:bg-interactive-hover">
                                            <SectionIcon className={`h-4 w-4 ${section.color}`}/>
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate font-medium">{section.title}</span>
                                            <span className="text-xs text-muted-foreground/80">
                                                {section.items.length} examples
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    <div className="min-h-0 overflow-y-auto bg-background">
                        <div className="space-y-2 px-2 py-2 sm:px-2 lg:px-2">
                            <div className="grid gap-2 rounded-2xl border border-border/60 bg-muted/25 p-2 md:grid-cols-2">
                                <div className="rounded-xl bg-background p-2 ring-1 ring-border/50">
                                    <p className="text-sm font-medium text-foreground">Auto Detection</p>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        Contains <code className="rounded bg-muted px-1.5 py-0.5">..</code> or <code className="rounded bg-muted px-1.5 py-0.5">{'->'}</code> for relation traversal; contains <code className="rounded bg-muted px-1.5 py-0.5">==</code> or <code className="rounded bg-muted px-1.5 py-0.5">{'&&'}</code> for attribute filtering; plain text for direct search.
                                    </p>
                                </div>
                                <div className="rounded-xl bg-background p-2 ring-1 ring-border/50">
                                    <p className="text-sm font-medium text-foreground">Semantic Mode</p>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        Enable the sparkle icon next to the search box for natural language input; or use semantic keywords within syntax like <code className="rounded bg-muted px-1.5 py-0.5">ip["cdn"]</code>.
                                    </p>
                                </div>
                            </div>

                            {syntaxSections.map((section, index) => {
                                const SectionIcon = section.icon;
                                return (
                                    <section
                                        key={section.title}
                                        id={`search-syntax-section-${index}`}
                                        className="scroll-mt-5 overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm"
                                    >
                                        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-2 py-2">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background shadow-sm">
                                                <SectionIcon className={`h-5 w-5 ${section.color}`}/>
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Common patterns and their meanings
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid gap-2 p-2 sm:grid-cols-2 xl:grid-cols-3">
                                            {section.items.map((item) => (
                                                <button
                                                    key={item.syntax}
                                                    type="button"
                                                    onClick={() => onSelectSyntax?.(item.syntax)}
                                                    className="group min-w-0 rounded-xl border border-border/55 bg-muted/20 p-2 text-left transition-colors hover:border-primary/45 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    title="Click to insert into search"
                                                >
                                                    <span className="flex min-w-0 items-start gap-2 rounded-lg border border-primary/25 bg-background px-2 py-2 shadow-sm transition-colors group-hover:border-primary/50">
                                                        <span className="mt-0.5 shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-primary">
                                                            CSTX
                                                        </span>
                                                        <code className="min-w-0 flex-1 break-words font-mono text-xs font-semibold leading-5 text-foreground">
                                                            {item.syntax}
                                                        </code>
                                                    </span>
                                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                        {item.desc}
                                                    </p>
                                                    <span className="mt-2 inline-flex text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                                                        Click to insert into search
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
