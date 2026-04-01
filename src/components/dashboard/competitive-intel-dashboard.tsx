'use client'

import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts"
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Funnel,
  Image,
  Layers,
  RefreshCcw,
  Sparkles,
  TableProperties,
  Target,
  TrendingUp,
  Users,
} from "lucide-react"

import {
  audienceGenderDistribution,
  audienceMaxAgeDistribution,
  audienceMinAgeDistribution,
  competitorStrategyProfiles,
  creativeScorecards,
  executiveMetrics,
  funnelByAdvertiser,
  funnelDistribution,
  marketActivityVsPresence,
  newAdsByAdvertiserPlatform,
  newAdsByFunnel,
  newAdsByTopic,
  newAdsTrend,
  newVsExistingByAdvertiser,
  orlenVsMarketScorecards,
  performanceIndexRanking,
  performanceTrend,
  platformDistributionByAdvertiser,
  platformStrategyComparison,
  spendShareTrend,
  targetingLocationTop10,
  topCreatives,
  topOpportunities,
  topicByAdvertiser,
  topicDistribution,
  weeklyMovementMetrics,
  weeklyMovementTable,
  weeklySpendMovement,
} from "@/components/dashboard/mock-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const colors = {
  orlen: "var(--color-chart-1)",
  aral: "var(--color-chart-2)",
  circleK: "var(--color-chart-3)",
  eni: "var(--color-chart-4)",
  esso: "var(--color-chart-5)",
  shell: "hsl(145 45% 58%)",
  meta: "var(--color-chart-1)",
  google: "var(--color-chart-2)",
  linkedin: "var(--color-chart-3)",
} as const

const navItems = [
  { id: "executive", label: "Executive Summary", icon: Layers },
  { id: "movement", label: "Weekly Movement", icon: TrendingUp },
  { id: "advertiser", label: "Advertiser Benchmark", icon: Users },
  { id: "topic", label: "Topic Benchmark", icon: Target },
  { id: "funnel", label: "Funnel Benchmark", icon: Funnel },
  { id: "audience", label: "Audience Benchmark", icon: Activity },
  { id: "orlen", label: "ORLEN vs Market", icon: Sparkles },
  { id: "creative", label: "Creative Benchmark", icon: Image },
] as const

type ViewId = (typeof navItems)[number]["id"]

const spendConfig = {
  orlen: { label: "ORLEN", color: colors.orlen },
  aral: { label: "Aral", color: colors.aral },
  circleK: { label: "Circle K", color: colors.circleK },
  eni: { label: "ENI", color: colors.eni },
  esso: { label: "Esso", color: colors.esso },
  shell: { label: "Shell", color: colors.shell },
} satisfies ChartConfig

const simpleConfig = {
  value: { label: "Value", color: colors.orlen },
} satisfies ChartConfig

const platformConfig = {
  meta: { label: "Meta", color: colors.meta },
  google: { label: "Google", color: colors.google },
  linkedin: { label: "LinkedIn", color: colors.linkedin },
} satisfies ChartConfig

function Delta({ direction, value }: { direction: "up" | "down"; value: string }) {
  return (
    <span className="text-muted-foreground flex items-center gap-1 text-xs">
      {direction === "up" ? (
        <ArrowUpRight className="size-3.5 text-emerald-600" />
      ) : (
        <ArrowDownRight className="size-3.5 text-rose-500" />
      )}
      {value}
    </span>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground text-sm">{subtitle}</p>
    </div>
  )
}

interface Props {
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
}

