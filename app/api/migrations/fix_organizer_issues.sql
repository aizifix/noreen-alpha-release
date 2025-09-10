-- Migration: Fix Organizer Issues
-- Description: Fixes duplicate key error and adds date duplication checks for organizer portal
-- Date: 2025-01-XX

-- 1. Fix duplicate key error by checking if index exists before adding
-- Drop the index if it exists to avoid duplicate key error
DROP INDEX IF EXISTS `idx_organizer_id` ON `tbl_events`;

-- Add the index back (this will only add it if it doesn't exist)
ALTER TABLE `tbl_events` ADD INDEX `idx_organizer_id` (`organizer_id`);

-- 2. Add unique constraint to prevent duplicate event dates for the same organizer
-- Since event_date is in tbl_events table, we need to create a unique constraint
-- that works with the existing table structure
-- We'll create a unique index on organizer_id and event_id combination
-- and use triggers to enforce date-based uniqueness

-- First, let's add a unique constraint on organizer_id and event_id to prevent duplicate assignments
-- Drop the unique key if it exists to avoid duplicate key error
DROP INDEX IF EXISTS `unique_organizer_event` ON `tbl_event_organizer_assignments`;

-- Add the unique constraint back (this will only add it if it doesn't exist)
ALTER TABLE `tbl_event_organizer_assignments`
ADD UNIQUE KEY `unique_organizer_event` (`organizer_id`, `event_id`);

-- 3. Create a stored procedure to check for date conflicts before assigning organizers
DELIMITER $$

CREATE PROCEDURE `CheckOrganizerDateConflict`(
    IN p_organizer_id INT,
    IN p_event_date DATE,
    IN p_event_id INT,
    OUT p_has_conflict BOOLEAN,
    OUT p_conflict_message TEXT
)
BEGIN
    DECLARE conflict_count INT DEFAULT 0;

    -- Check if organizer is already assigned to another event on the same date
    SELECT COUNT(*)
    INTO conflict_count
    FROM tbl_event_organizer_assignments eoa
    JOIN tbl_events e ON eoa.event_id = e.event_id
    WHERE eoa.organizer_id = p_organizer_id
    AND e.event_date = p_event_date
    AND eoa.event_id != p_event_id
    AND eoa.status IN ('assigned', 'accepted')
    AND e.event_status NOT IN ('cancelled', 'done');

    IF conflict_count > 0 THEN
        SET p_has_conflict = TRUE;
        SET p_conflict_message = 'Organizer is already assigned to another event on this date';
    ELSE
        SET p_has_conflict = FALSE;
        SET p_conflict_message = 'No conflicts found';
    END IF;
END$$

DELIMITER ;

-- 4. Create a trigger to prevent duplicate organizer assignments on the same date
DELIMITER $$

CREATE TRIGGER `prevent_organizer_date_conflict`
BEFORE INSERT ON `tbl_event_organizer_assignments`
FOR EACH ROW
BEGIN
    DECLARE conflict_count INT DEFAULT 0;
    DECLARE event_date_val DATE;

    -- Get the event date for the event being assigned
    SELECT event_date INTO event_date_val
    FROM tbl_events
    WHERE event_id = NEW.event_id;

    -- Check for existing assignments on the same date
    SELECT COUNT(*) INTO conflict_count
    FROM tbl_event_organizer_assignments eoa
    JOIN tbl_events e ON eoa.event_id = e.event_id
    WHERE eoa.organizer_id = NEW.organizer_id
    AND e.event_date = event_date_val
    AND eoa.event_id != NEW.event_id
    AND eoa.status IN ('assigned', 'accepted')
    AND e.event_status NOT IN ('cancelled', 'done');

    IF conflict_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Organizer is already assigned to another event on this date';
    END IF;
END$$

DELIMITER ;

-- 5. Update the GetOrganizerEvents procedure to include date conflict information
DELIMITER $$

DROP PROCEDURE IF EXISTS `GetOrganizerEvents`$$

CREATE PROCEDURE `GetOrganizerEvents`(IN p_organizer_id INT)
BEGIN
    SELECT
        e.event_id,
        e.event_title,
        e.event_date,
        e.start_time,
        e.end_time,
        e.event_status,
        e.payment_status,
        e.guest_count,
        e.total_budget,
        e.down_payment,
        et.event_type_name,
        v.venue_title,
        v.venue_location,
        CONCAT(c.user_firstName, ' ', c.user_lastName) as client_name,
        c.user_email as client_email,
        c.user_contact as client_contact,
        c.user_pfp as client_pfp,
        eoa.assigned_at,
        eoa.status as assignment_status,
        -- Add conflict detection
        CASE
            WHEN EXISTS (
                SELECT 1 FROM tbl_event_organizer_assignments eoa2
                JOIN tbl_events e2 ON eoa2.event_id = e2.event_id
                WHERE eoa2.organizer_id = p_organizer_id
                AND e2.event_date = e.event_date
                AND eoa2.event_id != e.event_id
                AND eoa2.status IN ('assigned', 'accepted')
                AND e2.event_status NOT IN ('cancelled', 'done')
            ) THEN TRUE
            ELSE FALSE
        END as has_date_conflict
    FROM tbl_event_organizer_assignments eoa
    JOIN tbl_events e ON eoa.event_id = e.event_id
    LEFT JOIN tbl_users c ON e.user_id = c.user_id
    LEFT JOIN tbl_event_type et ON e.event_type_id = et.event_type_id
    LEFT JOIN tbl_venue v ON e.venue_id = v.venue_id
    WHERE eoa.organizer_id = p_organizer_id
    AND eoa.status IN ('assigned', 'accepted')
    ORDER BY e.event_date ASC, e.start_time ASC;
END$$

DELIMITER ;

-- 6. Create a function to get organizer availability for a specific date range
DELIMITER $$

CREATE FUNCTION `GetOrganizerAvailability`(
    p_organizer_id INT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TEXT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE conflict_dates TEXT DEFAULT '';
    DECLARE current_date DATE DEFAULT p_start_date;

    WHILE current_date <= p_end_date DO
        IF EXISTS (
            SELECT 1 FROM tbl_event_organizer_assignments eoa
            JOIN tbl_events e ON eoa.event_id = e.event_id
            WHERE eoa.organizer_id = p_organizer_id
            AND e.event_date = current_date
            AND eoa.status IN ('assigned', 'accepted')
            AND e.event_status NOT IN ('cancelled', 'done')
        ) THEN
            SET conflict_dates = CONCAT(conflict_dates, ',', current_date);
        END IF;
        SET current_date = DATE_ADD(current_date, INTERVAL 1 DAY);
    END WHILE;

    RETURN TRIM(LEADING ',' FROM conflict_dates);
END$$

DELIMITER ;

-- 7. Add a view for organizer calendar conflicts
CREATE VIEW `organizer_calendar_conflicts` AS
SELECT
    o.organizer_id,
    CONCAT(u.user_firstName, ' ', u.user_lastName) as organizer_name,
    e.event_date,
    COUNT(*) as event_count,
    GROUP_CONCAT(e.event_title SEPARATOR ', ') as conflicting_events,
    GROUP_CONCAT(e.event_id SEPARATOR ', ') as conflicting_event_ids
FROM tbl_organizer o
JOIN tbl_users u ON o.user_id = u.user_id
JOIN tbl_event_organizer_assignments eoa ON o.organizer_id = eoa.organizer_id
JOIN tbl_events e ON eoa.event_id = e.event_id
WHERE eoa.status IN ('assigned', 'accepted')
AND e.event_status NOT IN ('cancelled', 'done')
GROUP BY o.organizer_id, e.event_date
HAVING COUNT(*) > 1;

-- 8. Create a procedure to clean up duplicate assignments (if any exist)
DELIMITER $$

CREATE PROCEDURE `CleanupDuplicateOrganizerAssignments`()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_organizer_id INT;
    DECLARE v_event_date DATE;
    DECLARE v_keep_assignment_id INT;

    -- Cursor to find duplicate assignments
    DECLARE duplicate_cursor CURSOR FOR
        SELECT
            eoa.organizer_id,
            e.event_date,
            MIN(eoa.assignment_id) as keep_assignment_id
        FROM tbl_event_organizer_assignments eoa
        JOIN tbl_events e ON eoa.event_id = e.event_id
        WHERE eoa.status IN ('assigned', 'accepted')
        AND e.event_status NOT IN ('cancelled', 'done')
        GROUP BY eoa.organizer_id, e.event_date
        HAVING COUNT(*) > 1;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Start transaction
    START TRANSACTION;

    OPEN duplicate_cursor;

    read_loop: LOOP
        FETCH duplicate_cursor INTO v_organizer_id, v_event_date, v_keep_assignment_id;
        IF done THEN
            LEAVE read_loop;
        END IF;

        -- Delete duplicate assignments, keeping the one with the lowest assignment_id
        DELETE FROM tbl_event_organizer_assignments
        WHERE organizer_id = v_organizer_id
        AND assignment_id != v_keep_assignment_id
        AND event_id IN (
            SELECT event_id FROM tbl_events
            WHERE event_date = v_event_date
        );

    END LOOP;

    CLOSE duplicate_cursor;

    -- Commit transaction
    COMMIT;

    SELECT 'Duplicate organizer assignments cleaned up successfully' as result;
END$$

DELIMITER ;

-- 9. Add indexes for better performance on date-based queries
ALTER TABLE `tbl_events` ADD INDEX `idx_event_date_status` (`event_date`, `event_status`);
ALTER TABLE `tbl_event_organizer_assignments` ADD INDEX `idx_organizer_status` (`organizer_id`, `status`);

-- 10. Create a summary table for organizer workload
CREATE TABLE `tbl_organizer_workload_summary` (
    `summary_id` int(11) NOT NULL AUTO_INCREMENT,
    `organizer_id` int(11) NOT NULL,
    `summary_date` date NOT NULL,
    `total_events` int(11) DEFAULT 0,
    `confirmed_events` int(11) DEFAULT 0,
    `ongoing_events` int(11) DEFAULT 0,
    `completed_events` int(11) DEFAULT 0,
    `total_revenue` decimal(12,2) DEFAULT 0.00,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`summary_id`),
    UNIQUE KEY `unique_organizer_summary_date` (`organizer_id`, `summary_date`),
    KEY `idx_organizer_summary` (`organizer_id`, `summary_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 11. Create a procedure to update organizer workload summary
DELIMITER $$

CREATE PROCEDURE `UpdateOrganizerWorkloadSummary`(IN p_organizer_id INT, IN p_date DATE)
BEGIN
    INSERT INTO tbl_organizer_workload_summary (
        organizer_id,
        summary_date,
        total_events,
        confirmed_events,
        ongoing_events,
        completed_events,
        total_revenue
    )
    SELECT
        eoa.organizer_id,
        e.event_date,
        COUNT(*) as total_events,
        SUM(CASE WHEN e.event_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_events,
        SUM(CASE WHEN e.event_status = 'on_going' THEN 1 ELSE 0 END) as ongoing_events,
        SUM(CASE WHEN e.event_status = 'done' THEN 1 ELSE 0 END) as completed_events,
        SUM(e.total_budget) as total_revenue
    FROM tbl_event_organizer_assignments eoa
    JOIN tbl_events e ON eoa.event_id = e.event_id
    WHERE eoa.organizer_id = p_organizer_id
    AND e.event_date = p_date
    AND eoa.status IN ('assigned', 'accepted')
    GROUP BY eoa.organizer_id, e.event_date
    ON DUPLICATE KEY UPDATE
        total_events = VALUES(total_events),
        confirmed_events = VALUES(confirmed_events),
        ongoing_events = VALUES(ongoing_events),
        completed_events = VALUES(completed_events),
        total_revenue = VALUES(total_revenue),
        updated_at = current_timestamp();
END$$

DELIMITER ;

-- 12. Create a trigger to automatically update workload summary when assignments change
DELIMITER $$

CREATE TRIGGER `update_workload_on_assignment_change`
AFTER INSERT ON `tbl_event_organizer_assignments`
FOR EACH ROW
BEGIN
    DECLARE event_date_val DATE;

    SELECT event_date INTO event_date_val
    FROM tbl_events
    WHERE event_id = NEW.event_id;

    CALL UpdateOrganizerWorkloadSummary(NEW.organizer_id, event_date_val);
END$$

DELIMITER ;

-- 13. Create a trigger to update workload when assignment status changes
DELIMITER $$

CREATE TRIGGER `update_workload_on_status_change`
AFTER UPDATE ON `tbl_event_organizer_assignments`
FOR EACH ROW
BEGIN
    DECLARE event_date_val DATE;

    SELECT event_date INTO event_date_val
    FROM tbl_events
    WHERE event_id = NEW.event_id;

    CALL UpdateOrganizerWorkloadSummary(NEW.organizer_id, event_date_val);
END$$

DELIMITER ;

-- 14. Add comments to document the changes
-- This migration fixes:
-- 1. Duplicate key error for idx_organizer_id index
-- 2. Date duplication issues in organizer portal
-- 3. Adds proper conflict detection and prevention
-- 4. Improves performance with additional indexes
-- 5. Adds workload tracking for organizers

-- 15. Example usage and testing
--
-- CORRECT way to insert organizer assignments:
-- INSERT INTO tbl_event_organizer_assignments (event_id, organizer_id, assigned_by, status)
-- VALUES (1, 3, 7, 'assigned');
--
-- The trigger will automatically check for date conflicts and prevent duplicates.
-- The event_date is retrieved from tbl_events table via the trigger.

SELECT 'Migration completed successfully' as status;
