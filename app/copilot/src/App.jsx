import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'
import Header from './components/Header'
import MessageBubble from './components/MessageBubble'
import TypingIndicator from './components/TypingIndicator'
import SuggestedPrompts from './components/SuggestedPrompts'
import ChatInput from './components/ChatInput'
import { sendChat, checkHealth } from './api/scmChatClient'

const PASSWORDS = { admin: 'admin', analyst: 'analyst', viewer: 'viewer' }

function welcomeMessage() {
  return {
    id: 'welcome',
    role: 'agent',
    agentUsed: null,
    text:
      "Welcome. I'm SCM Copilot — ask me about stock levels, shipment delays, " +
      'or supplier risk, and I\u2019ll route your question to the right specialist agent.',
  }
}

export default function App() {
  const [user, setUser] = useState('analyst')
  const [messages, setMessages] = useState([welcomeMessage()])
  const [isThinking, setIsThinking] = useState(false)
  const [health, setHealth] = useState({ status: 'checking', label: 'Checking GenAI Hub…' })
  const scrollRef = useRef(null)

  const auth = { username: user, password: PASSWORDS[user] }

  // ── Check GenAI Hub health whenever the active user changes ─────────────
  useEffect(() => {
    let cancelled = false
    checkHealth({ auth })
      .then((res) => {
        if (cancelled) return
        setHealth(
          res.healthy
            ? { status: 'live', label: 'GenAI Hub live' }
            : { status: 'down', label: 'GenAI Hub unavailable — using simulation' }
        )
      })
      .catch(() => {
        if (!cancelled) setHealth({ status: 'unknown', label: 'Health check failed' })
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // ── Auto-scroll to the latest message ────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isThinking])

  // ── Send a message to the chat router ────────────────────────────────────
  const handleSend = useCallback(async (text) => {
    const userMsg = { id: crypto.randomUUID(), role: 'user', text }
    setMessages((prev) => [...prev, userMsg])
    setIsThinking(true)

    try {
      const res = await sendChat({ auth, message: text, agentHint: '' })
      const agentMsg = {
        id: crypto.randomUUID(),
        role: 'agent',
        text: res.reply,
        agentUsed: res.agentUsed,
        confidence: res.confidence,
        sources: res.sources,
        meta: res.meta,
      }
      setMessages((prev) => [...prev, agentMsg])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'agent',
          text:
            err.status === 403
              ? `Access denied — the **${user}** role cannot run agent queries. Switch to analyst or admin.`
              : `Something went wrong reaching SCM Copilot: ${err.message}`,
          agentUsed: 'RouterAgent',
          isError: true,
        },
      ])
    } finally {
      setIsThinking(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const showSuggestions = messages.length === 1 && !isThinking

  return (
    <div className="app-shell">
      <Header user={user} onUserChange={setUser} health={health} />

      <main className="conversation" ref={scrollRef}>
        <div className="conversation-inner">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {isThinking && <TypingIndicator label="Copilot" />}

          {showSuggestions && <SuggestedPrompts onPick={handleSend} />}
        </div>
      </main>

      <footer className="input-zone">
        <div className="input-zone-inner">
          <ChatInput onSend={handleSend} disabled={isThinking} />
          <div className="input-footnote">
            SCM Copilot routes to InventoryAgent, DeliveryAgent, or SupplierRiskAgent
          </div>
        </div>
      </footer>
    </div>
  )
}