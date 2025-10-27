-- Comprehensive script to fix payment status for all events
-- This script will update the payment_status field based on actual payment totals

-- First, let's see which events have incorrect payment statuses
SELECT
    e.event_id,
    e.event_title,
    e.total_budget,
    e.down_payment,
    e.payment_status as current_status,
    e.reserved_payment_total,
    COALESCE(SUM(p.payment_amount), 0) as total_payments,
    (e.total_budget - COALESCE(SUM(p.payment_amount), 0)) as remaining_balance,
    CASE
        WHEN (e.total_budget - COALESCE(SUM(p.payment_amount), 0)) <= 0 AND e.total_budget > 0 THEN 'paid'
        WHEN COALESCE(SUM(p.payment_amount), 0) > 0 AND (e.total_budget - COALESCE(SUM(p.payment_amount), 0)) > 0 THEN 'partial'
        ELSE 'unpaid'
    END as calculated_status
FROM tbl_events e
LEFT JOIN tbl_payments p ON e.event_id = p.event_id
    AND p.payment_status IN ('completed', 'paid', 'confirmed', 'processed', 'successful')
GROUP BY e.event_id, e.event_title, e.total_budget, e.down_payment, e.payment_status, e.reserved_payment_total
HAVING e.payment_status != calculated_status
ORDER BY e.event_id;

-- Update all events with incorrect payment statuses
UPDATE tbl_events e
SET payment_status = (
    CASE
        WHEN (
            SELECT COALESCE(SUM(p.payment_amount), 0)
            FROM tbl_payments p
            WHERE p.event_id = e.event_id
            AND p.payment_status IN ('completed', 'paid', 'confirmed', 'processed', 'successful')
        ) >= e.total_budget AND e.total_budget > 0 THEN 'paid'
        WHEN (
            SELECT COALESCE(SUM(p.payment_amount), 0)
            FROM tbl_payments p
            WHERE p.event_id = e.event_id
            AND p.payment_status IN ('completed', 'paid', 'confirmed', 'processed', 'successful')
        ) > 0 THEN 'partial'
        ELSE 'unpaid'
    END
),
updated_at = CURRENT_TIMESTAMP
WHERE e.event_id IN (
    SELECT event_id FROM (
        SELECT
            e.event_id,
            e.payment_status as current_status,
            CASE
                WHEN (
                    SELECT COALESCE(SUM(p.payment_amount), 0)
                    FROM tbl_payments p
                    WHERE p.event_id = e.event_id
                    AND p.payment_status IN ('completed', 'paid', 'confirmed', 'processed', 'successful')
                ) >= e.total_budget AND e.total_budget > 0 THEN 'paid'
                WHEN (
                    SELECT COALESCE(SUM(p.payment_amount), 0)
                    FROM tbl_payments p
                    WHERE p.event_id = e.event_id
                    AND p.payment_status IN ('completed', 'paid', 'confirmed', 'processed', 'successful')
                ) > 0 THEN 'partial'
                ELSE 'unpaid'
            END as calculated_status
        FROM tbl_events e
        HAVING current_status != calculated_status
    ) as mismatched_events
);

-- Verify the updates
SELECT
    event_id,
    event_title,
    total_budget,
    payment_status,
    updated_at
FROM tbl_events
WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
ORDER BY event_id;
