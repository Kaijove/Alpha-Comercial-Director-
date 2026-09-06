import { useEffect, useRef } from 'react'

/**
 * Focus management for a dialog.
 *
 * Three things a modal owes a keyboard user, none of which come for free:
 *
 *  - focus moves *into* the dialog when it opens, so the next Tab lands inside
 *    it rather than somewhere back on the page;
 *  - Tab and Shift+Tab cycle within it rather than escaping to the content
 *    behind, which a screen reader has already been told is inert;
 *  - focus returns to whatever opened it on close, so the page does not silently
 *    dump the user back at the top.
 *
 * Shared by the Modal and the Drawer so every dialog in the product behaves the
 * same way, and so fixing this once fixes it everywhere.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useDialogFocus<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!open) return

    const container = ref.current
    // Whatever had focus when the dialog opened is where it goes back to.
    const opener = document.activeElement as HTMLElement | null

    const focusable = () =>
      Array.from(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      )

    // Prefer the first real control; fall back to the dialog itself so focus is
    // never left outside a dialog that happens to contain no controls.
    const first = focusable()[0] ?? container
    first?.focus({ preventScroll: true })

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !container) return

      const elements = focusable()
      if (elements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = elements[0]
      const lastElement = elements[elements.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === firstElement || !container.contains(active))) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && active === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', onKey, true)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = previousOverflow
      // The opener can be gone by now - a row that was deleted, for instance.
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [open, onClose])

  return ref
}
