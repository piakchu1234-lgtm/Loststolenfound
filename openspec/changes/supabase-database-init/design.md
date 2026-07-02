## Context

This is a greenfield database initialization for a lost and found item tracking application. Currently, there is no database infrastructure in place. The application needs a PostgreSQL-based solution with real-time capabilities, built-in authentication, and row-level security. Supabase was chosen as it provides these features out of the box while maintaining full PostgreSQL compatibility.

The application will be built with Next.js and requires server-side rendering support for authentication. The database will store user profiles, lost items, found items, and matching relationships. Security is critical as users should only access their own data and publicly visible items.

## Goals / Non-Goals

**Goals:**
- Establish a production-ready Supabase database with proper schema, migrations, and security
- Enable secure, environment-specific database connections across development, staging, and production
- Implement Row Level Security policies that enforce data access control at the database level
- Provide monitoring and observability for database health and performance
- Create a migration system that supports versioned schema changes and rollbacks
- Set up connection pooling for optimal performance under load

**Non-Goals:**
- Application-level authentication logic (handled by Supabase Auth in a separate change)
- Real-time subscription implementation (will be added when needed for specific features)
- Full-text search configuration (deferred until search requirements are defined)
- Database backup automation (will use Supabase's built-in backup features)
- Multi-region replication (single region for initial launch)

## Decisions

### Decision 1: Use Supabase hosted service vs self-hosted PostgreSQL

**Choice:** Supabase hosted service

**Rationale:**
- Provides managed PostgreSQL with automatic backups, updates, and scaling
- Built-in Row Level Security support with authentication integration
- Real-time capabilities available when needed without additional infrastructure
- Reduces operational overhead for initial launch
- Free tier sufficient for development and early production

**Alternatives considered:**
- Self-hosted PostgreSQL: More control but significantly higher operational burden
- AWS RDS: Good managed option but lacks real-time features and RLS integration with auth

### Decision 2: Migration tool selection

**Choice:** Supabase CLI migrations

**Rationale:**
- Native integration with Supabase project structure
- Supports both SQL and TypeScript-based migrations
- Tracks migration state in `supabase_migrations.schema_migrations` table
- Works seamlessly with local development via `supabase start`
- Supports diffing against remote databases

**Alternatives considered:**
- Prisma Migrate: Good ORM integration but adds abstraction layer over raw SQL
- node-pg-migrate: Flexible but requires custom integration with Supabase
- Flyway: Enterprise-grade but overkill for this project size

### Decision 3: Connection string management

**Choice:** Environment variables with separate read/write connection strings

**Rationale:**
- Keeps credentials out of version control
- Supports different connection strings per environment (dev, staging, prod)
- Enables read replica usage in the future by separating read/write connection strings
- Compatible with Vercel/Next.js deployment model
- Allows credential rotation without code changes

**Alternatives considered:**
- Hardcoded connection strings: Security risk, rejected immediately
- Secret management service (AWS Secrets Manager): Adds complexity, can be added later if needed
- Single connection string: Limits future read replica optimization

### Decision 4: RLS policy approach

**Choice:** Enable RLS on all user-data tables with auth.uid()-based policies

**Rationale:**
- Enforces security at the database level, preventing bypass via direct database access
- Supabase Auth automatically populates auth.uid() in the JWT context
- Policies are declarative and version-controlled alongside schema
- Performance impact is minimal with proper indexing on user_id columns
- Supports role-based access (admin, moderator) via JWT claims

**Alternatives considered:**
- Application-level authorization: Easier to bypass, not defense-in-depth
- View-based security: Less flexible, harder to maintain
- No RLS with API-only access: Doesn't protect against compromised API keys

### Decision 5: Schema design pattern

**Choice:** Normalized relational schema with foreign keys and constraints

**Rationale:**
- PostgreSQL excels at relational data with strong consistency guarantees
- Foreign keys prevent orphaned records and maintain referential integrity
- Constraints (NOT NULL, UNIQUE, CHECK) enforce data quality at the database level
- Normalized design reduces data duplication and update anomalies
- Supports complex queries for item matching and reporting

**Alternatives considered:**
- Denormalized schema: Better read performance but harder to maintain consistency
- Document-oriented (JSONB): More flexible but loses relational query power
- Hybrid approach: Adds complexity without clear benefit at this scale

### Decision 6: Connection pooling strategy

**Choice:** Supabase connection pooler in transaction mode

**Rationale:**
- Supabase provides built-in PgBouncer connection pooler
- Transaction mode balances connection reuse with transaction isolation
- Handles serverless function connection spikes (Next.js API routes)
- Configured via connection string port (6543 for pooler vs 5432 for direct)
- Reduces connection overhead and prevents connection exhaustion

**Alternatives considered:**
- Session mode pooling: Better for long-lived connections but wastes connections in serverless
- Statement mode pooling: Most efficient but breaks prepared statements and transactions
- No pooling: Would exhaust connections under load in serverless environment

### Decision 7: Monitoring and observability

**Choice:** Supabase Dashboard metrics + custom health check endpoint

**Rationale:**
- Supabase Dashboard provides built-in metrics for queries, connections, and storage
- Custom health check endpoint allows external monitoring (uptime checks, load balancers)
- Logs slow queries via Supabase logging for performance analysis
- Prometheus-compatible metrics can be added later if needed
- Sufficient observability for initial launch without additional infrastructure

**Alternatives considered:**
- Full observability stack (Prometheus + Grafana): Overkill for initial launch
- CloudWatch integration: Vendor lock-in, can be added later if deploying to AWS
- No monitoring: Unacceptable for production system

## Risks / Trade-offs

### Risk: Supabase vendor lock-in
**Mitigation:** Use standard PostgreSQL features where possible. RLS policies and schema are portable to any PostgreSQL database. Supabase-specific features (realtime, auth) are isolated and can be replaced if needed.

### Risk: RLS policy performance impact
**Mitigation:** Index all columns used in RLS policies (user_id, role). Monitor query performance and optimize policies. Use EXPLAIN ANALYZE to verify policy overhead is acceptable.

### Risk: Migration conflicts in team development
**Mitigation:** Use timestamp-based migration naming to avoid conflicts. Establish convention: pull latest migrations before creating new ones. Use Supabase CLI's `db diff` to generate migrations from schema changes.

### Risk: Connection pool exhaustion in serverless
**Mitigation:** Use Supabase connection pooler (port 6543) for all application connections. Set appropriate pool size limits. Monitor connection usage and scale pool if needed.

### Risk: Credential exposure in environment variables
**Mitigation:** Never commit .env files to version control. Use .env.local for development. Use platform-specific secret management (Vercel environment variables) for production. Rotate credentials if exposure suspected.

### Risk: Initial schema design mistakes
**Mitigation:** Migrations support rollback for schema changes. Start with minimal schema and iterate. Use foreign keys and constraints to enforce data integrity. Review schema with team before production deployment.

### Trade-off: Supabase free tier limits
**Impact:** 500MB database size, 2GB bandwidth, 50MB file storage on free tier.
**Mitigation:** Monitor usage via Supabase Dashboard. Plan to upgrade to Pro tier ($25/month) before hitting limits. Free tier sufficient for development and initial launch.

### Trade-off: Single region deployment
**Impact:** Higher latency for users far from database region. No automatic failover to other regions.
**Mitigation:** Choose region closest to primary user base. Supabase provides read replicas on higher tiers if multi-region becomes necessary.

## Migration Plan

### Phase 1: Supabase project setup
1. Create Supabase project via dashboard (select appropriate region)
2. Note project URL and anon/service keys
3. Install Supabase CLI locally: `npm install -g supabase`
4. Initialize Supabase in project: `supabase init`
5. Link to remote project: `supabase link --project-ref <project-id>`

### Phase 2: Local development setup
1. Start local Supabase: `supabase start` (requires Docker)
2. Create initial migration with schema: `supabase migration new initial_schema`
3. Write SQL for tables, indexes, and RLS policies
4. Apply migration locally: `supabase db reset`
5. Test schema and policies with sample data

### Phase 3: Environment configuration
1. Create `.env.local` with local Supabase connection strings
2. Create `.env.example` template (without actual credentials)
3. Document required environment variables in README
4. Configure Vercel environment variables for staging/production
5. Test connection from Next.js application

### Phase 4: Production deployment
1. Review migration SQL for production safety
2. Apply migration to production: `supabase db push`
3. Verify migration applied: check `supabase_migrations.schema_migrations` table
4. Run smoke tests against production database
5. Monitor for errors in Supabase Dashboard

### Rollback strategy
- Migrations include both up and down SQL
- Rollback via: `supabase migration down`
- For production rollback: create new migration that reverts changes
- Never delete migration files after they've been applied to production
- Test rollback in staging before applying to production

## Open Questions

1. **Database region selection:** Which AWS region should we use? (Recommend us-east-1 for US-based users or eu-west-1 for EU)

2. **Backup retention policy:** How long should we retain database backups? (Supabase Pro provides 7-day point-in-time recovery)

3. **Admin user management:** Should we create a separate admin role with elevated RLS permissions, or handle admin access via service role key?

4. **Item expiration policy:** Should we automatically archive or delete items after a certain period (e.g., 90 days)? This affects schema design (soft delete vs hard delete).

5. **Image storage strategy:** Will item images be stored in Supabase Storage or external service (Cloudinary, S3)? This affects foreign key relationships.

6. **Search implementation:** Do we need full-text search from day one, or can we start with simple LIKE queries and add pg_trgm or external search later?
