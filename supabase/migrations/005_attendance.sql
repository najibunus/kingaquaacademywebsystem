-- ═══════════════════════════════════════════════════════════════════
-- Migration 005: Attendance Table
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id      UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  status        public.attendance_status NOT NULL,
  recorded_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent multiple records for same student + class + date
  UNIQUE (student_id, class_id, date)
);

CREATE INDEX idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX idx_attendance_class_id   ON public.attendance(class_id);
CREATE INDEX idx_attendance_date       ON public.attendance(date);

CREATE TRIGGER attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Trigger: Increment student session count on 'present' ─────────
-- Required for the 4-session billing rule.
CREATE OR REPLACE FUNCTION public.increment_student_session_count()
RETURNS TRIGGER AS $$
BEGIN
  -- If new record is present, increment
  IF (TG_OP = 'INSERT' AND NEW.status = 'present') THEN
    UPDATE public.students SET session_count = session_count + 1 WHERE id = NEW.student_id;
  END IF;

  -- If status changes to present from something else
  IF (TG_OP = 'UPDATE' AND NEW.status = 'present' AND OLD.status != 'present') THEN
    UPDATE public.students SET session_count = session_count + 1 WHERE id = NEW.student_id;
  END IF;

  -- If status changes from present to something else
  IF (TG_OP = 'UPDATE' AND OLD.status = 'present' AND NEW.status != 'present') THEN
    UPDATE public.students SET session_count = GREATEST(0, session_count - 1) WHERE id = NEW.student_id;
  END IF;

  -- If a present record is deleted
  IF (TG_OP = 'DELETE' AND OLD.status = 'present') THEN
    UPDATE public.students SET session_count = GREATEST(0, session_count - 1) WHERE id = OLD.student_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_attendance_change
  AFTER INSERT OR UPDATE OR DELETE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.increment_student_session_count();

-- ── RLS: Attendance ──────────────────────────────────────────────
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Staff/Admin: full access
CREATE POLICY "staff_all_attendance" ON public.attendance
  FOR ALL
  USING (public.has_role(ARRAY['superadmin','admin','staff']::public.user_role[]));

-- Coaches: read/write attendance for their own classes
CREATE POLICY "coach_manage_own_class_attendance" ON public.attendance
  FOR ALL
  USING (
    public.has_role(ARRAY['coach']::public.user_role[])
    AND class_id IN (
      SELECT id FROM public.classes WHERE coach_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );

-- Parents: read attendance for their own children
CREATE POLICY "parent_read_own_child_attendance" ON public.attendance
  FOR SELECT
  USING (
    public.has_role(ARRAY['parent']::public.user_role[])
    AND student_id IN (
      SELECT id FROM public.students WHERE parent_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );
