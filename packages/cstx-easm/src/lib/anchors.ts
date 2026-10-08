export function assetAnchor(namespace: string, prefix: string, value: string) {
  return ['asset', namespace && anchorSlug(namespace), prefix, anchorSlug(value)].filter(Boolean).join('-')
}

function anchorSlug(value: string) {
  const slug = value.trim().toLowerCase().replace(/<[^>]*>/g, '').replace(/&[a-z0-9#]+;/g, '')
    .replace(/[^a-z0-9一-龥]+/g, '-').replace(/^-+|-+$/g, '')
  return (slug || 'section').slice(0, 96)
}
