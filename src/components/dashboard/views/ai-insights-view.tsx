'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, User, TrendingUp, BarChart3, Lightbulb, AlertTriangle, RefreshCcw } from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Props {
  workspaceId?: string
  ownBrand?: string
  connectionId?: string
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  { icon: TrendingUp,    text: 'Which brand is spending the most this week and why is it significant?' },
  { icon: BarChart3,     text: 'How does my brand compare to competitors in spend share?' },
  { icon: Lightbulb,     text: 'What whitespace opportunities am I missing right now?' },
  { icon: AlertTriangle, text: 'Which competitor should I be most concerned about and why?' },
]

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderMarkdown(text: string) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/)
    return (
      <span key={i}>
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        )}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    )
  })
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AiInsightsView({ workspaceId, ownBrand = 'ORLEN', connectionId }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hi! I'm your competitive intelligence assistant, connected to your live ad data.\n\nI can see spend estimates, new creatives, platform mix, performance scores, and funnel distribution across all your tracked brands. Ask me anything, or pick a question below.`,
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  async function send(text: string) {
    if (!text.trim() || isStreaming || !workspaceId) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }

    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setIsStreaming(true)

    // Placeholder assistant message that we'll stream into
    const assistantId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }])

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abort.signal,
        body: JSON.stringify({
          workspaceId,
          ownBrand,
          connectionId,
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: `Sorry, I couldn't get a response right now. ${errText}` }
            : m
        ))
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        const snap = accumulated
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: snap } : m
        ))
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Something went wrong. Please try again.' }
            : m
        ))
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    setIsStreaming(false)
  }

  function handleReset() {
    abortRef.current?.abort()
    setIsStreaming(false)
    setInput('')
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: `Hi! I'm your competitive intelligence assistant, connected to your live ad data.\n\nI can see spend estimates, new creatives, platform mix, performance scores, and funnel distribution across all your tracked brands. Ask me anything, or pick a question below.`,
      timestamp: new Date(),
    }])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-start justify-between mb-2">
        <SectionHeader
          title="AI Insights"
          description="Chat with your live competitive intelligence data — powered by Claude"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground gap-1.5 mt-1 shrink-0"
          onClick={handleReset}
        >
          <RefreshCcw className="size-3" />
          New chat
        </Button>
      </div>

      {/* Suggested prompts — only when just the welcome message */}
      {messages.length === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {SUGGESTED_PROMPTS.map(({ icon: Icon, text }) => (
            <button
              key={text}
              onClick={() => send(text)}
              disabled={!workspaceId}
              className="flex items-start gap-2.5 text-left bg-white border border-border rounded-lg px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:border-zinc-400 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon className="size-3.5 mt-0.5 shrink-0 text-zinc-400" />
              {text}
            </button>
          ))}
        </div>
      )}

      {!workspaceId && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700 mb-4">
          No workspace connected. Please log in and select a workspace to use AI Insights.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 min-h-0">
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
            <div className={cn(
              'size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              msg.role === 'assistant' ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-600'
            )}>
              {msg.role === 'assistant' ? <Sparkles className="size-3.5" /> : <User className="size-3.5" />}
            </div>

            <div className={cn(
              'max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'assistant'
                ? 'bg-white border border-border shadow-sm text-foreground'
                : 'bg-foreground text-background'
            )}>
              {msg.role === 'assistant' ? (
                <div className="text-sm leading-relaxed">
                  {msg.content
                    ? renderMarkdown(msg.content)
                    : (
                      <span className="flex gap-1 items-center h-4">
                        <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                        <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                        <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
                      </span>
                    )
                  }
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
              {msg.content && (
                <p className={cn('text-[10px] mt-1.5', msg.role === 'assistant' ? 'text-muted-foreground' : 'text-background/60')}>
                  {msg.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
          placeholder={workspaceId ? 'Ask about spend, creatives, competitors, opportunities…' : 'Sync your Snowflake data to start chatting…'}
          className="flex-1 h-10 px-4 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-ring shadow-sm disabled:opacity-50"
          disabled={isStreaming || !workspaceId}
        />
        {isStreaming ? (
          <Button
            size="sm"
            variant="outline"
            className="h-10 px-4 gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50"
            onClick={handleStop}
          >
            Stop
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-10 px-4 gap-1.5"
            onClick={() => send(input)}
            disabled={!input.trim() || !workspaceId}
          >
            <Send className="size-3.5" />
            Send
          </Button>
        )}
      </div>
    </div>
  )
}
