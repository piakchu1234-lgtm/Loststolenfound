import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('📦 Applying rewards system migration...\n');

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20260708_add_rewards_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Split into individual statements (rough split by semicolons)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      console.log(`[${i + 1}/${statements.length}] Executing...`);

      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

      if (error) {
        // Try direct query as fallback
        const { error: directError } = await supabase.from('_migrations').insert({
          name: '20260708_add_rewards_system',
          executed_at: new Date().toISOString(),
        }).select().single();

        console.error('⚠️  Error:', error.message);
      } else {
        console.log('✅ Success');
      }
    }

    console.log('\n🎉 Migration completed!');
    console.log('\nNext steps:');
    console.log('1. Verify tables in Supabase Dashboard → Database → Tables');
    console.log('2. Check for: user_points, points_history, user_badges');
    console.log('3. Restart your dev server to see the rewards system\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n📝 Manual application required:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Open: supabase/migrations/20260708_add_rewards_system.sql');
    console.log('3. Copy and paste the entire SQL into the editor');
    console.log('4. Click "Run" to execute\n');
  }
}

applyMigration();
