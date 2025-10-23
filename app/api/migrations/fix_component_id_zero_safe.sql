-- Safe Fix for package components with component_id = 0
-- This migration handles PRIMARY KEY constraints properly
-- Run this BEFORE trying to add PRIMARY KEY!

-- ============================================================
-- STEP 1: Check current state
-- ============================================================
SELECT '=== BEFORE FIX ===' as '────────────────────────────';
SELECT COUNT(*) as 'Rows with component_id = 0' FROM tbl_package_components WHERE component_id = 0;

-- Check if PRIMARY KEY exists
SELECT 'Checking PRIMARY KEY status...' as '────────────────────────────';
SELECT
    CONSTRAINT_NAME,
    COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_package_components'
    AND CONSTRAINT_NAME = 'PRIMARY';

-- ============================================================
-- STEP 2: Get max component_id before changes
-- ============================================================
SET @max_id = (SELECT IFNULL(MAX(component_id), 0) FROM tbl_package_components WHERE component_id > 0);
SELECT @max_id as 'Current Max component_id';

-- ============================================================
-- STEP 3: Backup data with component_id = 0 to temporary table
-- ============================================================
DROP TEMPORARY TABLE IF EXISTS temp_components_fix;
CREATE TEMPORARY TABLE temp_components_fix AS
SELECT
    package_id,
    component_name,
    component_description,
    component_price,
    display_order,
    supplier_id,
    offer_id
FROM tbl_package_components
WHERE component_id = 0
ORDER BY package_id, display_order;

SELECT COUNT(*) as 'Rows backed up to temp table' FROM temp_components_fix;

-- ============================================================
-- STEP 4: Delete rows with component_id = 0
-- ============================================================
-- This is CRUCIAL - we must remove duplicates before adding PRIMARY KEY
DELETE FROM tbl_package_components WHERE component_id = 0;
SELECT ROW_COUNT() as 'Rows deleted (removed duplicates)';

-- ============================================================
-- STEP 5: NOW we can safely add PRIMARY KEY and AUTO_INCREMENT
-- ============================================================
-- First check if PRIMARY KEY already exists
SET @pk_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tbl_package_components'
        AND CONSTRAINT_NAME = 'PRIMARY'
);

SELECT IF(@pk_exists > 0, 'PRIMARY KEY exists', 'PRIMARY KEY does not exist') as 'Primary Key Status';

-- If PRIMARY KEY exists but not on component_id, drop it
-- (Uncomment the next line ONLY if PRIMARY KEY is on a different column)
-- ALTER TABLE tbl_package_components DROP PRIMARY KEY;

-- Add PRIMARY KEY on component_id (only if it doesn't exist)
SELECT 'Adding PRIMARY KEY and AUTO_INCREMENT...' as '────────────────────────────';

-- This will work now because we removed all duplicate zeros
ALTER TABLE tbl_package_components
MODIFY COLUMN component_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY;

SELECT '✓ PRIMARY KEY and AUTO_INCREMENT added successfully' as 'Status';

-- ============================================================
-- STEP 6: Re-insert with proper AUTO_INCREMENT IDs
-- ============================================================
INSERT INTO tbl_package_components (
    package_id,
    component_name,
    component_description,
    component_price,
    display_order,
    supplier_id,
    offer_id
)
SELECT
    package_id,
    component_name,
    component_description,
    component_price,
    display_order,
    supplier_id,
    offer_id
FROM temp_components_fix;

SELECT ROW_COUNT() as 'Rows re-inserted with proper AUTO_INCREMENT IDs';

-- Step 6: Verify the fix
SELECT '=== AFTER FIX ===' as '─────────────────────';
SELECT COUNT(*) as 'Rows with component_id = 0 (should be 0)' FROM tbl_package_components WHERE component_id = 0;

-- Step 7: Show summary by package
SELECT '=== COMPONENTS BY PACKAGE ===' as '─────────────────────';
SELECT
    package_id,
    COUNT(*) as component_count,
    MIN(component_id) as min_component_id,
    MAX(component_id) as max_component_id
FROM tbl_package_components
GROUP BY package_id
ORDER BY package_id;

-- Step 8: Reset AUTO_INCREMENT to correct value
SET @next_auto = (SELECT IFNULL(MAX(component_id), 0) + 1 FROM tbl_package_components);
SET @sql = CONCAT('ALTER TABLE tbl_package_components AUTO_INCREMENT = ', @next_auto);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT CONCAT('Next AUTO_INCREMENT set to: ', @next_auto) as 'Auto Increment Status';

-- Step 9: Clean up
DROP TEMPORARY TABLE IF EXISTS temp_components_fix;

SELECT '✓ Migration completed successfully!' as 'STATUS';
