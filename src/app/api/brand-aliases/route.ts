import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function authedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function checkMembership(workspaceId: string, userId: string) {
  const { data } = await admin()
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()
  return data
}

// GET /api/brand-aliases?workspaceId=xxx
// Returns all aliases + a list of all raw brand names with ad counts (for unmapped brands).
export async function GET(req: NextRequest) {
  const workspaceId = new URL(req.url).searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const user = await authedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const m = await checkMembership(workspaceId, user.id)
  if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = admin()

  // Get existing aliases
  const { data: aliases } = await db
    .from('brand_aliases')
    .select('id, raw_name, canonical_name, is_excluded, updated_at')
    .eq('workspace_id', workspaceId)
    .order('raw_name')

  // Get all distinct brand names from tracked_brands with ad count
  const { data: brands } = await db
    .from('tracked_brands')
    .select('name')
    .eq('workspace_id', workspaceId)

  const brandCounts: Record<string, number> = {}
  for (const b of brands ?? []) {
    brandCounts[b.name] = (brandCounts[b.name] ?? 0) + 1
  }

  // Get actual ad counts per brand name
  const { data: adRows } = await db
    .from('ads')
    .select('tracked_brands!inner( name )')
    .eq('workspace_id', workspaceId)
    .limit(50000)

  const adCounts: Record<string, number> = {}
  for (const row of adRows ?? []) {
    const name = ((row.tracked_brands as unknown) as { name: string })?.name
    if (name) adCounts[name] = (adCounts[name] ?? 0) + 1
  }

  // Build raw names list with counts
  const rawNames = Object.keys({ ...brandCounts, ...adCounts })
    .sort()
    .map(name => ({
      name,
      adCount: adCounts[name] ?? 0,
    }))

  // Auto-suggest: find potential duplicates using normalized comparison
  const suggestions = findMergeSuggestions(rawNames.map(r => r.name))

  return NextResponse.json({
    aliases: aliases ?? [],
    rawNames,
    suggestions,
  })
}

// POST /api/brand-aliases
// Create or update aliases.  Body: { workspaceId, aliases: [{ rawName, canonicalName, isExcluded }] }
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    workspaceId: string
    aliases: { rawName: string; canonicalName: string; isExcluded?: boolean }[]
  }
  const { workspaceId, aliases: newAliases } = body

  if (!workspaceId || !newAliases?.length) {
    return NextResponse.json({ error: 'workspaceId and aliases required' }, { status: 400 })
  }

  const user = await authedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const m = await checkMembership(workspaceId, user.id)
  if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = admin()

  const rows = newAliases.map(a => ({
    workspace_id: workspaceId,
    raw_name: a.rawName.trim(),
    canonical_name: a.canonicalName.trim(),
    is_excluded: a.isExcluded ?? false,
    updated_at: new Date().toISOString(),
  }))

  const { data, error } = await db
    .from('brand_aliases')
    .upsert(rows, { onConflict: 'workspace_id,raw_name' })
    .select('id, raw_name, canonical_name, is_excluded')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ aliases: data })
}

// DELETE /api/brand-aliases?workspaceId=xxx&id=yyy
export async function DELETE(req: NextRequest) {
  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  const id = url.searchParams.get('id')

  if (!workspaceId || !id) {
    return NextResponse.json({ error: 'workspaceId and id required' }, { status: 400 })
  }

  const user = await authedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const m = await checkMembership(workspaceId, user.id)
  if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await admin()
    .from('brand_aliases')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  return NextResponse.json({ ok: true })
}

// ── Fuzzy merge suggestions ─────────────────────────────────────────────────

function norm(s: string) {
  return s.toLowerCase().replace(/[\s\-_.,()&+]/g, '')
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

interface MergeSuggestion {
  names: string[]
  reason: string
}

function findMergeSuggestions(rawNames: string[]): MergeSuggestion[] {
  const suggestions: MergeSuggestion[] = []
  const used = new Set<string>()

  // Group 1: Exact normalized match (case/spacing differences)
  const normGroups = new Map<string, string[]>()
  for (const name of rawNames) {
    const n = norm(name)
    if (!normGroups.has(n)) normGroups.set(n, [])
    normGroups.get(n)!.push(name)
  }
  for (const [, group] of normGroups) {
    if (group.length > 1) {
      suggestions.push({ names: group, reason: 'Same name, different casing or spacing' })
      group.forEach(n => used.add(n))
    }
  }

  // Group 2: One name contains another (substring match)
  const remaining = rawNames.filter(n => !used.has(n))
  for (let i = 0; i < remaining.length; i++) {
    for (let j = i + 1; j < remaining.length; j++) {
      const a = norm(remaining[i]), b = norm(remaining[j])
      if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) {
        if (!used.has(remaining[i]) && !used.has(remaining[j])) {
          suggestions.push({ names: [remaining[i], remaining[j]], reason: 'One name contains the other' })
          used.add(remaining[i])
          used.add(remaining[j])
        }
      }
    }
  }

  // Group 3: Low Levenshtein distance (typos)
  const remaining2 = rawNames.filter(n => !used.has(n))
  for (let i = 0; i < remaining2.length; i++) {
    for (let j = i + 1; j < remaining2.length; j++) {
      const a = norm(remaining2[i]), b = norm(remaining2[j])
      const maxLen = Math.max(a.length, b.length)
      if (maxLen >= 4 && levenshtein(a, b) <= Math.max(1, Math.floor(maxLen * 0.2))) {
        if (!used.has(remaining2[i]) && !used.has(remaining2[j])) {
          suggestions.push({ names: [remaining2[i], remaining2[j]], reason: 'Similar spelling (possible typo)' })
          used.add(remaining2[i])
          used.add(remaining2[j])
        }
      }
    }
  }

  return suggestions
}
