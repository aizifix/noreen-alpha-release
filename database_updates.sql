-- Database Update Script for Venue Tables
-- Run this script to update your database structure

-- =====================================================
-- 1. Update tbl_venue table (if needed)
-- =====================================================

-- Check if any columns need to be added to tbl_venue
-- Most columns seem to already exist based on your structure

-- Add created_at and updated_at if they don't exist
ALTER TABLE `tbl_venue`
ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Ensure venue_status has proper values
ALTER TABLE `tbl_venue`
MODIFY COLUMN `venue_status` ENUM('available', 'unavailable', 'maintenance') DEFAULT 'available';

-- Ensure venue_type has proper values
ALTER TABLE `tbl_venue`
MODIFY COLUMN `venue_type` ENUM('internal', 'external', 'partner') DEFAULT 'internal';

-- =====================================================
-- 2. Create tbl_venue_price table
-- =====================================================

CREATE TABLE IF NOT EXISTS `tbl_venue_price` (
  `tbl_venue_price_id` INT(11) NOT NULL AUTO_INCREMENT,
  `venue_id` INT(11) NOT NULL,
  `venue_price_title` VARCHAR(255) NOT NULL COMMENT 'e.g., Basic Package, Premium Package',
  `venue_price_min` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `venue_price_max` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `venue_price_description` TEXT NULL,
  `tbl_capacity` INT(11) NOT NULL DEFAULT 0 COMMENT 'Maximum capacity for this pricing tier',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tbl_venue_price_id`),
  KEY `idx_venue_id` (`venue_id`),
  KEY `idx_capacity` (`tbl_capacity`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `fk_venue_price_venue` FOREIGN KEY (`venue_id`) REFERENCES `tbl_venue` (`venue_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. Create tbl_venue_inclusions table (for venue add-ons)
-- =====================================================

CREATE TABLE IF NOT EXISTS `tbl_venue_inclusions` (
  `inclusion_id` INT(11) NOT NULL AUTO_INCREMENT,
  `venue_id` INT(11) NOT NULL,
  `inclusion_name` VARCHAR(255) NOT NULL,
  `inclusion_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `inclusion_description` TEXT NULL,
  `is_required` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Required inclusion, 0 = Optional',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `display_order` INT(11) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`inclusion_id`),
  KEY `idx_venue_id` (`venue_id`),
  KEY `idx_active` (`is_active`),
  KEY `idx_display_order` (`display_order`),
  CONSTRAINT `fk_venue_inclusions_venue` FOREIGN KEY (`venue_id`) REFERENCES `tbl_venue` (`venue_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. Create tbl_venue_components table (for inclusion sub-items)
-- =====================================================

CREATE TABLE IF NOT EXISTS `tbl_venue_components` (
  `component_id` INT(11) NOT NULL AUTO_INCREMENT,
  `inclusion_id` INT(11) NOT NULL,
  `component_name` VARCHAR(255) NOT NULL,
  `component_description` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `display_order` INT(11) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`component_id`),
  KEY `idx_inclusion_id` (`inclusion_id`),
  KEY `idx_active` (`is_active`),
  KEY `idx_display_order` (`display_order`),
  CONSTRAINT `fk_venue_components_inclusion` FOREIGN KEY (`inclusion_id`) REFERENCES `tbl_venue_inclusions` (`inclusion_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. Sample Data (Optional - Remove if not needed)
-- =====================================================

-- Sample venue pricing tiers
INSERT INTO `tbl_venue_price` (`venue_id`, `venue_price_title`, `venue_price_min`, `venue_price_max`, `venue_price_description`, `tbl_capacity`) VALUES
(1, 'Intimate Package', 15000.00, 25000.00, 'Perfect for small gatherings', 50),
(1, 'Standard Package', 30000.00, 45000.00, 'Ideal for medium-sized events', 100),
(1, 'Premium Package', 50000.00, 75000.00, 'Best for large celebrations', 200)
ON DUPLICATE KEY UPDATE `venue_price_title` = VALUES(`venue_price_title`);

-- Sample venue inclusions
INSERT INTO `tbl_venue_inclusions` (`venue_id`, `inclusion_name`, `inclusion_price`, `inclusion_description`, `is_required`, `display_order`) VALUES
(1, 'Basic Setup', 5000.00, 'Tables, chairs, and basic lighting', 1, 1),
(1, 'Sound System', 3000.00, 'Professional audio equipment', 0, 2),
(1, 'Photography Package', 8000.00, 'Professional event photography', 0, 3),
(1, 'Catering Service', 15000.00, 'Full catering service', 0, 4)
ON DUPLICATE KEY UPDATE `inclusion_name` = VALUES(`inclusion_name`);

-- =====================================================
-- 6. Update Indexes for Performance
-- =====================================================

-- Add indexes for better query performance
ALTER TABLE `tbl_venue` ADD INDEX IF NOT EXISTS `idx_venue_status` (`venue_status`);
ALTER TABLE `tbl_venue` ADD INDEX IF NOT EXISTS `idx_venue_type` (`venue_type`);
ALTER TABLE `tbl_venue` ADD INDEX IF NOT EXISTS `idx_venue_capacity` (`venue_capacity`);
ALTER TABLE `tbl_venue` ADD INDEX IF NOT EXISTS `idx_user_id` (`user_id`);

-- =====================================================
-- 7. Create Views for Easy Data Retrieval
-- =====================================================

-- View to get venue with pricing information
CREATE OR REPLACE VIEW `view_venue_with_pricing` AS
SELECT
    v.*,
    vp.tbl_venue_price_id,
    vp.venue_price_title,
    vp.venue_price_min,
    vp.venue_price_max,
    vp.venue_price_description,
    vp.tbl_capacity as price_tier_capacity,
    COUNT(vi.inclusion_id) as total_inclusions,
    SUM(vi.inclusion_price) as total_inclusion_price
FROM `tbl_venue` v
LEFT JOIN `tbl_venue_price` vp ON v.venue_id = vp.venue_id
LEFT JOIN `tbl_venue_inclusions` vi ON v.venue_id = vi.venue_id AND vi.is_active = 1
WHERE v.venue_status = 'available'
GROUP BY v.venue_id, vp.tbl_venue_price_id;

-- View to get venue inclusions with components
CREATE OR REPLACE VIEW `view_venue_inclusions_detailed` AS
SELECT
    v.venue_id,
    v.venue_title,
    vi.inclusion_id,
    vi.inclusion_name,
    vi.inclusion_price,
    vi.inclusion_description,
    vi.is_required,
    vc.component_id,
    vc.component_name,
    vc.component_description
FROM `tbl_venue` v
JOIN `tbl_venue_inclusions` vi ON v.venue_id = vi.venue_id
LEFT JOIN `tbl_venue_components` vc ON vi.inclusion_id = vc.inclusion_id
WHERE v.venue_status = 'available'
AND vi.is_active = 1
AND (vc.is_active = 1 OR vc.is_active IS NULL)
ORDER BY v.venue_id, vi.display_order, vc.display_order;

-- =====================================================
-- Script completed successfully!
-- =====================================================

-- Database Updates for Payment Integration
-- Add missing fields to tbl_events and create tbl_payments table

-- ============================================================================
-- 1. ALTER tbl_events table to add missing fields
-- ============================================================================

-- Add missing fields to tbl_events table
ALTER TABLE `tbl_events`
ADD COLUMN `event_theme` varchar(255) DEFAULT NULL AFTER `event_title`,
ADD COLUMN `event_description` text DEFAULT NULL AFTER `event_theme`,
ADD COLUMN `payment_status` enum('pending','partial','paid','overdue','cancelled') NOT NULL DEFAULT 'pending' AFTER `end_time`,
ADD COLUMN `booking_date` date DEFAULT NULL AFTER `event_status`,
ADD COLUMN `booking_time` time DEFAULT NULL AFTER `booking_date`,
ADD COLUMN `created_by` int(11) DEFAULT NULL AFTER `booking_time`;

-- Add foreign key constraint for created_by
ALTER TABLE `tbl_events`
ADD CONSTRAINT `fk_event_created_by` FOREIGN KEY (`created_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE SET NULL;

-- ============================================================================
-- 2. CREATE tbl_payments table
-- ============================================================================

CREATE TABLE `tbl_payments` (
  `payment_id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `payment_method` enum('cash','gcash','bank-transfer','credit-card','check','online-banking') NOT NULL,
  `payment_amount` decimal(12,2) NOT NULL,
  `payment_notes` text DEFAULT NULL,
  `payment_percentage` decimal(5,2) DEFAULT NULL COMMENT 'Percentage of total if this is a partial payment',
  `payment_status` enum('pending','processing','completed','failed','cancelled','refunded') NOT NULL DEFAULT 'pending',
  `payment_date` date NOT NULL,
  `payment_reference` varchar(255) DEFAULT NULL COMMENT 'Reference number for bank transfers, GCash, etc.',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`payment_id`),
  KEY `idx_payment_event` (`event_id`),
  KEY `idx_payment_client` (`client_id`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_payment_date` (`payment_date`),
  KEY `idx_payment_method` (`payment_method`),
  CONSTRAINT `fk_payment_event` FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payment_client` FOREIGN KEY (`client_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================================
-- 3. CREATE indexes for better performance
-- ============================================================================

-- Add indexes to tbl_events for new fields
ALTER TABLE `tbl_events`
ADD INDEX `idx_payment_status` (`payment_status`),
ADD INDEX `idx_booking_date` (`booking_date`),
ADD INDEX `idx_event_theme` (`event_theme`),
ADD INDEX `idx_created_by` (`created_by`);

-- ============================================================================
-- 4. UPDATE existing records (optional - set defaults)
-- ============================================================================

-- Update existing events to have default values for new fields
UPDATE `tbl_events`
SET
  `payment_status` = 'pending',
  `booking_date` = `created_at`,
  `booking_time` = TIME(`created_at`),
  `created_by` = `admin_id`
WHERE `payment_status` IS NULL OR `booking_date` IS NULL;

-- ============================================================================
-- 5. CREATE a view for easier payment tracking
-- ============================================================================

CREATE VIEW `view_event_payments` AS
SELECT
  e.event_id,
  e.event_title,
  e.event_date,
  e.payment_status as event_payment_status,
  c.user_firstName,
  c.user_lastName,
  c.user_email,
  a.user_firstName as admin_firstName,
  a.user_lastName as admin_lastName,
  p.payment_id,
  p.payment_amount,
  p.payment_method,
  p.payment_status,
  p.payment_date,
  p.payment_reference,
  p.payment_percentage,
  e.total_budget,
  e.down_payment,
  (e.total_budget - COALESCE(SUM(p.payment_amount), 0)) as remaining_balance
FROM `tbl_events` e
LEFT JOIN `tbl_users` c ON e.user_id = c.user_id
LEFT JOIN `tbl_users` a ON e.admin_id = a.user_id
LEFT JOIN `tbl_payments` p ON e.event_id = p.event_id AND p.payment_status = 'completed'
GROUP BY e.event_id, p.payment_id;

-- ============================================================================
-- 6. Create triggers for automatic payment status updates
-- ============================================================================

DELIMITER $$

-- Trigger to update event payment status when payments change
CREATE TRIGGER `update_event_payment_status`
AFTER INSERT ON `tbl_payments`
FOR EACH ROW
BEGIN
  DECLARE total_paid DECIMAL(12,2);
  DECLARE event_total DECIMAL(12,2);

  -- Get total amount paid for this event
  SELECT COALESCE(SUM(payment_amount), 0)
  INTO total_paid
  FROM tbl_payments
  WHERE event_id = NEW.event_id AND payment_status = 'completed';

  -- Get event total budget
  SELECT total_budget
  INTO event_total
  FROM tbl_events
  WHERE event_id = NEW.event_id;

  -- Update event payment status based on payment completion
  IF total_paid >= event_total THEN
    UPDATE tbl_events
    SET payment_status = 'paid'
    WHERE event_id = NEW.event_id;
  ELSEIF total_paid > 0 THEN
    UPDATE tbl_events
    SET payment_status = 'partial'
    WHERE event_id = NEW.event_id;
  END IF;
END$$

-- Trigger to update event payment status when payments are updated
CREATE TRIGGER `update_event_payment_status_on_update`
AFTER UPDATE ON `tbl_payments`
FOR EACH ROW
BEGIN
  DECLARE total_paid DECIMAL(12,2);
  DECLARE event_total DECIMAL(12,2);

  -- Get total amount paid for this event
  SELECT COALESCE(SUM(payment_amount), 0)
  INTO total_paid
  FROM tbl_payments
  WHERE event_id = NEW.event_id AND payment_status = 'completed';

  -- Get event total budget
  SELECT total_budget
  INTO event_total
  FROM tbl_events
  WHERE event_id = NEW.event_id;

  -- Update event payment status based on payment completion
  IF total_paid >= event_total THEN
    UPDATE tbl_events
    SET payment_status = 'paid'
    WHERE event_id = NEW.event_id;
  ELSEIF total_paid > 0 THEN
    UPDATE tbl_events
    SET payment_status = 'partial'
    WHERE event_id = NEW.event_id;
  ELSE
    UPDATE tbl_events
    SET payment_status = 'pending'
    WHERE event_id = NEW.event_id;
  END IF;
END$$

DELIMITER ;

-- ============================================================================
-- 7. Sample data for testing (optional)
-- ============================================================================

-- Insert sample payment records for testing
-- Uncomment these if you want to test with sample data:

/*
INSERT INTO `tbl_payments` (`event_id`, `client_id`, `payment_method`, `payment_amount`, `payment_notes`, `payment_percentage`, `payment_status`, `payment_date`, `payment_reference`) VALUES
(10, 15, 'bank-transfer', 50000.00, 'Down payment for wedding', 50.00, 'completed', '2025-06-14', 'BT-20250614-001'),
(10, 15, 'gcash', 25000.00, 'Second payment installment', 25.00, 'completed', '2025-07-15', 'GC-20250715-002');
*/

-- ============================================================================
-- 8. Grant permissions (adjust user as needed)
-- ============================================================================

-- Grant permissions for the web application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON tbl_payments TO 'your_web_user'@'localhost';
-- GRANT SELECT ON view_event_payments TO 'your_web_user'@'localhost';
