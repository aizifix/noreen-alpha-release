-- Verification Script for Payment Fix
-- Date: 2025-01-27
-- Description: Verify that payment calculations are now accurate

-- 1. Check for any remaining duplicate triggers
SELECT
    TRIGGER_NAME,
    EVENT_MANIPULATION,
    EVENT_OBJECT_TABLE
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
    AND EVENT_OBJECT_TABLE = 'tbl_payments'
    AND EVENT_MANIPULATION = 'INSERT';

-- 2. Verify payment totals for a specific event (replace EVENT_ID with actual event ID)
-- Expected: Should show only ₱40,000.00 total paid for the sample event
-- Example: WHERE e.event_id = 123
SELECT
    e.event_id,
    e.event_title,
    e.total_budget,
    COUNT(p.payment_id) as total_payments,
    COUNT(CASE WHEN p.payment_status = 'completed' THEN 1 END) as completed_payments,
    COUNT(CASE WHEN p.payment_status = 'cancelled' THEN 1 END) as cancelled_payments,
    SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) as total_paid,
    (e.total_budget - SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END)) as remaining_balance,
    ROUND((SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) / e.total_budget) * 100, 2) as payment_percentage
FROM tbl_events e
LEFT JOIN tbl_payments p ON e.event_id = p.event_id
WHERE e.event_id = 123  -- Replace 123 with your actual event ID
GROUP BY e.event_id;

-- 3. List all payments for the event to verify no ghost payments
SELECT
    payment_id,
    payment_amount,
    payment_method,
    payment_status,
    payment_date,
    payment_reference,
    payment_notes,
    created_at
FROM tbl_payments
WHERE event_id = 123  -- Replace 123 with your actual event ID
ORDER BY created_at DESC;

-- 4. Check for any duplicate payments that might still exist
SELECT
    p1.payment_id as payment1_id,
    p2.payment_id as payment2_id,
    p1.payment_amount,
    p1.payment_date,
    p1.payment_method,
    p1.payment_status as status1,
    p2.payment_status as status2
FROM tbl_payments p1
INNER JOIN tbl_payments p2 ON p1.event_id = p2.event_id
    AND p1.payment_amount = p2.payment_amount
    AND p1.payment_date = p2.payment_date
    AND p1.payment_method = p2.payment_method
    AND p1.payment_id < p2.payment_id
WHERE p1.payment_status != 'cancelled'
    AND p2.payment_status != 'cancelled';

-- 5. Summary of all events with payment status
SELECT
    e.event_id,
    e.event_title,
    e.total_budget,
    COUNT(p.payment_id) as total_payments,
    SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) as total_paid,
    ROUND((SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) / e.total_budget) * 100, 2) as payment_percentage
FROM tbl_events e
LEFT JOIN tbl_payments p ON e.event_id = p.event_id AND p.payment_status != 'cancelled'
GROUP BY e.event_id
ORDER BY e.event_id DESC
LIMIT 10;
