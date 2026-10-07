-- ═══════════════════════════════════════════════════════════════════
-- Migration 001: Extensions & Custom Enum Types
-- Run this first in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enum: User roles ──────────────────────────────────────────────
CREATE TYPE public.user_role AS ENUM (
  'superadmin',
  'admin',
  'staff',
  'coach',
  'parent'
);

-- ── Enum: Class types ─────────────────────────────────────────────
CREATE TYPE public.class_type AS ENUM (
  'standard',  -- 4-session billing rule
  'ADV01'      -- monthly billing rule
);

-- ── Enum: Attendance status ───────────────────────────────────────
CREATE TYPE public.attendance_status AS ENUM (
  'present',
  'absent',
  'medical',
  'leave'
);

-- ── Enum: Invoice type ────────────────────────────────────────────
CREATE TYPE public.invoice_type AS ENUM (
  'auto_4session',  -- triggered after 4th session
  'auto_monthly',   -- ADV01 monthly cron
  'manual'          -- created manually by staff
);

-- ── Enum: Invoice status ──────────────────────────────────────────
CREATE TYPE public.invoice_status AS ENUM (
  'pending',   -- generated, not yet reviewed
  'approved',  -- approved by staff, ready to send
  'sent',      -- WhatsApp message sent
  'failed'     -- WhatsApp send failed
);

-- ── Enum: WhatsApp delivery status ───────────────────────────────
CREATE TYPE public.whatsapp_status AS ENUM (
  'unsent',
  'sent',
  'delivered',
  'failed'
);

-- ── Enum: Payment method ──────────────────────────────────────────
CREATE TYPE public.payment_method AS ENUM (
  'bank_transfer',
  'duitnow',
  'fpx',
  'other'
);

-- ── Enum: Payment status ──────────────────────────────────────────
CREATE TYPE public.payment_status AS ENUM (
  'unpaid',
  'receipt_submitted',  -- parent uploaded proof
  'confirmed_paid',     -- staff confirmed
  'refunded'
);

-- ── Enum: Task status ─────────────────────────────────────────────
CREATE TYPE public.task_status AS ENUM (
  'pending',
  'in_progress',
  'done'
);

-- ── Enum: Student status ──────────────────────────────────────────
CREATE TYPE public.student_status AS ENUM (
  'active',
  'inactive',
  'on_hold'
);
-- ═══════════════════════════════════════════════════════════════════
-- Migration 002: Users Profile Table
-- Extends Supabase auth.users with app-specific profile data.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id       UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          public.user_role NOT NULL DEFAULT 'parent',
  display_name  TEXT NOT NULL,
  phone         TEXT,                          -- WhatsApp number for parents
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast auth_id lookups (used on every request)
CREATE INDEX idx_users_auth_id ON public.users(auth_id);
CREATE INDEX idx_users_role    ON public.users(role);

-- ── Auto-update updated_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Trigger: Auto-create user profile on auth signup ─────────────
-- When a new user signs up via Supabase Auth, this creates their
-- matching profile row in public.users automatically.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, display_name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'parent'),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Helper: Get current user's role ──────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.users
  WHERE auth_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── Helper: Check if current user has one of the given roles ─────
