-- ═══════════════════════════════════════════════════════════════════
-- Migration 010: Audit Logs Table
-- Immutable ledger for tracking system changes and actions.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who did it
  actor_id     UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Null if system/cron
  actor_role   TEXT NOT NULL,
  
  -- What they did
  action       TEXT NOT NULL,                  -- e.g., 'invoice_generated', 'student_promoted'
  entity_type  TEXT NOT NULL,                  -- e.g., 'invoice', 'student'
  entity_id    UUID,                           -- ID of the affected record
  
  -- The changes
  old_data     JSONB,
  new_data     JSONB,
  
  -- When and where
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_id    ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity      ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at  ON public.audit_logs(created_at DESC);

-- ── Helper: Write Audit Log ──────────────────────────────────────
-- Can be called from other triggers or server actions
CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_actor_id UUID,
  p_actor_role TEXT,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, old_data, new_data)
  VALUES (p_actor_id, p_actor_role, p_action, p_entity_type, p_entity_id, p_old_data, p_new_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RLS: Audit Logs ──────────────────────────────────────────────
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Superadmins can read all logs
CREATE POLICY "superadmin_read_audit_logs" ON public.audit_logs
  FOR SELECT
  USING (public.has_role(ARRAY['superadmin']::public.user_role[]));

-- NO ONE CAN UPDATE OR DELETE AUDIT LOGS.
-- (PostgreSQL does not allow policies to bypass this restriction natively if we don't grant it).
