-- Fix package components with component_id = 0
-- This migration assigns proper auto-incrementing IDs to rows that have component_id = 0

-- Step 1: Check current state
SELECT 'Before Fix - Rows with component_id = 0:' as status;
SELECT COUNT(*) as count_zero FROM tbl_package_components WHERE component_id = 0;

-- Step 2: Find the highest component_id to start from
SET @max_id = (SELECT IFNULL(MAX(component_id), 0) FROM tbl_package_components WHERE component_id > 0);

-- Step 3: Create a temporary table to store the rows that need fixing
CREATE TEMPORARY TABLE temp_components_to_fix AS
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

-- Step 4: Delete rows with component_id = 0
DELETE FROM tbl_package_components WHERE component_id = 0;

-- Step 5: Re-insert with proper IDs (let AUTO_INCREMENT handle it)
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
FROM temp_components_to_fix;

-- Step 6: Verify the fix
SELECT 'After Fix - Rows with component_id = 0:' as status;
SELECT COUNT(*) as count_zero FROM tbl_package_components WHERE component_id = 0;

SELECT 'Total components by package:' as status;
SELECT
    package_id,
    COUNT(*) as component_count,
    MIN(component_id) as min_id,
    MAX(component_id) as max_id
FROM tbl_package_components
GROUP BY package_id
ORDER BY package_id;

-- Step 7: Ensure component_id is PRIMARY KEY with AUTO_INCREMENT
-- First check if PRIMARY KEY exists
SELECT 'Checking PRIMARY KEY status...' as status;

-- Drop the PRIMARY KEY if it exists (we'll recreate it properly)
-- ALTER TABLE tbl_package_components DROP PRIMARY KEY;

-- Add PRIMARY KEY with AUTO_INCREMENT
-- Note: Only run this if component_id is not already a PRIMARY KEY
-- You can check with: SHOW KEYS FROM tbl_package_components WHERE Key_name = 'PRIMARY';

ALTER TABLE tbl_package_components
MODIFY COLUMN component_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY;

-- Step 8: Reset AUTO_INCREMENT to the next available ID
SET @next_id = (SELECT IFNULL(MAX(component_id), 0) + 1 FROM tbl_package_components);
SET @alter_stmt = CONCAT('ALTER TABLE tbl_package_components AUTO_INCREMENT = ', @next_id);
PREPARE stmt FROM @alter_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration completed successfully!' as status;
SELECT CONCAT('Next AUTO_INCREMENT value: ', @next_id) as info;
