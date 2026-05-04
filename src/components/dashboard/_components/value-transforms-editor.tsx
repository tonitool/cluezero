'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Check, Loader2, AlertCircle, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TransformRule {
  id: string
  field: string
  rule_type: string
  config: Record<string, unknown>
  priority: number
  is_active: boolean
}

const FIELDS = [
  { value: 'funnel_stage', label: 'Funnel Stage' },
  { value: 'topic', label: 'Topic' },
  { value: 'platform', label: 'Platform' },
  { value: 'spend', label: 'Spend' },
  { value: 'impressions', label: 'Impressions' },
  { value: 'reach', label: 'Reach' },
  { value: 'performance_index', label: 'Performance Index' },
  { value: 'headline', label: 'Headline' },
] as const

const RULE_TYPES = [
  { value: 'mapping', label: 'Value Mapping', description: 'Remap raw values to display names' },
  { value: 'format', label: 'Number Format', description: 'Add prefix, suffix, decimals' },
  { value: 'scale', label: 'Scale Factor', description: 'Multiply by a factor' },
  { value: 'field_label', label: 'Field Label', description: 'Rename a column heading' },
] as const

const RULE_TYPE_COLORS: Record<string, string> = {
  mapping: 'bg-blue-50 text-blue-700 border-blue-200',
  format: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  scale: 'bg-amber-50 text-amber-700 border-amber-200',
  field_label: 'bg-violet-50 text-violet-700 border-violet-200',
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  workspaceId: string
}

export function ValueTransformsEditor({ workspaceId }: Props) {
  const [rules, setRules] = useState<TransformRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [field, setField] = useState('funnel_stage')
  const [ruleType, setRuleType] = useState('mapping')
  const [configStr, setConfigStr] = useState('')

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch(`/api/data/transforms?workspaceId=${workspaceId}`)
      if (!res.ok) throw new Error('Failed to load transform rules')
      const data = await res.json()
      setRules(data.rules ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { fetchRules() }, [fetchRules])

  function resetForm() {
    setField('funnel_stage')
    setRuleType('mapping')
    setConfigStr('')
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(rule: TransformRule) {
    setField(rule.field)
    setRuleType(rule.rule_type)
    setConfigStr(JSON.stringify(rule.config, null, 2))
    setEditingId(rule.id)
    setShowForm(true)
  }

  function getDefaultConfig(type: string): string {
    switch (type) {
      case 'mapping':
        return JSON.stringify({ TOFU: 'Top of Funnel', MOFU: 'Middle of Funnel', BOFU: 'Bottom of Funnel' }, null, 2)
      case 'format':
        return JSON.stringify({ prefix: '€', suffix: '', decimals: 0, compact: false }, null, 2)
      case 'scale':
        return JSON.stringify({ factor: 1 }, null, 2)
      case 'field_label':
        return JSON.stringify({ label: 'Custom Name' }, null, 2)
      default:
        return '{}'
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const config = JSON.parse(configStr)
      const res = await fetch('/api/data/transforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          ...(editingId ? { id: editingId } : {}),
          field,
          ruleType,
          config,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to save')
      }
      resetForm()
      await fetchRules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch('/api/data/transforms', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, workspaceId }),
      })
      if (!res.ok) throw new Error('Failed to delete')
      await fetchRules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Loading transform rules…</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Value Transform Rules</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customize how Snowflake data is displayed — remap values, format numbers, rename fields.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => {
            resetForm()
            setConfigStr(getDefaultConfig('mapping'))
            setShowForm(true)
          }}
        >
          <Plus className="size-3.5" />
          Add Rule
        </Button>
      </div>

      {/* Rule Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Target Field</Label>
                  <Select value={field} onValueChange={setField}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELDS.map(f => (
                        <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Rule Type</Label>
                  <Select value={ruleType} onValueChange={(v) => {
                    setRuleType(v)
                    if (!editingId) setConfigStr(getDefaultConfig(v))
                  }}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RULE_TYPES.map(r => (
                        <SelectItem key={r.value} value={r.value} className="text-xs">
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Configuration (JSON)</Label>
                <textarea
                  value={configStr}
                  onChange={e => setConfigStr(e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900/10 resize-y"
                  placeholder='{ "key": "value" }'
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {RULE_TYPES.find(r => r.value === ruleType)?.description}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" className="gap-1.5 text-xs" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                  {editingId ? 'Update Rule' : 'Save Rule'}
                </Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={resetForm}>Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules List */}
      {rules.length === 0 && !showForm ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          No transform rules yet. Add one to start customizing how your data is displayed.
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {rules.map(rule => {
              const fieldLabel = FIELDS.find(f => f.value === rule.field)?.label ?? rule.field
              const typeLabel = RULE_TYPES.find(r => r.value === rule.rule_type)?.label ?? rule.rule_type
              const typeColor = RULE_TYPE_COLORS[rule.rule_type] ?? 'bg-zinc-50 text-zinc-600 border-zinc-200'

              return (
                <motion.div
                  key={rule.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 bg-white border border-zinc-200 rounded-lg px-3 py-2.5 hover:border-zinc-300 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{fieldLabel}</span>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', typeColor)}>
                        {typeLabel}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate font-mono">
                      {JSON.stringify(rule.config).slice(0, 80)}
                      {JSON.stringify(rule.config).length > 80 ? '…' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(rule)}
                      className="p-1.5 rounded hover:bg-zinc-100 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 rounded hover:bg-rose-50 transition-colors text-muted-foreground hover:text-rose-600"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
