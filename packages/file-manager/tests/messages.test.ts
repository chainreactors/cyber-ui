import { describe, expect, it } from 'vitest'

import {
  createFileManagerTranslator,
  fileManagerMessages,
} from '../src/messages'

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
}

describe('file manager default messages', () => {
  it('provides the same complete key set for English and Simplified Chinese', () => {
    expect(Object.keys(fileManagerMessages['zh-CN']).sort())
      .toEqual(Object.keys(fileManagerMessages.en).sort())
  })

  it('keeps placeholder names consistent across locales', () => {
    for (const key of Object.keys(fileManagerMessages.en) as Array<keyof typeof fileManagerMessages.en>) {
      expect(placeholders(fileManagerMessages['zh-CN'][key]), key)
        .toEqual(placeholders(fileManagerMessages.en[key]))
    }
  })

  it('uses locale defaults, applies overrides, and interpolates values', () => {
    const translate = createFileManagerTranslator({
      locale: 'zh-CN',
      messages: { selectedCount: '选择了 {count} 项' },
    })

    expect(translate('selectedCount', { count: 3 })).toBe('选择了 3 项')
    expect(translate('refresh')).toBe('刷新')
  })
})
