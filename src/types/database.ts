export type Platform = 'meta' | 'google' | 'linkedin'
export type FunnelStage = 'See' | 'Think' | 'Do' | 'Care'
export type CreativeType = 'image' | 'video' | 'carousel'
export type WorkspaceMemberRole = 'owner' | 'admin' | 'viewer'

export interface Database {
  PostgrestVersion: '12'
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          name?: string
          slug?: string
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      platform: Platform
      funnel_stage: FunnelStage
      creative_type: CreativeType
      workspace_member_role: WorkspaceMemberRole
    }
  }
}
