export interface PalettePreset {
  id:     string
  name:   string
  colors: string[]
}

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id:     'vibrant',
    name:   'Vibrant',
    colors: ['#6366f1','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316','#06b6d4','#a3e635'],
  },
  {
    id:     'mono',
    name:   'ClueZero',
    colors: ['#18181b','#52525b','#a1a1aa','#71717a','#3f3f46','#27272a','#d4d4d8','#e4e4e7','#09090b','#fafafa'],
  },
  {
    id:     'ocean',
    name:   'Ocean',
    colors: ['#0ea5e9','#06b6d4','#3b82f6','#0284c7','#38bdf8','#2dd4bf','#0369a1','#818cf8','#7dd3fc','#bae6fd'],
  },
  {
    id:     'warm',
    name:   'Warm',
    colors: ['#ef4444','#f97316','#f59e0b','#eab308','#dc2626','#fb923c','#b45309','#fbbf24','#fca5a5','#fed7aa'],
  },
  {
    id:     'forest',
    name:   'Forest',
    colors: ['#10b981','#059669','#22c55e','#84cc16','#047857','#15803d','#65a30d','#4ade80','#a3e635','#6ee7b7'],
  },
  {
    id:     'rose',
    name:   'Rose',
    colors: ['#f43f5e','#e11d48','#fb7185','#be123c','#9f1239','#fda4af','#881337','#fecdd3','#ff4d6d','#ffe4e6'],
  },
]

export const DEFAULT_PALETTE_ID  = 'vibrant'
export const PALETTE_STORAGE_KEY = 'cz-chart-palette'
export const PALETTE_EVENT       = 'cz-palette-change'

export function getActivePaletteId(): string {
  if (typeof window === 'undefined') return DEFAULT_PALETTE_ID
  return localStorage.getItem(PALETTE_STORAGE_KEY) ?? DEFAULT_PALETTE_ID
}

export function getActivePalette(): string[] {
  const id = getActivePaletteId()
  return (PALETTE_PRESETS.find(p => p.id === id) ?? PALETTE_PRESETS[0]).colors
}

export function setActivePalette(id: string) {
  localStorage.setItem(PALETTE_STORAGE_KEY, id)
  window.dispatchEvent(new CustomEvent(PALETTE_EVENT, { detail: id }))
}
