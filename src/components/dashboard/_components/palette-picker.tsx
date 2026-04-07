'use client'

import { useEffect, useRef, useState } from 'react'
import { Palette, Check } from 'lucide-react'
import {
  PALETTE_PRESETS, PALETTE_EVENT,
  getActivePaletteId, setActivePalette,
} from '@/lib/chart-palette'
import { cn } from '@/lib/utils'

export function PalettePicker() {
  const [open,      setOpen]      = useState(false)
  const [activeId,  setActiveId]  = useState(getActivePaletteId)
  const ref = useRef<HTMLDivElement>(null)

  // Sync when another tab/component changes the palette
  useEffect(() => {
    const handler = (e: Event) => setActiveId((e as CustomEvent<string>).detail)
    window.addEventListener(PALETTE_EVENT, handler)
    return () => window.removeEventListener(PALETTE_EVENT, handler)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function pick(id: string) {
    setActiveId(id)
    setActivePalette(id)
    setOpen(false)
  }

  const active = PALETTE_PRESETS.find(p => p.id === activeId) ?? PALETTE_PRESETS[0]

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Chart color palette"
        className={cn(
          'h-8 px-2.5 flex items-center gap-2 rounded-lg border text-xs font-medium transition-colors',
          open
            ? 'bg-zinc-900 text-white border-zinc-900'
            : 'bg-white border-border text-zinc-600 hover:border-zinc-300 hover:text-zinc-900'
        )}
      >
        <Palette className="size-3.5 shrink-0" />
        {/* Swatch preview */}
        <div className="flex gap-0.5">
          {active.colors.slice(0, 5).map((c, i) => (
            <span key={i} className="size-2.5 rounded-full border border-white/40 shrink-0"
              style={{ background: c }} />
          ))}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-border rounded-2xl shadow-xl overflow-hidden w-56">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chart Colors</p>
          </div>
          <div className="p-1.5 space-y-0.5">
            {PALETTE_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => pick(preset.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left',
                  activeId === preset.id ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-50 text-zinc-700'
                )}
              >
                {/* Color swatch row */}
                <div className="flex gap-0.5 shrink-0">
                  {preset.colors.slice(0, 6).map((c, i) => (
                    <span key={i} className="size-3 rounded-full border border-white/30 shrink-0"
                      style={{ background: c }} />
                  ))}
                </div>
                <span className={cn('text-[11px] font-semibold flex-1 truncate',
                  activeId === preset.id ? 'text-white' : 'text-zinc-700')}
                >
                  {preset.name}
                </span>
                {activeId === preset.id && (
                  <Check className="size-3 text-white shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
