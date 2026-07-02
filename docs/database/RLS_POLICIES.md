# Row Level Security (RLS) Policies

This document describes the Row Level Security policies implemented in the database to control data access.

## Overview

Row Level Security (RLS) is enabled on all tables containing user data. RLS policies enforce access control at the database level, preventing unauthorized access even if application-level security is bypassed.

## Authentication Context

All RLS policies use Supabase's authentication context:
- `auth.uid()` - Returns the authenticated user's ID from the JWT token
- `auth.jwt()` - Returns the full JWT token for accessing custom claims

## Users Table

### SELECT Policy: "Users can read own profile and public profiles"
- **Allows:** All authenticated users can read any user profile
- **Use case:** Displaying user information for item reporters/finders

### INSERT Policy: "Users can create own profile"
- **Allows:** Users can only create profiles with their own user ID
- **Prevents:** Creating profiles for other users

### UPDATE Policy: "Users can update own profile"
- **Allows:** Users can only update their own profile
- **Prevents:** Modifying other users' profiles

### DELETE Policy: "Users cannot delete profiles"
- **Denies:** All profile deletions
- **Note:** Profile deletion is handled automatically when auth.users record is deleted (CASCADE)

## Categories Table

### SELECT Policy: "Anyone can read categories"
- **Allows:** All users (including anonymous) can read categories
- **Use case:** Displaying category options in forms

### Modification Policies
- **No INSERT/UPDATE/DELETE policies for regular users**
- **Admin access:** Categories can only be modified via service role key

## Lost Items Table

### SELECT Policy: "Users can read own items and public active items"
- **Allows:**
  - Users can read their own lost items (any status)
  - Users can read active items from other users
- **Prevents:** Reading non-active items from other users

### INSERT Policy: "Users can create items with own user_id"
- **Allows:** Creating lost items with reporter_id = auth.uid()
- **Prevents:** Creating items on behalf of other users

### UPDATE Policy: "Users can update own items"
- **Allows:** Updating only items where reporter_id = auth.uid()
- **Prevents:** Modifying other users' items

### DELETE Policy: "Users can delete own items"
- **Allows:** Deleting only items where reporter_id = auth.uid()
- **Prevents:** Deleting other users' items

## Found Items Table

### SELECT Policy: "Users can read own items and public active items"
- **Allows:**
  - Users can read their own found items (any status)
  - Users can read active items from other users
- **Prevents:** Reading non-active items from other users

### INSERT Policy: "Users can create items with own user_id"
- **Allows:** Creating found items with finder_id = auth.uid()
- **Prevents:** Creating items on behalf of other users

### UPDATE Policy: "Users can update own items"
- **Allows:** Updating only items where finder_id = auth.uid()
- **Prevents:** Modifying other users' items

### DELETE Policy: "Users can delete own items"
- **Allows:** Deleting only items where finder_id = auth.uid()
- **Prevents:** Deleting other users' items

## Admin Role Policies

Admin users have elevated permissions via JWT claims. To grant admin access, set `user_metadata.role = 'admin'` in the user's auth record.

### Admin SELECT Policies
- **"Admins can read all lost items"**
- **"Admins can read all found items"**
- Allows admins to view all items regardless of status

### Admin UPDATE Policies
- **"Admins can update any lost item"**
- **"Admins can update any found item"**
- Allows admins to modify any item (e.g., marking as matched, changing status)

### Admin DELETE Policies
- **"Admins can delete any lost item"**
- **"Admins can delete any found item"**
- Allows admins to remove inappropriate or spam items

## Testing RLS Policies

### Test as Regular User
```sql
-- Set user context
SET request.jwt.claims = '{"sub": "user-uuid-here"}';

-- Test queries
SELECT * FROM lost_items; -- Should only see own items + active items
UPDATE lost_items SET status = 'claimed' WHERE id = 'item-id'; -- Should only work for own items
```

### Test as Admin
```sql
-- Set admin context
SET request.jwt.claims = '{"sub": "admin-uuid", "user_metadata": {"role": "admin"}}';

-- Test queries
SELECT * FROM lost_items; -- Should see all items
UPDATE lost_items SET status = 'claimed' WHERE id = 'any-item-id'; -- Should work for any item
```

### Test as Anonymous User
```sql
-- Clear user context
RESET request.jwt.claims;

-- Test queries
SELECT * FROM lost_items; -- Should only see active items
INSERT INTO lost_items (...) VALUES (...); -- Should fail
```

## Performance Considerations

### Indexes for RLS
All columns used in RLS policies are indexed:
- `lost_items.reporter_id` - Index for ownership checks
- `found_items.finder_id` - Index for ownership checks
- `lost_items.status` - Index for status filtering
- `found_items.status` - Index for status filtering

### Query Performance
RLS policies add a WHERE clause to every query. Use EXPLAIN ANALYZE to verify performance:

```sql
EXPLAIN ANALYZE
SELECT * FROM lost_items WHERE category_id = 'some-uuid';
```

Look for:
- Index scans (good) vs sequential scans (bad)
- Low execution time (<100ms for simple queries)
- Efficient policy evaluation

## Security Best Practices

1. **Never bypass RLS** - Always use authenticated Supabase clients
2. **Service role key** - Only use service role key for admin operations, never expose to client
3. **Test policies** - Verify policies work as expected before deploying
4. **Monitor access** - Log and monitor policy violations
5. **Regular audits** - Review policies periodically for security gaps

## Troubleshooting

### Policy Not Working
- Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
- Check policy exists: `SELECT * FROM pg_policies WHERE tablename = 'your_table';`
- Verify JWT claims: Check that auth.uid() returns expected user ID

### Performance Issues
- Add indexes on columns used in policy conditions
- Simplify complex policy logic
- Use EXPLAIN ANALYZE to identify bottlenecks

### Access Denied Errors
- Verify user is authenticated
- Check that policy conditions match the operation
- Ensure JWT contains required claims for admin operations
