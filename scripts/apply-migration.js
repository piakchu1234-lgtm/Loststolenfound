const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('📦 Applying rewards system migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260708_add_rewards_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log('🔄 Executing SQL...\n');

    // Execute the entire migration as one query
    const { data, error } = await supabase.rpc('exec_sql', {
      query: migrationSQL
    });

    if (error) {
      console.error('⚠️  Standard execution failed, trying alternative method...\n');

      // Alternative: Execute via REST API directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ query: migrationSQL }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      console.log('✅ Migration executed via REST API');
    } else {
      console.log('✅ Migration executed successfully');
    }

    console.log('\n🎉 Rewards system is now active!\n');
    console.log('Tables created:');
    console.log('  ✓ user_points');
    console.log('  ✓ points_history');
    console.log('  ✓ user_badges\n');
    console.log('Functions created:');
    console.log('  ✓ award_points()');
    console.log('  ✓ check_badge_eligibility()');
    console.log('  ✓ get_leaderboard()\n');
    console.log('🔄 Restart your dev server to see the changes!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Manual steps:');
    console.log('1. Go to: https://supabase.com/dashboard/project/nivcvueuohxofajchssk/editor');
    console.log('2. Click "SQL Editor" → "New query"');
    console.log('3. Copy contents from: supabase/migrations/20260708_add_rewards_system.sql');
    console.log('4. Paste and click "Run"\n');
  }
}

applyMigration();
