-- Add start_time and end_time columns to tbl_events table
-- Run this migration to add time tracking for events

ALTER TABLE tbl_events
ADD COLUMN start_time TIME DEFAULT NULL AFTER event_date,
ADD COLUMN end_time TIME DEFAULT NULL AFTER start_time;

-- Update existing events with default times if needed
-- You can adjust these default times based on your requirements
UPDATE tbl_events
SET start_time = '10:00:00', end_time = '18:00:00'
WHERE start_time IS NULL;

-- Add index for better performance on conflict checking
CREATE INDEX idx_events_date_time ON tbl_events(event_date, start_time, end_time);

-- Optional: Add check constraint to ensure end_time is after start_time
-- ALTER TABLE tbl_events
-- ADD CONSTRAINT chk_event_time_order CHECK (end_time > start_time);
