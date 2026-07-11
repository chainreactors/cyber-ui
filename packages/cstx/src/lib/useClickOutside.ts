import { useEffect } from 'react';

export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClose]);
}
