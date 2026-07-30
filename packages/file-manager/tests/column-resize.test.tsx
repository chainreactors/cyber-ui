import React, { useRef, useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ColumnResizeHandle, useColumnResize } from '../src/ui'

const columns = [
  { key: 'name', initialWidthPct: 50, minWidth: 120 },
  { key: 'size', initialWidthPct: 30, minWidth: 80 },
  { key: 'time', initialWidthPct: 20, minWidth: 100 },
]

function ResizeFixture() {
  const tableRef = useRef<HTMLTableElement>(null)
  const [, setRevision] = useState(0)
  const { getColumnStyle, getResizeHandler } = useColumnResize({ columns, tableRef })

  return (
    <>
      <button type="button" onClick={() => setRevision((value) => value + 1)}>
        rerender
      </button>
      <table ref={tableRef}>
        <thead>
          <tr>
            <th
              data-testid="name-column"
              style={getColumnStyle('name', '50%')}
              ref={(element) => {
                if (element) {
                  element.getBoundingClientRect = () => ({ width: 200 } as DOMRect)
                }
              }}
            >
              Name
              <ColumnResizeHandle
                {...getResizeHandler('name')}
                aria-label="Resize name column"
              />
            </th>
            <th
              data-testid="size-column"
              style={getColumnStyle('size', '30%')}
              ref={(element) => {
                if (element) {
                  element.getBoundingClientRect = () => ({ width: 150 } as DOMRect)
                }
              }}
            >
              Size
            </th>
            <th
              style={getColumnStyle('time', '20%')}
              ref={(element) => {
                if (element) {
                  element.getBoundingClientRect = () => ({ width: 100 } as DOMRect)
                }
              }}
            >
              Time
            </th>
          </tr>
        </thead>
      </table>
    </>
  )
}

describe('file list column resizing', () => {
  it('keeps the resized boundary stable across React renders', () => {
    render(<ResizeFixture />)

    const handle = screen.getByRole('separator', { name: 'Resize name column' })
    fireEvent.mouseDown(handle, { clientX: 200 })
    fireEvent.mouseMove(document, { clientX: 240 })
    fireEvent.mouseUp(document)

    expect(screen.getByTestId('name-column')).toHaveStyle({ width: '240px' })
    expect(screen.getByTestId('size-column')).toHaveStyle({ width: '110px' })

    fireEvent.click(screen.getByRole('button', { name: 'rerender' }))

    expect(screen.getByTestId('name-column')).toHaveStyle({ width: '240px' })
    expect(screen.getByTestId('size-column')).toHaveStyle({ width: '110px' })
  })

  it('supports keyboard resizing without changing the pair total', () => {
    render(<ResizeFixture />)

    const handle = screen.getByRole('separator', { name: 'Resize name column' })
    fireEvent.keyDown(handle, { key: 'ArrowRight' })

    expect(screen.getByTestId('name-column')).toHaveStyle({ width: '212px' })
    expect(screen.getByTestId('size-column')).toHaveStyle({ width: '138px' })
  })
})
