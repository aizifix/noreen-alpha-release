-- Fix Payment Reference Duplicates Migration
-- This migration addresses duplicate payment references that cause incorrect payment calculations

-- Step 1: Identify and log duplicate payment references
SELECT
    payment_reference,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(payment_id ORDER BY payment_id) as payment_ids,
    GROUP_CONCAT(payment_amount ORDER BY payment_id) as amounts
FROM tbl_payments
WHERE payment_reference IS NOT NULL AND payment_reference != ''
GROUP BY payment_reference
HAVING COUNT(*) > 1;

-- Step 2: Mark duplicate payments as 'cancelled' (keep the first one as valid)
-- This prevents double counting while preserving audit trail
UPDATE tbl_payments p1
SET payment_status = 'cancelled',
    payment_notes = CONCAT(COALESCE(payment_notes, ''), ' [CANCELLED: Duplicate reference detected during migration]')
WHERE p1.payment_reference IS NOT NULL
  AND p1.payment_reference != ''
  AND EXISTS (
    SELECT 1 FROM tbl_payments p2
    WHERE p2.payment_reference = p1.payment_reference
      AND p2.payment_id < p1.payment_id
      AND p2.payment_status != 'cancelled'
  );

-- Step 3: Add unique constraint on payment_reference (excluding NULL and empty values)
-- Note: This will prevent future duplicate references
ALTER TABLE tbl_payments
ADD CONSTRAINT unique_payment_reference
UNIQUE (payment_reference);

-- Step 4: Create index for better performance on payment reference lookups
CREATE INDEX idx_payment_reference_status ON tbl_payments(payment_reference, payment_status);

-- Step 5: Log the migration completion
INSERT INTO tbl_payment_logs (event_id, payment_id, client_id, action_type, amount, reference_number, notes)
SELECT
    p.event_id,
    p.payment_id,
    p.client_id,
    'migration_duplicate_fix',
    p.payment_amount,
    p.payment_reference,
    'Payment reference duplicate fix migration completed'
FROM tbl_payments p
WHERE p.payment_status = 'cancelled'
  AND p.payment_notes LIKE '%CANCELLED: Duplicate reference detected during migration%';
