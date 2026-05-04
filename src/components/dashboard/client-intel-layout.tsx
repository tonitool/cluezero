'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  LogOut, RefreshCcw, FileText, CircleUser, BarChart3,
  LayoutDashboard, TrendingUp, Users, Sparkles, ImageIcon,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
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
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ClueZeroMark } from '@/components/brand/logo'
import { loadBrandColors } from '@/lib/brand-colors'
import { IntelligenceHubView, type IntelTab, INTEL_TABS } from './views/intelligence-hub-view'
import { AccountView } from './views/account-view'
import { PrintReportOverlay } from './print-report-overlay'
import { cn } from '@/lib/utils'

type ClientView = 'intelligence' | 'account'

interface Props {
  workspaceId: string
  workspaceName: string
  ownBrand?: string
}

export function ClientIntelLayout({ workspaceId, workspaceName, ownBrand = '' }: Props) {
  const [view,            setView]            = useState<ClientView>('intelligence')
  const [intelTab,        setIntelTab]        = useState<IntelTab>('overview')
  const [intelOpen,       setIntelOpen]       = useState(true)
  const [refreshKey,      setRefreshKey]      = useState(0)
  const [showPrintReport, setShowPrintReport] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!workspaceId) return
    loadBrandColors(workspaceId)
  }, [workspaceId])

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }, [supabase, router])

  function navigateToIntel(tab: IntelTab) {
    setIntelTab(tab)
    setIntelOpen(true)
    setView('intelligence')
  }

  const intelSubLabel = INTEL_TABS.find(t => t.id === intelTab)?.label ?? 'Overview'

  return (
    <SidebarProvider>
      <Sidebar className="dark print:hidden" collapsible="icon">
        <SidebarHeader className="p-0">
          <div className="flex items-center gap-3 px-4 py-4">
            <ClueZeroMark size={30} color="white" className="shrink-0" />
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold text-sidebar-foreground truncate">{workspaceName}</span>
              <span className="text-[11px] text-sidebar-foreground/50">Intelligence</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent>
          {/* Intelligence — expandable */}
          <SidebarGroup>
            <SidebarGroupLabel className="sr-only">Intelligence</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={view === 'intelligence'}
                    onClick={() => {
                      setIntelOpen(v => !v)
                      setView('intelligence')
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

                  {intelOpen && (
                    <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                      {INTEL_TABS.map(sub => (
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Account */}
          <SidebarGroup>
            <SidebarSeparator className="mb-1" />
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
              Settings
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={view === 'account'}
                    onClick={() => setView('account')}
                    tooltip="Account"
                    className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground"
                  >
                    <CircleUser className="size-4" />
                    <span>Account</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
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
              <span className="text-[10px] text-sidebar-foreground/50">Client</span>
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

      <SidebarInset className="bg-zinc-50">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-white/80 backdrop-blur-sm px-4 shrink-0 print:hidden">
          <SidebarTrigger className="size-8" />
          <Separator orientation="vertical" className="h-4" />

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {view === 'intelligence' ? (
              <>
                <span>Intelligence</span>
                <ChevronRight className="size-3.5" />
                <span className="font-medium text-foreground">{intelSubLabel}</span>
              </>
            ) : (
              <span className="font-medium text-foreground">Account</span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {view === 'intelligence' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-border bg-white"
                  onClick={() => setRefreshKey(k => k + 1)}
                >
                  <RefreshCcw className="size-3.5" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setShowPrintReport(true)}
                >
                  <FileText className="size-3.5" />
                  Export PDF
                </Button>
              </>
            )}
          </div>
        </header>

        <main className="p-6">
          <div key={`${view}-${intelTab}-${refreshKey}`}>
            {view === 'intelligence' && (
              <IntelligenceHubView
                workspaceId={workspaceId}
                ownBrand={ownBrand}
                activeTab={intelTab}
                hideTabs={true}
                canEdit={false}
              />
            )}
            {view === 'account' && (
              <AccountView workspaceId={workspaceId} hideReset />
            )}
          </div>
        </main>

        {showPrintReport && (
          <PrintReportOverlay
            workspaceId={workspaceId}
            workspaceName={workspaceName}
            ownBrand={ownBrand}
            onClose={() => setShowPrintReport(false)}
          />
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
