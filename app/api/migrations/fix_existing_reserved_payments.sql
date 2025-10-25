-- Fix existing events that were converted from bookings
-- This updates reserved_payment_total and adjusted_total for events that already exist

-- Update events with their reserved payment totals from booking payments
UPDATE tbl_events e
JOIN tbl_bookings b ON e.original_booking_reference = b.booking_reference
LEFT JOIN (
    SELECT
        booking_id,
        SUM(payment_amount) as total_paid
    FROM tbl_payments
    WHERE payment_status IN ('completed', 'paid')
    GROUP BY booking_id
) p ON b.booking_id = p.booking_id
SET
    e.reserved_payment_total = COALESCE(p.total_paid, 0.00),
    e.adjusted_total = e.total_budget - COALESCE(p.total_paid, 0.00)
WHERE e.original_booking_reference IS NOT NULL
AND e.original_booking_reference != '';

-- Show results
SELECT
    e.event_id,
    e.event_title,
    e.original_booking_reference,
    e.total_budget,
    e.reserved_payment_total,
    e.adjusted_total,
    (SELECT COUNT(*) FROM tbl_payments p
     JOIN tbl_bookings b2 ON p.booking_id = b2.booking_id
     WHERE b2.booking_reference = e.original_booking_reference
     AND p.payment_status IN ('completed', 'paid')) as payment_count
FROM tbl_events e
WHERE e.original_booking_reference IS NOT NULL
AND e.original_booking_reference != ''
ORDER BY e.created_at DESC;
