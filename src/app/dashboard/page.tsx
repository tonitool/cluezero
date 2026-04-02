import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export default async function DashboardRedirect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: membership } = await admin
    .from('workspace_members')
    .select('workspaces(slug)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const slug = (membership?.workspaces as { slug: string } | null)?.slug

  if (slug) redirect(`/dashboard/${slug}`)

  // No workspace yet
  redirect('/signup')
}
