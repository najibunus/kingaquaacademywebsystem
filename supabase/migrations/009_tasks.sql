-- ═══════════════════════════════════════════════════════════════════
-- Migration 009: Tasks Table (Staff Board)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  
  -- Assignments
  created_by    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_to   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Status & Priority
  status        public.task_status NOT NULL DEFAULT 'pending',
  is_pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  due_date      TIMESTAMPTZ,
  
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status      ON public.tasks(status);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS: Tasks ───────────────────────────────────────────────────
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Superadmin/Admin: full access to all tasks
CREATE POLICY "admin_all_tasks" ON public.tasks
  FOR ALL
  USING (public.has_role(ARRAY['superadmin','admin']::public.user_role[]));

-- Staff: read all tasks (so they see the shared board), update tasks they are assigned to
CREATE POLICY "staff_read_tasks" ON public.tasks
  FOR SELECT
  USING (public.has_role(ARRAY['staff']::public.user_role[]));

CREATE POLICY "staff_update_tasks" ON public.tasks
  FOR UPDATE
  USING (
    public.has_role(ARRAY['staff']::public.user_role[])
    AND assigned_to = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    -- Prevent staff from reassigning tasks to others or changing creators
    assigned_to = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );
