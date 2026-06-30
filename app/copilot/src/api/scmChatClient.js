/**
 * scmChatClient.js
 * ─────────────────
 * The ONLY file that talks to the CAP backend.
 * Uses relative paths — works correctly regardless of where
 * this UI is actually hosted (localhost, BTP, any domain),
 * because the browser always resolves a relative path against
 * whatever origin served the page itself.
 */

function authHeader(username, password) {
  const token = btoa(`${username}:${password}`)
  return `Basic ${token}`
}

async function post(path, body, auth) {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(auth.username, auth.password)
    },
    body: JSON.stringify(body)
  })

  let json = null
  try { json = await res.json() } catch { /* no body */ }

  if (!res.ok) {
    const message = json?.error?.message || json?.reply || `Request failed (${res.status})`
    const err = new Error(message)
    err.status = res.status
    err.body = json
    throw err
  }

  return json
}

async function get(path, auth) {
  const res = await fetch(path, {
    headers: { Authorization: authHeader(auth.username, auth.password) }
  })
  if (!res.ok) {
    const err = new Error(`Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return res.json()
}

export function sendChat({ auth, message, agentHint = '' }) {
  return post('/scm-chat/chat', { message, agentHint }, auth)
}

export function checkHealth({ auth }) {
  return post('/scm-chat/checkGenAiHealth', {}, auth)
}

export function getEntity({ auth, entity }) {
  return get(`/scm-chat/${entity}`, auth)
}