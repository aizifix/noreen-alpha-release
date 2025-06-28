-- Booking System Enhancements
-- This file adds the necessary columns and constraints for the enhanced booking workflow

-- Add missing columns to tbl_bookings if they don't exist
ALTER TABLE tbl_bookings
ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT NULL,
ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT NULL,
ADD COLUMN IF NOT EXISTS booking_status ENUM('pending', 'confirmed', 'converted', 'cancelled', 'completed') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Update existing bookings to have proper status if null
UPDATE tbl_bookings
SET booking_status = 'pending'
WHERE booking_status IS NULL OR booking_status = '';

-- Create index for better performance on booking status queries
CREATE INDEX IF NOT EXISTS idx_booking_status ON tbl_bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_booking_date ON tbl_bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_booking_user ON tbl_bookings(user_id);

-- Add a trigger to automatically update the updated_at timestamp
DROP TRIGGER IF EXISTS update_booking_timestamp;
DELIMITER $$
CREATE TRIGGER update_booking_timestamp
    BEFORE UPDATE ON tbl_bookings
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$
DELIMITER ;

-- Create a view for admin booking dashboard
CREATE OR REPLACE VIEW vw_admin_bookings AS
SELECT
    b.*,
    CONCAT(u.user_firstName, ' ', u.user_lastName) as client_name,
    u.user_email as client_email,
    u.user_contact as client_phone,
    et.event_name as event_type_name,
    v.venue_title as venue_name,
    p.package_title as package_name,
    e.event_id as converted_event_id,
    CASE
        WHEN e.event_id IS NOT NULL THEN 'converted'
        ELSE b.booking_status
    END as effective_status
FROM tbl_bookings b
LEFT JOIN tbl_users u ON b.user_id = u.user_id
LEFT JOIN tbl_event_type et ON b.event_type_id = et.event_type_id
LEFT JOIN tbl_venue v ON b.venue_id = v.venue_id
LEFT JOIN tbl_packages p ON b.package_id = p.package_id
LEFT JOIN tbl_events e ON b.booking_reference = e.original_booking_reference
ORDER BY b.created_at DESC;

-- Insert sample booking statuses for testing (optional)
-- UPDATE tbl_bookings SET booking_status = 'pending' WHERE booking_id IN (1, 2, 3);
-- UPDATE tbl_bookings SET booking_status = 'confirmed' WHERE booking_id IN (4, 5);
-- UPDATE tbl_bookings SET booking_status = 'cancelled' WHERE booking_id = 6;
