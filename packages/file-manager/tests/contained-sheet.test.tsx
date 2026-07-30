import { render, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Sheet, SheetContent } from '../src/primitives'

describe('contained file manager sheet', () => {
  it('portals an absolute sheet into the file manager container', () => {
    const portalContainer = document.createElement('div')
    document.body.appendChild(portalContainer)

    try {
      render(
        <Sheet defaultOpen>
          <SheetContent
            aria-label="Directory tree"
            contained
            portalContainer={portalContainer}
            side="left"
          >
            Directory navigation
          </SheetContent>
        </Sheet>,
      )

      const dialog = within(portalContainer).getByRole('dialog', { name: 'Directory tree' })
      expect(dialog).toHaveClass('absolute')
      expect(dialog).not.toHaveClass('fixed')
    } finally {
      portalContainer.remove()
    }
  })
})
