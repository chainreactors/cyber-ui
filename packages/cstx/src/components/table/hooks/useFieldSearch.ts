export interface ParsedQuery {
  global: string;
  fields: Array<{ key: string; value: string; fuzzy: boolean }>;
}

export function parseSearchQuery(query: string): ParsedQuery {
  const tokens = query.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const fields: ParsedQuery['fields'] = [];
  const globalParts: string[] = [];

  for (const token of tokens) {
    const colonMatch = token.match(/^(\w+):(.+)$/);
    const tildeMatch = token.match(/^(\w+)~(.+)$/);

    if (colonMatch) {
      fields.push({
        key: colonMatch[1],
        value: colonMatch[2].replace(/^"|"$/g, ''),
        fuzzy: false,
      });
    } else if (tildeMatch) {
      fields.push({
        key: tildeMatch[1],
        value: tildeMatch[2].replace(/^"|"$/g, ''),
        fuzzy: true,
      });
    } else {
      globalParts.push(token.replace(/^"|"$/g, ''));
    }
  }

  return { global: globalParts.join(' '), fields };
}

type Row = Record<string, unknown>;

export function matchesFieldSearch(
  row: Row,
  parsed: ParsedQuery,
  columnKeys: string[],
): boolean {
  for (const field of parsed.fields) {
    const key = columnKeys.find((k) => k.toLowerCase() === field.key.toLowerCase());
    if (!key) return false;
    const cellValue = String(row[key] ?? '').toLowerCase();
    const searchValue = field.value.toLowerCase();
    if (field.fuzzy) {
      if (!cellValue.includes(searchValue)) return false;
    } else {
      if (cellValue !== searchValue) return false;
    }
  }

  if (parsed.global) {
    const globalLower = parsed.global.toLowerCase();
    const rowText = columnKeys
      .map((k) => String(row[k] ?? ''))
      .join(' ')
      .toLowerCase();
    if (!rowText.includes(globalLower)) return false;
  }

  return true;
}
