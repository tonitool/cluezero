'use client'

import { useState, useEffect, useCallback } from 'react'
import type { WidgetConfig } from './types'
import { BUILTIN_WIDGETS } from './types'

export function useWidgetConfigs(workspaceId: string | undefined, tab: string) {
  const [configs, setConfigs] = useState<WidgetConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    if (!workspaceId) return
    setLoading(true)
    fetch(`/api/widgets?workspaceId=${workspaceId}&tab=${tab}`)
      .then(r => r.json())
      .then(d => {
        if (d.widgets) setConfigs(d.widgets.map(normalise))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceId, tab])

  useEffect(() => { load() }, [load])

  // Toggle visibility of a built-in widget
  async function toggleVisible(widgetId: string, currentlyVisible: boolean) {
    if (!workspaceId) return
    setSaving(true)
    // Optimistic update
    setConfigs(prev => {
      const existing = prev.find(c => c.widgetId === widgetId)
      if (existing) {
        return prev.map(c => c.widgetId === widgetId ? { ...c, isVisible: !currentlyVisible } : c)
      }
      // Create a new entry if it doesn't exist yet
      return [...prev, makeBuiltinConfig(workspaceId, tab, widgetId, !currentlyVisible)]
    })

    const existing = configs.find(c => c.widgetId === widgetId)
    if (existing) {
      await fetch('/api/widgets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, updates: [{ id: existing.id, isVisible: !currentlyVisible }] }),
      })
    } else {
      await fetch('/api/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, tab, widgetId, type: 'builtin', isVisible: !currentlyVisible }),
      })
      load()
    }
    setSaving(false)
  }

  // Save all positions after reorder
  async function saveOrder(ordered: WidgetConfig[]) {
    if (!workspaceId) return
    setSaving(true)
    await fetch('/api/widgets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        updates: ordered.map((w, i) => ({ id: w.id, position: i })),
      }),
    })
    setSaving(false)
    load()
  }

  // Add a SQL widget
  async function addSqlWidget(params: {
    title: string
    sqlQuery: string
    chartType: string
    colSpan: 1 | 2
  }) {
    if (!workspaceId) return null
    setSaving(true)
    const res = await fetch('/api/widgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, tab, type: 'sql', ...params }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.widget) {
      setConfigs(prev => [...prev, normalise(data.widget)])
      return data.widget
    }
    return null
  }

  // Update an existing widget
  async function updateWidget(id: string, updates: Partial<{
    title: string; sqlQuery: string; chartType: string; colSpan: 1 | 2; isVisible: boolean
  }>) {
    if (!workspaceId) return
    setSaving(true)
    await fetch(`/api/widgets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, ...updates }),
    })
    setSaving(false)
    load()
  }

  // Delete a widget
  async function deleteWidget(id: string) {
    setSaving(true)
    setConfigs(prev => prev.filter(c => c.id !== id))
    await fetch(`/api/widgets/${id}`, { method: 'DELETE' })
    setSaving(false)
  }

  // Merge saved configs with the built-in defaults for this tab
  // Built-ins with no saved config get default visibility=true
  function getMergedConfigs(): WidgetConfig[] {
    if (!workspaceId) return []
    const builtins = BUILTIN_WIDGETS[tab] ?? []
    const savedById = new Map(configs.map(c => [c.widgetId, c]))
    const sqlWidgets = configs.filter(c => c.type === 'sql')

    const builtinResolved: WidgetConfig[] = builtins.map((b, i) => {
      const saved = savedById.get(b.id)
      if (saved) return saved
      return makeBuiltinConfig(workspaceId, tab, b.id, true, b.defaultColSpan, i)
    })

    return [...builtinResolved, ...sqlWidgets].sort((a, b) => a.position - b.position)
  }

  function isVisible(widgetId: string): boolean {
    const saved = configs.find(c => c.widgetId === widgetId)
    return saved ? saved.isVisible : true // default visible
  }

  return {
    configs: getMergedConfigs(),
    loading,
    saving,
    isVisible,
    toggleVisible,
    saveOrder,
    addSqlWidget,
    updateWidget,
    deleteWidget,
    reload: load,
  }
}

// ── helpers ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalise(raw: any): WidgetConfig {
  return {
    id:          raw.id,
    workspaceId: raw.workspace_id,
    tab:         raw.tab,
    widgetId:    raw.widget_id,
    type:        raw.type,
    title:       raw.title,
    sqlQuery:    raw.sql_query,
    chartType:   raw.chart_type,
    colSpan:     raw.col_span ?? 1,
    position:    raw.position ?? 999,
    isVisible:   raw.is_visible ?? true,
    createdAt:   raw.created_at,
    updatedAt:   raw.updated_at,
  }
}

function makeBuiltinConfig(
  workspaceId: string,
  tab: string,
  widgetId: string,
  isVisible: boolean,
  colSpan: 1 | 2 = 1,
  position = 999,
): WidgetConfig {
  return {
    id:          `local-${widgetId}`,
    workspaceId,
    tab,
    widgetId,
    type:        'builtin',
    title:       null,
    sqlQuery:    null,
    chartType:   null,
    colSpan,
    position,
    isVisible,
    createdAt:   '',
    updatedAt:   '',
  }
}
