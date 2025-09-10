-- Migration: Add Organizer Assignment Feature
-- This migration adds functionality to assign organizers to events and track organizer assignments

-- Add organizer assignment tracking table
CREATE TABLE IF NOT EXISTS `tbl_event_organizer_assignments` (
  `assignment_id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `organizer_id` int(11) NOT NULL,
  `assigned_by` int(11) NOT NULL COMMENT 'Admin who assigned the organizer',
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('assigned','accepted','rejected','removed') DEFAULT 'assigned',
  `notes` text DEFAULT NULL COMMENT 'Admin notes about the assignment',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`assignment_id`),
  KEY `idx_event_id` (`event_id`),
  KEY `idx_organizer_id` (`organizer_id`),
  KEY `idx_assigned_by` (`assigned_by`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_event_organizer_event` FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_event_organizer_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `tbl_organizer` (`organizer_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_event_organizer_admin` FOREIGN KEY (`assigned_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Track organizer assignments to events';

-- Add index to tbl_events for organizer_id for better performance
ALTER TABLE `tbl_events` ADD INDEX `idx_organizer_id` (`organizer_id`);

-- Add trigger to log organizer assignments
DELIMITER $$
CREATE TRIGGER `log_organizer_assignment` AFTER INSERT ON `tbl_event_organizer_assignments` FOR EACH ROW
BEGIN
    -- Log the assignment in organizer activity logs
    INSERT INTO `tbl_organizer_activity_logs` (
        `organizer_id`,
        `activity_type`,
        `description`,
        `related_id`,
        `metadata`
    ) VALUES (
        NEW.organizer_id,
        'event_assigned',
        CONCAT('Assigned to event #', NEW.event_id),
        NEW.event_id,
        JSON_OBJECT(
            'assignment_id', NEW.assignment_id,
            'assigned_by', NEW.assigned_by,
            'status', NEW.status,
            'notes', NEW.notes
        )
    );

    -- Create notification for the organizer
    CALL CreateNotification(
        (SELECT user_id FROM tbl_organizer WHERE organizer_id = NEW.organizer_id),
        'event_assigned',
        'New Event Assignment',
        CONCAT('You have been assigned to event #', NEW.event_id, '. Please review the event details.'),
        'high',
        'calendar-check',
        CONCAT('/organizer/events/', NEW.event_id),
        NEW.event_id, NULL, NULL, NULL, NULL, NULL, 72
    );
END$$
DELIMITER ;

-- Add trigger to log organizer assignment updates
DELIMITER $$
CREATE TRIGGER `log_organizer_assignment_update` AFTER UPDATE ON `tbl_event_organizer_assignments` FOR EACH ROW
BEGIN
    -- Log the assignment update in organizer activity logs
    INSERT INTO `tbl_organizer_activity_logs` (
        `organizer_id`,
        `activity_type`,
        `description`,
        `related_id`,
        `metadata`
    ) VALUES (
        NEW.organizer_id,
        'event_assignment_updated',
        CONCAT('Event assignment #', NEW.event_id, ' status changed to ', NEW.status),
        NEW.event_id,
        JSON_OBJECT(
            'assignment_id', NEW.assignment_id,
            'old_status', OLD.status,
            'new_status', NEW.status,
            'updated_by', NEW.assigned_by
        )
    );
END$$
DELIMITER ;

-- Insert sample data for existing events with organizers (if any)
INSERT IGNORE INTO `tbl_event_organizer_assignments` (`event_id`, `organizer_id`, `assigned_by`, `status`)
SELECT
    e.event_id,
    e.organizer_id,
    e.admin_id,
    'assigned'
FROM `tbl_events` e
WHERE e.organizer_id IS NOT NULL AND e.organizer_id > 0;

-- Add stored procedure to assign organizer to event
DELIMITER $$
CREATE PROCEDURE `AssignOrganizerToEvent`(
    IN p_event_id INT,
    IN p_organizer_id INT,
    IN p_assigned_by INT,
    IN p_notes TEXT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Check if event exists
    IF NOT EXISTS (SELECT 1 FROM tbl_events WHERE event_id = p_event_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Event not found';
    END IF;

    -- Check if organizer exists
    IF NOT EXISTS (SELECT 1 FROM tbl_organizer WHERE organizer_id = p_organizer_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Organizer not found';
    END IF;

    -- Check if admin exists
    IF NOT EXISTS (SELECT 1 FROM tbl_users WHERE user_id = p_assigned_by AND user_role = 'admin') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admin not found or not authorized';
    END IF;

    -- Remove any existing assignments for this event
    DELETE FROM tbl_event_organizer_assignments WHERE event_id = p_event_id;

    -- Create new assignment
    INSERT INTO tbl_event_organizer_assignments (
        event_id,
        organizer_id,
        assigned_by,
        status,
        notes
    ) VALUES (
        p_event_id,
        p_organizer_id,
        p_assigned_by,
        'assigned',
        p_notes
    );

    -- Update the event with the organizer_id
    UPDATE tbl_events
    SET organizer_id = p_organizer_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE event_id = p_event_id;

    COMMIT;
END$$
DELIMITER ;

-- Add stored procedure to get event organizer details
DELIMITER $$
CREATE PROCEDURE `GetEventOrganizerDetails`(IN p_event_id INT)
BEGIN
    SELECT
        e.event_id,
        e.event_title,
        e.organizer_id,
        o.organizer_id as organizer_organizer_id,
        CONCAT(u.first_name, ' ', u.last_name) as organizer_name,
        u.email as organizer_email,
        u.contact_number as organizer_phone,
        o.organizer_experience,
        o.organizer_certifications,
        o.organizer_availability,
        eoa.assignment_id,
        eoa.assigned_by,
        CONCAT(admin.first_name, ' ', admin.last_name) as assigned_by_name,
        eoa.assigned_at,
        eoa.status as assignment_status,
        eoa.notes as assignment_notes
    FROM tbl_events e
    LEFT JOIN tbl_event_organizer_assignments eoa ON e.event_id = eoa.event_id AND eoa.status = 'assigned'
    LEFT JOIN tbl_organizer o ON eoa.organizer_id = o.organizer_id
    LEFT JOIN tbl_users u ON o.user_id = u.user_id
    LEFT JOIN tbl_users admin ON eoa.assigned_by = admin.user_id
    WHERE e.event_id = p_event_id;
END$$
DELIMITER ;

-- Add stored procedure to get organizer's assigned events
DELIMITER $$
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
        eoa.status as assignment_status
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

-- Add stored procedure to update organizer assignment status
DELIMITER $$
CREATE PROCEDURE `UpdateOrganizerAssignmentStatus`(
    IN p_assignment_id INT,
    IN p_status ENUM('assigned','accepted','rejected','removed'),
    IN p_updated_by INT
)
BEGIN
    DECLARE v_event_id INT;
    DECLARE v_organizer_id INT;

    -- Get assignment details
    SELECT event_id, organizer_id INTO v_event_id, v_organizer_id
    FROM tbl_event_organizer_assignments
    WHERE assignment_id = p_assignment_id;

    IF v_event_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Assignment not found';
    END IF;

    -- Update assignment status
    UPDATE tbl_event_organizer_assignments
    SET status = p_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE assignment_id = p_assignment_id;

    -- If rejected or removed, clear the organizer_id from the event
    IF p_status IN ('rejected', 'removed') THEN
        UPDATE tbl_events
        SET organizer_id = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE event_id = v_event_id;
    END IF;

    -- Log the status change
    INSERT INTO `tbl_organizer_activity_logs` (
        `organizer_id`,
        `activity_type`,
        `description`,
        `related_id`,
        `metadata`
    ) VALUES (
        v_organizer_id,
        'assignment_status_changed',
        CONCAT('Event assignment status changed to ', p_status),
        v_event_id,
        JSON_OBJECT(
            'assignment_id', p_assignment_id,
            'new_status', p_status,
            'updated_by', p_updated_by
        )
    );
END$$
DELIMITER ;
