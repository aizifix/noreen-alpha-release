-- Fix booking statuses for bookings that have been converted to events
-- This script identifies bookings that have been used to create events
-- and updates their status to 'converted' to prevent them from appearing
-- in the event builder booking selection

-- Update bookings that have corresponding events but are still marked as 'confirmed'
UPDATE tbl_bookings
SET booking_status = 'converted',
    updated_at = NOW()
WHERE booking_reference IN (
    SELECT DISTINCT original_booking_reference
    FROM tbl_events
    WHERE original_booking_reference IS NOT NULL
    AND original_booking_reference != ''
)
AND booking_status = 'confirmed';

-- Add an index for better performance on booking_reference queries
CREATE INDEX IF NOT EXISTS idx_events_booking_ref ON tbl_events(original_booking_reference);

-- Add constraint to prevent duplicate booking conversions (optional)
-- This ensures that once a booking is converted, it can't be used again
-- ALTER TABLE tbl_events ADD CONSTRAINT unique_booking_conversion
-- UNIQUE (original_booking_reference);

-- Show results of the update
SELECT
    COUNT(*) as total_converted_bookings,
    'Bookings successfully updated to converted status' as message
FROM tbl_bookings
WHERE booking_status = 'converted';

-- Show events with their original booking references
SELECT
    e.event_id,
    e.event_title,
    e.original_booking_reference,
    b.booking_status,
    e.created_at as event_created_at
FROM tbl_events e
LEFT JOIN tbl_bookings b ON e.original_booking_reference = b.booking_reference
WHERE e.original_booking_reference IS NOT NULL
ORDER BY e.created_at DESC
LIMIT 10;
