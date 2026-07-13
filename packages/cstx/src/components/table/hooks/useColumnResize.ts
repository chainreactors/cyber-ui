import { useState, useCallback, useRef } from 'react';

const MIN_COLUMN_WIDTH = 50;

export interface UseColumnResizeReturn {
  columnWidths: Record<string, number>;
  resizingColumn: string | null;
  handleResizeStart: (columnId: string, e: React.MouseEvent) => void;
  getAdjustedGridTemplate: (baseTemplate: string, columnIds: string[]) => string;
  resetColumnWidths: () => void;
}

export function useColumnResize(): UseColumnResizeReturn {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const startRef = useRef<{ columnId: string; startX: number; startWidth: number } | null>(null);

  const handleResizeStart = useCallback((columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const headerCell = (e.target as HTMLElement).parentElement;
    if (!headerCell) return;
    const startWidth = headerCell.getBoundingClientRect().width;
    startRef.current = { columnId, startX: e.clientX, startWidth };
    setResizingColumn(columnId);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!startRef.current) return;
      const delta = moveEvent.clientX - startRef.current.startX;
      const newWidth = Math.max(MIN_COLUMN_WIDTH, startRef.current.startWidth + delta);
      setColumnWidths((prev) => ({ ...prev, [startRef.current!.columnId]: newWidth }));
    };

    const onMouseUp = () => {
      startRef.current = null;
      setResizingColumn(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const getAdjustedGridTemplate = useCallback(
    (baseTemplate: string, columnIds: string[]): string => {
      if (Object.keys(columnWidths).length === 0) return baseTemplate;

      const parts = baseTemplate.split(/\s+/);
      return parts
        .map((part, i) => {
          const colId = columnIds[i];
          if (colId && colId in columnWidths) {
            return `${columnWidths[colId]}px`;
          }
          return part;
        })
        .join(' ');
    },
    [columnWidths],
  );

  const resetColumnWidths = useCallback(() => {
    setColumnWidths({});
  }, []);

  return {
    columnWidths,
    resizingColumn,
    handleResizeStart,
    getAdjustedGridTemplate,
    resetColumnWidths,
  };
}
