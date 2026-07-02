# Database Migration Instructions

Since we're encountering SSL certificate issues with automated deployment, please follow these steps to apply the migration manually:

## Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/nivcvueuohxofajchssk
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/20260528035918_initial_schema.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Verify success - you should see "Success. No rows returned"

## Option 2: Via Local Terminal (If you have psql installed)

```bash
# Install psql if needed (Windows)
# Download from: https://www.postgresql.org/download/windows/

# Run migration
psql "postgresql://postgres:FOUNDYMAN2026@db.nivcvueuohxofajchssk.supabase.co:5432/postgres" -f supabase/migrations/20260528035918_initial_schema.sql
```

## Option 3: Via Supabase CLI (If you can authenticate)

```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref nivcvueuohxofajchssk

# Push migration
supabase db push
```

## Verification

After running the migration, verify it worked by running this query in the SQL Editor:

```sql
-- Check tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'categories', 'lost_items', 'found_items');

-- Check categories were seeded
SELECT * FROM categories;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

You should see:
- 4 tables (users, categories, lost_items, found_items)
- 5 categories (electronics, documents, accessories, pets, other)
- RLS enabled (rowsecurity = true) for all tables

## Next Steps

Once the migration is applied, let me know and I'll:
1. Generate TypeScript types from the database schema
2. Seed test data
3. Complete remaining tasks
