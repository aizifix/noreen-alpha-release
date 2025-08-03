-- Working Payment Check - Compatible with current database
-- Date: 2025-01-27
-- Description: Verification queries that work with the current database schema

-- First, check if the required tables exist
SELECT
    TABLE_NAME,
    TABLE_SCHEMA
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN ('tbl_events', 'tbl_payments');

-- Check if triggers exist (should show only 1 payment INSERT trigger)
SELECT
    TRIGGER_NAME,
    EVENT_MANIPULATION,
    EVENT_OBJECT_TABLE
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
    AND EVENT_OBJECT_TABLE = 'tbl_payments'
    AND EVENT_MANIPULATION = 'INSERT';

-- Show recent events with payment issues (look for inflated totals)
-- This will only run if both tables exist
SELECT
    e.event_id,
    e.event_title,
    e.total_budget,
    COUNT(p.payment_id) as total_payments,
    COUNT(CASE WHEN p.payment_status = 'completed' THEN 1 END) as completed_payments,
    COUNT(CASE WHEN p.payment_status = 'cancelled' THEN 1 END) as cancelled_payments,
    SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) as total_paid,
    ROUND((SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) / e.total_budget) * 100, 2) as payment_percentage
FROM tbl_events e
LEFT JOIN tbl_payments p ON e.event_id = p.event_id
GROUP BY e.event_id
HAVING total_payments > 1  -- Show events with multiple payments
ORDER BY e.event_id DESC
LIMIT 10;

-- Check for any duplicate payments (should return 0 rows if fix worked)
SELECT
    p1.payment_id as payment1_id,
    p2.payment_id as payment2_id,
    p1.event_id,
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

-- Show payment summary by status
SELECT
    payment_status,
    COUNT(*) as payment_count,
    SUM(payment_amount) as total_amount
FROM tbl_payments
GROUP BY payment_status
ORDER BY payment_status;

-- Find events with potential ghost payments (total_paid > total_budget)
SELECT
    e.event_id,
    e.event_title,
    e.total_budget,
    SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) as total_paid,
    (SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) - e.total_budget) as overpayment
FROM tbl_events e
LEFT JOIN tbl_payments p ON e.event_id = p.event_id
GROUP BY e.event_id
HAVING total_paid > total_budget
ORDER BY overpayment DESC;

-- Show specific event details (replace 48 with your event ID)
SELECT
    e.event_id,
    e.event_title,
    e.total_budget,
    e.down_payment,
    COUNT(p.payment_id) as total_payments,
    SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) as total_paid,
    ROUND((SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) / e.total_budget) * 100, 2) as payment_percentage
FROM tbl_events e
LEFT JOIN tbl_payments p ON e.event_id = p.event_id
WHERE e.event_id = 48  -- Replace with your event ID
GROUP BY e.event_id;
