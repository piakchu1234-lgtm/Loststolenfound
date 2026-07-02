## 1. Supabase Project Setup

- [ ] 1.1 Create Supabase project via dashboard and select appropriate region
- [x] 1.2 Install Supabase CLI globally: `npm install -g supabase`
- [x] 1.3 Initialize Supabase in project: `supabase init`
- [ ] 1.4 Link local project to remote: `supabase link --project-ref <project-id>`
- [ ] 1.5 Start local Supabase instance: `supabase start` (verify Docker is running)

## 2. Environment Configuration

- [x] 2.1 Create `.env.local` file with local Supabase connection strings (URL, anon key, service key)
- [x] 2.2 Create `.env.example` template file without actual credentials
- [x] 2.3 Add environment variable documentation to README.md
- [x] 2.4 Configure separate connection strings for pooler (port 6543) and direct (port 5432)
- [x] 2.5 Add `.env.local` to `.gitignore` to prevent credential commits

## 3. Database Schema Implementation

- [x] 3.1 Create initial migration file: `supabase migration new initial_schema`
- [x] 3.2 Define users table with fields: id, email, display_name, created_at, updated_at
- [x] 3.3 Define categories table with predefined categories (electronics, documents, accessories, pets, other)
- [x] 3.4 Define lost_items table with fields: id, title, description, category_id, location, coordinates, date_lost, reporter_id, status, created_at, updated_at
- [x] 3.5 Define found_items table with fields: id, title, description, category_id, location, coordinates, date_found, finder_id, status, created_at, updated_at
- [x] 3.6 Add foreign key constraints linking items to users and categories
- [x] 3.7 Add NOT NULL, UNIQUE, and CHECK constraints for data validation
- [x] 3.8 Create indexes on frequently queried columns (user_id, category_id, status, created_at)
- [x] 3.9 Create indexes on location coordinates for geographic queries

## 4. Row Level Security Policies

- [x] 4.1 Enable RLS on users table: `ALTER TABLE users ENABLE ROW LEVEL SECURITY`
- [x] 4.2 Enable RLS on lost_items table
- [x] 4.3 Enable RLS on found_items table
- [x] 4.4 Create SELECT policy for users: allow reading own profile and public profiles
- [x] 4.5 Create INSERT policy for users: allow creating own profile only
- [x] 4.6 Create UPDATE policy for users: allow updating own profile only
- [x] 4.7 Create SELECT policy for lost_items: allow reading own items and public active items
- [x] 4.8 Create INSERT policy for lost_items: allow creating items with own user_id
- [x] 4.9 Create UPDATE policy for lost_items: allow updating own items only
- [x] 4.10 Create DELETE policy for lost_items: allow deleting own items only
- [x] 4.11 Create SELECT policy for found_items: allow reading own items and public active items
- [x] 4.12 Create INSERT policy for found_items: allow creating items with own user_id
- [x] 4.13 Create UPDATE policy for found_items: allow updating own items only
- [x] 4.14 Create DELETE policy for found_items: allow deleting own items only
- [x] 4.15 Create admin role policies with elevated permissions using JWT claims

## 5. Migration System Setup

- [ ] 5.1 Create supabase_migrations.schema_migrations table (if not auto-created)
- [ ] 5.2 Add migration tracking logic to record applied migrations
- [x] 5.3 Write down/rollback SQL for initial_schema migration
- [ ] 5.4 Test migration apply locally: `supabase db reset`
- [ ] 5.5 Test migration rollback locally: `supabase migration down`
- [ ] 5.6 Verify migration idempotency by running twice
- [x] 5.7 Document migration workflow in README.md

## 6. Database Client Setup

- [x] 6.1 Install Supabase client libraries: `npm install @supabase/supabase-js @supabase/ssr`
- [x] 6.2 Create Supabase client utility for browser usage
- [x] 6.3 Create Supabase client utility for server-side usage (Next.js API routes)
- [x] 6.4 Create Supabase client utility for server components (SSR)
- [x] 6.5 Configure connection pooling in client initialization
- [ ] 6.6 Add TypeScript types for database schema using Supabase CLI: `supabase gen types typescript`

## 7. Database Monitoring Setup

- [x] 7.1 Create health check API endpoint at `/api/health/database`
- [x] 7.2 Implement simple query test in health check (SELECT 1)
- [x] 7.3 Add connection pool metrics logging (active, idle, waiting connections)
- [ ] 7.4 Configure slow query logging threshold in Supabase dashboard
- [x] 7.5 Set up error tracking for database operations (connection failures, query errors)
- [x] 7.6 Document monitoring endpoints and metrics in README.md

## 8. Testing and Validation

- [x] 8.1 Create test data script with sample users, categories, and items
- [ ] 8.2 Test RLS policies with different user contexts (own data, other users' data, anonymous)
- [ ] 8.3 Verify foreign key constraints prevent orphaned records
- [ ] 8.4 Test connection pooling under simulated load
- [ ] 8.5 Verify environment variable loading in development
- [ ] 8.6 Test database health check endpoint returns correct status
- [ ] 8.7 Verify migration rollback works correctly

## 9. Production Deployment

- [ ] 9.1 Review migration SQL for production safety (no data loss, no breaking changes)
- [ ] 9.2 Configure production environment variables in Vercel/deployment platform
- [ ] 9.3 Apply migration to production: `supabase db push`
- [ ] 9.4 Verify migration applied: check schema_migrations table
- [ ] 9.5 Run smoke tests against production database (health check, sample queries)
- [ ] 9.6 Monitor Supabase dashboard for errors and performance metrics
- [ ] 9.7 Document production database access procedures for team

## 10. Documentation

- [ ] 10.1 Document database schema with entity relationship diagram
- [x] 10.2 Document RLS policies and access control rules
- [x] 10.3 Document environment variables and configuration
- [x] 10.4 Document migration workflow (create, apply, rollback)
- [x] 10.5 Document connection string format and pooling configuration
- [x] 10.6 Document monitoring and health check endpoints
- [ ] 10.7 Document backup and recovery procedures
- [x] 10.8 Add troubleshooting guide for common database issues
