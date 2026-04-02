import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export default async function DashboardRedirect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    // Env var missing — render a clear error rather than looping
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="text-white font-semibold text-lg mb-2">Configuration error</p>
          <p className="text-zinc-400 text-sm">
            <code className="text-zinc-300">SUPABASE_SERVICE_ROLE_KEY</code> is not set.
            Add it in your Vercel environment variables and redeploy.
          </p>
        </div>
      </div>
    )
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const { data: membership } = await admin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (membership?.workspace_id) {
    const { data: workspace } = await admin
      .from('workspaces')
      .select('slug')
      .eq('id', membership.workspace_id)
      .single()

    if (workspace?.slug) redirect(`/dashboard/${workspace.slug}`)
  }

  // Authenticated but no workspace — show create prompt (no redirect to avoid loops)
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <p className="text-white font-semibold text-lg mb-2">No workspace yet</p>
        <p className="text-zinc-400 text-sm mb-6">
          Your account doesn&apos;t have a workspace. Create one to get started.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-white text-zinc-950 text-sm font-medium hover:bg-zinc-100 transition-colors"
        >
          Create workspace
        </Link>
      </div>
    </div>
  )
}
