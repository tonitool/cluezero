'use client'

import { useState, useRef, useEffect } from 'react'
import {
  TrendingUp, User, Send, RefreshCcw, ChevronDown, ChevronUp,
  BarChart3, Search, Lightbulb, GitCompare, Layers, ArrowLeft,
  Wrench, CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentEventType = 'tool_call' | 'tool_result' | 'text' | 'error' | 'done'

interface AgentEvent {
  type:     AgentEventType
  tool?:    string
  input?:   Record<string, unknown>
  result?:  string
  text?:    string
  message?: string
}

interface ToolStep {
  tool:    string
  input:   Record<string, unknown>
  result?: string
  done:    boolean
}

interface Message {
  id:        string
  role:      'user' | 'assistant'
  text:      string
  toolSteps: ToolStep[]
  error?:    string
}

// ─── Tool display config ──────────────────────────────────────────────────────

const TOOL_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  get_market_overview:          { label: 'Market overview',       icon: BarChart3,    color: 'text-indigo-600' },
  get_brand_analysis:           { label: 'Brand analysis',        icon: Search,       color: 'text-blue-600' },
  get_top_creatives:            { label: 'Creative analysis',     icon: Layers,       color: 'text-violet-600' },
  get_whitespace_opportunities: { label: 'Whitespace analysis',   icon: Lightbulb,    color: 'text-emerald-600' },
  compare_brands:               { label: 'Brand comparison',      icon: GitCompare,   color: 'text-amber-600' },
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTED = [
  { icon: BarChart3,  text: 'Give me a full market overview for this week' },
  { icon: TrendingUp, text: 'Which competitor is the biggest threat right now and why?' },
  { icon: Lightbulb,  text: 'What whitespace opportunities am I missing?' },
  { icon: GitCompare, text: 'Compare my brand vs the top 2 competitors' },
  { icon: Layers,     text: 'Show me the top 5 performing creatives in the market' },
  { icon: Search,     text: 'What should I do in the next 2 weeks to improve my position?' },
]

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Bold
    const parts = line.split(/(\*\*[^*]+\*\*)/)
    const rendered = parts.map((part, j) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={j}>{part.slice(2, -2)}</strong>
        : part
    )
    // Bullet points
    if (line.startsWith('• ') || line.startsWith('- ')) {
      return <li key={i} className="ml-3">{rendered.slice(1)}</li>
    }
    return <span key={i}>{rendered}{i < lines.length - 1 && <br />}</span>
  })
}

// ─── Tool step display ────────────────────────────────────────────────────────

