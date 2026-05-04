# ClueZero

Competitive intelligence dashboard for performance marketing agencies. Unifies data from Snowflake, Google Ads, Meta Ads, Asana, and ClickUp into a single pane of glass.

## What It Does

- **Unified Data Sync** — Pull data from Snowflake, Google Ads, Meta Ads, Asana, and ClickUp via Composio
- **Competitive Intelligence** — 18-section dashboard matching your Looker Studio report
- **Brand & Ad Tracking** — Track spend, ROAS, and performance across platforms
- **Incremental Sync** — Only fetch new data since last sync

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/tonitool/cluezero.git
cd cluezero
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Run the app
npm run dev
```

Open http://localhost:3000

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `COMPOSIO_API_KEY` | Yes | Get from https://app.composio.dev |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (for admin operations) |

## Connections

### Adding a Connection

1. Go to **Settings → Connections**
2. Click **Add Connection**
3. Select the platform (Snowflake, Google Ads, Meta Ads, Asana, or ClickUp)
4. For Snowflake: use Basic Auth (username + password). No OAuth or ACCOUNTADMIN required.
5. For other platforms: complete OAuth flow

### Connection Credentials

| Platform | Auth Type | Required Fields |
|----------|----------|-------------|
| Snowflake | Basic | account_identifier, username, password, role |
| Google Ads | OAuth2 | (automatic via Composio) |
| Meta Ads | OAuth2 | (automatic via Composio) |
| Asana | OAuth2 | (automatic via Composio) |
| ClickUp | OAuth2 | (automatic via Composio) |

## Sync

### Manual Sync

Go to **Settings → Sync** and click **Sync Now**.

### Automatic Sync

Set up a cron job to call `/api/cron/sync`:

```bash
curl -X POST https://your-domain.com/api/cron/sync
```

### Sync Behavior

- **Chunked queries** — 2000 rows per chunk to avoid API limits
- **Incremental sync** — only fetches rows modified since last sync
- **Retry logic** — automatic retry on failure (up to 3 attempts)
- **is_new_ad flag** — automatically set for new ads

## Dashboard

### Competitive Tab

18 sections covering:

1. **Spend & ROAS Overview** — Total spend, total revenue, blended ROAS
2. **Spend by Platform** — Snowflake vs Google vs Meta
3. **Spend by Month** — Monthly trend
4. **Top Brands by Spend** — Brand leaderboard
5. **Top Ads by Spend** — Ad leaderboard
6. **New vs Existing Spend** — New ad launch analysis
7. **Platform Mix** — Platform distribution
8. **Brand Distribution** — Spend distribution across brands
9. **ROAS by Brand** — ROAS per brand
10. **Campaign Performance** — Campaign-level metrics
11. **Ad Performance** — Ad-level metrics
12. **Audience Insights** — Audience breakdown
13. **Topic Analysis** — Topic distribution
14. **Format Performance** — Format (image, video, carousel) breakdown
15. **Monthly Trends** — Month-over-month trends
16. **Funnel Analysis** — Funnel stage distribution
17. **Targeting Analysis** — Targeting type breakdown
18. **Recommendations** — AI-powered suggestions

### Database Schema

**brands** — Brand information
- id, name, created_at, updated_at

**ads** — Ad records
- id, brand_id, global_ad_id, headline, thumbnail, format_type, platform, created_at, updated_at

**spend** — Spend records
- id, ad_id, brand_id, date, spend, impressions, reach, revenue, platform, is_new_ad, topic, audience, targeting, created_at, updated_at

**connections** — Unified connection store
- id, workspace_id, platform, connection_id, status, credentials (encrypted), created_at, updated_at

### SQL Migrations

Run migrations in Supabase dashboard:

```bash
supabase migrations new <migration_name>
# or paste migration SQL directly in Supabase dashboard
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/connections/list` | GET | List all connections |
| `/api/connections/connect` | POST | Initiate OAuth flow |
| `/api/connections/callback` | GET | OAuth callback handler |
| `/api/connections/disconnect` | POST | Disconnect a connection |
| `/api/connections/status` | GET | Check connection status |
| `/api/sync/run` | POST | Trigger manual sync |
| `/api/cron/sync` | POST | Cron sync endpoint |
| `/api/data/dashboard` | GET | Dashboard data (all 18 sections) |

## Troubleshooting

### "Missing table or required column mapping"

Configure your Snowflake table and column mapping in the connection settings panel.

### Sync failing

- Check Composio API key is valid
- Verify connection status is "active" in Settings → Connections
- Check Snowflake credentials have permission to SELECT from your view

### Dashboard empty

- Run a sync first (Settings → Sync → Sync Now)
- Ensure your Snowflake view has data
- Check the SQL migration ran (topic, audience, targeting, is_new_ad columns exist)

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Composio SDK
- **Database**: Supabase (PostgreSQL)
- **Auth**: Composio OAuth

## License

MIT