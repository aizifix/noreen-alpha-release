-- Migration: Add venue_fee_buffer column to tbl_packages table
-- This column stores the maximum amount allocated for venue costs in a package
-- Admin can freely adjust this value starting from NULL (no default)

-- Check if column exists before adding it
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'tbl_packages' 
     AND COLUMN_NAME = 'venue_fee_buffer') > 0,
    'SELECT "Column venue_fee_buffer already exists" as message;',
    'ALTER TABLE `tbl_packages` ADD COLUMN `venue_fee_buffer` decimal(10,2) DEFAULT NULL COMMENT "Maximum amount allocated for venue costs - client pays excess if venue cost exceeds this buffer. Admin can freely adjust.";'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing packages with NULL venue fee buffer (admin can adjust as needed)
-- Only update if the column exists
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'tbl_packages' 
     AND COLUMN_NAME = 'venue_fee_buffer') > 0,
    'UPDATE `tbl_packages` SET `venue_fee_buffer` = NULL WHERE `venue_fee_buffer` IS NULL;',
    'SELECT "Column venue_fee_buffer does not exist, skipping update" as message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for better performance on venue buffer queries
-- Only create if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'tbl_packages' 
     AND INDEX_NAME = 'idx_package_venue_buffer') > 0,
    'SELECT "Index idx_package_venue_buffer already exists" as message;',
    'CREATE INDEX `idx_package_venue_buffer` ON `tbl_packages` (`venue_fee_buffer`);'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
