-- Enhanced Wedding Details Table Migration (Safe Version)
-- This script safely recreates the table with the correct structure

-- Drop the table if it exists to avoid conflicts
DROP TABLE IF EXISTS `tbl_wedding_details`;

-- Create the enhanced wedding details table
CREATE TABLE `tbl_wedding_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,

  -- Basic Information
  `nuptial` varchar(255) DEFAULT NULL,
  `motif` varchar(255) DEFAULT NULL,

  -- Bride & Groom Details
  `bride_name` varchar(255) DEFAULT NULL,
  `bride_size` varchar(50) DEFAULT NULL,
  `groom_name` varchar(255) DEFAULT NULL,
  `groom_size` varchar(50) DEFAULT NULL,

  -- Parents Details
  `mother_bride_name` varchar(255) DEFAULT NULL,
  `mother_bride_size` varchar(50) DEFAULT NULL,
  `father_bride_name` varchar(255) DEFAULT NULL,
  `father_bride_size` varchar(50) DEFAULT NULL,
  `mother_groom_name` varchar(255) DEFAULT NULL,
  `mother_groom_size` varchar(50) DEFAULT NULL,
  `father_groom_name` varchar(255) DEFAULT NULL,
  `father_groom_size` varchar(50) DEFAULT NULL,

  -- Principal Sponsors
  `maid_of_honor_name` varchar(255) DEFAULT NULL,
  `maid_of_honor_size` varchar(50) DEFAULT NULL,
  `best_man_name` varchar(255) DEFAULT NULL,
  `best_man_size` varchar(50) DEFAULT NULL,

  -- Little Bride & Groom
  `little_bride_name` varchar(255) DEFAULT NULL,
  `little_bride_size` varchar(50) DEFAULT NULL,
  `little_groom_name` varchar(255) DEFAULT NULL,
  `little_groom_size` varchar(50) DEFAULT NULL,

  -- Wedding Party Quantities
  `bridesmaids_qty` int(11) DEFAULT 0,
  `groomsmen_qty` int(11) DEFAULT 0,
  `junior_groomsmen_qty` int(11) DEFAULT 0,
  `flower_girls_qty` int(11) DEFAULT 0,
  `ring_bearer_qty` int(11) DEFAULT 0,
  `bible_bearer_qty` int(11) DEFAULT 0,
  `coin_bearer_qty` int(11) DEFAULT 0,

  -- Wedding Party Names (stored as JSON arrays)
  `bridesmaids_names` JSON DEFAULT NULL,
  `groomsmen_names` JSON DEFAULT NULL,
  `junior_groomsmen_names` JSON DEFAULT NULL,
  `flower_girls_names` JSON DEFAULT NULL,
  `ring_bearer_names` JSON DEFAULT NULL,
  `bible_bearer_names` JSON DEFAULT NULL,
  `coin_bearer_names` JSON DEFAULT NULL,

  -- Wedding Items Quantities
  `cushions_qty` int(11) DEFAULT 0,
  `headdress_qty` int(11) DEFAULT 0,
  `shawls_qty` int(11) DEFAULT 0,
  `veil_cord_qty` int(11) DEFAULT 0,
  `basket_qty` int(11) DEFAULT 0,
  `petticoat_qty` int(11) DEFAULT 0,
  `neck_bowtie_qty` int(11) DEFAULT 0,
  `garter_leg_qty` int(11) DEFAULT 0,
  `fitting_form_qty` int(11) DEFAULT 0,
  `robe_qty` int(11) DEFAULT 0,

  -- Processing Information
  `prepared_by` varchar(255) DEFAULT NULL,
  `received_by` varchar(255) DEFAULT NULL,
  `pickup_date` date DEFAULT NULL,
  `return_date` date DEFAULT NULL,
  `customer_signature` varchar(255) DEFAULT NULL,

  -- Metadata
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),

  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_event_wedding` (`event_id`),
  KEY `idx_wedding_event_id` (`event_id`),
  KEY `idx_wedding_bride_groom` (`bride_name`, `groom_name`),
  CONSTRAINT `fk_wedding_details_event` FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create index for better query performance
CREATE INDEX `idx_wedding_event_id` ON `tbl_wedding_details` (`event_id`);
CREATE INDEX `idx_wedding_bride_groom` ON `tbl_wedding_details` (`bride_name`, `groom_name`);
CREATE INDEX `idx_wedding_dates` ON `tbl_wedding_details` (`pickup_date`, `return_date`);
