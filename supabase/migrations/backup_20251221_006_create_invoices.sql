-- Migration: Create invoices table
-- Description: Invoice records for billing
-- Author: Claude
-- Date: 2025-12-21

CREATE TABLE IF NOT EXISTS invoices (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Organization & Subscription
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Invoice Info
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 25.00,
  tax_amount DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NOK',

  -- Line Items
  line_items JSONB NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
  paid_at TIMESTAMPTZ,

  -- Payment
  stripe_invoice_id TEXT UNIQUE,
  payment_method TEXT,

  -- Files
  pdf_url TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_status CHECK (
    status IN ('draft', 'sent', 'paid', 'overdue', 'void')
  ),
  CONSTRAINT valid_payment_method CHECK (
    payment_method IS NULL OR payment_method IN ('card', 'invoice', 'bank_transfer')
  )
);

-- Indexes
CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);

-- Enable Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their organization's invoices
CREATE POLICY "Users can view their organization's invoices"
  ON invoices FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Generate Invoice Number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
  v_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || v_year || '-%';

  v_number := 'INV-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Function: Create Monthly Invoice
CREATE OR REPLACE FUNCTION create_monthly_invoice(p_organization_id UUID)
RETURNS UUID AS $$
DECLARE
  v_subscription subscriptions%ROWTYPE;
  v_usage_quota RECORD;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_subtotal DECIMAL(10,2);
  v_tax_amount DECIMAL(10,2);
  v_total DECIMAL(10,2);
  v_line_items JSONB;
  v_overage_amount DECIMAL(10,2);
BEGIN
  -- Get subscription
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No subscription found for organization %', p_organization_id;
  END IF;

  -- Get usage quota
  SELECT * INTO v_usage_quota
  FROM check_usage_quota(p_organization_id);

  -- Generate invoice number
  v_invoice_number := generate_invoice_number();

  -- Calculate line items
  v_line_items := jsonb_build_array(
    jsonb_build_object(
      'description', v_subscription.plan_name,
      'quantity', 1,
      'unit_price', v_subscription.price_monthly,
      'amount', v_subscription.price_monthly
    )
  );

  v_subtotal := v_subscription.price_monthly;

  -- Add overage if applicable
  IF v_usage_quota.overage > 0 AND v_subscription.overage_rate IS NOT NULL THEN
    v_overage_amount := (v_usage_quota.overage / 1000.0) * v_subscription.overage_rate;

    v_line_items := v_line_items || jsonb_build_array(
      jsonb_build_object(
        'description', 'Overage (' || v_usage_quota.overage || ' impressions)',
        'quantity', CEIL(v_usage_quota.overage / 1000.0),
        'unit_price', v_subscription.overage_rate,
        'amount', v_overage_amount
      )
    );

    v_subtotal := v_subtotal + v_overage_amount;
  END IF;

  -- Calculate tax (Norwegian MVA: 25%)
  v_tax_amount := ROUND(v_subtotal * 0.25, 2);
  v_total := v_subtotal + v_tax_amount;

  -- Create invoice
  INSERT INTO invoices (
    organization_id,
    subscription_id,
    invoice_number,
    invoice_date,
    due_date,
    period_start,
    period_end,
    subtotal,
    tax_rate,
    tax_amount,
    total,
    currency,
    line_items,
    status
  )
  VALUES (
    p_organization_id,
    v_subscription.id,
    v_invoice_number,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '14 days',
    v_subscription.current_period_start::DATE,
    v_subscription.current_period_end::DATE,
    v_subtotal,
    25.00,
    v_tax_amount,
    v_total,
    v_subscription.currency,
    v_line_items,
    'draft'
  )
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark Invoice as Paid
CREATE OR REPLACE FUNCTION mark_invoice_paid(
  p_invoice_id UUID,
  p_payment_method TEXT DEFAULT 'card',
  p_stripe_invoice_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE invoices
  SET
    status = 'paid',
    paid_at = NOW(),
    payment_method = p_payment_method,
    stripe_invoice_id = COALESCE(p_stripe_invoice_id, stripe_invoice_id),
    updated_at = NOW()
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE invoices IS 'Invoice records for billing';
COMMENT ON COLUMN invoices.line_items IS 'Array of invoice line items (subscription + overage)';
COMMENT ON FUNCTION generate_invoice_number IS 'Generate unique invoice number (INV-YYYY-XXXXXX)';
COMMENT ON FUNCTION create_monthly_invoice IS 'Generate monthly invoice with usage-based billing';
COMMENT ON FUNCTION mark_invoice_paid IS 'Mark invoice as paid';
