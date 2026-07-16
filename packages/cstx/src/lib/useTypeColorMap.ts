import { useMemo } from 'react';
import { defaultColorManager } from './color-manager';

export function useTypeColorMap<T>(
    items: T[],
    typeKey: keyof T,
    colorCategory: 'node' | 'edge' = 'node',
): Record<string, string> {
    return useMemo(() => {
        const uniqueTypes = [...new Set(
            items.map((item) => item[typeKey] as unknown),
        )].filter((type): type is string => typeof type === 'string' && type.length > 0);
        return defaultColorManager.getTypeColorMap(uniqueTypes, colorCategory);
    }, [items, typeKey, colorCategory]);
}
