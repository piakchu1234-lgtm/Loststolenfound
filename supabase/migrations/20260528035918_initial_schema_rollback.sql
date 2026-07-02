-- Rollback script for initial_schema migration
-- This script reverses all changes made in the up migration

-- Drop RLS policies first (in reverse order of creation)
DROP POLICY IF EXISTS "Admins can delete any found item" ON public.found_items;
DROP POLICY IF EXISTS "Admins can delete any lost item" ON public.lost_items;
DROP POLICY IF EXISTS "Admins can update any found item" ON public.found_items;
DROP POLICY IF EXISTS "Admins can update any lost item" ON public.lost_items;
DROP POLICY IF EXISTS "Admins can read all found items" ON public.found_items;
DROP POLICY IF EXISTS "Admins can read all lost items" ON public.lost_items;

DROP POLICY IF EXISTS "Users can delete own items" ON public.found_items;
DROP POLICY IF EXISTS "Users can update own items" ON public.found_items;
DROP POLICY IF EXISTS "Users can create items with own user_id" ON public.found_items;
DROP POLICY IF EXISTS "Users can read own items and public active items" ON public.found_items;

DROP POLICY IF EXISTS "Users can delete own items" ON public.lost_items;
DROP POLICY IF EXISTS "Users can update own items" ON public.lost_items;
DROP POLICY IF EXISTS "Users can create items with own user_id" ON public.lost_items;
DROP POLICY IF EXISTS "Users can read own items and public active items" ON public.lost_items;

DROP POLICY IF EXISTS "Anyone can read categories" ON public.categories;

DROP POLICY IF EXISTS "Users cannot delete profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can create own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile and public profiles" ON public.users;

-- Drop triggers
DROP TRIGGER IF EXISTS update_found_items_updated_at ON public.found_items;
DROP TRIGGER IF EXISTS update_lost_items_updated_at ON public.lost_items;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

-- Drop function
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS public.idx_found_items_coordinates;
DROP INDEX IF EXISTS public.idx_lost_items_coordinates;
DROP INDEX IF EXISTS public.idx_found_items_date_found;
DROP INDEX IF EXISTS public.idx_found_items_created_at;
DROP INDEX IF EXISTS public.idx_found_items_status;
DROP INDEX IF EXISTS public.idx_found_items_category_id;
DROP INDEX IF EXISTS public.idx_found_items_finder_id;
DROP INDEX IF EXISTS public.idx_lost_items_date_lost;
DROP INDEX IF EXISTS public.idx_lost_items_created_at;
DROP INDEX IF EXISTS public.idx_lost_items_status;
DROP INDEX IF EXISTS public.idx_lost_items_category_id;
DROP INDEX IF EXISTS public.idx_lost_items_reporter_id;
DROP INDEX IF EXISTS public.idx_users_email;

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS public.found_items;
DROP TABLE IF EXISTS public.lost_items;
DROP TABLE IF EXISTS public.categories;
DROP TABLE IF EXISTS public.users;
