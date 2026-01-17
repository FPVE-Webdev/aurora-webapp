-- Add columns for Payment Intent support
-- Enables tracking of Payment Request Button (Apple Pay / Google Pay) payments

ALTER TABLE stripe_customers
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method_type TEXT;

-- Create index for faster lookups by Payment Intent ID
CREATE INDEX IF NOT EXISTS idx_stripe_customers_payment_intent
ON stripe_customers(payment_intent_id);

-- Add comments for documentation
COMMENT ON COLUMN stripe_customers.payment_intent_id IS 'Stripe Payment Intent ID (for Apple Pay / Google Pay payments)';
COMMENT ON COLUMN stripe_customers.payment_method_type IS 'Payment method used: card, apple_pay, google_pay, link, etc.';

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'stripe_customers'
  AND column_name IN ('payment_intent_id', 'payment_method_type');
