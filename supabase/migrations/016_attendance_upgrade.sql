-- Phase 1: Database Upgrade (Precision Tracking)

-- 1. Remove the unique constraint
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_id_class_id_date_key;

-- 2. Add a timestamp column
ALTER TABLE public.attendance ADD COLUMN timestamp TIMESTAMPTZ;

-- Backfill timestamp with created_at
UPDATE public.attendance SET timestamp = created_at WHERE timestamp IS NULL;

-- 3. Add sessions_deducted
ALTER TABLE public.attendance ADD COLUMN sessions_deducted INTEGER NOT NULL DEFAULT 1;
