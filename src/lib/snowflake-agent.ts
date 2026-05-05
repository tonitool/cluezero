/**
 * Snowflake Discovery Agent — SERVER ONLY
 *
 * Uses Claude + SNOWFLAKE_BASIC Composio tools to autonomously:
 * 1. Explore the Snowflake schema
 * 2. Identify the table that contains ad performance data
 * 3. Map its columns to our data model
 *
 * Returns a SnowflakeMapping ready for the sync engine.
 */

import 'server-only'
import { generateText, tool, stepCountIs } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { executeAction } from '@/lib/composio'
import { type SnowflakeMapping, SF_VERSION } from '@/lib/snowflake'

export interface DiscoveryResult {
  ok: boolean
  mapping?: SnowflakeMapping
  error?: string
  log: string[]
}

export async function discoverSnowflakeMapping(workspaceId: string): Promise<DiscoveryResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return { ok: false, error: 'OPENROUTER_API_KEY not configured', log: [] }

  const log: string[] = []
  const openrouter = createOpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey })

  const tools = {
    showDatabases: tool({
      description: 'List all Snowflake databases',
      inputSchema: z.object({}),
      execute: async () => {
        log.push('→ SHOW DATABASES')
        return executeAction(workspaceId, 'SNOWFLAKE_BASIC_SHOW_DATABASES', {}, SF_VERSION)
      },
    }),
    showSchemas: tool({
      description: 'List schemas inside a database',
      inputSchema: z.object({ database: z.string() }),
      execute: async ({ database }) => {
        log.push(`→ SHOW SCHEMAS in ${database}`)
        return executeAction(workspaceId, 'SNOWFLAKE_BASIC_SHOW_SCHEMAS', { database }, SF_VERSION)
      },
    }),
    showTables: tool({
      description: 'List tables and views inside a schema',
      inputSchema: z.object({ database: z.string(), schema_name: z.string() }),
      execute: async ({ database, schema_name }) => {
        log.push(`→ SHOW TABLES in ${database}.${schema_name}`)
        return executeAction(workspaceId, 'SNOWFLAKE_BASIC_SHOW_TABLES', { database, schema_name }, SF_VERSION)
      },
    }),
    describeTable: tool({
      description: 'Describe the columns of a table',
      inputSchema: z.object({ database: z.string(), schema_name: z.string(), table_name: z.string() }),
      execute: async ({ database, schema_name, table_name }) => {
        log.push(`→ DESCRIBE TABLE ${database}.${schema_name}.${table_name}`)
        return executeAction(workspaceId, 'SNOWFLAKE_BASIC_DESCRIBE_TABLE', { database, schema_name, table_name }, SF_VERSION)
      },
    }),
    sampleTable: tool({
      description: 'Sample 3 rows from a table to understand its content',
      inputSchema: z.object({ database: z.string(), schema_name: z.string(), table_name: z.string() }),
      execute: async ({ database, schema_name, table_name }) => {
        log.push(`→ SAMPLE ${database}.${schema_name}.${table_name}`)
        return executeAction(workspaceId, 'SNOWFLAKE_BASIC_RUN_QUERY', {
          query: `SELECT * FROM "${table_name}" LIMIT 3`,
          database,
          schema_name,
        }, SF_VERSION)
      },
    }),
  }

  try {
    const { text } = await generateText({
      model: openrouter('anthropic/claude-sonnet-4-5'),
      stopWhen: stepCountIs(20),
      tools,
      system: `You are a data discovery agent. Your job is to explore a Snowflake account and find the table that contains advertising / ad library performance data.

Ad data tables typically contain columns like: advertiser name / brand, date, spend, impressions, reach, ad ID, headline/creative text, platform (META/GOOGLE/etc.), funnel stage.

Steps:
1. List databases
2. For each database list schemas (skip INFORMATION_SCHEMA)
3. For schemas that look relevant, list tables
4. Describe promising tables (ones with names like ad_library, ads, campaigns, performance, spend, creatives, etc.)
5. Sample a promising table to confirm it has ad data
6. Pick the BEST single table

Once you've found the right table, respond with ONLY this JSON (no markdown, no explanation):
{
  "database": "DB_NAME",
  "schema": "SCHEMA_NAME",
  "table": "TABLE_NAME",
  "columns": {
    "colBrand": "COLUMN_NAME_OR_NULL",
    "colDate": "COLUMN_NAME_OR_NULL",
    "colAdId": "COLUMN_NAME_OR_NULL",
    "colHeadline": "COLUMN_NAME_OR_NULL",
    "colSpend": "COLUMN_NAME_OR_NULL",
    "colImpressions": "COLUMN_NAME_OR_NULL",
    "colReach": "COLUMN_NAME_OR_NULL",
    "colPi": "COLUMN_NAME_OR_NULL",
    "colFunnel": "COLUMN_NAME_OR_NULL",
    "colTopic": "COLUMN_NAME_OR_NULL",
    "colPlatform": "COLUMN_NAME_OR_NULL",
    "colThumbnail": "COLUMN_NAME_OR_NULL",
    "colIsActive": "COLUMN_NAME_OR_NULL"
  }
}

colBrand and colDate are required — must have non-null values. Set others to null if not found.
If no suitable table exists, respond: { "error": "reason" }`,
      prompt: 'Discover the ad performance table in this Snowflake account.',
    })

    log.push('← Agent finished')

    // Parse JSON out of the response (agent may include surrounding text)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { ok: false, error: 'Agent returned no JSON', log }

    const parsed = JSON.parse(jsonMatch[0]) as {
      error?: string
      database?: string
      schema?: string
      table?: string
      columns?: Record<string, string | null>
    }

    if (parsed.error) return { ok: false, error: parsed.error, log }
    if (!parsed.database || !parsed.schema || !parsed.table) {
      return { ok: false, error: 'Agent returned incomplete mapping', log }
    }

    const cols = parsed.columns ?? {}
    const mapping: SnowflakeMapping = {
      database: parsed.database,
      schema: parsed.schema,
      table: parsed.table,
      colBrand: cols.colBrand ?? '',
      colDate: cols.colDate ?? '',
      colAdId:        cols.colAdId        ?? undefined,
      colHeadline:    cols.colHeadline    ?? undefined,
      colSpend:       cols.colSpend       ?? undefined,
      colImpressions: cols.colImpressions ?? undefined,
      colReach:       cols.colReach       ?? undefined,
      colPi:          cols.colPi          ?? undefined,
      colFunnel:      cols.colFunnel      ?? undefined,
      colTopic:       cols.colTopic       ?? undefined,
      colPlatform:    cols.colPlatform    ?? undefined,
      colThumbnail:   cols.colThumbnail   ?? undefined,
      colIsActive:    cols.colIsActive    ?? undefined,
    }

    if (!mapping.colBrand || !mapping.colDate) {
      return { ok: false, error: 'Agent could not identify brand or date columns', log }
    }

    return { ok: true, mapping, log }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.push(`✗ ${msg}`)
    return { ok: false, error: msg, log }
  }
}
