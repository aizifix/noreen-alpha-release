-- Fix duplicate components in tbl_package_components
-- This script will remove duplicate components and keep only unique ones

-- Step 1: Create a temporary table with unique components
CREATE TEMPORARY TABLE temp_unique_components AS
SELECT
    MIN(component_id) as component_id,
    package_id,
    component_name,
    component_description,
    component_price,
    MIN(display_order) as display_order
FROM tbl_package_components
GROUP BY package_id, component_name, component_price, component_description;

-- Step 2: Delete all existing components
DELETE FROM tbl_package_components;

-- Step 3: Insert back only the unique components
INSERT INTO tbl_package_components (component_id, package_id, component_name, component_description, component_price, display_order)
SELECT component_id, package_id, component_name, component_description, component_price, display_order
FROM temp_unique_components;

-- Step 4: Reset display order to be sequential for each package
SET @row_number = 0;
SET @prev_package_id = '';

UPDATE tbl_package_components pc1
JOIN (
    SELECT
        component_id,
        package_id,
        @row_number := CASE
            WHEN @prev_package_id = package_id THEN @row_number + 1
            ELSE 0
        END AS new_display_order,
        @prev_package_id := package_id
    FROM tbl_package_components
    ORDER BY package_id, component_id
) pc2 ON pc1.component_id = pc2.component_id
SET pc1.display_order = pc2.new_display_order;

-- Step 5: Drop the temporary table
DROP TEMPORARY TABLE temp_unique_components;

-- Step 6: Show the cleaned results
SELECT
    package_id,
    COUNT(*) as component_count,
    GROUP_CONCAT(component_name ORDER BY display_order SEPARATOR ', ') as components
FROM tbl_package_components
GROUP BY package_id
ORDER BY package_id;
