-- Create tables for booking custom and removed inclusions if they don't exist

-- Table for custom inclusions added by clients
CREATE TABLE IF NOT EXISTS `tbl_booking_custom_inclusions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `inclusion_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  KEY `inclusion_id` (`inclusion_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table for inclusions that were part of the package but removed by clients
CREATE TABLE IF NOT EXISTS `tbl_booking_removed_inclusions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `inclusion_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  KEY `inclusion_id` (`inclusion_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add total_price column to tbl_bookings if it doesn't exist
ALTER TABLE `tbl_bookings`
ADD COLUMN IF NOT EXISTS `total_price` decimal(10,2) DEFAULT NULL;
