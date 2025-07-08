-- Migration: Add Fixed Package Price Support
-- Adds fields to enforce non-decreasing package prices and track pricing history

-- Add new columns to tbl_packages table
ALTER TABLE `tbl_packages`
ADD COLUMN `original_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Original package price when first created - never changes',
ADD COLUMN `is_price_locked` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether the price is locked (1) or can still be modified (0)',
ADD COLUMN `price_lock_date` TIMESTAMP NULL DEFAULT NULL COMMENT 'When the price was locked',
ADD COLUMN `price_history` JSON DEFAULT NULL COMMENT 'History of price changes for audit trail';

-- Create table to track package price history
CREATE TABLE `tbl_package_price_history` (
  `history_id` INT(11) NOT NULL AUTO_INCREMENT,
  `package_id` INT(11) NOT NULL,
  `old_price` DECIMAL(10,2) NOT NULL,
  `new_price` DECIMAL(10,2) NOT NULL,
  `changed_by` INT(11) NOT NULL,
  `change_reason` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `idx_package_id` (`package_id`),
  KEY `idx_changed_by` (`changed_by`),
  CONSTRAINT `fk_price_history_package` FOREIGN KEY (`package_id`) REFERENCES `tbl_packages` (`package_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_price_history_user` FOREIGN KEY (`changed_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Initialize existing packages with their current price as original_price
UPDATE `tbl_packages`
SET `original_price` = `package_price`,
    `is_price_locked` = 1,
    `price_lock_date` = `created_at`
WHERE `original_price` = 0.00;

-- Create trigger to prevent price reduction
DELIMITER $$
CREATE TRIGGER `prevent_package_price_reduction`
BEFORE UPDATE ON `tbl_packages`
FOR EACH ROW
BEGIN
    -- If price is locked and someone tries to reduce it, prevent the update
    IF OLD.is_price_locked = 1 AND NEW.package_price < OLD.package_price THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot reduce package price once locked. Package prices can only increase or remain the same.';
    END IF;

    -- If price is being increased, log it in price history
    IF NEW.package_price > OLD.package_price THEN
        INSERT INTO `tbl_package_price_history` (package_id, old_price, new_price, changed_by, change_reason)
        VALUES (NEW.package_id, OLD.package_price, NEW.package_price, NEW.created_by, 'Price increase');
    END IF;
END$$
DELIMITER ;

-- Create a view for budget status calculation (alternative to virtual column for compatibility)
CREATE VIEW `v_package_budget_status` AS
SELECT
    p.package_id,
    p.package_title,
    p.package_price,
    p.original_price,
    p.is_price_locked,
    COALESCE(SUM(pc.component_price), 0) as inclusions_total,
    (p.package_price - COALESCE(SUM(pc.component_price), 0)) as difference,
    CASE
        WHEN (p.package_price - COALESCE(SUM(pc.component_price), 0)) > 0 THEN 'BUFFER'
        WHEN (p.package_price - COALESCE(SUM(pc.component_price), 0)) < 0 THEN 'OVERAGE'
        ELSE 'EXACT'
    END as budget_status,
    CASE
        WHEN p.package_price > 0 THEN ((p.package_price - COALESCE(SUM(pc.component_price), 0)) / p.package_price) * 100
        ELSE 0
    END as margin_percentage
FROM `tbl_packages` p
LEFT JOIN `tbl_package_components` pc ON p.package_id = pc.package_id
GROUP BY p.package_id, p.package_title, p.package_price, p.original_price, p.is_price_locked;
