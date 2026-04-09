'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Home,
  BarChart3,
  Workflow,
  LayoutGrid,
  Bell,
  Plug,
  Settings2,
  RefreshCcw,
  Download,
  ChevronRight,
  Loader2,
  Bot,
  LogOut,
  CircleUser,
  FileText,
  Table2,
  Users,
  LayoutDashboard,
  TrendingUp,
  Sparkles,
  ImageIcon,
  ChevronDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { ClueZeroMark } from '@/components/brand/logo'
import { loadBrandColors } from '@/lib/brand-colors'
import { PageLoader } from '@/components/ui/page-loader'

import { HomeView }             from './views/home-view'
import { AlertsView }           from './views/alerts-view'
import { ConnectionsView }      from './views/connections-view'
import { SetupView }            from './views/setup-view'
import { AccountView }          from './views/account-view'
import { AgentsHubView }        from './views/agents-hub-view'
import { IntelligenceHubView, type IntelTab, INTEL_TABS } from './views/intelligence-hub-view'
import { CanvasView }           from './canvas/canvas-view'
import { DashboardsView }       from './views/dashboards-view'
import { ClientIntelLayout }    from './client-intel-layout'
import { ClientsView }          from './views/clients-view'
import { PrintReportOverlay }   from './print-report-overlay'

type ViewId =
  | 'home'
  | 'intelligence'
  | 'canvas'
  | 'dashboards'
  | 'agents'
  | 'alerts'
  | 'connections' | 'setup' | 'account'
  | 'clients'

// Intelligence sub-nav mapped to INTEL_TABS icons/labels
const INTEL_SUB_ITEMS = INTEL_TABS

const NAV_GROUPS = [
  {
    label: 'Home',
    items: [
      { id: 'home' as ViewId, label: 'Dashboard', icon: Home },
    ],
  },
  {
    label: 'Reporting',
    items: [
      { id: 'canvas'     as ViewId, label: 'Canvas', icon: Workflow },
      { id: 'dashboards' as ViewId, label: 'Spaces', icon: LayoutGrid },
    ],
  },
  {
    label: 'Agents',
    items: [
      { id: 'agents' as ViewId, label: 'Agent Hub', icon: Bot },
    ],
  },
  {
    label: 'Monitor',
    items: [
      { id: 'alerts' as ViewId, label: 'Alerts', icon: Bell },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'connections' as ViewId, label: 'Connections', icon: Plug },
      { id: 'setup'       as ViewId, label: 'Setup',        icon: Settings2 },
      { id: 'account'     as ViewId, label: 'Account',      icon: CircleUser },
    ],
  },
]

const AGENCY_NAV_GROUP = {
  label: 'Agency',
  items: [
    { id: 'clients' as ViewId, label: 'Clients', icon: Users },
  ],
}

const ALL_ITEMS = [
  { id: 'home' as ViewId, label: 'Dashboard', icon: Home },
  { id: 'intelligence' as ViewId, label: 'Intelligence', icon: BarChart3 },
  { id: 'canvas' as ViewId, label: 'Canvas', icon: Workflow },
  { id: 'dashboards' as ViewId, label: 'Spaces', icon: LayoutGrid },
  { id: 'agents' as ViewId, label: 'Agent Hub', icon: Bot },
  { id: 'alerts' as ViewId, label: 'Alerts', icon: Bell },
  { id: 'connections' as ViewId, label: 'Connections', icon: Plug },
  { id: 'setup' as ViewId, label: 'Setup', icon: Settings2 },
  { id: 'account' as ViewId, label: 'Account', icon: CircleUser },
  { id: 'clients' as ViewId, label: 'Clients', icon: Users },
]

function generateWeeks(n = 4): { value: string; label: string }[] {
  const result = []
  const now = new Date()
  const day = now.getUTCDay()
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now)
  monday.setUTCDate(diff)
  for (let i = 0; i < n; i++) {
    const mon = new Date(monday)
    mon.setUTCDate(monday.getUTCDate() - i * 7)
    const sun = new Date(mon)
    sun.setUTCDate(mon.getUTCDate() + 6)
    const fmt = (d: Date) => `${String(d.getUTCDate()).padStart(2,'0')}.${String(d.getUTCMonth()+1).padStart(2,'0')}`
    result.push({ value: `w${i}`, label: `${fmt(mon)} – ${fmt(sun)}.${sun.getUTCFullYear()}` })
  }
  return result
}

