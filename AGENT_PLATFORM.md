# Agentic Marketing Automation Platform

## Overview

This platform enables users to spawn autonomous agents that perform complex marketing tasks including SEO optimization, content analysis, WordPress management, and AI search optimization.

## Architecture

### Core Components

1. **Agent Orchestrator** (`src/lib/agents/agent-orchestrator.ts`)
   - Manages agent lifecycle (create, execute, monitor)
   - Handles task queue and execution
   - Logs agent activities for debugging and monitoring

2. **SEO Optimizer** (`src/lib/agents/seo-optimizer.ts`)
   - Website SEO audits with 100-point scoring system
   - Meta tag analysis and optimization
   - Content structure and heading hierarchy checking
   - Image alt text validation
   - AI search optimization for ChatGPT, Perplexity, Claude
   - Structured data recommendations

3. **WordPress Client** (`src/lib/agents/wordpress-client.ts`)
   - WordPress REST API integration
   - Bulk SEO optimization for posts
   - Yoast SEO plugin integration
   - Meta description and focus keyphrase management

### Database Schema

#### Tables

- **agent_types**: Pre-configured agent templates
- **agents**: Spawned agent instances
- **agent_tasks**: Individual tasks executed by agents
- **integrations**: External service connections (WordPress, APIs)
- **agent_logs**: Detailed execution logs
- **seo_audits**: SEO audit results with issues and recommendations

## Available Agent Types

### 1. SEO Optimizer
**Slug**: `seo-optimizer`

Analyzes websites for SEO issues and provides actionable recommendations.

**Capabilities**:
- Meta tag analysis
- Heading structure validation
- Content word count analysis
- Image alt text checking
- Internal/external link analysis
- Page load time monitoring
- Structured data detection

**Configuration**:
```json
{
  "target_url": "https://example.com",
  "crawl_depth": 3,
  "check_mobile": true,
  "check_speed": true
}
```

**Output**:
- SEO score (0-100)
- List of issues with severity levels
- Prioritized recommendations
- Technical metadata

### 2. WordPress SEO Agent
**Slug**: `wordpress-seo`

Connects to WordPress sites to optimize content for search engines.

**Capabilities**:
- Bulk meta description updates
- Focus keyphrase optimization
- Yoast SEO integration
- Post and page optimization

**Configuration**:
```json
{
  "wordpress_url": "https://yoursite.com",
  "integration_id": "uuid-of-integration",
  "auto_optimize": false
}
```

**Actions**:
- `optimize_post`: Optimize a single post
- `bulk_optimize`: Optimize multiple posts at once

### 3. Content Optimizer
**Slug**: `content-optimizer`

Uses AI to improve content quality, readability, and SEO performance.

**Capabilities**:
- Readability scoring
- Keyword density analysis
- AI-powered suggestions
- Tone and audience targeting

**Configuration**:
```json
{
  "target_keywords": ["marketing", "automation"],
  "tone": "professional",
  "target_audience": "B2B marketers"
}
```

### 4. AI Search Optimizer
**Slug**: `ai-search-optimizer`

Optimizes content for AI-powered search engines like ChatGPT, Perplexity, and Claude.

**Capabilities**:
- LLM-friendly content structuring
- Citation optimization
- FAQ generation
- Structured data recommendations

**Configuration**:
```json
{
  "target_url": "https://example.com",
  "target_queries": ["what is SEO", "how to improve SEO"],
  "optimize_for": ["chatgpt", "perplexity", "claude"]
}
```

**Output**:
- Content structure suggestions
- Structured data schemas
- FAQ recommendations
- Citation optimization tips

### 5. Website Crawler
**Slug**: `website-crawler`

Crawls websites to discover pages, analyze structure, and find optimization opportunities.

**Capabilities**:
- Sitemap generation
- Broken link detection
- Content extraction
- Site structure analysis

**Configuration**:
```json
{
  "start_url": "https://example.com",
  "max_pages": 100,
  "respect_robots": true,
  "extract_content": true
}
```

## API Endpoints

### Agent Management

#### `GET /api/agents/list`
List all agents in a workspace.

**Query Parameters**:
- `workspaceId` (required): Workspace UUID

