export const DEFAULT_CHECKPOINT_APPROVE_OPTION = 'Approve'
export const CHECKPOINT_REJECT_OPTION = 'Reject'

export function effectiveCheckpointOptions(options: string[] | undefined): string[] {
  return options && options.length > 0 ? options : [DEFAULT_CHECKPOINT_APPROVE_OPTION]
}

export function uniqueOptions(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const title = value.trim()
    if (!title || seen.has(title)) continue
    seen.add(title)
    result.push(title)
  }
  return result
}

export function isProjectedDefaultApproveOption(options: string[] | undefined, optionTitle: string): boolean {
  return (!options || options.length === 0) && optionTitle.trim() === DEFAULT_CHECKPOINT_APPROVE_OPTION
}
