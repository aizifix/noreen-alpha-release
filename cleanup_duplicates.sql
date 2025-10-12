-- DUPLICATE BOOKING CLEANUP SQL SCRIPT
-- This script will identify and clean up duplicate bookings
-- Run these queries one by one in your database management tool

-- Step 1: View all duplicate bookings (for review)
SELECT
    user_id,
    event_name,
    event_date,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(booking_id ORDER BY created_at ASC) as booking_ids,
    GROUP_CONCAT(booking_reference ORDER BY created_at ASC) as booking_references,
    GROUP_CONCAT(booking_status ORDER BY created_at ASC) as booking_statuses,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM tbl_bookings
WHERE booking_status NOT IN ('cancelled', 'completed')
GROUP BY user_id, event_name, event_date
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, last_created DESC;

-- Step 2: Create a temporary table with bookings to cancel
-- (This keeps the first booking of each duplicate group and marks the rest for cancellation)
CREATE TEMPORARY TABLE bookings_to_cancel AS
SELECT
    b1.booking_id
FROM tbl_bookings b1
INNER JOIN (
    SELECT
        user_id,
        event_name,
        event_date,
        MIN(booking_id) as keep_booking_id
    FROM tbl_bookings
    WHERE booking_status NOT IN ('cancelled', 'completed')
    GROUP BY user_id, event_name, event_date
    HAVING COUNT(*) > 1
) b2 ON b1.user_id = b2.user_id
    AND b1.event_name = b2.event_name
    AND b1.event_date = b2.event_date
WHERE b1.booking_id != b2.keep_booking_id
    AND b1.booking_status NOT IN ('cancelled', 'completed');

-- Step 3: View what will be cancelled (for verification)
SELECT
    b.booking_id,
    b.booking_reference,
    b.user_id,
    b.event_name,
    b.event_date,
    b.booking_status,
    b.created_at
FROM tbl_bookings b
INNER JOIN bookings_to_cancel btc ON b.booking_id = btc.booking_id
ORDER BY b.user_id, b.event_name, b.event_date, b.created_at;

-- Step 4: Cancel the duplicate bookings
-- (Uncomment the line below when you're ready to execute the cleanup)
-- UPDATE tbl_bookings
-- SET booking_status = 'cancelled',
--     updated_at = NOW(),
--     notes = CONCAT(COALESCE(notes, ''), '\n[CANCELLED: Duplicate booking cleanup on ', NOW(), ']')
-- WHERE booking_id IN (SELECT booking_id FROM bookings_to_cancel);

-- Step 5: Verify the cleanup (run this after Step 4)
-- SELECT
--     user_id,
--     event_name,
--     event_date,
--     COUNT(*) as duplicate_count,
--     GROUP_CONCAT(booking_id ORDER BY created_at ASC) as booking_ids,
--     GROUP_CONCAT(booking_reference ORDER BY created_at ASC) as booking_references,
--     GROUP_CONCAT(booking_status ORDER BY created_at ASC) as booking_statuses
-- FROM tbl_bookings
-- WHERE booking_status NOT IN ('cancelled', 'completed')
-- GROUP BY user_id, event_name, event_date
-- HAVING COUNT(*) > 1
-- ORDER BY duplicate_count DESC, last_created DESC;

-- Step 6: Clean up temporary table
DROP TEMPORARY TABLE IF EXISTS bookings_to_cancel;
