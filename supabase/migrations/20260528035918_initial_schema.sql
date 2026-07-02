-- Initial schema for Lost and Found application
-- Creates tables, indexes, constraints, and Row Level Security policies

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lost items table
CREATE TABLE IF NOT EXISTS public.lost_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    location TEXT NOT NULL,
    coordinates POINT,
    date_lost DATE NOT NULL,
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matched', 'claimed', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Found items table
CREATE TABLE IF NOT EXISTS public.found_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    location TEXT NOT NULL,
    coordinates POINT,
    date_found DATE NOT NULL,
    finder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matched', 'claimed', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Lost items indexes
CREATE INDEX IF NOT EXISTS idx_lost_items_reporter_id ON public.lost_items(reporter_id);
CREATE INDEX IF NOT EXISTS idx_lost_items_category_id ON public.lost_items(category_id);
CREATE INDEX IF NOT EXISTS idx_lost_items_status ON public.lost_items(status);
CREATE INDEX IF NOT EXISTS idx_lost_items_created_at ON public.lost_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lost_items_date_lost ON public.lost_items(date_lost DESC);

-- Found items indexes
CREATE INDEX IF NOT EXISTS idx_found_items_finder_id ON public.found_items(finder_id);
CREATE INDEX IF NOT EXISTS idx_found_items_category_id ON public.found_items(category_id);
CREATE INDEX IF NOT EXISTS idx_found_items_status ON public.found_items(status);
CREATE INDEX IF NOT EXISTS idx_found_items_created_at ON public.found_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_found_items_date_found ON public.found_items(date_found DESC);

-- Geographic indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_lost_items_coordinates ON public.lost_items USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_found_items_coordinates ON public.found_items USING GIST(coordinates);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Triggers for lost_items table
CREATE TRIGGER update_lost_items_updated_at
    BEFORE UPDATE ON public.lost_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Triggers for found_items table
CREATE TRIGGER update_found_items_updated_at
    BEFORE UPDATE ON public.found_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SEED DATA - Categories
-- ============================================================================

INSERT INTO public.categories (name, description) VALUES
    ('electronics', 'Electronic devices, phones, laptops, tablets, etc.'),
    ('documents', 'IDs, passports, licenses, papers, etc.'),
    ('accessories', 'Jewelry, watches, bags, wallets, etc.'),
    ('pets', 'Lost or found pets'),
    ('other', 'Items that do not fit other categories')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.found_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - USERS TABLE
-- ============================================================================

-- Users can read their own profile and public profiles of others
CREATE POLICY "Users can read own profile and public profiles"
    ON public.users
    FOR SELECT
    USING (true);

-- Users can insert their own profile only
CREATE POLICY "Users can create own profile"
    ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can update their own profile only
CREATE POLICY "Users can update own profile"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users cannot delete profiles (handled by auth.users cascade)
CREATE POLICY "Users cannot delete profiles"
    ON public.users
    FOR DELETE
    USING (false);

-- ============================================================================
-- RLS POLICIES - CATEGORIES TABLE
-- ============================================================================

-- Everyone can read categories
CREATE POLICY "Anyone can read categories"
    ON public.categories
    FOR SELECT
    USING (true);

-- Only admins can modify categories (via service role)
-- No INSERT/UPDATE/DELETE policies for regular users

-- ============================================================================
-- RLS POLICIES - LOST_ITEMS TABLE
-- ============================================================================

-- Users can read their own items and public active items
CREATE POLICY "Users can read own items and public active items"
    ON public.lost_items
    FOR SELECT
    USING (
        auth.uid() = reporter_id
        OR status = 'active'
    );

-- Users can create items with their own user_id
CREATE POLICY "Users can create items with own user_id"
    ON public.lost_items
    FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

-- Users can update their own items only
CREATE POLICY "Users can update own items"
    ON public.lost_items
    FOR UPDATE
    USING (auth.uid() = reporter_id)
    WITH CHECK (auth.uid() = reporter_id);

-- Users can delete their own items only
CREATE POLICY "Users can delete own items"
    ON public.lost_items
    FOR DELETE
    USING (auth.uid() = reporter_id);

-- ============================================================================
-- RLS POLICIES - FOUND_ITEMS TABLE
-- ============================================================================

-- Users can read their own items and public active items
CREATE POLICY "Users can read own items and public active items"
    ON public.found_items
    FOR SELECT
    USING (
        auth.uid() = finder_id
        OR status = 'active'
    );

-- Users can create items with their own user_id
CREATE POLICY "Users can create items with own user_id"
    ON public.found_items
    FOR INSERT
    WITH CHECK (auth.uid() = finder_id);

-- Users can update their own items only
CREATE POLICY "Users can update own items"
    ON public.found_items
    FOR UPDATE
    USING (auth.uid() = finder_id)
    WITH CHECK (auth.uid() = finder_id);

-- Users can delete their own items only
CREATE POLICY "Users can delete own items"
    ON public.found_items
    FOR DELETE
    USING (auth.uid() = finder_id);

-- ============================================================================
-- ADMIN ROLE POLICIES (using JWT claims)
-- ============================================================================

-- Admin users can read all items regardless of status
CREATE POLICY "Admins can read all lost items"
    ON public.lost_items
    FOR SELECT
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

CREATE POLICY "Admins can read all found items"
    ON public.found_items
    FOR SELECT
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

-- Admin users can update any item
CREATE POLICY "Admins can update any lost item"
    ON public.lost_items
    FOR UPDATE
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

CREATE POLICY "Admins can update any found item"
    ON public.found_items
    FOR UPDATE
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

-- Admin users can delete any item
CREATE POLICY "Admins can delete any lost item"
    ON public.lost_items
    FOR DELETE
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

CREATE POLICY "Admins can delete any found item"
    ON public.found_items
    FOR DELETE
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE public.categories IS 'Item categories for classification';
COMMENT ON TABLE public.lost_items IS 'Items reported as lost';
COMMENT ON TABLE public.found_items IS 'Items reported as found';

COMMENT ON COLUMN public.lost_items.coordinates IS 'Geographic coordinates as POINT(longitude, latitude)';
COMMENT ON COLUMN public.found_items.coordinates IS 'Geographic coordinates as POINT(longitude, latitude)';
COMMENT ON COLUMN public.lost_items.status IS 'Item status: active, matched, claimed, or expired';
COMMENT ON COLUMN public.found_items.status IS 'Item status: active, matched, claimed, or expired';
