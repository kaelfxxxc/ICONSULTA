import { CheckIcon, XIcon } from './icons'

/**
 * Joined approve/decline control for appointment rows: two icon-only halves
 * split by a hairline, each tinting its own background on hover.
 *
 * The halves stay two separate buttons rather than becoming a toggle — they're
 * independent actions, not two states of one setting, so neither should ever
 * read as "selected".
 *
 * Both icons carry an `aria-label`: they render `aria-hidden`, so an icon-only
 * button without one is announced as a bare "button", indistinguishable from
 * the one next to it.
 *
 * Hover is `enabled:hover:` rather than plain `hover:` because `:hover` still
 * matches disabled elements — with `disabled:opacity-50` alone, a dead half
 * would still tint under the cursor and look clickable.
 *
 * The focus ring uses a negative `outline-offset`, which draws it inside the
 * button's own box. A normal outward outline would be clipped by the
 * container's `overflow-hidden`.
 */
export function ApproveDecline({
  onApprove,
  onDecline,
  disabled = false,
  approveDisabled = disabled,
  declineDisabled = disabled,
}: {
  onApprove: () => void
  onDecline: () => void
  /** Disables both halves. Use the per-half props when they differ. */
  disabled?: boolean
  approveDisabled?: boolean
  declineDisabled?: boolean
}) {
  return (
    <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onApprove}
        disabled={approveDisabled}
        aria-label="Approve"
        title="Approve"
        className="inline-flex h-8 w-9 items-center justify-center text-[#0e9a71] transition enabled:hover:bg-[#d9f7eb] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0e9a71] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CheckIcon className="h-4 w-4" />
      </button>
      {/* The hairline is this button's own left border, so the two halves stay
          flush at any size without a spacer element between them. */}
      <button
        type="button"
        onClick={onDecline}
        disabled={declineDisabled}
        aria-label="Decline"
        title="Decline"
        className="inline-flex h-8 w-9 items-center justify-center border-l border-slate-200 text-[#b3454b] transition enabled:hover:bg-[#fbe9ea] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#b3454b] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
