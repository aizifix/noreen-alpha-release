-- Add supplier_pfp column to tbl_suppliers table
-- This migration adds profile picture support for suppliers

-- Add the supplier_pfp column
ALTER TABLE `tbl_suppliers`
ADD COLUMN `supplier_pfp` VARCHAR(500) DEFAULT NULL
COMMENT 'Profile picture file path'
AFTER `business_description`;

-- Add index for better performance on profile picture queries
ALTER TABLE `tbl_suppliers`
ADD INDEX `idx_supplier_pfp` (`supplier_pfp`);
