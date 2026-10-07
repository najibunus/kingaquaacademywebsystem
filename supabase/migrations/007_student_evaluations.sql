-- ═══════════════════════════════════════════════════════════════════
-- Migration 007: Student Evaluations Table
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.student_evaluations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  coach_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  class_id      UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  
  -- Evaluation data
  star_rating   INTEGER CHECK (star_rating BETWEEN 1 AND 5),
  comments      TEXT NOT NULL,
  
  -- If linked to a specific curriculum/syllabus skill (Phase 2+)
  skill_tag     TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evaluations_student_id ON public.student_evaluations(student_id);
CREATE INDEX idx_evaluations_coach_id   ON public.student_evaluations(coach_id);

CREATE TRIGGER evaluations_updated_at
  BEFORE UPDATE ON public.student_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS: Student Evaluations ─────────────────────────────────────
ALTER TABLE public.student_evaluations ENABLE ROW LEVEL SECURITY;

-- Staff/Admin: full access
CREATE POLICY "staff_all_evaluations" ON public.student_evaluations
  FOR ALL
  USING (public.has_role(ARRAY['superadmin','admin','staff']::public.user_role[]));

-- Coaches: manage evaluations they wrote, read all evaluations for students in their classes
CREATE POLICY "coach_manage_own_evaluations" ON public.student_evaluations
  FOR ALL
  USING (
    public.has_role(ARRAY['coach']::public.user_role[])
    AND coach_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "coach_read_class_evaluations" ON public.student_evaluations
  FOR SELECT
  USING (
    public.has_role(ARRAY['coach']::public.user_role[])
    AND class_id IN (
      SELECT id FROM public.classes WHERE coach_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );

-- Parents: read evaluations for their children
CREATE POLICY "parent_read_own_child_evals" ON public.student_evaluations
  FOR SELECT
  USING (
    public.has_role(ARRAY['parent']::public.user_role[])
    AND student_id IN (
      SELECT id FROM public.students WHERE parent_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );
