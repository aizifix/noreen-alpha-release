-- Update booking workflow system
-- Add new status and event linking functionality

-- Add converted status to booking_status ENUM if not exists
-- First, let's see current possible values and add 'converted' if needed
ALTER TABLE tbl_bookings
MODIFY COLUMN booking_status
ENUM('pending', 'confirmed', 'converted', 'cancelled', 'completed')
DEFAULT 'pending';

-- Add converted_event_id field to link bookings to events
ALTER TABLE tbl_bookings
ADD COLUMN converted_event_id INT DEFAULT NULL AFTER booking_status,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Add foreign key constraint for converted events
ALTER TABLE tbl_bookings
ADD CONSTRAINT fk_booking_converted_event
FOREIGN KEY (converted_event_id) REFERENCES tbl_events(event_id)
ON DELETE SET NULL;

-- Add index for better performance on booking status queries
CREATE INDEX idx_booking_status ON tbl_bookings(booking_status);
CREATE INDEX idx_booking_reference ON tbl_bookings(booking_reference);

-- Add booking_reference to tbl_events if you want to track original booking
ALTER TABLE tbl_events
ADD COLUMN original_booking_reference VARCHAR(50) DEFAULT NULL AFTER event_id;

-- Create index for booking reference lookups
CREATE INDEX idx_event_booking_ref ON tbl_events(original_booking_reference);
