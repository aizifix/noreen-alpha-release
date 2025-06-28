-- Migration to remove converted_event_id from tbl_bookings
-- This field is unnecessary since we can track the relationship through
-- original_booking_reference in tbl_events

USE es_v1;

-- Remove the foreign key constraint first
ALTER TABLE tbl_bookings DROP FOREIGN KEY fk_booking_converted_event;

-- Remove the converted_event_id column
ALTER TABLE tbl_bookings DROP COLUMN converted_event_id;

-- Update any existing bookings that might have been marked as 'converted' back to 'confirmed'
-- since we'll now use 'confirmed' status when an event is created from a booking
UPDATE tbl_bookings
SET booking_status = 'confirmed'
WHERE booking_status = 'converted';
