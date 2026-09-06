/**
 * Handing a generated file to the browser.
 *
 * Everything stays on the machine: a Blob is created, given an object URL, and
 * clicked. Nothing is uploaded, and no third-party service ever sees the
 * commercial data.
 *
 * The object URL is revoked on the next frame rather than immediately, because
 * some browsers have not finished reading it when the click handler returns.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(
  content: string,
  filename: string,
  mime = 'text/plain;charset=utf-8',
): void {
  downloadBlob(new Blob([content], { type: mime }), filename)
}

export const downloadCsv = (content: string, filename: string): void =>
  downloadText(content, filename, 'text/csv;charset=utf-8')
