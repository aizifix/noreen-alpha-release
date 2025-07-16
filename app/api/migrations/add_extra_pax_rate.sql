-- Add extra_pax_rate column to tbl_venue table for guest overflow charges
ALTER TABLE `tbl_venue`
ADD COLUMN `extra_pax_rate` DECIMAL(10, 2) DEFAULT 0.00 AFTER `venue_price`;

-- Update existing venues with example data as specified in instructions
UPDATE `tbl_venue` SET `extra_pax_rate` = 350.00 WHERE `venue_title` = 'Pearlmont Hotel';
UPDATE `tbl_venue` SET `extra_pax_rate` = 300.00 WHERE `venue_title` = 'Pearlmont Hotel - Package 2';
UPDATE `tbl_venue` SET `extra_pax_rate` = 200.00 WHERE `venue_title` = 'Demiren Hotel';