**Response**:
```json
{
  "agents": [
    {
      "id": "uuid",
      "name": "My SEO Agent",
      "status": "idle",
      "agent_types": {...},
      "config": {...},
      "last_run_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### `POST /api/agents/create`
Create a new agent.

**Body**:
```json
{
  "workspaceId": "uuid",
  "agentTypeId": "uuid",
  "name": "My SEO Agent",
  "config": {...},
  "schedule": "0 0 * * *"
}
```

#### `POST /api/agents/execute`
Execute an agent task.

**Body**:
```json
{
  "agentId": "uuid",
  "workspaceId": "uuid",
  "taskType": "seo_audit",
  "inputData": {
    "target_url": "https://example.com"
  }
}
```

#### `GET /api/agents/types`
Get available agent types.

**Response**:
```json
{
  "agentTypes": [
    {
      "id": "uuid",
      "name": "SEO Optimizer",
      "slug": "seo-optimizer",
      "description": "...",
      "capabilities": [...],
      "config_schema": {...}
    }
  ]
}
```

#### `GET /api/agents/tasks`
Get tasks for an agent.

**Query Parameters**:
- `agentId` (required): Agent UUID
- `limit` (optional): Max results (default: 50)

### Integration Management

#### `POST /api/integrations/create`
Create a new integration.

**Body**:
```json
{
  "workspaceId": "uuid",
  "type": "wordpress",
  "name": "My WordPress Site",
  "config": {
    "url": "https://yoursite.com",
    "username": "admin",
    "password": "app-password"
  }
}
```

#### `GET /api/integrations/list`
List all integrations in a workspace.

**Query Parameters**:
- `workspaceId` (required): Workspace UUID

## Usage Examples

### Example 1: SEO Audit

```typescript
// Create SEO agent
const createResponse = await fetch('/api/agents/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspaceId: 'workspace-uuid',
    agentTypeId: 'seo-optimizer-type-uuid',
    name: 'Website SEO Auditor',
    config: {
      target_url: 'https://example.com',
      check_mobile: true,
      check_speed: true
    }
  })
})

const { agent } = await createResponse.json()

// Execute audit
const executeResponse = await fetch('/api/agents/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: agent.id,
    workspaceId: 'workspace-uuid',
    taskType: 'seo_audit',
    inputData: {
      target_url: 'https://example.com',
      crawl_depth: 3
    }
  })
})

const { result } = await executeResponse.json()
console.log('SEO Score:', result.score)
console.log('Issues:', result.issues)
console.log('Recommendations:', result.recommendations)
```

### Example 2: WordPress Bulk Optimization

```typescript
// Create WordPress integration
const integrationResponse = await fetch('/api/integrations/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspaceId: 'workspace-uuid',
    type: 'wordpress',
    name: 'My Blog',
    config: {
      url: 'https://myblog.com',
      username: 'admin',
      password: 'xxxx xxxx xxxx xxxx'
    }
  })
})

const { integration } = await integrationResponse.json()

// Create WordPress agent
const agentResponse = await fetch('/api/agents/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspaceId: 'workspace-uuid',
    agentTypeId: 'wordpress-seo-type-uuid',
    name: 'Blog SEO Optimizer',
    config: {
      wordpress_url: 'https://myblog.com',
      integration_id: integration.id
    }
  })
})

// Bulk optimize posts
const executeResponse = await fetch('/api/agents/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: agentResponse.agent.id,
    workspaceId: 'workspace-uuid',
    taskType: 'bulk_optimize',
    inputData: {
      integration_id: integration.id,
      action: 'bulk_optimize',
      post_ids: [1, 2, 3, 4, 5]
    }
  })
})
```

### Example 3: AI Search Optimization

```typescript
const executeResponse = await fetch('/api/agents/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'ai-search-optimizer-uuid',
    workspaceId: 'workspace-uuid',
    taskType: 'ai_search_optimize',
    inputData: {
      target_url: 'https://example.com/article',
      target_queries: [
        'what is content marketing',
        'how to start content marketing',
        'content marketing strategy'
      ],
      optimize_for: ['chatgpt', 'perplexity']
    }
  })
})

