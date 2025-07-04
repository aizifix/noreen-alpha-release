-- Add is_active column to tbl_venue table
ALTER TABLE `tbl_venue`
ADD COLUMN `is_active` TINYINT(1) DEFAULT 1 AFTER `venue_status`;

-- Update existing venues to be active by default
UPDATE `tbl_venue` SET `is_active` = 1 WHERE `is_active` IS NULL;