const weeks = generateWeeks(4)
const WORKSPACE_VIEWS: ViewId[] = ['connections', 'setup', 'alerts', 'account', 'clients']

type WorkspaceMemberRole = 'owner' | 'admin' | 'viewer' | 'client'
type WorkspaceType = 'standalone' | 'agency' | 'client'

interface Props {
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
  ownBrand?: string
  userRole?: WorkspaceMemberRole
  workspaceType?: WorkspaceType
}

interface SnowflakeSource { id: string; name: string }

export function CompetitiveIntelDashboard({
  workspaceId, workspaceName, workspaceSlug, ownBrand = '', userRole, workspaceType,
}: Props) {
  // Client users → stripped-down layout
  if (userRole === 'client') {
    return (
      <ClientIntelLayout
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        ownBrand={ownBrand}
      />
    )
  }

  const [view,          setView]          = useState<ViewId>('home')
  const [intelTab,      setIntelTab]      = useState<IntelTab>('overview')
  const [intelOpen,     setIntelOpen]     = useState(true)   // sidebar expand state
  const [pendingView,   setPendingView]   = useState<ViewId | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const [week,          setWeek]          = useState('w0')
  const [sources,       setSources]       = useState<SnowflakeSource[]>([])
  const [connectionId,  setConnectionId]  = useState<string>('all')
  const [refreshKey,    setRefreshKey]    = useState(0)
  const [showExport,    setShowExport]    = useState(false)
  const [showPrintReport, setShowPrintReport] = useState(false)
  const [syncingGlobal, setSyncingGlobal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!workspaceId) return
    loadBrandColors(workspaceId)
  }, [workspaceId])

  const checkSyncStatus = useCallback(() => {
    if (!workspaceId) return
    fetch(`/api/snowflake/status?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.connections) && d.connections.length > 0) {
          setSources(d.connections.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
          setSyncingGlobal(d.connections.some((c: { syncStatus: string }) => c.syncStatus === 'syncing'))
        } else {
          setSyncingGlobal(false)
        }
      })
      .catch(() => {})
  }, [workspaceId])

  useEffect(() => { checkSyncStatus() }, [checkSyncStatus])

  useEffect(() => {
    if (!syncingGlobal) return
    const interval = setInterval(checkSyncStatus, 3000)
    return () => clearInterval(interval)
  }, [syncingGlobal, checkSyncStatus])

  function navigateTo(next: ViewId) {
    if (next === view && !transitioning) return
    setPendingView(next)
    setTransitioning(true)
    setTimeout(() => {
      setView(next)
      setPendingView(null)
      setTimeout(() => setTransitioning(false), 220)
    }, 480)
  }

  function navigateToIntel(tab: IntelTab) {
    setIntelTab(tab)
    setIntelOpen(true)
    navigateTo('intelligence')
  }

  function getExportApiUrl() {
    const src = connectionId !== 'all' ? `&connectionId=${connectionId}` : ''
    return `/api/data/overview?workspaceId=${workspaceId}${src}`
  }

  async function handleExportCSV() {
    setShowExport(false)
    try {
      const res  = await fetch(getExportApiUrl())
      const data = await res.json()
      const rows: Record<string, unknown>[] = data.table ?? data.brands?.map((b: string) => ({ brand: b })) ?? []
      if (rows.length === 0) return
      const headers = Object.keys(rows[0])
      const csv = [
        headers.join(','),
        ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
      ].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `cluezero-export-${view}-${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
  }

  function handleExportPDF() {
    setShowExport(false)
    setShowPrintReport(true)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const activeItem = ALL_ITEMS.find(n => n.id === view) ?? ALL_ITEMS[0]
  const showWeekSelector = !WORKSPACE_VIEWS.includes(view)

  // Breadcrumb label for intelligence sub-tabs
  const intelSubLabel = view === 'intelligence'
    ? INTEL_SUB_ITEMS.find(t => t.id === intelTab)?.label ?? 'Intelligence'
    : null

  return (
    <SidebarProvider>
      <Sidebar className="dark print:hidden" collapsible="icon">
        <SidebarHeader className="p-0">
          <div className="flex items-center gap-3 px-4 py-4">
            <ClueZeroMark size={30} color="white" className="shrink-0" />
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold text-sidebar-foreground truncate">{workspaceName}</span>
              <span className="text-[11px] text-sidebar-foreground/50">ClueZero</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent>
          {/* Home group */}
          <SidebarGroup>
            <SidebarGroupLabel className="sr-only">Home</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={view === 'home'}
                    onClick={() => navigateTo('home')}
                    tooltip="Dashboard"
                    className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground"
                  >
                    <Home className="size-4" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Reporting group — Intelligence is expandable */}
          <SidebarGroup>
            <SidebarSeparator className="mb-1" />
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
              Reporting
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>

                {/* Intelligence — expandable */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={view === 'intelligence'}
                    onClick={() => {
                      setIntelOpen(v => !v)
                      if (view !== 'intelligence') navigateTo('intelligence')
                    }}
                    tooltip="Intelligence"
                    className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground"
                  >
                    <BarChart3 className="size-4" />
                    <span>Intelligence</span>
                    <ChevronDown
                      className={cn(
                        'ml-auto size-3.5 transition-transform duration-200 group-data-[collapsible=icon]:hidden',
                        intelOpen && 'rotate-180'
                      )}
                    />
                  </SidebarMenuButton>

                  {/* Sub-items */}
                  {intelOpen && (
                    <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                      {INTEL_SUB_ITEMS.map(sub => (
                        <SidebarMenuSubItem key={sub.id}>
                          <SidebarMenuSubButton
                            isActive={view === 'intelligence' && intelTab === sub.id}
                            onClick={() => navigateToIntel(sub.id)}
                            className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground"
                          >
                            <sub.icon className="size-3.5" />
                            <span>{sub.id === 'brand' && ownBrand ? ownBrand : sub.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>

                {/* Canvas + Spaces */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={view === 'canvas'}
                    onClick={() => navigateTo('canvas')}
                    tooltip="Canvas"
                    className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground"
                  >
                    <Workflow className="size-4" />
                    <span>Canvas</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={view === 'dashboards'}
                    onClick={() => navigateTo('dashboards')}
                    tooltip="Spaces"
                    className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground"
                  >
                    <LayoutGrid className="size-4" />
                    <span>Spaces</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Remaining groups */}
          {NAV_GROUPS.slice(2).map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarSeparator className="mb-1" />
              <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map(item => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={view === item.id || pendingView === item.id}
                        onClick={() => navigateTo(item.id)}
                        tooltip={item.label}
                        className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground"
                      >
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}

          {/* Agency group */}
          {(userRole === 'owner' || userRole === 'admin' || !userRole) && (
            <SidebarGroup>
              <SidebarSeparator className="mb-1" />
              <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
                {AGENCY_NAV_GROUP.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {AGENCY_NAV_GROUP.items.map(item => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={view === item.id || pendingView === item.id}
                        onClick={() => navigateTo(item.id)}
                        tooltip={item.label}
                        className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground"
                      >
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
          <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
            <button onClick={() => navigateTo('account')} className="shrink-0" title="Account settings">
              <Avatar className="size-7">
                <AvatarFallback className="bg-zinc-600 text-white text-[10px] font-semibold">
                  {workspaceName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <button
                onClick={() => navigateTo('account')}
                className="text-xs font-medium text-sidebar-foreground truncate text-left hover:underline"
              >
                {workspaceName}
              </button>
              <span className="text-[10px] text-sidebar-foreground/50">Admin</span>
            </div>
            <button
              onClick={handleSignOut}
              className="group-data-[collapsible=icon]:hidden shrink-0 p-1 rounded text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title="Sign out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-zinc-50 dark:bg-background">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-white/80 backdrop-blur-sm px-4 shrink-0 print:hidden">
          <SidebarTrigger className="size-8" />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {view === 'intelligence' ? (
              <>
                <span>Reporting</span>
                <ChevronRight className="size-3.5" />
                <span>Intelligence</span>
                <ChevronRight className="size-3.5" />
                <span className="font-medium text-foreground">{intelSubLabel}</span>
              </>
            ) : (
              <>
                <span>{NAV_GROUPS.find(g => g.items.some(i => i.id === view))?.label ?? 'Agency'}</span>
                <ChevronRight className="size-3.5" />
                <span className="font-medium text-foreground">{activeItem.label}</span>
              </>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {showWeekSelector && sources.length > 0 && (
              <Select value={connectionId} onValueChange={setConnectionId}>
                <SelectTrigger className="h-8 w-[160px] text-xs border-border bg-white">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All sources</SelectItem>
                  {sources.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {showWeekSelector && (
              <Select value={week} onValueChange={setWeek}>
                <SelectTrigger className="h-8 w-[180px] text-xs border-border bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weeks.map(w => (
                    <SelectItem key={w.value} value={w.value} className="text-xs">{w.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {syncingGlobal && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2.5 h-8">
                <Loader2 className="size-3.5 animate-spin" />
                Syncing…
              </div>
            )}
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-border bg-white"
              onClick={() => setRefreshKey(k => k + 1)}>
              <RefreshCcw className="size-3.5" />
              Refresh
            </Button>
            <div className="relative">
              <Button size="sm" className="h-8 gap-1.5 text-xs"
                onClick={() => setShowExport(v => !v)}>
                <Download className="size-3.5" />
                Export
              </Button>
              {showExport && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExport(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-40 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden z-50">
                    <button onClick={handleExportCSV}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11.5px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors border-b border-zinc-50">
                      <Table2 className="size-3.5 text-zinc-400" />
                      Export as CSV
                    </button>
                    <button onClick={handleExportPDF}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11.5px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
                      <FileText className="size-3.5 text-zinc-400" />
                      Export as PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="p-6 relative">
          <PageLoader visible={transitioning} />
          <div key={`${view}-${view === 'intelligence' ? intelTab : ''}-${refreshKey}`}>
            {view === 'home'         && <HomeView workspaceName={workspaceName} workspaceId={workspaceId} ownBrand={ownBrand} onNavigate={() => navigateTo('intelligence')} connectionId={connectionId === 'all' ? undefined : connectionId} />}
            {view === 'intelligence' && (
              <IntelligenceHubView
                workspaceId={workspaceId}
                ownBrand={ownBrand}
                connectionId={connectionId === 'all' ? undefined : connectionId}
                activeTab={intelTab}
                hideTabs={true}
                canEdit={true}
              />
            )}
            {view === 'canvas'       && <CanvasView workspaceId={workspaceId} connectionId={connectionId === 'all' ? undefined : connectionId} />}
            {view === 'dashboards'   && <DashboardsView workspaceId={workspaceId} connectionId={connectionId === 'all' ? undefined : connectionId} onNavigate={(v) => navigateTo(v as ViewId)} />}
            {view === 'agents'       && <AgentsHubView workspaceId={workspaceId} ownBrand={ownBrand} connectionId={connectionId === 'all' ? undefined : connectionId} />}
            {view === 'alerts'       && <AlertsView workspaceId={workspaceId} />}
            {view === 'connections'  && <ConnectionsView workspaceId={workspaceId} />}
            {view === 'setup'        && <SetupView workspaceId={workspaceId} workspaceName={workspaceName} workspaceSlug={workspaceSlug} ownBrand={ownBrand} />}
            {view === 'account'      && <AccountView workspaceId={workspaceId} />}
            {view === 'clients'      && <ClientsView workspaceId={workspaceId} />}
          </div>
        </main>
      </SidebarInset>

      {showPrintReport && (
        <PrintReportOverlay
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          ownBrand={ownBrand}
          connectionId={connectionId !== 'all' ? connectionId : undefined}
          onClose={() => setShowPrintReport(false)}
        />
      )}
    </SidebarProvider>
  )
}
