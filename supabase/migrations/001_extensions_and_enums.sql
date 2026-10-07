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
