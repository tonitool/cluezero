import { createClient as createAdminClient } from '@supabase/supabase-js'

export interface BrandAlias {
  raw_name: string
  canonical_name: string
  is_excluded: boolean
}

export type AliasMap = {
  resolve: (rawName: string) => string | null
  isExcluded: (rawName: string) => boolean
}

export async function loadAliasMap(workspaceId: string): Promise<AliasMap> {
  const db = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: aliases } = await db
    .from('brand_aliases')
    .select('raw_name, canonical_name, is_excluded')
    .eq('workspace_id', workspaceId)

  const map = new Map<string, BrandAlias>()
  for (const a of aliases ?? []) {
    map.set(a.raw_name, a)
  }

  return {
    resolve(rawName: string): string | null {
      const alias = map.get(rawName)
      if (!alias) return rawName
      if (alias.is_excluded) return null
      return alias.canonical_name
    },
    isExcluded(rawName: string): boolean {
      return map.get(rawName)?.is_excluded ?? false
    },
  }
}