export function CompetitiveIntelDashboard({ workspaceName }: Props) {
  const [view, setView] = useState<ViewId>("executive")

  const activeNav = useMemo(() => navItems.find((item) => item.id === view), [view])

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="px-3 pt-4">
          <div className="rounded-lg border bg-sidebar-primary/10 p-3">
            <p className="text-sm font-semibold">{workspaceName}</p>
            <p className="text-sidebar-foreground/70 text-xs">Competitive reporting</p>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Reporting views</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={view === item.id}
                      onClick={() => setView(item.id)}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <main className="bg-muted/20 min-h-screen p-4 md:p-6">
          <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4">
            <header className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger className="md:hidden" />
                    <Badge variant="secondary" className="gap-1">
                      <TableProperties className="size-3.5" />
                      Weekly intelligence reporting
                    </Badge>
                  </div>
                  <h1 className="text-xl font-semibold md:text-2xl">Competitive Intelligence Dashboard</h1>
                  <p className="text-muted-foreground text-sm">
                    {activeNav?.label} view with user-friendly reporting widgets and benchmark context.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select defaultValue="w14">
                    <SelectTrigger className="w-[220px] bg-background">
                      <Calendar className="mr-2 size-4" />
                      <SelectValue placeholder="Select week" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="w14">30.03.2026 - 05.04.2026</SelectItem>
                      <SelectItem value="w13">23.03.2026 - 29.03.2026</SelectItem>
                      <SelectItem value="w12">16.03.2026 - 22.03.2026</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="gap-2">
                    <RefreshCcw className="size-4" />
                    Refresh data
                  </Button>
                  <Button>Export report</Button>
                </div>
              </div>
            </header>

            {view === "executive" && (
              <section>
                <SectionTitle
                  title="Executive Summary"
                  subtitle="KPI toplines, weekly spend movement, and ORLEN share trend in one quick read."
                />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {executiveMetrics.map((metric) => (
                    <Card key={metric.label}>
                      <CardHeader className="pb-2">
                        <CardDescription>{metric.label}</CardDescription>
                        <CardTitle className="text-2xl">{metric.value}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Delta direction={metric.direction} value={metric.delta} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly est. spend movement (last 30 days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={spendConfig} className="h-[320px] w-full">
                        <BarChart data={weeklySpendMovement}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="week" tickLine={false} axisLine={false} />
                          <YAxis tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="orlen" stackId="a" fill="var(--color-orlen)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="aral" stackId="a" fill="var(--color-aral)" />
                          <Bar dataKey="circleK" stackId="a" fill="var(--color-circleK)" />
                          <Bar dataKey="eni" stackId="a" fill="var(--color-eni)" />
                          <Bar dataKey="esso" stackId="a" fill="var(--color-esso)" />
                          <Bar dataKey="shell" stackId="a" fill="var(--color-shell)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>% ORLEN share of weekly est. spend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={spendConfig} className="h-[320px] w-full">
                        <LineChart data={spendShareTrend}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="week" tickLine={false} axisLine={false} />
                          <YAxis tickLine={false} axisLine={false} unit="%" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line dataKey="orlen" stroke="var(--color-orlen)" strokeWidth={2.8} dot={false} />
                          <Line dataKey="aral" stroke="var(--color-aral)" strokeWidth={1.8} dot={false} />
                          <Line dataKey="circleK" stroke="var(--color-circleK)" strokeWidth={1.8} dot={false} />
                          <Line dataKey="eni" stroke="var(--color-eni)" strokeWidth={1.8} dot={false} />
                          <Line dataKey="esso" stroke="var(--color-esso)" strokeWidth={1.8} dot={false} />
                          <Line dataKey="shell" stroke="var(--color-shell)" strokeWidth={1.8} dot={false} />
                        </LineChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
              </section>
            )}

            {view === "movement" && (
              <section>
                <SectionTitle
                  title="Weekly Movement"
                  subtitle="Track movement drivers, ad launches, and advertiser-platform performance."
                />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {weeklyMovementMetrics.map((metric) => (
                    <Card key={metric.label}>
                      <CardHeader className="pb-2">
                        <CardDescription>{metric.label}</CardDescription>
                        <CardTitle>{metric.value}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-1 text-xs">{metric.subtitle}</p>
                        <Delta direction={metric.direction} value={metric.delta} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly est. spend — new vs existing ads per advertiser</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={simpleConfig} className="h-[320px] w-full">
                        <BarChart data={newVsExistingByAdvertiser} layout="vertical">
                          <CartesianGrid horizontal={false} />
                          <XAxis type="number" tickLine={false} axisLine={false} unit="%" />
                          <YAxis dataKey="advertiser" type="category" tickLine={false} axisLine={false} width={90} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="existingAdsPct" stackId="a" fill="var(--color-chart-2)" />
                          <Bar dataKey="newAdsPct" stackId="a" fill="var(--color-chart-1)" />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>New ads per advertiser (last 30 days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={spendConfig} className="h-[320px] w-full">
                        <LineChart data={newAdsTrend}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="week" tickLine={false} axisLine={false} />
                          <YAxis tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line dataKey="orlen" stroke="var(--color-orlen)" strokeWidth={2.6} dot={false} />
                          <Line dataKey="aral" stroke="var(--color-aral)" strokeWidth={1.8} dot={false} />
                          <Line dataKey="eni" stroke="var(--color-eni)" strokeWidth={1.8} dot={false} />
                          <Line dataKey="esso" stroke="var(--color-esso)" strokeWidth={1.8} dot={false} />
                          <Line dataKey="shell" stroke="var(--color-shell)" strokeWidth={1.8} dot={false} />
                        </LineChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Avg. performance index ORLEN vs market (last 30 days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={simpleConfig} className="h-[300px] w-full">
                        <LineChart data={performanceTrend}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="week" tickLine={false} axisLine={false} />
                          <YAxis tickLine={false} axisLine={false} domain={[45, 65]} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line dataKey="market" stroke="var(--color-chart-3)" strokeWidth={1.8} dot={false} />
                          <Line dataKey="orlen" stroke="var(--color-chart-1)" strokeWidth={2.6} dot={false} />
                        </LineChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly movement per advertiser and platform</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[300px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Advertiser</TableHead>
                            <TableHead>Platform</TableHead>
                            <TableHead className="text-right">Total Ads</TableHead>
                            <TableHead className="text-right">New Ads</TableHead>
                            <TableHead className="text-right">Reach</TableHead>
                            <TableHead className="text-right">Spend</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {weeklyMovementTable.map((row) => (
                            <TableRow key={row.advertiser}>
                              <TableCell className="font-medium">{row.advertiser}</TableCell>
                              <TableCell>{row.platform}</TableCell>
                              <TableCell className="text-right">{row.totalAds}</TableCell>
                              <TableCell className="text-right">{row.newAds}</TableCell>
                              <TableCell className="text-right">{row.weeklyReach.toLocaleString()}</TableCell>
                              <TableCell className="text-right">€{row.weeklySpend.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </section>
            )}

            {view === "advertiser" && (
              <section>
                <SectionTitle
                  title="Advertiser Benchmark"
                  subtitle="Compare volume, platform strategy, deployment pace, and performance ranking."
                />
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Platform distribution in # total ads by advertiser (alltime)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={platformConfig} className="h-[320px] w-full">
                        <BarChart data={platformDistributionByAdvertiser} layout="vertical">
                          <CartesianGrid horizontal={false} />
                          <XAxis type="number" tickLine={false} axisLine={false} unit="%" />
                          <YAxis dataKey="advertiser" type="category" tickLine={false} axisLine={false} width={90} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="meta" stackId="a" fill="var(--color-meta)" />
                          <Bar dataKey="google" stackId="a" fill="var(--color-google)" />
                          <Bar dataKey="linkedin" stackId="a" fill="var(--color-linkedin)" />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Platform strategy: total est. spend distribution market vs ORLEN</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={platformConfig} className="h-[320px] w-full">
                        <BarChart data={platformStrategyComparison} layout="vertical">
                          <CartesianGrid horizontal={false} />
                          <XAxis type="number" tickLine={false} axisLine={false} unit="%" />
                          <YAxis dataKey="segment" type="category" tickLine={false} axisLine={false} width={120} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="meta" stackId="a" fill="var(--color-meta)" />
                          <Bar dataKey="google" stackId="a" fill="var(--color-google)" />
                          <Bar dataKey="linkedin" stackId="a" fill="var(--color-linkedin)" />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>New ads per week by advertiser and platform</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={simpleConfig} className="h-[300px] w-full">
                        <LineChart data={newAdsByAdvertiserPlatform}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="week" tickLine={false} axisLine={false} />
                          <YAxis tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line dataKey="orlenMeta" stroke="var(--color-chart-1)" strokeWidth={2.4} dot={false} />
                          <Line dataKey="orlenGoogle" stroke="var(--color-chart-3)" strokeWidth={2.1} dot={false} />
                          <Line dataKey="aralMeta" stroke="var(--color-chart-2)" strokeWidth={1.8} dot={false} />
                          <Line dataKey="aralGoogle" stroke="var(--color-chart-4)" strokeWidth={1.8} dot={false} />
                        </LineChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Performance index ranking per advertiser</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={simpleConfig} className="h-[300px] w-full">
                        <BarChart data={performanceIndexRanking}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="advertiser" tickLine={false} axisLine={false} />
                          <YAxis tickLine={false} axisLine={false} domain={[0, 80]} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                            {performanceIndexRanking.map((row) => (
                              <Cell
                                key={row.advertiser}
                                fill={row.advertiser === "ORLEN" ? "var(--color-chart-1)" : "var(--color-chart-2)"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
              </section>
            )}

            {view === "topic" && (
              <section>
                <SectionTitle
                  title="Topic Benchmark"
                  subtitle="Understand market topic focus, advertiser ownership, and recent topic momentum."
                />
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Topic distribution in # total ads (alltime)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={simpleConfig} className="h-[300px] w-full">
                        <BarChart data={topicDistribution} layout="vertical">
                          <CartesianGrid horizontal={false} />
                          <XAxis type="number" tickLine={false} axisLine={false} />
                          <YAxis dataKey="topic" type="category" tickLine={false} axisLine={false} width={110} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="totalAds" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Topic distribution in # total ads by advertiser</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={simpleConfig} className="h-[300px] w-full">
                        <BarChart data={topicByAdvertiser} layout="vertical">
                          <CartesianGrid horizontal={false} />
                          <XAxis type="number" tickLine={false} axisLine={false} unit="%" />
                          <YAxis dataKey="advertiser" type="category" tickLine={false} axisLine={false} width={90} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="shop" stackId="a" fill="var(--color-chart-1)" />
                          <Bar dataKey="existing" stackId="a" fill="var(--color-chart-2)" />
                          <Bar dataKey="laden" stackId="a" fill="var(--color-chart-3)" />
                          <Bar dataKey="stellenanzeigen" stackId="a" fill="var(--color-chart-4)" />
                          <Bar dataKey="waschen" stackId="a" fill="var(--color-chart-5)" />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>New ads by topic (last 30 days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={simpleConfig} className="h-[300px] w-full">
                      <LineChart data={newAdsByTopic}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="week" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line dataKey="shop" stroke="var(--color-chart-1)" strokeWidth={2.4} dot={false} />
                        <Line dataKey="existing" stroke="var(--color-chart-2)" strokeWidth={1.8} dot={false} />
                        <Line dataKey="laden" stroke="var(--color-chart-3)" strokeWidth={1.8} dot={false} />
                        <Line dataKey="stellenanzeigen" stroke="var(--color-chart-4)" strokeWidth={1.8} dot={false} />
                        <Line dataKey="waschen" stroke="var(--color-chart-5)" strokeWidth={1.8} dot={false} />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </section>
            )}

            {view === "funnel" && (
              <section>
                <SectionTitle
                  title="Funnel Benchmark"
                  subtitle="Monitor market funnel shape, advertiser strategy split, and recent funnel trends."
                />
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Funnel distribution in # total ads (alltime)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={simpleConfig} className="h-[300px] w-full">
                        <BarChart data={funnelDistribution} layout="vertical">
                          <CartesianGrid horizontal={false} />
                          <XAxis type="number" tickLine={false} axisLine={false} unit="%" />
                          <YAxis dataKey="stage" type="category" tickLine={false} axisLine={false} width={70} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="value" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Funnel distribution by advertisers (alltime)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={simpleConfig} className="h-[300px] w-full">
                        <BarChart data={funnelByAdvertiser} layout="vertical">
                          <CartesianGrid horizontal={false} />
                          <XAxis type="number" tickLine={false} axisLine={false} unit="%" />
                          <YAxis dataKey="advertiser" type="category" tickLine={false} axisLine={false} width={90} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="see" stackId="a" fill="var(--color-chart-1)" />
                          <Bar dataKey="think" stackId="a" fill="var(--color-chart-2)" />
                          <Bar dataKey="doo" stackId="a" fill="var(--color-chart-3)" />
                          <Bar dataKey="care" stackId="a" fill="var(--color-chart-4)" />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>New ads by funnel (last 30 days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={simpleConfig} className="h-[300px] w-full">
                      <LineChart data={newAdsByFunnel}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="week" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line dataKey="see" stroke="var(--color-chart-1)" strokeWidth={2.2} dot={false} />
                        <Line dataKey="think" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
                        <Line dataKey="doo" stroke="var(--color-chart-3)" strokeWidth={2} dot={false} />
                        <Line dataKey="care" stroke="var(--color-chart-4)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </section>
            )}

            {view === "audience" && (
              <section>
                <SectionTitle
                  title="Audience Benchmark"
                  subtitle="See age, gender, and location targeting concentration across the market."
                />
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Minimum age distribution in # total ads (Meta only)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={simpleConfig} className="h-[280px] w-full">
                        <BarChart data={audienceMinAgeDistribution} layout="vertical">
                          <CartesianGrid horizontal={false} />
                          <XAxis type="number" tickLine={false} axisLine={false} />
                          <YAxis dataKey="bucket" type="category" tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="ads" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Maximum age distribution in # total ads (Meta only)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={simpleConfig} className="h-[280px] w-full">
                        <BarChart data={audienceMaxAgeDistribution} layout="vertical">
                          <CartesianGrid horizontal={false} />
                          <XAxis type="number" tickLine={false} axisLine={false} />
                          <YAxis dataKey="bucket" type="category" tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="ads" fill="var(--color-chart-2)" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Gender distribution in # total ads (alltime)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={simpleConfig} className="h-[280px] w-full">
                        <BarChart data={audienceGenderDistribution} layout="vertical">
                          <CartesianGrid horizontal={false} />
                          <XAxis type="number" tickLine={false} axisLine={false} />
                          <YAxis dataKey="bucket" type="category" tickLine={false} axisLine={false} width={100} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="ads" fill="var(--color-chart-3)" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Distribution by targeting location (Top 10, alltime)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={simpleConfig} className="h-[280px] w-full">
                        <BarChart data={targetingLocationTop10}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="location" tickLine={false} axisLine={false} interval={0} angle={-22} textAnchor="end" height={70} />
                          <YAxis tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="ads" fill="var(--color-chart-4)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
              </section>
            )}

            {view === "orlen" && (
              <section>
                <SectionTitle
                  title="ORLEN vs Market Average"
                  subtitle="Direct scorecards, strategy profiles, market presence mapping, and opportunity ranking."
                />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {orlenVsMarketScorecards.map((item) => (
                    <Card key={item.label}>
                      <CardHeader className="pb-2">
                        <CardDescription>{item.label}</CardDescription>
                        <CardTitle>
                          {item.orlen} <span className="text-muted-foreground text-sm font-normal">vs {item.market}</span>
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Competitor strategy profiles</CardTitle>
                      <CardDescription>Heatmap table for awareness, conversion, innovation, and local targeting.</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Advertiser</TableHead>
                            <TableHead className="text-right">Awareness</TableHead>
                            <TableHead className="text-right">Conversion</TableHead>
                            <TableHead className="text-right">Innovation</TableHead>
                            <TableHead className="text-right">Local</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {competitorStrategyProfiles.map((row) => (
                            <TableRow key={row.advertiser}>
                              <TableCell className="font-medium">{row.advertiser}</TableCell>
                              {[row.awareness, row.conversion, row.innovation, row.localTargeting].map((score, index) => (
                                <TableCell key={`${row.advertiser}-${index}`} className="text-right">
                                  <span
                                    className="inline-flex min-w-8 justify-center rounded px-2 py-1 text-xs font-medium"
                                    style={{ backgroundColor: `hsl(210 90% ${92 - score * 5}%)` }}
                                  >
                                    {score}
                                  </span>
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Market activity vs ORLEN presence</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={simpleConfig} className="h-[320px] w-full">
                        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                          <CartesianGrid />
                          <XAxis dataKey="activity" name="Activity" tickLine={false} axisLine={false} />
                          <YAxis dataKey="presence" name="Presence" tickLine={false} axisLine={false} />
                          <ZAxis dataKey="reach" range={[80, 600]} name="Reach" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Scatter data={marketActivityVsPresence} fill="var(--color-chart-1)" />
                        </ScatterChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Top 10 opportunities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Topic</TableHead>
                          <TableHead>Whitespace</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead className="text-right">Opportunity score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topOpportunities.map((row) => (
                          <TableRow key={row.topic}>
                            <TableCell className="font-medium">{row.topic}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{row.whitespace}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{row.reason}</TableCell>
                            <TableCell className="text-right">{row.score}/5</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </section>
            )}

            {view === "creative" && (
              <section>
                <SectionTitle
                  title="Creative Benchmark"
                  subtitle="Page 2 style overview with headline creative scores and top-performing new creatives."
                />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {creativeScorecards.map((item) => (
                    <Card key={item.label}>
                      <CardHeader className="pb-2">
                        <CardDescription>{item.label}</CardDescription>
                        <CardTitle>{item.value}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground text-xs">{item.delta} vs previous week</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Top 10 new creatives in market</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                      {topCreatives.map((creative) => (
                        <article key={creative.id} className="overflow-hidden rounded-lg border bg-card">
                          <img src={creative.thumbnail} alt={creative.title} className="h-28 w-full object-cover" />
                          <div className="space-y-2 p-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">{creative.platform}</Badge>
                              <span className="text-xs font-medium">PI {creative.performanceIndex}</span>
                            </div>
                            <p className="line-clamp-2 text-sm font-medium">{creative.title}</p>
                            <p className="text-muted-foreground text-xs">{creative.brand}</p>
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary">{creative.funnelStage}</Badge>
                              <span className="text-muted-foreground text-xs">Sentiment {creative.sentiment.toFixed(2)}</span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
