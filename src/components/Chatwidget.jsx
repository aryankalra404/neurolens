import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import './ChatWidget.css'

const SPECIALIST = {
  name: 'Dr. Reyes',
  role: 'EEG Specialist',
  initials: 'R',
}

const GREETING = `Hi there! I'm Dr. Reyes, a certified EEG specialist. I'm here to help you understand your neural data and support your mental wellness.\n\nWould you like to share your past session data so I can provide more personalised guidance?`

function TypingDots() {
  return (
    <div className="cw-message cw-message--specialist">
      <div className="cw-avatar">{SPECIALIST.initials}</div>
      <div className="cw-bubble cw-bubble--specialist cw-bubble--typing">
        <span /><span /><span />
      </div>
    </div>
  )
}

export default function ChatWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [dataShared, setDataShared] = useState(false)
  const [sessionCtx, setSessionCtx] = useState(null)
  const [hasUnread, setHasUnread] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Initialize chat on first open
  useEffect(() => {
    if (open && !initialized) {
      setInitialized(true)
      setMessages([{
        id: 1,
        from: 'specialist',
        text: GREETING,
        ts: new Date(),
        sharePrompt: true,
      }])
    }
    if (open) {
      setHasUnread(false)
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Show unread dot after 4s if chat hasn't been opened
  useEffect(() => {
    if (!initialized) {
      const t = setTimeout(() => setHasUnread(true), 4000)
      return () => clearTimeout(t)
    }
  }, [initialized])

  const buildSystem = (ctx) => {
    let sys = `You are Dr. Reyes, a certified EEG specialist and mental wellness consultant at NeuroLens.

Speak as a real human specialist — warm, professional, concise. You review patients' EEG brainwave data and offer guidance on what their metrics suggest about their mental and cognitive state.

Rules:
- Never refer to yourself as an AI, bot, or assistant under any circumstances
- Keep responses to 2–4 sentences unless the patient asks for more
- When EEG data is available, reference specific metrics naturally
- Give practical, evidence-based suggestions
- Never diagnose — recommend follow-up with a licensed clinician for clinical concerns
- If someone appears in crisis, calmly direct them to 988 or 911
- Address the patient by first name when known

Patient: ${user?.user_metadata?.name || user?.email?.split('@')[0] || 'the patient'}`

    if (ctx) sys += `\n\nPATIENT EEG DATA:\n${ctx}`
    return sys
  }

  const callAI = async (history, ctx) => {
    const apiMsgs = history
      .filter(m => !m.sharePrompt)
      .map(m => ({
        role: m.from === 'specialist' ? 'assistant' : 'user',
        content: m.text,
      }))

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: buildSystem(ctx),
        messages: apiMsgs,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'error')
    return data.content?.[0]?.text || "I apologise — could you try again?"
  }

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim()
    if (!trimmed || isTyping) return

    const userMsg = { id: Date.now(), from: 'user', text: trimmed, ts: new Date() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setIsTyping(true)

    try {
      const reply = await callAI(next, sessionCtx)
      setMessages(prev => [...prev, { id: Date.now() + 1, from: 'specialist', text: reply, ts: new Date() }])
    } catch {
      setMessages(prev => [...prev, { id: Date.now() + 1, from: 'specialist', text: "I'm having a connection issue — please try again.", ts: new Date() }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleShareData = async () => {
    if (!user) return

    try {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      let ctx = ''
      if (sessions && sessions.length > 0) {
        const avg = (key) => (sessions.reduce((a, s) => a + (s[key] || 0), 0) / sessions.length).toFixed(0)
        ctx = `Patient has ${sessions.length} recorded EEG sessions.
Average metrics across recent sessions:
- Focus: ${avg('focus_avg')}%
- Stress: ${avg('stress_avg')}%
- Relaxation: ${avg('relaxation_avg')}%
- Cognitive Fatigue: ${avg('cog_fatigue_avg')}%
Most recent session duration: ${sessions[0]?.duration_seconds ? Math.round(sessions[0].duration_seconds / 60) + ' minutes' : 'unknown'}`
      } else {
        ctx = 'Patient has no recorded sessions yet.'
      }

      setSessionCtx(ctx)
      setDataShared(true)

      // Replace the share-prompt message and add specialist response
      setMessages(prev => prev.map(m => m.sharePrompt ? { ...m, sharePrompt: false } : m))

      const ack = sessions && sessions.length > 0
        ? `Thank you for sharing — I can see you have ${sessions.length} recorded sessions. I've had a look at your averages and I'm happy to walk you through what I'm seeing, or answer any questions you have.`
        : `Thanks for that. It looks like you haven't completed any EEG sessions yet — once you do, I'll be able to give you much more specific guidance. In the meantime, feel free to ask me anything about how you've been feeling.`

      setMessages(prev => [...prev, { id: Date.now(), from: 'specialist', text: ack, ts: new Date() }])
    } catch {
      setMessages(prev => [...prev, { id: Date.now(), from: 'specialist', text: "I had trouble accessing your session data. You can still chat with me directly.", ts: new Date() }])
    }
  }

  const handleDeclineShare = () => {
    setMessages(prev => prev.map(m => m.sharePrompt ? { ...m, sharePrompt: false } : m))
    setMessages(prev => [...prev, {
      id: Date.now(),
      from: 'specialist',
      text: "No problem at all. Feel free to tell me how you've been feeling, or ask me anything about your mental wellness.",
      ts: new Date(),
    }])
  }

  const fmt = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        className={`cw-fab ${open ? 'cw-fab--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Chat with specialist"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.18 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </motion.span>
          )}
        </AnimatePresence>
        {hasUnread && !open && <span className="cw-fab__dot" />}
      </button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="cw-panel"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Panel Header */}
            <div className="cw-header">
              <div className="cw-header__profile">
                <div className="cw-header__avatar">
                  {SPECIALIST.initials}
                  <span className="cw-header__online" />
                </div>
                <div>
                  <div className="cw-header__name">{SPECIALIST.name}</div>
                  <div className="cw-header__role">{SPECIALIST.role}</div>
                </div>
              </div>
              <button className="cw-header__close" onClick={() => setOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="cw-messages">
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  className={`cw-message cw-message--${msg.from}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {msg.from === 'specialist' && (
                    <div className="cw-avatar">{SPECIALIST.initials}</div>
                  )}
                  <div className={`cw-bubble cw-bubble--${msg.from}`}>
                    {msg.text.split('\n').map((line, i, arr) => (
                      <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                    ))}

                    {/* Share prompt buttons */}
                    {msg.sharePrompt && !dataShared && (
                      <div className="cw-share-actions">
                        <button className="cw-share-btn cw-share-btn--yes" onClick={handleShareData}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Yes, share my data
                        </button>
                        <button className="cw-share-btn cw-share-btn--no" onClick={handleDeclineShare}>
                          No thanks
                        </button>
                      </div>
                    )}

                    <div className="cw-bubble__time">{fmt(msg.ts)}</div>
                  </div>
                </motion.div>
              ))}

              {isTyping && <TypingDots />}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="cw-input-row">
              <textarea
                ref={inputRef}
                className="cw-input"
                placeholder="Type a message…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                disabled={isTyping}
              />
              <button
                className={`cw-send ${input.trim() && !isTyping ? 'cw-send--active' : ''}`}
                onClick={() => sendMessage()}
                disabled={!input.trim() || isTyping}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>

            <div className="cw-disclaimer">
              For wellness guidance only · Not medical advice · Emergencies: call 988
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}