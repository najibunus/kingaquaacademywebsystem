-- ═══════════════════════════════════════════════════════════════════
-- Migration 011: Payment Providers Table (For Webhooks)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.payment_providers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name  TEXT UNIQUE NOT NULL,      -- 'toyyibpay', 'billplz', 'bank_transfer'
  is_active      BOOLEAN NOT NULL DEFAULT FALSE,
  config_json    JSONB,                     -- Public configuration keys if needed
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER payment_providers_updated_at
  BEFORE UPDATE ON public.payment_providers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS: Payment Providers ───────────────────────────────────────
ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;

-- Anyone can read active payment providers
CREATE POLICY "read_active_payment_providers" ON public.payment_providers
  FOR SELECT
  USING (is_active = TRUE);

-- Superadmin only can manage
CREATE POLICY "superadmin_manage_payment_providers" ON public.payment_providers
  FOR ALL
  USING (public.has_role(ARRAY['superadmin']::public.user_role[]));

-- ── Seed Default Provider ────────────────────────────────────────
INSERT INTO public.payment_providers (provider_name, is_active)
VALUES ('bank_transfer', TRUE)
ON CONFLICT (provider_name) DO NOTHING;
