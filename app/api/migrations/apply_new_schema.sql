-- Apply New Schema - Fix Payment Issues
-- Date: 2025-01-27
-- Description: Apply the updated schema that fixes duplicate payment triggers

-- IMPORTANT: Backup your database before running this script!

-- Step 1: Check current database version
SELECT 'Current Database Schema Check' as step;

-- Step 2: Drop the duplicate trigger if it exists
DROP TRIGGER IF EXISTS `notify_on_payment_created`;

-- Step 3: Verify only one payment trigger remains
SELECT
    TRIGGER_NAME,
    EVENT_MANIPULATION,
    EVENT_OBJECT_TABLE
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
    AND EVENT_OBJECT_TABLE = 'tbl_payments'
    AND EVENT_MANIPULATION = 'INSERT';

-- Step 4: Clean up any existing duplicate payments
UPDATE tbl_payments
SET payment_status = 'cancelled',
    payment_notes = CONCAT(COALESCE(payment_notes, ''), ' [AUTO-CANCELLED: Duplicate payment detected during migration]')
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

-- Step 5: Add index to prevent future duplicate payments
CREATE INDEX IF NOT EXISTS `idx_payment_duplicate_check`
ON `tbl_payments`(`event_id`, `payment_amount`, `payment_date`, `payment_method`, `payment_status`);

-- Step 6: Verification - Check payment totals
SELECT
    'Payment Fix Applied Successfully' as status,
    COUNT(*) as total_events,
    SUM(CASE WHEN total_paid > total_budget THEN 1 ELSE 0 END) as events_with_overpayments
FROM (
    SELECT
        e.event_id,
        e.total_budget,
        SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) as total_paid
    FROM tbl_events e
    LEFT JOIN tbl_payments p ON e.event_id = p.event_id
    GROUP BY e.event_id
) as payment_summary;
