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
