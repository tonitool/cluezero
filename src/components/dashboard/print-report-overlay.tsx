'use client'

import { useState } from 'react'
import { X, Printer, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OverviewView }        from './views/overview-view'
import { MovementView }        from './views/movement-view'
import { CompetitiveView }     from './views/competitive-view'
import { PerformanceView }     from './views/performance-view'
import { OrlenView }           from './views/orlen-view'
import { CreativeLibraryView } from './views/creative-library-view'

interface Props {
  workspaceId: string
  workspaceName: string
  ownBrand?: string
  connectionId?: string
  onClose: () => void
}

const SECTIONS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'movement',    label: 'Weekly Movement' },
  { id: 'competitive', label: 'Competitive' },
  { id: 'performance', label: 'Performance' },
  { id: 'brand',       label: 'Brand Deep Dive' },
  { id: 'creative',    label: 'Creative Library' },
]

export function PrintReportOverlay({
  workspaceId, workspaceName, ownBrand = '', connectionId, onClose,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(SECTIONS.map(s => s.id))
  )

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(
      selected.size === SECTIONS.length
        ? new Set()
        : new Set(SECTIONS.map(s => s.id))
    )
  }

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const activeSections = SECTIONS.filter(s => selected.has(s.id))

  return (
    <>
      {/* ── Print styles ── */}
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }

          html, body { height: auto !important; overflow: visible !important; }

          /* Hide everything, then restore the overlay subtree */
          body * { visibility: hidden !important; }
          #print-overlay,
          #print-overlay * { visibility: visible !important; }

          /* Overlay becomes a static document block */
          #print-overlay {
            position: absolute !important;
            top: 0 !important; left: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            z-index: auto !important;
            display: block !important;
          }

          /* Kill the sidebar entirely */
          #print-sidebar,
          #print-sidebar * { display: none !important; visibility: hidden !important; }

          /* Content wrapper: full width, no sidebar gap */
          #print-content {
            margin-left: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }

          /* Each section (except the first) starts on a fresh page.
             No break-after → no trailing blank page. */
          .print-break-before {
            break-before: page;
            page-break-before: always;
          }

          /* Never split a section header from its first chart */
          .print-section-header {
            break-after: avoid;
            page-break-after: avoid;
          }
        }
      `}</style>

      <div
        id="print-overlay"
        className="fixed inset-0 z-[200] bg-zinc-100 flex overflow-hidden"
      >
        {/* ═══════════════════════════════ SIDEBAR ═══════════════════════════════ */}
        <aside
          id="print-sidebar"
          className="w-64 shrink-0 bg-white border-r border-border flex flex-col h-full shadow-sm"
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 mb-0.5">
                <FileText className="size-4 text-zinc-500" />
                <span className="text-sm font-semibold text-foreground">Export PDF</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-colors -mt-0.5"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Choose sections, then print or save as PDF.
            </p>
          </div>

          {/* Section list */}
          <div className="flex-1 overflow-y-auto py-3 px-3">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Sections
              </span>
              <button
                onClick={toggleAll}
                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                {selected.size === SECTIONS.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <div className="space-y-0.5">
              {SECTIONS.map((section, i) => {
                const checked = selected.has(section.id)
                return (
                  <label
                    key={section.id}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors
                      ${checked ? 'bg-zinc-50' : 'hover:bg-zinc-50/60'}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(section.id)}
                      className="size-3.5 rounded accent-zinc-900 shrink-0"
                    />
                    <span className="text-[10px] font-mono text-zinc-400 w-5 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-sm transition-colors ${checked ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {section.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
              <span>{selected.size} of {SECTIONS.length} sections</span>
              <span>A4 · 15 mm margins</span>
            </div>
            <Button
              className="w-full h-9 gap-2"
              disabled={selected.size === 0}
              onClick={() => window.print()}
            >
              <Printer className="size-3.5" />
              Print / Save as PDF
            </Button>
          </div>
        </aside>

        {/* ═══════════════════════════════ PREVIEW ═══════════════════════════════ */}
        <div id="print-content" className="flex-1 overflow-y-auto bg-zinc-100">
          <div className="max-w-[860px] mx-auto px-8 py-10">

            {activeSections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center gap-3">
                <FileText className="size-10 text-zinc-300" />
                <p className="text-sm font-medium text-muted-foreground">No sections selected</p>
                <p className="text-xs text-muted-foreground">Tick at least one section in the left panel.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">

                {/* ── Cover / report header ── */}
                <div className="px-10 pt-10 pb-8 border-b border-zinc-100">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 mb-2">
                    Intelligence Report
                  </p>
                  <h1 className="text-3xl font-bold text-foreground tracking-tight">{workspaceName}</h1>
                  <p className="text-sm text-muted-foreground mt-1.5">Generated {today}</p>
                  <div className="flex items-center gap-2 mt-4">
                    {activeSections.map(s => (
                      <span
                        key={s.id}
                        className="text-[10px] font-medium bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full"
                      >
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* ── Sections ── */}
                {activeSections.map((section, idx) => (
                  <div
                    key={section.id}
                    className={`px-10 py-8 ${idx < activeSections.length - 1 ? 'border-b border-zinc-100' : ''} ${idx > 0 ? 'print-break-before' : ''}`}
                  >
                    {/* Section label */}
                    <div className="print-section-header flex items-center gap-3 mb-6">
                      <span className="text-[10px] font-mono text-zinc-400">
                        {String(idx + 1).padStart(2, '0')}/{activeSections.length}
                      </span>
                      <h2 className="text-base font-bold text-foreground">
                        {section.id === 'brand' ? (ownBrand || section.label) : section.label}
                      </h2>
                      <div className="flex-1 h-px bg-zinc-100" />
                    </div>

                    {/* Section content */}
                    {section.id === 'overview'    && <OverviewView workspaceId={workspaceId} connectionId={connectionId} />}
                    {section.id === 'movement'    && <MovementView workspaceId={workspaceId} connectionId={connectionId} />}
                    {section.id === 'competitive' && <CompetitiveView workspaceId={workspaceId} connectionId={connectionId} />}
                    {section.id === 'performance' && <PerformanceView workspaceId={workspaceId} connectionId={connectionId} />}
                    {section.id === 'brand'       && <OrlenView workspaceId={workspaceId} ownBrand={ownBrand} connectionId={connectionId} />}
                    {section.id === 'creative'    && <CreativeLibraryView workspaceId={workspaceId} connectionId={connectionId} onNavigate={() => {}} />}
                  </div>
                ))}

              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
