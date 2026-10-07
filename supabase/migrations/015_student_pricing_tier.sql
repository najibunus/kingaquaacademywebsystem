-- ═══════════════════════════════════════════════════════════════
-- Migration 015: Add pricing_tier to students, location_id to classes
-- ═══════════════════════════════════════════════════════════════

-- 1. Add pricing_tier to students
--    Staff set this when enrolling: 'Standard', 'Staff/Students', 'Mommy', etc.
ALTER TABLE public.students
  ADD COLUMN pricing_tier TEXT NOT NULL DEFAULT 'Standard';

-- 2. Add location_id to classes so the pricing lookup can join correctly
ALTER TABLE public.classes
  ADD COLUMN location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;
