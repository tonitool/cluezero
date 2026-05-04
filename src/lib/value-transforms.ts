/**
 * Value Transform Engine
 *
 * Loads transform rules from Supabase and applies them to display values.
 * Rules are cached per workspace and refreshed on demand.
 *
 * Rule types:
 *   mapping      → { "TOFU": "Top of Funnel", "MOFU": "Middle of Funnel" }
 *   format       → { prefix: "€", suffix: "", decimals: 0, compact: true }
 *   scale        → { factor: 0.01 }  (e.g. cents → euros)
 *   threshold    → { ranges: [{ min: 0, max: 50, color: "#dc2626", label: "Low" }, ...] }
 *   field_label  → { label: "Performance Score" }
 */

import { createClient as createAdminClient } from '@supabase/supabase-js'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MappingConfig {
  [rawValue: string]: string
}

interface FormatConfig {
  prefix?: string
  suffix?: string
  decimals?: number
  compact?: boolean // e.g. 12500 → 12.5K
}

interface ScaleConfig {
  factor: number
}

interface ThresholdRange {
  min?: number
  max?: number
  color: string
  label?: string
}

interface ThresholdConfig {
  ranges: ThresholdRange[]
}

interface FieldLabelConfig {
  label: string
}

type RuleConfig = MappingConfig | FormatConfig | ScaleConfig | ThresholdConfig | FieldLabelConfig

interface TransformRule {
  id: string
  field: string
  ruleType: 'mapping' | 'format' | 'scale' | 'threshold' | 'field_label'
  config: RuleConfig
  priority: number
  isActive: boolean
}

export interface TransformEngine {
  /** Apply all active rules to a raw field value. Returns transformed display string. */
  apply(field: string, rawValue: string | number | null): string

  /** Get the colour for a numeric value given threshold rules on `field`. */
  color(field: string, value: number): string | null

  /** Get the display label for a field heading. */
  fieldLabel(field: string): string | null

  /** All loaded rules (for the UI editor) */
  rules: TransformRule[]
}

// ─── Loader ──────────────────────────────────────────────────────────────────

export async function loadTransformRules(workspaceId: string): Promise<TransformEngine> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: rows } = await admin
    .from('value_transform_rules')
    .select('id, field, rule_type, config, priority, is_active')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('priority', { ascending: true })

  const rules: TransformRule[] = (rows ?? []).map(r => ({
    id: r.id,
    field: r.field,
    ruleType: r.rule_type,
    config: r.config as RuleConfig,
    priority: r.priority,
    isActive: r.is_active,
  }))

  // Group rules by field
  const byField = new Map<string, TransformRule[]>()
  for (const rule of rules) {
    const existing = byField.get(rule.field) ?? []
    byField.set(rule.field, [...existing, rule])
  }

  function apply(field: string, rawValue: string | number | null): string {
    if (rawValue === null || rawValue === undefined) return '—'
    const fieldRules = byField.get(field) ?? []
    let val: string | number = rawValue

    for (const rule of fieldRules) {
      switch (rule.ruleType) {
        case 'mapping': {
          const mapping = rule.config as MappingConfig
          const strVal = String(val)
          if (mapping[strVal] !== undefined) {
            val = mapping[strVal]
          }
          break
        }
        case 'scale': {
          const { factor } = rule.config as ScaleConfig
          const num = typeof val === 'number' ? val : parseFloat(String(val))
          if (!isNaN(num)) {
            val = num * factor
          }
          break
        }
        case 'format': {
          const cfg = rule.config as FormatConfig
          const num = typeof val === 'number' ? val : parseFloat(String(val))
          if (!isNaN(num)) {
            let formatted: string
            if (cfg.compact) {
              formatted = compactNumber(num, cfg.decimals ?? 1)
            } else {
              formatted = num.toLocaleString('en-US', {
                minimumFractionDigits: cfg.decimals ?? 0,
                maximumFractionDigits: cfg.decimals ?? 0,
              })
            }
            val = `${cfg.prefix ?? ''}${formatted}${cfg.suffix ?? ''}`
          }
          break
        }
        default:
          break
      }
    }

    return String(val)
  }

  function color(field: string, value: number): string | null {
    const fieldRules = byField.get(field) ?? []
    for (const rule of fieldRules) {
      if (rule.ruleType !== 'threshold') continue
      const { ranges } = rule.config as ThresholdConfig
      for (const range of ranges) {
        const aboveMin = range.min === undefined || value >= range.min
        const belowMax = range.max === undefined || value <= range.max
        if (aboveMin && belowMax) return range.color
      }
    }
    return null
  }

  function fieldLabel(field: string): string | null {
    const fieldRules = byField.get(field) ?? []
    for (const rule of fieldRules) {
      if (rule.ruleType === 'field_label') {
        return (rule.config as FieldLabelConfig).label
      }
    }
    return null
  }

  return { apply, color, fieldLabel, rules }
}

// ─── Compact number formatting ───────────────────────────────────────────────

function compactNumber(num: number, decimals: number): string {
  const abs = Math.abs(num)
  const sign = num < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(decimals)}M`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(decimals)}K`
  return `${sign}${abs.toFixed(decimals)}`
}
