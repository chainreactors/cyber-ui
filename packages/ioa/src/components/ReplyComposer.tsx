import { useEffect, useState } from 'react'
import { MarkdownEditor } from '@aspect/markdown'
import { RefreshCw, Send } from 'lucide-react'
import { Button } from '@aspect/ui'
import { shortId } from './forum-utils'

export interface ReplyComposerProps {
  item: {
    message: {
      id: string
      sender?: string
    }
  }
  label?: string
  submitting: boolean
  error: string
  onSubmit: (content: string) => Promise<void>
}

export function ReplyComposer({
  item,
  label,
  submitting,
  error,
  onSubmit,
}: ReplyComposerProps) {
  const [draft, setDraft] = useState('')

  useEffect(() => {
    setDraft('')
  }, [item.message.id])

  const body = draft.trim()
  const canSubmit = Boolean(body) && !submitting
  const handleSubmit = async () => {
    if (!canSubmit) return
    try {
      await onSubmit(body)
      setDraft('')
    } catch {
      // Parent owns the visible error state.
    }
  }

  return (
    <div
      data-forum-reply-target={item.message.id}
      className="border-t border-border/60 pt-3"
      onClick={event => event.stopPropagation()}
    >
      <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-semibold text-muted-foreground">
          {label || `Reply to ${shortId(item.message.sender || 'sender')}`}
        </span>
      </div>
      <MarkdownEditor
        value={draft}
        onChange={setDraft}
        placeholder="Reply"
        minHeight="88px"
        compact
        disabled={submitting}
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        {error && (
          <span className="min-w-0 flex-1 break-words text-[11px] font-medium text-destructive">
            {error}
          </span>
        )}
        <Button
          size="sm"
          disabled={!canSubmit}
          className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold"
          onClick={() => void handleSubmit()}
        >
          {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Reply
        </Button>
      </div>
    </div>
  )
}
