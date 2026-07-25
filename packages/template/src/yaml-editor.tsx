import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import './monaco-config'
import { Editor, type OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'

interface YamlEditorProps {
  value?: string
  yaml?: string
  onChange: (yaml: string) => void
  height?: string
  readOnly?: boolean
}

// Cairn drives light/dark off a `.dark` class on <html> (see web ThemeProvider /
// index.css `@custom-variant dark`). Monaco paints on a canvas and can't read
// Tailwind's `dark:` variant, so we mirror that class into a Monaco theme id at
// runtime and keep it in sync when the user toggles theme.
function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )
  useEffect(() => {
    const root = document.documentElement
    const sync = () => setIsDark(root.classList.contains('dark'))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] })
    return () => observer.disconnect()
  }, [])
  return isDark
}

// Two GitHub-flavoured themes keyed to the app palette: the light one matches a
// white card, the dark one sits on Cairn's deep code-well surface (--c-bg).
function registerYamlThemes(monaco: typeof import('monaco-editor')) {
  monaco.editor.defineTheme('yamlLight', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
      { token: 'key', foreground: '005cc5', fontStyle: 'bold' },
      { token: 'string', foreground: '032f62' },
      { token: 'number', foreground: '005cc5' },
      { token: 'keyword', foreground: 'd73a49' },
      { token: 'variable', foreground: 'e36209' },
      { token: 'punctuation.separator.key-value', foreground: '586069' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#24292e',
      'editorLineNumber.foreground': '#959da5',
      'editorLineNumber.activeForeground': '#24292e',
    },
  })

  monaco.editor.defineTheme('yamlDark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
      { token: 'key', foreground: '79c0ff', fontStyle: 'bold' },
      { token: 'string', foreground: 'a5d6ff' },
      { token: 'number', foreground: '79c0ff' },
      { token: 'keyword', foreground: 'ff7b72' },
      { token: 'variable', foreground: 'ffa657' },
      { token: 'punctuation.separator.key-value', foreground: '8b949e' },
    ],
    colors: {
      'editor.background': '#101114',
      'editor.foreground': '#ebedf0',
      'editorLineNumber.foreground': '#5b626d',
      'editorLineNumber.activeForeground': '#aab1bb',
    },
  })
}

export function YamlEditor({ value, yaml, onChange, height = '600px', readOnly = false }: YamlEditorProps) {
  const content = value || yaml || ''
  const [isEditorReady, setIsEditorReady] = useState(false)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const isDark = useIsDark()
  const themeId = isDark ? 'yamlDark' : 'yamlLight'

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor
    setIsEditorReady(true)
    requestAnimationFrame(() => {
      editor.layout()
    })
  }

  const handleEditorChange = (nextValue: string | undefined) => {
    if (nextValue !== undefined && !readOnly) {
      onChange(nextValue)
    }
  }

  return (
    <div className="border border-line rounded overflow-hidden bg-surface relative w-full min-h-0" style={{ height }}>
      {!isEditorReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-10">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      )}
      <Editor
        height="100%"
        defaultLanguage="yaml"
        theme={themeId}
        value={content}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'off',
          wrappingIndent: 'indent',
          fontSize: 12,
          lineHeight: 20,
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          insertSpaces: true,
          detectIndentation: false,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          padding: { top: 8, bottom: 16 },
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          overviewRulerLanes: 0,
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            alwaysConsumeMouseWheel: false,
          },
          readOnly,
          domReadOnly: readOnly,
        }}
        beforeMount={(monaco) => {
          try {
            const languages = monaco.languages.getLanguages()
            const yamlLang = languages.find((lang: Monaco.languages.ILanguageExtensionPoint) => lang.id === 'yaml')

            if (!yamlLang) {
              monaco.languages.register({ id: 'yaml' })

              monaco.languages.setLanguageConfiguration('yaml', {
                comments: {
                  lineComment: '#',
                },
                brackets: [
                  ['{', '}'],
                  ['[', ']'],
                  ['(', ')'],
                ],
                autoClosingPairs: [
                  { open: '{', close: '}' },
                  { open: '[', close: ']' },
                  { open: '(', close: ')' },
                  { open: '"', close: '"' },
                  { open: "'", close: "'" },
                ],
                surroundingPairs: [
                  { open: '{', close: '}' },
                  { open: '[', close: ']' },
                  { open: '(', close: ')' },
                  { open: '"', close: '"' },
                  { open: "'", close: "'" },
                ],
              })

              monaco.languages.setMonarchTokensProvider('yaml', {
                tokenizer: {
                  root: [
                    [/#.*$/, 'comment'],
                    [/---/, 'meta.separator'],
                    [/\.\.\./, 'meta.separator'],
                    [/- /, 'punctuation.definition.list.begin.yaml'],
                    [/^(\s*)([\w\-\s]+)(:)(\s|$)/, ['', 'key', 'punctuation.separator.key-value', '']],
                    [/"([^"\\]|\\.)*$/, 'string.invalid'],
                    [/'([^'\\]|\\.)*$/, 'string.invalid'],
                    [/"/, 'string', '@doubleQuotedString'],
                    [/'/, 'string', '@singleQuotedString'],
                    [/\d+/, 'number'],
                    [/true|false/, 'keyword'],
                    [/null/, 'keyword'],
                    [/\{\{.*?\}\}/, 'variable'],
                  ],
                  doubleQuotedString: [
                    [/[^\\"]+/, 'string'],
                    [/\\./, 'string.escape'],
                    [/"/, 'string', '@pop'],
                  ],
                  singleQuotedString: [
                    [/[^\\']+/, 'string'],
                    [/\\./, 'string.escape'],
                    [/'/, 'string', '@pop'],
                  ],
                },
              })
            }

            registerYamlThemes(monaco)
            monaco.editor.setTheme(isDark ? 'yamlDark' : 'yamlLight')
          } catch (error) {
            console.error('Monaco Editor setup error:', error)
          }
        }}
      />
    </div>
  )
}
