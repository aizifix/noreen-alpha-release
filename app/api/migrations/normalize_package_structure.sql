-- ============================================================================
-- NORMALIZE PACKAGE COMPONENTS STRUCTURE
-- ============================================================================
-- This migration transforms the denormalized structure where components are
-- stored as comma-separated values into a properly normalized 3-level hierarchy:
--
-- Package → Inclusions → Components
--
-- BEFORE:
--   tbl_package_components
--   - component_name: "Wedding Essentials"
--   - component_description: "3-Layer Cake, Bridal Car, Flowers..." (comma-separated!)
--
-- AFTER:
--   tbl_package_inclusions (renamed)
--   - inclusion_name: "Wedding Essentials"
--   └── tbl_inclusion_components (new table!)
--       - component_name: "3-Layer Wedding Cake"
--       - component_name: "Bridal Car"
--       - component_name: "Fresh Flowers"
-- ============================================================================

START TRANSACTION;

-- ============================================================================
-- STEP 1: Create new tbl_inclusion_components table
-- ============================================================================
CREATE TABLE IF NOT EXISTS `tbl_inclusion_components` (
  `component_id` INT(11) NOT NULL AUTO_INCREMENT,
  `inclusion_id` INT(11) NOT NULL COMMENT 'FK to tbl_package_inclusions',
  `component_name` VARCHAR(255) NOT NULL,
  `component_description` TEXT DEFAULT NULL,
  `component_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `display_order` INT(11) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`component_id`),
  KEY `idx_inclusion_id` (`inclusion_id`),
  KEY `idx_display_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
COMMENT='Components under each inclusion - normalized structure';

SELECT '✓ Created tbl_inclusion_components table' as status;

-- ============================================================================
-- STEP 2: Rename tbl_package_components to tbl_package_inclusions
-- ============================================================================
-- First, check if the table needs renaming
SET @table_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_package_inclusions'
);

-- Rename if tbl_package_inclusions doesn't exist
SET @rename_sql = IF(
    @table_exists = 0,
    'RENAME TABLE tbl_package_components TO tbl_package_inclusions',
    'SELECT "Table already renamed" as status'
);

PREPARE stmt FROM @rename_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✓ Renamed tbl_package_components to tbl_package_inclusions' as status;

-- ============================================================================
-- STEP 3: Update column names in tbl_package_inclusions
-- ============================================================================
-- Rename columns to match inclusion terminology
ALTER TABLE `tbl_package_inclusions`
    CHANGE COLUMN `component_id` `inclusion_id` INT(11) NOT NULL AUTO_INCREMENT,
    CHANGE COLUMN `component_name` `inclusion_name` VARCHAR(255) NOT NULL,
    CHANGE COLUMN `component_description` `components_list` TEXT DEFAULT NULL COMMENT 'Temporary: comma-separated list of components',
    CHANGE COLUMN `component_price` `inclusion_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00;

SELECT '✓ Renamed columns in tbl_package_inclusions' as status;

-- ============================================================================
-- STEP 4: Migrate comma-separated components to tbl_inclusion_components
-- ============================================================================
-- Parse the comma-separated components_list and create individual rows

-- This is a complex migration that requires a stored procedure
DELIMITER //

DROP PROCEDURE IF EXISTS migrate_components//

CREATE PROCEDURE migrate_components()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_inclusion_id INT;
    DECLARE v_components_list TEXT;
    DECLARE v_component_name VARCHAR(255);
    DECLARE v_position INT;
    DECLARE v_delimiter_pos INT;
    DECLARE v_component_index INT;

    DECLARE cur CURSOR FOR
        SELECT inclusion_id, components_list
        FROM tbl_package_inclusions
        WHERE components_list IS NOT NULL
        AND TRIM(components_list) != '';

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO v_inclusion_id, v_components_list;

        IF done THEN
            LEAVE read_loop;
        END IF;

        -- Skip if components_list is null or empty
        IF v_components_list IS NULL OR TRIM(v_components_list) = '' THEN
            ITERATE read_loop;
        END IF;

        -- Initialize
        SET v_component_index = 0;
        SET v_components_list = CONCAT(TRIM(v_components_list), ','); -- Add trailing comma for easier parsing

        -- Parse comma-separated list
        WHILE LENGTH(v_components_list) > 0 DO
            SET v_delimiter_pos = LOCATE(',', v_components_list);

            IF v_delimiter_pos > 0 THEN
                SET v_component_name = TRIM(SUBSTRING(v_components_list, 1, v_delimiter_pos - 1));
                SET v_components_list = SUBSTRING(v_components_list, v_delimiter_pos + 1);

                -- Insert component if not empty
                IF LENGTH(v_component_name) > 0 THEN
                    INSERT INTO tbl_inclusion_components (
                        inclusion_id,
                        component_name,
                        component_description,
                        component_price,
                        display_order
                    ) VALUES (
                        v_inclusion_id,
                        v_component_name,
                        NULL,
                        0.00,
                        v_component_index
                    );

                    SET v_component_index = v_component_index + 1;
                END IF;
            ELSE
                LEAVE read_loop;
            END IF;
        END WHILE;

    END LOOP;

    CLOSE cur;
END//

DELIMITER ;

-- Run the migration procedure
CALL migrate_components();

-- Drop the procedure after use
DROP PROCEDURE IF EXISTS migrate_components;

SELECT CONCAT('✓ Migrated ', COUNT(*), ' components from comma-separated lists') as status
FROM tbl_inclusion_components;

-- ============================================================================
-- STEP 5: Clean up - Remove the temporary components_list column
-- ============================================================================
-- After verification, you can uncomment this to remove the old column
-- ALTER TABLE tbl_package_inclusions DROP COLUMN components_list;

SELECT '⚠ Keeping components_list column for verification. Drop it manually after confirming migration.' as warning;

-- ============================================================================
-- STEP 6: Add foreign key constraints
-- ============================================================================
ALTER TABLE `tbl_inclusion_components`
    ADD CONSTRAINT `fk_inclusion_components_inclusion`
    FOREIGN KEY (`inclusion_id`)
    REFERENCES `tbl_package_inclusions` (`inclusion_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

SELECT '✓ Added foreign key constraint' as status;

-- ============================================================================
-- STEP 7: Update indexes
-- ============================================================================
-- Add indexes for better query performance
ALTER TABLE `tbl_package_inclusions`
    ADD INDEX `idx_package_id` (`package_id`),
    ADD INDEX `idx_display_order` (`display_order`);

SELECT '✓ Added indexes' as status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT '=== MIGRATION VERIFICATION ===' as '──────────────────────────────';

-- Count inclusions
SELECT COUNT(*) as 'Total Inclusions' FROM tbl_package_inclusions;

-- Count components
SELECT COUNT(*) as 'Total Components' FROM tbl_inclusion_components;

-- Sample data: Show inclusions with their components
SELECT
    i.inclusion_id,
    i.package_id,
    i.inclusion_name,
    i.inclusion_price,
    COUNT(c.component_id) as component_count
FROM tbl_package_inclusions i
LEFT JOIN tbl_inclusion_components c ON i.inclusion_id = c.inclusion_id
GROUP BY i.inclusion_id, i.package_id, i.inclusion_name, i.inclusion_price
ORDER BY i.package_id, i.display_order
LIMIT 10;

SELECT '✅ MIGRATION COMPLETE!' as status;
SELECT 'Structure: Package → Inclusions → Components' as new_hierarchy;

COMMIT;
