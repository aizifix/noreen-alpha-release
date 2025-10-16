-- Delete Luna/muffin wedding booking (BK-20251010-7094)
-- This will permanently remove the booking and all related data

-- First, let's see what we're about to delete
SELECT
    booking_id,
    booking_reference,
    event_name,
    event_date,
    guest_count,
    booking_status,
    created_at
FROM tbl_bookings
WHERE booking_reference = 'BK-20251010-7094';

-- Check related data that will be deleted
SELECT 'Booking Activity Logs' as table_name, COUNT(*) as count
FROM tbl_booking_activity_logs
WHERE booking_id = 4

UNION ALL

SELECT 'Booking Custom Inclusions' as table_name, COUNT(*) as count
FROM tbl_booking_custom_inclusions
WHERE booking_id = 4

UNION ALL

SELECT 'Booking Removed Inclusions' as table_name, COUNT(*) as count
FROM tbl_booking_removed_inclusions
WHERE booking_id = 4;

-- Uncomment the following lines to actually delete the booking
/*
-- Delete from related tables first (foreign key constraints)
DELETE FROM tbl_booking_activity_logs WHERE booking_id = 4;
DELETE FROM tbl_booking_custom_inclusions WHERE booking_id = 4;
DELETE FROM tbl_booking_removed_inclusions WHERE booking_id = 4;

-- Delete the booking itself
DELETE FROM tbl_bookings WHERE booking_id = 4;

-- Verify deletion
SELECT COUNT(*) as remaining_bookings
FROM tbl_bookings
WHERE booking_reference = 'BK-20251010-7094';
*/
