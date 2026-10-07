-- ═══════════════════════════════════════════════════════════════════
-- Migration 002: Users Profile Table
-- Extends Supabase auth.users with app-specific profile data.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id       UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          public.user_role NOT NULL DEFAULT 'parent',
  display_name  TEXT NOT NULL,
  phone         TEXT,                          -- WhatsApp number for parents
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast auth_id lookups (used on every request)
CREATE INDEX idx_users_auth_id ON public.users(auth_id);
CREATE INDEX idx_users_role    ON public.users(role);

-- ── Auto-update updated_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Trigger: Auto-create user profile on auth signup ─────────────
-- When a new user signs up via Supabase Auth, this creates their
-- matching profile row in public.users automatically.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, display_name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'parent'),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Helper: Get current user's role ──────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.users
  WHERE auth_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── Helper: Check if current user has one of the given roles ─────
CREATE OR REPLACE FUNCTION public.has_role(required_roles public.user_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
    AND role = ANY(required_roles)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── RLS: Users table ─────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Superadmins see everyone
CREATE POLICY "superadmin_all_users" ON public.users
  FOR ALL
  USING (public.has_role(ARRAY['superadmin']::public.user_role[]));

-- Admins can read all users (for task assignment, oversight)
CREATE POLICY "admin_read_users" ON public.users
  FOR SELECT
  USING (public.has_role(ARRAY['superadmin', 'admin']::public.user_role[]));

-- Staff can read coaches and parents (for class management)
CREATE POLICY "staff_read_coaches_parents" ON public.users
  FOR SELECT
  USING (
    public.has_role(ARRAY['staff']::public.user_role[])
    AND role IN ('coach', 'parent', 'staff')
  );

-- Every user can read and update their own profile
CREATE POLICY "own_profile_read" ON public.users
  FOR SELECT
  USING (auth_id = auth.uid());

CREATE POLICY "own_profile_update" ON public.users
  FOR UPDATE
  USING (auth_id = auth.uid())
  WITH CHECK (
    auth_id = auth.uid()
    -- Prevent users from changing their own role
    AND role = (SELECT role FROM public.users WHERE auth_id = auth.uid())
  );
