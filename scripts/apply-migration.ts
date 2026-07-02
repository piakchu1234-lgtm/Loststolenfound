/**
 * Apply database migration directly to Supabase using SQL Editor API
 * Bypasses CLI to work around authentication issues
 */

import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables from .env.local
config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!projectRef) {
  console.error('Could not extract project ref from URL')
  process.exit(1)
}

async function applyMigration() {
  console.log('Reading migration file...')

  const migrationPath = join(__dirname, '../supabase/migrations/20260528035918_initial_schema.sql')
  const migrationSQL = readFileSync(migrationPath, 'utf-8')

  console.log('Applying migration to database...')
  console.log('Project:', projectRef)
  console.log('Migration size:', migrationSQL.length, 'characters')

  try {
    // Use Supabase REST API to execute SQL
    const response = await fetch(`https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query: migrationSQL }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Migration failed:', error)

      // Try alternative approach: use pg-meta API
      console.log('\nTrying alternative approach via pg-meta API...')

      const pgMetaResponse = await fetch(`https://${projectRef}.supabase.co/pg-meta/default/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ query: migrationSQL }),
      })

      if (!pgMetaResponse.ok) {
        const pgError = await pgMetaResponse.text()
        console.error('❌ Alternative approach also failed:', pgError)
        process.exit(1)
      }

      const pgResult = await pgMetaResponse.json()
      console.log('✅ Migration applied successfully via pg-meta!')
      console.log('Result:', pgResult)
    } else {
      const result = await response.json()
      console.log('✅ Migration applied successfully!')
      console.log('Result:', result)
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

applyMigration()
