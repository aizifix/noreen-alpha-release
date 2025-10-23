-- Migration: Add profile picture support for suppliers
-- Date: 2024-01-01
-- Description: Adds supplier_pfp column to tbl_suppliers table to support profile pictures

-- Add profile picture column to suppliers table
ALTER TABLE `tbl_suppliers`
ADD COLUMN `supplier_pfp` VARCHAR(500) DEFAULT NULL COMMENT 'Profile picture file path'
AFTER `business_description`;

-- Add index for better performance on profile picture queries
ALTER TABLE `tbl_suppliers`
ADD INDEX `idx_supplier_pfp` (`supplier_pfp`);

-- Update existing suppliers with default profile picture path (optional)
-- UPDATE `tbl_suppliers` SET `supplier_pfp` = 'uploads/suppliers/default_supplier.png' WHERE `supplier_pfp` IS NULL;
