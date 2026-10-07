-- ═══════════════════════════════════════════════════════════════
-- Migration 014: Locations & Class Pricing
-- ═══════════════════════════════════════════════════════════════

-- ── 1. LOCATIONS TABLE ──────────────────────────────────────────
CREATE TABLE public.locations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the three official venues
INSERT INTO public.locations (name) VALUES
  ('UTHM'),
  ('Pura Kencana'),
  ('Pontian');

-- RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_locations" ON public.locations
  FOR SELECT USING (true);

CREATE POLICY "staff_manage_locations" ON public.locations
  FOR ALL USING (
    public.has_role(ARRAY['superadmin','admin','staff']::public.user_role[])
  );


-- ── 2. CLASS PRICING TABLE ──────────────────────────────────────
CREATE TABLE public.class_pricing (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     UUID    NOT NULL REFERENCES public.classes(id)   ON DELETE CASCADE,
  location_id  UUID    NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,

  price        NUMERIC(10, 2) NOT NULL CHECK (price >= 0),

  -- 'per_student' → invoice amount = price × number of students
  -- 'per_group'   → invoice amount = price (flat, regardless of headcount)
  billing_type TEXT NOT NULL DEFAULT 'per_student'
                CHECK (billing_type IN ('per_student', 'per_group')),

  -- Pricing tier label shown to staff
  -- e.g. 'Standard', 'Mommy', 'Staff'
  tier         TEXT NOT NULL DEFAULT 'Standard',

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Multiple tiers allowed per class-location pair
  UNIQUE (class_id, location_id, tier)
);

CREATE INDEX idx_class_pricing_class_id    ON public.class_pricing(class_id);
CREATE INDEX idx_class_pricing_location_id ON public.class_pricing(location_id);

CREATE TRIGGER class_pricing_updated_at
  BEFORE UPDATE ON public.class_pricing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.class_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_class_pricing" ON public.class_pricing
  FOR SELECT USING (true);

CREATE POLICY "staff_manage_class_pricing" ON public.class_pricing
  FOR ALL USING (
    public.has_role(ARRAY['superadmin','admin','staff']::public.user_role[])
  );
