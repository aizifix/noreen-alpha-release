-- First, identify duplicate assignments (where multiple assignments exist for the same event)
SELECT
    event_id,
    COUNT(*) as assignment_count,
    GROUP_CONCAT(assignment_id) as assignment_ids
FROM
    tbl_event_organizer_assignments
GROUP BY
    event_id
HAVING
    COUNT(*) > 1;

-- Create a temporary table to keep only the latest assignment for each event
CREATE TEMPORARY TABLE IF NOT EXISTS temp_valid_assignments AS
SELECT
    t1.assignment_id,
    t1.event_id
FROM
    tbl_event_organizer_assignments t1
INNER JOIN (
    SELECT
        event_id,
        MAX(assigned_at) as latest_assignment
    FROM
        tbl_event_organizer_assignments
    GROUP BY
        event_id
) t2 ON t1.event_id = t2.event_id AND t1.assigned_at = t2.latest_assignment;

-- Delete duplicate assignments (keeping only the latest for each event)
DELETE FROM tbl_event_organizer_assignments
WHERE assignment_id NOT IN (
    SELECT assignment_id FROM temp_valid_assignments
);

-- Update events table to use the correct organizer_id
UPDATE tbl_events e
JOIN tbl_event_organizer_assignments a ON e.event_id = a.event_id
SET e.organizer_id = a.organizer_id
WHERE a.status = 'assigned' OR a.status = 'accepted';

-- Drop temporary table
DROP TEMPORARY TABLE IF EXISTS temp_valid_assignments;

-- Now check if there are still duplicates
SELECT
    event_id,
    COUNT(*) as assignment_count
FROM
    tbl_event_organizer_assignments
GROUP BY
    event_id
HAVING
    COUNT(*) > 1;
