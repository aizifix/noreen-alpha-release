-- Complete Event Builder Fix Migration
-- Date: 2024-01-26
-- Description: Comprehensive fix for event builder issues

-- 1. Fix tbl_notifications foreign key constraint
-- Drop the incorrect foreign key constraint
ALTER TABLE `tbl_notifications` DROP FOREIGN KEY `tbl_notifications_ibfk_2`;

-- Add the correct foreign key constraint that references tbl_events (plural)
ALTER TABLE `tbl_notifications`
ADD CONSTRAINT `tbl_notifications_ibfk_2`
FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE;

-- 2. Verify table structures (optional checks)
-- You can uncomment these to verify the changes
-- SHOW CREATE TABLE `tbl_notifications`;
-- DESCRIBE `tbl_users`;
-- DESCRIBE `tbl_events`;

-- 3. Update any potentially problematic enum values to be consistent
-- Ensure all user roles are lowercase
UPDATE `tbl_users` SET `user_role` = LOWER(`user_role`) WHERE `user_role` != LOWER(`user_role`);

-- Migration completed successfully
