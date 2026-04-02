'use client'

import { useState } from 'react'
import {
  Home,
  LayoutDashboard,
  Users,
  BarChart3,
  Sparkles,
  MessageSquare,
  ImageIcon,
  Bell,
  Plug,
  Settings2,
  RefreshCcw,
  Download,
  ChevronRight,
  Brain,
  LogOut,
  CircleUser,
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
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { ClueZeroMark } from '@/components/brand/logo'

import { HomeView }            from './views/home-view'
import { OverviewView }        from './views/overview-view'
import { CompetitiveView }     from './views/competitive-view'
import { PerformanceView }     from './views/performance-view'
import { OrlenView }           from './views/orlen-view'
import { AiInsightsView }      from './views/ai-insights-view'
import { CreativeLibraryView } from './views/creative-library-view'
import { AlertsView }          from './views/alerts-view'
import { ConnectionsView }     from './views/connections-view'
import { SetupView }           from './views/setup-view'
import { StrategyView }        from './views/strategy-view'
import { AccountView }         from './views/account-view'

type ViewId =
  | 'home'
  | 'overview' | 'competitive' | 'performance' | 'orlen'
  | 'ai' | 'creative-library' | 'strategy'
  | 'alerts'
  | 'connections' | 'setup' | 'account'

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
      { id: 'overview'          as ViewId, label: 'Market Overview',         icon: LayoutDashboard },
      { id: 'competitive'       as ViewId, label: 'Competitive Intelligence', icon: Users },
      { id: 'performance'       as ViewId, label: 'Campaign Performance',     icon: BarChart3 },
      { id: 'orlen'             as ViewId, label: 'ORLEN Deep Dive',          icon: Sparkles },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { id: 'ai'               as ViewId, label: 'AI Insights',              icon: MessageSquare },
      { id: 'creative-library' as ViewId, label: 'Creative Library',         icon: ImageIcon },
      { id: 'strategy'         as ViewId, label: 'Strategy Intelligence',    icon: Brain },
    ],
  },
  {
    label: 'Monitor',
    items: [
      { id: 'alerts'           as ViewId, label: 'Alerts',                   icon: Bell },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'connections'      as ViewId, label: 'Connections',              icon: Plug },
      { id: 'setup'            as ViewId, label: 'Setup',                    icon: Settings2 },
      { id: 'account'          as ViewId, label: 'Account',                  icon: CircleUser },
    ],
  },
]

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items)

const weeks = [
  { value: 'w14', label: '30.03 – 05.04.2026' },
  { value: 'w13', label: '23.03 – 29.03.2026' },
  { value: 'w12', label: '16.03 – 22.03.2026' },
]

// Views that don't need the week selector
const WORKSPACE_VIEWS: ViewId[] = ['home', 'connections', 'setup', 'alerts', 'account']

interface Props {
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
}

export function CompetitiveIntelDashboard({ workspaceId, workspaceName, workspaceSlug }: Props) {
  const [view, setView] = useState<ViewId>('home')
  const [week, setWeek] = useState('w14')
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const activeItem = ALL_ITEMS.find(n => n.id === view)!
  const showWeekSelector = !WORKSPACE_VIEWS.includes(view)

  return (
    <SidebarProvider>
      <Sidebar className="dark" collapsible="icon">
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
          {NAV_GROUPS.map((group, gi) => (
            <SidebarGroup key={group.label}>
              {gi > 1 && <SidebarSeparator className="mb-1" />}
              <SidebarGroupLabel className={cn(
                'text-sidebar-foreground/40 text-[10px] uppercase tracking-widest',
                gi === 0 && 'sr-only'
              )}>
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map(item => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={view === item.id}
                        onClick={() => setView(item.id)}
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
        </SidebarContent>

        <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
          <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
            <button onClick={() => setView('account')} className="shrink-0" title="Account settings">
              <Avatar className="size-7">
                <AvatarFallback className="bg-zinc-600 text-white text-[10px] font-semibold">
                  {workspaceName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <button
                onClick={() => setView('account')}
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
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-white/80 backdrop-blur-sm px-4 shrink-0">
          <SidebarTrigger className="size-8" />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>{NAV_GROUPS.find(g => g.items.some(i => i.id === view))?.label}</span>
            <ChevronRight className="size-3.5" />
            <span className="font-medium text-foreground">{activeItem.label}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {showWeekSelector && (
              <Select value={week} onValueChange={setWeek}>
                <SelectTrigger className="h-8 w-[180px] text-xs border-border bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weeks.map(w => (
                    <SelectItem key={w.value} value={w.value} className="text-xs">
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-border bg-white">
              <RefreshCcw className="size-3.5" />
              Refresh
            </Button>
            <Button size="sm" className="h-8 gap-1.5 text-xs">
              <Download className="size-3.5" />
              Export
            </Button>
          </div>
        </header>

        <main className="p-6">
          {view === 'home'             && <HomeView workspaceName={workspaceName} onNavigate={setView} />}
          {view === 'overview'         && <OverviewView />}
          {view === 'competitive'      && <CompetitiveView />}
          {view === 'performance'      && <PerformanceView />}
          {view === 'orlen'            && <OrlenView />}
          {view === 'ai'               && <AiInsightsView />}
          {view === 'creative-library' && <CreativeLibraryView />}
          {view === 'strategy'         && <StrategyView />}
          {view === 'alerts'           && <AlertsView />}
          {view === 'connections'      && <ConnectionsView />}
          {view === 'setup'            && <SetupView workspaceId={workspaceId} workspaceName={workspaceName} workspaceSlug={workspaceSlug} />}
          {view === 'account'          && <AccountView />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
