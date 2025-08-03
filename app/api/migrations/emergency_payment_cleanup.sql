-- Emergency Payment Cleanup - Fix Ghost Payments
-- Date: 2025-01-27
-- Description: Immediate fix for ghost payment issues

-- BACKUP YOUR DATABASE BEFORE RUNNING THIS!

-- Step 1: Check the current state of problematic events
SELECT 'BEFORE CLEANUP - Event 48 payments:' as status;
SELECT
    payment_id,
    event_id,
    payment_amount,
    payment_method,
    payment_status,
    payment_date,
    payment_notes,
    created_at
FROM tbl_payments
WHERE event_id = 48
ORDER BY payment_id;

SELECT 'BEFORE CLEANUP - Event 33 payments:' as status;
SELECT
    payment_id,
    event_id,
    payment_amount,
    payment_method,
    payment_status,
    payment_date,
    payment_notes,
    created_at
FROM tbl_payments
WHERE event_id = 33
ORDER BY payment_id;

-- Step 2: Find and mark duplicate payments as cancelled
-- For Event 48 - Keep the latest payment (payment_id 44 from the schema)
UPDATE tbl_payments
SET payment_status = 'cancelled',
    payment_notes = CONCAT(COALESCE(payment_notes, ''), ' [CANCELLED: Ghost payment detected - keeping latest payment only]')
WHERE event_id = 48
  AND payment_id != 44  -- Keep payment_id 44 (the real ₱40,000 payment)
  AND payment_status != 'cancelled';

-- For Event 33 - Keep the latest payment, cancel duplicates
UPDATE tbl_payments
SET payment_status = 'cancelled',
    payment_notes = CONCAT(COALESCE(payment_notes, ''), ' [CANCELLED: Duplicate payment detected]')
WHERE payment_id IN (
    SELECT payment_id FROM (
        SELECT p1.payment_id
        FROM tbl_payments p1
        INNER JOIN tbl_payments p2 ON p1.event_id = p2.event_id
            AND p1.payment_amount = p2.payment_amount
            AND p1.payment_date = p2.payment_date
            AND p1.payment_method = p2.payment_method
            AND p1.payment_id < p2.payment_id  -- Keep the newer payment
            AND p1.payment_status != 'cancelled'
            AND p2.payment_status != 'cancelled'
        WHERE p1.event_id = 33
    ) AS duplicates
);

-- Step 3: General cleanup for all other duplicate payments
UPDATE tbl_payments
SET payment_status = 'cancelled',
    payment_notes = CONCAT(COALESCE(payment_notes, ''), ' [CANCELLED: Duplicate payment auto-detected]')
WHERE payment_id IN (
    SELECT payment_id FROM (
        SELECT p1.payment_id
        FROM tbl_payments p1
        INNER JOIN tbl_payments p2 ON p1.event_id = p2.event_id
            AND p1.payment_amount = p2.payment_amount
            AND p1.payment_date = p2.payment_date
            AND p1.payment_method = p2.payment_method
            AND p1.payment_id < p2.payment_id  -- Keep the newer payment
            AND p1.payment_status != 'cancelled'
            AND p2.payment_status != 'cancelled'
    ) AS all_duplicates
);

-- Step 4: Verify the cleanup worked
SELECT 'AFTER CLEANUP - Event 48 payments:' as status;
SELECT
    payment_id,
    event_id,
    payment_amount,
    payment_method,
    payment_status,
    payment_date,
    payment_notes
FROM tbl_payments
WHERE event_id = 48
ORDER BY payment_id;

SELECT 'AFTER CLEANUP - Event 48 totals:' as status;
SELECT
    e.event_id,
    e.event_title,
    e.total_budget,
    COUNT(CASE WHEN p.payment_status != 'cancelled' THEN 1 END) as active_payments,
    COUNT(CASE WHEN p.payment_status = 'cancelled' THEN 1 END) as cancelled_payments,
    SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) as total_paid,
    (e.total_budget - SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END)) as remaining_balance,
    ROUND((SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) / e.total_budget) * 100, 2) as payment_percentage
FROM tbl_events e
LEFT JOIN tbl_payments p ON e.event_id = p.event_id
WHERE e.event_id = 48
GROUP BY e.event_id, e.event_title, e.total_budget;

SELECT 'AFTER CLEANUP - Event 33 totals:' as status;
SELECT
    e.event_id,
    e.event_title,
    e.total_budget,
    COUNT(CASE WHEN p.payment_status != 'cancelled' THEN 1 END) as active_payments,
    COUNT(CASE WHEN p.payment_status = 'cancelled' THEN 1 END) as cancelled_payments,
    SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) as total_paid,
    (e.total_budget - SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END)) as remaining_balance,
    ROUND((SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) / e.total_budget) * 100, 2) as payment_percentage
FROM tbl_events e
LEFT JOIN tbl_payments p ON e.event_id = p.event_id
WHERE e.event_id = 33
GROUP BY e.event_id, e.event_title, e.total_budget;

-- Step 5: Check for any remaining problematic events
SELECT 'Events with potential issues:' as status;
SELECT
    e.event_id,
    e.event_title,
    e.total_budget,
    COUNT(CASE WHEN p.payment_status != 'cancelled' THEN 1 END) as active_payments,
    SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) as total_paid,
    (SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) - e.total_budget) as overpayment
FROM tbl_events e
LEFT JOIN tbl_payments p ON e.event_id = p.event_id
GROUP BY e.event_id, e.event_title, e.total_budget
HAVING overpayment > 0 OR active_payments > 2
ORDER BY overpayment DESC;

SELECT 'Cleanup Summary:' as status;
SELECT
    payment_status,
    COUNT(*) as count,
    SUM(payment_amount) as total_amount
FROM tbl_payments
GROUP BY payment_status;
