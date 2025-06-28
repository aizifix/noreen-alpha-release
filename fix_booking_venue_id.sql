-- Fix venue_id constraint in tbl_bookings table
-- The venue_id should be nullable since not all bookings may have a venue initially

ALTER TABLE `tbl_bookings`
MODIFY COLUMN `venue_id` int(11) NULL;

-- Also ensure the foreign key constraint allows NULL values
ALTER TABLE `tbl_bookings`
DROP FOREIGN KEY `tbl_bookings_ibfk_3`;

ALTER TABLE `tbl_bookings`
ADD CONSTRAINT `tbl_bookings_ibfk_3`
FOREIGN KEY (`venue_id`) REFERENCES `tbl_venue` (`venue_id`)
ON DELETE SET NULL;

-- Add an index for better performance
CREATE INDEX `idx_venue_id` ON `tbl_bookings` (`venue_id`);
