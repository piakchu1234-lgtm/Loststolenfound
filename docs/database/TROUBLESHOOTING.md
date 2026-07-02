# Database Troubleshooting Guide

This guide covers common database issues and their solutions.

## Connection Issues

### Error: "Connection refused"

**Symptoms:**
- Cannot connect to database
- Error message: "ECONNREFUSED" or "Connection refused"

**Possible Causes & Solutions:**

1. **Local Supabase not running**
   ```bash
   # Check if Docker is running
   docker ps
   
   # Start Supabase
   supabase start
   ```

2. **Wrong connection string**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
   - Check for typos in project URL
   - Ensure using correct port (5432 for direct, 6543 for pooler)

3. **Firewall blocking connection**
   - Check firewall settings
   - Verify network connectivity
   - Try from different network

### Error: "Too many connections"

**Symptoms:**
- Error: "FATAL: sorry, too many clients already"
- Application becomes unresponsive

**Solutions:**

1. **Switch to connection pooler**
   ```typescript
   // Use pooler connection (port 6543)
   const url = process.env.DATABASE_POOLER_URL
   ```

2. **Check for connection leaks**
   ```sql
   -- View active connections
   SELECT count(*), state 
   FROM pg_stat_activity 
   GROUP BY state;
   
   -- Kill idle connections
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE state = 'idle' 
   AND state_change < now() - interval '5 minutes';
   ```

3. **Upgrade Supabase tier**
   - Free tier: 60 direct connections
   - Pro tier: 200+ direct connections

### Error: "Authentication failed"

**Symptoms:**
- Error: "password authentication failed"
- Cannot connect with credentials

**Solutions:**

1. **Verify credentials**
   - Check database password in Supabase Dashboard
   - Ensure `.env.local` has correct password
   - Look for special characters that need escaping

2. **Rotate credentials**
   ```bash
   # Generate new password in Supabase Dashboard
   # Update .env.local
   # Restart application
   ```

3. **Check SSL mode**
   - Supabase requires SSL
   - Connection string should include `sslmode=require`

## Migration Issues

### Error: "Migration already applied"

**Symptoms:**
- Migration fails with "already exists" error
- Duplicate key violations

**Solutions:**

1. **Check migration status**
   ```bash
   supabase migration list
   ```

2. **Use idempotent SQL**
   ```sql
   -- Good: idempotent
   CREATE TABLE IF NOT EXISTS users (...);
   
   -- Bad: not idempotent
   CREATE TABLE users (...);
   ```

3. **Reset local database**
   ```bash
   supabase db reset
   ```

### Error: "Migration failed to apply"

**Symptoms:**
- Migration stops with SQL error
- Database in inconsistent state

**Solutions:**

1. **Check SQL syntax**
   - Review migration file for errors
   - Test SQL in Supabase SQL Editor

2. **Check dependencies**
   - Ensure tables exist before adding foreign keys
   - Create tables in correct order

3. **Rollback and fix**
   ```bash
   # Rollback failed migration
   supabase migration down
   
   # Fix migration file
   # Apply again
   supabase migration up
   ```

### Error: "Cannot rollback migration"

**Symptoms:**
- Rollback fails
- Data loss concerns

**Solutions:**

1. **Check rollback script exists**
   - Ensure down migration is defined
   - Verify rollback SQL is correct

2. **Manual rollback**
   ```sql
   -- Manually reverse changes
   DROP TABLE IF EXISTS new_table;
   ALTER TABLE old_table DROP COLUMN IF EXISTS new_column;
   ```

3. **Restore from backup**
   - Use Supabase point-in-time recovery (Pro tier)
   - Restore from manual backup

## Row Level Security Issues

### Error: "Row level security policy violation"

**Symptoms:**
- Queries return no results
- INSERT/UPDATE/DELETE operations fail silently

**Solutions:**

1. **Check authentication**
   ```typescript
   const { data: { user } } = await supabase.auth.getUser()
   console.log('User ID:', user?.id) // Should not be null
   ```

2. **Verify RLS policies**
   ```sql
   -- Check if RLS is enabled
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   
   -- View policies
   SELECT * FROM pg_policies 
   WHERE tablename = 'your_table';
   ```

3. **Test with service role**
   ```typescript
   // Bypass RLS for testing (server-side only!)
   const supabase = createClient(url, serviceRoleKey)
   ```

### Error: "Permission denied for table"

**Symptoms:**
- Cannot read/write to table
- Error: "permission denied"

**Solutions:**

1. **Check table permissions**
   ```sql
   -- Grant permissions
   GRANT ALL ON public.your_table TO authenticated;
   GRANT ALL ON public.your_table TO anon;
   ```

2. **Verify RLS is enabled**
   ```sql
   ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;
   ```

3. **Check policy conditions**
   - Ensure policy USING clause is correct
   - Verify auth.uid() returns expected value

## Performance Issues

### Slow Queries

