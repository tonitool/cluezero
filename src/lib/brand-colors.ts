/**
 * Brand Colors — runtime cache
 *
 * Brand colors are configured in Setup → Tracked Brands and stored in
 * workspaces.brand_colors (JSONB).  This module provides:
 *
 *   loadBrandColors(workspaceId)  — fetch from API, warm the cache
 *   getBrandColor(name, index)    — resolve a color for a brand name
 *   setBrandColors(wid, map)      — update cache + notify listeners
 *   BRAND_COLORS_EVENT            — CustomEvent name for React re-renders
 *   RANDOM_PALETTE                — 20 distinct chart-safe colors for randomize
 */

export const BRAND_COLORS_EVENT = 'cz-brand-colors-change'

const storageKey = (wid: string) => `cz-brand-colors-${wid}`

// Fallback palette when no brands are configured yet
const FALLBACK: string[] = [
  '#E4002B','#0066B2','#EC6B1E','#5C5C5C','#003087','#FBCE07',
  '#94a3b8','#64748b','#475569','#334155',
]

/**
 * 20 visually distinct, chart-safe colors for the Randomize feature.
 * Chosen to be high-contrast against white and distinguishable from each other.
 */
export const RANDOM_PALETTE: string[] = [
  '#E4002B','#0066B2','#EC6B1E','#10B981','#8B5CF6',
  '#F59E0B','#0EA5E9','#14B8A6','#F97316','#6366F1',
  '#84CC16','#FBCE07','#EC4899','#003087','#06B6D4',
  '#7C3AED','#059669','#D97706','#BE185D','#5C5C5C',
]

// Normalized cache: keys are lowercased with spaces/hyphens/underscores removed.
// e.g. "ORLEN" → "orlen", "Circle K" → "circlek"
// This makes getBrandColor O(1) and immune to casing/spacing inconsistencies.
let _cache: Record<string, string> = {}      // normalized key → hex color
let _rawCache: Record<string, string> = {}   // original key → hex color (for ordered fallback)

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s\-_]/g, '')
}

function buildCache(colors: Record<string, string>) {
  _rawCache = colors
  _cache = {}
  for (const [k, v] of Object.entries(colors)) {
    _cache[norm(k)] = v
  }
}

/** Resolve a color for a brand name with index-based fallback */
export function getBrandColor(name: string, index: number): string {
  const target = norm(name)

  // O(1) direct lookup on normalized key
  if (_cache[target]) return _cache[target]

  // Partial match (e.g. "circleK" matches "circlek")
  for (const [k, v] of Object.entries(_cache)) {
    if (target.includes(k) || k.includes(target)) return v
  }

  // Fallback: ordered raw values, then hardcoded fallback
  const vals = Object.values(_rawCache)
  if (vals.length > 0) return vals[index % vals.length]
  return FALLBACK[index % FALLBACK.length]
}

/** Load brand colors from the profile API (and warm from localStorage first) */
export async function loadBrandColors(workspaceId: string): Promise<void> {
  // Instant warm from localStorage
  try {
    const raw = localStorage.getItem(storageKey(workspaceId))
    if (raw) {
      buildCache(JSON.parse(raw))
      _dispatch()
    }
  } catch { /* ignore */ }

  // Then fetch fresh
  try {
    const res  = await fetch(`/api/workspace/profile?workspaceId=${workspaceId}`)
    const data = await res.json()
    if (data.brandColors && typeof data.brandColors === 'object') {
      buildCache(data.brandColors as Record<string, string>)
      localStorage.setItem(storageKey(workspaceId), JSON.stringify(_rawCache))
      _dispatch()
    }
  } catch { /* ignore */ }
}

/** Update the local cache and notify all listeners */
export function setBrandColors(
  workspaceId: string,
  colors: Record<string, string>
): void {
  buildCache(colors)
  try { localStorage.setItem(storageKey(workspaceId), JSON.stringify(colors)) } catch { /* ignore */ }
  _dispatch()
}

function _dispatch() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BRAND_COLORS_EVENT))
  }
}
