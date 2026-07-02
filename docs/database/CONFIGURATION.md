# Database Configuration

This document describes the database configuration, environment variables, and connection settings.

## Environment Variables

### Required Variables

#### Public Variables (Safe for Browser)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

These variables are prefixed with `NEXT_PUBLIC_` and are safe to expose in the browser. The anon key has limited permissions enforced by Row Level Security.

#### Server-Only Variables (Never Expose)
```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service role key bypasses Row Level Security and should NEVER be exposed to the client. Use only in server-side code.

#### Database Connection Strings
```bash
# Direct connection (port 5432) - for migrations and admin tasks
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project-ref.supabase.co:5432/postgres

# Pooler connection (port 6543) - for application queries (recommended)
DATABASE_POOLER_URL=postgresql://postgres:[PASSWORD]@db.your-project-ref.supabase.co:6543/postgres
```

### Getting Your Credentials

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the following:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
4. Navigate to Settings > Database
5. Copy the connection strings (replace `[YOUR-PASSWORD]` with your database password)

## Connection Pooling

### Why Connection Pooling?

Serverless functions (like Next.js API routes) create new database connections for each request. Without pooling, you can quickly exhaust the database's connection limit.

### Supabase Connection Pooler

Supabase provides a built-in PgBouncer connection pooler:

- **Port 5432 (Direct)**: Direct connection to PostgreSQL
  - Use for: Migrations, admin tasks, long-running operations
  - Max connections: Limited by PostgreSQL (typically 100-500)
  
- **Port 6543 (Pooler)**: Connection through PgBouncer
  - Use for: Application queries, API routes, serverless functions
  - Max connections: Much higher (thousands)
  - Mode: Transaction mode (balances reuse with isolation)

### Configuration in Code

The Supabase client utilities automatically use the appropriate connection:

```typescript
// Browser client - uses anon key, no pooling needed
import { createClient } from '@/lib/supabase/client'

// Server client - uses anon key with cookie auth
import { createClient } from '@/lib/supabase/server'

// Database client - uses service role key with pooling
import { createPooledClient } from '@/lib/supabase/database'
```

### Pool Settings

Default PgBouncer settings (configured by Supabase):
- **Pool mode**: Transaction
- **Max client connections**: 200 (Free tier), 500+ (Pro tier)
- **Default pool size**: 15
- **Reserve pool**: 3

## SSL/TLS Configuration

All connections to Supabase use SSL/TLS encryption by default. The connection strings automatically include `sslmode=require`.

### Verifying SSL Connection

```sql
SELECT ssl_is_used();
-- Should return: true
```

## Connection Limits

### Free Tier
- Direct connections: 60 concurrent
- Pooled connections: 200 concurrent
- Database size: 500 MB

### Pro Tier
- Direct connections: 200 concurrent
- Pooled connections: 500 concurrent
- Database size: 8 GB

### Monitoring Connection Usage

Check current connections:
```sql
SELECT count(*) FROM pg_stat_activity;
```

Check connections by state:
```sql
SELECT state, count(*) 
FROM pg_stat_activity 
GROUP BY state;
```

## Credential Rotation

### Rotating Database Password

1. Generate new password in Supabase Dashboard (Settings > Database)
2. Update `DATABASE_URL` and `DATABASE_POOLER_URL` in all environments
3. Restart application to pick up new credentials
4. Old password remains valid for 24 hours (grace period)

### Rotating API Keys

1. Generate new keys in Supabase Dashboard (Settings > API)
2. Update environment variables in all environments
3. Deploy updated configuration
4. Old keys remain valid until explicitly revoked

## Security Best Practices

### Environment Variables
- ✅ Use `.env.local` for local development (never commit)
- ✅ Use platform secret management for production (Vercel, AWS, etc.)
- ✅ Rotate credentials regularly (every 90 days)
- ❌ Never commit `.env` files to version control
- ❌ Never expose service role key to client
- ❌ Never log connection strings or credentials

### Connection Strings
- ✅ Use pooler connection for application queries
- ✅ Use direct connection only for migrations
- ✅ Validate connection strings at startup
- ❌ Never hardcode connection strings in code
- ❌ Never expose database password in error messages

### Access Control
- ✅ Use anon key for client-side operations
- ✅ Use service role key only in server-side code
- ✅ Rely on Row Level Security for data access control
- ❌ Never bypass RLS in application code
- ❌ Never trust client-provided user IDs

## Troubleshooting

### Connection Refused
- Verify Supabase project is running
- Check firewall/network settings
- Verify connection string format
- Check if IP is whitelisted (if IP restrictions enabled)

### Too Many Connections
- Switch to pooler connection (port 6543)
- Reduce connection pool size in application
- Check for connection leaks (unclosed connections)
- Upgrade to higher tier if needed

### Authentication Failed
- Verify database password is correct
- Check if credentials have been rotated
- Ensure using correct project credentials
- Verify SSL mode is compatible

### Slow Queries
- Use pooler connection for better performance
- Add indexes on frequently queried columns
- Optimize query patterns
- Check connection pool utilization

## Configuration Files

### `.env.local` (Local Development)
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-key
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
DATABASE_POOLER_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### `.env.example` (Template)
Committed to version control as a template. Contains placeholder values.

### Vercel Environment Variables
Configure in Vercel Dashboard > Settings > Environment Variables:
- Set for Production, Preview, and Development environments
- Use different values for each environment
- Mark sensitive variables as "Secret"

## Additional Resources

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [PgBouncer Documentation](https://www.pgbouncer.org/config.html)
- [PostgreSQL Connection Management](https://www.postgresql.org/docs/current/runtime-config-connection.html)
