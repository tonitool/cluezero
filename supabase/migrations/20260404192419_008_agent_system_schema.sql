/*
  # Agent System Schema

  ## Overview
  Creates the foundation for an agentic marketing automation platform where users can spawn
  autonomous agents to perform various marketing tasks like SEO optimization, content analysis,
  and AI search optimization.

  ## New Tables

  ### `agent_types`
  Defines available agent types (SEO, content optimizer, crawler, etc.)
  - `id` (uuid, primary key)
  - `name` (text) - Display name
  - `slug` (text) - Unique identifier
  - `description` (text) - What the agent does
  - `capabilities` (jsonb) - List of capabilities/actions
  - `config_schema` (jsonb) - JSON schema for configuration
  - `is_active` (boolean) - Whether users can spawn this agent type
  - `created_at` (timestamptz)

  ### `agents`
  Spawned agent instances
  - `id` (uuid, primary key)
  - `workspace_id` (uuid, foreign key)
  - `agent_type_id` (uuid, foreign key)
  - `name` (text) - User-defined name
  - `config` (jsonb) - Agent-specific configuration
  - `status` (enum: idle, running, paused, failed, completed)
  - `last_run_at` (timestamptz)
  - `next_run_at` (timestamptz) - For scheduled agents
  - `schedule` (text) - Cron expression for recurring tasks
  - `created_by` (uuid, foreign key to auth.users)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `agent_tasks`
  Individual tasks executed by agents
  - `id` (uuid, primary key)
  - `agent_id` (uuid, foreign key)
  - `workspace_id` (uuid, foreign key)
  - `task_type` (text) - SEO audit, content optimize, crawl, etc.
  - `status` (enum: pending, running, completed, failed, cancelled)
  - `priority` (integer) - Task priority (1-10)
  - `input_data` (jsonb) - Task parameters
  - `output_data` (jsonb) - Task results
  - `error_message` (text)
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz)
  - `execution_time_ms` (integer)
  - `created_at` (timestamptz)

  ### `integrations`
  External service integrations (WordPress, APIs, etc.)
  - `id` (uuid, primary key)
  - `workspace_id` (uuid, foreign key)
  - `type` (text) - wordpress, custom_api, openai, etc.
  - `name` (text) - User-defined name
  - `config` (jsonb) - Encrypted credentials and settings
  - `status` (enum: active, inactive, error)
  - `last_verified_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `agent_logs`
  Detailed execution logs for debugging and monitoring
  - `id` (uuid, primary key)
  - `agent_id` (uuid, foreign key)
  - `task_id` (uuid, foreign key, nullable)
  - `level` (enum: debug, info, warning, error)
  - `message` (text)
  - `metadata` (jsonb)
  - `created_at` (timestamptz)

  ### `seo_audits`
  Results from SEO optimization agents
  - `id` (uuid, primary key)
  - `workspace_id` (uuid, foreign key)
  - `task_id` (uuid, foreign key)
  - `target_url` (text)
  - `score` (integer) - Overall SEO score (0-100)
  - `issues` (jsonb) - Array of issues found
  - `recommendations` (jsonb) - Array of recommendations
  - `metadata` (jsonb) - Technical details
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access agents/tasks in their workspaces
  - Workspace members with appropriate roles can manage agents
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE agent_status AS ENUM ('idle', 'running', 'paused', 'failed', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE integration_status AS ENUM ('active', 'inactive', 'error');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE log_level AS ENUM ('debug', 'info', 'warning', 'error');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Agent Types
CREATE TABLE IF NOT EXISTS agent_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL,
  capabilities jsonb DEFAULT '[]'::jsonb,
  config_schema jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Agents
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_type_id uuid NOT NULL REFERENCES agent_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  status agent_status DEFAULT 'idle',
  last_run_at timestamptz,
  next_run_at timestamptz,
  schedule text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Agent Tasks
CREATE TABLE IF NOT EXISTS agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  task_type text NOT NULL,
  status task_status DEFAULT 'pending',
  priority integer DEFAULT 5,
  input_data jsonb DEFAULT '{}'::jsonb,
  output_data jsonb DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  execution_time_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Integrations
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type text NOT NULL,
  name text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  status integration_status DEFAULT 'active',
  last_verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  task_id uuid REFERENCES agent_tasks(id) ON DELETE SET NULL,
  level log_level DEFAULT 'info',
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- SEO Audits
CREATE TABLE IF NOT EXISTS seo_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
  target_url text NOT NULL,
  score integer,
  issues jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_workspace ON agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_next_run ON agents(next_run_at) WHERE next_run_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent ON agent_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_workspace ON agent_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_integrations_workspace ON integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_seo_audits_workspace ON seo_audits(workspace_id);

-- Enable RLS
ALTER TABLE agent_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Agent Types (public read)
CREATE POLICY "Anyone can view active agent types"
  ON agent_types FOR SELECT
  USING (is_active = true);

-- RLS Policies: Agents
CREATE POLICY "Users can view agents in their workspace"
  ON agents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = agents.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create agents in their workspace"
  ON agents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = agents.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can update agents in their workspace"
  ON agents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = agents.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = agents.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can delete agents in their workspace"
  ON agents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = agents.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- RLS Policies: Agent Tasks
CREATE POLICY "Users can view tasks in their workspace"
  ON agent_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = agent_tasks.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks in their workspace"
  ON agent_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = agent_tasks.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in their workspace"
  ON agent_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = agent_tasks.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = agent_tasks.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- RLS Policies: Integrations
CREATE POLICY "Users can view integrations in their workspace"
  ON integrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = integrations.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage integrations in their workspace"
  ON integrations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = integrations.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = integrations.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- RLS Policies: Agent Logs
CREATE POLICY "Users can view logs for their workspace agents"
  ON agent_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      JOIN workspace_members ON workspace_members.workspace_id = agents.workspace_id
      WHERE agents.id = agent_logs.agent_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- RLS Policies: SEO Audits
CREATE POLICY "Users can view SEO audits in their workspace"
  ON seo_audits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = seo_audits.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Insert default agent types
INSERT INTO agent_types (name, slug, description, capabilities, config_schema, is_active) VALUES
(
  'SEO Optimizer',
  'seo-optimizer',
  'Analyzes and optimizes websites for search engines. Audits meta tags, headings, schema markup, and provides actionable recommendations.',
  '["seo_audit", "meta_optimization", "schema_markup", "content_analysis"]'::jsonb,
  '{
    "type": "object",
    "properties": {
      "target_url": {"type": "string", "format": "uri"},
      "crawl_depth": {"type": "integer", "default": 3, "minimum": 1, "maximum": 10},
      "check_mobile": {"type": "boolean", "default": true},
      "check_speed": {"type": "boolean", "default": true}
    },
    "required": ["target_url"]
  }'::jsonb,
  true
),
(
  'WordPress SEO Agent',
  'wordpress-seo',
  'Connects to WordPress sites via REST API or XML-RPC to optimize posts, pages, and site settings for SEO.',
  '["wordpress_optimization", "bulk_meta_update", "yoast_integration", "content_optimization"]'::jsonb,
  '{
    "type": "object",
    "properties": {
      "wordpress_url": {"type": "string", "format": "uri"},
      "integration_id": {"type": "string", "format": "uuid"},
      "auto_optimize": {"type": "boolean", "default": false}
    },
    "required": ["wordpress_url", "integration_id"]
  }'::jsonb,
  true
),
(
  'Content Optimizer',
  'content-optimizer',
  'Uses AI to analyze and improve content for readability, SEO, and engagement. Optimizes for both human readers and search engines.',
  '["content_analysis", "readability_score", "keyword_optimization", "ai_suggestions"]'::jsonb,
  '{
    "type": "object",
    "properties": {
      "target_keywords": {"type": "array", "items": {"type": "string"}},
      "tone": {"type": "string", "enum": ["professional", "casual", "technical", "friendly"]},
      "target_audience": {"type": "string"}
    }
  }'::jsonb,
  true
),
(
  'AI Search Optimizer',
  'ai-search-optimizer',
  'Optimizes content for AI-powered search engines like ChatGPT, Perplexity, and Claude. Ensures content is citation-worthy and structured for LLM retrieval.',
  '["llm_optimization", "structured_data", "citation_optimization", "answer_box_targeting"]'::jsonb,
  '{
    "type": "object",
    "properties": {
      "target_url": {"type": "string", "format": "uri"},
      "target_queries": {"type": "array", "items": {"type": "string"}},
      "optimize_for": {"type": "array", "items": {"type": "string", "enum": ["chatgpt", "perplexity", "claude", "gemini"]}}
    },
    "required": ["target_url"]
  }'::jsonb,
  true
),
(
  'Website Crawler',
  'website-crawler',
  'Crawls websites to discover pages, analyze structure, and extract data for optimization opportunities.',
  '["site_crawl", "broken_link_detection", "sitemap_generation", "content_extraction"]'::jsonb,
  '{
    "type": "object",
    "properties": {
      "start_url": {"type": "string", "format": "uri"},
      "max_pages": {"type": "integer", "default": 100, "maximum": 10000},
      "respect_robots": {"type": "boolean", "default": true},
      "extract_content": {"type": "boolean", "default": true}
    },
    "required": ["start_url"]
  }'::jsonb,
  true
)
ON CONFLICT (slug) DO NOTHING;