CREATE OR REPLACE FUNCTION public.has_role(required_roles public.user_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
    AND role = ANY(required_roles)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── RLS: Users table ─────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Superadmins see everyone
CREATE POLICY "superadmin_all_users" ON public.users
  FOR ALL
  USING (public.has_role(ARRAY['superadmin']::public.user_role[]));

-- Admins can read all users (for task assignment, oversight)
CREATE POLICY "admin_read_users" ON public.users
  FOR SELECT
  USING (public.has_role(ARRAY['superadmin', 'admin']::public.user_role[]));

-- Staff can read coaches and parents (for class management)
CREATE POLICY "staff_read_coaches_parents" ON public.users
  FOR SELECT
  USING (
    public.has_role(ARRAY['staff']::public.user_role[])
    AND role IN ('coach', 'parent', 'staff')
  );

-- Every user can read and update their own profile
CREATE POLICY "own_profile_read" ON public.users
  FOR SELECT
  USING (auth_id = auth.uid());

CREATE POLICY "own_profile_update" ON public.users
  FOR UPDATE
  USING (auth_id = auth.uid())
  WITH CHECK (
    auth_id = auth.uid()
    -- Prevent users from changing their own role
    AND role = (SELECT role FROM public.users WHERE auth_id = auth.uid())
  );
-- ═══════════════════════════════════════════════════════════════════
-- Migration 003: Classes Table
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.classes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,                          -- e.g. "ADV01", "BEG-SAT-9AM"
  type         public.class_type NOT NULL DEFAULT 'standard',
  description  TEXT,
  schedule     JSONB,                                  -- { day, start_time, end_time, location }
  coach_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  max_students INTEGER DEFAULT 20,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classes_coach_id  ON public.classes(coach_id);
CREATE INDEX idx_classes_type      ON public.classes(type);
CREATE INDEX idx_classes_is_active ON public.classes(is_active);

CREATE TRIGGER classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS: Classes ─────────────────────────────────────────────────
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Superadmin / Admin / Staff: full CRUD
CREATE POLICY "staff_all_classes" ON public.classes
  FOR ALL
  USING (public.has_role(ARRAY['superadmin','admin','staff']::public.user_role[]));

-- Coaches: read their own classes only
CREATE POLICY "coach_read_own_classes" ON public.classes
  FOR SELECT
  USING (
    public.has_role(ARRAY['coach']::public.user_role[])
    AND coach_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Parents: read all active classes (to see which class their child is in)
CREATE POLICY "parent_read_active_classes" ON public.classes
  FOR SELECT
  USING (
    public.has_role(ARRAY['parent']::public.user_role[])
    AND is_active = TRUE
  );
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
-- ═══════════════════════════════════════════════════════════════════
-- Migration 008: Invoices & Invoice Items Table
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  TEXT UNIQUE NOT NULL,                -- e.g. "INV-2026-08-001"
  
  -- Entities
  student_id      UUID REFERENCES public.students(id) ON DELETE SET NULL,
  parent_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Metadata
  type            public.invoice_type NOT NULL,
  status          public.invoice_status NOT NULL DEFAULT 'pending',
  due_date        DATE NOT NULL,
  
  -- Payment Tracking
  payment_status  public.payment_status NOT NULL DEFAULT 'unpaid',
  payment_method  public.payment_method,
  receipt_url     TEXT,                                -- File path in Supabase Storage if manual bank transfer uploaded
  payment_date    TIMESTAMPTZ,
  
  -- WhatsApp Tracking
  wa_status       public.whatsapp_status NOT NULL DEFAULT 'unsent',
  wa_message_id   TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Total amount is calculated dynamically from items, but we index what we query often
CREATE INDEX idx_invoices_parent_id    ON public.invoices(parent_id);
CREATE INDEX idx_invoices_student_id   ON public.invoices(student_id);
CREATE INDEX idx_invoices_status       ON public.invoices(status);
CREATE INDEX idx_invoices_payment      ON public.invoices(payment_status);

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Invoice Items Table ──────────────────────────────────────────
CREATE TABLE public.invoice_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10, 2) NOT NULL,                 -- Amount in MYR
  
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- ── RLS: Invoices ────────────────────────────────────────────────
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Staff/Admin: full access
CREATE POLICY "staff_all_invoices" ON public.invoices
  FOR ALL USING (public.has_role(ARRAY['superadmin','admin','staff']::public.user_role[]));
CREATE POLICY "staff_all_invoice_items" ON public.invoice_items
  FOR ALL USING (public.has_role(ARRAY['superadmin','admin','staff']::public.user_role[]));

-- Parents: read their own invoices, update payment_status/receipt_url (when uploading receipt)
CREATE POLICY "parent_read_own_invoices" ON public.invoices
  FOR SELECT USING (
    public.has_role(ARRAY['parent']::public.user_role[])
    AND parent_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "parent_update_own_invoices" ON public.invoices
  FOR UPDATE USING (
    public.has_role(ARRAY['parent']::public.user_role[])
    AND parent_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    -- Parents can only transition unpaid -> receipt_submitted, and set receipt_url
    payment_status = 'receipt_submitted' 
  );

CREATE POLICY "parent_read_own_invoice_items" ON public.invoice_items
  FOR SELECT USING (
    public.has_role(ARRAY['parent']::public.user_role[])
    AND invoice_id IN (
      SELECT id FROM public.invoices WHERE parent_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );

-- ── Storage Bucket for Receipts ──────────────────────────────────
-- We will create the bucket manually or via Supabase dashboard, but here are the RLS policies:
-- (Assuming bucket is named 'receipts')
-- insert: parent can insert if filename starts with their user id
-- select: staff can view all, parent can view own
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
