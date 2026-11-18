import type { JsonObject } from '@bufbuild/protobuf'

/** Keep the tool's native JSON; the view validates only the fields it renders. */
export function recordingInfo(text: string): JsonObject[] {
  try {
    const value: unknown = JSON.parse(text)
    const entries = Array.isArray(value) ? value : [value]
    return entries.filter((entry): entry is JsonObject => !!entry && typeof entry === 'object' && !Array.isArray(entry))
  } catch { return [] }
}
