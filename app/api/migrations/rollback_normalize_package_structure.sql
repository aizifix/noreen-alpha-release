-- ============================================================================
-- ROLLBACK: NORMALIZE PACKAGE STRUCTURE
-- ============================================================================
-- This script rolls back the normalization migration if something goes wrong
-- ============================================================================

START TRANSACTION;

SELECT '=== ROLLING BACK PACKAGE NORMALIZATION ===' as '──────────────────────────────';

-- ============================================================================
-- STEP 1: Drop foreign key constraints
-- ============================================================================
ALTER TABLE `tbl_inclusion_components`
    DROP FOREIGN KEY IF EXISTS `fk_inclusion_components_inclusion`;

SELECT '✓ Dropped foreign key constraints' as status;

-- ============================================================================
-- STEP 2: Restore comma-separated components_list if needed
-- ============================================================================
-- This requires regenerating the comma-separated list from tbl_inclusion_components

UPDATE tbl_package_inclusions i
SET components_list = (
    SELECT GROUP_CONCAT(component_name ORDER BY display_order SEPARATOR ', ')
    FROM tbl_inclusion_components c
    WHERE c.inclusion_id = i.inclusion_id
)
WHERE EXISTS (
    SELECT 1 FROM tbl_inclusion_components c2 WHERE c2.inclusion_id = i.inclusion_id
);

SELECT '✓ Restored comma-separated components_list' as status;

-- ============================================================================
-- STEP 3: Rename columns back
-- ============================================================================
ALTER TABLE `tbl_package_inclusions`
    CHANGE COLUMN `inclusion_id` `component_id` INT(11) NOT NULL AUTO_INCREMENT,
    CHANGE COLUMN `inclusion_name` `component_name` VARCHAR(255) NOT NULL,
    CHANGE COLUMN `components_list` `component_description` TEXT DEFAULT NULL,
    CHANGE COLUMN `inclusion_price` `component_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00;

SELECT '✓ Renamed columns back to original names' as status;

-- ============================================================================
-- STEP 4: Rename table back
-- ============================================================================
RENAME TABLE tbl_package_inclusions TO tbl_package_components;

SELECT '✓ Renamed table back to tbl_package_components' as status;

-- ============================================================================
-- STEP 5: Drop the tbl_inclusion_components table
-- ============================================================================
DROP TABLE IF EXISTS `tbl_inclusion_components`;

SELECT '✓ Dropped tbl_inclusion_components table' as status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT '=== ROLLBACK VERIFICATION ===' as '──────────────────────────────';

SELECT COUNT(*) as 'Total Components' FROM tbl_package_components;

SELECT '✅ ROLLBACK COMPLETE!' as status;
SELECT 'Restored original structure: Package → Components (comma-separated)' as old_structure;

COMMIT;
