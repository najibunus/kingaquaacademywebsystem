-- ═══════════════════════════════════════════════════════════════════
-- Migration 003: Classes Table
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.classes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,                          -- e.g. "ADV01", "BEG-SAT-9AM"
  type         public.class_type NOT NULL DEFAULT 'standard',
  description  TEXT,
  schedule     JSONB,                                  -- { day, start_time, end_time, location }
  coach_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  max_students INTEGER DEFAULT 20,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classes_coach_id  ON public.classes(coach_id);
CREATE INDEX idx_classes_type      ON public.classes(type);
CREATE INDEX idx_classes_is_active ON public.classes(is_active);

CREATE TRIGGER classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS: Classes ─────────────────────────────────────────────────
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Superadmin / Admin / Staff: full CRUD
CREATE POLICY "staff_all_classes" ON public.classes
  FOR ALL
  USING (public.has_role(ARRAY['superadmin','admin','staff']::public.user_role[]));

-- Coaches: read their own classes only
CREATE POLICY "coach_read_own_classes" ON public.classes
  FOR SELECT
  USING (
    public.has_role(ARRAY['coach']::public.user_role[])
    AND coach_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Parents: read all active classes (to see which class their child is in)
CREATE POLICY "parent_read_active_classes" ON public.classes
  FOR SELECT
  USING (
    public.has_role(ARRAY['parent']::public.user_role[])
    AND is_active = TRUE
  );
