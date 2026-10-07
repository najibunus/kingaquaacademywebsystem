-- ═══════════════════════════════════════════════════════════════════
-- Migration 004: Students Table
-- Uses SERIAL auto-increment as a temporary Primary Key (temp_id)
-- so staff can identify students before real IC numbers are collected.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.students (
  -- Auto-incrementing temp ID — used until real IC is collected
  temp_id       SERIAL,
  -- Actual PK is UUID for FK consistency
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity fields
  name          TEXT NOT NULL,
  real_ic       TEXT,              -- nullable until bulk-updated
  date_of_birth DATE,
  gender        TEXT CHECK (gender IN ('male','female','other')),

  -- Relationships
  class_id      UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  parent_id     UUID REFERENCES public.users(id)   ON DELETE SET NULL,

  -- Session tracking (for 4-session billing rule)
  session_count INTEGER NOT NULL DEFAULT 0 CHECK (session_count >= 0),

  -- Status
  status        public.student_status NOT NULL DEFAULT 'active',
  notes         TEXT,

  -- Duplicate detection helper
  -- Set TRUE when name collision detected; cleared when IC is assigned
  is_duplicate_flag BOOLEAN NOT NULL DEFAULT FALSE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint — temp_id is unique within the table (auto-handled by SERIAL)
CREATE UNIQUE INDEX idx_students_temp_id ON public.students(temp_id);

-- Partial index: quickly find students with no IC yet
CREATE INDEX idx_students_no_ic      ON public.students(id) WHERE real_ic IS NULL;
CREATE INDEX idx_students_class_id   ON public.students(class_id);
CREATE INDEX idx_students_parent_id  ON public.students(parent_id);
CREATE INDEX idx_students_name_trgm  ON public.students USING gin (name gin_trgm_ops);
CREATE INDEX idx_students_status     ON public.students(status);

-- Enable trigram extension for fuzzy name search / duplicate detection
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Trigger: flag duplicates when a new student is inserted ──────
CREATE OR REPLACE FUNCTION public.flag_student_duplicates()
RETURNS TRIGGER AS $$
BEGIN
  -- If another active student has the same name, flag both
  IF EXISTS (
    SELECT 1 FROM public.students
    WHERE name = NEW.name
    AND id != NEW.id
    AND status = 'active'
  ) THEN
    NEW.is_duplicate_flag := TRUE;
    -- Also flag the existing one
    UPDATE public.students
    SET is_duplicate_flag = TRUE
    WHERE name = NEW.name AND id != NEW.id AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_student_inserted
  BEFORE INSERT ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.flag_student_duplicates();

-- ── RLS: Students ────────────────────────────────────────────────
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Superadmin / Admin / Staff: full access
CREATE POLICY "staff_all_students" ON public.students
  FOR ALL
  USING (public.has_role(ARRAY['superadmin','admin','staff']::public.user_role[]));

-- Coaches: read students in their classes only
CREATE POLICY "coach_read_own_class_students" ON public.students
  FOR SELECT
  USING (
    public.has_role(ARRAY['coach']::public.user_role[])
    AND class_id IN (
      SELECT id FROM public.classes
      WHERE coach_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );

-- Parents: read only their own children
CREATE POLICY "parent_read_own_children" ON public.students
  FOR SELECT
  USING (
    public.has_role(ARRAY['parent']::public.user_role[])
    AND parent_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );
