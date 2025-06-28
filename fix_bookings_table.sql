-- Quick fix for missing columns in tbl_bookings table
-- Run this SQL in your database to add the required columns

-- Add missing start_time and end_time columns to tbl_bookings
-- Note: booking_status and updated_at already exist in the current database
ALTER TABLE tbl_bookings
ADD COLUMN start_time TIME NULL AFTER event_time,
ADD COLUMN end_time TIME NULL AFTER start_time;

-- Verify the changes
DESCRIBE tbl_bookings;
