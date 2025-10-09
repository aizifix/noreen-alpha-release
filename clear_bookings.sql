-- Clear all booking data from the database
-- This will remove all bookings and related data

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Clear all booking data
DELETE FROM tbl_bookings;

-- Reset auto increment for booking_id
ALTER TABLE tbl_bookings AUTO_INCREMENT = 1;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Show confirmation
SELECT 'All booking data has been cleared' as message;
