'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, User, TrendingUp, BarChart3, Lightbulb, AlertTriangle } from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/_components/section-header'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTED_PROMPTS = [
  { icon: TrendingUp,    text: 'Why did ORLEN\'s market share drop last week?' },
  { icon: BarChart3,     text: 'Which competitor increased spend the most this week?' },
  { icon: Lightbulb,     text: 'What creative formats are working best for Aral?' },
  { icon: AlertTriangle, text: 'Are there any whitespace opportunities ORLEN is missing?' },
]

const MOCK_RESPONSES: Record<string, string> = {
  default: `Based on the data for **w/e 05 Apr 2026**, here are the key signals:

**Market context:** Total estimated market spend is €36,410 this week, up 5.3% week-over-week. ORLEN holds 13.7% share (+1.1 pts).

**Notable movement:** Shell increased spend by ~28% this week, driven by a burst of 8 new Google ads in the Do-stage — likely a promotional push. Aral remained stable with a heavy Meta-first strategy (72% of activity).

**ORLEN position:** ORLEN launched 6 new ads this week (+20% vs prior week), all concentrated in Think and Care stages. The Performance Index of 67 is above the market average of 58, suggesting good creative quality.

**Recommendation:** Consider increasing Do-stage activity on Google to counter Shell's conversion push. There is a clear whitespace in LinkedIn B2B targeting — only ENI and ORLEN are active there, with low competition.`,

  share: `**ORLEN share analysis (w/e 05 Apr 2026):**

ORLEN's share actually *increased* to 13.7% (+1.1 pts) this week. If you're seeing a drop in a prior week, the likely driver was Shell's surge in w/e 23 Mar — they ran a large brand campaign across all platforms simultaneously, temporarily compressing everyone else's share.

The structural issue: ORLEN's spend is concentrated in **Meta** (68% of activity). When competitors activate Google at scale, ORLEN's cross-platform share looks lower even if absolute Meta performance is stable.

**Suggested action:** Diversify platform allocation. A 10-pt shift to Google would meaningfully improve overall share stability.`,

  competitor: `**Biggest spend increase this week:**

1. 🥇 **Shell** +28% — 8 new Google ads, Do-stage, likely a fuel price promotion
2. 🥈 **Aral** +11% — steady growth, Meta-heavy, lifestyle-focused creatives
3. 🥉 **Circle K** +6% — small uptick in Meta Reels format

The Shell surge is the most significant. Their new ads scored an average PI of 71, which is high for Do-stage content. Watch for whether this sustains into next week — if it does, it may signal a larger campaign flight.`,

  creative: `**Aral creative performance breakdown:**

Aral is running **14 active creatives** across Meta and Google this week. Format breakdown:
- 60% short-form video (Reels/YouTube) → avg PI: 74
- 30% static display → avg PI: 61
- 10% carousel → avg PI: 58

**What's working:** Lifestyle-oriented narratives ("Family offers", "Summer road trip") with warm color palettes are consistently outperforming price-led messages. The PI on emotional-angle creatives is 18pts higher than rational-angle ones.

**Insight for ORLEN:** Consider testing a lifestyle-first variant on Meta. Current ORLEN creatives lean heavily transactional, which may be capping the PI ceiling.`,

  whitespace: `**Whitespace opportunities for ORLEN:**

Three clear gaps in the current competitive landscape:

**1. LinkedIn B2B (high priority)**
Only ENI has active LinkedIn campaigns beyond basic awareness. Fleet management, corporate fuel card, and SME efficiency messaging is almost entirely unclaimed. Estimated reach: 180K business decision-makers.

**2. Do-stage on Google (medium priority)**
Shell just moved into this space, but ORLEN's Do-stage Google presence is minimal. Bottom-of-funnel search terms (station locator, fuel price comparison) show low competition.

**3. Care-stage retention content (medium priority)**
Only 8% of all competitor ads target existing customers. ORLEN's loyalty programme is a differentiator that isn't being fully activated in paid media.`,
}

function getResponse(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('share') || lower.includes('drop')) return MOCK_RESPONSES.share
  if (lower.includes('competitor') || lower.includes('spend') || lower.includes('increased')) return MOCK_RESPONSES.competitor
  if (lower.includes('creative') || lower.includes('aral') || lower.includes('format')) return MOCK_RESPONSES.creative
  if (lower.includes('whitespace') || lower.includes('missing') || lower.includes('opportunit')) return MOCK_RESPONSES.whitespace
  return MOCK_RESPONSES.default
}

function formatMarkdown(text: string) {
  // Very simple bold + line break rendering
  return text
    .split('\n')
    .map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/)
      return (
        <span key={i}>
          {parts.map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j}>{part.slice(2, -2)}</strong>
              : part
          )}
          <br />
        </span>
      )
    })
}

export function AiInsightsView() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hi! I'm your competitive intelligence assistant. I have full context of this week's ad data (w/e 05 Apr 2026) — spend estimates, new creatives, platform mix, and performance scores across ORLEN and 5 competitors.\n\nAsk me anything, or pick a suggested question below.`,
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  function send(text: string) {
    if (!text.trim() || isTyping) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim(), timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)
    setTimeout(() => {
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getResponse(text),
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, reply])
      setIsTyping(false)
    }, 1200)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <SectionHeader
        title="AI Insights"
        description="Chat with your competitive intelligence data"
      />

      {/* Suggested prompts — only shown when just the welcome message */}
      {messages.length === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {SUGGESTED_PROMPTS.map(({ icon: Icon, text }) => (
            <button
              key={text}
              onClick={() => send(text)}
              className="flex items-start gap-2.5 text-left bg-white border border-border rounded-lg px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:border-zinc-400 transition-colors shadow-sm"
            >
              <Icon className="size-3.5 mt-0.5 shrink-0 text-zinc-400" />
              {text}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 min-h-0">
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
            {/* Avatar */}
            <div className={cn(
              'size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              msg.role === 'assistant' ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-600'
            )}>
              {msg.role === 'assistant' ? <Sparkles className="size-3.5" /> : <User className="size-3.5" />}
            </div>

            {/* Bubble */}
            <div className={cn(
              'max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'assistant'
                ? 'bg-white border border-border shadow-sm text-foreground'
                : 'bg-foreground text-background'
            )}>
              {msg.role === 'assistant'
                ? <div className="text-sm leading-relaxed">{formatMarkdown(msg.content)}</div>
                : <p>{msg.content}</p>
              }
              <p className={cn('text-[10px] mt-1.5', msg.role === 'assistant' ? 'text-muted-foreground' : 'text-background/60')}>
                {msg.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="size-7 rounded-full bg-zinc-900 text-white flex items-center justify-center shrink-0">
              <Sparkles className="size-3.5" />
            </div>
            <div className="bg-white border border-border shadow-sm rounded-xl px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
          placeholder="Ask about spend, creatives, competitors, opportunities…"
          className="flex-1 h-10 px-4 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
          disabled={isTyping}
        />
        <Button
          size="sm"
          className="h-10 px-4 gap-1.5"
          onClick={() => send(input)}
          disabled={!input.trim() || isTyping}
        >
          <Send className="size-3.5" />
          Send
        </Button>
      </div>
    </div>
  )
}
