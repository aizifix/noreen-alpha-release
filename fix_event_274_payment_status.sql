-- Manual fix for event ID 274 "Birthday Wish"
-- This event is fully paid (₱335,000.00 total budget = ₱335,000.00 total paid)
-- But the database still shows payment_status = "unpaid"

-- First, let's check the current status
SELECT
    event_id,
    event_title,
    total_budget,
    down_payment,
    payment_status,
    reserved_payment_total,
    adjusted_total
FROM tbl_events
WHERE event_id = 274;

-- Update the payment status to "paid" since the event is fully paid
UPDATE tbl_events
SET payment_status = 'paid',
    updated_at = CURRENT_TIMESTAMP
WHERE event_id = 274;

-- Verify the update
SELECT
    event_id,
    event_title,
    total_budget,
    down_payment,
    payment_status,
    reserved_payment_total,
    adjusted_total
FROM tbl_events
WHERE event_id = 274;

-- Also check the payments for this event
SELECT
    payment_id,
    payment_amount,
    payment_status,
    payment_date,
    payment_method,
    payment_notes
FROM tbl_payments
WHERE event_id = 274
ORDER BY payment_date DESC;
