import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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

async function getWorkspaceColors(workspaceId: string): Promise<Record<string, string>> {
  const { data: ws } = await admin()
    .from('workspaces')
    .select('brand_colors')
    .eq('id', workspaceId)
    .single()
  return (ws?.brand_colors as Record<string, string>) ?? {}
}

// ── GET /api/brands?workspaceId=xxx ─────────────────────────────────────────
// Returns distinct brands, each with merged color and source ('sync'|'manual').

export async function GET(req: NextRequest) {
  const workspaceId = new URL(req.url).searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ brands: [] })

  const user = await authedUser()
  if (!user) return NextResponse.json({ brands: [] }, { status: 401 })

  const m = await checkMembership(workspaceId, user.id)
  if (!m) return NextResponse.json({ brands: [] }, { status: 403 })

  const db = admin()

  const savedColors = await getWorkspaceColors(workspaceId)

  const { data: rows } = await db
    .from('tracked_brands')
    .select('id, name, platform, is_own_brand, source')
    .eq('workspace_id', workspaceId)
    .order('name')

  if (!rows || rows.length === 0) {
    return NextResponse.json({ brands: [], savedColors })
  }

  // Collapse multi-platform rows into one entry per brand name (exact match).
  // source = 'sync' if any row was sync-imported; else 'manual'.
  const map = new Map<string, {
    name: string; platforms: string[]; isOwn: boolean; source: 'sync' | 'manual'
  }>()

  for (const r of rows) {
    const existing = map.get(r.name)
    const platform = r.platform as string
    if (existing) {
      if (platform !== 'manual' && !existing.platforms.includes(platform)) {
        existing.platforms.push(platform)
      }
      if (r.source === 'sync') existing.source = 'sync'
    } else {
      map.set(r.name, {
        name:      r.name,
        platforms: platform !== 'manual' ? [platform] : [],
        isOwn:     r.is_own_brand,
        source:    (r.source as 'sync' | 'manual') ?? 'sync',
      })
    }
  }

  const brands = Array.from(map.values()).map(b => ({
    name:      b.name,
    isOwn:     b.isOwn,
    platforms: b.platforms,
    source:    b.source,
    color:     savedColors[b.name] ?? null,
  }))

  return NextResponse.json({ brands, savedColors })
}

// ── POST /api/brands ────────────────────────────────────────────────────────
// Manually create a tracked brand.  Body: { workspaceId, name, color? }

export async function POST(req: NextRequest) {
  const body = await req.json() as { workspaceId: string; name: string; color?: string }
  const { workspaceId, color } = body
  const name = body.name?.trim()

  if (!workspaceId || !name) {
    return NextResponse.json({ error: 'workspaceId and name required' }, { status: 400 })
  }

  const user = await authedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const m = await checkMembership(workspaceId, user.id)
  if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = admin()

  // Insert with platform='manual' and source='manual'.
  // Uses the unique constraint (workspace_id, name, platform) — so duplicate
  // manual entries are blocked but a sync-created row with the same name is
  // a separate row with a real platform value and won't conflict.
  const { data, error } = await db
    .from('tracked_brands')
    .insert({
      workspace_id: workspaceId,
      name,
      platform:    'manual',
      is_own_brand: false,
      source:      'manual',
    })
    .select('id, name, platform, is_own_brand, source')
    .single()

  if (error) {
    // Unique violation = brand name already exists on 'manual' platform
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A brand with that name already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If a color was provided, save it to workspaces.brand_colors
  if (color) {
    const savedColors = await getWorkspaceColors(workspaceId)
    await db.from('workspaces').update({
      brand_colors: { ...savedColors, [name]: color },
    }).eq('id', workspaceId)
  }

  return NextResponse.json({
    brand: {
      name,
      isOwn:     false,
      platforms: [],
      source:    'manual' as const,
      color:     color ?? null,
    }
  })
}

// ── PATCH /api/brands ───────────────────────────────────────────────────────
// Rename a brand.  Body: { workspaceId, oldName, newName }

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { workspaceId: string; oldName: string; newName: string }
  const { workspaceId } = body
  const oldName = body.oldName?.trim()
  const newName = body.newName?.trim()

  if (!workspaceId || !oldName || !newName) {
    return NextResponse.json({ error: 'workspaceId, oldName and newName required' }, { status: 400 })
  }
  if (oldName === newName) return NextResponse.json({ ok: true })

  const user = await authedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const m = await checkMembership(workspaceId, user.id)
  if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = admin()

  // Rename all rows with oldName
  const { error } = await db
    .from('tracked_brands')
    .update({ name: newName })
    .eq('workspace_id', workspaceId)
    .eq('name', oldName)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Move color key in brand_colors JSONB
  const savedColors = await getWorkspaceColors(workspaceId)
  if (savedColors[oldName] !== undefined) {
    const { [oldName]: color, ...rest } = savedColors
    await db.from('workspaces').update({ brand_colors: { ...rest, [newName]: color } }).eq('id', workspaceId)
  }

  return NextResponse.json({ ok: true })
}

// ── DELETE /api/brands?workspaceId=xxx&name=BrandName ───────────────────────
// Remove a tracked brand (all platform rows) and its saved color.

export async function DELETE(req: NextRequest) {
  const url         = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  const name        = url.searchParams.get('name')

  if (!workspaceId || !name) {
    return NextResponse.json({ error: 'workspaceId and name required' }, { status: 400 })
  }

  const user = await authedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const m = await checkMembership(workspaceId, user.id)
  if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = admin()

  // Delete all platform rows for this brand name
  await db
    .from('tracked_brands')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('name', name)

  // Remove from brand_colors JSONB
  const savedColors = await getWorkspaceColors(workspaceId)
  if (savedColors[name]) {
    const { [name]: _removed, ...rest } = savedColors
    await db.from('workspaces').update({ brand_colors: rest }).eq('id', workspaceId)
  }

  return NextResponse.json({ ok: true })
}
