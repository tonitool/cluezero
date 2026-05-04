#!/usr/bin/env node
/**
 * Run a SQL file or inline SQL against the linked Supabase project.
 *
 * Prerequisites (one-time):
 *   npx supabase login
 *   npx supabase link --project-ref <ref>
 *
 * Usage:
 *   node scripts/run-migration.mjs supabase/migrations/028_brand_aliases.sql
 *   node scripts/run-migration.mjs --sql "SELECT count(*) FROM ads"
 */

import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const args = process.argv.slice(2)

let filePath = ''

if (args[0] === '--sql') {
  // Write inline SQL to a temp file (supabase db query --linked -f <file>)
  const sql = args.slice(1).join(' ')
  if (!sql) {
    console.error('Usage: node scripts/run-migration.mjs --sql "SELECT 1"')
    process.exit(1)
  }
  filePath = resolve(tmpdir(), `supabase-query-${randomUUID()}.sql`)
  writeFileSync(filePath, sql)
} else if (args[0]) {
  filePath = resolve(ROOT, args[0])
} else {
  console.error('Usage: node scripts/run-migration.mjs <file.sql>')
  console.error('       node scripts/run-migration.mjs --sql "SELECT 1"')
  process.exit(1)
}

const sql = readFileSync(filePath, 'utf-8')
console.log(`Running SQL (${sql.length} chars)...`)

try {
  const result = execSync(
    `npx supabase db query --linked -f "${filePath}"`,
    { cwd: ROOT, encoding: 'utf-8', timeout: 60_000 },
  )
  console.log(result || 'Done')
} catch (err) {
  console.error('Error:', err.stderr || err.message)
  process.exit(1)
} finally {
  // Clean up temp file if we created one
  if (args[0] === '--sql') {
    try { unlinkSync(filePath) } catch {}
  }
}
