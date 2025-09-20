-- Fix for duplicate keys in event components

-- 1. First, identify all components with ID=0
SELECT
    event_id,
    component_name
FROM
    tbl_event_components
WHERE
    component_id = 0;

-- 2. Find components with duplicate IDs across different events
SELECT
    component_id,
    COUNT(*) as count,
    GROUP_CONCAT(event_id ORDER BY event_id) as event_ids
FROM
    tbl_event_components
GROUP BY
    component_id
HAVING
    COUNT(*) > 1
ORDER BY
    COUNT(*) DESC;

-- 3. Get the max component_id for reference
SELECT MAX(component_id) as max_id FROM tbl_event_components;

-- 4. Create a temporary table to track the components that need fixing
CREATE TEMPORARY TABLE temp_component_fixes (
    original_id INT,
    event_id INT,
    new_id INT
);

-- 5. Insert records for zero-ID components
SET @start_id := (SELECT COALESCE(MAX(component_id), 0) FROM tbl_event_components) + 1000;

INSERT INTO temp_component_fixes (original_id, event_id, new_id)
SELECT
    component_id,
    event_id,
    @start_id := @start_id + 1
FROM
    tbl_event_components
WHERE
    component_id = 0
ORDER BY
    event_id;

-- 6. Insert records for duplicate IDs (keeping first occurrence unchanged)
INSERT INTO temp_component_fixes (original_id, event_id, new_id)
SELECT
    ec.component_id,
    ec.event_id,
    @start_id := @start_id + 1
FROM
    tbl_event_components ec
JOIN (
    SELECT
        component_id,
        MIN(event_id) as first_event_id
    FROM
        tbl_event_components
    GROUP BY
        component_id
    HAVING
        COUNT(*) > 1
) dups ON ec.component_id = dups.component_id AND ec.event_id != dups.first_event_id
ORDER BY
    ec.component_id,
    ec.event_id;

-- 7. Update components with the new IDs
UPDATE
    tbl_event_components ec
JOIN
    temp_component_fixes tf ON ec.component_id = tf.original_id AND ec.event_id = tf.event_id
SET
    ec.component_id = tf.new_id;

-- 8. Verify the fixes:
-- Check if we still have any zero component IDs
SELECT COUNT(*) as zero_id_count FROM tbl_event_components WHERE component_id = 0;

-- Check if we still have any duplicate component IDs
SELECT
    component_id,
    COUNT(*) as count
FROM
    tbl_event_components
GROUP BY
    component_id
HAVING
    COUNT(*) > 1
ORDER BY
    COUNT(*) DESC;

-- 9. Clean up
DROP TEMPORARY TABLE IF EXISTS temp_component_fixes;

-- 10. Add auto_increment to the component_id column for future inserts
-- First, make sure component_id is the primary key
ALTER TABLE tbl_event_components
    DROP PRIMARY KEY,
    ADD PRIMARY KEY (component_id);

-- Get the maximum component_id plus some buffer for safety
SELECT MAX(component_id) + 100 INTO @new_auto_increment FROM tbl_event_components;

-- Set auto_increment using a separate statement with a fixed number
-- We'll use a value based on the current max ID

SET @sql = CONCAT('ALTER TABLE tbl_event_components
    MODIFY component_id int(11) NOT NULL AUTO_INCREMENT,
    AUTO_INCREMENT = ', @new_auto_increment);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
