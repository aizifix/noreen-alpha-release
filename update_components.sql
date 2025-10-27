-- SQL Script to Update Existing Events with Proper Subcomponents
-- Run these queries in your database to fix existing events

-- 1. First, let's see what we're working with
-- Check current event components and their descriptions
SELECT
    e.event_id,
    e.event_title,
    ec.component_id,
    ec.component_name,
    ec.component_description,
    ec.original_package_component_id
FROM tbl_events e
JOIN tbl_event_components ec ON e.event_id = ec.event_id
WHERE e.event_id = 266  -- Focus on Event #266
ORDER BY ec.display_order;

-- 2. Check what subcomponents should be available from the original package
SELECT
    pi.inclusion_id,
    pi.inclusion_name,
    pi.components_list,
    pi.inclusion_price
FROM tbl_package_inclusions pi
JOIN tbl_events e ON e.package_id = pi.package_id
WHERE e.event_id = 266
ORDER BY pi.display_order;

-- 3. Update Event #266 components with proper subcomponents
UPDATE tbl_event_components
SET component_description = (
    SELECT pi.components_list
    FROM tbl_package_inclusions pi
    WHERE pi.inclusion_id = tbl_event_components.original_package_component_id
)
WHERE event_id = 266
AND original_package_component_id IS NOT NULL
AND (component_description IS NULL OR component_description = '' OR component_description = component_name);

-- 4. Verify the update worked
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

-- 5. Optional: Update ALL existing events with proper subcomponents
-- (Run this if you want to fix all events at once)
UPDATE tbl_event_components
SET component_description = (
    SELECT pi.components_list
    FROM tbl_package_inclusions pi
    WHERE pi.inclusion_id = tbl_event_components.original_package_component_id
)
WHERE original_package_component_id IS NOT NULL
AND (component_description IS NULL OR component_description = '' OR component_description = component_name);

-- 6. Check how many components were updated
SELECT
    COUNT(*) as updated_components,
    COUNT(DISTINCT event_id) as updated_events
FROM tbl_event_components
WHERE component_description IS NOT NULL
AND component_description != ''
AND component_description != component_name
AND component_description LIKE '%,%';  -- Contains commas (multiple subcomponents)
