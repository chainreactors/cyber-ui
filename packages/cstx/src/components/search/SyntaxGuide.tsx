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

const DIALOG_TITLE_ID = 'cstx-syntax-dialog-title';
const DIALOG_DESCRIPTION_ID = 'cstx-syntax-dialog-description';

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
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const scrollToSection = (index: number) => {
        document
            .getElementById(`cstx-syntax-section-${index}`)
            ?.scrollIntoView({block: 'start', behavior: 'smooth'});
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40" />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={DIALOG_TITLE_ID}
                aria-describedby={description ? DIALOG_DESCRIPTION_ID : undefined}
                className="relative z-10 grid max-h-[92vh] w-[min(96vw,72rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl border border-line bg-surface shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                    <div className="min-w-0">
                        <h2 id={DIALOG_TITLE_ID} className="text-[15px] font-bold text-fg">
                            {title ?? '搜索语法参考'}
                        </h2>
                        {description && (
                            <p id={DIALOG_DESCRIPTION_ID} className="mt-0.5 text-[12px] text-muted">{description}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body: sidebar + content */}
                <div className="grid min-h-0 lg:grid-cols-[15rem_minmax(0,1fr)]">
                    {/* Sidebar */}
                    <aside className="hidden min-h-0 overflow-y-auto border-r border-line bg-surface-2/60 p-2 lg:block">
                        <nav className="space-y-0.5">
                            {syntaxSections.map((section, index) => {
                                const Icon = section.icon;
                                return (
                                    <button
                                        key={section.title}
                                        type="button"
                                        onClick={() => scrollToSection(index)}
                                        className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-muted transition-colors hover:bg-surface hover:text-fg"
                                    >
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface border border-line">
                                            <Icon className={`h-3.5 w-3.5 ${section.color}`}/>
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate font-medium">{section.title}</span>
                                            <span className="text-[11px] text-faint">{section.items.length} 个示例</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* Main content */}
                    <div className="min-h-0 overflow-y-auto bg-surface p-3 space-y-3">
                        {syntaxSections.map((section, index) => {
                            const Icon = section.icon;
                            return (
                                <section
                                    key={section.title}
                                    id={`cstx-syntax-section-${index}`}
                                    className="scroll-mt-3 overflow-hidden rounded-xl border border-line"
                                >
                                    <div className="flex items-center gap-2.5 border-b border-line bg-surface-2/60 px-3 py-2.5">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface">
                                            <Icon className={`h-4 w-4 ${section.color}`}/>
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-[13px] font-semibold text-fg">{section.title}</h3>
                                        </div>
                                    </div>

                                    <div className="grid gap-1.5 p-2 sm:grid-cols-2 xl:grid-cols-3">
                                        {section.items.map((item) => (
                                            <button
                                                key={item.syntax}
                                                type="button"
                                                onClick={() => onSelectSyntax?.(item.syntax)}
                                                className="group min-w-0 rounded-lg border border-line bg-surface p-2.5 text-left transition-colors hover:border-accent hover:bg-accent-soft"
                                                title="点击填入搜索框"
                                            >
                                                <code className="block font-mono text-[12px] font-semibold text-fg leading-5 break-words">
                                                    {item.syntax}
                                                </code>
                                                <p className="mt-1 text-[11.5px] leading-[1.5] text-muted">
                                                    {item.desc}
                                                </p>
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
    );
}
