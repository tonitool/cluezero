export type Platform = 'meta' | 'google' | 'linkedin'
export type FunnelStage = 'See' | 'Think' | 'Do' | 'Care'
export type CreativeType = 'image' | 'video' | 'carousel'
export type WorkspaceMemberRole = 'owner' | 'admin' | 'viewer'
export type AgentStatus = 'idle' | 'running' | 'paused' | 'failed' | 'completed'
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type IntegrationStatus = 'active' | 'inactive' | 'error'
export type LogLevel = 'debug' | 'info' | 'warning' | 'error'

export interface Database {
  PostgrestVersion: '12'
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          own_brand: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          own_brand?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          slug?: string
          own_brand?: string | null
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: WorkspaceMemberRole
          created_at: string
        }
        Insert: {
          workspace_id: string
          user_id: string
          role?: WorkspaceMemberRole
        }
        Update: {
          role?: WorkspaceMemberRole
        }
      }
      tracked_brands: {
        Row: {
          id: string
          workspace_id: string
          name: string
          platform: Platform
          platform_page_id: string | null
          is_own_brand: boolean
          color: string | null
          created_at: string
        }
        Insert: {
          workspace_id: string
          name: string
          platform: Platform
          platform_page_id?: string | null
          is_own_brand?: boolean
          color?: string | null
        }
        Update: {
          name?: string
          platform?: Platform
          platform_page_id?: string | null
          is_own_brand?: boolean
          color?: string | null
        }
      }
      ads: {
        Row: {
          id: string
          workspace_id: string
          brand_id: string
          platform: Platform
          ad_id: string
          creative_type: CreativeType
          headline: string | null
          body: string | null
          cta: string | null
          thumbnail_url: string | null
          first_seen_at: string
          last_seen_at: string | null
          is_active: boolean
          raw_payload: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          workspace_id: string
          brand_id: string
          platform: Platform
          ad_id: string
          creative_type?: CreativeType
          headline?: string | null
          body?: string | null
          cta?: string | null
          thumbnail_url?: string | null
          first_seen_at?: string
          last_seen_at?: string | null
          is_active?: boolean
          raw_payload?: Record<string, unknown> | null
        }
        Update: {
          last_seen_at?: string | null
          is_active?: boolean
          raw_payload?: Record<string, unknown> | null
        }
      }
      ad_enrichments: {
        Row: {
          ad_id: string
          sentiment_score: number | null
          funnel_stage: FunnelStage | null
          topics: string[] | null
          enriched_at: string
        }
        Insert: {
          ad_id: string
          sentiment_score?: number | null
          funnel_stage?: FunnelStage | null
          topics?: string[] | null
        }
        Update: {
          sentiment_score?: number | null
          funnel_stage?: FunnelStage | null
          topics?: string[] | null
          enriched_at?: string
        }
      }
      ad_spend_estimates: {
        Row: {
          id: string
          ad_id: string
          week_start: string
          est_impressions: number | null
          est_reach: number | null
          est_spend_eur: number | null
          estimation_method: string | null
        }
        Insert: {
          ad_id: string
          week_start: string
          est_impressions?: number | null
          est_reach?: number | null
          est_spend_eur?: number | null
          estimation_method?: string | null
        }
        Update: {
          est_impressions?: number | null
          est_reach?: number | null
          est_spend_eur?: number | null
        }
      }
      weekly_metrics: {
        Row: {
          id: string
          workspace_id: string
          week_start: string
          brand_id: string
          platform: Platform
          total_ads: number
          new_ads: number
          active_ads: number
          est_spend_eur: number
          est_reach: number
          avg_sentiment: number | null
          avg_performance_index: number | null
          funnel_breakdown: Record<FunnelStage, number> | null
        }
        Insert: {
          workspace_id: string
          week_start: string
          brand_id: string
          platform: Platform
          total_ads?: number
          new_ads?: number
          active_ads?: number
          est_spend_eur?: number
          est_reach?: number
          avg_sentiment?: number | null
          avg_performance_index?: number | null
          funnel_breakdown?: Record<FunnelStage, number> | null
        }
        Update: {
          total_ads?: number
          new_ads?: number
          active_ads?: number
          est_spend_eur?: number
          est_reach?: number
          avg_sentiment?: number | null
          avg_performance_index?: number | null
          funnel_breakdown?: Record<FunnelStage, number> | null
        }
      }
      agent_types: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          capabilities: Record<string, unknown>[]
          config_schema: Record<string, unknown>
          is_active: boolean
          created_at: string
        }
        Insert: {
          name: string
          slug: string
          description: string
          capabilities?: Record<string, unknown>[]
          config_schema?: Record<string, unknown>
          is_active?: boolean
        }
        Update: {
          name?: string
          description?: string
          capabilities?: Record<string, unknown>[]
          config_schema?: Record<string, unknown>
          is_active?: boolean
        }
      }
      agents: {
        Row: {
          id: string
          workspace_id: string
          agent_type_id: string
          name: string
          config: Record<string, unknown>
          status: AgentStatus
          last_run_at: string | null
          next_run_at: string | null
          schedule: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          workspace_id: string
          agent_type_id: string
          name: string
          config?: Record<string, unknown>
          status?: AgentStatus
          last_run_at?: string | null
          next_run_at?: string | null
          schedule?: string | null
          created_by: string
        }
        Update: {
          name?: string
          config?: Record<string, unknown>
          status?: AgentStatus
          last_run_at?: string | null
          next_run_at?: string | null
          schedule?: string | null
        }
      }
      agent_tasks: {
        Row: {
          id: string
          agent_id: string
          workspace_id: string
          task_type: string
          status: TaskStatus
          priority: number
          input_data: Record<string, unknown>
          output_data: Record<string, unknown>
          error_message: string | null
          started_at: string | null
          completed_at: string | null
          execution_time_ms: number | null
          created_at: string
        }
        Insert: {
          agent_id: string
          workspace_id: string
          task_type: string
          status?: TaskStatus
          priority?: number
          input_data?: Record<string, unknown>
          output_data?: Record<string, unknown>
          error_message?: string | null
        }
        Update: {
          status?: TaskStatus
          output_data?: Record<string, unknown>
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          execution_time_ms?: number | null
        }
      }
      integrations: {
        Row: {
          id: string
          workspace_id: string
          type: string
          name: string
          config: Record<string, unknown>
          status: IntegrationStatus
          last_verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          workspace_id: string
          type: string
          name: string
          config?: Record<string, unknown>
          status?: IntegrationStatus
        }
        Update: {
          name?: string
          config?: Record<string, unknown>
          status?: IntegrationStatus
          last_verified_at?: string | null
        }
      }
      agent_logs: {
        Row: {
          id: string
          agent_id: string
          task_id: string | null
          level: LogLevel
          message: string
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          agent_id: string
          task_id?: string | null
          level?: LogLevel
          message: string
          metadata?: Record<string, unknown>
        }
        Update: Record<string, never>
      }
      seo_audits: {
        Row: {
          id: string
          workspace_id: string
          task_id: string
          target_url: string
          score: number | null
          issues: Record<string, unknown>[]
          recommendations: Record<string, unknown>[]
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          workspace_id: string
          task_id: string
          target_url: string
          score?: number | null
          issues?: Record<string, unknown>[]
          recommendations?: Record<string, unknown>[]
          metadata?: Record<string, unknown>
        }
        Update: {
          score?: number | null
          issues?: Record<string, unknown>[]
          recommendations?: Record<string, unknown>[]
          metadata?: Record<string, unknown>
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      platform: Platform
      funnel_stage: FunnelStage
      creative_type: CreativeType
      workspace_member_role: WorkspaceMemberRole
      agent_status: AgentStatus
      task_status: TaskStatus
      integration_status: IntegrationStatus
      log_level: LogLevel
    }
  }
}