function ToolStepRow({ step }: { step: ToolStep }) {
  const [open, setOpen] = useState(false)
  const cfg = TOOL_CONFIG[step.tool] ?? { label: step.tool, icon: Wrench, color: 'text-zinc-500' }
  const Icon = cfg.icon

  return (
    <div className="border border-border rounded-lg overflow-hidden text-xs">
      <button
        className="flex items-center gap-2 w-full px-3 py-2 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
        onClick={() => step.result && setOpen(v => !v)}
      >
        <Icon className={cn('size-3.5 shrink-0', cfg.color)} />
        <span className="font-medium text-zinc-700">{cfg.label}</span>
        {Object.keys(step.input ?? {}).length > 0 && (
          <span className="text-zinc-400 truncate max-w-[200px]">
            ({Object.entries(step.input ?? {}).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')})
          </span>
        )}
        <span className="ml-auto shrink-0">
          {!step.done
            ? <Loader2 className="size-3 animate-spin text-zinc-400" />
            : step.result
              ? (open ? <ChevronUp className="size-3 text-zinc-400" /> : <ChevronDown className="size-3 text-zinc-400" />)
              : <CheckCircle2 className="size-3 text-emerald-500" />}
        </span>
      </button>
      {open && step.result && (
        <div className="px-3 py-2 bg-white border-t border-border">
          <pre className="text-[11px] text-zinc-600 whitespace-pre-wrap font-mono leading-relaxed">{step.result}</pre>
        </div>
      )}
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div className={cn(
        'size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
        isUser ? 'bg-zinc-200 text-zinc-600' : 'bg-indigo-600 text-white'
      )}>
        {isUser ? <User className="size-3.5" /> : <TrendingUp className="size-3.5" />}
      </div>

      <div className={cn('max-w-[85%] space-y-2', isUser && 'items-end flex flex-col')}>
        {/* Tool steps (only for assistant) */}
        {!isUser && msg.toolSteps.length > 0 && (
          <div className="space-y-1.5 w-full">
            {msg.toolSteps.map((step, i) => <ToolStepRow key={i} step={step} />)}
          </div>
        )}

        {/* Message content */}
        {msg.error ? (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-700">
            <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
            {msg.error}
          </div>
        ) : msg.text ? (
          <div className={cn(
            'rounded-xl px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-foreground text-background'
              : 'bg-white border border-border shadow-sm text-foreground'
          )}>
            {isUser
              ? <p>{msg.text}</p>
              : <div className="text-sm leading-relaxed">{renderMarkdown(msg.text)}</div>}
          </div>
        ) : !isUser && msg.toolSteps.length > 0 ? (
          // Still processing — show spinner
          <div className="bg-white border border-border rounded-xl px-4 py-3 shadow-sm">
            <span className="flex gap-1 items-center h-4">
              <span className="size-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
              <span className="size-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  workspaceId?:  string
  ownBrand?:     string
  connectionId?: string
  onBack?:       () => void
}

export function PerformanceAgentView({ workspaceId, ownBrand, connectionId, onBack }: Props) {
  const brandLabel = ownBrand || 'Your Brand'
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef  = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Build conversation history for API (user/assistant text only)
  function buildHistory() {
    return messages
      .filter(m => m.text)
      .map(m => ({ role: m.role, content: m.text }))
  }

  async function send(text: string) {
    if (!text.trim() || streaming || !workspaceId) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text.trim(), toolSteps: [] }
    const assistantId = (Date.now() + 1).toString()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', text: '', toolSteps: [] }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setStreaming(true)

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch('/api/agents/performance', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  abort.signal,
        body: JSON.stringify({
          message:      text.trim(),
          history:      buildHistory(),
          workspaceId,
          connectionId,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, error: `Error: ${err}` } : m
        ))
        return
      }

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          let event: AgentEvent
          try { event = JSON.parse(trimmed) } catch { continue }

          switch (event.type) {
            case 'tool_call':
              setMessages(prev => prev.map(m => {
                if (m.id !== assistantId) return m
                return { ...m, toolSteps: [...m.toolSteps, { tool: event.tool!, input: event.input ?? {}, done: false }] }
              }))
              break

            case 'tool_result':
              setMessages(prev => prev.map(m => {
                if (m.id !== assistantId) return m
                const steps = m.toolSteps.map(s =>
                  s.tool === event.tool && !s.done ? { ...s, result: event.result, done: true } : s
                )
                return { ...m, toolSteps: steps }
              }))
              break

            case 'text':
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, text: m.text + (event.text ?? '') } : m
              ))
              break

            case 'error':
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, error: event.message } : m
              ))
              break

            case 'done':
              break
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, error: 'Something went wrong. Please try again.' } : m
        ))
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    setStreaming(false)
  }

  function handleReset() {
    abortRef.current?.abort()
    setStreaming(false)
    setInput('')
    setMessages([])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 shrink-0">
        <div className="flex items-start gap-3">
          {onBack && (
            <button onClick={onBack} className="mt-1 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
            </button>
          )}
          <SectionHeader
            title="Performance Marketing Manager"
            description={`AI agent with live access to ${brandLabel}'s competitive data — uses tools to fetch real numbers before answering`}
          />
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1.5 mt-1 shrink-0" onClick={handleReset}>
            <RefreshCcw className="size-3" />
            New session
          </Button>
        )}
      </div>

      {/* Capability pills */}
      <div className="flex gap-2 flex-wrap mb-4 shrink-0">
        {Object.values(TOOL_CONFIG).map(cfg => {
          const Icon = cfg.icon
          return (
            <div key={cfg.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-white border border-border rounded-full px-2.5 py-1 shadow-sm">
              <Icon className={cn('size-3', cfg.color)} />
              {cfg.label}
            </div>
          )
        })}
      </div>

      {/* No workspace */}
      {!workspaceId && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700 mb-4 shrink-0">
          No workspace connected. Please log in and select a workspace to use this agent.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 mb-4 min-h-0">

        {/* Suggested prompts — only when empty */}
        {messages.length === 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-3">
              This agent calls real tools to fetch live data — it doesn't guess. Try asking:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  onClick={() => send(text)}
                  disabled={!workspaceId || streaming}
                  className="flex items-start gap-2.5 text-left bg-white border border-border rounded-lg px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:border-zinc-400 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Icon className="size-3.5 mt-0.5 shrink-0 text-indigo-400" />
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
          placeholder={workspaceId ? 'Ask about spend, competitors, creatives, opportunities…' : 'Connect a workspace to start…'}
          className="flex-1 h-10 px-4 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-ring shadow-sm disabled:opacity-50"
          disabled={streaming || !workspaceId}
        />
        {streaming ? (
          <Button size="sm" variant="outline" className="h-10 px-4 gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={handleStop}>
            Stop
          </Button>
        ) : (
          <Button size="sm" className="h-10 px-4 gap-1.5 bg-indigo-600 hover:bg-indigo-700" onClick={() => send(input)} disabled={!input.trim() || !workspaceId}>
            <Send className="size-3.5" />
            Send
          </Button>
        )}
      </div>
    </div>
  )
}
