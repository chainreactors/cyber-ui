import { useRef, useState, useEffect } from "react"

export const useResizeObserver = () => {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const update = (width: number, height: number) => {
      setSize((current) => (
        current.width === width && current.height === height
          ? current
          : { width, height }
      ))
    }
    const updateFromElement = () => {
      const bounds = element.getBoundingClientRect()
      update(bounds.width, bounds.height)
    }

    updateFromElement()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateFromElement)
      return () => window.removeEventListener('resize', updateFromElement)
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        update(entry.contentRect.width, entry.contentRect.height)
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, width: size.width, height: size.height }
}

export const isCompactFileManagerWidth = (width: number, breakpoint = 768): boolean => (
  width > 0 && width < breakpoint
)
