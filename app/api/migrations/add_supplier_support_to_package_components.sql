-- Migration to add supplier support to package components
-- This adds supplier_id and offer_id fields to tbl_package_components

-- Check if columns don't exist before adding them
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'tbl_package_components'
     AND COLUMN_NAME = 'supplier_id') = 0,
    'ALTER TABLE `tbl_package_components` ADD COLUMN `supplier_id` int(11) DEFAULT NULL COMMENT ''Reference to supplier if this is a supplier component'' AFTER `display_order`;',
    'SELECT ''Column supplier_id already exists'' as message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'tbl_package_components'
     AND COLUMN_NAME = 'offer_id') = 0,
    'ALTER TABLE `tbl_package_components` ADD COLUMN `offer_id` int(11) DEFAULT NULL COMMENT ''Reference to supplier offer if this is from a specific offer'' AFTER `supplier_id`;',
    'SELECT ''Column offer_id already exists'' as message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraints if they don't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'tbl_package_components'
     AND CONSTRAINT_NAME = 'fk_package_components_supplier') = 0,
    'ALTER TABLE `tbl_package_components` ADD CONSTRAINT `fk_package_components_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `tbl_suppliers`(`supplier_id`) ON DELETE SET NULL ON UPDATE CASCADE;',
    'SELECT ''Foreign key fk_package_components_supplier already exists'' as message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'tbl_package_components'
     AND CONSTRAINT_NAME = 'fk_package_components_offer') = 0,
    'ALTER TABLE `tbl_package_components` ADD CONSTRAINT `fk_package_components_offer` FOREIGN KEY (`offer_id`) REFERENCES `tbl_supplier_offers`(`offer_id`) ON DELETE SET NULL ON UPDATE CASCADE;',
    'SELECT ''Foreign key fk_package_components_offer already exists'' as message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes for better performance if they don't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'tbl_package_components'
     AND INDEX_NAME = 'idx_package_components_supplier') = 0,
    'CREATE INDEX `idx_package_components_supplier` ON `tbl_package_components`(`supplier_id`);',
    'SELECT ''Index idx_package_components_supplier already exists'' as message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'tbl_package_components'
     AND INDEX_NAME = 'idx_package_components_offer') = 0,
    'CREATE INDEX `idx_package_components_offer` ON `tbl_package_components`(`offer_id`);',
    'SELECT ''Index idx_package_components_offer already exists'' as message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
