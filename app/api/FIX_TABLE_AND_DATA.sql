-- Comprehensive Fix for tbl_package_components
-- This script will:
-- 1. Fix existing rows with component_id = 0
-- 2. Ensure proper table structure with AUTO_INCREMENT

-- ==============================================
-- STEP 1: Backup existing zero-ID components
-- ==============================================
DROP TEMPORARY TABLE IF EXISTS temp_zero_components;
CREATE TEMPORARY TABLE temp_zero_components AS
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

SELECT CONCAT('Found ', COUNT(*), ' components with component_id = 0') as status
FROM temp_zero_components;

-- ==============================================
-- STEP 2: Delete rows with component_id = 0
-- ==============================================
DELETE FROM tbl_package_components WHERE component_id = 0;

SELECT 'Deleted all components with component_id = 0' as status;

-- ==============================================
-- STEP 3: Verify table structure
-- ==============================================
SELECT 'Checking table structure...' as status;

-- Show current structure
SHOW CREATE TABLE tbl_package_components;

-- ==============================================
-- STEP 4: Fix table structure (if needed)
-- ==============================================
-- This will ensure component_id is AUTO_INCREMENT PRIMARY KEY

-- Check if component_id is already PRIMARY KEY
SELECT
    COLUMN_NAME,
    COLUMN_KEY,
    EXTRA
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_package_components'
    AND COLUMN_NAME = 'component_id';

-- If component_id is PRIMARY KEY but not AUTO_INCREMENT, fix it
ALTER TABLE tbl_package_components
MODIFY COLUMN component_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY;

SELECT '✓ Table structure updated - component_id is now AUTO_INCREMENT PRIMARY KEY' as status;

-- ==============================================
-- STEP 5: Re-insert components with proper IDs
-- ==============================================
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
FROM temp_zero_components;

SELECT CONCAT('Re-inserted ', ROW_COUNT(), ' components with proper AUTO_INCREMENT IDs') as status;

-- ==============================================
-- STEP 6: Reset AUTO_INCREMENT to next available
-- ==============================================
SET @next_id = (SELECT IFNULL(MAX(component_id), 0) + 1 FROM tbl_package_components);
SET @sql = CONCAT('ALTER TABLE tbl_package_components AUTO_INCREMENT = ', @next_id);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT CONCAT('✓ AUTO_INCREMENT reset to: ', @next_id) as status;

-- ==============================================
-- STEP 7: Verification
-- ==============================================
SELECT '=== VERIFICATION RESULTS ===' as status;

-- Check for any remaining zeros
SELECT COUNT(*) as 'Remaining rows with component_id = 0'
FROM tbl_package_components
WHERE component_id = 0;

-- Show component counts by package
SELECT
    package_id,
    COUNT(*) as component_count,
    MIN(component_id) as min_id,
    MAX(component_id) as max_id
FROM tbl_package_components
GROUP BY package_id
ORDER BY package_id;

-- Show table structure
SHOW CREATE TABLE tbl_package_components;

SELECT '✅ FIX COMPLETE!' as status;
SELECT 'You can now edit packages and add inclusions - they will get proper auto-incrementing IDs' as message;
