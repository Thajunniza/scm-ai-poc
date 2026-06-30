/**
 * markdown.js
 * ────────────
 * Minimal, dependency-free markdown-ish renderer.
 * Handles exactly what our agent prompts produce:
 * **bold**, bullet lists, line breaks, simple headers (##).
 * Not a full markdown parser — intentionally narrow.
 */

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function inline(text) {
  let out = escapeHtml(text)
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/`(.+?)`/g, '<code>$1</code>')
  return out
}

export function renderMarkdown(raw) {
  if (!raw) return ''

  const lines = raw.split('\n')
  const html = []
  let inList = false

  const closeList = () => {
    if (inList) { html.push('</ul>'); inList = false }
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === '') {
      closeList()
      continue
    }

    if (/^#{1,3}\s+/.test(trimmed)) {
      closeList()
      const text = trimmed.replace(/^#{1,3}\s+/, '')
      html.push(`<p class="md-heading">${inline(text)}</p>`)
      continue
    }

    if (/^[-•]\s+/.test(trimmed)) {
      if (!inList) { html.push('<ul>'); inList = true }
      html.push(`<li>${inline(trimmed.replace(/^[-•]\s+/, ''))}</li>`)
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (!inList) { html.push('<ul>'); inList = true }
      html.push(`<li>${inline(trimmed.replace(/^\d+\.\s+/, ''))}</li>`)
      continue
    }

    closeList()
    html.push(`<p>${inline(trimmed)}</p>`)
  }

  closeList()
  return html.join('')
}