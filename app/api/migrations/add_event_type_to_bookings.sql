-- Add event_type_id column to tbl_bookings
ALTER TABLE tbl_bookings
ADD COLUMN event_type_id INT AFTER booking_reference,
ADD CONSTRAINT fk_booking_event_type
FOREIGN KEY (event_type_id) REFERENCES tbl_event_type(event_type_id);

-- Update existing bookings to have a default event type (assuming 1 is a valid event_type_id)
UPDATE tbl_bookings SET event_type_id = 1 WHERE event_type_id IS NULL;
