import { useEffect, useMemo, useState } from 'react'
import { Check, CheckCircle2, Loader2, Send } from 'lucide-react'
import type { Checkpoint, CheckpointReply } from '../types'
import { effectiveCheckpointOptions, isProjectedDefaultApproveOption } from '../checkpoint-helpers'
import { MarkdownEditor, MarkdownContent } from '@aspect/markdown'
import { Button } from '@aspect/ui'
import { cn } from '@aspect/theme'

export interface CheckpointReviewComposerProps {
  checkpoint: Checkpoint
  disabled: boolean
  disabledReason?: string
  error?: string
  onReply: (reply: CheckpointReply) => Promise<void>
  submitLabel?: string
  compact?: boolean
  className?: string
}

export function CheckpointReviewComposer({
  checkpoint,
  disabled,
  disabledReason,
  error,
  onReply,
  submitLabel,
  compact = false,
  className,
}: CheckpointReviewComposerProps) {
  const options = useMemo(() => effectiveCheckpointOptions(checkpoint.options), [checkpoint.options])
  const optionTitles = options
  const hasExplicitOptions = checkpoint.options.length > 0
  const optionsKey = optionTitles.join('\n')
  const [selectedOption, setSelectedOption] = useState(hasExplicitOptions ? '' : optionTitles[0] ?? '')
  const [feedbackText, setFeedbackText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    setSelectedOption(hasExplicitOptions ? '' : optionTitles[0] ?? '')
    setFeedbackText('')
    setSubmitted(false)
    setLocalError('')
  }, [checkpoint.entityId, optionsKey, hasExplicitOptions])

  const canSubmit = !disabled && !submitted && (
    hasExplicitOptions
      ? Boolean(selectedOption)
      : Boolean(selectedOption || feedbackText.trim())
  )
  const buttonLabel = submitLabel || (hasExplicitOptions ? 'Submit review' : 'Approve')
  const activeError = localError || error || ''

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLocalError('')
    setSubmitted(true)
    try {
      await onReply({ option: selectedOption, text: feedbackText.trim() })
    } catch (err) {
      setSubmitted(false)
      setLocalError(err instanceof Error ? err.message : 'Reply failed')
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className={cn('rounded-xl border border-border/70 bg-background', compact ? 'p-3' : 'p-4')}>
        <div className="space-y-2.5">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {hasExplicitOptions ? 'Select option' : 'Approve checkpoint'}
            </div>
            {submitted && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                <Check className="h-3 w-3" />
                submitted
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            {optionTitles.map(title => {
              const selected = selectedOption === title
              const projectedApprove = isProjectedDefaultApproveOption(checkpoint.options, title)
              return (
                <button
                  key={title}
                  type="button"
                  disabled={disabled || submitted}
                  className={cn(
                    'flex min-h-9 items-start gap-2 rounded-lg border px-3 py-2 text-left transition-all',
                    selected
                      ? 'border-primary/40 bg-primary/10 shadow-sm'
                      : projectedApprove
                        ? 'border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/15'
                        : 'border-border/70 bg-background hover:border-primary/25 hover:bg-muted',
                  )}
                  onClick={() => setSelectedOption(title)}
                >
                  <CheckCircle2
                    className={cn(
                      'mt-0.5 h-3.5 w-3.5 shrink-0',
                      selected ? 'text-primary' : projectedApprove ? 'text-emerald-600' : 'text-muted-foreground',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <span className={cn('text-xs font-medium', selected ? 'text-foreground' : projectedApprove ? 'text-emerald-700' : 'text-muted-foreground')}>
                      {title}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          <MarkdownEditor
            value={feedbackText}
            onChange={setFeedbackText}
            placeholder={disabledReason ? 'Task/session metadata missing' : 'Add context, rationale, or follow-up notes'}
            minHeight={compact ? '92px' : '110px'}
            compact
            disabled={disabled || submitted}
          />

          {disabledReason && (
            <div className="rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-warning">
              {disabledReason}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 text-[11px] text-muted-foreground">
              {selectedOption ? (
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3 w-3" />
                  {selectedOption}
                </span>
              ) : hasExplicitOptions ? (
                <span>Select an option</span>
              ) : (
                <span>Approve checkpoint</span>
              )}
            </div>
            <Button
              size="sm"
              disabled={!canSubmit}
              className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold"
              onClick={() => void handleSubmit()}
            >
              {submitted ? (
                <Check className="h-3.5 w-3.5" />
              ) : (disabled && !disabledReason) ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {buttonLabel}
            </Button>
          </div>

          {submitted && (
            <div className="rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-xs text-success">
              Human feedback recorded. Syncing with IOA.
            </div>
          )}

          {activeError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {activeError}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function CheckpointFeedbackPreview({
  author,
  option,
  content,
}: {
  author?: string
  option?: string
  content: string
}) {
  return (
    <div className="space-y-3">
      {option && (
        <div className="inline-flex rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
          {option}
        </div>
      )}
      {author && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>{author}</span>
        </div>
      )}
      <MarkdownContent content={content} />
    </div>
  )
}
