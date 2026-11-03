import { useState } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { FormError } from './ui/FormError'
import { StarRating } from './ui/StarRating'
import { DIALOG_OVERLAY, DIALOG_PRIMARY_BUTTON, DIALOG_SHADOW, FIELD_INPUT, FIELD_LABEL } from './ui/dialogStyles'
import { submitFeedback } from '../lib/feedback/submitFeedback'

interface FeedbackDialogProps {
  isOpen: boolean
  /** `manual` (Settings): just Send and the close button. `prompt` (the one-day nudge):
   * adds "Don't ask again" and a "Remind me later" button that turns into "Ok" when the
   * box is ticked. */
  mode: 'manual' | 'prompt'
  /** Closing without sending (X, Escape, backdrop, back button). In `prompt` mode this
   * is the same as the secondary button, so it gets `dontAskAgain` to act on. */
  onClose: (dontAskAgain: boolean) => void
}

export function FeedbackDialog({ isOpen, mode, onClose }: FeedbackDialogProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [dontAskAgain, setDontAskAgain] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const isPrompt = mode === 'prompt'

  async function handleSend() {
    setSending(true)
    setError(null)
    try {
      await submitFeedback(rating, comment)
      setSent(true)
    } catch {
      // Not swallowed like the update check: this person just wrote something, so they
      // need to know it didn't go through and can try again (nothing is queued).
      setError("Couldn't send your feedback. Check your connection and try again.")
    } finally {
      setSending(false)
    }
  }

  function close() {
    onClose(isPrompt && dontAskAgain)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={sent ? () => onClose(true) : close}
      title={sent ? 'Thank you!' : 'Send feedback'}
      overlayClassName={DIALOG_OVERLAY}
      panelClassName={DIALOG_SHADOW}
    >
      {sent ? (
        <div className="flex flex-col gap-4 text-center">
          <p className="text-slate-700">Your feedback was sent. It really helps.</p>
          <Button onClick={() => onClose(true)} className={DIALOG_PRIMARY_BUTTON}>
            Close
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {isPrompt && (
            <p className="text-slate-700">You've been using Taskodoro for a day. How's it going?</p>
          )}

          <StarRating value={rating} onChange={setRating} disabled={sending} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="feedback-comment" className={FIELD_LABEL}>
              Anything you'd like to tell us? (optional)
            </label>
            <textarea
              id="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={2000}
              disabled={sending}
              placeholder="What's working, what's not…"
              className={`${FIELD_INPUT} resize-none`}
            />
          </div>

          <FormError message={error} />

          {isPrompt && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(e) => setDontAskAgain(e.target.checked)}
                disabled={sending}
                className="h-4 w-4 accent-accent-purple"
              />
              Don't ask again
            </label>
          )}

          <div className="flex justify-end gap-3">
            {isPrompt && (
              <Button variant="secondary" onClick={close} disabled={sending}>
                {dontAskAgain ? 'Ok' : 'Remind me later'}
              </Button>
            )}
            <Button onClick={handleSend} loading={sending} disabled={rating <= 0} className={DIALOG_PRIMARY_BUTTON}>
              Send
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
