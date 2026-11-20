import hljs = require('highlight.js')

declare module 'highlight.js/lib/core.js' {
  export = hljs
}

declare module 'highlight.js/lib/languages/*.js' {
  const language: Parameters<typeof hljs.registerLanguage>[1]
  export = language
}
