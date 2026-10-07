-- ═══════════════════════════════════════════════════════════════════
-- Migration 006: Coach Attendance Table
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.coach_attendance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  class_id     UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  status       public.attendance_status NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (coach_id, class_id, date)
);

CREATE INDEX idx_coach_attendance_coach_id ON public.coach_attendance(coach_id);
CREATE INDEX idx_coach_attendance_date     ON public.coach_attendance(date);

CREATE TRIGGER coach_attendance_updated_at
  BEFORE UPDATE ON public.coach_attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS: Coach Attendance ────────────────────────────────────────
ALTER TABLE public.coach_attendance ENABLE ROW LEVEL SECURITY;

-- Staff/Admin: full access
CREATE POLICY "staff_all_coach_attendance" ON public.coach_attendance
  FOR ALL
  USING (public.has_role(ARRAY['superadmin','admin','staff']::public.user_role[]));

-- Coaches: manage their own attendance
CREATE POLICY "coach_manage_own_attendance" ON public.coach_attendance
  FOR ALL
  USING (
    public.has_role(ARRAY['coach']::public.user_role[])
    AND coach_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );
