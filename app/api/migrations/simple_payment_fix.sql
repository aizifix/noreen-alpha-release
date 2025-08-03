-- Simple Payment Fix - Works with existing database
-- Date: 2025-01-27
-- Description: Basic payment fix that doesn't require schema access

-- Step 1: Check if tables exist by trying to select from them
-- If this fails, you need to import the new schema first

SELECT 'Checking if tables exist...' as status;

-- Try to access tbl_events
SELECT COUNT(*) as events_count FROM tbl_events LIMIT 1;

-- Try to access tbl_payments
SELECT COUNT(*) as payments_count FROM tbl_payments LIMIT 1;

-- Step 2: Check for duplicate payments
SELECT 'Checking for duplicate payments...' as status;

SELECT
    p1.payment_id as duplicate_payment_id,
    p1.event_id,
    p1.payment_amount,
    p1.payment_date,
    p1.payment_method,
    p1.payment_status,
    'DUPLICATE FOUND' as issue
FROM tbl_payments p1
INNER JOIN tbl_payments p2 ON p1.event_id = p2.event_id
    AND p1.payment_amount = p2.payment_amount
    AND p1.payment_date = p2.payment_date
    AND p1.payment_method = p2.payment_method
    AND p1.payment_id < p2.payment_id
WHERE p1.payment_status != 'cancelled'
    AND p2.payment_status != 'cancelled';

-- Step 3: Show payment summary
SELECT 'Payment Summary by Status' as status;

SELECT
    payment_status,
    COUNT(*) as count,
    SUM(payment_amount) as total_amount
FROM tbl_payments
GROUP BY payment_status;

-- Step 4: Show events with multiple payments
SELECT 'Events with Multiple Payments' as status;

SELECT
    e.event_id,
    e.event_title,
    e.total_budget,
    COUNT(p.payment_id) as total_payments,
    SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) as total_paid
FROM tbl_events e
LEFT JOIN tbl_payments p ON e.event_id = p.event_id
GROUP BY e.event_id, e.event_title, e.total_budget
HAVING COUNT(p.payment_id) > 1
ORDER BY e.event_id DESC;

-- Step 5: Check specific problematic event (Event 48 from the data)
SELECT 'Event 48 Payment Details' as status;

SELECT
    p.payment_id,
    p.payment_amount,
    p.payment_method,
    p.payment_status,
    p.payment_date,
    p.payment_notes
FROM tbl_payments p
WHERE p.event_id = 48
ORDER BY p.payment_id;

-- Step 6: Calculate correct totals for Event 48
SELECT 'Event 48 Correct Totals' as status;

SELECT
    e.event_id,
    e.event_title,
    e.total_budget,
    COUNT(p.payment_id) as total_payments,
    SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) as total_paid,
    (e.total_budget - SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END)) as remaining_balance,
    ROUND((SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) / e.total_budget) * 100, 2) as payment_percentage
FROM tbl_events e
LEFT JOIN tbl_payments p ON e.event_id = p.event_id
WHERE e.event_id = 48
GROUP BY e.event_id, e.event_title, e.total_budget;
