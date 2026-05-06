-- Migration: Sales Flow
-- Adds product popularity tracking and follow-up scheduling

-- 1. Add total_reservations to products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS total_reservations INTEGER DEFAULT 0;

-- Backfill initial reservation counts
UPDATE products
SET total_reservations = (
  SELECT COUNT(*)
  FROM reservations
  WHERE reservations.product_id = products.id
);

-- 2. Create trigger to update product reservation count
CREATE OR REPLACE FUNCTION update_product_reservation_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET total_reservations = total_reservations + 1
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_product_reservation_count ON reservations;
CREATE TRIGGER tr_update_product_reservation_count
AFTER INSERT ON reservations
FOR EACH ROW
EXECUTE FUNCTION update_product_reservation_count();

-- 3. Create follow_ups table
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  follow_up_day SMALLINT NOT NULL, -- 1, 3, or 7
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_at ON follow_ups (scheduled_at) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_follow_ups_conversation_id ON follow_ups (conversation_id);
