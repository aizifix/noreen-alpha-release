-- First, identify any components with component_id = 0 (which could cause React key issues)
SELECT
    event_id,
    component_id,
    component_name
FROM
    tbl_event_components
WHERE
    component_id = 0;

-- Fix any components with component_id = 0 by giving them new unique IDs
-- First create a temporary table to store the mappings
CREATE TEMPORARY TABLE IF NOT EXISTS temp_component_fixes (
    old_id INT,
    event_id INT,
    new_id INT
);

-- Insert records that need fixing into the temp table
-- We'll use the max component_id + row number as the new IDs
INSERT INTO temp_component_fixes (old_id, event_id, new_id)
SELECT
    0 as old_id,
    event_id,
    (@max_id := @max_id + 1) as new_id
FROM
    tbl_event_components,
    (SELECT @max_id := (SELECT COALESCE(MAX(component_id), 1000) FROM tbl_event_components)) as init
WHERE
    component_id = 0
ORDER BY
    event_id;

-- Update the component_id for the problematic records
UPDATE tbl_event_components ec
JOIN temp_component_fixes tf ON ec.component_id = tf.old_id AND ec.event_id = tf.event_id
SET ec.component_id = tf.new_id
WHERE ec.component_id = 0;

-- Drop the temporary table
DROP TEMPORARY TABLE IF EXISTS temp_component_fixes;

-- Check for any duplicate component IDs across different events
SELECT
    component_id,
    COUNT(*) as occurrence_count
FROM
    tbl_event_components
GROUP BY
    component_id
HAVING
    COUNT(*) > 1;

-- Fix duplicated component IDs (across different events)
-- First create another temporary table for these fixes
CREATE TEMPORARY TABLE IF NOT EXISTS temp_duplicate_fixes (
    component_id INT,
    event_id INT,
    new_id INT
);

-- Insert records with duplicate component_ids into the temp table
-- Skip the first occurrence of each component_id (we'll keep that one as is)
INSERT INTO temp_duplicate_fixes (component_id, event_id, new_id)
SELECT
    ec.component_id,
    ec.event_id,
    (@max_id := @max_id + 1) as new_id
FROM
    tbl_event_components ec
JOIN (
    SELECT
        component_id,
        MIN(event_id) as min_event_id
    FROM
        tbl_event_components
    GROUP BY
        component_id
    HAVING
        COUNT(*) > 1
) dups ON ec.component_id = dups.component_id
JOIN (SELECT @max_id := (SELECT COALESCE(MAX(component_id), 2000) FROM tbl_event_components)) as init
WHERE
    ec.event_id != dups.min_event_id;

-- Update the component_ids for records with duplicates
UPDATE tbl_event_components ec
JOIN temp_duplicate_fixes tf ON ec.component_id = tf.component_id AND ec.event_id = tf.event_id
SET ec.component_id = tf.new_id;

-- Drop the temporary table
DROP TEMPORARY TABLE IF EXISTS temp_duplicate_fixes;

-- Final verification - check if we still have any components with component_id = 0
SELECT
    COUNT(*) as remaining_zero_ids
FROM
    tbl_event_components
WHERE
    component_id = 0;

-- Check if we still have any duplicate component IDs
SELECT
    component_id,
    COUNT(*) as occurrence_count
FROM
    tbl_event_components
GROUP BY
    component_id
HAVING
    COUNT(*) > 1;
