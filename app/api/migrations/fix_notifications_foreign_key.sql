-- Migration: Fix tbl_notifications foreign key constraint
-- Date: 2024-01-26
-- Description: Fix foreign key constraint that references non-existent tbl_event table

-- Drop the incorrect foreign key constraint
ALTER TABLE `tbl_notifications` DROP FOREIGN KEY `tbl_notifications_ibfk_2`;

-- Add the correct foreign key constraint that references tbl_events (plural)
ALTER TABLE `tbl_notifications`
ADD CONSTRAINT `tbl_notifications_ibfk_2`
FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE;

-- Verify the constraint was created correctly
-- SHOW CREATE TABLE `tbl_notifications`;
