-- Fix Duplicate Payment Triggers - Remove Ghost Payment Issue
-- Date: 2025-01-27
-- Description: Remove duplicate payment trigger that causes ghost payments

-- Drop the duplicate trigger that's causing the issue
DROP TRIGGER IF EXISTS `notify_on_payment_created`;

-- Verify only one payment creation trigger remains
-- SHOW TRIGGERS WHERE `Table` = 'tbl_payments' AND `Event` = 'INSERT';

-- Clean up any duplicate payment records that may have been created
-- This will help identify and remove any ghost payments
UPDATE tbl_payments
SET payment_status = 'cancelled',
    payment_notes = CONCAT(payment_notes, ' [AUTO-CANCELLED: Duplicate payment detected]')
WHERE payment_id IN (
    SELECT payment_id FROM (
        SELECT p1.payment_id
        FROM tbl_payments p1
        INNER JOIN tbl_payments p2 ON p1.event_id = p2.event_id
            AND p1.payment_amount = p2.payment_amount
            AND p1.payment_date = p2.payment_date
            AND p1.payment_method = p2.payment_method
            AND p1.payment_id < p2.payment_id
            AND p1.payment_status != 'cancelled'
            AND p2.payment_status != 'cancelled'
    ) AS duplicates
);

-- Add index to prevent future duplicate payments
CREATE INDEX IF NOT EXISTS `idx_payment_duplicate_check`
ON `tbl_payments`(`event_id`, `payment_amount`, `payment_date`, `payment_method`, `payment_status`);

-- Verification query to check payment totals
-- SELECT
--     event_id,
--     COUNT(*) as total_payments,
--     COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as completed_payments,
--     SUM(CASE WHEN payment_status = 'completed' THEN payment_amount ELSE 0 END) as total_paid
-- FROM tbl_payments
-- WHERE payment_status != 'cancelled'
-- GROUP BY event_id;
