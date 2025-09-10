-- Migration: Add organizer and venue payment status fields
-- Adds payment_status to tbl_event_organizer_assignments and venue_payment_status to tbl_events

ALTER TABLE `tbl_event_organizer_assignments`
  ADD COLUMN `payment_status` ENUM('unpaid','partial','paid','cancelled') NOT NULL DEFAULT 'unpaid' AFTER `status`;

ALTER TABLE `tbl_events`
  ADD COLUMN `venue_payment_status` ENUM('unpaid','partial','paid','cancelled') NOT NULL DEFAULT 'unpaid' AFTER `payment_status`;

-- Optional safety defaults for existing rows
UPDATE `tbl_event_organizer_assignments` SET `payment_status` = 'unpaid' WHERE `payment_status` IS NULL;
UPDATE `tbl_events` SET `venue_payment_status` = COALESCE(`venue_payment_status`, 'unpaid');

SELECT 'add_organizer_venue_payment_status migration applied' AS status;
