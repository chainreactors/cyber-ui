function parseValidDate(value?: Date | string | number | null): Date | null {
  if (value === null || value === undefined || value === '') return null

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  if (date.getUTCFullYear() <= 1) return null

  return date
}

export function formatRelativeTime(dateStr?: Date | string | number | null): string {
  const date = parseValidDate(dateStr)
  if (!date) return '-'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`
  return `${Math.floor(diffDays / 365)}年前`
}

export function formatFullTime(dateStr?: Date | string | number | null): string {
  const date = parseValidDate(dateStr)
  if (!date) return '-'

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
