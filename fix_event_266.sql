-- CORRECTED SQL Script to Fix Event #266 Components
-- The issue is that original_package_component_id is NULL, so we need to link them first

-- Step 1: Link event components to their package inclusions by matching names
-- Fixed collation issue by using COLLATE utf8mb4_general_ci
UPDATE tbl_event_components
SET original_package_component_id = (
    SELECT pi.inclusion_id
    FROM tbl_package_inclusions pi
    JOIN tbl_events e ON e.package_id = pi.package_id
    WHERE e.event_id = 266
    AND pi.inclusion_name COLLATE utf8mb4_general_ci = tbl_event_components.component_name COLLATE utf8mb4_general_ci
)
WHERE event_id = 266
AND original_package_component_id IS NULL;

-- Step 2: Now update the component descriptions with the subcomponents
UPDATE tbl_event_components
SET component_description = (
    SELECT pi.components_list
    FROM tbl_package_inclusions pi
    WHERE pi.inclusion_id = tbl_event_components.original_package_component_id
)
WHERE event_id = 266
AND original_package_component_id IS NOT NULL;

-- Step 3: Verify the fix worked
SELECT
    e.event_id,
    e.event_title,
    ec.component_id,
    ec.component_name,
    ec.component_description,
    ec.original_package_component_id
FROM tbl_events e
JOIN tbl_event_components ec ON e.event_id = ec.event_id
WHERE e.event_id = 266
ORDER BY ec.display_order;

-- Step 4: Check the package inclusions to confirm the mapping
SELECT
    pi.inclusion_id,
    pi.inclusion_name,
    pi.components_list,
    pi.inclusion_price
FROM tbl_package_inclusions pi
JOIN tbl_events e ON e.package_id = pi.package_id
WHERE e.event_id = 266
ORDER BY pi.display_order;
