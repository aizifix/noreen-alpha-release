-- Manual Migration: Add supplier support to package components
-- Run this SQL script in your database management tool

-- Add supplier_id column if it doesn't exist
ALTER TABLE `tbl_package_components`
ADD COLUMN `supplier_id` int(11) DEFAULT NULL COMMENT 'Reference to supplier if this is a supplier component' AFTER `display_order`;

-- Add offer_id column if it doesn't exist
ALTER TABLE `tbl_package_components`
ADD COLUMN `offer_id` int(11) DEFAULT NULL COMMENT 'Reference to supplier offer if this is from a specific offer' AFTER `supplier_id`;

-- Add foreign key constraints
ALTER TABLE `tbl_package_components`
ADD CONSTRAINT `fk_package_components_supplier`
FOREIGN KEY (`supplier_id`) REFERENCES `tbl_suppliers`(`supplier_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `tbl_package_components`
ADD CONSTRAINT `fk_package_components_offer`
FOREIGN KEY (`offer_id`) REFERENCES `tbl_supplier_offers`(`offer_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes for better performance
CREATE INDEX `idx_package_components_supplier` ON `tbl_package_components`(`supplier_id`);
CREATE INDEX `idx_package_components_offer` ON `tbl_package_components`(`offer_id`);

-- Verify the changes
DESCRIBE `tbl_package_components`;
