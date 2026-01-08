-- Create stripe_customers table for tracking premium purchases
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  subscription_status TEXT NOT NULL CHECK (subscription_status IN ('active', 'expired', 'cancelled')),
  current_tier TEXT NOT NULL CHECK (current_tier IN ('premium_24h', 'premium_7d')),
  expires_at TIMESTAMPTZ NOT NULL,
  payment_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_stripe_customers_email ON stripe_customers(user_email);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_stripe_customers_expires_at ON stripe_customers(expires_at);

-- Enable Row Level Security
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own subscription data
CREATE POLICY "Users can view their own subscription"
  ON stripe_customers
  FOR SELECT
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- RLS Policy: Service role can do everything (for webhook writes)
CREATE POLICY "Service role has full access"
  ON stripe_customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stripe_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on every update
CREATE TRIGGER trigger_update_stripe_customers_updated_at
  BEFORE UPDATE ON stripe_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_customers_updated_at();

-- Function to automatically expire subscriptions
CREATE OR REPLACE FUNCTION expire_old_subscriptions()
RETURNS void AS $$
BEGIN
  UPDATE stripe_customers
  SET subscription_status = 'expired'
  WHERE expires_at < now()
    AND subscription_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE stripe_customers IS 'Tracks premium purchases made through Stripe';
COMMENT ON COLUMN stripe_customers.user_email IS 'Email used during Stripe checkout';
COMMENT ON COLUMN stripe_customers.stripe_customer_id IS 'Stripe customer ID for future reference';
COMMENT ON COLUMN stripe_customers.subscription_status IS 'Current status: active, expired, or cancelled';
COMMENT ON COLUMN stripe_customers.current_tier IS 'Premium tier: premium_24h (24 hours) or premium_7d (96 hours)';
COMMENT ON COLUMN stripe_customers.expires_at IS 'When the premium access expires';
COMMENT ON COLUMN stripe_customers.payment_session_id IS 'Stripe Checkout Session ID for reference';
