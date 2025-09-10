-- Migration: Add organizer talent fee fields
-- Description: Adds talent fee ranges to tbl_organizer and per-event agreed fee to tbl_event_organizer_assignments
-- Date: 2025-09-02

-- 1) Add columns to tbl_organizer for talent fees
ALTER TABLE `tbl_organizer`
  ADD COLUMN `talent_fee_min` DECIMAL(12,2) NULL DEFAULT NULL AFTER `organizer_portfolio_link`,
  ADD COLUMN `talent_fee_max` DECIMAL(12,2) NULL DEFAULT NULL AFTER `talent_fee_min`,
  ADD COLUMN `talent_fee_currency` VARCHAR(10) NOT NULL DEFAULT 'PHP' AFTER `talent_fee_max`,
  ADD COLUMN `talent_fee_notes` TEXT NULL AFTER `talent_fee_currency`;

-- Helpful index for searching/filtering by fee range (optional)
ALTER TABLE `tbl_organizer`
  ADD INDEX `idx_organizer_talent_fee_range` (`talent_fee_min`, `talent_fee_max`);

-- 2) Add columns to tbl_event_organizer_assignments for per-event agreed fee
ALTER TABLE `tbl_event_organizer_assignments`
  ADD COLUMN `agreed_talent_fee` DECIMAL(12,2) NULL DEFAULT NULL AFTER `notes`,
  ADD COLUMN `fee_currency` VARCHAR(10) NOT NULL DEFAULT 'PHP' AFTER `agreed_talent_fee`,
  ADD COLUMN `fee_status` ENUM('unset','proposed','confirmed','paid') NOT NULL DEFAULT 'unset' AFTER `fee_currency`;

-- Helpful composite index (optional)
ALTER TABLE `tbl_event_organizer_assignments`
  ADD INDEX `idx_assignment_fee_status` (`fee_status`, `organizer_id`);

-- 3) Safety: set default currency for any existing NULLs
UPDATE `tbl_organizer` SET `talent_fee_currency` = 'PHP' WHERE `talent_fee_currency` IS NULL;
UPDATE `tbl_event_organizer_assignments` SET `fee_currency` = 'PHP' WHERE `fee_currency` IS NULL;

SELECT 'add_organizer_talent_fees migration applied' AS status;