const { result } = await executeResponse.json()
console.log('Suggestions:', result.suggestions)
console.log('Structured Data:', result.structuredDataRecommendations)
console.log('Content Optimizations:', result.contentOptimizations)
```

## Required APIs and Services

### Current Implementation
- **Supabase**: Database and authentication
- **WordPress REST API**: For WordPress integrations
- **Axios**: HTTP client for web requests
- **Cheerio/node-html-parser**: HTML parsing for SEO audits

### Recommended Additions for Full Functionality

1. **OpenAI API** (for AI-powered content optimization)
   - Content analysis and suggestions
   - Keyword research
   - Meta description generation

   ```bash
   npm install openai
   ```

   Add to `.env`:
   ```
   OPENAI_API_KEY=sk-...
   ```

2. **Google PageSpeed Insights API** (for performance analysis)
   - Page speed scoring
   - Core Web Vitals
   - Mobile optimization checks

   API: `https://developers.google.com/speed/docs/insights/v5/get-started`

3. **Screaming Frog API** or **Serpstat API** (for advanced crawling)
   - Large-scale site crawling
   - Detailed technical SEO analysis
   - Competitor analysis

4. **Ahrefs or SEMrush API** (for keyword research)
   - Keyword difficulty scores
   - Search volume data
   - Competitor keyword analysis

5. **Perplexity API** (optional, for AI search testing)
   - Test content visibility in AI search
   - Citation tracking

## Integration with Agentic Frameworks

### Recommended: LangChain or AutoGPT Integration

For more sophisticated agentic behavior, consider integrating:

```typescript
import { ChatOpenAI } from "@langchain/openai"
import { initializeAgentExecutorWithOptions } from "langchain/agents"

// Create an agent with tools
const model = new ChatOpenAI({ temperature: 0 })
const tools = [seoAuditTool, wordpressOptimizeTool, contentAnalyzeTool]

const executor = await initializeAgentExecutorWithOptions(tools, model, {
  agentType: "openai-functions",
  verbose: true,
})

// Let the agent decide what to do
const result = await executor.call({
  input: "Audit this website and optimize it for SEO: https://example.com"
})
```

### Alternative: AgentKit / Anthropic SDK

```typescript
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Define tools for the agent
const tools = [
  {
    name: "seo_audit",
    description: "Performs comprehensive SEO audit of a website",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Website URL to audit" }
      },
      required: ["url"]
    }
  }
]

// Agent can now use tools autonomously
```

## Security Considerations

1. **Integration Credentials**
   - Store WordPress passwords and API keys encrypted in Supabase
   - Use application passwords, not main WordPress passwords
   - Implement credential rotation

2. **Rate Limiting**
   - Implement rate limits on agent execution
   - Queue tasks to prevent overwhelming target sites
   - Respect robots.txt when crawling

3. **Access Control**
   - RLS policies ensure workspace isolation
   - Only workspace admins can create/manage agents
   - Audit logs track all agent activities

## Future Enhancements

1. **Scheduled Agents**: Cron-based recurring tasks
2. **Agent Marketplace**: Share and sell agent configurations
3. **Multi-step Workflows**: Chain multiple agents together
4. **Real-time Monitoring**: WebSocket-based live agent status
5. **AI-powered Decision Making**: Let agents decide which optimizations to apply
6. **Competitor Analysis Agents**: Monitor competitor websites and strategies
7. **Link Building Agents**: Find and reach out to link opportunities
8. **Social Media Agents**: Optimize content for social platforms

## Support and Resources

- **Documentation**: `/AGENT_PLATFORM.md` (this file)
- **API Reference**: See "API Endpoints" section above
- **Examples**: See "Usage Examples" section above
- **Database Schema**: `supabase/migrations/008_agent_system_schema.sql`

## Getting Started

1. **Create a Workspace** (if not already done)
2. **Navigate to Agents View** in the dashboard
3. **Click "Create Agent"** and select an agent type
4. **Configure the Agent** with required settings
5. **Execute Tasks** and monitor results
6. **Review Logs** for debugging and insights

For WordPress integration:
1. Generate an application password in WordPress
2. Create integration via API or UI
3. Create WordPress agent linked to integration
4. Execute optimization tasks

Happy automating!
