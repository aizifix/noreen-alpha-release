-- Migration: Create tbl_venue_price table
-- This table is required for venue pricing tiers functionality

CREATE TABLE `tbl_venue_price` (
  `tbl_venue_price_id` int(11) NOT NULL AUTO_INCREMENT,
  `venue_id` int(11) NOT NULL,
  `venue_price_title` varchar(255) NOT NULL,
  `venue_price_min` decimal(10,2) NOT NULL DEFAULT 0.00,
  `venue_price_max` decimal(10,2) NOT NULL DEFAULT 0.00,
  `venue_price_description` text DEFAULT NULL,
  `tbl_capacity` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`tbl_venue_price_id`),
  KEY `fk_venue_price_venue` (`venue_id`),
  CONSTRAINT `fk_venue_price_venue` FOREIGN KEY (`venue_id`) REFERENCES `tbl_venue` (`venue_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create default pricing entries for existing venues
-- This ensures existing venues have at least one pricing tier
INSERT INTO `tbl_venue_price` (`venue_id`, `venue_price_title`, `venue_price_min`, `venue_price_max`, `venue_price_description`, `tbl_capacity`)
SELECT
    venue_id,
    'Standard Package',
    0.00,
    0.00,
    'Default pricing tier',
    venue_capacity
FROM `tbl_venue`
WHERE NOT EXISTS (
    SELECT 1 FROM `tbl_venue_price` WHERE `tbl_venue_price`.venue_id = `tbl_venue`.venue_id
);

-- Add index for better performance on venue queries
CREATE INDEX `idx_venue_price_capacity` ON `tbl_venue_price` (`tbl_capacity`);
CREATE INDEX `idx_venue_price_range` ON `tbl_venue_price` (`venue_price_min`, `venue_price_max`);