**Symptoms:**
- Queries take >1 second
- Application feels sluggish

**Solutions:**

1. **Add indexes**
   ```sql
   -- Check missing indexes
   SELECT schemaname, tablename, attname
   FROM pg_stats
   WHERE schemaname = 'public'
   AND n_distinct > 100
   AND correlation < 0.5;
   
   -- Add index
   CREATE INDEX idx_table_column ON table(column);
   ```

2. **Analyze query plan**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM lost_items WHERE category_id = 'uuid';
   ```

3. **Optimize RLS policies**
   - Simplify policy conditions
   - Add indexes on policy columns
   - Use materialized views for complex policies

### High Connection Pool Usage

**Symptoms:**
- Connection pool near capacity
- Intermittent connection errors

**Solutions:**

1. **Monitor pool usage**
   ```typescript
   import { logConnectionPoolMetrics } from '@/lib/supabase/monitoring'
   
   // Log metrics periodically
   logConnectionPoolMetrics({
     active: 45,
     idle: 10,
     waiting: 2,
     total: 60,
     timestamp: new Date().toISOString()
   })
   ```

2. **Reduce connection lifetime**
   - Close connections after use
   - Use connection pooling
   - Implement connection timeout

3. **Scale up**
   - Upgrade to Pro tier
   - Increase pool size
   - Use read replicas

## Data Issues

### Error: "Foreign key constraint violation"

**Symptoms:**
- Cannot insert/update records
- Error: "violates foreign key constraint"

**Solutions:**

1. **Check referenced record exists**
   ```sql
   -- Verify parent record exists
   SELECT * FROM categories WHERE id = 'uuid';
   ```

2. **Use correct UUID**
   - Ensure using valid UUID format
   - Check for typos in IDs

3. **Handle cascading deletes**
   ```sql
   -- Check cascade rules
   SELECT
     tc.table_name,
     kcu.column_name,
     ccu.table_name AS foreign_table_name,
     ccu.column_name AS foreign_column_name,
     rc.delete_rule
   FROM information_schema.table_constraints AS tc
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   JOIN information_schema.referential_constraints AS rc
     ON rc.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY';
   ```

### Error: "Unique constraint violation"

**Symptoms:**
- Cannot insert duplicate values
- Error: "duplicate key value violates unique constraint"

**Solutions:**

1. **Check for existing record**
   ```sql
   SELECT * FROM users WHERE email = 'user@example.com';
   ```

2. **Use UPSERT**
   ```typescript
   const { data, error } = await supabase
     .from('users')
     .upsert({ email: 'user@example.com', ... })
   ```

3. **Handle conflicts**
   ```sql
   INSERT INTO users (email, display_name)
   VALUES ('user@example.com', 'User')
   ON CONFLICT (email) DO UPDATE
   SET display_name = EXCLUDED.display_name;
   ```

## Environment Issues

### Error: "Environment variable not defined"

**Symptoms:**
- Application crashes on startup
- Error: "Cannot read property of undefined"

**Solutions:**

1. **Check .env.local exists**
   ```bash
   ls -la .env.local
   ```

2. **Verify all required variables**
   ```bash
   # Compare with .env.example
   diff .env.example .env.local
   ```

3. **Restart development server**
   ```bash
   # Stop server (Ctrl+C)
   # Start again
   npm run dev
   ```

### Error: "Invalid Supabase URL"

**Symptoms:**
- Cannot initialize Supabase client
- Error: "Invalid URL"

**Solutions:**

1. **Check URL format**
   ```bash
   # Should be: https://your-project.supabase.co
   echo $NEXT_PUBLIC_SUPABASE_URL
   ```

2. **Remove trailing slash**
   ```bash
   # Wrong: https://your-project.supabase.co/
   # Right: https://your-project.supabase.co
   ```

3. **Verify project exists**
   - Check Supabase Dashboard
   - Ensure project is not paused

## Health Check Issues

### Health Check Returns 503

**Symptoms:**
- `/api/health/database` returns unhealthy status
- Database appears down

**Solutions:**

1. **Check database connectivity**
   ```bash
   # Test connection
   psql $DATABASE_URL -c "SELECT 1"
   ```

2. **Review error logs**
   ```bash
   # Check application logs
   npm run dev
   # Look for database errors
   ```

3. **Verify credentials**
   - Check environment variables
   - Test with Supabase SQL Editor

## Getting Help

### Collect Diagnostic Information

```bash
# Supabase status
supabase status

# Database version
psql $DATABASE_URL -c "SELECT version()"

# Connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"

# Recent errors
psql $DATABASE_URL -c "SELECT * FROM pg_stat_database WHERE datname = 'postgres'"
```

### Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Project Issues](https://github.com/your-repo/issues)

### Support Channels

1. **Supabase Support** - For infrastructure issues
2. **Team Chat** - For application-specific issues
3. **GitHub Issues** - For bug reports and feature requests
