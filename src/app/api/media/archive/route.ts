import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * POST /api/media/archive
 *
 * Fetches original ad thumbnail images and uploads them to Bunny.net CDN.
 * Updates cdn_thumbnail_url on each archived ad.
 *
 * Body:
 *   workspaceId  — required
 *   adIds        — optional string[]; if omitted, archives all un-archived ads
 *                  that have thumbnail_url set (max 50 per call)
 *
 * Env vars needed:
 *   BUNNY_STORAGE_API_KEY    — Bunny.net storage zone API key
 *   BUNNY_STORAGE_ZONE_NAME  — e.g. "my-creatives"
 *   BUNNY_STORAGE_REGION     — empty for default (NY), "de", "uk", "sg", etc.
 *   BUNNY_CDN_HOSTNAME       — e.g. "my-creatives.b-cdn.net"
 */
export async function POST(req: NextRequest) {
  const { workspaceId, adIds } = await req.json() as {
    workspaceId: string
    adIds?: string[]
  }

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify caller is workspace member
  const { data: membership } = await admin
    .from('workspace_members').select('role')
    .eq('workspace_id', workspaceId).eq('user_id', user.id).single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Check Bunny config
  const BUNNY_KEY       = process.env.BUNNY_STORAGE_API_KEY
  const BUNNY_ZONE      = process.env.BUNNY_STORAGE_ZONE_NAME
  const BUNNY_REGION    = process.env.BUNNY_STORAGE_REGION ?? ''  // '' = default/NYC
  const BUNNY_CDN_HOST  = process.env.BUNNY_CDN_HOSTNAME

  if (!BUNNY_KEY || !BUNNY_ZONE || !BUNNY_CDN_HOST) {
    return NextResponse.json(
      { error: 'Bunny.net not configured. Set BUNNY_STORAGE_API_KEY, BUNNY_STORAGE_ZONE_NAME, BUNNY_CDN_HOSTNAME in environment.' },
      { status: 503 }
    )
  }

  const storageBase = BUNNY_REGION
    ? `https://${BUNNY_REGION}.storage.bunnycdn.com`
    : 'https://storage.bunnycdn.com'

  // Fetch ads to archive
  let adsQuery = admin
    .from('ads')
    .select('id, thumbnail_url')
    .eq('workspace_id', workspaceId)
    .not('thumbnail_url', 'is', null)
    .is('cdn_thumbnail_url', null)

  if (adIds?.length) {
    adsQuery = adsQuery.in('id', adIds)
  } else {
    adsQuery = adsQuery.limit(50)
  }

  const { data: ads, error: adsErr } = await adsQuery
  if (adsErr) return NextResponse.json({ error: adsErr.message }, { status: 500 })
  if (!ads?.length) return NextResponse.json({ archived: 0, failed: 0, message: 'No ads to archive' })

  let archived = 0
  let failed = 0
  const failedIds: string[] = []

  await Promise.all(
    ads.map(async (ad) => {
      if (!ad.thumbnail_url) return

      try {
        // Fetch the original image
        const imgRes = await fetch(ad.thumbnail_url, {
          headers: { 'User-Agent': 'ClueZero-Archiver/1.0' },
          signal: AbortSignal.timeout(15_000),
        })

        if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status} from source`)

        const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
        const ext = contentType.includes('png') ? 'png'
          : contentType.includes('webp') ? 'webp'
          : contentType.includes('gif') ? 'gif'
          : 'jpg'

        const buffer = await imgRes.arrayBuffer()
        const path = `${workspaceId}/${ad.id}.${ext}`

        // Upload to Bunny.net Storage
        const uploadRes = await fetch(`${storageBase}/${BUNNY_ZONE}/${path}`, {
          method: 'PUT',
          headers: {
            AccessKey: BUNNY_KEY,
            'Content-Type': contentType,
          },
          body: buffer,
        })

        if (!uploadRes.ok) {
          const msg = await uploadRes.text()
          throw new Error(`Bunny upload failed: ${msg}`)
        }

        const cdnUrl = `https://${BUNNY_CDN_HOST}/${path}`

        // Write CDN URL back to DB
        await admin
          .from('ads')
          .update({ cdn_thumbnail_url: cdnUrl })
          .eq('id', ad.id)

        archived++
      } catch (err) {
        console.error(`[archive] Failed for ad ${ad.id}:`, err)
        failed++
        failedIds.push(ad.id)
      }
    })
  )

  return NextResponse.json({ archived, failed, failedIds })
}
