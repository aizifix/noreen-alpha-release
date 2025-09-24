-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 23, 2025 at 10:47 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `es_v4`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `AssignOrganizerToEvent` (IN `p_event_id` INT, IN `p_organizer_id` INT, IN `p_assigned_by` INT, IN `p_notes` TEXT)   BEGIN
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

CREATE DEFINER=`root`@`localhost` PROCEDURE `CheckOrganizerDateConflict` (IN `p_organizer_id` INT, IN `p_event_date` DATE, IN `p_event_id` INT, OUT `p_has_conflict` BOOLEAN, OUT `p_conflict_message` TEXT)   BEGIN
    DECLARE conflict_count INT DEFAULT 0;
    DECLARE conflict_event_id INT;
    DECLARE conflict_event_title VARCHAR(255);

    -- Check if organizer is already assigned to another event on the same date
    SELECT COUNT(*), e.event_id, e.event_title
    INTO conflict_count, conflict_event_id, conflict_event_title
    FROM tbl_event_organizer_assignments eoa
    JOIN tbl_events e ON eoa.event_id = e.event_id
    WHERE eoa.organizer_id = p_organizer_id
    AND e.event_date = p_event_date
    AND eoa.event_id != p_event_id
    AND eoa.status IN ('assigned', 'accepted')
    AND e.event_status NOT IN ('cancelled', 'done');

    IF conflict_count > 0 THEN
        SET p_has_conflict = TRUE;
        SET p_conflict_message = CONCAT('Organizer is already assigned to event "', conflict_event_title, '" on ', p_event_date);
    ELSE
        SET p_has_conflict = FALSE;
        SET p_conflict_message = 'No conflicts found';
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `CleanupExpiredNotifications` ()   BEGIN
    -- Delete notifications that have expired
    DELETE FROM tbl_notifications 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    -- Delete read notifications older than 30 days
    DELETE FROM tbl_notifications 
    WHERE notification_status = 'read' 
    AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    -- Delete low priority notifications older than 7 days
    DELETE FROM tbl_notifications 
    WHERE notification_priority = 'low' 
    AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `CreateNotification` (IN `p_user_id` INT, IN `p_notification_type` VARCHAR(50), IN `p_notification_title` VARCHAR(255), IN `p_notification_message` TEXT, IN `p_notification_priority` VARCHAR(10), IN `p_notification_icon` VARCHAR(50), IN `p_notification_url` VARCHAR(500), IN `p_event_id` INT, IN `p_booking_id` INT, IN `p_venue_id` INT, IN `p_store_id` INT, IN `p_budget_id` INT, IN `p_feedback_id` INT, IN `p_expires_at` TIMESTAMP)   BEGIN
    INSERT INTO tbl_notifications (
        user_id,
        notification_type,
        notification_title,
        notification_message,
        notification_priority,
        notification_icon,
        notification_url,
        event_id,
        booking_id,
        venue_id,
        store_id,
        budget_id,
        feedback_id,
        expires_at,
        created_at
    )
    VALUES (
        p_user_id,
        p_notification_type,
        p_notification_title,
        p_notification_message,
        COALESCE(p_notification_priority, 'medium'),
        p_notification_icon,
        p_notification_url,
        p_event_id,
        p_booking_id,
        p_venue_id,
        p_store_id,
        p_budget_id,
        p_feedback_id,
        p_expires_at,
        NOW()
    );
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `CreatePaymentDueNotifications` ()   BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE booking_id INT;
    DECLARE user_id INT;
    DECLARE payment_due_date DATE;
    DECLARE days_until_due INT;
    
    -- Cursor for bookings with upcoming payments
    DECLARE payment_cursor CURSOR FOR
        SELECT 
            b.booking_id,
            b.user_id,
            b.payment_due_date
        FROM tbl_bookings b
        WHERE b.payment_due_date IS NOT NULL
        AND b.payment_due_date >= CURDATE()
        AND b.payment_due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        AND b.booking_status IN ('confirmed', 'pending_payment')
        AND NOT EXISTS (
            SELECT 1 FROM tbl_notifications n 
            WHERE n.booking_id = b.booking_id 
            AND n.notification_type = 'payment_due'
            AND n.created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
        );
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN payment_cursor;
    
    read_loop: LOOP
        FETCH payment_cursor INTO booking_id, user_id, payment_due_date;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        SET days_until_due = DATEDIFF(payment_due_date, CURDATE());
        
        -- Create notification based on urgency
        IF days_until_due = 0 THEN
            -- Payment due today
            CALL CreateNotification(
                user_id,
                'payment_due',
                'Payment Due Today',
                CONCAT('Your payment for booking #', booking_id, ' is due today.'),
                'urgent',
                'payment',
                CONCAT('/client/bookings/', booking_id),
                NULL,
                booking_id,
                NULL,
                NULL,
                NULL,
                NULL,
                DATE_ADD(NOW(), INTERVAL 24 HOUR)
            );
        ELSEIF days_until_due <= 3 THEN
            -- Payment due soon
            CALL CreateNotification(
                user_id,
                'payment_due',
                'Payment Due Soon',
                CONCAT('Your payment for booking #', booking_id, ' is due in ', days_until_due, ' day(s).'),
                'high',
                'payment',
                CONCAT('/client/bookings/', booking_id),
                NULL,
                booking_id,
                NULL,
                NULL,
                NULL,
                NULL,
                DATE_ADD(NOW(), INTERVAL 72 HOUR)
            );
        ELSE
            -- Payment due in a week
            CALL CreateNotification(
                user_id,
                'payment_due',
                'Payment Reminder',
                CONCAT('Your payment for booking #', booking_id, ' is due in ', days_until_due, ' day(s).'),
                'medium',
                'payment',
                CONCAT('/client/bookings/', booking_id),
                NULL,
                booking_id,
                NULL,
                NULL,
                NULL,
                NULL,
                DATE_ADD(NOW(), INTERVAL 168 HOUR)
            );
        END IF;
        
    END LOOP;
    
    CLOSE payment_cursor;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `GetEventOrganizerDetails` (IN `p_event_id` INT)   BEGIN
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

CREATE DEFINER=`root`@`localhost` PROCEDURE `GetOrganizerEvents` (IN `p_organizer_id` INT)   BEGIN
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

CREATE DEFINER=`root`@`localhost` PROCEDURE `UpdateOrganizerAssignmentStatus` (IN `p_assignment_id` INT, IN `p_status` ENUM('assigned','accepted','rejected','removed'), IN `p_updated_by` INT)   BEGIN
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

-- --------------------------------------------------------

--
-- Table structure for table `tbl_2fa`
--

CREATE TABLE `tbl_2fa` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `otp_code` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_bookings`
--

CREATE TABLE `tbl_bookings` (
  `booking_id` int(11) NOT NULL,
  `booking_reference` varchar(50) NOT NULL,
  `user_id` int(11) NOT NULL,
  `event_type_id` int(11) DEFAULT NULL,
  `event_name` varchar(255) DEFAULT NULL,
  `event_date` date DEFAULT NULL,
  `event_time` time DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `guest_count` int(11) NOT NULL DEFAULT 0,
  `venue_id` int(11) DEFAULT NULL,
  `package_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `booking_status` enum('pending','confirmed','converted','cancelled','completed') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `total_price` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_bookings`
--

INSERT INTO `tbl_bookings` (`booking_id`, `booking_reference`, `user_id`, `event_type_id`, `event_name`, `event_date`, `event_time`, `start_time`, `end_time`, `guest_count`, `venue_id`, `package_id`, `notes`, `booking_status`, `created_at`, `updated_at`, `total_price`) VALUES
(1, 'BK-20250717-1160', 20, 5, 'Morcillos Anniversary Party', '2025-07-23', '10:00:00', '10:00:00', NULL, 100, 30, 14, '', 'cancelled', '2025-07-16 20:55:08', '2025-07-17 03:41:09', NULL),
(2, 'BK-20250717-5172', 23, 5, 'Wedding Package ', '2025-07-22', '10:00:00', '10:00:00', NULL, 100, 30, 15, '', 'converted', '2025-07-16 20:56:45', '2025-07-17 03:40:05', NULL),
(3, 'BK-20250717-4233', 21, 5, 'Gamon Wedding', '2025-07-25', '10:00:00', '10:00:00', NULL, 100, 30, 15, '', 'confirmed', '2025-07-16 23:38:12', '2025-07-17 05:39:25', NULL),
(4, 'BK-20250717-9308', 29, 5, 'Weeding Package 2', '2025-07-26', '10:00:00', '10:00:00', NULL, 100, 30, 14, '', 'confirmed', '2025-07-16 23:59:17', '2025-07-17 06:00:44', NULL),
(5, 'BK-20250719-8510', 30, 5, 'Clyde Wedding Day!', '2025-08-15', '10:00:00', '10:00:00', NULL, 100, 30, 15, '', 'confirmed', '2025-07-18 21:06:00', '2025-07-19 03:08:55', NULL),
(6, 'BK-20250722-3053', 21, 5, 'Debut', '2025-08-01', '10:00:00', '10:00:00', NULL, 100, 30, 14, '', 'confirmed', '2025-07-22 00:32:27', '2025-07-22 06:33:13', NULL),
(7, 'BK-20250723-9399', 21, 5, 'Test', '2025-08-02', '10:00:00', '10:00:00', NULL, 100, 30, 15, '', 'confirmed', '2025-07-23 01:12:59', '2025-07-23 07:14:17', NULL),
(8, 'BK-20250809-7721', 20, 5, 'Notification Testing', '2025-10-25', '10:00:00', '10:00:00', NULL, 100, 30, 14, '', 'confirmed', '2025-08-09 06:07:03', '2025-08-09 12:15:23', NULL),
(9, 'BK-20250809-4973', 20, 2, 'Test', '2025-08-29', '10:00:00', '10:00:00', NULL, 100, 30, 19, '', 'confirmed', '2025-08-09 06:20:38', '2025-08-09 12:20:47', NULL),
(10, 'BK-20250812-9325', 20, 5, 'Test logs', '2025-10-03', '10:00:00', '10:00:00', NULL, 100, 29, 14, '', 'cancelled', '2025-08-12 11:41:27', '2025-08-13 05:23:00', NULL),
(11, 'BK-20250830-1256', 20, 1, 'teedt', '2025-11-08', '10:00:00', '10:00:00', NULL, 100, 29, 23, '', 'confirmed', '2025-08-30 01:54:10', '2025-08-30 07:58:46', NULL),
(12, 'BK-20250830-1779', 20, 2, 'Anniv', '2025-11-15', '10:00:00', '10:00:00', NULL, 100, 29, 19, '', 'confirmed', '2025-08-30 02:08:58', '2025-08-30 08:09:22', NULL),
(13, 'BK-20250908-9174', 20, 1, 'test_wedding', '2025-10-24', '10:00:00', '10:00:00', NULL, 100, 1, 25, '', 'cancelled', '2025-09-08 11:12:17', '2025-09-22 00:07:51', NULL),
(14, 'BK-20250913-5280', 20, 5, 'Test', '2025-10-31', NULL, NULL, NULL, 100, 30, 15, '', 'cancelled', '2025-09-12 22:45:05', '2025-09-22 00:07:07', 250000.00),
(15, 'BK-20250913-4422', 20, 5, 'Test', '2025-10-31', NULL, '12:00:00', '17:00:00', 100, 30, 15, '', 'confirmed', '2025-09-12 22:51:28', '2025-09-13 04:52:15', 250000.00),
(16, 'BK-20250922-7592', 20, 3, 'Test', '2025-10-01', NULL, '12:00:00', '17:00:00', 160, 34, 22, '', 'cancelled', '2025-09-21 17:36:09', '2025-09-21 23:59:24', 494000.00),
(17, 'BK-20250922-9694', 20, 10, 'nnn', '2025-09-23', NULL, '12:00:00', '17:00:00', 100, 1, 24, '', 'confirmed', '2025-09-21 18:08:24', '2025-09-22 04:47:06', 280000.00),
(18, 'BK-20250922-1878', 20, 1, 'Test', '2025-09-25', NULL, '12:00:00', '17:00:00', 300, 34, 25, '', 'confirmed', '2025-09-21 23:33:10', '2025-09-22 06:57:56', 255000.00);

--
-- Triggers `tbl_bookings`
--
DELIMITER $$
CREATE TRIGGER `notify_on_booking_status_change` AFTER UPDATE ON `tbl_bookings` FOR EACH ROW BEGIN
    DECLARE notification_title VARCHAR(255);
    DECLARE notification_message TEXT;
    DECLARE notification_type VARCHAR(50);
    DECLARE notification_icon VARCHAR(50);
    DECLARE notification_url VARCHAR(500);

    -- Only proceed if status actually changed
    IF OLD.booking_status != NEW.booking_status THEN

        -- Set notification details based on new status
        CASE NEW.booking_status
            WHEN 'confirmed' THEN
                SET notification_type = 'booking_confirmed';
                SET notification_title = 'Booking Confirmed';
                SET notification_message = CONCAT('Your booking ', NEW.booking_reference, ' has been confirmed! You can now proceed with event planning.');
                SET notification_icon = 'check-circle';
                SET notification_url = CONCAT('/client/bookings/', NEW.booking_id);

            WHEN 'cancelled' THEN
                SET notification_type = 'booking_cancelled';
                SET notification_title = 'Booking Cancelled';
                SET notification_message = CONCAT('Your booking ', NEW.booking_reference, ' has been cancelled.');
                SET notification_icon = 'x-circle';
                SET notification_url = CONCAT('/client/bookings/', NEW.booking_id);

            WHEN 'completed' THEN
                SET notification_type = 'booking_completed';
                SET notification_title = 'Booking Completed';
                SET notification_message = CONCAT('Your booking ', NEW.booking_reference, ' has been completed successfully.');
                SET notification_icon = 'check-circle-2';
                SET notification_url = CONCAT('/client/bookings/', NEW.booking_id);

            ELSE
                SET notification_type = 'general';
                SET notification_title = 'Booking Status Updated';
                SET notification_message = CONCAT('Your booking ', NEW.booking_reference, ' status has been updated to ', NEW.booking_status, '.');
                SET notification_icon = 'info';
                SET notification_url = CONCAT('/client/bookings/', NEW.booking_id);
        END CASE;

        -- Send notification to client
        CALL CreateNotification(
            NEW.user_id,
            notification_type,
            notification_title,
            notification_message,
            'high',
            notification_icon,
            notification_url,
            NULL, NEW.booking_id, NEW.venue_id, NULL, NULL, NULL, 168
        );
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_on_new_booking` AFTER INSERT ON `tbl_bookings` FOR EACH ROW BEGIN
    DECLARE admin_ids TEXT;
    DECLARE admin_id INT;
    DECLARE done INT DEFAULT FALSE;
    DECLARE admin_cursor CURSOR FOR
        SELECT user_id FROM tbl_users WHERE user_role = 'admin';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Notify all admins about new booking
    OPEN admin_cursor;
    admin_loop: LOOP
        FETCH admin_cursor INTO admin_id;
        IF done THEN
            LEAVE admin_loop;
        END IF;

        CALL CreateNotification(
            admin_id,
            'booking_created',
            'New Booking Created',
            CONCAT('New booking ', NEW.booking_reference, ' has been created and requires your review.'),
            'high',
            'calendar-plus',
            CONCAT('/admin/bookings/', NEW.booking_id),
            NULL, NEW.booking_id, NEW.venue_id, NULL, NULL, NULL, 72
        );
    END LOOP;
    CLOSE admin_cursor;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_booking_activity_logs`
--

CREATE TABLE `tbl_booking_activity_logs` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` enum('created','confirmed','pending','cancelled','completed','payment_received','payment_pending','viewed','modified','assigned_organizer','offer_sent','offer_accepted','offer_rejected') NOT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_booking_activity_logs`
--

INSERT INTO `tbl_booking_activity_logs` (`id`, `booking_id`, `user_id`, `action`, `old_status`, `new_status`, `description`, `metadata`, `created_at`) VALUES
(1, 10, 20, 'created', NULL, 'pending', 'Booking BK-20250812-9325 created for Test logs on 2025-10-03 with 100 guests', '{\"booking_reference\":\"BK-20250812-9325\",\"event_type_id\":5,\"event_date\":\"2025-10-03\",\"guest_count\":100,\"venue_id\":29,\"package_id\":14}', '2025-08-13 01:41:27'),
(2, 10, 7, '', 'pending', 'cancelled', 'Booking BK-20250812-9325 status changed to cancelled', '{\"booking_reference\":\"BK-20250812-9325\"}', '2025-08-13 13:23:00'),
(3, 11, 20, 'created', NULL, 'pending', 'Booking BK-20250830-1256 created for teedt on 2025-11-08 with 100 guests', '{\"booking_reference\":\"BK-20250830-1256\",\"event_type_id\":1,\"event_date\":\"2025-11-08\",\"guest_count\":100,\"venue_id\":29,\"package_id\":23}', '2025-08-30 15:54:10'),
(4, 11, 7, '', 'pending', 'confirmed', 'Booking BK-20250830-1256 status changed to confirmed', '{\"booking_reference\":\"BK-20250830-1256\"}', '2025-08-30 15:58:46'),
(5, 12, 20, 'created', NULL, 'pending', 'Booking BK-20250830-1779 created for Anniv on 2025-11-15 with 100 guests', '{\"booking_reference\":\"BK-20250830-1779\",\"event_type_id\":2,\"event_date\":\"2025-11-15\",\"guest_count\":100,\"venue_id\":29,\"package_id\":19}', '2025-08-30 16:08:58'),
(6, 12, 7, '', 'pending', 'confirmed', 'Booking BK-20250830-1779 status changed to confirmed', '{\"booking_reference\":\"BK-20250830-1779\"}', '2025-08-30 16:09:22'),
(7, 13, 20, 'created', NULL, 'pending', 'Booking BK-20250908-9174 created for test_wedding on 2025-10-24 with 100 guests', '{\"booking_reference\":\"BK-20250908-9174\",\"event_type_id\":1,\"event_date\":\"2025-10-24\",\"guest_count\":100,\"venue_id\":1,\"package_id\":25}', '2025-09-09 01:12:17'),
(8, 14, 20, 'created', NULL, 'pending', 'Booking BK-20250913-5280 created for Test on 2025-10-31 with 100 guests', '{\"booking_reference\":\"BK-20250913-5280\",\"event_type_id\":5,\"event_date\":\"2025-10-31\",\"guest_count\":100,\"venue_id\":30,\"package_id\":15}', '2025-09-13 12:45:05'),
(9, 15, 20, 'created', NULL, 'pending', 'Booking BK-20250913-4422 created for Test on 2025-10-31 with 100 guests', '{\"booking_reference\":\"BK-20250913-4422\",\"event_type_id\":5,\"event_date\":\"2025-10-31\",\"guest_count\":100,\"venue_id\":30,\"package_id\":15}', '2025-09-13 12:51:28'),
(10, 15, 7, '', 'pending', 'confirmed', 'Booking BK-20250913-4422 status changed to confirmed', '{\"booking_reference\":\"BK-20250913-4422\"}', '2025-09-13 12:52:16'),
(11, 16, 20, 'created', NULL, 'pending', 'Booking BK-20250922-7592 created for Test on 2025-10-01 with 160 guests', '{\"booking_reference\":\"BK-20250922-7592\",\"event_type_id\":3,\"event_date\":\"2025-10-01\",\"guest_count\":160,\"venue_id\":34,\"package_id\":22}', '2025-09-22 07:36:10'),
(12, 16, 7, '', 'pending', 'cancelled', 'Booking BK-20250922-7592 status changed to cancelled', '{\"booking_reference\":\"BK-20250922-7592\"}', '2025-09-22 07:59:24'),
(13, 14, 7, '', 'pending', 'cancelled', 'Booking BK-20250913-5280 status changed to cancelled', '{\"booking_reference\":\"BK-20250913-5280\"}', '2025-09-22 08:07:07'),
(14, 13, 7, '', 'pending', 'cancelled', 'Booking BK-20250908-9174 status changed to cancelled', '{\"booking_reference\":\"BK-20250908-9174\"}', '2025-09-22 08:07:51'),
(15, 17, 20, 'created', NULL, 'pending', 'Booking BK-20250922-9694 created for nnn on 2025-09-23 with 100 guests', '{\"booking_reference\":\"BK-20250922-9694\",\"event_type_id\":10,\"event_date\":\"2025-09-23\",\"guest_count\":100,\"venue_id\":1,\"package_id\":24}', '2025-09-22 08:08:24'),
(16, 17, 7, '', 'pending', 'confirmed', 'Booking BK-20250922-9694 status changed to confirmed', '{\"booking_reference\":\"BK-20250922-9694\"}', '2025-09-22 12:47:06'),
(17, 18, 20, 'created', NULL, 'pending', 'Booking BK-20250922-1878 created for Test on 2025-09-25 with 300 guests', '{\"booking_reference\":\"BK-20250922-1878\",\"event_type_id\":1,\"event_date\":\"2025-09-25\",\"guest_count\":300,\"venue_id\":34,\"package_id\":25}', '2025-09-22 13:33:10'),
(18, 18, 7, '', 'pending', 'confirmed', 'Booking BK-20250922-1878 status changed to confirmed', '{\"booking_reference\":\"BK-20250922-1878\"}', '2025-09-22 14:57:56');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_booking_custom_inclusions`
--

CREATE TABLE `tbl_booking_custom_inclusions` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `inclusion_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_booking_removed_inclusions`
--

CREATE TABLE `tbl_booking_removed_inclusions` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `inclusion_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_budget`
--

CREATE TABLE `tbl_budget` (
  `budget_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `total_budget` decimal(10,2) NOT NULL,
  `allocated_budget` decimal(10,2) NOT NULL,
  `remaining_budget` decimal(10,2) NOT NULL,
  `downpayment_amount` decimal(10,2) NOT NULL,
  `payment_status` enum('pending','partial','paid') NOT NULL DEFAULT 'pending',
  `payment_date` date DEFAULT NULL,
  `budget_file` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_document_types`
--

CREATE TABLE `tbl_document_types` (
  `type_id` int(11) NOT NULL,
  `type_code` varchar(50) NOT NULL,
  `type_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_required` tinyint(1) DEFAULT 0,
  `max_file_size_mb` int(11) DEFAULT 10,
  `allowed_extensions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '["pdf", "jpg", "jpeg", "png", "doc", "docx"]' CHECK (json_valid(`allowed_extensions`)),
  `display_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_document_types`
--

INSERT INTO `tbl_document_types` (`type_id`, `type_code`, `type_name`, `description`, `is_required`, `max_file_size_mb`, `allowed_extensions`, `display_order`, `is_active`, `created_at`) VALUES
(1, 'dti', 'DTI Permit', 'Department of Trade and Industry business registration permit', 1, 10, '[\"pdf\", \"jpg\", \"jpeg\", \"png\", \"doc\", \"docx\"]', 1, 1, '2025-07-11 14:09:47'),
(2, 'business_permit', 'Business Permit', 'Local government business permit and licenses', 1, 10, '[\"pdf\", \"jpg\", \"jpeg\", \"png\", \"doc\", \"docx\"]', 2, 1, '2025-07-11 14:09:47'),
(3, 'contract', 'Service Contract', 'Signed service agreements and contracts', 1, 10, '[\"pdf\", \"jpg\", \"jpeg\", \"png\", \"doc\", \"docx\"]', 3, 1, '2025-07-11 14:09:47'),
(4, 'portfolio', 'Portfolio', 'Work samples and portfolio documents', 0, 10, '[\"pdf\", \"jpg\", \"jpeg\", \"png\", \"doc\", \"docx\"]', 4, 1, '2025-07-11 14:09:47'),
(5, 'certification', 'Certification', 'Professional certifications and awards', 0, 10, '[\"pdf\", \"jpg\", \"jpeg\", \"png\", \"doc\", \"docx\"]', 5, 1, '2025-07-11 14:09:47'),
(6, 'other', 'Other Documents', 'Miscellaneous supporting documents', 0, 10, '[\"pdf\", \"jpg\", \"jpeg\", \"png\", \"doc\", \"docx\"]', 6, 1, '2025-07-11 14:09:47');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_email_logs`
--

CREATE TABLE `tbl_email_logs` (
  `email_log_id` int(11) NOT NULL,
  `recipient_email` varchar(255) NOT NULL,
  `recipient_name` varchar(255) DEFAULT NULL,
  `email_type` enum('supplier_welcome','password_reset','document_verification','booking_notification','payment_notification','general') NOT NULL,
  `subject` varchar(500) NOT NULL,
  `email_content` text DEFAULT NULL,
  `sent_status` enum('pending','sent','failed') DEFAULT 'pending',
  `sent_at` datetime DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `related_user_id` int(11) DEFAULT NULL,
  `related_supplier_id` int(11) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_email_logs`
--

INSERT INTO `tbl_email_logs` (`email_log_id`, `recipient_email`, `recipient_name`, `email_type`, `subject`, `email_content`, `sent_status`, `sent_at`, `error_message`, `related_user_id`, `related_supplier_id`, `metadata`, `created_at`) VALUES
(1, 'lasi.anches.coc@phinmaed.com', 'Boss Zata', '', 'Welcome to Event Coordination System - Organizer Portal', NULL, 'failed', NULL, 'Email sending failed: SMTP connect() failed. https://github.com/PHPMailer/PHPMailer/wiki/Troubleshooting', NULL, 1, NULL, '2025-07-14 23:17:17'),
(2, 'lasi.anches.coc@phinmaed.com', 'Boss Zata', '', 'Welcome to Event Coordination System - Organizer Portal', NULL, 'failed', NULL, 'Email sending failed: SMTP connect() failed. https://github.com/PHPMailer/PHPMailer/wiki/Troubleshooting', NULL, 2, NULL, '2025-07-14 23:23:14'),
(3, 'lasi.anches.coc@phinmaed.com', 'Boss Zata', '', 'Welcome to Event Coordination System - Organizer Portal', NULL, 'failed', NULL, 'Email sending failed: SMTP connect() failed. https://github.com/PHPMailer/PHPMailer/wiki/Troubleshooting', NULL, 3, NULL, '2025-07-14 23:24:43'),
(4, 'rendon@gmail.com', 'Rendon Labrabis', '', 'Welcome to Event Coordination System - Organizer Portal', NULL, 'failed', NULL, 'Email sending failed: SMTP connect() failed. https://github.com/PHPMailer/PHPMailer/wiki/Troubleshooting', NULL, 4, NULL, '2025-07-17 02:32:00'),
(5, 'rhienmanoy@gmail.com', 'Rhein Manoy', '', 'Welcome to Event Coordination System - Organizer Portal', NULL, 'failed', NULL, 'Email sending failed: SMTP connect() failed. https://github.com/PHPMailer/PHPMailer/wiki/Troubleshooting', NULL, 5, NULL, '2025-07-22 10:44:55'),
(6, 'brianrenan@gmail.com', 'Brian Renan', '', 'Welcome to Event Coordination System - Organizer Portal', NULL, 'failed', NULL, 'Email sending failed: SMTP connect() failed. https://github.com/PHPMailer/PHPMailer/wiki/Troubleshooting', NULL, 6, NULL, '2025-07-27 18:48:23'),
(7, 'startup@gmail.com', 'Start Up', '', 'Welcome to Event Coordination System - Organizer Portal', NULL, 'failed', NULL, 'Email sending failed: SMTP connect() failed. https://github.com/PHPMailer/PHPMailer/wiki/Troubleshooting', NULL, 7, NULL, '2025-08-14 00:22:48');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_events`
--

CREATE TABLE `tbl_events` (
  `event_id` int(11) NOT NULL,
  `original_booking_reference` varchar(50) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `organizer_id` int(11) DEFAULT NULL,
  `event_title` varchar(255) NOT NULL,
  `event_theme` varchar(255) DEFAULT NULL,
  `event_description` text DEFAULT NULL,
  `church_location` varchar(500) DEFAULT NULL COMMENT 'Church location for wedding events',
  `church_start_time` time DEFAULT NULL COMMENT 'Church ceremony start time for wedding events',
  `event_type_id` int(11) NOT NULL,
  `guest_count` int(11) NOT NULL DEFAULT 0,
  `event_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `payment_status` enum('unpaid','partial','paid','refunded') DEFAULT 'unpaid',
  `venue_payment_status` enum('unpaid','partial','paid','cancelled') NOT NULL DEFAULT 'unpaid',
  `package_id` int(11) DEFAULT NULL,
  `venue_id` int(11) DEFAULT NULL,
  `total_budget` decimal(12,2) NOT NULL DEFAULT 0.00,
  `down_payment` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_schedule_type_id` int(11) DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `additional_notes` text DEFAULT NULL,
  `event_status` enum('done','confirmed','on_going','cancelled') NOT NULL DEFAULT 'done',
  `booking_date` date DEFAULT NULL,
  `booking_time` time DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `event_attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'File attachments for the event' CHECK (json_valid(`event_attachments`)),
  `wedding_details_completed` tinyint(1) DEFAULT 0,
  `event_feedback_id` int(11) DEFAULT NULL COMMENT 'Link to feedback if available',
  `event_wedding_form_id` int(11) DEFAULT NULL COMMENT 'Link to wedding details if wedding event',
  `is_recurring` tinyint(1) DEFAULT 0 COMMENT 'Flag for recurring events',
  `recurrence_rule` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Recurrence configuration (iCal-style or custom)' CHECK (json_valid(`recurrence_rule`)),
  `cancellation_reason` text DEFAULT NULL COMMENT 'Reason for cancellation if applicable',
  `finalized_at` datetime DEFAULT NULL COMMENT 'When event details were finalized',
  `client_signature` text DEFAULT NULL COMMENT 'Digital signature reference or file path'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_events`
--

INSERT INTO `tbl_events` (`event_id`, `original_booking_reference`, `user_id`, `admin_id`, `organizer_id`, `event_title`, `event_theme`, `event_description`, `church_location`, `church_start_time`, `event_type_id`, `guest_count`, `event_date`, `start_time`, `end_time`, `payment_status`, `venue_payment_status`, `package_id`, `venue_id`, `total_budget`, `down_payment`, `payment_method`, `payment_schedule_type_id`, `reference_number`, `additional_notes`, `event_status`, `booking_date`, `booking_time`, `created_by`, `updated_by`, `created_at`, `updated_at`, `event_attachments`, `wedding_details_completed`, `event_feedback_id`, `event_wedding_form_id`, `is_recurring`, `recurrence_rule`, `cancellation_reason`, `finalized_at`, `client_signature`) VALUES
(1, NULL, 20, 7, 3, 'AAA Type of wedding v5', 'color-coordinated', NULL, NULL, NULL, 1, 100, '2025-07-18', '10:00:00', '18:00:00', 'partial', 'partial', 15, 29, 219000.00, 153300.00, 'cash', 2, NULL, NULL, 'done', NULL, NULL, NULL, NULL, '2025-07-16 16:37:10', '2025-09-11 02:51:28', '[{\"original_name\":\"Anches - Business Plan.docx\",\"file_name\":\"1752683814_6877d526720af.docx\",\"file_path\":\"uploads/event_attachments/1752683814_6877d526720af.docx\",\"file_size\":9810,\"file_type\":\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-16T16:36:54.473Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-16 16:37:10', NULL),
(2, NULL, 23, 7, NULL, 'AAA Type of wedding new', 'cultural-traditional', NULL, NULL, NULL, 5, 100, '2025-07-19', '10:00:00', '18:00:00', 'partial', 'partial', 20, 34, 297000.00, 282150.00, 'cash', 2, NULL, NULL, 'done', NULL, NULL, NULL, NULL, '2025-07-16 18:19:46', '2025-09-08 15:00:09', '[{\"original_name\":\"Anches - Business Plan.docx\",\"file_name\":\"1752689964_6877ed2cab38e.docx\",\"file_path\":\"uploads/event_attachments/1752689964_6877ed2cab38e.docx\",\"file_size\":9810,\"file_type\":\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-16T18:19:24.724Z\"},{\"original_name\":\"1752683814_6877d526720af.docx\",\"file_name\":\"1752689968_6877ed30539c7.docx\",\"file_path\":\"uploads/event_attachments/1752689968_6877ed30539c7.docx\",\"file_size\":9810,\"file_type\":\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-16T18:19:28.364Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-16 18:19:46', NULL),
(3, 'BK-20250717-5172', 23, 7, 4, 'Wedding Package ', 'Theme', NULL, NULL, NULL, 5, 100, '2025-07-22', '10:00:00', '10:00:00', 'partial', 'partial', 15, 30, 181000.00, 153850.00, 'cash', 2, NULL, NULL, 'done', NULL, NULL, NULL, NULL, '2025-07-17 03:40:05', '2025-09-11 02:51:28', '[{\"original_name\":\"Anches - Business Plan.docx\",\"file_name\":\"1752723581_6878707d19f15.docx\",\"file_path\":\"uploads/event_attachments/1752723581_6878707d19f15.docx\",\"file_size\":9810,\"file_type\":\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-17T03:39:41.108Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-17 03:40:05', NULL),
(4, NULL, 21, 7, 3, 'Gamon Wedding', 'boho-chic', NULL, NULL, NULL, 5, 100, '2025-07-25', '10:00:00', '10:00:00', 'partial', 'partial', 15, 30, 188000.00, 94000.00, 'cash', 2, NULL, NULL, 'done', NULL, NULL, NULL, NULL, '2025-07-17 05:46:14', '2025-09-11 02:51:28', '[{\"original_name\":\"Anches - Business Plan.docx\",\"file_name\":\"1752731156_68788e146bb9c.docx\",\"file_path\":\"uploads/event_attachments/1752731156_68788e146bb9c.docx\",\"file_size\":9810,\"file_type\":\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-17T05:45:56.445Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-17 05:46:14', NULL),
(5, NULL, 29, 7, 3, 'Weeding Package 2', 'Theme', NULL, NULL, NULL, 5, 100, '2025-07-26', '10:00:00', '10:00:00', 'partial', 'partial', 19, 30, 90000.00, 45000.00, 'cash', 2, NULL, NULL, 'done', NULL, NULL, NULL, NULL, '2025-07-17 06:10:22', '2025-09-11 02:51:28', '[{\"original_name\":\"SMC_Key_Executives_and_Heritage_Leaders_Updated.pdf\",\"file_name\":\"1752732530_68789372b65a6.pdf\",\"file_path\":\"uploads/event_attachments/1752732530_68789372b65a6.pdf\",\"file_size\":3191,\"file_type\":\"application/pdf\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-17T06:08:50.750Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-17 06:10:22', NULL),
(6, NULL, 29, 7, NULL, 'Weeding Package 2', 'Minimalist', 'The client wants a very minimal setup, but very functional', NULL, NULL, 1, 150, '2025-07-28', '10:00:00', '10:00:00', 'partial', 'partial', NULL, 34, 145000.00, 123250.00, 'cash', 2, NULL, NULL, 'done', NULL, NULL, NULL, NULL, '2025-07-17 15:16:52', '2025-09-08 15:00:09', '[{\"original_name\":\"Untitled1031_20250624011453.png\",\"file_name\":\"1752765074_6879129298c72.png\",\"file_path\":\"uploads/event_attachments/1752765074_6879129298c72.png\",\"file_size\":2649900,\"file_type\":\"image/png\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-17T15:11:14.627Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-17 15:16:52', 'Approved!'),
(7, NULL, 23, 7, NULL, 'Customized Event 2', 'art-deco', 'Art decoration related', NULL, NULL, 5, 200, '2025-07-31', '10:00:00', '18:00:00', 'partial', 'partial', NULL, 29, 154000.00, 130900.00, 'cash', 2, NULL, NULL, 'done', NULL, NULL, NULL, NULL, '2025-07-17 15:53:10', '2025-09-08 15:00:09', '[{\"original_name\":\"1752683814_6877d526720af.docx\",\"file_name\":\"1752767561_68791c49b2159.docx\",\"file_path\":\"uploads/event_attachments/1752767561_68791c49b2159.docx\",\"file_size\":9810,\"file_type\":\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-17T15:52:41.732Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-17 15:53:10', 'Approved!'),
(8, NULL, 20, 7, 4, 'Custom Event 3', 'tropical-paradise', NULL, NULL, NULL, 2, 500, '2025-07-30', '10:00:00', '18:00:00', 'partial', 'partial', NULL, 34, 10157000.00, 8633450.00, 'cash', 2, NULL, NULL, 'done', NULL, NULL, NULL, NULL, '2025-07-17 16:14:22', '2025-09-11 02:51:28', '[{\"original_name\":\"Elevate_IT_Services_Business_Plan.txt\",\"file_name\":\"1752768848_6879215003910.txt\",\"file_path\":\"uploads/event_attachments/1752768848_6879215003910.txt\",\"file_size\":4485,\"file_type\":\"text/plain\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-17T16:14:08.029Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-17 16:14:22', NULL),
(9, NULL, 29, 7, 3, 'Birthday Event', 'Theme', NULL, NULL, NULL, 3, 500, '2025-08-08', '10:00:00', '18:00:00', 'partial', 'partial', NULL, 29, 767000.00, 613600.00, 'cash', 2, NULL, NULL, 'done', NULL, NULL, NULL, NULL, '2025-07-17 16:54:53', '2025-09-11 02:51:28', '[{\"original_name\":\"1752683814_6877d526720af.docx\",\"file_name\":\"1752770207_6879269fb3081.docx\",\"file_path\":\"uploads/event_attachments/1752770207_6879269fb3081.docx\",\"file_size\":9810,\"file_type\":\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-17T16:36:47.735Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-17 16:54:53', NULL),
(10, NULL, 29, 7, 4, 'Customized Event 8', 'Theme', NULL, NULL, NULL, 5, 100, '2025-08-12', '10:00:00', '18:00:00', 'partial', 'partial', NULL, 34, 47000.00, 37600.00, 'cash', 2, NULL, NULL, 'confirmed', NULL, NULL, NULL, NULL, '2025-07-18 06:56:14', '2025-09-11 02:51:28', '[{\"original_name\":\"1752683814_6877d526720af.docx\",\"file_name\":\"1752818709_6879e41542d82.docx\",\"file_path\":\"uploads/event_attachments/1752818709_6879e41542d82.docx\",\"file_size\":9810,\"file_type\":\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-18T06:05:09.275Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-18 06:56:14', NULL),
(11, NULL, 21, 7, NULL, 'CUSTOMIZED PACKAGE 9', 'cultural-traditional', NULL, NULL, NULL, 3, 200, '2025-08-28', '10:00:00', '18:00:00', 'partial', 'partial', NULL, 29, 182000.00, 91000.00, 'cash', 2, NULL, NULL, 'confirmed', NULL, NULL, NULL, NULL, '2025-07-18 07:44:00', '2025-09-08 15:00:09', '[{\"original_name\":\"1752683814_6877d526720af.docx\",\"file_name\":\"1752824595_6879fb13c5f4f.docx\",\"file_path\":\"uploads/event_attachments/1752824595_6879fb13c5f4f.docx\",\"file_size\":9810,\"file_type\":\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-18T07:43:15.812Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-18 07:44:00', NULL),
(12, NULL, 30, 7, 3, 'Clyde Wedding Day!', 'Other Celebration', NULL, NULL, NULL, 5, 300, '2025-08-15', '10:00:00', '10:00:00', 'paid', 'paid', 15, 30, 221000.00, 176800.00, 'cash', 2, NULL, NULL, 'confirmed', NULL, NULL, NULL, NULL, '2025-07-19 03:10:50', '2025-09-11 02:51:28', '[{\"original_name\":\"1752683814_6877d526720af.docx\",\"file_name\":\"1752894628_687b0ca473b36.docx\",\"file_path\":\"uploads/event_attachments/1752894628_687b0ca473b36.docx\",\"file_size\":9810,\"file_type\":\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-19T03:10:28.476Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-19 03:10:50', NULL),
(13, NULL, 20, 7, 3, 'Jesse Golden Wedding', 'cultural-traditional', NULL, NULL, NULL, 1, 300, '2025-08-31', '10:00:00', '18:00:00', 'partial', 'partial', 23, 0, 770000.00, 385000.00, 'cash', 2, NULL, NULL, 'confirmed', NULL, NULL, NULL, NULL, '2025-07-19 04:50:36', '2025-09-11 02:51:28', NULL, 0, NULL, NULL, 0, NULL, NULL, '2025-07-19 04:50:36', NULL),
(31, NULL, 29, 7, 3, 'Test', 'vintage-romance', NULL, NULL, NULL, 3, 100, '2025-09-10', '10:00:00', '23:59:00', 'paid', 'paid', 22, 34, 120120.00, 84084.00, 'cash', 2, NULL, NULL, 'confirmed', NULL, NULL, NULL, NULL, '2025-07-21 18:38:01', '2025-09-11 02:51:28', '[{\"original_name\":\"dd352a67-1871-48b0-96b9-17862c1e1d1b.jpg\",\"file_name\":\"1753122341_687e8625539ce.jpg\",\"file_path\":\"uploads/event_attachments/1753122341_687e8625539ce.jpg\",\"file_size\":393207,\"file_type\":\"image/jpeg\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-21T18:25:41.361Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-21 18:38:01', NULL),
(32, NULL, 29, 7, 3, 'Kimi K2 - Test 2', 'Sample', NULL, NULL, NULL, 3, 100, '2025-09-18', '10:00:00', '23:59:00', 'paid', 'paid', 22, 29, 161000.00, 120750.00, 'cash', 2, NULL, NULL, 'confirmed', NULL, NULL, NULL, NULL, '2025-07-22 01:05:43', '2025-09-11 02:51:28', '[{\"original_name\":\"dd352a67-1871-48b0-96b9-17862c1e1d1b.jpg\",\"file_name\":\"1753146327_687ee3d73d7e8.jpg\",\"file_path\":\"uploads/event_attachments/1753146327_687ee3d73d7e8.jpg\",\"file_size\":393207,\"file_type\":\"image/jpeg\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-22T01:05:27.259Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-22 01:05:43', NULL),
(33, NULL, 23, 7, 4, 'Christine\'s Birthday', 'fairy-tale', NULL, NULL, NULL, 3, 100, '2025-09-19', '10:00:00', '23:59:00', 'partial', 'partial', 22, 34, 128000.00, 96000.00, 'cash', 2, NULL, NULL, 'confirmed', NULL, NULL, NULL, NULL, '2025-07-22 01:10:54', '2025-09-11 02:51:28', '[{\"original_name\":\"dd352a67-1871-48b0-96b9-17862c1e1d1b.jpg\",\"file_name\":\"1753146640_687ee51039fd9.jpg\",\"file_path\":\"uploads/event_attachments/1753146640_687ee51039fd9.jpg\",\"file_size\":393207,\"file_type\":\"image/jpeg\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-22T01:10:40.254Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-22 01:10:54', NULL),
(34, NULL, 20, 7, 4, 'Test Paymnet Test', 'boho-chic', NULL, NULL, NULL, 3, 100, '2025-09-20', '10:00:00', '23:59:00', 'unpaid', 'unpaid', 22, 34, 128000.00, 89600.00, 'cash', 2, NULL, NULL, 'confirmed', NULL, NULL, NULL, NULL, '2025-07-22 01:42:11', '2025-09-11 02:51:28', '[{\"original_name\":\"dd352a67-1871-48b0-96b9-17862c1e1d1b.jpg\",\"file_name\":\"1753148520_687eec68d8982.jpg\",\"file_path\":\"uploads/event_attachments/1753148520_687eec68d8982.jpg\",\"file_size\":393207,\"file_type\":\"image/jpeg\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-22T01:42:00.906Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-22 01:42:10', NULL),
(35, NULL, 20, 7, 4, 'Payment Issue Fix', 'color-coordinated', NULL, NULL, NULL, 5, 300, '2025-09-21', '10:30:00', '23:59:00', 'paid', 'paid', 23, 29, 412000.00, 309000.00, 'cash', 2, NULL, NULL, 'confirmed', NULL, NULL, NULL, NULL, '2025-07-22 02:19:13', '2025-09-11 02:51:28', '[{\"original_name\":\"dd352a67-1871-48b0-96b9-17862c1e1d1b.jpg\",\"file_name\":\"1753150735_687ef50f80b46.jpg\",\"file_path\":\"uploads/event_attachments/1753150735_687ef50f80b46.jpg\",\"file_size\":393207,\"file_type\":\"image/jpeg\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-22T02:18:55.529Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-22 02:19:13', NULL),
(36, NULL, 21, 7, 4, 'Debut', 'winter-wonderland', NULL, NULL, NULL, 5, 100, '2025-08-01', '10:00:00', '23:59:00', 'paid', 'paid', 14, 30, 83000.00, 41500.00, 'cash', 2, NULL, NULL, 'done', NULL, NULL, NULL, NULL, '2025-07-22 06:36:36', '2025-09-11 02:51:28', NULL, 0, NULL, NULL, 0, NULL, NULL, '2025-07-22 06:36:36', NULL),
(37, NULL, 21, 7, NULL, 'Test', 'tropical-paradise', NULL, NULL, NULL, 5, 100, '2025-08-08', '10:00:00', '23:59:00', 'partial', 'partial', 15, 30, 169000.00, 84500.00, 'cash', 2, NULL, NULL, 'done', NULL, NULL, NULL, NULL, '2025-07-23 07:25:44', '2025-09-08 15:00:09', '[{\"original_name\":\"June 27.docx\",\"file_name\":\"1753255511_68808e5714028.docx\",\"file_path\":\"uploads/event_attachments/1753255511_68808e5714028.docx\",\"file_size\":11241,\"file_type\":\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-23T07:25:11.085Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-07-23 07:25:44', NULL),
(48, NULL, 21, 7, 6, 'Test 50', 'art-deco', NULL, NULL, NULL, 3, 100, '2025-09-30', '10:00:00', '23:59:00', 'partial', 'partial', 22, 34, 80000.00, 40000.00, 'cash', 2, NULL, NULL, 'confirmed', NULL, NULL, NULL, NULL, '2025-08-03 07:53:36', '2025-09-11 02:51:28', '[{\"original_name\":\"maxresdefault.webp\",\"file_name\":\"1754207086_688f136eee4b1.webp\",\"file_path\":\"uploads/event_attachments/1754207086_688f136eee4b1.webp\",\"file_size\":109018,\"file_type\":\"image/webp\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-08-03T07:44:46.977Z\"}]', 0, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(49, NULL, 29, 7, 5, 'Event 80 - Fixed Ghost Payments', 'beach-themed', NULL, NULL, NULL, 5, 100, '2025-10-01', '10:00:00', '23:59:00', 'partial', 'partial', 19, 30, 311000.00, 202150.00, 'cash', 2, NULL, NULL, 'confirmed', NULL, NULL, NULL, NULL, '2025-08-03 08:18:33', '2025-09-11 02:51:28', '[{\"original_name\":\"movie_script.pdf\",\"file_name\":\"1754209102_688f1b4e1812e.pdf\",\"file_path\":\"uploads/event_attachments/1754209102_688f1b4e1812e.pdf\",\"file_size\":103951,\"file_type\":\"application/pdf\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-08-03T08:18:22.100Z\"}]', 0, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(50, NULL, 21, 7, 5, 'Wedding Ko Ya', 'cultural-traditional', NULL, NULL, NULL, 5, 100, '2025-10-18', '10:00:00', '23:59:00', 'partial', 'partial', 20, 34, 139000.00, 69500.00, 'cash', 2, NULL, NULL, 'confirmed', NULL, NULL, NULL, NULL, '2025-08-08 17:16:58', '2025-09-11 02:51:28', '[{\"original_name\":\"photo_2025-08-05_09-57-51.jpg\",\"file_name\":\"1754673410_6896310207914.jpg\",\"file_path\":\"uploads/event_attachments/1754673410_6896310207914.jpg\",\"file_size\":104757,\"file_type\":\"image/jpeg\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-08-08T17:16:50.032Z\"}]', 0, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(59, NULL, 29, 7, NULL, 'Test', 'beach-themed', NULL, NULL, NULL, 5, 100, '2025-08-23', '10:00:00', '23:59:00', 'partial', 'partial', 22, 30, 158000.00, 79000.00, 'cash', 2, NULL, NULL, '', NULL, NULL, NULL, NULL, '2025-08-18 16:09:28', '2025-09-08 15:00:09', '[{\"original_name\":\"Gxn2g-baMAA6Xpr.jpg\",\"file_name\":\"1755532781_68a34dedd599d.jpg\",\"file_path\":\"uploads/event_attachments/1755532781_68a34dedd599d.jpg\",\"file_size\":128416,\"file_type\":\"image/jpeg\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-08-18T15:59:41.877Z\"},{\"original_name\":\"organizer_invites.json\",\"file_name\":\"organizer_invites\",\"file_path\":\"\",\"file_size\":0,\"file_type\":\"application/json\",\"description\":\"{\\\"pending\\\":[7],\\\"accepted\\\":[],\\\"rejected\\\":[],\\\"externalOrganizer\\\":null,\\\"created_at\\\":\\\"2025-08-18T16:09:28.601Z\\\"}\",\"attachment_type\":\"organizer_invites\",\"uploaded_at\":\"2025-08-18T16:09:28.601Z\"}]', 0, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(60, NULL, 20, 7, 4, 'This is just a test', 'boho-chic', NULL, NULL, NULL, 1, 100, '2025-10-29', '10:00:00', '23:59:00', 'paid', 'paid', 15, 29, 150000.00, 75000.00, 'cash', 2, NULL, NULL, 'confirmed', NULL, NULL, NULL, NULL, '2025-08-18 16:14:58', '2025-09-11 02:51:28', '[{\"original_name\":\"Gxn2g-baMAA6Xpr.jpg\",\"file_name\":\"1755533455_68a3508fd0bce.jpg\",\"file_path\":\"uploads/event_attachments/1755533455_68a3508fd0bce.jpg\",\"file_size\":128416,\"file_type\":\"image/jpeg\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-08-18T16:10:55.858Z\"},{\"original_name\":\"organizer_invites.json\",\"file_name\":\"organizer_invites\",\"file_path\":\"\",\"file_size\":0,\"file_type\":\"application/json\",\"description\":\"{\\\"pending\\\":[7],\\\"accepted\\\":[],\\\"rejected\\\":[],\\\"externalOrganizer\\\":null,\\\"created_at\\\":\\\"2025-08-18T16:14:58.386Z\\\"}\",\"attachment_type\":\"organizer_invites\",\"uploaded_at\":\"2025-08-18T16:14:58.386Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-09-11 08:37:54', NULL),
(61, NULL, 21, 7, 6, 'Organizer ', 'Others Celebration', NULL, NULL, NULL, 5, 100, '2025-10-30', '10:00:00', '23:59:00', 'paid', 'paid', 20, 34, 52000.00, 26000.00, 'cash', 2, NULL, NULL, 'confirmed', NULL, NULL, NULL, NULL, '2025-08-19 16:22:23', '2025-09-11 02:51:28', '[{\"original_name\":\"GxmDg_0akAAWmOP.jpg\",\"file_name\":\"1755620534_68a4a4b62923e.jpg\",\"file_path\":\"uploads/event_attachments/1755620534_68a4a4b62923e.jpg\",\"file_size\":103752,\"file_type\":\"image/jpeg\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-08-19T16:22:14.170Z\"},{\"original_name\":\"organizer_invites.json\",\"file_name\":\"organizer_invites\",\"file_path\":\"\",\"file_size\":0,\"file_type\":\"application/json\",\"description\":\"{\\\"pending\\\":[7],\\\"accepted\\\":[],\\\"rejected\\\":[],\\\"externalOrganizer\\\":null,\\\"created_at\\\":\\\"2025-08-19T16:22:23.732Z\\\"}\",\"attachment_type\":\"organizer_invites\",\"uploaded_at\":\"2025-08-19T16:22:23.732Z\"}]', 0, NULL, NULL, 0, NULL, NULL, '2025-09-09 02:35:09', NULL),
(62, NULL, 5, 7, 7, 'Organizer Birthday', 'art-deco', NULL, NULL, NULL, 3, 100, '2025-10-20', '10:00:00', '23:59:00', 'partial', 'partial', 22, 34, 130000.00, 65000.00, 'cash', 2, NULL, NULL, '', NULL, NULL, NULL, NULL, '2025-08-20 04:35:17', '2025-09-11 02:51:28', '[{\"original_name\":\"GxmDg_0akAAWmOP.jpg\",\"file_name\":\"1755664512_68a550807d02c.jpg\",\"file_path\":\"uploads/event_attachments/1755664512_68a550807d02c.jpg\",\"file_size\":103752,\"file_type\":\"image/jpeg\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-08-20T04:35:12.514Z\"},{\"original_name\":\"organizer_invites.json\",\"file_name\":\"organizer_invites\",\"file_path\":\"\",\"file_size\":0,\"file_type\":\"application/json\",\"description\":\"{\\\"pending\\\":[7],\\\"accepted\\\":[],\\\"rejected\\\":[],\\\"externalOrganizer\\\":null,\\\"created_at\\\":\\\"2025-08-20T04:35:17.706Z\\\"}\",\"attachment_type\":\"organizer_invites\",\"uploaded_at\":\"2025-08-20T04:35:17.706Z\"}]', 0, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(63, NULL, 21, 7, 6, 'Sample', 'winter-wonderland', NULL, NULL, NULL, 3, 150, '2025-11-01', '12:00:00', '23:59:00', 'partial', 'partial', 19, 30, 318000.00, 159000.00, 'cash', 2, NULL, NULL, '', NULL, NULL, NULL, NULL, '2025-08-30 04:34:47', '2025-09-11 02:51:28', '[{\"original_name\":\"money attachment.pdf\",\"file_name\":\"1756528479_68b27f5f5a1fd.pdf\",\"file_path\":\"uploads/event_attachments/1756528479_68b27f5f5a1fd.pdf\",\"file_size\":572541,\"file_type\":\"application/pdf\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-08-30T04:34:39.370Z\"},{\"original_name\":\"organizer_invites.json\",\"file_name\":\"organizer_invites\",\"file_path\":\"\",\"file_size\":0,\"file_type\":\"application/json\",\"description\":\"{\\\"pending\\\":[6],\\\"accepted\\\":[],\\\"rejected\\\":[],\\\"externalOrganizer\\\":null,\\\"created_at\\\":\\\"2025-08-30T04:34:47.186Z\\\"}\",\"attachment_type\":\"organizer_invites\",\"uploaded_at\":\"2025-08-30T04:34:47.186Z\"}]', 0, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(64, NULL, 20, 7, 6, 'Baptism', 'tropical-paradise', NULL, NULL, NULL, 10, 150, '2025-11-05', '10:00:00', '23:59:00', 'partial', 'partial', 24, 29, 85500.00, 42750.00, 'cash', 2, NULL, NULL, '', NULL, NULL, NULL, NULL, '2025-08-30 07:44:02', '2025-09-11 02:51:28', '[{\"original_name\":\"money attachment.pdf\",\"file_name\":\"1756539741_68b2ab5df3ad1.pdf\",\"file_path\":\"uploads/event_attachments/1756539741_68b2ab5df3ad1.pdf\",\"file_size\":572541,\"file_type\":\"application/pdf\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-08-30T07:42:21.999Z\"},{\"original_name\":\"organizer_invites.json\",\"file_name\":\"organizer_invites\",\"file_path\":\"\",\"file_size\":0,\"file_type\":\"application/json\",\"description\":\"{\\\"pending\\\":[6],\\\"accepted\\\":[],\\\"rejected\\\":[],\\\"externalOrganizer\\\":null,\\\"created_at\\\":\\\"2025-08-30T07:44:02.550Z\\\"}\",\"attachment_type\":\"organizer_invites\",\"uploaded_at\":\"2025-08-30T07:44:02.550Z\"}]', 0, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(65, NULL, 30, 7, NULL, 'Montreal Wedding', 'color-coordinated', NULL, NULL, NULL, 5, 100, '2025-11-20', '10:00:00', '23:59:00', 'partial', 'partial', 15, 30, 162000.00, 81000.00, 'cash', 2, NULL, NULL, '', NULL, NULL, NULL, NULL, '2025-08-30 08:25:58', '2025-09-08 15:00:09', '[{\"original_name\":\"money attachment.pdf\",\"file_name\":\"1756542221_68b2b50daffa0.pdf\",\"file_path\":\"uploads/event_attachments/1756542221_68b2b50daffa0.pdf\",\"file_size\":572541,\"file_type\":\"application/pdf\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-08-30T08:23:41.722Z\"}]', 0, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(66, NULL, 23, 7, 4, 'b_day_sample', 'rustic-garden', NULL, NULL, NULL, 3, 150, '2025-12-01', '10:00:00', '23:59:00', 'partial', 'unpaid', 22, 34, 140000.00, 112000.00, 'cash', 2, NULL, NULL, '', NULL, NULL, NULL, NULL, '2025-09-09 23:01:51', '2025-09-11 02:51:28', '[{\"original_name\":\"5b22c2c9-0744-4df9-b91f-a46043193dff.jpg\",\"file_name\":\"1757458900_68c0b1d45135c.jpg\",\"file_path\":\"uploads/event_attachments/1757458900_68c0b1d45135c.jpg\",\"file_size\":335979,\"file_type\":\"image/jpeg\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-09-09T23:01:40.335Z\"},{\"original_name\":\"organizer_invites.json\",\"file_name\":\"organizer_invites\",\"file_path\":\"\",\"file_size\":0,\"file_type\":\"application/json\",\"description\":\"{\\\"pending\\\":[4],\\\"accepted\\\":[],\\\"rejected\\\":[],\\\"externalOrganizer\\\":null,\\\"created_at\\\":\\\"2025-09-09T23:01:51.444Z\\\"}\",\"attachment_type\":\"organizer_invites\",\"uploaded_at\":\"2025-09-09T23:01:51.444Z\"}]', 0, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(67, NULL, 30, 7, 4, 'Test Event [NEW]', 'beach-themed', NULL, NULL, NULL, 2, 150, '2025-10-25', '10:00:00', '23:59:00', 'partial', 'paid', 19, 30, 338000.00, 253500.00, 'cash', 2, NULL, NULL, '', NULL, NULL, NULL, NULL, '2025-09-11 06:01:51', '2025-09-23 07:55:27', '[{\"original_name\":\"5b22c2c9-0744-4df9-b91f-a46043193dff.jpg\",\"file_name\":\"1757570494_68c265be92e69.jpg\",\"file_path\":\"uploads/event_attachments/1757570494_68c265be92e69.jpg\",\"file_size\":335979,\"file_type\":\"image/jpeg\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-09-11T06:01:34.605Z\"},{\"original_name\":\"organizer_invites.json\",\"file_name\":\"organizer_invites\",\"file_path\":\"\",\"file_size\":0,\"file_type\":\"application/json\",\"description\":\"{\\\"pending\\\":[4],\\\"accepted\\\":[],\\\"rejected\\\":[],\\\"externalOrganizer\\\":null,\\\"created_at\\\":\\\"2025-09-11T06:01:51.628Z\\\"}\",\"attachment_type\":\"organizer_invites\",\"uploaded_at\":\"2025-09-11T06:01:51.628Z\"}]', 0, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(68, NULL, 30, 7, 4, 'Clyde\'s Event 2005', 'Sample', NULL, NULL, NULL, 2, 100, '2025-11-30', '10:00:00', '23:59:00', 'partial', 'unpaid', 19, 30, 278000.00, 139000.00, 'cash', 2, NULL, NULL, '', NULL, NULL, NULL, NULL, '2025-09-11 06:10:22', '2025-09-11 06:10:22', '[{\"original_name\":\"5b22c2c9-0744-4df9-b91f-a46043193dff.jpg\",\"file_name\":\"1757571009_68c267c17bc56.jpg\",\"file_path\":\"uploads/event_attachments/1757571009_68c267c17bc56.jpg\",\"file_size\":335979,\"file_type\":\"image/jpeg\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-09-11T06:10:09.511Z\"},{\"original_name\":\"organizer_invites.json\",\"file_name\":\"organizer_invites\",\"file_path\":\"\",\"file_size\":0,\"file_type\":\"application/json\",\"description\":\"{\\\"pending\\\":[4],\\\"accepted\\\":[],\\\"rejected\\\":[],\\\"externalOrganizer\\\":null,\\\"created_at\\\":\\\"2025-09-11T06:10:22.195Z\\\"}\",\"attachment_type\":\"organizer_invites\",\"uploaded_at\":\"2025-09-11T06:10:22.195Z\"}]', 0, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(69, NULL, 30, 7, 4, 'test_test', 'beach-themed', NULL, NULL, NULL, 3, 100, '2025-11-29', '00:00:00', '23:59:59', 'partial', 'unpaid', 22, 34, 45000.00, 22500.00, 'gcash', 2, '2342342', NULL, '', NULL, NULL, NULL, NULL, '2025-09-13 05:25:59', '2025-09-13 05:25:59', '[{\"original_name\":\"organizer_invites.json\",\"file_name\":\"organizer_invites\",\"file_path\":\"\",\"file_size\":0,\"file_type\":\"application/json\",\"description\":\"{\\\"pending\\\":[4],\\\"accepted\\\":[],\\\"rejected\\\":[],\\\"externalOrganizer\\\":null,\\\"created_at\\\":\\\"2025-09-13T05:25:59.187Z\\\"}\",\"attachment_type\":\"organizer_invites\",\"uploaded_at\":\"2025-09-13T05:25:59.187Z\"}]', 0, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(70, NULL, 20, 7, 4, 'Test', 'cultural-traditional', NULL, NULL, NULL, 3, 100, '2025-09-25', '00:00:00', '23:59:59', 'paid', 'paid', 25, 34, 32000.00, 16000.00, 'gcash', 2, '123123123', NULL, '', NULL, NULL, NULL, NULL, '2025-09-22 06:59:23', '2025-09-22 07:51:24', '[{\"original_name\":\"2025_07_28_13_48_IMG_6280.heic\",\"file_name\":\"1758524307_68d0f39399fd7.heic\",\"file_path\":\"uploads/event_attachments/1758524307_68d0f39399fd7.heic\",\"file_size\":2132454,\"file_type\":\"\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-09-22T06:58:27.650Z\"},{\"original_name\":\"organizer_invites.json\",\"file_name\":\"organizer_invites\",\"file_path\":\"\",\"file_size\":0,\"file_type\":\"application/json\",\"description\":\"{\\\"pending\\\":[4],\\\"accepted\\\":[],\\\"rejected\\\":[],\\\"externalOrganizer\\\":null,\\\"created_at\\\":\\\"2025-09-22T06:59:23.305Z\\\"}\",\"attachment_type\":\"organizer_invites\",\"uploaded_at\":\"2025-09-22T06:59:23.305Z\"}]', 0, NULL, NULL, 0, NULL, NULL, NULL, NULL);

--
-- Triggers `tbl_events`
--
DELIMITER $$
CREATE TRIGGER `notify_on_event_create` AFTER INSERT ON `tbl_events` FOR EACH ROW BEGIN
    DECLARE admin_id INT;
    DECLARE done INT DEFAULT FALSE;
    DECLARE admin_cursor CURSOR FOR
        SELECT user_id FROM tbl_users WHERE user_role = 'admin';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Notify client about new event
    CALL CreateNotification(
        NEW.user_id,
        'event_created',
        'Event Created Successfully',
        CONCAT('Your event "', NEW.event_title, '" has been created successfully! Check your payment schedule for upcoming payments.'),
        'high',
        'calendar-check',
        CONCAT('/client/events/', NEW.event_id),
        NEW.event_id, NULL, NEW.venue_id, NULL, NULL, NULL, 72
    );

    -- Notify admins about new event
    OPEN admin_cursor;
    admin_loop: LOOP
        FETCH admin_cursor INTO admin_id;
        IF done THEN
            LEAVE admin_loop;
        END IF;

        -- Don't notify the admin who created the event
        IF admin_id != NEW.admin_id THEN
            CALL CreateNotification(
                admin_id,
                'event_created',
                'New Event Created',
                CONCAT('New event "', NEW.event_title, '" has been created by admin.'),
                'medium',
                'calendar-plus',
                CONCAT('/admin/events/', NEW.event_id),
                NEW.event_id, NULL, NEW.venue_id, NULL, NULL, NULL, 48
            );
        END IF;
    END LOOP;
    CLOSE admin_cursor;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_on_event_created` AFTER INSERT ON `tbl_events` FOR EACH ROW BEGIN
    DECLARE admin_ids TEXT;
    DECLARE admin_id INT;
    DECLARE done INT DEFAULT FALSE;
    DECLARE admin_cursor CURSOR FOR
        SELECT user_id FROM tbl_users WHERE user_role = 'admin';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Notify client about new event
    CALL CreateNotification(
        NEW.user_id,
        'event_created',
        'Event Created Successfully',
        CONCAT('Your event "', NEW.event_title, '" has been created successfully! Check your payment schedule for upcoming payments.'),
        'high',
        'calendar-check',
        CONCAT('/client/events/', NEW.event_id),
        NEW.event_id, NULL, NEW.venue_id, NULL, NULL, NULL, 72
    );

    -- Notify admins about new event
    OPEN admin_cursor;
    admin_loop: LOOP
        FETCH admin_cursor INTO admin_id;
        IF done THEN
            LEAVE admin_loop;
        END IF;

        -- Don't notify the admin who created the event
        IF admin_id != NEW.admin_id THEN
            CALL CreateNotification(
                admin_id,
                'event_created',
                'New Event Created',
                CONCAT('New event "', NEW.event_title, '" has been created by admin.'),
                'medium',
                'calendar-plus',
                CONCAT('/admin/events/', NEW.event_id),
                NEW.event_id, NULL, NEW.venue_id, NULL, NULL, NULL, 48
            );
        END IF;
    END LOOP;
    CLOSE admin_cursor;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_on_event_status_change` AFTER UPDATE ON `tbl_events` FOR EACH ROW BEGIN
    DECLARE notification_title VARCHAR(255);
    DECLARE notification_message TEXT;
    DECLARE notification_type VARCHAR(50);
    DECLARE notification_icon VARCHAR(50);

    -- Only proceed if status actually changed
    IF OLD.event_status != NEW.event_status THEN

        CASE NEW.event_status
            WHEN 'confirmed' THEN
                SET notification_type = 'event_confirmed';
                SET notification_title = 'Event Confirmed';
                SET notification_message = CONCAT('Your event "', NEW.event_title, '" has been confirmed and is now scheduled for ', DATE_FORMAT(NEW.event_date, '%M %d, %Y'), '.');
                SET notification_icon = 'check-circle';

            WHEN 'cancelled' THEN
                SET notification_type = 'event_cancelled';
                SET notification_title = 'Event Cancelled';
                SET notification_message = CONCAT('Your event "', NEW.event_title, '" has been cancelled.');
                SET notification_icon = 'x-circle';

            WHEN 'done' THEN
                SET notification_type = 'event_completed';
                SET notification_title = 'Event Completed';
                SET notification_message = CONCAT('Your event "', NEW.event_title, '" has been completed successfully! We hope you had a wonderful time.');
                SET notification_icon = 'check-circle-2';

            ELSE
                SET notification_type = 'general';
                SET notification_title = 'Event Status Updated';
                SET notification_message = CONCAT('Your event "', NEW.event_title, '" status has been updated to ', NEW.event_status, '.');
                SET notification_icon = 'info';
        END CASE;

        -- Send notification to client
        CALL CreateNotification(
            NEW.user_id,
            notification_type,
            notification_title,
            notification_message,
            'high',
            notification_icon,
            CONCAT('/client/events/', NEW.event_id),
            NEW.event_id, NULL, NEW.venue_id, NULL, NULL, NULL, 168
        );
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `tr_events_update_tracking` BEFORE UPDATE ON `tbl_events` FOR EACH ROW BEGIN
    -- Auto-update timestamp
    SET NEW.updated_at = CURRENT_TIMESTAMP;

    -- If updated_by is not explicitly set, try to maintain it
    IF NEW.updated_by IS NULL AND OLD.updated_by IS NOT NULL THEN
        SET NEW.updated_by = OLD.updated_by;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_events_backup`
--

CREATE TABLE `tbl_events_backup` (
  `event_id` int(11) NOT NULL DEFAULT 0,
  `original_booking_reference` varchar(50) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `organizer_id` int(11) DEFAULT NULL,
  `event_title` varchar(255) NOT NULL,
  `event_theme` varchar(255) DEFAULT NULL,
  `event_description` text DEFAULT NULL,
  `event_type_id` int(11) NOT NULL,
  `guest_count` int(11) NOT NULL DEFAULT 0,
  `event_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `payment_status` enum('pending','partial','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
  `package_id` int(11) DEFAULT NULL,
  `venue_id` int(11) DEFAULT NULL,
  `total_budget` decimal(12,2) NOT NULL DEFAULT 0.00,
  `down_payment` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_schedule_type_id` int(11) DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `additional_notes` text DEFAULT NULL,
  `event_status` enum('done','confirmed','on_going','cancelled') NOT NULL DEFAULT 'done',
  `booking_date` date DEFAULT NULL,
  `booking_time` time DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `event_attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'File attachments for the event' CHECK (json_valid(`event_attachments`)),
  `event_feedback_id` int(11) DEFAULT NULL COMMENT 'Link to feedback if available',
  `event_wedding_form_id` int(11) DEFAULT NULL COMMENT 'Link to wedding details if wedding event',
  `is_recurring` tinyint(1) DEFAULT 0 COMMENT 'Flag for recurring events',
  `recurrence_rule` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Recurrence configuration (iCal-style or custom)' CHECK (json_valid(`recurrence_rule`)),
  `cancellation_reason` text DEFAULT NULL COMMENT 'Reason for cancellation if applicable',
  `finalized_at` datetime DEFAULT NULL COMMENT 'When event details were finalized',
  `client_signature` text DEFAULT NULL COMMENT 'Digital signature reference or file path'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_events_backup`
--

INSERT INTO `tbl_events_backup` (`event_id`, `original_booking_reference`, `user_id`, `admin_id`, `organizer_id`, `event_title`, `event_theme`, `event_description`, `event_type_id`, `guest_count`, `event_date`, `start_time`, `end_time`, `payment_status`, `package_id`, `venue_id`, `total_budget`, `down_payment`, `payment_method`, `payment_schedule_type_id`, `reference_number`, `additional_notes`, `event_status`, `booking_date`, `booking_time`, `created_by`, `updated_by`, `created_at`, `updated_at`, `event_attachments`, `event_feedback_id`, `event_wedding_form_id`, `is_recurring`, `recurrence_rule`, `cancellation_reason`, `finalized_at`, `client_signature`) VALUES
(28, 'BK-20250625-1100', 15, 7, NULL, 'ad', NULL, NULL, 5, 100, '2025-06-26', '10:00:00', '18:00:00', 'partial', 15, 30, 298000.00, 149000.00, 'gcash', 2, '12312312312', 'ad', '', NULL, NULL, NULL, NULL, '2025-06-25 08:26:36', '2025-08-09 03:16:03', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(29, 'BK-20250625-4040', 15, 7, NULL, 'Other Event ', NULL, NULL, 5, 100, '2025-06-26', '10:00:00', '18:00:00', 'partial', 15, 29, 294000.00, 147000.00, 'bank-transfer', 2, '123234', 'Other Event ', '', NULL, NULL, NULL, NULL, '2025-06-25 09:10:39', '2025-08-09 03:16:03', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(30, NULL, 15, 7, NULL, 'Wedding with Wedding Form', NULL, NULL, 1, 100, '2025-06-28', '06:00:00', '08:00:00', 'partial', 15, NULL, 250000.00, 125000.00, 'gcash', 2, '13123123', NULL, '', NULL, NULL, NULL, NULL, '2025-06-26 07:17:02', '2025-08-09 03:16:03', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(31, NULL, 15, 7, NULL, 'Test', NULL, NULL, 1, 100, '2025-06-27', '11:30:00', '18:00:00', 'partial', 15, 29, 164000.00, 82000.00, 'gcash', 2, '12312', NULL, '', NULL, NULL, NULL, NULL, '2025-06-26 08:36:53', '2025-08-09 03:16:03', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(32, NULL, 15, 7, NULL, 'sdf', NULL, NULL, 1, 100, '2025-06-29', '11:00:00', '11:30:00', 'partial', 15, 30, 298000.00, 149000.00, 'gcash', 2, 'sdfsdf', NULL, '', NULL, NULL, NULL, NULL, '2025-06-26 08:39:30', '2025-08-09 03:16:03', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(33, NULL, 15, 7, NULL, 'TTTTTTT', NULL, NULL, 1, 100, '2025-06-30', '11:30:00', '12:00:00', 'partial', 15, 30, 298000.00, 149000.00, 'gcash', 2, 'sdfsdf', NULL, '', NULL, NULL, NULL, NULL, '2025-06-26 08:50:59', '2025-08-09 03:16:03', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(34, 'BK-20250626-5133', 15, 7, NULL, 'hb', NULL, NULL, 1, 100, '2025-06-29', '10:00:00', '18:00:00', 'partial', 15, 29, 294000.00, 147000.00, 'gcash', 2, '567567', 'hb', '', NULL, NULL, NULL, NULL, '2025-06-26 10:40:27', '2025-08-09 03:16:03', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_event_activity_logs`
--

CREATE TABLE `tbl_event_activity_logs` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` enum('created','updated','finalized','cancelled','component_added','component_removed','component_updated','attachment_added','attachment_removed','venue_changed','package_changed') NOT NULL,
  `description` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_event_components`
--

CREATE TABLE `tbl_event_components` (
  `component_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `component_name` varchar(255) NOT NULL,
  `component_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `supplier_price` decimal(10,2) DEFAULT NULL COMMENT 'Actual price charged by supplier (may differ from component_price)',
  `supplier_status` enum('pending','confirmed','delivered','cancelled') DEFAULT 'pending' COMMENT 'Status of supplier delivery',
  `supplier_notes` text DEFAULT NULL COMMENT 'Notes about supplier component',
  `delivery_date` date DEFAULT NULL COMMENT 'Expected or actual delivery date',
  `is_rated` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether this component has been rated post-event',
  `component_description` text DEFAULT NULL,
  `is_custom` tinyint(1) NOT NULL DEFAULT 0,
  `is_included` tinyint(1) NOT NULL DEFAULT 1,
  `payment_status` enum('pending','paid','cancelled') NOT NULL DEFAULT 'pending',
  `payment_date` datetime DEFAULT NULL,
  `payment_notes` text DEFAULT NULL,
  `original_package_component_id` int(11) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL COMMENT 'Reference to supplier if this is a supplier component',
  `offer_id` int(11) DEFAULT NULL COMMENT 'Reference to supplier offer if this is from a specific offer',
  `display_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_event_components`
--

INSERT INTO `tbl_event_components` (`component_id`, `event_id`, `component_name`, `component_price`, `supplier_price`, `supplier_status`, `supplier_notes`, `delivery_date`, `is_rated`, `component_description`, `is_custom`, `is_included`, `payment_status`, `payment_date`, `payment_notes`, `original_package_component_id`, `supplier_id`, `offer_id`, `display_order`) VALUES
(7, 28, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(8, 28, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(9, 28, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(10, 28, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(11, 28, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, NULL, 0, 0, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(12, 29, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 0),
(13, 29, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 1),
(14, 29, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 2),
(15, 29, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 3),
(16, 29, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(17, 29, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(18, 29, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(19, 29, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(20, 29, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(21, 30, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 0),
(22, 30, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 1),
(23, 30, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 2),
(24, 30, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 3),
(25, 30, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(26, 30, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(27, 30, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(28, 30, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(29, 30, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(30, 31, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-05 10:31:38', 'Status changed to paid by admin', 188, NULL, NULL, 0),
(31, 31, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 1),
(32, 32, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 0),
(33, 32, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 1),
(34, 32, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 2),
(35, 32, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 3),
(36, 32, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(37, 32, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(38, 32, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(39, 32, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(40, 32, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(41, 33, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 0),
(42, 33, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 1),
(43, 33, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 2),
(44, 33, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 3),
(45, 33, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(46, 33, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(47, 33, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(48, 33, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(49, 33, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(50, 34, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 0),
(51, 34, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 1),
(52, 34, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 2),
(53, 34, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 3),
(54, 34, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(55, 34, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(56, 34, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(57, 34, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(58, 34, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(59, 35, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 0),
(60, 35, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 1),
(61, 35, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 2),
(62, 35, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 3),
(63, 35, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(64, 35, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(65, 35, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(66, 35, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(67, 35, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(68, 36, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-08-09 05:03:04', 'Status changed to paid by admin', 189, NULL, NULL, 0),
(69, 36, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 1),
(70, 36, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 2),
(71, 36, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 3),
(72, 36, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(73, 36, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(74, 36, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(75, 36, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(76, 36, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(77, 37, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 0),
(78, 37, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 1),
(79, 37, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 2),
(80, 37, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 3),
(81, 37, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(82, 37, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(83, 37, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(84, 37, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(85, 37, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(86, 38, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 0),
(87, 38, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 1),
(88, 38, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 2),
(89, 38, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 3),
(90, 38, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(91, 38, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(92, 38, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(93, 38, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(94, 38, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(95, 39, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 0),
(96, 39, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 1),
(97, 39, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 2),
(98, 39, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 3),
(99, 39, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(100, 39, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(101, 39, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(102, 39, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(103, 39, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(104, 40, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 0),
(105, 40, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 1),
(106, 40, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 2),
(107, 40, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 3),
(108, 40, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(109, 40, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(110, 40, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(111, 40, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(112, 40, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(113, 41, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 0),
(114, 41, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 1),
(115, 41, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 2),
(116, 41, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 3),
(117, 41, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(118, 41, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(119, 41, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(120, 41, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(121, 41, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(122, 42, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 0),
(123, 42, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 1),
(124, 42, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 2),
(125, 42, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 3),
(126, 42, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(127, 42, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(128, 42, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(129, 42, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(130, 42, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(131, 43, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 0),
(132, 43, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 1),
(133, 43, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 2),
(134, 43, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 3),
(135, 43, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(136, 43, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(137, 43, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(138, 43, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(139, 43, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(140, 44, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 0),
(141, 44, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 1),
(142, 44, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 2),
(143, 44, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 3),
(144, 44, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(145, 44, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(146, 44, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(147, 44, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(148, 44, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(149, 45, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 0),
(150, 45, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 1),
(151, 45, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 2),
(152, 45, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 3),
(153, 45, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(154, 45, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(155, 45, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(156, 45, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(157, 45, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(160, 46, 'Venue Rental', 40000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 261, NULL, NULL, 0),
(161, 46, 'Catering Service', 75000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 262, NULL, NULL, 1),
(162, 46, 'Event Styling & Floral Design', 34999.98, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 263, NULL, NULL, 2),
(163, 46, 'Photo & Video Coverage', 20000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 264, NULL, NULL, 3),
(164, 46, 'Host / Emcee', 10000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 265, NULL, NULL, 4),
(165, 46, 'Acoustic Live Band', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 266, NULL, NULL, 5),
(166, 46, 'Led Wall', 12000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 267, NULL, NULL, 6),
(167, 46, 'Customized Cake', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 268, NULL, NULL, 7),
(168, 46, 'Anniversary Tokens', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 269, NULL, NULL, 8),
(169, 46, 'Event Coordinator & Staff', 18000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 270, NULL, NULL, 9),
(170, 47, 'Venue Rental', 44000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 279, NULL, NULL, 0),
(171, 47, 'Catering', 70000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 280, NULL, NULL, 1),
(172, 47, 'Lights & Sounds', 30000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 281, NULL, NULL, 2),
(173, 47, 'Host & Live Performer', 20000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 282, NULL, NULL, 3),
(174, 47, 'Event Styling & Decorations', 30000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 283, NULL, NULL, 4),
(175, 47, 'Photographer & Videographer', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 284, NULL, NULL, 5),
(176, 47, 'Invitation Design & Printing', 6000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 285, NULL, NULL, 6),
(177, 47, 'Cake & Wine Set', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 286, NULL, NULL, 7),
(178, 48, 'Venue Rental', 44000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-22 16:17:07', 'Status changed to paid by admin', 279, NULL, NULL, 0),
(179, 48, 'Catering', 70000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 280, NULL, NULL, 1),
(180, 48, 'Lights & Sounds', 30000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 281, NULL, NULL, 2),
(181, 48, 'Host & Live Performer', 20000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 282, NULL, NULL, 3),
(182, 48, 'Event Styling & Decorations', 30000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 283, NULL, NULL, 4),
(183, 48, 'Photographer & Videographer', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 284, NULL, NULL, 5),
(184, 48, 'Invitation Design & Printing', 6000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 285, NULL, NULL, 6),
(185, 48, 'Cake & Wine Set', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 286, NULL, NULL, 7),
(186, 48, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 8),
(187, 57, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 0),
(188, 57, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 1),
(189, 57, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 2),
(190, 57, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 3),
(191, 57, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 4),
(192, 57, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 5),
(193, 57, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 6),
(194, 57, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 7),
(195, 57, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 8),
(196, 58, 'sample_inclusion', 12000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 287, NULL, NULL, 0),
(197, 58, 'sample_inclusion 2', 20000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 288, NULL, NULL, 1),
(198, 1, 'Pearlmont Hotel', 44000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(199, 1, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 1),
(200, 1, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 2),
(201, 1, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 3),
(202, 1, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 4),
(203, 1, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 5),
(204, 1, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 6),
(205, 1, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 0, 'pending', NULL, NULL, 195, NULL, NULL, 7),
(206, 1, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 8),
(207, 1, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 9),
(208, 1, 'Elegant Catering Services', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Elegant Catering Services - Catering', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 10),
(209, 1, 'Purple Yam', 0.00, NULL, 'pending', NULL, NULL, 0, 'Purple Yam - Catering', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 11),
(210, 1, 'My own photography service', 35000.00, NULL, 'pending', NULL, NULL, 0, 'My own photography service', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 12),
(211, 2, 'Demiren Hotel', 20000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Demiren Hotel', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(212, 2, 'sample_inclusion', 12000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 287, NULL, NULL, 1),
(213, 2, 'sample_inclusion 2', 20000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 288, NULL, NULL, 2),
(214, 2, 'Elegant Catering Services', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Elegant Catering Services - Catering', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 3),
(215, 2, 'Blooming Gardens Florals', 8000.00, NULL, 'pending', NULL, NULL, 0, 'Blooming Gardens Florals - Floral Design', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 4),
(216, 2, 'EventCorp AV Solutions', 12000.00, NULL, 'pending', NULL, NULL, 0, 'EventCorp AV Solutions - Audio Visual', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 5),
(217, 2, 'Sample rate ', 200000.00, NULL, 'pending', NULL, NULL, 0, 'Sample rate ', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 6),
(218, 3, 'Pearlmont Hotel - Package 2', 48000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel - Package 2', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(219, 3, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 1),
(220, 3, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 2),
(221, 3, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 0, 'pending', NULL, NULL, 191, NULL, NULL, 3),
(222, 3, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 4),
(223, 3, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 5),
(224, 3, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 6),
(225, 3, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 0, 'pending', NULL, NULL, 195, NULL, NULL, 7),
(226, 3, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 8),
(227, 3, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 9),
(228, 3, 'EventCorp AV Solutions', 12000.00, NULL, 'pending', NULL, NULL, 0, 'EventCorp AV Solutions - Audio Visual', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 10),
(229, 3, 'Blooming Gardens Florals', 8000.00, NULL, 'pending', NULL, NULL, 0, 'Blooming Gardens Florals - Floral Design', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 11),
(230, 3, 'Warner Bros.', 50000.00, NULL, 'pending', NULL, NULL, 0, 'Warner Bros.', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 12),
(231, 4, 'Pearlmont Hotel - Package 2', 48000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel - Package 2', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(232, 4, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 1),
(233, 4, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 2),
(234, 4, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 3),
(235, 4, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 0, 'pending', NULL, NULL, 192, NULL, NULL, 4),
(236, 4, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 5),
(237, 4, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 0, 'pending', NULL, NULL, 194, NULL, NULL, 6),
(238, 4, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 7),
(239, 4, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 8),
(240, 4, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 9),
(241, 4, 'Purple Yam', 0.00, NULL, 'pending', NULL, NULL, 0, 'Purple Yam - Catering', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 10),
(242, 4, 'Blooming Gardens Florals', 8000.00, NULL, 'pending', NULL, NULL, 0, 'Blooming Gardens Florals - Floral Design', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 11),
(243, 4, 'External Creatives', 35000.00, NULL, 'pending', NULL, NULL, 0, 'External Creatives', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 12),
(244, 5, 'Pearlmont Hotel - Package 2', 48000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel - Package 2', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(245, 5, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 188, NULL, NULL, 1),
(246, 5, 'EventCorp AV Solutions', 12000.00, NULL, 'pending', NULL, NULL, 0, 'EventCorp AV Solutions - Audio Visual', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 2),
(247, 5, 'Perfect Shots Photography', 20000.00, NULL, 'pending', NULL, NULL, 0, 'Perfect Shots Photography - Photography', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 3),
(248, 5, 'External Creatives', 10000.00, NULL, 'pending', NULL, NULL, 0, 'External Creatives', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 4),
(249, 6, 'Demiren Hotel', 30000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Demiren Hotel (includes overflow for 150 guests)', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(250, 6, 'Elegant Catering Services', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Elegant Catering Services - Catering', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 1),
(251, 6, 'EventCorp AV Solutions', 12000.00, NULL, 'pending', NULL, NULL, 0, 'EventCorp AV Solutions - Audio Visual', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 2),
(252, 6, 'Perfect Shots Photography', 20000.00, NULL, 'pending', NULL, NULL, 0, 'Perfect Shots Photography - Photography', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 3),
(253, 6, 'Purple Yam', 0.00, NULL, 'pending', NULL, NULL, 0, 'Purple Yam - Catering', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 4),
(254, 6, 'Blooming Gardens Florals', 8000.00, NULL, 'pending', NULL, NULL, 0, 'Blooming Gardens Florals - Floral Design', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 5),
(255, 6, 'External Supplier Sample', 50000.00, NULL, 'pending', NULL, NULL, 0, 'External Supplier Sample', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 6),
(256, 7, 'Pearlmont Hotel', 79000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel (includes overflow for 200 guests)', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(257, 7, 'Blooming Gardens Florals', 8000.00, NULL, 'pending', NULL, NULL, 0, 'Blooming Gardens Florals - Floral Design', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 1),
(258, 7, 'Perfect Shots Photography', 20000.00, NULL, 'pending', NULL, NULL, 0, 'Perfect Shots Photography - Photography', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 2),
(259, 7, 'Fablus Catering', 35000.00, NULL, 'pending', NULL, NULL, 0, 'Fablus Catering', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 3),
(260, 7, 'Purple Yam', 0.00, NULL, 'pending', NULL, NULL, 0, 'Purple Yam - Catering', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 4),
(261, 7, 'EventCorp AV Solutions', 12000.00, NULL, 'pending', NULL, NULL, 0, 'EventCorp AV Solutions - Audio Visual', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 5),
(262, 8, 'Demiren Hotel', 100000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Demiren Hotel (includes overflow for 500 guests)', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(263, 8, 'Elegant Catering Services', 25000.00, 25000.00, 'pending', 'Added from supplier: Elegant Catering Services', NULL, 0, 'Elegant Catering Services - Catering', 1, 1, 'pending', NULL, NULL, NULL, 1, NULL, 1),
(264, 8, 'Perfect Shots Photography', 20000.00, 20000.00, 'pending', 'Added from supplier: Perfect Shots Photography', NULL, 0, 'Perfect Shots Photography - Photography', 1, 1, 'pending', NULL, NULL, NULL, 2, NULL, 2),
(265, 8, 'Custom Component', 12000.00, NULL, 'pending', NULL, NULL, 0, 'Custom Component', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 3),
(266, 8, 'Test', 10000000.00, NULL, 'pending', NULL, NULL, 0, 'Test', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 4),
(267, 9, 'Pearlmont Hotel', 184000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel (includes overflow for 500 guests)', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(268, 9, 'Elegant Catering Services - Wedding Catering Package - Premium', 75000.00, NULL, 'pending', NULL, NULL, 0, 'Elegant Catering Services - Catering (Wedding Catering Package - Premium)', 1, 1, 'pending', NULL, NULL, NULL, 1, NULL, 1),
(269, 9, 'Blooming Gardens Florals - Reception Centerpieces', 8000.00, NULL, 'pending', NULL, NULL, 0, 'Blooming Gardens Florals - Floral Design (Reception Centerpieces)', 1, 1, 'pending', NULL, NULL, NULL, 3, NULL, 2),
(270, 9, 'Sample rate ', 500000.00, NULL, 'pending', NULL, NULL, 0, 'Sample rate ', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 3),
(271, 10, 'Demiren Hotel', 20000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Demiren Hotel', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(272, 10, 'Random', 12000.00, NULL, 'pending', NULL, NULL, 0, 'Random', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 1),
(273, 10, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', 15000.00, NULL, 'pending', NULL, NULL, 0, 'Blooming Gardens Florals - Floral Design (Bridal Bouquet & Ceremony Florals)', 1, 1, 'pending', NULL, NULL, NULL, 3, NULL, 2),
(274, 11, 'Pearlmont Hotel', 79000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel (includes overflow for 200 guests)', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(275, 11, 'Elegant Catering Services - Wedding Catering Package - Premium', 75000.00, NULL, 'pending', NULL, NULL, 0, 'Elegant Catering Services - Catering (Wedding Catering Package - Premium)', 1, 1, 'pending', NULL, NULL, NULL, 1, NULL, 1),
(276, 11, 'Perfect Shots Photography - Event Photography Half Day', 20000.00, NULL, 'pending', NULL, NULL, 0, 'Perfect Shots Photography - Photography (Event Photography Half Day)', 1, 1, 'pending', NULL, NULL, NULL, 2, NULL, 2),
(277, 11, 'Blooming Gardens Florals - Reception Centerpieces', 8000.00, NULL, 'pending', NULL, NULL, 0, 'Blooming Gardens Florals - Floral Design (Reception Centerpieces)', 1, 1, 'pending', NULL, NULL, NULL, 3, NULL, 3),
(278, 12, 'Pearlmont Hotel - Package 2', 48000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel - Package 2', 0, 1, 'paid', '2025-08-08 22:16:08', 'Status changed to paid by admin', NULL, NULL, NULL, 0),
(279, 12, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-08-08 22:17:58', 'Status changed to paid by admin', 189, NULL, NULL, 1),
(280, 12, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-08-08 22:18:03', 'Status changed to paid by admin', 190, NULL, NULL, 2),
(281, 12, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 0, 'pending', NULL, NULL, 191, NULL, NULL, 3),
(282, 12, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 0, 'pending', NULL, NULL, 192, NULL, NULL, 4),
(283, 12, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-08-08 22:30:07', 'Status changed to paid by admin', 193, NULL, NULL, 5),
(284, 12, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-08-08 22:30:31', 'Status changed to paid by admin', 194, NULL, NULL, 6),
(285, 12, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-08-08 22:30:28', 'Status changed to paid by admin', 195, NULL, NULL, 7),
(286, 12, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 0, 'pending', NULL, NULL, 196, NULL, NULL, 8),
(287, 12, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-08-08 22:30:36', 'Status changed to paid by admin', 205, NULL, NULL, 9),
(288, 12, 'Elegant Catering Services - Wedding Catering Package - Premium', 75000.00, NULL, 'pending', NULL, NULL, 0, 'Elegant Catering Services - Catering (Wedding Catering Package - Premium)', 1, 1, 'paid', '2025-08-08 22:17:52', 'Status changed to paid by admin', NULL, 1, NULL, 10),
(289, 12, 'Sample rate ', 12000.00, NULL, 'pending', NULL, NULL, 0, 'Sample rate ', 1, 1, 'paid', '2025-08-08 22:30:25', 'Status changed to paid by admin', NULL, NULL, NULL, 11),
(290, 13, 'Food and Beverages', 120000.00, NULL, 'pending', NULL, NULL, 0, 'Premium Large Size Buffet, Free Snacks, Full-blown Lunch, Golden Dinner', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(291, 13, 'Photo and Video', 50000.00, NULL, 'pending', NULL, NULL, 0, 'IMAX Equipments, High-resolution Edits, Multiple Same Edits, Multiple Photo and Video Booth, Drone Shots, Special Video Director', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 1),
(292, 13, 'Transporation', 300000.00, NULL, 'pending', NULL, NULL, 0, 'White Lamborghini Aventador, Free Cars for the main family', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 2),
(293, 13, 'Entertainment', 250000.00, NULL, 'pending', NULL, NULL, 0, 'Special Guess, Magic Performance, Live Band, Sing a long (Unlimited Hours)', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 3),
(294, 13, 'Ultrawinds Mountain Resort', 50000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Ultrawinds Mountain Resort', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 4),
(295, 31, 'Demiren Hotel', 20000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Demiren Hotel', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(296, 31, 'Venue Decoration', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Full flower decoration, Theme of choice', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 1),
(297, 31, 'Test', 120.00, NULL, 'pending', NULL, NULL, 0, 'Test', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 2),
(298, 31, 'Elegant Catering Services - Wedding Catering Package - Premium', 75000.00, NULL, 'pending', NULL, NULL, 0, 'Elegant Catering Services - Catering (Wedding Catering Package - Premium)', 1, 1, 'pending', NULL, NULL, NULL, 1, NULL, 3),
(299, 32, 'Pearlmont Hotel', 44000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(300, 32, 'Venue Decoration', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Full flower decoration, Theme of choice', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 1),
(301, 32, 'EventCorp AV Solutions - Basic Sound System Package', 12000.00, NULL, 'pending', NULL, NULL, 0, 'EventCorp AV Solutions - Audio Visual (Basic Sound System Package)', 1, 1, 'pending', NULL, NULL, NULL, 4, NULL, 2),
(302, 32, 'Cakes and Weddings', 35000.00, NULL, 'pending', NULL, NULL, 0, 'Cakes and Weddings', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 3),
(303, 32, 'Perfect Shots Photography - Wedding Photography Full Day', 45000.00, NULL, 'pending', NULL, NULL, 0, 'Perfect Shots Photography - Photography (Wedding Photography Full Day)', 1, 1, 'pending', NULL, NULL, NULL, 2, NULL, 4),
(304, 33, 'Demiren Hotel', 20000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Demiren Hotel', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(305, 33, 'Venue Decoration', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Full flower decoration, Theme of choice', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 1),
(306, 33, 'Elegant Catering Services - Wedding Catering Package - Premium', 75000.00, NULL, 'pending', NULL, NULL, 0, 'Elegant Catering Services - Catering (Wedding Catering Package - Premium)', 1, 1, 'pending', NULL, NULL, NULL, 1, NULL, 2),
(307, 33, 'Blooming Gardens Florals - Reception Centerpieces', 8000.00, NULL, 'pending', NULL, NULL, 0, 'Blooming Gardens Florals - Floral Design (Reception Centerpieces)', 1, 1, 'pending', NULL, NULL, NULL, 3, NULL, 3),
(308, 34, 'Demiren Hotel', 20000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Demiren Hotel', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(309, 34, 'Venue Decoration', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Full flower decoration, Theme of choice', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 1),
(310, 34, 'Elegant Catering Services - Wedding Catering Package - Premium', 75000.00, NULL, 'pending', NULL, NULL, 0, 'Elegant Catering Services - Catering (Wedding Catering Package - Premium)', 1, 1, 'pending', NULL, NULL, NULL, 1, NULL, 2),
(311, 34, 'Blooming Gardens Florals - Reception Centerpieces', 8000.00, NULL, 'pending', NULL, NULL, 0, 'Blooming Gardens Florals - Floral Design (Reception Centerpieces)', 1, 1, 'pending', NULL, NULL, NULL, 3, NULL, 3),
(312, 35, 'Pearlmont Hotel', 44000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(313, 35, 'Food and Beverages', 120000.00, NULL, 'pending', NULL, NULL, 0, 'Premium Large Size Buffet, Free Snacks, Full-blown Lunch, Golden Dinner', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 1),
(314, 35, 'Elegant Catering Services - Wedding Catering Package - Premium', 75000.00, NULL, 'pending', NULL, NULL, 0, 'Elegant Catering Services - Catering (Wedding Catering Package - Premium)', 1, 1, 'pending', NULL, NULL, NULL, 1, NULL, 2),
(315, 35, 'Blooming Gardens Florals - Reception Centerpieces', 8000.00, NULL, 'pending', NULL, NULL, 0, 'Blooming Gardens Florals - Floral Design (Reception Centerpieces)', 1, 1, 'pending', NULL, NULL, NULL, 3, NULL, 3),
(316, 35, 'Perfect Shots Photography - Wedding Photography Full Day', 45000.00, NULL, 'pending', NULL, NULL, 0, 'Perfect Shots Photography - Photography (Wedding Photography Full Day)', 1, 1, 'pending', NULL, NULL, NULL, 2, NULL, 4),
(317, 35, 'Test Component', 120000.00, NULL, 'pending', NULL, NULL, 0, 'Test Component', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 5),
(318, 36, 'Pearlmont Hotel - Package 2', 48000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel - Package 2', 0, 1, 'paid', '2025-08-09 05:03:01', 'Status changed to paid by admin', NULL, NULL, NULL, 0),
(319, 36, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 188, NULL, NULL, 1),
(320, 36, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', 15000.00, NULL, 'pending', NULL, NULL, 0, 'Blooming Gardens Florals - Floral Design (Bridal Bouquet & Ceremony Florals)', 1, 1, 'pending', NULL, NULL, NULL, 3, NULL, 2),
(321, 36, 'Sample Test', 20000.00, NULL, 'pending', NULL, NULL, 0, 'Sample Test', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 3),
(322, 37, 'Pearlmont Hotel - Package 2', 48000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel - Package 2', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(323, 37, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 1),
(324, 37, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 2),
(325, 37, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 3),
(326, 37, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 4),
(327, 37, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 5),
(328, 37, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 6),
(329, 37, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 7),
(330, 37, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 196, NULL, NULL, 8),
(331, 37, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 9),
(332, 37, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', 15000.00, NULL, 'pending', NULL, NULL, 0, 'Blooming Gardens Florals - Floral Design (Bridal Bouquet & Ceremony Florals)', 1, 1, 'pending', NULL, NULL, NULL, 3, NULL, 10),
(333, 48, 'Demiren Hotel', 20000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Demiren Hotel', 0, 1, 'paid', '2025-09-22 16:07:36', 'Status changed to paid by admin', NULL, NULL, NULL, 0),
(334, 48, 'Venue Decoration', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Full flower decoration, Theme of choice', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 1),
(335, 48, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', 15000.00, NULL, 'pending', NULL, NULL, 0, 'Blooming Gardens Florals - Floral Design (Bridal Bouquet & Ceremony Florals)', 1, 1, 'pending', NULL, NULL, NULL, 3, NULL, 2),
(336, 48, 'Test', 20000.00, NULL, 'pending', NULL, NULL, 0, 'Test', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 3),
(337, 49, 'Pearlmont Hotel - Package 2', 48000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel - Package 2', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(338, 49, 'Venue Rental', 44000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 279, NULL, NULL, 1),
(339, 49, 'Catering', 70000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 280, NULL, NULL, 2),
(340, 49, 'Lights & Sounds', 30000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 281, NULL, NULL, 3),
(341, 49, 'Host & Live Performer', 20000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 0, 'pending', NULL, NULL, 282, NULL, NULL, 4),
(342, 49, 'Event Styling & Decorations', 30000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 283, NULL, NULL, 5),
(343, 49, 'Photographer & Videographer', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 284, NULL, NULL, 6),
(344, 49, 'Invitation Design & Printing', 6000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 285, NULL, NULL, 7),
(345, 49, 'Cake & Wine Set', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 286, NULL, NULL, 8),
(346, 49, 'Blooming Gardens Florals - Reception Centerpieces', 8000.00, NULL, 'pending', NULL, NULL, 0, 'Blooming Gardens Florals - Floral Design (Reception Centerpieces)', 1, 1, 'pending', NULL, NULL, NULL, 3, NULL, 9),
(347, 49, 'Test Components', 45000.00, NULL, 'pending', NULL, NULL, 0, 'Test Components', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 10),
(348, 50, 'Demiren Hotel', 20000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Demiren Hotel', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(349, 50, 'sample_inclusion', 12000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 287, NULL, NULL, 1),
(350, 50, 'sample_inclusion 2', 20000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 288, NULL, NULL, 2),
(351, 50, 'Elegant Catering Services - Wedding Catering Package - Premium', 75000.00, NULL, 'pending', NULL, NULL, 0, 'Elegant Catering Services - Catering (Wedding Catering Package - Premium)', 1, 1, 'paid', '2025-08-08 19:17:20', 'Status changed to paid by admin', NULL, 1, NULL, 3),
(352, 50, 'Test', 12000.00, NULL, 'pending', NULL, NULL, 0, 'Test', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 4),
(353, 59, 'Venue Decoration', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Full flower decoration, Theme of choice', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(354, 59, 'Food and Beverages', 35000.00, NULL, 'pending', NULL, NULL, 0, 'Free Lunch, Coffee Stand, Full Buffet Dinner', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 1),
(355, 59, 'Transporation', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Free Limosin Offer', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 2),
(356, 59, 'Photo and Video', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Same Day Edit (SDE), Free USB, Photobooth, Photoshoot, Scheduled Prenup', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 3),
(357, 59, 'Pearlmont Hotel - Package 2', 48000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel - Package 2', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 4),
(358, 60, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-09 08:10:29', 'Status changed to paid by admin', 189, NULL, NULL, 0),
(359, 60, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-09 08:22:25', 'Status changed to paid by admin', 190, NULL, NULL, 1);
INSERT INTO `tbl_event_components` (`component_id`, `event_id`, `component_name`, `component_price`, `supplier_price`, `supplier_status`, `supplier_notes`, `delivery_date`, `is_rated`, `component_description`, `is_custom`, `is_included`, `payment_status`, `payment_date`, `payment_notes`, `original_package_component_id`, `supplier_id`, `offer_id`, `display_order`) VALUES
(360, 60, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-09 08:30:23', 'Status changed to paid by admin', 191, NULL, NULL, 2),
(361, 60, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-09 08:30:30', 'Status changed to paid by admin', 192, NULL, NULL, 3),
(362, 60, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-09 08:30:33', 'Status changed to paid by admin', 193, NULL, NULL, 4),
(363, 60, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-11 02:36:53', 'Status changed to paid by admin', 194, NULL, NULL, 5),
(364, 60, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-11 02:36:57', 'Status changed to paid by admin', 195, NULL, NULL, 6),
(365, 60, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-11 02:37:02', 'Status changed to paid by admin', 196, NULL, NULL, 7),
(366, 60, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-11 02:37:05', 'Status changed to paid by admin', 205, NULL, NULL, 8),
(367, 60, 'Pearlmont Hotel', 44000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel', 0, 1, 'paid', '2025-09-11 02:36:59', 'Status changed to paid by admin', NULL, NULL, NULL, 9),
(368, 61, 'sample_inclusion', 12000.00, NULL, 'delivered', NULL, '2025-09-09', 0, '', 0, 1, 'paid', '2025-09-05 15:39:13', 'Status changed to paid by admin', 287, NULL, NULL, 0),
(369, 61, 'sample_inclusion 2', 20000.00, NULL, 'delivered', NULL, '2025-09-09', 0, '', 0, 1, 'paid', '2025-09-05 15:39:18', 'Status changed to paid by admin', 288, NULL, NULL, 1),
(370, 61, 'Demiren Hotel', 20000.00, NULL, 'delivered', NULL, '2025-09-09', 0, 'Venue: Demiren Hotel', 0, 1, 'paid', '2025-09-05 15:39:21', 'Status changed to paid by admin', NULL, NULL, NULL, 2),
(371, 62, 'Venue Decoration', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Full flower decoration, Theme of choice', 0, 1, 'paid', '2025-09-04 22:51:54', 'Status changed to paid by admin', NULL, NULL, NULL, 0),
(372, 62, 'Food and Beverages', 35000.00, NULL, 'pending', NULL, NULL, 0, 'Free Lunch, Coffee Stand, Full Buffet Dinner', 0, 1, 'paid', '2025-09-04 23:34:14', 'Status changed to paid by admin', NULL, NULL, NULL, 1),
(373, 62, 'Transporation', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Free Limosin Offer', 0, 1, 'paid', '2025-09-04 23:34:17', 'Status changed to paid by admin', NULL, NULL, NULL, 2),
(374, 62, 'Photo and Video', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Same Day Edit (SDE), Free USB, Photobooth, Photoshoot, Scheduled Prenup', 0, 1, 'paid', '2025-09-04 23:34:23', 'Status changed to paid by admin', NULL, NULL, NULL, 3),
(375, 62, 'Demiren Hotel', 20000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Demiren Hotel', 0, 1, 'paid', '2025-09-04 23:34:25', 'Status changed to paid by admin', NULL, NULL, NULL, 4),
(376, 63, 'Pearlmont Hotel - Package 2', 63000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel - Package 2', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(377, 63, 'Venue Rental', 44000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 279, NULL, NULL, 1),
(378, 63, 'Catering', 70000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 280, NULL, NULL, 2),
(379, 63, 'Lights & Sounds', 30000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 281, NULL, NULL, 3),
(380, 63, 'Host & Live Performer', 20000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 0, 'pending', NULL, NULL, 282, NULL, NULL, 4),
(381, 63, 'Event Styling & Decorations', 30000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 0, 'pending', NULL, NULL, 283, NULL, NULL, 5),
(382, 63, 'Photographer & Videographer', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 284, NULL, NULL, 6),
(383, 63, 'Invitation Design & Printing', 6000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 285, NULL, NULL, 7),
(384, 63, 'Cake & Wine Set', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 286, NULL, NULL, 8),
(385, 63, 'Elegant Catering Services - Wedding Catering Package - Premium', 75000.00, NULL, 'pending', NULL, NULL, 0, 'Elegant Catering Services - Catering (Wedding Catering Package - Premium)', 1, 1, 'pending', NULL, NULL, NULL, 1, NULL, 9),
(386, 64, 'Pearlmont Hotel', 61500.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(387, 64, 'Food', 12000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 1),
(388, 64, 'External Food', 12000.00, NULL, 'pending', NULL, NULL, 0, 'External Food', 1, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 2),
(389, 65, 'Pearlmont Hotel - Package 2', 48000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel - Package 2', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(390, 65, 'Full Wedding Coordination', 15000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 189, NULL, NULL, 1),
(391, 65, 'Attire ', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 190, NULL, NULL, 2),
(392, 65, 'Hair and Makeup', 8000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 191, NULL, NULL, 3),
(393, 65, 'Wedding Cake', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 192, NULL, NULL, 4),
(394, 65, 'Transport & Floral Decor ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 193, NULL, NULL, 5),
(395, 65, 'Emcee & Program Flow', 4000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 194, NULL, NULL, 6),
(396, 65, 'Photography & Videography', 35000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 195, NULL, NULL, 7),
(397, 65, 'Remaining Buffer ', 7000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 0, 'pending', NULL, NULL, 196, NULL, NULL, 8),
(398, 65, 'Inclusions', 0.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 205, NULL, NULL, 9),
(399, 65, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', 15000.00, NULL, 'pending', NULL, NULL, 0, 'Blooming Gardens Florals - Floral Design (Bridal Bouquet & Ceremony Florals)', 1, 1, 'pending', NULL, NULL, NULL, 3, NULL, 10),
(400, 66, 'Venue Decoration', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Full flower decoration, Theme of choice', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(401, 66, 'Food and Beverages', 35000.00, NULL, 'pending', NULL, NULL, 0, 'Free Lunch, Coffee Stand, Full Buffet Dinner', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 1),
(402, 66, 'Transporation', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Free Limosin Offer', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 2),
(403, 66, 'Photo and Video', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Same Day Edit (SDE), Free USB, Photobooth, Photoshoot, Scheduled Prenup', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 3),
(404, 66, 'Demiren Hotel', 30000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Demiren Hotel', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 4),
(504, 67, 'Pearlmont Hotel - Package 2', 63000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel - Package 2', 0, 1, 'paid', '2025-09-23 15:51:45', 'Status changed to paid by admin', NULL, NULL, NULL, 0),
(505, 67, 'Venue Rental', 44000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-23 15:51:49', 'Status changed to paid by admin', 279, NULL, NULL, 1),
(506, 67, 'Catering', 70000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-23 15:52:02', 'Status changed to paid by admin', 280, NULL, NULL, 2),
(507, 67, 'Lights & Sounds', 30000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 0, 'pending', NULL, NULL, 281, NULL, NULL, 3),
(508, 67, 'Host & Live Performer', 20000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 0, 'pending', NULL, NULL, 282, NULL, NULL, 4),
(509, 67, 'Event Styling & Decorations', 30000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-23 15:52:09', 'Status changed to paid by admin', 283, NULL, NULL, 5),
(510, 67, 'Photographer & Videographer', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-23 15:52:41', 'Status changed to paid by admin', 284, NULL, NULL, 6),
(511, 67, 'Invitation Design & Printing', 6000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-23 15:52:46', 'Status changed to paid by admin', 285, NULL, NULL, 7),
(512, 67, 'Cake & Wine Set', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-23 15:52:50', 'Status changed to paid by admin', 286, NULL, NULL, 8),
(513, 67, 'Test', 20000.00, NULL, 'pending', NULL, NULL, 0, 'Test', 1, 1, 'paid', '2025-09-23 15:54:55', 'Status changed to paid by admin', NULL, NULL, NULL, 9),
(514, 67, 'Elegant Catering Services - Wedding Catering Package - Premium', 75000.00, NULL, 'pending', NULL, NULL, 0, 'Elegant Catering Services - Catering (Wedding Catering Package - Premium)', 1, 1, 'paid', '2025-09-23 15:54:49', 'Status changed to paid by admin', NULL, 1, NULL, 10),
(515, 68, 'Venue Rental', 44000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-11 15:52:59', 'Status changed to paid by admin', 279, NULL, NULL, 0),
(516, 68, 'Catering', 70000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-11 16:04:20', 'Status changed to paid by admin', 280, NULL, NULL, 1),
(517, 68, 'Lights & Sounds', 30000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-11 16:04:36', 'Status changed to paid by admin', 281, NULL, NULL, 2),
(518, 68, 'Host & Live Performer', 20000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 282, NULL, NULL, 3),
(519, 68, 'Event Styling & Decorations', 30000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 283, NULL, NULL, 4),
(520, 68, 'Photographer & Videographer', 25000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-11 08:12:07', 'Status changed to paid by admin', 284, NULL, NULL, 5),
(521, 68, 'Invitation Design & Printing', 6000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 285, NULL, NULL, 6),
(522, 68, 'Cake & Wine Set', 5000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'pending', NULL, NULL, 286, NULL, NULL, 7),
(523, 68, 'Pearlmont Hotel - Package 2', 48000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Pearlmont Hotel - Package 2', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 8),
(524, 69, 'Demiren Hotel', 20000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Demiren Hotel', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 0),
(525, 69, 'Venue Decoration', 25000.00, NULL, 'pending', NULL, NULL, 0, 'Full flower decoration, Theme of choice', 0, 1, 'pending', NULL, NULL, NULL, NULL, NULL, 1),
(526, 70, 'Demiren Hotel', 20000.00, NULL, 'pending', NULL, NULL, 0, 'Venue: Demiren Hotel', 0, 1, 'paid', '2025-09-22 16:05:22', 'Status changed to paid by admin', NULL, NULL, NULL, 0),
(527, 70, 'Test', 12000.00, NULL, 'pending', NULL, NULL, 0, '', 0, 1, 'paid', '2025-09-22 09:51:43', 'Status changed to paid by admin', NULL, NULL, NULL, 1),
(528, 70, 'Anima - Electronic Mascots', 0.00, NULL, 'pending', NULL, NULL, 0, 'Anima - Electronic Mascots - Entertainment', 1, 1, 'paid', '2025-09-22 09:46:58', 'Status changed to paid by admin', NULL, 7, NULL, 2);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_event_organizer_assignments`
--

CREATE TABLE `tbl_event_organizer_assignments` (
  `assignment_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `organizer_id` int(11) NOT NULL,
  `assigned_by` int(11) NOT NULL COMMENT 'Admin who assigned the organizer',
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('assigned','accepted','rejected','removed') DEFAULT 'assigned',
  `notes` text DEFAULT NULL COMMENT 'Admin notes about the assignment',
  `agreed_talent_fee` decimal(12,2) DEFAULT NULL,
  `fee_currency` varchar(10) NOT NULL DEFAULT 'PHP',
  `fee_status` enum('unset','proposed','confirmed','paid') NOT NULL DEFAULT 'unset',
  `payment_status` enum('unpaid','partial','paid','cancelled') NOT NULL DEFAULT 'unpaid',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Track organizer assignments to events';

--
-- Dumping data for table `tbl_event_organizer_assignments`
--

INSERT INTO `tbl_event_organizer_assignments` (`assignment_id`, `event_id`, `organizer_id`, `assigned_by`, `assigned_at`, `status`, `notes`, `agreed_talent_fee`, `fee_currency`, `fee_status`, `payment_status`, `created_at`, `updated_at`) VALUES
(1, 1, 3, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(2, 3, 4, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(3, 4, 3, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(4, 5, 3, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(5, 8, 4, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(6, 9, 3, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(7, 10, 4, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(8, 12, 3, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(9, 13, 3, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(10, 31, 3, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(11, 32, 3, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(12, 33, 4, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(13, 34, 4, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(14, 35, 4, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(15, 36, 4, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(16, 48, 6, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(17, 49, 5, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(18, 50, 5, 7, '2025-08-19 16:20:37', 'assigned', NULL, NULL, 'PHP', 'unset', 'unpaid', '2025-08-19 16:20:37', '2025-08-19 16:20:37'),
(33, 62, 7, 7, '2025-08-20 04:35:17', 'assigned', 'Assigned during event creation', NULL, 'PHP', 'unset', 'unpaid', '2025-08-20 04:35:17', '2025-08-20 04:35:17'),
(34, 63, 6, 7, '2025-08-30 04:34:47', 'assigned', 'Assigned during event creation', NULL, 'PHP', 'unset', 'unpaid', '2025-08-30 04:34:47', '2025-08-30 04:34:47'),
(35, 64, 6, 7, '2025-08-30 07:44:02', 'assigned', 'Assigned during event creation', NULL, 'PHP', 'unset', 'unpaid', '2025-08-30 07:44:02', '2025-08-30 07:44:02'),
(36, 60, 4, 7, '2025-09-08 16:57:26', 'accepted', 'Assigned from event page', NULL, 'PHP', 'unset', 'paid', '2025-09-08 16:57:26', '2025-09-11 00:36:32'),
(38, 61, 6, 7, '2025-09-08 20:16:36', 'assigned', 'Assigned from event page', NULL, 'PHP', 'unset', 'unpaid', '2025-09-08 20:16:36', '2025-09-08 20:16:36'),
(39, 66, 4, 7, '2025-09-09 23:01:51', 'accepted', 'Assigned during event creation', NULL, 'PHP', 'unset', 'unpaid', '2025-09-09 23:01:51', '2025-09-10 23:08:07'),
(40, 67, 4, 7, '2025-09-11 06:01:51', 'accepted', 'Assigned during event creation', NULL, 'PHP', 'unset', 'unpaid', '2025-09-11 06:01:51', '2025-09-11 06:02:24'),
(41, 68, 4, 7, '2025-09-11 06:10:22', 'accepted', 'Assigned during event creation', NULL, 'PHP', 'unset', 'unpaid', '2025-09-11 06:10:22', '2025-09-11 06:11:32'),
(42, 69, 4, 7, '2025-09-13 05:25:59', 'assigned', 'Assigned during event creation', NULL, 'PHP', 'unset', 'unpaid', '2025-09-13 05:25:59', '2025-09-13 05:25:59'),
(43, 70, 4, 7, '2025-09-22 06:59:23', 'assigned', 'Assigned during event creation', NULL, 'PHP', 'unset', 'paid', '2025-09-22 06:59:23', '2025-09-22 07:51:34');

--
-- Triggers `tbl_event_organizer_assignments`
--
DELIMITER $$
CREATE TRIGGER `log_organizer_assignment` AFTER INSERT ON `tbl_event_organizer_assignments` FOR EACH ROW BEGIN
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
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `log_organizer_assignment_update` AFTER UPDATE ON `tbl_event_organizer_assignments` FOR EACH ROW BEGIN
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
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_event_package`
--

CREATE TABLE `tbl_event_package` (
  `event_package_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `venue_id` int(11) NOT NULL,
  `store_id` int(11) NOT NULL,
  `budget_id` int(11) NOT NULL,
  `event_type_id` int(11) NOT NULL,
  `event_package_notes` text DEFAULT NULL,
  `event_package_services` text DEFAULT NULL,
  `event_package_description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_event_payment_schedules`
--

CREATE TABLE `tbl_event_payment_schedules` (
  `schedule_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `schedule_type_id` int(11) NOT NULL,
  `installment_number` int(11) NOT NULL DEFAULT 1,
  `due_date` date NOT NULL,
  `amount_due` decimal(12,2) NOT NULL,
  `amount_paid` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_status` enum('pending','partial','paid','overdue') NOT NULL DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_event_timeline`
--

CREATE TABLE `tbl_event_timeline` (
  `timeline_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `component_id` int(11) DEFAULT NULL,
  `activity_title` varchar(255) NOT NULL,
  `activity_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `status` enum('pending','in-progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  `display_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_event_timeline`
--

INSERT INTO `tbl_event_timeline` (`timeline_id`, `event_id`, `component_id`, `activity_title`, `activity_date`, `start_time`, `end_time`, `location`, `notes`, `assigned_to`, `status`, `display_order`) VALUES
(229, 28, NULL, 'Inclusions', '2025-06-26', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(230, 28, NULL, 'Full Wedding Coordination', '2025-06-26', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(231, 28, NULL, 'Attire ', '2025-06-26', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(232, 28, NULL, 'Hair and Makeup', '2025-06-26', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(233, 28, NULL, 'Wedding Cake', '2025-06-26', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(234, 28, NULL, 'Transport & Floral Decor ', '2025-06-26', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(235, 28, NULL, 'Emcee & Program Flow', '2025-06-26', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(236, 28, NULL, 'Photography & Videography', '2025-06-26', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(237, 28, NULL, 'Remaining Buffer ', '2025-06-26', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(238, 29, NULL, 'Inclusions', '2025-06-26', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(239, 29, NULL, 'Full Wedding Coordination', '2025-06-26', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(240, 29, NULL, 'Attire ', '2025-06-26', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(241, 29, NULL, 'Hair and Makeup', '2025-06-26', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(242, 29, NULL, 'Wedding Cake', '2025-06-26', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(243, 29, NULL, 'Transport & Floral Decor ', '2025-06-26', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(244, 29, NULL, 'Emcee & Program Flow', '2025-06-26', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(245, 29, NULL, 'Photography & Videography', '2025-06-26', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(246, 29, NULL, 'Remaining Buffer ', '2025-06-26', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(247, 30, NULL, 'Inclusions', '2025-06-28', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(248, 30, NULL, 'Full Wedding Coordination', '2025-06-28', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(249, 30, NULL, 'Attire ', '2025-06-28', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(250, 30, NULL, 'Hair and Makeup', '2025-06-28', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(251, 30, NULL, 'Wedding Cake', '2025-06-28', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(252, 30, NULL, 'Transport & Floral Decor ', '2025-06-28', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(253, 30, NULL, 'Emcee & Program Flow', '2025-06-28', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(254, 30, NULL, 'Photography & Videography', '2025-06-28', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(255, 30, NULL, 'Remaining Buffer ', '2025-06-28', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(256, 31, NULL, 'Inclusions', '2025-06-27', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(257, 31, NULL, 'Inclusions', '2025-06-27', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(258, 32, NULL, 'Inclusions', '2025-06-29', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(259, 32, NULL, 'Full Wedding Coordination', '2025-06-29', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(260, 32, NULL, 'Attire ', '2025-06-29', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(261, 32, NULL, 'Hair and Makeup', '2025-06-29', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(262, 32, NULL, 'Wedding Cake', '2025-06-29', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(263, 32, NULL, 'Transport & Floral Decor ', '2025-06-29', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(264, 32, NULL, 'Emcee & Program Flow', '2025-06-29', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(265, 32, NULL, 'Photography & Videography', '2025-06-29', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(266, 32, NULL, 'Remaining Buffer ', '2025-06-29', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(267, 33, NULL, 'Inclusions', '2025-06-30', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(268, 33, NULL, 'Full Wedding Coordination', '2025-06-30', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(269, 33, NULL, 'Attire ', '2025-06-30', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(270, 33, NULL, 'Hair and Makeup', '2025-06-30', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(271, 33, NULL, 'Wedding Cake', '2025-06-30', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(272, 33, NULL, 'Transport & Floral Decor ', '2025-06-30', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(273, 33, NULL, 'Emcee & Program Flow', '2025-06-30', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(274, 33, NULL, 'Photography & Videography', '2025-06-30', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(275, 33, NULL, 'Remaining Buffer ', '2025-06-30', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(276, 34, NULL, 'Inclusions', '2025-06-29', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(277, 34, NULL, 'Full Wedding Coordination', '2025-06-29', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(278, 34, NULL, 'Attire ', '2025-06-29', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(279, 34, NULL, 'Hair and Makeup', '2025-06-29', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(280, 34, NULL, 'Wedding Cake', '2025-06-29', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(281, 34, NULL, 'Transport & Floral Decor ', '2025-06-29', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(282, 34, NULL, 'Emcee & Program Flow', '2025-06-29', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(283, 34, NULL, 'Photography & Videography', '2025-06-29', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(284, 34, NULL, 'Remaining Buffer ', '2025-06-29', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(285, 35, NULL, 'Inclusions', '2025-07-03', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(286, 35, NULL, 'Full Wedding Coordination', '2025-07-03', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(287, 35, NULL, 'Attire ', '2025-07-03', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(288, 35, NULL, 'Hair and Makeup', '2025-07-03', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(289, 35, NULL, 'Wedding Cake', '2025-07-03', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(290, 35, NULL, 'Transport & Floral Decor ', '2025-07-03', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(291, 35, NULL, 'Emcee & Program Flow', '2025-07-03', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(292, 35, NULL, 'Photography & Videography', '2025-07-03', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(293, 35, NULL, 'Remaining Buffer ', '2025-07-03', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(294, 36, NULL, 'Inclusions', '2025-07-03', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(295, 36, NULL, 'Full Wedding Coordination', '2025-07-03', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(296, 36, NULL, 'Attire ', '2025-07-03', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(297, 36, NULL, 'Hair and Makeup', '2025-07-03', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(298, 36, NULL, 'Wedding Cake', '2025-07-03', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(299, 36, NULL, 'Transport & Floral Decor ', '2025-07-03', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(300, 36, NULL, 'Emcee & Program Flow', '2025-07-03', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(301, 36, NULL, 'Photography & Videography', '2025-07-03', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(302, 36, NULL, 'Remaining Buffer ', '2025-07-03', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(303, 37, NULL, 'Inclusions', '2025-07-10', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(304, 37, NULL, 'Full Wedding Coordination', '2025-07-10', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(305, 37, NULL, 'Attire ', '2025-07-10', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(306, 37, NULL, 'Hair and Makeup', '2025-07-10', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(307, 37, NULL, 'Wedding Cake', '2025-07-10', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(308, 37, NULL, 'Transport & Floral Decor ', '2025-07-10', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(309, 37, NULL, 'Emcee & Program Flow', '2025-07-10', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(310, 37, NULL, 'Photography & Videography', '2025-07-10', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(311, 37, NULL, 'Remaining Buffer ', '2025-07-10', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(312, 38, NULL, 'Inclusions', '2025-07-11', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(313, 38, NULL, 'Full Wedding Coordination', '2025-07-11', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(314, 38, NULL, 'Attire ', '2025-07-11', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(315, 38, NULL, 'Hair and Makeup', '2025-07-11', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(316, 38, NULL, 'Wedding Cake', '2025-07-11', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(317, 38, NULL, 'Transport & Floral Decor ', '2025-07-11', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(318, 38, NULL, 'Emcee & Program Flow', '2025-07-11', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(319, 38, NULL, 'Photography & Videography', '2025-07-11', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(320, 38, NULL, 'Remaining Buffer ', '2025-07-11', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(321, 39, NULL, 'Inclusions', '2025-07-12', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(322, 39, NULL, 'Full Wedding Coordination', '2025-07-12', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(323, 39, NULL, 'Attire ', '2025-07-12', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(324, 39, NULL, 'Hair and Makeup', '2025-07-12', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(325, 39, NULL, 'Wedding Cake', '2025-07-12', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(326, 39, NULL, 'Transport & Floral Decor ', '2025-07-12', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(327, 39, NULL, 'Emcee & Program Flow', '2025-07-12', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(328, 39, NULL, 'Photography & Videography', '2025-07-12', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(329, 39, NULL, 'Remaining Buffer ', '2025-07-12', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(330, 40, NULL, 'Inclusions', '2025-07-13', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(331, 40, NULL, 'Full Wedding Coordination', '2025-07-13', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(332, 40, NULL, 'Attire ', '2025-07-13', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(333, 40, NULL, 'Hair and Makeup', '2025-07-13', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(334, 40, NULL, 'Wedding Cake', '2025-07-13', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(335, 40, NULL, 'Transport & Floral Decor ', '2025-07-13', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(336, 40, NULL, 'Emcee & Program Flow', '2025-07-13', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(337, 40, NULL, 'Photography & Videography', '2025-07-13', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(338, 40, NULL, 'Remaining Buffer ', '2025-07-13', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(339, 41, NULL, 'Inclusions', '2025-07-31', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(340, 41, NULL, 'Full Wedding Coordination', '2025-07-31', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(341, 41, NULL, 'Attire ', '2025-07-31', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(342, 41, NULL, 'Hair and Makeup', '2025-07-31', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(343, 41, NULL, 'Wedding Cake', '2025-07-31', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(344, 41, NULL, 'Transport & Floral Decor ', '2025-07-31', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(345, 41, NULL, 'Emcee & Program Flow', '2025-07-31', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(346, 41, NULL, 'Photography & Videography', '2025-07-31', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(347, 41, NULL, 'Remaining Buffer ', '2025-07-31', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(348, 42, NULL, 'Inclusions', '2025-07-23', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(349, 42, NULL, 'Full Wedding Coordination', '2025-07-23', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(350, 42, NULL, 'Attire ', '2025-07-23', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(351, 42, NULL, 'Hair and Makeup', '2025-07-23', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(352, 42, NULL, 'Wedding Cake', '2025-07-23', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(353, 42, NULL, 'Transport & Floral Decor ', '2025-07-23', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(354, 42, NULL, 'Emcee & Program Flow', '2025-07-23', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(355, 42, NULL, 'Photography & Videography', '2025-07-23', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(356, 42, NULL, 'Remaining Buffer ', '2025-07-23', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(357, 43, NULL, 'Inclusions', '2025-07-11', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(358, 43, NULL, 'Full Wedding Coordination', '2025-07-11', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(359, 43, NULL, 'Attire ', '2025-07-11', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(360, 43, NULL, 'Hair and Makeup', '2025-07-11', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(361, 43, NULL, 'Wedding Cake', '2025-07-11', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(362, 43, NULL, 'Transport & Floral Decor ', '2025-07-11', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(363, 43, NULL, 'Emcee & Program Flow', '2025-07-11', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(364, 43, NULL, 'Photography & Videography', '2025-07-11', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(365, 43, NULL, 'Remaining Buffer ', '2025-07-11', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(366, 44, NULL, 'Inclusions', '2025-07-18', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(367, 44, NULL, 'Full Wedding Coordination', '2025-07-18', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(368, 44, NULL, 'Attire ', '2025-07-18', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(369, 44, NULL, 'Hair and Makeup', '2025-07-18', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(370, 44, NULL, 'Wedding Cake', '2025-07-18', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(371, 44, NULL, 'Transport & Floral Decor ', '2025-07-18', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(372, 44, NULL, 'Emcee & Program Flow', '2025-07-18', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(373, 44, NULL, 'Photography & Videography', '2025-07-18', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(374, 44, NULL, 'Remaining Buffer ', '2025-07-18', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(375, 45, NULL, 'Inclusions', '2025-07-03', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(376, 45, NULL, 'Full Wedding Coordination', '2025-07-03', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(377, 45, NULL, 'Attire ', '2025-07-03', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(378, 45, NULL, 'Hair and Makeup', '2025-07-03', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(379, 45, NULL, 'Wedding Cake', '2025-07-03', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(380, 45, NULL, 'Transport & Floral Decor ', '2025-07-03', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(381, 45, NULL, 'Emcee & Program Flow', '2025-07-03', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(382, 45, NULL, 'Photography & Videography', '2025-07-03', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(383, 45, NULL, 'Remaining Buffer ', '2025-07-03', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(384, 46, NULL, 'Anniversary Tokens', '2025-07-08', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(385, 46, NULL, 'Event Coordinator & Staff', '2025-07-08', '02:00:00', '03:00:00', '', '', NULL, 'pending', 1),
(386, 46, NULL, 'Venue Rental', '2025-07-08', '08:00:00', '09:00:00', '', '', NULL, 'pending', 2),
(387, 46, NULL, 'Catering Service', '2025-07-08', '10:00:00', '11:00:00', '', '', NULL, 'pending', 3),
(388, 46, NULL, 'Event Styling & Floral Design', '2025-07-08', '12:00:00', '13:00:00', '', '', NULL, 'pending', 4),
(389, 46, NULL, 'Photo & Video Coverage', '2025-07-08', '14:00:00', '15:00:00', '', '', NULL, 'pending', 5),
(390, 46, NULL, 'Host / Emcee', '2025-07-08', '16:00:00', '17:00:00', '', '', NULL, 'pending', 6),
(391, 46, NULL, 'Acoustic Live Band', '2025-07-08', '18:00:00', '19:00:00', '', '', NULL, 'pending', 7),
(392, 46, NULL, 'Led Wall', '2025-07-08', '20:00:00', '21:00:00', '', '', NULL, 'pending', 8),
(393, 46, NULL, 'Customized Cake', '2025-07-08', '22:00:00', '23:00:00', '', '', NULL, 'pending', 9),
(394, 47, NULL, 'Venue Rental', '2025-07-09', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(395, 47, NULL, 'Catering', '2025-07-09', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(396, 47, NULL, 'Lights & Sounds', '2025-07-09', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(397, 47, NULL, 'Host & Live Performer', '2025-07-09', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(398, 47, NULL, 'Event Styling & Decorations', '2025-07-09', '16:00:00', '17:00:00', '', '', NULL, 'pending', 4),
(399, 47, NULL, 'Photographer & Videographer', '2025-07-09', '18:00:00', '19:00:00', '', '', NULL, 'pending', 5),
(400, 47, NULL, 'Invitation Design & Printing', '2025-07-09', '20:00:00', '21:00:00', '', '', NULL, 'pending', 6),
(401, 47, NULL, 'Cake & Wine Set', '2025-07-09', '22:00:00', '23:00:00', '', '', NULL, 'pending', 7),
(402, 48, NULL, 'Inclusions', '2025-08-01', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(403, 48, NULL, 'Venue Rental', '2025-08-01', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(404, 48, NULL, 'Catering', '2025-08-01', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(405, 48, NULL, 'Lights & Sounds', '2025-08-01', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(406, 48, NULL, 'Host & Live Performer', '2025-08-01', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(407, 48, NULL, 'Event Styling & Decorations', '2025-08-01', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(408, 48, NULL, 'Photographer & Videographer', '2025-08-01', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(409, 48, NULL, 'Invitation Design & Printing', '2025-08-01', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(410, 48, NULL, 'Cake & Wine Set', '2025-08-01', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(411, 57, NULL, 'Inclusions', '2025-07-19', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(412, 57, NULL, 'Full Wedding Coordination', '2025-07-19', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(413, 57, NULL, 'Attire ', '2025-07-19', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(414, 57, NULL, 'Hair and Makeup', '2025-07-19', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(415, 57, NULL, 'Wedding Cake', '2025-07-19', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(416, 57, NULL, 'Transport & Floral Decor ', '2025-07-19', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(417, 57, NULL, 'Emcee & Program Flow', '2025-07-19', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(418, 57, NULL, 'Photography & Videography', '2025-07-19', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(419, 57, NULL, 'Remaining Buffer ', '2025-07-19', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(420, 58, NULL, 'sample_inclusion', '2025-07-14', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(421, 58, NULL, 'sample_inclusion 2', '2025-07-14', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 0, NULL, 'Inclusions', '2025-07-25', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 0, NULL, 'Inclusions', '2025-07-25', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 0, NULL, 'sample_inclusion', '2025-07-25', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 0, NULL, 'sample_inclusion 2', '2025-07-25', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 0, NULL, 'Demiren Hotel', '2025-07-26', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 0, NULL, 'sample_inclusion', '2025-07-26', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 0, NULL, 'sample_inclusion 2', '2025-07-26', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 0, NULL, 'Test', '2025-07-26', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 0, NULL, 'Blooming Gardens Florals', '2025-07-26', '16:00:00', '17:00:00', '', '', NULL, 'pending', 4),
(0, 0, NULL, 'Perfect Shots Photography', '2025-07-26', '18:00:00', '19:00:00', '', '', NULL, 'pending', 5),
(0, 2, NULL, 'Remaining Buffer ', '2025-07-24', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(0, 2, NULL, 'Inclusions', '2025-07-24', '02:00:00', '03:00:00', '', '', NULL, 'pending', 1),
(0, 2, NULL, 'Perfect Shots Photography', '2025-07-24', '04:00:00', '05:00:00', '', '', NULL, 'pending', 2),
(0, 2, NULL, 'Elegant Catering Services', '2025-07-24', '06:00:00', '07:00:00', '', '', NULL, 'pending', 3),
(0, 2, NULL, 'Pearlmont Hotel - Package 2', '2025-07-24', '08:00:00', '09:00:00', '', '', NULL, 'pending', 4),
(0, 2, NULL, 'Test', '2025-07-24', '08:00:00', '09:00:00', '', '', NULL, 'pending', 5),
(0, 2, NULL, 'Full Wedding Coordination', '2025-07-24', '10:00:00', '11:00:00', '', '', NULL, 'pending', 6),
(0, 2, NULL, 'Attire ', '2025-07-24', '12:00:00', '13:00:00', '', '', NULL, 'pending', 7),
(0, 2, NULL, 'Hair and Makeup', '2025-07-24', '14:00:00', '15:00:00', '', '', NULL, 'pending', 8),
(0, 2, NULL, 'Wedding Cake', '2025-07-24', '16:00:00', '17:00:00', '', '', NULL, 'pending', 9),
(0, 2, NULL, 'Transport & Floral Decor ', '2025-07-24', '18:00:00', '19:00:00', '', '', NULL, 'pending', 10),
(0, 2, NULL, 'Emcee & Program Flow', '2025-07-24', '20:00:00', '21:00:00', '', '', NULL, 'pending', 11),
(0, 2, NULL, 'Photography & Videography', '2025-07-24', '22:00:00', '23:00:00', '', '', NULL, 'pending', 12),
(0, 1, NULL, 'Remaining Buffer ', '2025-07-18', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(0, 1, NULL, 'Inclusions', '2025-07-18', '02:00:00', '03:00:00', '', '', NULL, 'pending', 1),
(0, 1, NULL, 'Elegant Catering Services', '2025-07-18', '04:00:00', '05:00:00', '', '', NULL, 'pending', 2),
(0, 1, NULL, 'Purple Yam', '2025-07-18', '06:00:00', '07:00:00', '', '', NULL, 'pending', 3),
(0, 1, NULL, 'Pearlmont Hotel', '2025-07-18', '08:00:00', '09:00:00', '', '', NULL, 'pending', 4),
(0, 1, NULL, 'My own photography service', '2025-07-18', '08:00:00', '09:00:00', '', '', NULL, 'pending', 5),
(0, 1, NULL, 'Full Wedding Coordination', '2025-07-18', '10:00:00', '11:00:00', '', '', NULL, 'pending', 6),
(0, 1, NULL, 'Attire ', '2025-07-18', '12:00:00', '13:00:00', '', '', NULL, 'pending', 7),
(0, 1, NULL, 'Hair and Makeup', '2025-07-18', '14:00:00', '15:00:00', '', '', NULL, 'pending', 8),
(0, 1, NULL, 'Wedding Cake', '2025-07-18', '16:00:00', '17:00:00', '', '', NULL, 'pending', 9),
(0, 1, NULL, 'Transport & Floral Decor ', '2025-07-18', '18:00:00', '19:00:00', '', '', NULL, 'pending', 10),
(0, 1, NULL, 'Emcee & Program Flow', '2025-07-18', '20:00:00', '21:00:00', '', '', NULL, 'pending', 11),
(0, 1, NULL, 'Photography & Videography', '2025-07-18', '22:00:00', '23:00:00', '', '', NULL, 'pending', 12),
(0, 2, NULL, 'Demiren Hotel', '2025-07-19', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 2, NULL, 'sample_inclusion', '2025-07-19', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 2, NULL, 'sample_inclusion 2', '2025-07-19', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 2, NULL, 'Elegant Catering Services', '2025-07-19', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 2, NULL, 'Blooming Gardens Florals', '2025-07-19', '16:00:00', '17:00:00', '', '', NULL, 'pending', 4),
(0, 2, NULL, 'EventCorp AV Solutions', '2025-07-19', '18:00:00', '19:00:00', '', '', NULL, 'pending', 5),
(0, 2, NULL, 'Sample rate ', '2025-07-19', '20:00:00', '21:00:00', '', '', NULL, 'pending', 6),
(0, 3, NULL, 'Remaining Buffer ', '2025-07-22', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(0, 3, NULL, 'Inclusions', '2025-07-22', '02:00:00', '03:00:00', '', '', NULL, 'pending', 1),
(0, 3, NULL, 'EventCorp AV Solutions', '2025-07-22', '04:00:00', '05:00:00', '', '', NULL, 'pending', 2),
(0, 3, NULL, 'Blooming Gardens Florals', '2025-07-22', '06:00:00', '07:00:00', '', '', NULL, 'pending', 3),
(0, 3, NULL, 'Pearlmont Hotel - Package 2', '2025-07-22', '08:00:00', '09:00:00', '', '', NULL, 'pending', 4),
(0, 3, NULL, 'Warner Bros.', '2025-07-22', '08:00:00', '09:00:00', '', '', NULL, 'pending', 5),
(0, 3, NULL, 'Full Wedding Coordination', '2025-07-22', '10:00:00', '11:00:00', '', '', NULL, 'pending', 6),
(0, 3, NULL, 'Attire ', '2025-07-22', '12:00:00', '13:00:00', '', '', NULL, 'pending', 7),
(0, 3, NULL, 'Hair and Makeup', '2025-07-22', '14:00:00', '15:00:00', '', '', NULL, 'pending', 8),
(0, 3, NULL, 'Wedding Cake', '2025-07-22', '16:00:00', '17:00:00', '', '', NULL, 'pending', 9),
(0, 3, NULL, 'Transport & Floral Decor ', '2025-07-22', '18:00:00', '19:00:00', '', '', NULL, 'pending', 10),
(0, 3, NULL, 'Emcee & Program Flow', '2025-07-22', '20:00:00', '21:00:00', '', '', NULL, 'pending', 11),
(0, 3, NULL, 'Photography & Videography', '2025-07-22', '22:00:00', '23:00:00', '', '', NULL, 'pending', 12),
(0, 4, NULL, 'Remaining Buffer ', '2025-07-25', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(0, 4, NULL, 'Inclusions', '2025-07-25', '02:00:00', '03:00:00', '', '', NULL, 'pending', 1),
(0, 4, NULL, 'Purple Yam', '2025-07-25', '04:00:00', '05:00:00', '', '', NULL, 'pending', 2),
(0, 4, NULL, 'Blooming Gardens Florals', '2025-07-25', '06:00:00', '07:00:00', '', '', NULL, 'pending', 3),
(0, 4, NULL, 'Pearlmont Hotel - Package 2', '2025-07-25', '08:00:00', '09:00:00', '', '', NULL, 'pending', 4),
(0, 4, NULL, 'External Creatives', '2025-07-25', '08:00:00', '09:00:00', '', '', NULL, 'pending', 5),
(0, 4, NULL, 'Full Wedding Coordination', '2025-07-25', '10:00:00', '11:00:00', '', '', NULL, 'pending', 6),
(0, 4, NULL, 'Attire ', '2025-07-25', '12:00:00', '13:00:00', '', '', NULL, 'pending', 7),
(0, 4, NULL, 'Hair and Makeup', '2025-07-25', '14:00:00', '15:00:00', '', '', NULL, 'pending', 8),
(0, 4, NULL, 'Wedding Cake', '2025-07-25', '16:00:00', '17:00:00', '', '', NULL, 'pending', 9),
(0, 4, NULL, 'Transport & Floral Decor ', '2025-07-25', '18:00:00', '19:00:00', '', '', NULL, 'pending', 10),
(0, 4, NULL, 'Emcee & Program Flow', '2025-07-25', '20:00:00', '21:00:00', '', '', NULL, 'pending', 11),
(0, 4, NULL, 'Photography & Videography', '2025-07-25', '22:00:00', '23:00:00', '', '', NULL, 'pending', 12),
(0, 5, NULL, 'Pearlmont Hotel - Package 2', '2025-07-26', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 5, NULL, 'Inclusions', '2025-07-26', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 5, NULL, 'EventCorp AV Solutions', '2025-07-26', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 5, NULL, 'Perfect Shots Photography', '2025-07-26', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 5, NULL, 'External Creatives', '2025-07-26', '16:00:00', '17:00:00', '', '', NULL, 'pending', 4),
(0, 6, NULL, 'Demiren Hotel', '2025-07-28', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 6, NULL, 'Elegant Catering Services', '2025-07-28', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 6, NULL, 'EventCorp AV Solutions', '2025-07-28', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 6, NULL, 'Perfect Shots Photography', '2025-07-28', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 6, NULL, 'Purple Yam', '2025-07-28', '16:00:00', '17:00:00', '', '', NULL, 'pending', 4),
(0, 6, NULL, 'Blooming Gardens Florals', '2025-07-28', '18:00:00', '19:00:00', '', '', NULL, 'pending', 5),
(0, 6, NULL, 'External Supplier Sample', '2025-07-28', '20:00:00', '21:00:00', '', '', NULL, 'pending', 6),
(0, 7, NULL, 'Pearlmont Hotel', '2025-07-31', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 7, NULL, 'Blooming Gardens Florals', '2025-07-31', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 7, NULL, 'Perfect Shots Photography', '2025-07-31', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 7, NULL, 'Fablus Catering', '2025-07-31', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 7, NULL, 'Purple Yam', '2025-07-31', '16:00:00', '17:00:00', '', '', NULL, 'pending', 4),
(0, 7, NULL, 'EventCorp AV Solutions', '2025-07-31', '18:00:00', '19:00:00', '', '', NULL, 'pending', 5),
(0, 8, NULL, 'Demiren Hotel', '2025-07-30', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 8, NULL, 'Elegant Catering Services', '2025-07-30', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 8, NULL, 'Perfect Shots Photography', '2025-07-30', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 8, NULL, 'Custom Component', '2025-07-30', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 8, NULL, 'Test', '2025-07-30', '16:00:00', '17:00:00', '', '', NULL, 'pending', 4),
(0, 9, NULL, 'Pearlmont Hotel', '2025-08-08', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 9, NULL, 'Elegant Catering Services - Wedding Catering Package - Premium', '2025-08-08', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 9, NULL, 'Blooming Gardens Florals - Reception Centerpieces', '2025-08-08', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 9, NULL, 'Sample rate ', '2025-08-08', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 10, NULL, 'Demiren Hotel', '2025-08-12', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 10, NULL, 'Random', '2025-08-12', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 10, NULL, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', '2025-08-12', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 11, NULL, 'Pearlmont Hotel', '2025-08-28', '08:00:00', '09:00:00', '', '', NULL, '', 0),
(0, 11, NULL, 'Elegant Catering Services - Wedding Catering Package - Premium', '2025-08-28', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 11, NULL, 'Perfect Shots Photography - Event Photography Half Day', '2025-08-28', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 11, NULL, 'Blooming Gardens Florals - Reception Centerpieces', '2025-08-28', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 12, NULL, 'Remaining Buffer ', '2025-08-15', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(0, 12, NULL, 'Inclusions', '2025-08-15', '02:00:00', '03:00:00', '', '', NULL, 'pending', 1),
(0, 12, NULL, 'Elegant Catering Services - Wedding Catering Package - Premium', '2025-08-15', '04:00:00', '05:00:00', '', '', NULL, 'pending', 2),
(0, 12, NULL, 'Sample rate ', '2025-08-15', '06:00:00', '07:00:00', '', '', NULL, 'pending', 3),
(0, 12, NULL, 'Pearlmont Hotel - Package 2', '2025-08-15', '08:00:00', '09:00:00', '', '', NULL, 'pending', 4),
(0, 12, NULL, 'Full Wedding Coordination', '2025-08-15', '10:00:00', '11:00:00', '', '', NULL, 'pending', 5),
(0, 12, NULL, 'Attire ', '2025-08-15', '12:00:00', '13:00:00', '', '', NULL, 'pending', 6),
(0, 12, NULL, 'Hair and Makeup', '2025-08-15', '14:00:00', '15:00:00', '', '', NULL, 'pending', 7),
(0, 12, NULL, 'Wedding Cake', '2025-08-15', '16:00:00', '17:00:00', '', '', NULL, 'pending', 8),
(0, 12, NULL, 'Transport & Floral Decor ', '2025-08-15', '18:00:00', '19:00:00', '', '', NULL, 'pending', 9),
(0, 12, NULL, 'Emcee & Program Flow', '2025-08-15', '20:00:00', '21:00:00', '', '', NULL, 'pending', 10),
(0, 12, NULL, 'Photography & Videography', '2025-08-15', '22:00:00', '23:00:00', '', '', NULL, 'pending', 11),
(0, 13, NULL, 'Food and Beverages', '2025-08-31', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 13, NULL, 'Ultrawinds Mountain Resort', '2025-08-31', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 31, NULL, 'Demiren Hotel', '2025-09-10', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 31, NULL, 'Venue Decoration', '2025-09-10', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 31, NULL, 'Test', '2025-09-10', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 31, NULL, 'Elegant Catering Services - Wedding Catering Package - Premium', '2025-09-10', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 32, NULL, 'Pearlmont Hotel', '2025-09-18', '08:00:00', '09:00:00', '', '', NULL, '', 0),
(0, 32, NULL, 'Venue Decoration', '2025-09-18', '10:00:00', '11:00:00', '', '', NULL, '', 1),
(0, 32, NULL, 'EventCorp AV Solutions - Basic Sound System Package', '2025-09-18', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 32, NULL, 'Cakes and Weddings', '2025-09-18', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 32, NULL, 'Perfect Shots Photography - Wedding Photography Full Day', '2025-09-18', '16:00:00', '17:00:00', '', '', NULL, '', 4),
(0, 33, NULL, 'Demiren Hotel', '2025-09-19', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 33, NULL, 'Venue Decoration', '2025-09-19', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 33, NULL, 'Elegant Catering Services - Wedding Catering Package - Premium', '2025-09-19', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 33, NULL, 'Blooming Gardens Florals - Reception Centerpieces', '2025-09-19', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 34, NULL, 'Demiren Hotel', '2025-09-20', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 34, NULL, 'Venue Decoration', '2025-09-20', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 34, NULL, 'Elegant Catering Services - Wedding Catering Package - Premium', '2025-09-20', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 34, NULL, 'Blooming Gardens Florals - Reception Centerpieces', '2025-09-20', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 35, NULL, 'Pearlmont Hotel', '2025-09-21', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 35, NULL, 'Food and Beverages', '2025-09-21', '10:00:00', '11:00:00', '', '', NULL, '', 1),
(0, 35, NULL, 'Elegant Catering Services - Wedding Catering Package - Premium', '2025-09-21', '12:00:00', '13:00:00', '', '', NULL, '', 2),
(0, 35, NULL, 'Blooming Gardens Florals - Reception Centerpieces', '2025-09-21', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 35, NULL, 'Perfect Shots Photography - Wedding Photography Full Day', '2025-09-21', '16:00:00', '17:00:00', '', '', NULL, '', 4),
(0, 35, NULL, 'Test Component', '2025-09-21', '18:00:00', '19:00:00', '', '', NULL, 'pending', 5),
(0, 36, NULL, 'Pearlmont Hotel - Package 2', '2025-08-01', '08:00:00', '09:00:00', '', '', NULL, '', 0),
(0, 36, NULL, 'Inclusions', '2025-08-01', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 36, NULL, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', '2025-08-01', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 36, NULL, 'Sample Test', '2025-08-01', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 37, NULL, 'Pearlmont Hotel - Package 2', '2025-08-08', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 37, NULL, 'Full Wedding Coordination', '2025-08-08', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 37, NULL, 'Attire ', '2025-08-08', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 37, NULL, 'Hair and Makeup', '2025-08-08', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 37, NULL, 'Wedding Cake', '2025-08-08', '16:00:00', '17:00:00', '', '', NULL, 'pending', 4),
(0, 37, NULL, 'Transport & Floral Decor ', '2025-08-08', '18:00:00', '19:00:00', '', '', NULL, 'pending', 5),
(0, 37, NULL, 'Emcee & Program Flow', '2025-08-08', '20:00:00', '21:00:00', '', '', NULL, 'pending', 6),
(0, 37, NULL, 'Photography & Videography', '2025-08-08', '22:00:00', '23:00:00', '', '', NULL, 'pending', 7),
(0, 37, NULL, 'Remaining Buffer ', '2025-08-08', '00:00:00', '01:00:00', '', '', NULL, 'pending', 8),
(0, 37, NULL, 'Inclusions', '2025-08-08', '02:00:00', '03:00:00', '', '', NULL, 'pending', 9),
(0, 37, NULL, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', '2025-08-08', '04:00:00', '05:00:00', '', '', NULL, 'pending', 10),
(0, 48, NULL, 'Demiren Hotel', '2025-09-30', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 48, NULL, 'Venue Decoration', '2025-09-30', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 48, NULL, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', '2025-09-30', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 48, NULL, 'Test', '2025-09-30', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 49, NULL, 'Pearlmont Hotel - Package 2', '2025-10-01', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 49, NULL, 'Venue Rental', '2025-10-01', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 49, NULL, 'Catering', '2025-10-01', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 49, NULL, 'Lights & Sounds', '2025-10-01', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 49, NULL, 'Host & Live Performer', '2025-10-01', '16:00:00', '17:00:00', '', '', NULL, 'pending', 4),
(0, 49, NULL, 'Event Styling & Decorations', '2025-10-01', '18:00:00', '19:00:00', '', '', NULL, 'pending', 5),
(0, 49, NULL, 'Photographer & Videographer', '2025-10-01', '20:00:00', '21:00:00', '', '', NULL, 'pending', 6),
(0, 49, NULL, 'Invitation Design & Printing', '2025-10-01', '22:00:00', '23:00:00', '', '', NULL, 'pending', 7),
(0, 49, NULL, 'Cake & Wine Set', '2025-10-01', '00:00:00', '01:00:00', '', '', NULL, '', 8),
(0, 49, NULL, 'Blooming Gardens Florals - Reception Centerpieces', '2025-10-01', '02:00:00', '03:00:00', '', '', NULL, 'pending', 9),
(0, 49, NULL, 'Test Components', '2025-10-01', '04:00:00', '05:00:00', '', '', NULL, '', 10),
(0, 50, NULL, 'Demiren Hotel', '2025-10-18', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 50, NULL, 'sample_inclusion', '2025-10-18', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 50, NULL, 'sample_inclusion 2', '2025-10-18', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 50, NULL, 'Elegant Catering Services - Wedding Catering Package - Premium', '2025-10-18', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 50, NULL, 'Test', '2025-10-18', '16:00:00', '17:00:00', '', '', NULL, 'pending', 4),
(0, 59, NULL, 'Venue Decoration', '2025-08-23', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 59, NULL, 'Pearlmont Hotel - Package 2', '2025-08-23', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 60, NULL, 'Full Wedding Coordination', '2025-10-29', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 60, NULL, 'Attire ', '2025-10-29', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 60, NULL, 'Hair and Makeup', '2025-10-29', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 60, NULL, 'Wedding Cake', '2025-10-29', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 60, NULL, 'Transport & Floral Decor ', '2025-10-29', '16:00:00', '17:00:00', '', '', NULL, 'pending', 4),
(0, 60, NULL, 'Emcee & Program Flow', '2025-10-29', '18:00:00', '19:00:00', '', '', NULL, 'pending', 5),
(0, 60, NULL, 'Photography & Videography', '2025-10-29', '20:00:00', '21:00:00', '', '', NULL, 'pending', 6),
(0, 60, NULL, 'Remaining Buffer ', '2025-10-29', '22:00:00', '23:00:00', '', '', NULL, 'pending', 7),
(0, 60, NULL, 'Inclusions', '2025-10-29', '00:00:00', '01:00:00', '', '', NULL, 'pending', 8),
(0, 60, NULL, 'Pearlmont Hotel', '2025-10-29', '02:00:00', '03:00:00', '', '', NULL, 'pending', 9),
(0, 61, NULL, 'sample_inclusion', '2025-10-30', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 61, NULL, 'sample_inclusion 2', '2025-10-30', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 61, NULL, 'Demiren Hotel', '2025-10-30', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 62, NULL, 'Venue Decoration', '2025-10-20', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 62, NULL, 'Demiren Hotel', '2025-10-20', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 63, NULL, 'Pearlmont Hotel - Package 2', '2025-11-01', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 63, NULL, 'Venue Rental', '2025-11-01', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 63, NULL, 'Catering', '2025-11-01', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 63, NULL, 'Lights & Sounds', '2025-11-01', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 63, NULL, 'Host & Live Performer', '2025-11-01', '16:00:00', '17:00:00', '', '', NULL, 'pending', 4),
(0, 63, NULL, 'Event Styling & Decorations', '2025-11-01', '18:00:00', '19:00:00', '', '', NULL, 'pending', 5),
(0, 63, NULL, 'Photographer & Videographer', '2025-11-01', '20:00:00', '21:00:00', '', '', NULL, 'pending', 6),
(0, 63, NULL, 'Invitation Design & Printing', '2025-11-01', '22:00:00', '23:00:00', '', '', NULL, 'pending', 7),
(0, 63, NULL, 'Cake & Wine Set', '2025-11-01', '00:00:00', '01:00:00', '', '', NULL, 'pending', 8),
(0, 63, NULL, 'Elegant Catering Services - Wedding Catering Package - Premium', '2025-11-01', '02:00:00', '03:00:00', '', '', NULL, 'pending', 9),
(0, 64, NULL, 'Pearlmont Hotel', '2025-11-05', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 64, NULL, 'Food', '2025-11-05', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 64, NULL, 'External Food', '2025-11-05', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 65, NULL, 'Pearlmont Hotel - Package 2', '2025-11-20', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 65, NULL, 'Full Wedding Coordination', '2025-11-20', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 65, NULL, 'Attire ', '2025-11-20', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 65, NULL, 'Hair and Makeup', '2025-11-20', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 65, NULL, 'Wedding Cake', '2025-11-20', '16:00:00', '17:00:00', '', '', NULL, 'pending', 4),
(0, 65, NULL, 'Transport & Floral Decor ', '2025-11-20', '18:00:00', '19:00:00', '', '', NULL, 'pending', 5),
(0, 65, NULL, 'Emcee & Program Flow', '2025-11-20', '20:00:00', '21:00:00', '', '', NULL, 'pending', 6),
(0, 65, NULL, 'Photography & Videography', '2025-11-20', '22:00:00', '23:00:00', '', '', NULL, 'pending', 7),
(0, 65, NULL, 'Remaining Buffer ', '2025-11-20', '00:00:00', '01:00:00', '', '', NULL, 'pending', 8),
(0, 65, NULL, 'Inclusions', '2025-11-20', '02:00:00', '03:00:00', '', '', NULL, 'pending', 9),
(0, 65, NULL, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', '2025-11-20', '04:00:00', '05:00:00', '', '', NULL, 'pending', 10),
(0, 66, NULL, 'Venue Decoration', '2025-12-01', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 66, NULL, 'Demiren Hotel', '2025-12-01', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 67, NULL, 'Pearlmont Hotel - Package 2', '2025-10-25', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 67, NULL, 'Venue Rental', '2025-10-25', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 67, NULL, 'Catering', '2025-10-25', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 67, NULL, 'Lights & Sounds', '2025-10-25', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 67, NULL, 'Host & Live Performer', '2025-10-25', '16:00:00', '17:00:00', '', '', NULL, 'pending', 4),
(0, 67, NULL, 'Event Styling & Decorations', '2025-10-25', '18:00:00', '19:00:00', '', '', NULL, 'pending', 5),
(0, 67, NULL, 'Photographer & Videographer', '2025-10-25', '20:00:00', '21:00:00', '', '', NULL, 'pending', 6),
(0, 67, NULL, 'Invitation Design & Printing', '2025-10-25', '22:00:00', '23:00:00', '', '', NULL, 'pending', 7),
(0, 67, NULL, 'Cake & Wine Set', '2025-10-25', '00:00:00', '01:00:00', '', '', NULL, 'pending', 8),
(0, 67, NULL, 'Test', '2025-10-25', '02:00:00', '03:00:00', '', '', NULL, 'pending', 9),
(0, 67, NULL, 'Elegant Catering Services - Wedding Catering Package - Premium', '2025-10-25', '04:00:00', '05:00:00', '', '', NULL, 'pending', 10),
(0, 68, NULL, 'Venue Rental', '2025-11-30', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(0, 68, NULL, 'Catering', '2025-11-30', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(0, 68, NULL, 'Lights & Sounds', '2025-11-30', '12:00:00', '13:00:00', '', '', NULL, 'pending', 2),
(0, 68, NULL, 'Host & Live Performer', '2025-11-30', '14:00:00', '15:00:00', '', '', NULL, 'pending', 3),
(0, 68, NULL, 'Event Styling & Decorations', '2025-11-30', '16:00:00', '17:00:00', '', '', NULL, 'pending', 4),
(0, 68, NULL, 'Photographer & Videographer', '2025-11-30', '18:00:00', '19:00:00', '', '', NULL, 'pending', 5),
(0, 68, NULL, 'Invitation Design & Printing', '2025-11-30', '20:00:00', '21:00:00', '', '', NULL, 'pending', 6),
(0, 68, NULL, 'Cake & Wine Set', '2025-11-30', '22:00:00', '23:00:00', '', '', NULL, 'pending', 7),
(0, 68, NULL, 'Pearlmont Hotel - Package 2', '2025-11-30', '00:00:00', '01:00:00', '', '', NULL, 'pending', 8),
(0, 69, NULL, 'Demiren Hotel', '2025-11-29', '00:00:00', '23:59:59', '', '', NULL, 'pending', 0),
(0, 69, NULL, 'Venue Decoration', '2025-11-29', '00:00:00', '23:59:59', '', '', NULL, 'pending', 1),
(0, 70, NULL, 'Demiren Hotel', '2025-09-25', '00:00:00', '23:59:59', '', '', NULL, 'pending', 0),
(0, 70, NULL, 'Test', '2025-09-25', '00:00:00', '23:59:59', '', '', NULL, 'pending', 1),
(0, 70, NULL, 'Anima - Electronic Mascots', '2025-09-25', '00:00:00', '23:59:59', '', '', NULL, 'pending', 2);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_event_type`
--

CREATE TABLE `tbl_event_type` (
  `event_type_id` int(11) NOT NULL,
  `event_name` varchar(100) NOT NULL,
  `event_description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_event_type`
--

INSERT INTO `tbl_event_type` (`event_type_id`, `event_name`, `event_description`) VALUES
(1, 'Wedding', 'A wedding event with full venue and catering options.'),
(2, 'Anniversary', 'Celebration of marriage or other yearly milestones.'),
(3, 'Birthday', 'Annual celebration of a person’s birth or special birthday occasion.'),
(4, 'Corporate Event', 'Business meetings, seminars, or corporate gatherings.'),
(5, 'Others', 'Any other type of special event.'),
(10, 'Baptism', 'Religious ceremony symbolizing purification and admission to the church'),
(11, 'Baby Shower', 'Celebration held before a baby is born to give gifts and support to the parents'),
(12, 'Reunion', 'Gathering of family members, classmates, or other groups after a long time'),
(13, 'Festival', 'Public celebration of culture, religion, or season'),
(14, 'Engagement Party', 'Celebration of a couple’s engagement before marriage'),
(15, 'Christmas Party', 'Seasonal celebration held during the Christmas holidays'),
(16, 'New Year’s Party', 'Celebration marking the beginning of the new year');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_feedback`
--

CREATE TABLE `tbl_feedback` (
  `feedback_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `store_id` int(11) DEFAULT NULL,
  `venue_id` int(11) DEFAULT NULL,
  `feedback_rating` tinyint(4) NOT NULL CHECK (`feedback_rating` between 1 and 5),
  `feedback_text` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_notifications`
--

CREATE TABLE `tbl_notifications` (
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `event_id` int(11) DEFAULT NULL,
  `venue_id` int(11) DEFAULT NULL,
  `store_id` int(11) DEFAULT NULL,
  `budget_id` int(11) DEFAULT NULL,
  `booking_id` int(11) DEFAULT NULL,
  `feedback_id` int(11) DEFAULT NULL,
  `notification_message` text NOT NULL,
  `notification_type` enum('booking_created','booking_confirmed','booking_rejected','booking_cancelled','booking_completed','event_created','event_updated','event_confirmed','event_cancelled','event_completed','payment_created','payment_confirmed','payment_rejected','payment_due','payment_overdue','system','general') NOT NULL DEFAULT 'general',
  `notification_title` varchar(255) NOT NULL DEFAULT '',
  `notification_priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `notification_icon` varchar(50) DEFAULT NULL,
  `notification_url` varchar(500) DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `notification_status` enum('unread','read') NOT NULL DEFAULT 'unread',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_notifications`
--

INSERT INTO `tbl_notifications` (`notification_id`, `user_id`, `event_id`, `venue_id`, `store_id`, `budget_id`, `booking_id`, `feedback_id`, `notification_message`, `notification_type`, `notification_title`, `notification_priority`, `notification_icon`, `notification_url`, `expires_at`, `read_at`, `notification_status`, `created_at`) VALUES
(9, 15, NULL, NULL, NULL, NULL, 7, NULL, 'Your booking BK-20250625-1100 for \'ad\' has been accepted! You can now proceed with event planning.', 'general', '', 'medium', NULL, NULL, NULL, NULL, 'unread', '2025-06-25 06:05:07'),
(11, 15, NULL, NULL, NULL, NULL, 8, NULL, 'Your booking BK-20250625-4040 has been accepted! You can now proceed with event planning.', 'general', '', 'medium', NULL, NULL, NULL, NULL, 'unread', '2025-06-25 08:50:18'),
(13, 15, NULL, NULL, NULL, NULL, 9, NULL, 'Your booking BK-20250626-5133 has been accepted! You can now proceed with event planning.', 'general', '', 'medium', NULL, NULL, NULL, NULL, 'unread', '2025-06-26 10:37:05'),
(30, 15, 57, 29, NULL, NULL, NULL, NULL, 'Your event \"Test\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/57', '2025-07-13 17:42:14', NULL, 'unread', '2025-07-10 17:42:14'),
(31, 15, 57, 29, NULL, NULL, NULL, NULL, 'Your event \"Test\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/57', '2025-07-13 17:42:14', NULL, 'unread', '2025-07-10 17:42:14'),
(32, 15, 57, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱125,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/21', '2025-07-12 17:42:14', NULL, 'unread', '2025-07-10 17:42:14'),
(34, 15, 57, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱125,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/21', '2025-07-12 17:42:14', NULL, 'unread', '2025-07-10 17:42:14'),
(0, 21, NULL, 30, NULL, NULL, 0, NULL, 'Your booking BK-20250715-3121 has been cancelled.', 'booking_cancelled', 'Booking Cancelled', 'high', 'x-circle', '/client/bookings/0', '2025-07-23 05:32:51', NULL, 'unread', '2025-07-16 05:32:51'),
(0, 21, NULL, 34, NULL, NULL, 0, NULL, 'Your booking BK-20250715-7783 has been cancelled.', 'booking_cancelled', 'Booking Cancelled', 'high', 'x-circle', '/client/bookings/0', '2025-07-23 05:32:51', NULL, 'unread', '2025-07-16 05:32:51'),
(0, 21, NULL, NULL, NULL, NULL, 0, NULL, 'Your booking BK-20250715-3121 has been cancelled.', 'general', '', 'medium', NULL, NULL, NULL, NULL, 'unread', '2025-07-16 05:32:51'),
(0, 21, 0, 34, NULL, NULL, NULL, NULL, 'Your event \"Montreal Wedding\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/0', '2025-07-19 15:46:39', NULL, 'unread', '2025-07-16 15:46:39'),
(0, 21, 0, 34, NULL, NULL, NULL, NULL, 'Your event \"Montreal Wedding\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/0', '2025-07-19 15:46:39', NULL, 'unread', '2025-07-16 15:46:39'),
(0, 21, 0, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱84,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/0', '2025-07-18 15:46:39', NULL, 'unread', '2025-07-16 15:46:39'),
(0, 21, 0, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱84,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/0', '2025-07-18 15:46:39', NULL, 'unread', '2025-07-16 15:46:39'),
(0, 21, 2, 30, NULL, NULL, NULL, NULL, 'Your event \"AAA Type of wedding v5\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/2', '2025-07-19 16:02:04', NULL, 'unread', '2025-07-16 16:02:04'),
(0, 21, 2, 30, NULL, NULL, NULL, NULL, 'Your event \"AAA Type of wedding v5\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/2', '2025-07-19 16:02:04', NULL, 'unread', '2025-07-16 16:02:04'),
(0, 21, 2, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱145,600.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/0', '2025-07-18 16:02:04', NULL, 'unread', '2025-07-16 16:02:04'),
(0, 21, 2, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱145,600.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/0', '2025-07-18 16:02:04', NULL, 'unread', '2025-07-16 16:02:04'),
(0, 23, 2, 34, NULL, NULL, NULL, NULL, 'Your event \"AAA Type of wedding new\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/2', '2025-07-19 18:19:46', NULL, 'unread', '2025-07-16 18:19:46'),
(0, 23, 2, 34, NULL, NULL, NULL, NULL, 'Your event \"AAA Type of wedding new\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/2', '2025-07-19 18:19:46', NULL, 'unread', '2025-07-16 18:19:46'),
(0, 23, 2, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱282,150.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/24', '2025-07-18 18:19:46', NULL, 'unread', '2025-07-16 18:19:46'),
(0, 23, 2, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱282,150.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/24', '2025-07-18 18:19:46', NULL, 'unread', '2025-07-16 18:19:46'),
(0, 21, NULL, 30, NULL, NULL, 0, NULL, 'Your booking BK-20250715-3121 has been confirmed! You can now proceed with event planning.', 'booking_confirmed', 'Booking Confirmed', 'high', 'check-circle', '/client/bookings/0', '2025-07-23 18:33:08', NULL, 'unread', '2025-07-16 18:33:08'),
(0, 21, NULL, 34, NULL, NULL, 0, NULL, 'Your booking BK-20250715-7783 has been confirmed! You can now proceed with event planning.', 'booking_confirmed', 'Booking Confirmed', 'high', 'check-circle', '/client/bookings/0', '2025-07-23 18:33:08', NULL, 'unread', '2025-07-16 18:33:08'),
(0, 21, NULL, NULL, NULL, NULL, 0, NULL, 'Your booking BK-20250715-3121 has been accepted! You can now proceed with event planning.', 'general', '', 'medium', NULL, NULL, NULL, NULL, 'unread', '2025-07-16 18:33:08'),
(0, 23, NULL, 30, NULL, NULL, 2, NULL, 'Your booking BK-20250717-5172 has been confirmed! You can now proceed with event planning.', 'booking_confirmed', 'Booking Confirmed', 'high', 'check-circle', '/client/bookings/2', '2025-07-24 02:59:31', NULL, 'unread', '2025-07-17 02:59:31'),
(0, 23, NULL, NULL, NULL, NULL, 2, NULL, 'Your booking BK-20250717-5172 has been accepted! You can now proceed with event planning.', 'general', '', 'medium', NULL, NULL, NULL, NULL, 'unread', '2025-07-17 02:59:31'),
(0, 23, 3, 30, NULL, NULL, NULL, NULL, 'Your event \"Wedding Package \" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/3', '2025-07-20 03:40:05', NULL, 'unread', '2025-07-17 03:40:05'),
(0, 23, 3, 30, NULL, NULL, NULL, NULL, 'Your event \"Wedding Package \" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/3', '2025-07-20 03:40:05', NULL, 'unread', '2025-07-17 03:40:05'),
(0, 23, 3, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱153,850.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/25', '2025-07-19 03:40:05', NULL, 'unread', '2025-07-17 03:40:05'),
(0, 23, 3, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱153,850.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/25', '2025-07-19 03:40:05', NULL, 'unread', '2025-07-17 03:40:05'),
(0, 23, NULL, 30, NULL, NULL, 2, NULL, 'Your booking BK-20250717-5172 status has been updated to converted.', 'general', 'Booking Status Updated', 'high', 'info', '/client/bookings/2', '2025-07-24 03:40:05', NULL, 'unread', '2025-07-17 03:40:05'),
(0, 21, NULL, 30, NULL, NULL, 3, NULL, 'Your booking BK-20250717-4233 has been confirmed! You can now proceed with event planning.', 'booking_confirmed', 'Booking Confirmed', 'high', 'check-circle', '/client/bookings/3', '2025-07-24 05:39:25', NULL, 'unread', '2025-07-17 05:39:25'),
(0, 21, NULL, NULL, NULL, NULL, 3, NULL, 'Your booking BK-20250717-4233 has been accepted! You can now proceed with event planning.', 'general', '', 'medium', NULL, NULL, NULL, NULL, 'unread', '2025-07-17 05:39:25'),
(0, 21, 4, 30, NULL, NULL, NULL, NULL, 'Your event \"Gamon Wedding\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/4', '2025-07-20 05:46:14', NULL, 'unread', '2025-07-17 05:46:14'),
(0, 21, 4, 30, NULL, NULL, NULL, NULL, 'Your event \"Gamon Wedding\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/4', '2025-07-20 05:46:14', NULL, 'unread', '2025-07-17 05:46:14'),
(0, 21, 4, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱94,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/26', '2025-07-19 05:46:14', NULL, 'unread', '2025-07-17 05:46:14'),
(0, 21, 4, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱94,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/26', '2025-07-19 05:46:14', NULL, 'unread', '2025-07-17 05:46:14'),
(0, 29, NULL, 30, NULL, NULL, 4, NULL, 'Your booking BK-20250717-9308 has been confirmed! You can now proceed with event planning.', 'booking_confirmed', 'Booking Confirmed', 'high', 'check-circle', '/client/bookings/4', '2025-07-24 06:00:44', '2025-09-09 21:58:34', 'read', '2025-07-17 06:00:44'),
(0, 29, NULL, NULL, NULL, NULL, 4, NULL, 'Your booking BK-20250717-9308 has been accepted! You can now proceed with event planning.', 'general', '', 'medium', NULL, NULL, NULL, '2025-09-09 21:58:34', 'read', '2025-07-17 06:00:44'),
(0, 29, 5, 30, NULL, NULL, NULL, NULL, 'Your event \"Weeding Package 2\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/5', '2025-07-20 06:10:22', '2025-09-09 21:58:34', 'read', '2025-07-17 06:10:22'),
(0, 29, 5, 30, NULL, NULL, NULL, NULL, 'Your event \"Weeding Package 2\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/5', '2025-07-20 06:10:22', '2025-09-09 21:58:34', 'read', '2025-07-17 06:10:22'),
(0, 29, 5, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱45,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/27', '2025-07-19 06:10:22', '2025-09-09 21:58:34', 'read', '2025-07-17 06:10:22'),
(0, 29, 5, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱45,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/27', '2025-07-19 06:10:22', '2025-09-09 21:58:34', 'read', '2025-07-17 06:10:22'),
(0, 29, 6, 34, NULL, NULL, NULL, NULL, 'Your event \"Weeding Package 2\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/6', '2025-07-20 15:16:52', '2025-09-09 21:58:34', 'read', '2025-07-17 15:16:52'),
(0, 29, 6, 34, NULL, NULL, NULL, NULL, 'Your event \"Weeding Package 2\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/6', '2025-07-20 15:16:52', '2025-09-09 21:58:34', 'read', '2025-07-17 15:16:52'),
(0, 29, 6, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱123,250.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/28', '2025-07-19 15:16:52', '2025-09-09 21:58:34', 'read', '2025-07-17 15:16:52'),
(0, 29, 6, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱123,250.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/28', '2025-07-19 15:16:52', '2025-09-09 21:58:34', 'read', '2025-07-17 15:16:52'),
(0, 23, 7, 29, NULL, NULL, NULL, NULL, 'Your event \"Customized Event 2\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/7', '2025-07-20 15:53:10', NULL, 'unread', '2025-07-17 15:53:10'),
(0, 23, 7, 29, NULL, NULL, NULL, NULL, 'Your event \"Customized Event 2\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/7', '2025-07-20 15:53:10', NULL, 'unread', '2025-07-17 15:53:10'),
(0, 23, 7, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱130,900.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/29', '2025-07-19 15:53:10', NULL, 'unread', '2025-07-17 15:53:10'),
(0, 23, 7, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱130,900.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/29', '2025-07-19 15:53:10', NULL, 'unread', '2025-07-17 15:53:10'),
(0, 29, 9, 29, NULL, NULL, NULL, NULL, 'Your event \"Birthday Event\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/9', '2025-07-20 16:54:53', '2025-09-09 21:58:34', 'read', '2025-07-17 16:54:53'),
(0, 29, 9, 29, NULL, NULL, NULL, NULL, 'Your event \"Birthday Event\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/9', '2025-07-20 16:54:53', '2025-09-09 21:58:34', 'read', '2025-07-17 16:54:53'),
(0, 29, 9, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱613,600.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/31', '2025-07-19 16:54:53', '2025-09-09 21:58:34', 'read', '2025-07-17 16:54:53'),
(0, 29, 9, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱613,600.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/31', '2025-07-19 16:54:53', '2025-09-09 21:58:34', 'read', '2025-07-17 16:54:53'),
(0, 29, 10, 34, NULL, NULL, NULL, NULL, 'Your event \"Customized Event 8\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/10', '2025-07-21 06:56:14', '2025-09-09 21:58:34', 'read', '2025-07-18 06:56:14'),
(0, 29, 10, 34, NULL, NULL, NULL, NULL, 'Your event \"Customized Event 8\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/10', '2025-07-21 06:56:14', '2025-09-09 21:58:34', 'read', '2025-07-18 06:56:14'),
(0, 29, 10, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱37,600.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/32', '2025-07-20 06:56:14', '2025-09-09 21:58:34', 'read', '2025-07-18 06:56:14'),
(0, 29, 10, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱37,600.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/32', '2025-07-20 06:56:14', '2025-09-09 21:58:34', 'read', '2025-07-18 06:56:14'),
(0, 21, 11, 29, NULL, NULL, NULL, NULL, 'Your event \"CUSTOMIZED PACKAGE 9\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/11', '2025-07-21 07:44:00', NULL, 'unread', '2025-07-18 07:44:00'),
(0, 21, 11, 29, NULL, NULL, NULL, NULL, 'Your event \"CUSTOMIZED PACKAGE 9\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/11', '2025-07-21 07:44:00', NULL, 'unread', '2025-07-18 07:44:00'),
(0, 21, 11, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱91,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/33', '2025-07-20 07:44:00', NULL, 'unread', '2025-07-18 07:44:00'),
(0, 21, 11, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱91,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/33', '2025-07-20 07:44:00', NULL, 'unread', '2025-07-18 07:44:00'),
(0, 21, 11, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱91,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/34', '2025-07-20 08:24:20', NULL, 'unread', '2025-07-18 08:24:20'),
(0, 21, 11, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱91,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/34', '2025-07-20 08:24:20', NULL, 'unread', '2025-07-18 08:24:20'),
(0, 29, 31, 34, NULL, NULL, NULL, NULL, 'Your event \"Test\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/31', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-07-21 18:38:01'),
(0, 29, 31, 34, NULL, NULL, NULL, NULL, 'Your event \"Test\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/31', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-07-21 18:38:01'),
(0, 29, 31, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱84,084.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/37', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-07-21 18:38:01'),
(0, 29, 31, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱84,084.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/37', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-07-21 18:38:01'),
(0, 29, 32, 29, NULL, NULL, NULL, NULL, 'Your event \"Kimi K2 - Test 2\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/32', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-07-22 01:05:43'),
(0, 29, 32, 29, NULL, NULL, NULL, NULL, 'Your event \"Kimi K2 - Test 2\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/32', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-07-22 01:05:43'),
(0, 29, 32, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱120,750.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/38', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-07-22 01:05:43'),
(0, 29, 32, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱120,750.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/38', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-07-22 01:05:43'),
(0, 23, 33, 34, NULL, NULL, NULL, NULL, 'Your event \"Christine\'s Birthday\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/33', '0000-00-00 00:00:00', NULL, 'unread', '2025-07-22 01:10:54'),
(0, 23, 33, 34, NULL, NULL, NULL, NULL, 'Your event \"Christine\'s Birthday\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/33', '0000-00-00 00:00:00', NULL, 'unread', '2025-07-22 01:10:54'),
(0, 23, 33, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱96,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/39', '0000-00-00 00:00:00', NULL, 'unread', '2025-07-22 01:10:54'),
(0, 23, 33, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱96,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/39', '0000-00-00 00:00:00', NULL, 'unread', '2025-07-22 01:10:54'),
(0, 15, 33, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱149,000.00 for \"your event\" has been cancelled.', 'payment_rejected', 'Payment Cancelled', 'high', 'x-circle', '/client/payments/6', '0000-00-00 00:00:00', NULL, 'unread', '2025-07-22 02:14:16'),
(0, 15, 45, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱212,500.00 for \"your event\" has been cancelled.', 'payment_rejected', 'Payment Cancelled', 'high', 'x-circle', '/client/payments/13', '0000-00-00 00:00:00', NULL, 'unread', '2025-07-22 02:14:16'),
(0, 21, NULL, 30, NULL, NULL, 6, NULL, 'Your booking BK-20250722-3053 has been confirmed! You can now proceed with event planning.', 'booking_confirmed', 'Booking Confirmed', 'high', 'check-circle', '/client/bookings/6', '0000-00-00 00:00:00', NULL, 'unread', '2025-07-22 06:33:13'),
(0, 21, NULL, NULL, NULL, NULL, 6, NULL, 'Your booking BK-20250722-3053 has been accepted! You can now proceed with event planning.', 'general', '', 'medium', NULL, NULL, NULL, NULL, 'unread', '2025-07-22 06:33:13'),
(0, 21, 36, 30, NULL, NULL, NULL, NULL, 'Your event \"Debut\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/36', '0000-00-00 00:00:00', NULL, 'unread', '2025-07-22 06:36:36'),
(0, 21, 36, 30, NULL, NULL, NULL, NULL, 'Your event \"Debut\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/36', '0000-00-00 00:00:00', NULL, 'unread', '2025-07-22 06:36:36'),
(0, 21, 36, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱41,500.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/42', '0000-00-00 00:00:00', NULL, 'unread', '2025-07-22 06:36:36'),
(0, 21, 36, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱41,500.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/42', '0000-00-00 00:00:00', NULL, 'unread', '2025-07-22 06:36:36'),
(0, 21, NULL, 30, NULL, NULL, 7, NULL, 'Your booking BK-20250723-9399 has been confirmed! You can now proceed with event planning.', 'booking_confirmed', 'Booking Confirmed', 'high', 'check-circle', '/client/bookings/7', '0000-00-00 00:00:00', NULL, 'unread', '2025-07-23 07:14:17'),
(0, 21, NULL, NULL, NULL, NULL, 7, NULL, 'Your booking BK-20250723-9399 has been accepted! You can now proceed with event planning.', 'general', '', 'medium', NULL, NULL, NULL, NULL, 'unread', '2025-07-23 07:14:17'),
(0, 21, 37, 30, NULL, NULL, NULL, NULL, 'Your event \"Test\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/37', '0000-00-00 00:00:00', NULL, 'unread', '2025-07-23 07:25:44'),
(0, 21, 37, 30, NULL, NULL, NULL, NULL, 'Your event \"Test\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/37', '0000-00-00 00:00:00', NULL, 'unread', '2025-07-23 07:25:44'),
(0, 21, 37, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱84,500.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/43', '0000-00-00 00:00:00', NULL, 'unread', '2025-07-23 07:25:44'),
(0, 21, 37, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱84,500.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/43', '0000-00-00 00:00:00', NULL, 'unread', '2025-07-23 07:25:44'),
(0, 21, 48, 34, NULL, NULL, NULL, NULL, 'Your event \"Test 50\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/48', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-03 07:53:36'),
(0, 21, 48, 34, NULL, NULL, NULL, NULL, 'Your event \"Test 50\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/48', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-03 07:53:36'),
(0, 21, 48, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱40,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/44', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-03 07:53:36'),
(0, 21, 48, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱40,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/44', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-03 07:53:36'),
(0, 21, 11, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱91,000.00 for \"your event\" has been cancelled.', 'payment_rejected', 'Payment Cancelled', 'high', 'x-circle', '/client/payments/33', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-03 08:06:30'),
(0, 29, 49, 30, NULL, NULL, NULL, NULL, 'Your event \"Event 80 - Fixed Ghost Payments\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/49', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-08-03 08:18:33'),
(0, 29, 49, 30, NULL, NULL, NULL, NULL, 'Your event \"Event 80 - Fixed Ghost Payments\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/49', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-08-03 08:18:33'),
(0, 29, 49, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱202,150.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/45', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-08-03 08:18:33'),
(0, 21, 50, 34, NULL, NULL, NULL, NULL, 'Your event \"Wedding Ko Ya\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/50', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-08 17:16:58'),
(0, 21, 50, 34, NULL, NULL, NULL, NULL, 'Your event \"Wedding Ko Ya\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/50', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-08 17:16:58'),
(0, 21, 50, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱69,500.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/46', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-08 17:16:58'),
(0, 21, 36, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱41,500.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/47', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-09 02:43:41'),
(0, 23, 2, 34, NULL, NULL, NULL, NULL, 'Your event \"AAA Type of wedding new\" has been completed successfully! We hope you had a wonderful time.', 'event_completed', 'Event Completed', 'high', 'check-circle-2', '/client/events/2', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-09 03:15:53'),
(0, 23, 3, 30, NULL, NULL, NULL, NULL, 'Your event \"Wedding Package \" has been completed successfully! We hope you had a wonderful time.', 'event_completed', 'Event Completed', 'high', 'check-circle-2', '/client/events/3', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-09 03:15:53'),
(0, 21, 4, 30, NULL, NULL, NULL, NULL, 'Your event \"Gamon Wedding\" has been completed successfully! We hope you had a wonderful time.', 'event_completed', 'Event Completed', 'high', 'check-circle-2', '/client/events/4', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-09 03:15:53'),
(0, 29, 5, 30, NULL, NULL, NULL, NULL, 'Your event \"Weeding Package 2\" has been completed successfully! We hope you had a wonderful time.', 'event_completed', 'Event Completed', 'high', 'check-circle-2', '/client/events/5', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-08-09 03:15:53'),
(0, 29, 6, 34, NULL, NULL, NULL, NULL, 'Your event \"Weeding Package 2\" has been completed successfully! We hope you had a wonderful time.', 'event_completed', 'Event Completed', 'high', 'check-circle-2', '/client/events/6', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-08-09 03:15:53'),
(0, 23, 7, 29, NULL, NULL, NULL, NULL, 'Your event \"Customized Event 2\" has been completed successfully! We hope you had a wonderful time.', 'event_completed', 'Event Completed', 'high', 'check-circle-2', '/client/events/7', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-09 03:15:53'),
(0, 29, 9, 29, NULL, NULL, NULL, NULL, 'Your event \"Birthday Event\" has been completed successfully! We hope you had a wonderful time.', 'event_completed', 'Event Completed', 'high', 'check-circle-2', '/client/events/9', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-08-09 03:15:53'),
(0, 29, 10, 34, NULL, NULL, NULL, NULL, 'Your event \"Customized Event 8\" has been completed successfully! We hope you had a wonderful time.', 'event_completed', 'Event Completed', 'high', 'check-circle-2', '/client/events/10', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-08-09 03:15:53'),
(0, 21, 11, 29, NULL, NULL, NULL, NULL, 'Your event \"CUSTOMIZED PACKAGE 9\" has been completed successfully! We hope you had a wonderful time.', 'event_completed', 'Event Completed', 'high', 'check-circle-2', '/client/events/11', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-09 03:15:53'),
(0, 29, 31, 34, NULL, NULL, NULL, NULL, 'Your event \"Test\" has been completed successfully! We hope you had a wonderful time.', 'event_completed', 'Event Completed', 'high', 'check-circle-2', '/client/events/31', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-08-09 03:15:53'),
(0, 29, 32, 29, NULL, NULL, NULL, NULL, 'Your event \"Kimi K2 - Test 2\" has been completed successfully! We hope you had a wonderful time.', 'event_completed', 'Event Completed', 'high', 'check-circle-2', '/client/events/32', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-08-09 03:15:53'),
(0, 23, 33, 34, NULL, NULL, NULL, NULL, 'Your event \"Christine\'s Birthday\" has been completed successfully! We hope you had a wonderful time.', 'event_completed', 'Event Completed', 'high', 'check-circle-2', '/client/events/33', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-09 03:15:53'),
(0, 21, 36, 30, NULL, NULL, NULL, NULL, 'Your event \"Debut\" has been completed successfully! We hope you had a wonderful time.', 'event_completed', 'Event Completed', 'high', 'check-circle-2', '/client/events/36', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-09 03:15:53'),
(0, 21, 37, 30, NULL, NULL, NULL, NULL, 'Your event \"Test\" has been completed successfully! We hope you had a wonderful time.', 'event_completed', 'Event Completed', 'high', 'check-circle-2', '/client/events/37', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-09 03:15:53'),
(0, 21, 48, 34, NULL, NULL, NULL, NULL, 'Your event \"Test 50\" has been completed successfully! We hope you had a wonderful time.', 'event_completed', 'Event Completed', 'high', 'check-circle-2', '/client/events/48', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-09 03:15:53'),
(0, 29, 49, 30, NULL, NULL, NULL, NULL, 'Your event \"Event 80 - Fixed Ghost Payments\" has been completed successfully! We hope you had a wonderful time.', 'event_completed', 'Event Completed', 'high', 'check-circle-2', '/client/events/49', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-08-09 03:15:53'),
(0, 21, 50, 34, NULL, NULL, NULL, NULL, 'Your event \"Wedding Ko Ya\" has been completed successfully! We hope you had a wonderful time.', 'event_completed', 'Event Completed', 'high', 'check-circle-2', '/client/events/50', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-09 03:15:53'),
(0, 29, 10, 34, NULL, NULL, NULL, NULL, 'Your event \"Customized Event 8\" has been confirmed and is now scheduled for August 12, 2025.', 'event_confirmed', 'Event Confirmed', 'high', 'check-circle', '/client/events/10', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-08-09 11:18:14'),
(0, 21, 11, 29, NULL, NULL, NULL, NULL, 'Your event \"CUSTOMIZED PACKAGE 9\" has been confirmed and is now scheduled for August 28, 2025.', 'event_confirmed', 'Event Confirmed', 'high', 'check-circle', '/client/events/11', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-09 11:18:14'),
(0, 29, 31, 34, NULL, NULL, NULL, NULL, 'Your event \"Test\" has been confirmed and is now scheduled for September 10, 2025.', 'event_confirmed', 'Event Confirmed', 'high', 'check-circle', '/client/events/31', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-08-09 11:18:14'),
(0, 29, 32, 29, NULL, NULL, NULL, NULL, 'Your event \"Kimi K2 - Test 2\" has been confirmed and is now scheduled for September 18, 2025.', 'event_confirmed', 'Event Confirmed', 'high', 'check-circle', '/client/events/32', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-08-09 11:18:14'),
(0, 23, 33, 34, NULL, NULL, NULL, NULL, 'Your event \"Christine\'s Birthday\" has been confirmed and is now scheduled for September 19, 2025.', 'event_confirmed', 'Event Confirmed', 'high', 'check-circle', '/client/events/33', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-09 11:18:14'),
(0, 21, 48, 34, NULL, NULL, NULL, NULL, 'Your event \"Test 50\" has been confirmed and is now scheduled for September 30, 2025.', 'event_confirmed', 'Event Confirmed', 'high', 'check-circle', '/client/events/48', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-09 11:18:14'),
(0, 29, 49, 30, NULL, NULL, NULL, NULL, 'Your event \"Event 80 - Fixed Ghost Payments\" has been confirmed and is now scheduled for October 01, 2025.', 'event_confirmed', 'Event Confirmed', 'high', 'check-circle', '/client/events/49', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-08-09 11:18:14'),
(0, 21, 50, 34, NULL, NULL, NULL, NULL, 'Your event \"Wedding Ko Ya\" has been confirmed and is now scheduled for October 18, 2025.', 'event_confirmed', 'Event Confirmed', 'high', 'check-circle', '/client/events/50', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-09 11:18:14'),
(0, 29, 59, 30, NULL, NULL, NULL, NULL, 'Your event \"Test\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/59', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-08-18 16:09:28'),
(0, 29, 59, 30, NULL, NULL, NULL, NULL, 'Your event \"Test\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/59', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-08-18 16:09:28'),
(0, 29, 59, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱79,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/49', '0000-00-00 00:00:00', '2025-09-09 21:58:34', 'read', '2025-08-18 16:09:28'),
(0, 27, 1, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #1. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/1', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 28, 3, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #3. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/3', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 27, 4, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #4. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/4', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 27, 5, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #5. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/5', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 28, 8, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #8. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/8', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 27, 9, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #9. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/9', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 28, 10, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #10. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/10', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 27, 12, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #12. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/12', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 27, 13, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #13. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/13', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 27, 31, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #31. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/31', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 27, 32, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #32. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/32', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 28, 33, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #33. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/33', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 28, 34, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #34. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/34', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 28, 35, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #35. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/35', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 28, 36, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #36. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/36', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 32, 48, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #48. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/48', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 31, 49, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #49. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/49', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 31, 50, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #50. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/50', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:20:37'),
(0, 21, 61, 34, NULL, NULL, NULL, NULL, 'Your event \"Organizer \" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/61', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:22:23'),
(0, 21, 61, 34, NULL, NULL, NULL, NULL, 'Your event \"Organizer \" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/61', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:22:23'),
(0, 21, 61, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱26,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/51', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:22:23'),
(0, 33, 61, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #61. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/61', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-19 16:22:23'),
(0, 5, 62, 34, NULL, NULL, NULL, NULL, 'Your event \"Organizer Birthday\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/62', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-20 04:35:17'),
(0, 5, 62, 34, NULL, NULL, NULL, NULL, 'Your event \"Organizer Birthday\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/62', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-20 04:35:17'),
(0, 33, 62, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #62. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/62', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-20 04:35:17'),
(0, 5, 62, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱65,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/52', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-20 04:35:17'),
(0, 21, 63, 30, NULL, NULL, NULL, NULL, 'Your event \"Sample\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/63', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-30 04:34:47'),
(0, 21, 63, 30, NULL, NULL, NULL, NULL, 'Your event \"Sample\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/63', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-30 04:34:47'),
(0, 32, 63, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #63. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/63', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-30 04:34:47'),
(0, 21, 63, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱159,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/53', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-30 04:34:47'),
(0, 32, 64, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #64. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/64', '0000-00-00 00:00:00', NULL, 'unread', '2025-08-30 07:44:02'),
(0, 28, 60, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #60. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/60', '0000-00-00 00:00:00', NULL, 'unread', '2025-09-08 16:57:26'),
(0, 21, 61, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱26,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/56', '0000-00-00 00:00:00', NULL, 'unread', '2025-09-08 17:43:07'),
(0, 21, 61, 34, NULL, NULL, NULL, NULL, 'Your event \"Organizer \" has been confirmed and is now scheduled for October 30, 2025.', 'event_confirmed', 'Event Confirmed', 'high', 'check-circle', '/client/events/61', '0000-00-00 00:00:00', NULL, 'unread', '2025-09-08 18:35:09'),
(0, 21, 61, NULL, NULL, NULL, NULL, NULL, 'Your event \'Organizer \' has been finalized. Please check your payment schedule for upcoming payments.', '', 'Event Finalized', 'medium', NULL, NULL, NULL, NULL, 'unread', '2025-09-08 18:35:09'),
(0, 28, 61, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #61. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/61', '0000-00-00 00:00:00', NULL, 'unread', '2025-09-08 20:01:32'),
(0, 32, 61, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #61. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/61', '0000-00-00 00:00:00', NULL, 'unread', '2025-09-08 20:16:36'),
(0, 23, 66, 34, NULL, NULL, NULL, NULL, 'Your event \"b_day_sample\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/66', '0000-00-00 00:00:00', NULL, 'unread', '2025-09-09 23:01:51'),
(0, 23, 66, 34, NULL, NULL, NULL, NULL, 'Your event \"b_day_sample\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/66', '0000-00-00 00:00:00', NULL, 'unread', '2025-09-09 23:01:51'),
(0, 28, 66, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #66. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/66', '0000-00-00 00:00:00', NULL, 'unread', '2025-09-09 23:01:51');
INSERT INTO `tbl_notifications` (`notification_id`, `user_id`, `event_id`, `venue_id`, `store_id`, `budget_id`, `booking_id`, `feedback_id`, `notification_message`, `notification_type`, `notification_title`, `notification_priority`, `notification_icon`, `notification_url`, `expires_at`, `read_at`, `notification_status`, `created_at`) VALUES
(0, 23, 66, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱112,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/57', '0000-00-00 00:00:00', NULL, 'unread', '2025-09-09 23:01:51'),
(0, 28, 67, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #67. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/67', '0000-00-00 00:00:00', NULL, 'unread', '2025-09-11 06:01:51'),
(0, 28, 68, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #68. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/68', '0000-00-00 00:00:00', NULL, 'unread', '2025-09-11 06:10:22'),
(0, 30, 68, NULL, NULL, NULL, NULL, NULL, 'The inclusion Lights & Sounds payment status is now paid.', '', 'Inclusion Payment Status Updated', 'medium', 'credit-card', '/client/events/68', '2025-09-18 08:04:36', '2025-09-11 14:19:07', 'read', '2025-09-11 14:04:36'),
(0, 30, 69, 34, NULL, NULL, NULL, NULL, 'Your event \"test_test\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/69', '0000-00-00 00:00:00', NULL, 'unread', '2025-09-13 05:25:59'),
(0, 30, 69, 34, NULL, NULL, NULL, NULL, 'Your event \"test_test\" has been created successfully! Check your payment schedule for upcoming payments.', 'event_created', 'Event Created Successfully', 'high', 'calendar-check', '/client/events/69', '0000-00-00 00:00:00', NULL, 'unread', '2025-09-13 05:25:59'),
(0, 28, 69, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #69. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/69', '0000-00-00 00:00:00', NULL, 'unread', '2025-09-13 05:25:59'),
(0, 30, 69, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱22,500.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/61', '0000-00-00 00:00:00', NULL, 'unread', '2025-09-13 05:25:59'),
(0, 28, 70, NULL, NULL, NULL, NULL, NULL, 'You have been assigned to event #70. Please review the event details.', '', 'New Event Assignment', 'high', 'calendar-check', '/organizer/events/70', '0000-00-00 00:00:00', NULL, 'unread', '2025-09-22 06:59:23'),
(0, 20, 70, NULL, NULL, NULL, NULL, NULL, 'Your payment of ₱16,000.00 for \"your event\" has been submitted and is pending admin confirmation.', 'payment_created', 'Payment Submitted', 'medium', 'credit-card', '/client/payments/63', '0000-00-00 00:00:00', '2025-09-22 07:47:17', 'read', '2025-09-22 07:45:10'),
(0, 20, 70, NULL, NULL, NULL, NULL, NULL, 'The inclusion Anima - Electronic Mascots payment status is now paid.', '', 'Inclusion Payment Status Updated', 'medium', 'credit-card', '/client/events/70', '2025-09-29 01:46:58', '2025-09-22 07:47:17', 'read', '2025-09-22 07:46:58'),
(0, 20, 70, NULL, NULL, NULL, NULL, NULL, 'The inclusion Test payment status is now paid.', '', 'Inclusion Payment Status Updated', 'medium', 'credit-card', '/client/events/70', '2025-09-29 01:51:43', NULL, 'unread', '2025-09-22 07:51:43'),
(0, 20, 70, NULL, NULL, NULL, NULL, NULL, 'The inclusion Demiren Hotel payment status is now paid.', '', 'Inclusion Payment Status Updated', 'medium', 'credit-card', '/client/events/70', '2025-09-29 02:05:22', NULL, 'unread', '2025-09-22 08:05:22'),
(0, 21, 48, NULL, NULL, NULL, NULL, NULL, 'The inclusion Demiren Hotel payment status is now paid.', '', 'Inclusion Payment Status Updated', 'medium', 'credit-card', '/client/events/48', '2025-09-29 02:07:36', NULL, 'unread', '2025-09-22 08:07:36'),
(0, 21, 48, NULL, NULL, NULL, NULL, NULL, 'The inclusion Venue Rental payment status is now paid.', '', 'Inclusion Payment Status Updated', 'medium', 'credit-card', '/client/events/48', '2025-09-29 02:17:07', NULL, 'unread', '2025-09-22 08:17:07'),
(0, 30, 67, NULL, NULL, NULL, NULL, NULL, 'The inclusion Pearlmont Hotel - Package 2 payment status is now paid.', '', 'Inclusion Payment Status Updated', 'medium', 'credit-card', '/client/events/67', '2025-09-30 01:51:45', NULL, 'unread', '2025-09-23 07:51:45'),
(0, 30, 67, NULL, NULL, NULL, NULL, NULL, 'The inclusion Venue Rental payment status is now paid.', '', 'Inclusion Payment Status Updated', 'medium', 'credit-card', '/client/events/67', '2025-09-30 01:51:49', NULL, 'unread', '2025-09-23 07:51:49'),
(0, 30, 67, NULL, NULL, NULL, NULL, NULL, 'The inclusion Catering payment status is now paid.', '', 'Inclusion Payment Status Updated', 'medium', 'credit-card', '/client/events/67', '2025-09-30 01:52:02', NULL, 'unread', '2025-09-23 07:52:02'),
(0, 30, 67, NULL, NULL, NULL, NULL, NULL, 'The inclusion Event Styling & Decorations payment status is now paid.', '', 'Inclusion Payment Status Updated', 'medium', 'credit-card', '/client/events/67', '2025-09-30 01:52:09', NULL, 'unread', '2025-09-23 07:52:09'),
(0, 30, 67, NULL, NULL, NULL, NULL, NULL, 'The inclusion Photographer & Videographer payment status is now paid.', '', 'Inclusion Payment Status Updated', 'medium', 'credit-card', '/client/events/67', '2025-09-30 01:52:41', NULL, 'unread', '2025-09-23 07:52:41'),
(0, 30, 67, NULL, NULL, NULL, NULL, NULL, 'The inclusion Invitation Design & Printing payment status is now paid.', '', 'Inclusion Payment Status Updated', 'medium', 'credit-card', '/client/events/67', '2025-09-30 01:52:46', NULL, 'unread', '2025-09-23 07:52:46'),
(0, 30, 67, NULL, NULL, NULL, NULL, NULL, 'The inclusion Cake & Wine Set payment status is now paid.', '', 'Inclusion Payment Status Updated', 'medium', 'credit-card', '/client/events/67', '2025-09-30 01:52:50', NULL, 'unread', '2025-09-23 07:52:50'),
(0, 30, 67, NULL, NULL, NULL, NULL, NULL, 'The inclusion Elegant Catering Services - Wedding Catering Package - Premium payment status is now paid.', '', 'Inclusion Payment Status Updated', 'medium', 'credit-card', '/client/events/67', '2025-09-30 01:54:49', NULL, 'unread', '2025-09-23 07:54:49'),
(0, 30, 67, NULL, NULL, NULL, NULL, NULL, 'The inclusion Test payment status is now paid.', '', 'Inclusion Payment Status Updated', 'medium', 'credit-card', '/client/events/67', '2025-09-30 01:54:55', NULL, 'unread', '2025-09-23 07:54:55');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_offer_subcomponents`
--

CREATE TABLE `tbl_offer_subcomponents` (
  `component_id` int(11) NOT NULL,
  `offer_id` int(11) NOT NULL,
  `component_title` varchar(255) NOT NULL,
  `component_description` text DEFAULT NULL,
  `is_customizable` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_organizer`
--

CREATE TABLE `tbl_organizer` (
  `organizer_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `organizer_experience` text DEFAULT NULL COMMENT 'Experience summary of the organizer',
  `organizer_certifications` text DEFAULT NULL COMMENT 'Certifications and qualifications',
  `organizer_resume_path` varchar(500) DEFAULT NULL COMMENT 'Path to uploaded resume file',
  `organizer_portfolio_link` varchar(255) DEFAULT NULL COMMENT 'Optional portfolio website URL',
  `talent_fee_min` decimal(12,2) DEFAULT NULL,
  `talent_fee_max` decimal(12,2) DEFAULT NULL,
  `talent_fee_currency` varchar(10) NOT NULL DEFAULT 'PHP',
  `talent_fee_notes` text DEFAULT NULL,
  `organizer_availability` enum('flexible','weekdays','weekends','limited') DEFAULT 'flexible' COMMENT 'Availability schedule',
  `remarks` text DEFAULT NULL COMMENT 'Admin notes and remarks',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Organizer profile information linked to user accounts';

--
-- Dumping data for table `tbl_organizer`
--

INSERT INTO `tbl_organizer` (`organizer_id`, `user_id`, `organizer_experience`, `organizer_certifications`, `organizer_resume_path`, `organizer_portfolio_link`, `talent_fee_min`, `talent_fee_max`, `talent_fee_currency`, `talent_fee_notes`, `organizer_availability`, `remarks`, `created_at`, `updated_at`) VALUES
(3, 27, 'Years of Experience: 3\nAddress: CDO', '[\"uploads\\/certifications\\/1752506681_687521399564d.pdf\"]', 'uploads/resumes/1752506681_6875213991ce7.docx', '', 4000.00, 5000.00, 'PHP', '', 'flexible', '', '2025-07-14 15:24:41', '2025-09-03 04:40:37'),
(4, 28, 'Years of Experience: 3\nAddress: ligan City', '[\"uploads\\/certifications\\/1752690715_6877f01bc3dc2.pdf\"]', 'uploads/resumes/1752690714_6877f01a83e0e.pdf', '', 20000.00, 30000.00, 'PHP', '', 'flexible', '', '2025-07-16 18:31:57', '2025-09-03 04:21:16'),
(5, 31, 'Years of Experience: 0\nAddress: Iligan City', '[\"uploads\\/certifications\\/1753152283_687efb1b7aa37.jpg\"]', 'uploads/resumes/1753152286_687efb1e0930e.docx', '', 5000.00, 10000.00, 'PHP', '', 'flexible', '', '2025-07-22 02:44:52', '2025-09-03 04:13:24'),
(6, 32, 'Years of Experience: 4\nAddress: Cagayan de Oro City', '[\"uploads\\/certifications\\/1753613279_688603df53254.pdf\"]', 'uploads/resumes/1753613281_688603e19c872.pdf', '', 50000.00, 100000.00, 'PHP', '', 'flexible', 'Great experience', '2025-07-27 10:48:21', '2025-09-03 04:06:24'),
(7, 33, 'Years of Experience: 5\nAddress: Iligan City', '[\"uploads\\/certifications\\/1755102156_689cbbccda46c.png\"]', 'uploads/resumes/1755102155_689cbbcb0b1e2.docx', '', 10000.00, 20000.00, 'PHP', '', 'flexible', 'Yeah', '2025-08-13 16:22:45', '2025-09-03 04:06:04');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_organizer_activity_logs`
--

CREATE TABLE `tbl_organizer_activity_logs` (
  `log_id` int(11) NOT NULL,
  `organizer_id` int(11) NOT NULL,
  `activity_type` varchar(100) NOT NULL COMMENT 'Type of activity (created, updated, etc.)',
  `description` text DEFAULT NULL COMMENT 'Description of the activity',
  `related_id` int(11) DEFAULT NULL COMMENT 'Related entity ID if applicable',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional activity metadata' CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Activity logs for organizer actions';

--
-- Dumping data for table `tbl_organizer_activity_logs`
--

INSERT INTO `tbl_organizer_activity_logs` (`log_id`, `organizer_id`, `activity_type`, `description`, `related_id`, `metadata`, `created_at`) VALUES
(3, 3, 'created', 'Organizer account created', 27, 'null', '2025-07-14 15:24:43'),
(4, 4, 'created', 'Organizer account created', 28, 'null', '2025-07-16 18:32:00'),
(5, 5, 'created', 'Organizer account created', 31, 'null', '2025-07-22 02:44:55'),
(6, 6, 'created', 'Organizer account created', 32, 'null', '2025-07-27 10:48:23'),
(7, 7, 'created', 'Organizer account created', 33, 'null', '2025-08-13 16:22:48'),
(8, 7, 'updated', 'Organizer profile updated', 33, 'null', '2025-08-13 16:22:57'),
(9, 3, 'event_assigned', 'Assigned to event #1', 1, '{\"assignment_id\": 1, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(10, 4, 'event_assigned', 'Assigned to event #3', 3, '{\"assignment_id\": 2, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(11, 3, 'event_assigned', 'Assigned to event #4', 4, '{\"assignment_id\": 3, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(12, 3, 'event_assigned', 'Assigned to event #5', 5, '{\"assignment_id\": 4, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(13, 4, 'event_assigned', 'Assigned to event #8', 8, '{\"assignment_id\": 5, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(14, 3, 'event_assigned', 'Assigned to event #9', 9, '{\"assignment_id\": 6, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(15, 4, 'event_assigned', 'Assigned to event #10', 10, '{\"assignment_id\": 7, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(16, 3, 'event_assigned', 'Assigned to event #12', 12, '{\"assignment_id\": 8, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(17, 3, 'event_assigned', 'Assigned to event #13', 13, '{\"assignment_id\": 9, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(18, 3, 'event_assigned', 'Assigned to event #31', 31, '{\"assignment_id\": 10, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(19, 3, 'event_assigned', 'Assigned to event #32', 32, '{\"assignment_id\": 11, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(20, 4, 'event_assigned', 'Assigned to event #33', 33, '{\"assignment_id\": 12, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(21, 4, 'event_assigned', 'Assigned to event #34', 34, '{\"assignment_id\": 13, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(22, 4, 'event_assigned', 'Assigned to event #35', 35, '{\"assignment_id\": 14, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(23, 4, 'event_assigned', 'Assigned to event #36', 36, '{\"assignment_id\": 15, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(24, 6, 'event_assigned', 'Assigned to event #48', 48, '{\"assignment_id\": 16, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(25, 5, 'event_assigned', 'Assigned to event #49', 49, '{\"assignment_id\": 17, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(26, 5, 'event_assigned', 'Assigned to event #50', 50, '{\"assignment_id\": 18, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": null}', '2025-08-19 16:20:37'),
(27, 7, 'event_assigned', 'Assigned to event #61', 61, '{\"assignment_id\": 32, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": \"Assigned during event creation\"}', '2025-08-19 16:22:23'),
(28, 7, 'event_assigned', 'Assigned to event #62', 62, '{\"assignment_id\": 33, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": \"Assigned during event creation\"}', '2025-08-20 04:35:17'),
(29, 6, 'event_assigned', 'Assigned to event #63', 63, '{\"assignment_id\": 34, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": \"Assigned during event creation\"}', '2025-08-30 04:34:47'),
(30, 6, 'event_assigned', 'Assigned to event #64', 64, '{\"assignment_id\": 35, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": \"Assigned during event creation\"}', '2025-08-30 07:44:02'),
(31, 7, 'updated', 'Organizer profile updated', 33, 'null', '2025-09-03 03:58:04'),
(32, 7, 'updated', 'Organizer profile updated', 33, 'null', '2025-09-03 04:05:22'),
(33, 7, 'updated', 'Organizer profile updated', 33, 'null', '2025-09-03 04:06:04'),
(34, 6, 'updated', 'Organizer profile updated', 32, 'null', '2025-09-03 04:06:24'),
(35, 5, 'updated', 'Organizer profile updated', 31, 'null', '2025-09-03 04:13:24'),
(36, 4, 'updated', 'Organizer profile updated', 28, 'null', '2025-09-03 04:21:16'),
(37, 4, 'updated', 'Organizer profile updated', 28, 'null', '2025-09-03 04:21:23'),
(38, 3, 'updated', 'Organizer profile updated', 27, 'null', '2025-09-03 04:28:55'),
(39, 3, 'updated', 'Organizer profile updated', 27, 'null', '2025-09-03 04:33:36'),
(40, 3, 'updated', 'Organizer profile updated', 27, 'null', '2025-09-03 04:33:44'),
(41, 3, 'updated', 'Organizer profile updated', 27, 'null', '2025-09-03 04:40:37'),
(42, 3, 'event_assignment_updated', 'Event assignment #1 status changed to assigned', 1, '{\"assignment_id\": 1, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(43, 4, 'event_assignment_updated', 'Event assignment #3 status changed to assigned', 3, '{\"assignment_id\": 2, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(44, 3, 'event_assignment_updated', 'Event assignment #4 status changed to assigned', 4, '{\"assignment_id\": 3, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(45, 3, 'event_assignment_updated', 'Event assignment #5 status changed to assigned', 5, '{\"assignment_id\": 4, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(46, 4, 'event_assignment_updated', 'Event assignment #8 status changed to assigned', 8, '{\"assignment_id\": 5, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(47, 3, 'event_assignment_updated', 'Event assignment #9 status changed to assigned', 9, '{\"assignment_id\": 6, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(48, 4, 'event_assignment_updated', 'Event assignment #10 status changed to assigned', 10, '{\"assignment_id\": 7, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(49, 3, 'event_assignment_updated', 'Event assignment #12 status changed to assigned', 12, '{\"assignment_id\": 8, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(50, 3, 'event_assignment_updated', 'Event assignment #13 status changed to assigned', 13, '{\"assignment_id\": 9, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(51, 3, 'event_assignment_updated', 'Event assignment #31 status changed to assigned', 31, '{\"assignment_id\": 10, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(52, 3, 'event_assignment_updated', 'Event assignment #32 status changed to assigned', 32, '{\"assignment_id\": 11, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(53, 4, 'event_assignment_updated', 'Event assignment #33 status changed to assigned', 33, '{\"assignment_id\": 12, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(54, 4, 'event_assignment_updated', 'Event assignment #34 status changed to assigned', 34, '{\"assignment_id\": 13, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(55, 4, 'event_assignment_updated', 'Event assignment #35 status changed to assigned', 35, '{\"assignment_id\": 14, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(56, 4, 'event_assignment_updated', 'Event assignment #36 status changed to assigned', 36, '{\"assignment_id\": 15, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(57, 6, 'event_assignment_updated', 'Event assignment #48 status changed to assigned', 48, '{\"assignment_id\": 16, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(58, 5, 'event_assignment_updated', 'Event assignment #49 status changed to assigned', 49, '{\"assignment_id\": 17, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(59, 5, 'event_assignment_updated', 'Event assignment #50 status changed to assigned', 50, '{\"assignment_id\": 18, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(60, 7, 'event_assignment_updated', 'Event assignment #61 status changed to assigned', 61, '{\"assignment_id\": 32, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(61, 7, 'event_assignment_updated', 'Event assignment #62 status changed to assigned', 62, '{\"assignment_id\": 33, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(62, 6, 'event_assignment_updated', 'Event assignment #63 status changed to assigned', 63, '{\"assignment_id\": 34, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(63, 6, 'event_assignment_updated', 'Event assignment #64 status changed to assigned', 64, '{\"assignment_id\": 35, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 14:57:25'),
(64, 3, 'event_assignment_updated', 'Event assignment #1 status changed to assigned', 1, '{\"assignment_id\": 1, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(65, 4, 'event_assignment_updated', 'Event assignment #3 status changed to assigned', 3, '{\"assignment_id\": 2, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(66, 3, 'event_assignment_updated', 'Event assignment #4 status changed to assigned', 4, '{\"assignment_id\": 3, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(67, 3, 'event_assignment_updated', 'Event assignment #5 status changed to assigned', 5, '{\"assignment_id\": 4, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(68, 4, 'event_assignment_updated', 'Event assignment #8 status changed to assigned', 8, '{\"assignment_id\": 5, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(69, 3, 'event_assignment_updated', 'Event assignment #9 status changed to assigned', 9, '{\"assignment_id\": 6, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(70, 4, 'event_assignment_updated', 'Event assignment #10 status changed to assigned', 10, '{\"assignment_id\": 7, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(71, 3, 'event_assignment_updated', 'Event assignment #12 status changed to assigned', 12, '{\"assignment_id\": 8, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(72, 3, 'event_assignment_updated', 'Event assignment #13 status changed to assigned', 13, '{\"assignment_id\": 9, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(73, 3, 'event_assignment_updated', 'Event assignment #31 status changed to assigned', 31, '{\"assignment_id\": 10, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(74, 3, 'event_assignment_updated', 'Event assignment #32 status changed to assigned', 32, '{\"assignment_id\": 11, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(75, 4, 'event_assignment_updated', 'Event assignment #33 status changed to assigned', 33, '{\"assignment_id\": 12, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(76, 4, 'event_assignment_updated', 'Event assignment #34 status changed to assigned', 34, '{\"assignment_id\": 13, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(77, 4, 'event_assignment_updated', 'Event assignment #35 status changed to assigned', 35, '{\"assignment_id\": 14, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(78, 4, 'event_assignment_updated', 'Event assignment #36 status changed to assigned', 36, '{\"assignment_id\": 15, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(79, 6, 'event_assignment_updated', 'Event assignment #48 status changed to assigned', 48, '{\"assignment_id\": 16, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(80, 5, 'event_assignment_updated', 'Event assignment #49 status changed to assigned', 49, '{\"assignment_id\": 17, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(81, 5, 'event_assignment_updated', 'Event assignment #50 status changed to assigned', 50, '{\"assignment_id\": 18, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(82, 7, 'event_assignment_updated', 'Event assignment #61 status changed to assigned', 61, '{\"assignment_id\": 32, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(83, 7, 'event_assignment_updated', 'Event assignment #62 status changed to assigned', 62, '{\"assignment_id\": 33, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(84, 6, 'event_assignment_updated', 'Event assignment #63 status changed to assigned', 63, '{\"assignment_id\": 34, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(85, 6, 'event_assignment_updated', 'Event assignment #64 status changed to assigned', 64, '{\"assignment_id\": 35, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:09'),
(86, 7, 'event_assignment_updated', 'Event assignment #61 status changed to assigned', 61, '{\"assignment_id\": 32, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-08 15:00:33'),
(87, 4, 'event_assigned', 'Assigned to event #60', 60, '{\"assignment_id\": 36, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": \"Assigned from event page\"}', '2025-09-08 16:57:26'),
(88, 4, 'event_assigned', 'Assigned to event #61', 61, '{\"assignment_id\": 37, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": \"Assigned from event page\"}', '2025-09-08 20:01:32'),
(89, 6, 'event_assigned', 'Assigned to event #61', 61, '{\"assignment_id\": 38, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": \"Assigned from event page\"}', '2025-09-08 20:16:36'),
(90, 4, 'event_assigned', 'Assigned to event #66', 66, '{\"assignment_id\": 39, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": \"Assigned during event creation\"}', '2025-09-09 23:01:51'),
(91, 4, 'event_assignment_updated', 'Event assignment #66 status changed to accepted', 66, '{\"assignment_id\": 39, \"old_status\": \"assigned\", \"new_status\": \"accepted\", \"updated_by\": 7}', '2025-09-10 23:08:07'),
(92, 4, 'assignment_status_changed', 'Event assignment status changed to accepted', 66, '{\"assignment_id\": \"39\", \"new_status\": \"accepted\", \"updated_by\": \"4\"}', '2025-09-10 23:08:07'),
(93, 4, 'assignment_status_updated', 'Updated assignment status to accepted', 39, NULL, '2025-09-10 23:08:07'),
(94, 4, 'event_assignment_updated', 'Event assignment #60 status changed to accepted', 60, '{\"assignment_id\": 36, \"old_status\": \"assigned\", \"new_status\": \"accepted\", \"updated_by\": 7}', '2025-09-11 00:36:16'),
(95, 4, 'assignment_status_changed', 'Event assignment status changed to accepted', 60, '{\"assignment_id\": \"36\", \"new_status\": \"accepted\", \"updated_by\": \"4\"}', '2025-09-11 00:36:16'),
(96, 4, 'assignment_status_updated', 'Updated assignment status to accepted', 36, NULL, '2025-09-11 00:36:16'),
(97, 4, 'event_assignment_updated', 'Event assignment #60 status changed to accepted', 60, '{\"assignment_id\": 36, \"old_status\": \"accepted\", \"new_status\": \"accepted\", \"updated_by\": 7}', '2025-09-11 00:36:32'),
(98, 4, 'event_assigned', 'Assigned to event #67', 67, '{\"assignment_id\": 40, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": \"Assigned during event creation\"}', '2025-09-11 06:01:51'),
(99, 4, 'event_assignment_updated', 'Event assignment #67 status changed to accepted', 67, '{\"assignment_id\": 40, \"old_status\": \"assigned\", \"new_status\": \"accepted\", \"updated_by\": 7}', '2025-09-11 06:02:24'),
(100, 4, 'assignment_status_changed', 'Event assignment status changed to accepted', 67, '{\"assignment_id\": \"40\", \"new_status\": \"accepted\", \"updated_by\": \"4\"}', '2025-09-11 06:02:24'),
(101, 4, 'assignment_status_updated', 'Updated assignment status to accepted', 40, NULL, '2025-09-11 06:02:24'),
(102, 4, 'event_assigned', 'Assigned to event #68', 68, '{\"assignment_id\": 41, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": \"Assigned during event creation\"}', '2025-09-11 06:10:22'),
(103, 4, 'event_assignment_updated', 'Event assignment #68 status changed to accepted', 68, '{\"assignment_id\": 41, \"old_status\": \"assigned\", \"new_status\": \"accepted\", \"updated_by\": 7}', '2025-09-11 06:11:32'),
(104, 4, 'assignment_status_changed', 'Event assignment status changed to accepted', 68, '{\"assignment_id\": \"41\", \"new_status\": \"accepted\", \"updated_by\": \"4\"}', '2025-09-11 06:11:32'),
(105, 4, 'assignment_status_updated', 'Updated assignment status to accepted', 41, NULL, '2025-09-11 06:11:32'),
(106, 4, 'event_assigned', 'Assigned to event #69', 69, '{\"assignment_id\": 42, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": \"Assigned during event creation\"}', '2025-09-13 05:25:59'),
(107, 4, 'event_assigned', 'Assigned to event #70', 70, '{\"assignment_id\": 43, \"assigned_by\": 7, \"status\": \"assigned\", \"notes\": \"Assigned during event creation\"}', '2025-09-22 06:59:23'),
(108, 4, 'event_assignment_updated', 'Event assignment #70 status changed to assigned', 70, '{\"assignment_id\": 43, \"old_status\": \"assigned\", \"new_status\": \"assigned\", \"updated_by\": 7}', '2025-09-22 07:51:34');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_packages`
--

CREATE TABLE `tbl_packages` (
  `package_id` int(11) NOT NULL,
  `package_title` varchar(255) NOT NULL,
  `package_description` text DEFAULT NULL,
  `package_price` decimal(10,2) NOT NULL,
  `guest_capacity` int(11) NOT NULL DEFAULT 0,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `original_price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Original package price when first created - never changes',
  `is_price_locked` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether the price is locked (1) or can still be modified (0)',
  `price_lock_date` timestamp NULL DEFAULT NULL COMMENT 'When the price was locked',
  `price_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'History of price changes for audit trail' CHECK (json_valid(`price_history`)),
  `customized_package` tinyint(1) DEFAULT 0 COMMENT '1 if this is a customized package created from event components, 0 for regular packages'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_packages`
--

INSERT INTO `tbl_packages` (`package_id`, `package_title`, `package_description`, `package_price`, `guest_capacity`, `created_by`, `created_at`, `updated_at`, `is_active`, `original_price`, `is_price_locked`, `price_lock_date`, `price_history`, `customized_package`) VALUES
(14, 'Wedding Package 1', 'All in wedding package 1', 120000.00, 100, 7, '2025-06-14 12:04:28', '2025-07-08 03:56:43', 1, 120000.00, 1, '2025-06-14 12:04:28', NULL, 0),
(15, 'Wedding Package 2', 'All in for wedding package 2', 250000.00, 100, 7, '2025-06-14 12:15:37', '2025-07-08 03:56:43', 1, 250000.00, 1, '2025-06-14 12:15:37', NULL, 0),
(18, 'Anniversary Package', 'All-in-package for anniversary', 249999.99, 100, 7, '2025-07-07 20:03:29', '2025-07-08 04:05:39', 0, 249999.99, 1, '2025-07-07 20:03:29', NULL, 0),
(19, 'Anniversary Package 1', 'All-in-anniversary package', 250000.00, 100, 7, '2025-07-08 04:14:11', '2025-07-08 04:14:45', 1, 250000.00, 1, '2025-07-08 04:14:11', NULL, 0),
(20, 'Sample Package', 'All-in-sample package', 500000.00, 100, 7, '2025-07-09 12:31:40', '2025-07-09 12:31:40', 1, 500000.00, 1, '2025-07-09 12:31:40', NULL, 0),
(22, 'Debut Package 1', 'All-in-debut package', 350000.00, 100, 7, '2025-07-19 04:33:33', '2025-07-19 04:33:33', 1, 350000.00, 1, '2025-07-19 04:33:33', NULL, 0),
(23, 'Golden Wedding Package', 'All-in Golden Wedding Package', 800000.00, 300, 7, '2025-07-19 04:49:08', '2025-07-19 04:49:08', 1, 800000.00, 1, '2025-07-19 04:49:08', NULL, 0),
(24, 'Golden Baptism Package', 'All-in-one package', 230000.00, 100, 7, '2025-08-30 07:24:34', '2025-08-30 07:24:34', 1, 230000.00, 1, '2025-08-30 07:24:34', NULL, 0),
(25, 'Test 3', 'sdfsdg', 35000.00, 100, 7, '2025-09-01 18:36:28', '2025-09-01 18:36:28', 1, 35000.00, 1, '2025-09-01 18:36:28', NULL, 0),
(26, 'Anniversary Package', 'All-in anniversary package for all people!', 215000.00, 100, 7, '2025-09-23 08:27:39', '2025-09-23 08:27:39', 1, 215000.00, 1, '2025-09-23 08:27:39', NULL, 0);

--
-- Triggers `tbl_packages`
--
DELIMITER $$
CREATE TRIGGER `prevent_package_price_reduction` BEFORE UPDATE ON `tbl_packages` FOR EACH ROW BEGIN
    -- If price is locked and someone tries to reduce it, prevent the update
    IF OLD.is_price_locked = 1 AND NEW.package_price < OLD.package_price THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot reduce package price once locked. Package prices can only increase or remain the same.';
    END IF;

    -- If price is being increased, log it in price history
    IF NEW.package_price > OLD.package_price THEN
        INSERT INTO `tbl_package_price_history` (package_id, old_price, new_price, changed_by, change_reason)
        VALUES (NEW.package_id, OLD.package_price, NEW.package_price, NEW.created_by, 'Price increase');
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_package_bookings`
--

CREATE TABLE `tbl_package_bookings` (
  `id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `booking_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `package_price_at_booking` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_package_components`
--

CREATE TABLE `tbl_package_components` (
  `component_id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `component_name` varchar(255) NOT NULL,
  `component_description` text DEFAULT NULL,
  `component_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `display_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_package_components`
--

INSERT INTO `tbl_package_components` (`component_id`, `package_id`, `component_name`, `component_description`, `component_price`, `display_order`) VALUES
(188, 14, 'Inclusions', '', 0.00, 0),
(189, 15, 'Full Wedding Coordination', '', 15000.00, 0),
(190, 15, 'Attire ', '', 25000.00, 1),
(191, 15, 'Hair and Makeup', '', 8000.00, 2),
(192, 15, 'Wedding Cake', '', 5000.00, 3),
(193, 15, 'Transport & Floral Decor ', '', 7000.00, 4),
(194, 15, 'Emcee & Program Flow', '', 4000.00, 5),
(195, 15, 'Photography & Videography', '', 35000.00, 6),
(196, 15, 'Remaining Buffer ', '', 7000.00, 7),
(205, 15, 'Inclusions', '', 0.00, 8),
(261, 18, 'Venue Rental', '', 40000.00, 0),
(262, 18, 'Catering Service', '', 75000.00, 1),
(263, 18, 'Event Styling & Floral Design', '', 34999.98, 2),
(264, 18, 'Photo & Video Coverage', '', 20000.00, 3),
(265, 18, 'Host / Emcee', '', 10000.00, 4),
(266, 18, 'Acoustic Live Band', '', 15000.00, 5),
(267, 18, 'Led Wall', '', 12000.00, 6),
(268, 18, 'Customized Cake', '', 7000.00, 7),
(269, 18, 'Anniversary Tokens', '', 8000.00, 8),
(270, 18, 'Event Coordinator & Staff', '', 18000.00, 9),
(279, 19, 'Venue Rental', '', 44000.00, 0),
(280, 19, 'Catering', '', 70000.00, 1),
(281, 19, 'Lights & Sounds', '', 30000.00, 2),
(282, 19, 'Host & Live Performer', '', 20000.00, 3),
(283, 19, 'Event Styling & Decorations', '', 30000.00, 4),
(284, 19, 'Photographer & Videographer', '', 25000.00, 5),
(285, 19, 'Invitation Design & Printing', '', 6000.00, 6),
(286, 19, 'Cake & Wine Set', '', 5000.00, 7),
(287, 20, 'sample_inclusion', '', 12000.00, 0),
(288, 20, 'sample_inclusion 2', '', 20000.00, 1),
(0, 0, 'Demiren Hotel', 'Venue: Demiren Hotel', 20000.00, 0),
(0, 0, 'Random', 'Random', 12000.00, 1),
(0, 0, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', 'Blooming Gardens Florals - Floral Design (Bridal Bouquet & Ceremony Florals)', 15000.00, 2),
(0, 0, 'Demiren Hotel', 'Venue: Demiren Hotel', 20000.00, 0),
(0, 0, 'Random', 'Random', 12000.00, 1),
(0, 0, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', 'Blooming Gardens Florals - Floral Design (Bridal Bouquet & Ceremony Florals)', 15000.00, 2),
(0, 0, 'Demiren Hotel', 'Venue: Demiren Hotel', 20000.00, 0),
(0, 0, 'Random', 'Random', 12000.00, 1),
(0, 0, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', 'Blooming Gardens Florals - Floral Design (Bridal Bouquet & Ceremony Florals)', 15000.00, 2),
(0, 0, 'Demiren Hotel', 'Venue: Demiren Hotel', 20000.00, 0),
(0, 0, 'Random', 'Random', 12000.00, 1),
(0, 0, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', 'Blooming Gardens Florals - Floral Design (Bridal Bouquet & Ceremony Florals)', 15000.00, 2),
(0, 0, 'Demiren Hotel', 'Venue: Demiren Hotel', 20000.00, 0),
(0, 0, 'Random', 'Random', 12000.00, 1),
(0, 0, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', 'Blooming Gardens Florals - Floral Design (Bridal Bouquet & Ceremony Florals)', 15000.00, 2),
(0, 0, 'Demiren Hotel', 'Venue: Demiren Hotel', 20000.00, 0),
(0, 0, 'Random', 'Random', 12000.00, 1),
(0, 0, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', 'Blooming Gardens Florals - Floral Design (Bridal Bouquet & Ceremony Florals)', 15000.00, 2),
(0, 0, 'Demiren Hotel', 'Venue: Demiren Hotel', 20000.00, 0),
(0, 0, 'Random', 'Random', 12000.00, 1),
(0, 0, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', 'Blooming Gardens Florals - Floral Design (Bridal Bouquet & Ceremony Florals)', 15000.00, 2),
(0, 0, 'Demiren Hotel', 'Venue: Demiren Hotel', 20000.00, 0),
(0, 0, 'Random', 'Random', 12000.00, 1),
(0, 0, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', 'Blooming Gardens Florals - Floral Design (Bridal Bouquet & Ceremony Florals)', 15000.00, 2),
(0, 0, 'Demiren Hotel', 'Venue: Demiren Hotel', 20000.00, 0),
(0, 0, 'Random', 'Random', 12000.00, 1),
(0, 0, 'Blooming Gardens Florals - Bridal Bouquet & Ceremony Florals', 'Blooming Gardens Florals - Floral Design (Bridal Bouquet & Ceremony Florals)', 15000.00, 2),
(0, 22, 'Venue Decoration', 'Full flower decoration, Theme of choice', 25000.00, 0),
(0, 22, 'Food and Beverages', 'Free Lunch, Coffee Stand, Full Buffet Dinner', 35000.00, 1),
(0, 22, 'Transporation', 'Free Limosin Offer', 25000.00, 2),
(0, 22, 'Photo and Video', 'Same Day Edit (SDE), Free USB, Photobooth, Photoshoot, Scheduled Prenup', 25000.00, 3),
(0, 23, 'Food and Beverages', 'Premium Large Size Buffet, Free Snacks, Full-blown Lunch, Golden Dinner', 120000.00, 0),
(0, 23, 'Photo and Video', 'IMAX Equipments, High-resolution Edits, Multiple Same Edits, Multiple Photo and Video Booth, Drone Shots, Special Video Director', 50000.00, 1),
(0, 23, 'Transporation', 'White Lamborghini Aventador, Free Cars for the main family', 300000.00, 2),
(0, 23, 'Entertainment', 'Special Guess, Magic Performance, Live Band, Sing a long (Unlimited Hours)', 250000.00, 3),
(0, 24, 'Food', '', 12000.00, 0),
(0, 25, 'Test', '', 12000.00, 0),
(0, 25, 'test 2', '', 23000.00, 1),
(0, 26, 'Entertainment', 'Magic Show, Bubble parades, Kids show, Adults show', 25000.00, 0),
(0, 26, 'Photo & Video', 'Drone shot, Photobooth, Same day edit (SDE)', 10000.00, 1),
(0, 26, 'Transportation', 'Limosin with Flowers', 20000.00, 2),
(0, 26, 'Decoration', 'Flowers & Fragrants', 85000.00, 3),
(0, 26, 'Event Organizer', '', 25000.00, 4),
(0, 26, 'Venue Free', 'Venue of your choice', 50000.00, 5);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_package_event_types`
--

CREATE TABLE `tbl_package_event_types` (
  `id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `event_type_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_package_event_types`
--

INSERT INTO `tbl_package_event_types` (`id`, `package_id`, `event_type_id`) VALUES
(21, 14, 1),
(20, 14, 5),
(22, 15, 1),
(23, 15, 5),
(28, 18, 2),
(29, 18, 5),
(31, 19, 2),
(30, 19, 5),
(32, 20, 2),
(34, 20, 4),
(33, 20, 5),
(0, 0, 5),
(0, 0, 5),
(0, 0, 5),
(0, 0, 5),
(0, 0, 5),
(0, 0, 5),
(0, 0, 5),
(0, 0, 5),
(0, 0, 5),
(0, 22, 3),
(0, 23, 1),
(0, 24, 10),
(0, 25, 1),
(0, 26, 2),
(0, 26, 5);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_package_freebies`
--

CREATE TABLE `tbl_package_freebies` (
  `freebie_id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `freebie_name` varchar(255) NOT NULL,
  `freebie_description` text DEFAULT NULL,
  `freebie_value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `display_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_package_freebies`
--

INSERT INTO `tbl_package_freebies` (`freebie_id`, `package_id`, `freebie_name`, `freebie_description`, `freebie_value`, `display_order`) VALUES
(22, 14, 'Robe for Bride', '', 0.00, 0),
(23, 14, 'Manikin', '', 0.00, 1),
(24, 14, 'Loose Petals', '', 0.00, 2),
(25, 14, 'Cord, Veil, Cushion', '', 0.00, 3),
(26, 14, '2 Prenup Attire', '', 0.00, 4),
(27, 14, 'Kakanin Station', '', 0.00, 5),
(28, 15, 'Robe for Bride', '', 0.00, 0),
(29, 15, 'Robe for Female Entourage', '', 0.00, 1),
(30, 15, 'Manikin', '', 0.00, 2),
(31, 15, 'Loose Petals', '', 0.00, 3),
(32, 15, 'Cord, Veil and Cushion', '', 0.00, 4),
(33, 15, 'Prenup Hair and Make up', '', 0.00, 5),
(34, 15, '2 Sets of Prenup Attire', '', 0.00, 6),
(35, 15, 'Wine for Toasting', '', 0.00, 7),
(36, 15, 'Kakanin Station', '', 0.00, 8),
(37, 15, 'Party Poppers', '', 0.00, 9),
(41, 18, 'Anniversary Cake', '', 0.00, 0),
(42, 18, 'Giveaways', '', 0.00, 1),
(43, 18, 'Toys', '', 0.00, 2),
(44, 18, 'Picture frames', '', 0.00, 3),
(45, 19, 'Welcome Signage', '', 0.00, 0),
(46, 19, 'Customized Guestbook', '', 0.00, 1),
(47, 19, 'Photobooth', '', 0.00, 2),
(48, 19, 'Complimentary Overnight Stay', '', 0.00, 3),
(49, 19, 'Cake Topper Upgrade', '', 0.00, 4),
(50, 19, 'Couple Gift Set', '', 0.00, 5),
(51, 19, 'Mood Lights Upgrade', '', 0.00, 6),
(52, 19, 'Balloon Arch or Entrance Decor', '', 0.00, 7),
(53, 19, 'Sparkular / Cold Pyro Effect', '', 0.00, 8),
(54, 19, 'Free Use of Mobile Bar', '', 0.00, 9),
(55, 19, 'E-Invitation Layout', '', 0.00, 10),
(56, 19, 'Soundtrack Playlist Compilation', '', 0.00, 11),
(57, 19, 'Coordinator', '', 0.00, 12),
(58, 19, 'Event Signages', '', 0.00, 13),
(59, 19, 'Token Gift for Guests', '', 0.00, 14),
(60, 19, 'Backdrop Upgrade', '', 0.00, 15),
(61, 20, 'Free 1', '', 0.00, 0),
(62, 20, 'Free 2', '', 0.00, 1),
(0, 22, 'Complimentary Bottle Champagne', '', 0.00, 0),
(0, 22, 'Free Accomodation', '', 0.00, 1),
(0, 22, 'Giveaway', '', 0.00, 2),
(0, 22, 'Free Invitation Cards', '', 0.00, 3),
(0, 23, 'Golden Quoted Invitation Cards', '', 0.00, 0),
(0, 23, 'Free Master King Bedroom', '', 0.00, 1),
(0, 23, 'Free Food Stands', '', 0.00, 2),
(0, 23, 'All-in access to all areas', '', 0.00, 3),
(0, 23, 'Golden Confetti', '', 0.00, 4),
(0, 23, 'Free Room Accommodation', '', 0.00, 5),
(0, 23, 'Free Breakfast for Couples', '', 0.00, 6),
(0, 24, 'Flashdrive', '', 0.00, 0),
(0, 24, 'Test', '', 0.00, 1),
(0, 25, 'Test', '', 0.00, 0),
(0, 25, 'test 2', '', 0.00, 1),
(0, 26, 'Gift cards', '', 0.00, 0),
(0, 26, 'Floral Gowns', '', 0.00, 1),
(0, 26, 'Giveaways', '', 0.00, 2),
(0, 26, 'Invitation cards', '', 0.00, 3),
(0, 26, 'Flashdrive', '', 0.00, 4),
(0, 26, 'Photo hardcopies', '', 0.00, 5);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_package_price_history`
--

CREATE TABLE `tbl_package_price_history` (
  `history_id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `old_price` decimal(10,2) NOT NULL,
  `new_price` decimal(10,2) NOT NULL,
  `changed_by` int(11) NOT NULL,
  `change_reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_package_venues`
--

CREATE TABLE `tbl_package_venues` (
  `id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `venue_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_package_venues`
--

INSERT INTO `tbl_package_venues` (`id`, `package_id`, `venue_id`, `created_at`) VALUES
(13, 14, 29, '2025-06-14 12:04:28'),
(14, 14, 30, '2025-06-14 12:04:28'),
(15, 15, 29, '2025-06-14 12:15:37'),
(16, 15, 30, '2025-06-14 12:15:37'),
(21, 18, 30, '2025-07-07 20:03:29'),
(22, 18, 29, '2025-07-07 20:03:29'),
(23, 19, 29, '2025-07-08 04:14:11'),
(24, 19, 30, '2025-07-08 04:14:11'),
(25, 20, 34, '2025-07-09 12:31:40'),
(26, 20, 29, '2025-07-09 12:31:40'),
(27, 20, 30, '2025-07-09 12:31:40'),
(0, 0, 34, '2025-07-18 06:11:37'),
(0, 0, 34, '2025-07-18 06:11:42'),
(0, 0, 34, '2025-07-18 06:11:43'),
(0, 0, 34, '2025-07-18 06:11:44'),
(0, 0, 34, '2025-07-18 06:11:44'),
(0, 0, 34, '2025-07-18 06:11:46'),
(0, 0, 34, '2025-07-18 06:11:47'),
(0, 0, 34, '2025-07-18 06:11:47'),
(0, 0, 34, '2025-07-18 06:11:48'),
(0, 22, 29, '2025-07-19 04:33:33'),
(0, 22, 30, '2025-07-19 04:33:33'),
(0, 22, 34, '2025-07-19 04:33:33'),
(0, 23, 0, '2025-07-19 04:49:08'),
(0, 23, 34, '2025-07-19 04:49:08'),
(0, 23, 30, '2025-07-19 04:49:08'),
(0, 23, 29, '2025-07-19 04:49:08'),
(0, 24, 29, '2025-08-30 07:24:34'),
(0, 24, 1, '2025-08-30 07:24:34'),
(0, 24, 34, '2025-08-30 07:24:34'),
(0, 24, 30, '2025-08-30 07:24:34'),
(0, 25, 1, '2025-09-01 18:36:28'),
(0, 25, 34, '2025-09-01 18:36:28'),
(0, 25, 29, '2025-09-01 18:36:28'),
(0, 26, 1, '2025-09-23 08:27:39'),
(0, 26, 29, '2025-09-23 08:27:39'),
(0, 26, 35, '2025-09-23 08:27:39');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_payments`
--

CREATE TABLE `tbl_payments` (
  `payment_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `schedule_id` int(11) DEFAULT NULL,
  `client_id` int(11) NOT NULL,
  `payment_method` enum('cash','gcash','bank-transfer','credit-card','check','online-banking') NOT NULL,
  `payment_amount` decimal(12,2) NOT NULL,
  `payment_notes` text DEFAULT NULL,
  `payment_percentage` decimal(5,2) DEFAULT NULL COMMENT 'Percentage of total if this is a partial payment',
  `payment_status` enum('pending','processing','completed','failed','cancelled','refunded') NOT NULL DEFAULT 'pending',
  `payment_date` date NOT NULL,
  `payment_reference` varchar(255) DEFAULT NULL COMMENT 'Reference number for bank transfers, GCash, etc.',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `payment_attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'JSON array of payment proof files (receipts, screenshots, etc.)' CHECK (json_valid(`payment_attachments`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_payments`
--

INSERT INTO `tbl_payments` (`payment_id`, `event_id`, `schedule_id`, `client_id`, `payment_method`, `payment_amount`, `payment_notes`, `payment_percentage`, `payment_status`, `payment_date`, `payment_reference`, `created_at`, `updated_at`, `payment_attachments`) VALUES
(1, 28, NULL, 15, 'gcash', 149000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-06-25', '12312312312', '2025-06-25 08:26:36', '2025-06-25 08:26:36', NULL),
(2, 29, NULL, 15, 'bank-transfer', 147000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-06-25', '123234', '2025-06-25 09:10:39', '2025-06-25 09:10:39', NULL),
(3, 30, NULL, 15, 'gcash', 125000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-06-26', '13123123', '2025-06-26 07:17:02', '2025-06-26 07:17:02', NULL),
(4, 31, NULL, 15, 'gcash', 82000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-06-26', '12312', '2025-06-26 08:36:53', '2025-06-26 08:36:53', NULL),
(5, 32, NULL, 15, 'gcash', 149000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-06-26', 'sdfsdf', '2025-06-26 08:39:30', '2025-06-26 08:39:30', NULL),
(6, 33, NULL, 15, 'gcash', 149000.00, 'Initial down payment for event creation [CANCELLED: Duplicate reference detected during migration]', NULL, 'cancelled', '2025-06-26', 'sdfsdf', '2025-06-26 08:50:59', '2025-07-22 02:14:16', NULL),
(7, 34, NULL, 15, 'gcash', 147000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-06-26', '567567', '2025-06-26 10:40:27', '2025-06-26 10:40:27', NULL),
(8, 40, NULL, 5, 'gcash', 149000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-01', '12333212123', '2025-07-01 10:40:11', '2025-07-01 10:40:11', '[{\"file_name\":\"1751366367_6863badfcb9f2.pdf\",\"original_name\":\"Case 1.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1751366367_6863badfcb9f2.pdf\",\"file_size\":883804,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for gcash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-01 12:40:11\"}]'),
(9, 41, NULL, 5, 'bank-transfer', 253300.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-01', '8234908149082390823', '2025-07-01 10:45:50', '2025-07-01 10:45:50', '[{\"file_name\":\"1751366730_6863bc4a46a8b.pdf\",\"original_name\":\"User_Involvement_Case_Study_Summary.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1751366730_6863bc4a46a8b.pdf\",\"file_size\":2340,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for bank-transfer payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-01 12:45:50\"}]'),
(10, 42, NULL, 15, 'cash', 208600.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-02', NULL, '2025-07-02 00:10:56', '2025-07-02 00:10:56', '[{\"file_name\":\"1751415039_686478ff50a1d.webp\",\"original_name\":\"1_vRf6wpV1rRbRLGOcJqnU1A.webp\",\"file_path\":\"uploads\\/payment_proofs\\/1751415039_686478ff50a1d.webp\",\"file_size\":8458,\"file_type\":\"image\\/webp\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-07-02 02:10:56\"},{\"file_name\":\"1751415040_68647900d8b76.pdf\",\"original_name\":\"User_Involvement_Case_Study_Summary.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1751415040_68647900d8b76.pdf\",\"file_size\":2340,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-02 02:10:56\"}]'),
(11, 43, NULL, 15, 'gcash', 212500.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-02', '123123123123', '2025-07-02 06:29:36', '2025-07-02 06:29:36', '[{\"file_name\":\"1751437773_6864d1cdc4655.pdf\",\"original_name\":\"User_Involvement_Case_Study_Summary.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1751437773_6864d1cdc4655.pdf\",\"file_size\":2340,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for gcash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-02 08:29:36\"}]'),
(12, 44, NULL, 15, 'gcash', 62500.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-02', '1231231231231231231231', '2025-07-02 06:55:23', '2025-07-02 06:55:23', '[{\"file_name\":\"1751439316_6864d7d4aad48.pdf\",\"original_name\":\"User_Involvement_Case_Study_Summary.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1751439316_6864d7d4aad48.pdf\",\"file_size\":2340,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for gcash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-02 08:55:23\"}]'),
(13, 45, NULL, 15, 'gcash', 212500.00, 'Initial down payment for event creation [CANCELLED: Duplicate reference detected during migration]', NULL, 'cancelled', '2025-07-02', '1231231231231231231231', '2025-07-02 13:20:50', '2025-07-22 02:14:16', '[{\"file_name\":\"1751462449_686532316c7d1.png\",\"original_name\":\"image_2025-07-02_212049403.png\",\"file_path\":\"uploads\\/payment_proofs\\/1751462449_686532316c7d1.png\",\"file_size\":43446,\"file_type\":\"image\\/png\",\"description\":\"Payment proof for gcash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-07-02 15:20:50\"}]'),
(14, 41, NULL, 5, 'cash', 44700.00, '', NULL, 'completed', '2025-07-02', '', '2025-07-02 15:13:26', '2025-07-02 15:13:26', NULL),
(15, 42, NULL, 15, 'cash', 89400.00, '', NULL, 'completed', '2025-07-02', '', '2025-07-02 15:19:54', '2025-07-03 01:00:36', NULL),
(16, 46, NULL, 15, 'gcash', 187499.99, 'Initial down payment for event creation', NULL, 'completed', '2025-07-07', '31212131233123123', '2025-07-07 20:04:55', '2025-07-07 20:04:55', '[{\"file_name\":\"1751918693_686c286577d9d.pdf\",\"original_name\":\"analysis gamon.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1751918693_686c286577d9d.pdf\",\"file_size\":61531,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for gcash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-07 22:04:55\"}]'),
(17, 47, NULL, 15, 'cash', 187500.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-08', NULL, '2025-07-08 04:17:11', '2025-07-08 04:17:11', '[{\"file_name\":\"1751948226_686c9bc281c60.pdf\",\"original_name\":\"analysis gamon.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1751948226_686c9bc281c60.pdf\",\"file_size\":61531,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-08 06:17:11\"}]'),
(18, 47, NULL, 15, 'cash', 62500.00, '', NULL, 'completed', '2025-07-08', '', '2025-07-08 04:18:45', '2025-07-08 04:18:45', '[{\"filename\":\"1751948325_686c9c256e021.docx\",\"original_name\":\"Document1.docx\",\"description\":\"\",\"file_size\":133331,\"file_type\":\"docx\",\"uploaded_at\":\"2025-07-08 06:18:45\"}]'),
(19, 48, NULL, 20, 'cash', 212500.00, 'Initial down payment for event creation [CANCELLED: Ghost payment detected - keeping latest payment only]', NULL, 'cancelled', '2025-07-09', NULL, '2025-07-09 12:22:19', '2025-08-03 08:15:36', '[{\"file_name\":\"1752063718_686e5ee632d8c.pdf\",\"original_name\":\"Document1.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1752063718_686e5ee632d8c.pdf\",\"file_size\":940474,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-09 14:22:19\"},{\"file_name\":\"1752063728_686e5ef07b2b2.pdf\",\"original_name\":\"milestone_1_filled_followed_format.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1752063728_686e5ef07b2b2.pdf\",\"file_size\":79021,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-09 14:22:19\"}]'),
(20, 48, NULL, 20, 'cash', 37500.00, ' [CANCELLED: Ghost payment detected - keeping latest payment only]', NULL, 'cancelled', '2025-07-09', '', '2025-07-09 12:25:24', '2025-08-03 08:15:36', '[{\"filename\":\"1752063924_686e5fb42951a.docx\",\"original_name\":\"Document1.docx\",\"description\":\"\",\"file_size\":409700,\"file_type\":\"docx\",\"uploaded_at\":\"2025-07-09 14:25:24\"}]'),
(21, 57, NULL, 15, 'cash', 125000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-10', NULL, '2025-07-10 17:42:14', '2025-07-10 17:42:14', '[{\"file_name\":\"1752169333_686ffb7540559.pdf\",\"original_name\":\"SMC_Key_Executives_and_Heritage_Leaders_Updated.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1752169333_686ffb7540559.pdf\",\"file_size\":3191,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-10 19:42:14\"}]'),
(22, 58, NULL, 20, 'bank-transfer', 400000.00, 'Initial down payment for event creation [CANCELLED: Duplicate reference detected during migration]', NULL, 'cancelled', '2025-07-11', '1231231231231231231231', '2025-07-11 03:45:10', '2025-07-22 02:14:16', '[{\"file_name\":\"1752205501_687088bd8db11.pdf\",\"original_name\":\"SMC_Customer_Relationships_and_Channels.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1752205501_687088bd8db11.pdf\",\"file_size\":1688,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for bank-transfer payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-11 05:45:10\"}]'),
(23, 1, NULL, 20, 'cash', 153300.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-16', NULL, '2025-07-16 16:37:10', '2025-07-16 16:37:10', '[{\"file_name\":\"1752683822_6877d52e06bbb.pdf\",\"original_name\":\"SMC_Key_Executives_and_Heritage_Leaders_Updated.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1752683822_6877d52e06bbb.pdf\",\"file_size\":3191,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-16 18:37:10\"}]'),
(24, 2, NULL, 23, 'cash', 282150.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-16', NULL, '2025-07-16 18:19:46', '2025-07-16 18:19:46', '[{\"file_name\":\"1752689982_6877ed3ec5d9f.pdf\",\"original_name\":\"SMC_Customer_Relationships_and_Channels.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1752689982_6877ed3ec5d9f.pdf\",\"file_size\":1688,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-16 20:19:46\"}]'),
(25, 3, NULL, 23, 'cash', 153850.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-17', NULL, '2025-07-17 03:40:05', '2025-07-17 03:40:05', '[{\"file_name\":\"1752723601_68787091263e9.pdf\",\"original_name\":\"SMC_Key_Executives_and_Heritage_Leaders_Updated.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1752723601_68787091263e9.pdf\",\"file_size\":3191,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-17 05:40:05\"}]'),
(26, 4, NULL, 21, 'cash', 94000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-17', NULL, '2025-07-17 05:46:14', '2025-07-17 05:46:14', '[{\"file_name\":\"1752731171_68788e235cdba.pdf\",\"original_name\":\"SMC_Key_Executives_and_Heritage_Leaders_Updated.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1752731171_68788e235cdba.pdf\",\"file_size\":3191,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-17 07:46:14\"}]'),
(27, 5, NULL, 29, 'cash', 45000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-17', NULL, '2025-07-17 06:10:22', '2025-07-17 06:10:22', '[{\"file_name\":\"1752732620_687893cc2dba9.pdf\",\"original_name\":\"SMC_Customer_Relationships_and_Channels.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1752732620_687893cc2dba9.pdf\",\"file_size\":1688,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-17 08:10:22\"}]'),
(28, 6, NULL, 29, 'cash', 123250.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-17', NULL, '2025-07-17 15:16:52', '2025-07-17 15:16:52', '[{\"file_name\":\"1752765099_687912abe934f.pdf\",\"original_name\":\"Document1.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1752765099_687912abe934f.pdf\",\"file_size\":940474,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-17 17:16:52\"}]'),
(29, 7, NULL, 23, 'cash', 130900.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-17', NULL, '2025-07-17 15:53:10', '2025-07-17 15:53:10', '[{\"file_name\":\"1752767586_68791c623c16b.pdf\",\"original_name\":\"SMC_Key_Executives_and_Heritage_Leaders.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1752767586_68791c623c16b.pdf\",\"file_size\":2895,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-17 17:53:10\"}]'),
(30, 8, NULL, 20, 'cash', 8633450.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-17', NULL, '2025-07-17 16:14:22', '2025-07-17 16:14:22', '[{\"file_name\":\"1752768861_6879215da77a1.pdf\",\"original_name\":\"analysis gamon.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1752768861_6879215da77a1.pdf\",\"file_size\":61531,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-17 18:14:22\"}]'),
(31, 9, NULL, 29, 'cash', 613600.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-17', NULL, '2025-07-17 16:54:53', '2025-07-17 16:54:53', '[{\"file_name\":\"1752770220_687926ac0b68e.pdf\",\"original_name\":\"SMC_Customer_Relationships_and_Channels.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1752770220_687926ac0b68e.pdf\",\"file_size\":1688,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-17 18:54:53\"}]'),
(32, 10, NULL, 29, 'cash', 37600.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-18', NULL, '2025-07-18 06:56:14', '2025-07-18 06:56:14', '[{\"file_name\":\"1752818720_6879e420bda47.pdf\",\"original_name\":\"SMC_Customer_Relationships_and_Channels.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1752818720_6879e420bda47.pdf\",\"file_size\":1688,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-18 08:56:14\"}]'),
(33, 11, NULL, 21, 'cash', 91000.00, 'Initial down payment for event creation [AUTO-CANCELLED: Duplicate payment detected]', NULL, 'cancelled', '2025-07-18', NULL, '2025-07-18 07:44:00', '2025-08-03 08:06:30', '[{\"file_name\":\"1752824634_6879fb3a4a38e.pdf\",\"original_name\":\"SMC_Customer_Relationships_and_Channels.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1752824634_6879fb3a4a38e.pdf\",\"file_size\":1688,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-18 09:44:00\"}]'),
(34, 11, NULL, 21, 'cash', 91000.00, '', NULL, 'completed', '2025-07-18', '', '2025-07-18 08:24:20', '2025-07-18 08:24:20', '[{\"filename\":\"1752827060_687a04b4e374c.pdf\",\"original_name\":\"SMC_Customer_Relationships_and_Channels.pdf\",\"description\":\"\",\"file_size\":1688,\"file_type\":\"pdf\",\"uploaded_at\":\"2025-07-18 10:24:20\"}]'),
(35, 12, NULL, 30, 'cash', 176800.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-19', NULL, '2025-07-19 03:10:50', '2025-07-19 03:10:50', '[{\"file_name\":\"1752894648_687b0cb8053bf.pdf\",\"original_name\":\"SMC_Customer_Relationships_and_Channels.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1752894648_687b0cb8053bf.pdf\",\"file_size\":1688,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-19 05:10:50\"}]'),
(36, 13, NULL, 20, 'cash', 385000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-19', NULL, '2025-07-19 04:50:36', '2025-07-19 04:50:36', NULL),
(37, 31, NULL, 29, 'cash', 84084.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-21', NULL, '2025-07-21 18:38:01', '2025-07-21 18:38:01', '[{\"file_name\":\"1753122348_687e862c419cd.jpg\",\"original_name\":\"dd352a67-1871-48b0-96b9-17862c1e1d1b.jpg\",\"file_path\":\"uploads\\/payment_proofs\\/1753122348_687e862c419cd.jpg\",\"file_size\":393207,\"file_type\":\"image\\/jpeg\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-07-21 20:38:01\"}]'),
(38, 32, NULL, 29, 'cash', 120750.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-22', NULL, '2025-07-22 01:05:43', '2025-07-22 01:05:43', '[{\"file_name\":\"1753146341_687ee3e5e9cc8.pdf\",\"original_name\":\"SMC_Key_Executives_and_Heritage_Leaders_Updated.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1753146341_687ee3e5e9cc8.pdf\",\"file_size\":3191,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-22 03:05:43\"}]'),
(39, 33, NULL, 23, 'cash', 96000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-22', NULL, '2025-07-22 01:10:54', '2025-07-22 01:10:54', '[{\"file_name\":\"1753146653_687ee51d9832d.pdf\",\"original_name\":\"SMC_Key_Executives_and_Heritage_Leaders.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1753146653_687ee51d9832d.pdf\",\"file_size\":2895,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-22 03:10:54\"}]'),
(40, 35, NULL, 20, 'cash', 309000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-22', NULL, '2025-07-22 02:19:13', '2025-07-22 02:19:13', '[{\"file_name\":\"1753150752_687ef5207f58b.pdf\",\"original_name\":\"milestone_1_filled_followed_format.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1753150752_687ef5207f58b.pdf\",\"file_size\":79021,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-22 04:19:13\"}]'),
(41, 35, NULL, 20, 'cash', 103000.00, '', NULL, 'completed', '2025-07-22', '', '2025-07-22 02:20:25', '2025-07-22 02:20:25', '[{\"filename\":\"1753150825_687ef569952b8.jpg\",\"original_name\":\"dd352a67-1871-48b0-96b9-17862c1e1d1b.jpg\",\"description\":\"\",\"file_size\":393207,\"file_type\":\"jpg\",\"uploaded_at\":\"2025-07-22 04:20:25\"}]'),
(42, 36, NULL, 21, 'cash', 41500.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-22', NULL, '2025-07-22 06:36:36', '2025-07-22 06:36:36', '[{\"file_name\":\"1753166193_687f31719592e.jpg\",\"original_name\":\"photo_2025-07-14_02-36-40 (2).jpg\",\"file_path\":\"uploads\\/payment_proofs\\/1753166193_687f31719592e.jpg\",\"file_size\":74110,\"file_type\":\"image\\/jpeg\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-07-22 08:36:36\"}]'),
(43, 37, NULL, 21, 'cash', 84500.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-23', NULL, '2025-07-23 07:25:44', '2025-07-23 07:25:44', '[{\"file_name\":\"1753255542_68808e76beef4.webp\",\"original_name\":\"jupiter-logo (1).webp\",\"file_path\":\"uploads\\/payment_proofs\\/1753255542_68808e76beef4.webp\",\"file_size\":1428,\"file_type\":\"image\\/webp\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-07-23 09:25:44\"}]'),
(44, 48, NULL, 21, 'cash', 40000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-08-03', NULL, '2025-08-03 07:53:36', '2025-08-03 07:53:36', '[{\"file_name\":\"1754207094_688f13765ee9a.jpg\",\"original_name\":\"gallery_section_upscaled.jpg\",\"file_path\":\"uploads\\/payment_proofs\\/1754207094_688f13765ee9a.jpg\",\"file_size\":336420,\"file_type\":\"image\\/jpeg\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-08-03 09:53:36\"}]'),
(45, 49, NULL, 29, 'cash', 202150.00, 'Initial down payment for event creation', NULL, 'completed', '2025-08-03', NULL, '2025-08-03 08:18:33', '2025-08-03 08:18:33', '[{\"file_name\":\"1754209107_688f1b5390838.jpg\",\"original_name\":\"gallery_section_upscaled.jpg\",\"file_path\":\"uploads\\/payment_proofs\\/1754209107_688f1b5390838.jpg\",\"file_size\":336420,\"file_type\":\"image\\/jpeg\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-08-03 10:18:33\"}]'),
(46, 50, NULL, 21, 'cash', 69500.00, 'Initial down payment for event creation', NULL, 'completed', '2025-08-08', NULL, '2025-08-08 17:16:58', '2025-08-08 17:16:58', '[{\"file_name\":\"1754673417_689631096f9d6.jpg\",\"original_name\":\"photo_2025-08-05_09-57-51.jpg\",\"file_path\":\"uploads\\/payment_proofs\\/1754673417_689631096f9d6.jpg\",\"file_size\":104757,\"file_type\":\"image\\/jpeg\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-08-08 19:16:58\"}]'),
(47, 36, NULL, 21, 'cash', 41500.00, 'Paid in cash sample', NULL, 'completed', '2025-08-09', '', '2025-08-09 02:43:41', '2025-08-09 02:43:41', '[{\"filename\":\"1754707421_6896b5dd2ed15.png\",\"original_name\":\"image_2025-08-09_104338371.png\",\"description\":\"Paid in cash sample\",\"file_size\":68013,\"file_type\":\"png\",\"uploaded_at\":\"2025-08-09 04:43:41\"}]'),
(48, 12, NULL, 30, 'gcash', 44200.00, '', NULL, 'completed', '2025-08-13', '99839292019', '2025-08-13 05:22:10', '2025-08-13 05:22:10', '[{\"filename\":\"1755062530_689c21026a43e.png\",\"original_name\":\"WHY A GREAT TEK THE NEXT GUD MEMECOIN ON BONK! (1).png\",\"description\":\"\",\"file_size\":962343,\"file_type\":\"png\",\"uploaded_at\":\"2025-08-13 07:22:10\"}]'),
(49, 59, NULL, 29, 'cash', 79000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-08-18', NULL, '2025-08-18 16:09:28', '2025-08-18 16:09:28', '[{\"file_name\":\"1755532788_68a34df48ea97.jpg\",\"original_name\":\"Gxn2g-baMAA6Xpr.jpg\",\"file_path\":\"uploads\\/payment_proofs\\/1755532788_68a34df48ea97.jpg\",\"file_size\":128416,\"file_type\":\"image\\/jpeg\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-08-18 18:09:28\"}]'),
(50, 60, NULL, 20, 'cash', 75000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-08-18', NULL, '2025-08-18 16:14:58', '2025-08-18 16:14:58', '[{\"file_name\":\"1755533461_68a35095dd073.jpg\",\"original_name\":\"Gxn2g-baMAA6Xpr.jpg\",\"file_path\":\"uploads\\/payment_proofs\\/1755533461_68a35095dd073.jpg\",\"file_size\":128416,\"file_type\":\"image\\/jpeg\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-08-18 18:14:58\"}]'),
(51, 61, NULL, 21, 'cash', 26000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-08-19', NULL, '2025-08-19 16:22:23', '2025-08-19 16:22:23', '[{\"file_name\":\"1755620542_68a4a4be6c908.jpg\",\"original_name\":\"Gxn2g-baMAA6Xpr.jpg\",\"file_path\":\"uploads\\/payment_proofs\\/1755620542_68a4a4be6c908.jpg\",\"file_size\":128416,\"file_type\":\"image\\/jpeg\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-08-19 18:22:23\"}]'),
(52, 62, NULL, 5, 'cash', 65000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-08-20', NULL, '2025-08-20 04:35:17', '2025-08-20 04:35:17', '[{\"file_name\":\"1755664516_68a55084c5016.jpg\",\"original_name\":\"GxmDg_0akAAWmOP.jpg\",\"file_path\":\"uploads\\/payment_proofs\\/1755664516_68a55084c5016.jpg\",\"file_size\":103752,\"file_type\":\"image\\/jpeg\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-08-20 06:35:17\"}]'),
(53, 63, NULL, 21, 'cash', 159000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-08-30', NULL, '2025-08-30 04:34:47', '2025-08-30 04:34:47', '[{\"file_name\":\"1756528486_68b27f66346a1.pdf\",\"original_name\":\"money attachment.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1756528486_68b27f66346a1.pdf\",\"file_size\":572541,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-08-30 06:34:47\"}]'),
(54, 64, NULL, 20, 'cash', 42750.00, 'Initial down payment for event creation', NULL, 'completed', '2025-08-30', NULL, '2025-08-30 07:44:02', '2025-08-30 07:44:02', '[{\"file_name\":\"1756539839_68b2abbf59230.pdf\",\"original_name\":\"money attachment.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1756539839_68b2abbf59230.pdf\",\"file_size\":572541,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-08-30 09:44:02\"}]'),
(55, 65, NULL, 30, 'cash', 81000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-08-30', NULL, '2025-08-30 08:25:58', '2025-08-30 08:25:58', '[{\"file_name\":\"1756542246_68b2b526b2d90.pdf\",\"original_name\":\"money attachment.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1756542246_68b2b526b2d90.pdf\",\"file_size\":572541,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-08-30 10:25:58\"}]'),
(56, 61, NULL, 21, 'gcash', 26000.00, '', NULL, 'completed', '2025-09-08', '2131233423423', '2025-09-08 17:43:07', '2025-09-08 17:43:07', '[{\"filename\":\"1757353387_68bf15ab190e0.png\",\"original_name\":\"Gemini_Generated_Image_p2tivp2tivp2tivp.png\",\"description\":\"\",\"file_size\":1036276,\"file_type\":\"png\",\"uploaded_at\":\"2025-09-08 19:43:07\"}]'),
(57, 66, NULL, 23, 'cash', 112000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-09-10', NULL, '2025-09-09 23:01:51', '2025-09-09 23:01:51', '[{\"file_name\":\"1757458910_68c0b1de4256d.jpg\",\"original_name\":\"5b22c2c9-0744-4df9-b91f-a46043193dff.jpg\",\"file_path\":\"uploads\\/payment_proofs\\/1757458910_68c0b1de4256d.jpg\",\"file_size\":335979,\"file_type\":\"image\\/jpeg\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-09-10 01:01:51\"}]'),
(58, 60, NULL, 20, 'bank-transfer', 75000.00, '', NULL, 'completed', '2025-09-11', '', '2025-09-11 00:37:42', '2025-09-11 00:37:42', '[{\"filename\":\"1757551062_68c219d6a2c73.jpg\",\"original_name\":\"5b22c2c9-0744-4df9-b91f-a46043193dff.jpg\",\"description\":\"\",\"file_size\":335979,\"file_type\":\"jpg\",\"uploaded_at\":\"2025-09-11 02:37:42\"}]'),
(59, 67, NULL, 30, 'cash', 253500.00, 'Initial down payment for event creation', NULL, 'completed', '2025-09-11', NULL, '2025-09-11 06:01:51', '2025-09-11 06:01:51', '[{\"file_name\":\"1757570506_68c265ca38dc2.jpg\",\"original_name\":\"5b22c2c9-0744-4df9-b91f-a46043193dff.jpg\",\"file_path\":\"uploads\\/payment_proofs\\/1757570506_68c265ca38dc2.jpg\",\"file_size\":335979,\"file_type\":\"image\\/jpeg\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-09-11 08:01:51\"}]'),
(60, 68, NULL, 30, 'cash', 139000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-09-11', NULL, '2025-09-11 06:10:22', '2025-09-11 06:10:22', '[{\"file_name\":\"1757571020_68c267cc6536d.jpg\",\"original_name\":\"5b22c2c9-0744-4df9-b91f-a46043193dff.jpg\",\"file_path\":\"uploads\\/payment_proofs\\/1757571020_68c267cc6536d.jpg\",\"file_size\":335979,\"file_type\":\"image\\/jpeg\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-09-11 08:10:22\"}]'),
(61, 69, NULL, 30, 'gcash', 22500.00, 'Initial down payment for event creation', NULL, 'completed', '2025-09-13', '2342342', '2025-09-13 05:25:59', '2025-09-13 05:25:59', NULL),
(62, 70, NULL, 20, 'gcash', 16000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-09-22', '123123123', '2025-09-22 06:59:23', '2025-09-22 06:59:23', '[{\"file_name\":\"1758524357_68d0f3c56c079.png\",\"original_name\":\"Philippine_Peso_PHP\\u20b11000_Bank_Note.png\",\"file_path\":\"uploads\\/payment_proofs\\/1758524357_68d0f3c56c079.png\",\"file_size\":802364,\"file_type\":\"image\\/png\",\"description\":\"Payment proof for gcash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-09-22 08:59:23\"}]'),
(63, 70, NULL, 20, 'gcash', 16000.00, '', NULL, 'completed', '2025-09-22', '324234234', '2025-09-22 07:45:10', '2025-09-22 07:45:10', '[{\"filename\":\"1758527110_68d0fe8673c28.png\",\"original_name\":\"2025_09_18_19_19_IMG_9492.PNG\",\"description\":\"\",\"file_size\":892101,\"file_type\":\"png\",\"uploaded_at\":\"2025-09-22 09:45:10\"}]');

--
-- Triggers `tbl_payments`
--
DELIMITER $$
CREATE TRIGGER `notify_on_payment_create` AFTER INSERT ON `tbl_payments` FOR EACH ROW BEGIN
    DECLARE admin_id INT;
    DECLARE done INT DEFAULT FALSE;
    DECLARE event_title VARCHAR(255);
    DECLARE admin_cursor CURSOR FOR
        SELECT user_id FROM tbl_users WHERE user_role = 'admin';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Get event title
    SELECT event_title INTO event_title FROM tbl_events WHERE event_id = NEW.event_id;

    -- Notify client about payment submission
    CALL CreateNotification(
        NEW.client_id,
        'payment_created',
        'Payment Submitted',
        CONCAT('Your payment of ₱', FORMAT(NEW.payment_amount, 2), ' for "', COALESCE(event_title, 'your event'), '" has been submitted and is pending admin confirmation.'),
        'medium',
        'credit-card',
        CONCAT('/client/payments/', NEW.payment_id),
        NEW.event_id, NULL, NULL, NULL, NULL, NULL, 48
    );

    -- Notify admins about new payment
    OPEN admin_cursor;
    admin_loop: LOOP
        FETCH admin_cursor INTO admin_id;
        IF done THEN
            LEAVE admin_loop;
        END IF;

        CALL CreateNotification(
            admin_id,
            'payment_created',
            'New Payment Received',
            CONCAT('New payment of ₱', FORMAT(NEW.payment_amount, 2), ' received for "', COALESCE(event_title, 'event'), '" requiring confirmation.'),
            'high',
            'dollar-sign',
            CONCAT('/admin/payments/', NEW.payment_id),
            NEW.event_id, NULL, NULL, NULL, NULL, NULL, 72
        );
    END LOOP;
    CLOSE admin_cursor;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_on_payment_status_change` AFTER UPDATE ON `tbl_payments` FOR EACH ROW BEGIN
    DECLARE notification_title VARCHAR(255);
    DECLARE notification_message TEXT;
    DECLARE notification_type VARCHAR(50);
    DECLARE notification_icon VARCHAR(50);
    DECLARE event_title VARCHAR(255);

    -- Only proceed if status actually changed
    IF OLD.payment_status != NEW.payment_status THEN

        -- Get event title
        SELECT event_title INTO event_title FROM tbl_events WHERE event_id = NEW.event_id;

        CASE NEW.payment_status
            WHEN 'completed' THEN
                SET notification_type = 'payment_confirmed';
                SET notification_title = 'Payment Confirmed';
                SET notification_message = CONCAT('Your payment of ₱', FORMAT(NEW.payment_amount, 2), ' for "', COALESCE(event_title, 'your event'), '" has been confirmed.');
                SET notification_icon = 'check-circle';

            WHEN 'failed' THEN
                SET notification_type = 'payment_rejected';
                SET notification_title = 'Payment Failed';
                SET notification_message = CONCAT('Your payment of ₱', FORMAT(NEW.payment_amount, 2), ' for "', COALESCE(event_title, 'your event'), '" has failed. Please contact support.');
                SET notification_icon = 'x-circle';

            WHEN 'cancelled' THEN
                SET notification_type = 'payment_rejected';
                SET notification_title = 'Payment Cancelled';
                SET notification_message = CONCAT('Your payment of ₱', FORMAT(NEW.payment_amount, 2), ' for "', COALESCE(event_title, 'your event'), '" has been cancelled.');
                SET notification_icon = 'x-circle';

            ELSE
                SET notification_type = 'general';
                SET notification_title = 'Payment Status Updated';
                SET notification_message = CONCAT('Your payment status has been updated to ', NEW.payment_status, '.');
                SET notification_icon = 'info';
        END CASE;

        -- Send notification to client
        CALL CreateNotification(
            NEW.client_id,
            notification_type,
            notification_title,
            notification_message,
            'high',
            notification_icon,
            CONCAT('/client/payments/', NEW.payment_id),
            NEW.event_id, NULL, NULL, NULL, NULL, NULL, 168
        );
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_payment_schedule_on_payment` AFTER INSERT ON `tbl_payments` FOR EACH ROW BEGIN
  DECLARE schedule_amount_due DECIMAL(12,2);
  DECLARE schedule_amount_paid DECIMAL(12,2);
  DECLARE total_event_paid DECIMAL(12,2);
  DECLARE event_total DECIMAL(12,2);

  -- If payment is linked to a schedule, update the schedule
  IF NEW.schedule_id IS NOT NULL AND NEW.payment_status = 'completed' THEN
    -- Update the payment schedule
    UPDATE tbl_event_payment_schedules
    SET amount_paid = amount_paid + NEW.payment_amount,
        payment_status = CASE
          WHEN amount_paid + NEW.payment_amount >= amount_due THEN 'paid'
          WHEN amount_paid + NEW.payment_amount > 0 THEN 'partial'
          ELSE 'pending'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE schedule_id = NEW.schedule_id;
  END IF;

  -- Update overall event payment status
  SELECT COALESCE(SUM(payment_amount), 0)
  INTO total_event_paid
  FROM tbl_payments
  WHERE event_id = NEW.event_id AND payment_status = 'completed';

  SELECT total_budget
  INTO event_total
  FROM tbl_events
  WHERE event_id = NEW.event_id;

  -- Update event payment status
  UPDATE tbl_events
  SET payment_status = CASE
    WHEN total_event_paid >= event_total THEN 'paid'
    WHEN total_event_paid > 0 THEN 'partial'
    ELSE 'pending'
  END
  WHERE event_id = NEW.event_id;

  -- Log the payment activity
  INSERT INTO tbl_payment_logs (event_id, schedule_id, payment_id, client_id, action_type, amount, reference_number, notes)
  VALUES (NEW.event_id, NEW.schedule_id, NEW.payment_id, NEW.client_id, 'payment_received', NEW.payment_amount, NEW.payment_reference, NEW.payment_notes);

END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_payment_schedule_on_payment_update` AFTER UPDATE ON `tbl_payments` FOR EACH ROW BEGIN
  DECLARE total_event_paid DECIMAL(12,2);
  DECLARE event_total DECIMAL(12,2);

  -- If payment status changed and is linked to a schedule
  IF NEW.schedule_id IS NOT NULL AND (OLD.payment_status != NEW.payment_status OR OLD.payment_amount != NEW.payment_amount) THEN
    -- Recalculate schedule payment status
    UPDATE tbl_event_payment_schedules eps
    SET amount_paid = (
      SELECT COALESCE(SUM(p.payment_amount), 0)
      FROM tbl_payments p
      WHERE p.schedule_id = eps.schedule_id AND p.payment_status = 'completed'
    ),
    payment_status = CASE
      WHEN (SELECT COALESCE(SUM(p.payment_amount), 0) FROM tbl_payments p WHERE p.schedule_id = eps.schedule_id AND p.payment_status = 'completed') >= eps.amount_due THEN 'paid'
      WHEN (SELECT COALESCE(SUM(p.payment_amount), 0) FROM tbl_payments p WHERE p.schedule_id = eps.schedule_id AND p.payment_status = 'completed') > 0 THEN 'partial'
      ELSE 'pending'
    END,
    updated_at = CURRENT_TIMESTAMP
    WHERE schedule_id = NEW.schedule_id;
  END IF;

  -- Update overall event payment status
  SELECT COALESCE(SUM(payment_amount), 0)
  INTO total_event_paid
  FROM tbl_payments
  WHERE event_id = NEW.event_id AND payment_status = 'completed';

  SELECT total_budget
  INTO event_total
  FROM tbl_events
  WHERE event_id = NEW.event_id;

  UPDATE tbl_events
  SET payment_status = CASE
    WHEN total_event_paid >= event_total THEN 'paid'
    WHEN total_event_paid > 0 THEN 'partial'
    ELSE 'pending'
  END
  WHERE event_id = NEW.event_id;

  -- Log the payment status change
  IF OLD.payment_status != NEW.payment_status THEN
    INSERT INTO tbl_payment_logs (event_id, schedule_id, payment_id, client_id, action_type, amount, reference_number, notes)
    VALUES (NEW.event_id, NEW.schedule_id, NEW.payment_id, NEW.client_id, 'payment_confirmed', NEW.payment_amount, NEW.payment_reference, CONCAT('Status changed from ', OLD.payment_status, ' to ', NEW.payment_status));
  END IF;

END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_payment_activity_logs`
--

CREATE TABLE `tbl_payment_activity_logs` (
  `id` int(11) NOT NULL,
  `payment_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` enum('created','updated','confirmed','rejected','refunded','proof_uploaded','proof_deleted') NOT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_payment_activity_logs`
--

INSERT INTO `tbl_payment_activity_logs` (`id`, `payment_id`, `user_id`, `action`, `old_status`, `new_status`, `amount`, `description`, `metadata`, `created_at`) VALUES
(1, 48, 30, 'created', NULL, 'completed', 44200.00, 'Payment of 44200 received via gcash for event ID 12', '{\"event_id\":12,\"payment_reference\":\"99839292019\",\"payment_date\":\"2025-08-13\"}', '2025-08-13 13:22:10'),
(2, 56, 21, 'created', NULL, 'completed', 26000.00, 'Payment of 26000 received via gcash for event ID 61', '{\"event_id\":61,\"payment_reference\":\"2131233423423\",\"payment_date\":\"2025-09-08\"}', '2025-09-09 01:43:07'),
(3, 58, 20, 'created', NULL, 'completed', 75000.00, 'Payment of 75000 received via bank-transfer for event ID 60', '{\"event_id\":60,\"payment_reference\":\"\",\"payment_date\":\"2025-09-11\"}', '2025-09-11 08:37:42'),
(4, 63, 20, 'created', NULL, 'completed', 16000.00, 'Payment of 16000 received via gcash for event ID 70', '{\"event_id\":70,\"payment_reference\":\"324234234\",\"payment_date\":\"2025-09-22\"}', '2025-09-22 15:45:10');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_payment_logs`
--

CREATE TABLE `tbl_payment_logs` (
  `log_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `schedule_id` int(11) DEFAULT NULL,
  `payment_id` int(11) DEFAULT NULL,
  `client_id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `action_type` enum('payment_received','payment_confirmed','payment_rejected','schedule_created','schedule_updated','reminder_sent') NOT NULL,
  `amount` decimal(12,2) DEFAULT NULL,
  `reference_number` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_payment_logs`
--

INSERT INTO `tbl_payment_logs` (`log_id`, `event_id`, `schedule_id`, `payment_id`, `client_id`, `admin_id`, `action_type`, `amount`, `reference_number`, `notes`, `created_at`) VALUES
(1, 28, NULL, 1, 15, NULL, 'payment_received', 149000.00, '12312312312', 'Initial down payment for event creation', '2025-06-25 08:26:36'),
(2, 29, NULL, 2, 15, NULL, 'payment_received', 147000.00, '123234', 'Initial down payment for event creation', '2025-06-25 09:10:39'),
(3, 30, NULL, 3, 15, NULL, 'payment_received', 125000.00, '13123123', 'Initial down payment for event creation', '2025-06-26 07:17:02'),
(4, 31, NULL, 4, 15, NULL, 'payment_received', 82000.00, '12312', 'Initial down payment for event creation', '2025-06-26 08:36:53'),
(5, 32, NULL, 5, 15, NULL, 'payment_received', 149000.00, 'sdfsdf', 'Initial down payment for event creation', '2025-06-26 08:39:30'),
(6, 33, NULL, 6, 15, NULL, 'payment_received', 149000.00, 'sdfsdf', 'Initial down payment for event creation', '2025-06-26 08:50:59'),
(7, 34, NULL, 7, 15, NULL, 'payment_received', 147000.00, '567567', 'Initial down payment for event creation', '2025-06-26 10:40:27'),
(8, 40, NULL, 8, 5, NULL, 'payment_received', 149000.00, '12333212123', 'Initial down payment for event creation', '2025-07-01 10:40:11'),
(9, 41, NULL, 9, 5, NULL, 'payment_received', 253300.00, '8234908149082390823', 'Initial down payment for event creation', '2025-07-01 10:45:50'),
(10, 42, NULL, 10, 15, NULL, 'payment_received', 208600.00, NULL, 'Initial down payment for event creation', '2025-07-02 00:10:56'),
(11, 43, NULL, 11, 15, NULL, 'payment_received', 212500.00, '123123123123', 'Initial down payment for event creation', '2025-07-02 06:29:36'),
(12, 44, NULL, 12, 15, NULL, 'payment_received', 62500.00, '1231231231231231231231', 'Initial down payment for event creation', '2025-07-02 06:55:23'),
(13, 45, NULL, 13, 15, NULL, 'payment_received', 212500.00, '1231231231231231231231', 'Initial down payment for event creation', '2025-07-02 13:20:50'),
(14, 41, NULL, 14, 5, NULL, 'payment_received', 44700.00, '', '', '2025-07-02 15:13:26'),
(15, 42, NULL, 15, 15, NULL, 'payment_received', 89400.00, '', '', '2025-07-02 15:19:54'),
(16, 42, NULL, 15, 15, NULL, 'payment_confirmed', 89400.00, '', 'Status changed from pending to completed', '2025-07-03 01:00:36'),
(17, 42, NULL, 15, 15, NULL, 'payment_confirmed', 89400.00, '', 'Status updated to completed by admin', '2025-07-03 01:00:36'),
(18, 46, NULL, 16, 15, NULL, 'payment_received', 187499.99, '31212131233123123', 'Initial down payment for event creation', '2025-07-07 20:04:55'),
(19, 47, NULL, 17, 15, NULL, 'payment_received', 187500.00, NULL, 'Initial down payment for event creation', '2025-07-08 04:17:11'),
(20, 47, NULL, 18, 15, NULL, 'payment_received', 62500.00, '', '', '2025-07-08 04:18:45'),
(21, 48, NULL, 19, 20, NULL, 'payment_received', 212500.00, NULL, 'Initial down payment for event creation', '2025-07-09 12:22:19'),
(22, 48, NULL, 20, 20, NULL, 'payment_received', 37500.00, '', '', '2025-07-09 12:25:24'),
(23, 57, NULL, 21, 15, NULL, 'payment_received', 125000.00, NULL, 'Initial down payment for event creation', '2025-07-10 17:42:14'),
(24, 58, NULL, 22, 20, NULL, 'payment_received', 400000.00, '1231231231231231231231', 'Initial down payment for event creation', '2025-07-11 03:45:10'),
(0, 0, NULL, 0, 20, NULL, 'payment_received', 16000.00, NULL, 'Initial down payment for event creation', '2025-07-14 15:40:28'),
(0, 0, NULL, 0, 21, NULL, 'payment_received', 84000.00, NULL, 'Initial down payment for event creation', '2025-07-16 15:46:39'),
(0, 2, NULL, 0, 21, NULL, 'payment_received', 145600.00, NULL, 'Initial down payment for event creation', '2025-07-16 16:02:04'),
(0, 1, NULL, 23, 20, NULL, 'payment_received', 153300.00, NULL, 'Initial down payment for event creation', '2025-07-16 16:37:10'),
(0, 2, NULL, 24, 23, NULL, 'payment_received', 282150.00, NULL, 'Initial down payment for event creation', '2025-07-16 18:19:46'),
(0, 3, NULL, 25, 23, NULL, 'payment_received', 153850.00, NULL, 'Initial down payment for event creation', '2025-07-17 03:40:05'),
(0, 4, NULL, 26, 21, NULL, 'payment_received', 94000.00, NULL, 'Initial down payment for event creation', '2025-07-17 05:46:14'),
(0, 5, NULL, 27, 29, NULL, 'payment_received', 45000.00, NULL, 'Initial down payment for event creation', '2025-07-17 06:10:22'),
(0, 6, NULL, 28, 29, NULL, 'payment_received', 123250.00, NULL, 'Initial down payment for event creation', '2025-07-17 15:16:52'),
(0, 7, NULL, 29, 23, NULL, 'payment_received', 130900.00, NULL, 'Initial down payment for event creation', '2025-07-17 15:53:10'),
(0, 8, NULL, 30, 20, NULL, 'payment_received', 8633450.00, NULL, 'Initial down payment for event creation', '2025-07-17 16:14:22'),
(0, 9, NULL, 31, 29, NULL, 'payment_received', 613600.00, NULL, 'Initial down payment for event creation', '2025-07-17 16:54:53'),
(0, 10, NULL, 32, 29, NULL, 'payment_received', 37600.00, NULL, 'Initial down payment for event creation', '2025-07-18 06:56:14'),
(0, 11, NULL, 33, 21, NULL, 'payment_received', 91000.00, NULL, 'Initial down payment for event creation', '2025-07-18 07:44:00'),
(0, 11, NULL, 34, 21, NULL, 'payment_received', 91000.00, '', '', '2025-07-18 08:24:20'),
(0, 12, NULL, 35, 30, NULL, 'payment_received', 176800.00, NULL, 'Initial down payment for event creation', '2025-07-19 03:10:50'),
(0, 13, NULL, 36, 20, NULL, 'payment_received', 385000.00, NULL, 'Initial down payment for event creation', '2025-07-19 04:50:36'),
(0, 31, NULL, 37, 29, NULL, 'payment_received', 84084.00, NULL, 'Initial down payment for event creation', '2025-07-21 18:38:01'),
(0, 32, NULL, 38, 29, NULL, 'payment_received', 120750.00, NULL, 'Initial down payment for event creation', '2025-07-22 01:05:43'),
(0, 33, NULL, 39, 23, NULL, 'payment_received', 96000.00, NULL, 'Initial down payment for event creation', '2025-07-22 01:10:54'),
(0, 33, NULL, 6, 15, NULL, 'payment_confirmed', 149000.00, 'sdfsdf', 'Status changed from completed to cancelled', '2025-07-22 02:14:16'),
(0, 45, NULL, 13, 15, NULL, 'payment_confirmed', 212500.00, '1231231231231231231231', 'Status changed from completed to cancelled', '2025-07-22 02:14:16'),
(0, 58, NULL, 22, 20, NULL, 'payment_confirmed', 400000.00, '1231231231231231231231', 'Status changed from completed to cancelled', '2025-07-22 02:14:16'),
(0, 35, NULL, 40, 20, NULL, 'payment_received', 309000.00, NULL, 'Initial down payment for event creation', '2025-07-22 02:19:13'),
(0, 35, NULL, 41, 20, NULL, 'payment_received', 103000.00, '', '', '2025-07-22 02:20:25'),
(0, 36, NULL, 42, 21, NULL, 'payment_received', 41500.00, NULL, 'Initial down payment for event creation', '2025-07-22 06:36:36'),
(0, 37, NULL, 43, 21, NULL, 'payment_received', 84500.00, NULL, 'Initial down payment for event creation', '2025-07-23 07:25:44'),
(0, 48, NULL, 44, 21, NULL, 'payment_received', 40000.00, NULL, 'Initial down payment for event creation', '2025-08-03 07:53:36'),
(0, 11, NULL, 33, 21, NULL, 'payment_confirmed', 91000.00, NULL, 'Status changed from completed to cancelled', '2025-08-03 08:06:30'),
(0, 48, NULL, 20, 20, NULL, 'payment_confirmed', 37500.00, '', 'Status changed from completed to cancelled', '2025-08-03 08:15:36'),
(0, 48, NULL, 19, 20, NULL, 'payment_confirmed', 212500.00, NULL, 'Status changed from completed to cancelled', '2025-08-03 08:15:36'),
(0, 49, NULL, 45, 29, NULL, 'payment_received', 202150.00, NULL, 'Initial down payment for event creation', '2025-08-03 08:18:33'),
(0, 50, NULL, 46, 21, NULL, 'payment_received', 69500.00, NULL, 'Initial down payment for event creation', '2025-08-08 17:16:58'),
(0, 36, NULL, 47, 21, NULL, 'payment_received', 41500.00, '', 'Paid in cash sample', '2025-08-09 02:43:41'),
(0, 12, NULL, 48, 30, NULL, 'payment_received', 44200.00, '99839292019', '', '2025-08-13 05:22:10'),
(0, 59, NULL, 49, 29, NULL, 'payment_received', 79000.00, NULL, 'Initial down payment for event creation', '2025-08-18 16:09:28'),
(0, 60, NULL, 50, 20, NULL, 'payment_received', 75000.00, NULL, 'Initial down payment for event creation', '2025-08-18 16:14:58'),
(0, 61, NULL, 51, 21, NULL, 'payment_received', 26000.00, NULL, 'Initial down payment for event creation', '2025-08-19 16:22:23'),
(0, 62, NULL, 52, 5, NULL, 'payment_received', 65000.00, NULL, 'Initial down payment for event creation', '2025-08-20 04:35:17'),
(0, 63, NULL, 53, 21, NULL, 'payment_received', 159000.00, NULL, 'Initial down payment for event creation', '2025-08-30 04:34:47'),
(0, 64, NULL, 54, 20, NULL, 'payment_received', 42750.00, NULL, 'Initial down payment for event creation', '2025-08-30 07:44:02'),
(0, 65, NULL, 55, 30, NULL, 'payment_received', 81000.00, NULL, 'Initial down payment for event creation', '2025-08-30 08:25:58'),
(0, 61, NULL, 56, 21, NULL, 'payment_received', 26000.00, '2131233423423', '', '2025-09-08 17:43:07'),
(0, 61, NULL, NULL, 21, NULL, '', NULL, NULL, 'Event finalized by admin. Organizer notified about payment schedule.', '2025-09-08 18:35:09'),
(0, 66, NULL, 57, 23, NULL, 'payment_received', 112000.00, NULL, 'Initial down payment for event creation', '2025-09-09 23:01:51'),
(0, 60, NULL, 58, 20, NULL, 'payment_received', 75000.00, '', '', '2025-09-11 00:37:42'),
(0, 60, NULL, NULL, 20, NULL, '', NULL, NULL, 'Event finalized by admin. Organizer notified about payment schedule.', '2025-09-11 00:37:54'),
(0, 67, NULL, 59, 30, NULL, 'payment_received', 253500.00, NULL, 'Initial down payment for event creation', '2025-09-11 06:01:51'),
(0, 68, NULL, 60, 30, NULL, 'payment_received', 139000.00, NULL, 'Initial down payment for event creation', '2025-09-11 06:10:22'),
(0, 69, NULL, 61, 30, NULL, 'payment_received', 22500.00, '2342342', 'Initial down payment for event creation', '2025-09-13 05:25:59'),
(0, 70, NULL, 62, 20, NULL, 'payment_received', 16000.00, '123123123', 'Initial down payment for event creation', '2025-09-22 06:59:23'),
(0, 70, NULL, 63, 20, NULL, 'payment_received', 16000.00, '324234234', '', '2025-09-22 07:45:10');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_payment_schedule_types`
--

CREATE TABLE `tbl_payment_schedule_types` (
  `schedule_type_id` int(11) NOT NULL,
  `schedule_name` varchar(100) NOT NULL,
  `schedule_description` text DEFAULT NULL,
  `installment_count` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_payment_schedule_types`
--

INSERT INTO `tbl_payment_schedule_types` (`schedule_type_id`, `schedule_name`, `schedule_description`, `installment_count`, `is_active`, `created_at`) VALUES
(1, 'Full Payment', 'Pay the entire amount at once', 1, 1, '2025-06-25 03:47:14'),
(2, '50-50 Payment', '50% down payment, 50% before event', 2, 1, '2025-06-25 03:47:14'),
(3, 'Monthly Installments', 'Pay in monthly installments', 3, 1, '2025-06-25 03:47:14'),
(4, 'Quarterly Installments', 'Pay in quarterly installments', 4, 1, '2025-06-25 03:47:14'),
(5, 'Custom Schedule', 'Custom payment schedule as agreed', 0, 1, '2025-06-25 03:47:14');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_signup_otp`
--

CREATE TABLE `tbl_signup_otp` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `otp_code` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_signup_otp`
--

INSERT INTO `tbl_signup_otp` (`id`, `user_id`, `email`, `otp_code`, `expires_at`, `created_at`, `updated_at`) VALUES
(2, 22, 'chis.bacsarca.coc@phinmaed.com', '542417', '2025-07-14 14:27:39', '2025-07-14 06:17:39', '2025-07-14 06:17:39');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_staff`
--

CREATE TABLE `tbl_staff` (
  `staff_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role_title` enum('head_organizer','on_site') NOT NULL DEFAULT 'head_organizer' COMMENT 'Staff functional role',
  `branch_name` varchar(100) DEFAULT NULL COMMENT 'Branch or location if applicable',
  `can_handle_bookings` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Can handle bookings on-site',
  `remarks` text DEFAULT NULL COMMENT 'Admin notes and remarks',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Staff profiles linked to user accounts with staff role';

--
-- Dumping data for table `tbl_staff`
--

INSERT INTO `tbl_staff` (`staff_id`, `user_id`, `role_title`, `branch_name`, `can_handle_bookings`, `remarks`, `created_at`, `updated_at`) VALUES
(1, 34, 'head_organizer', '', 1, '', '2025-09-04 20:44:04', '2025-09-04 20:44:04');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_store`
--

CREATE TABLE `tbl_store` (
  `store_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `store_category_id` int(11) NOT NULL,
  `feedback_id` int(11) DEFAULT NULL,
  `store_name` varchar(255) NOT NULL,
  `store_owner` varchar(255) NOT NULL,
  `store_details` text DEFAULT NULL,
  `store_status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `store_media` varchar(255) DEFAULT NULL,
  `store_profile_picture` varchar(255) DEFAULT NULL,
  `store_coverphoto` varchar(255) DEFAULT NULL,
  `store_createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `store_type` enum('internal','external') NOT NULL DEFAULT 'internal',
  `store_contact` varchar(20) NOT NULL,
  `store_email` varchar(100) NOT NULL,
  `store_description` text NOT NULL,
  `store_location` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_store`
--

INSERT INTO `tbl_store` (`store_id`, `user_id`, `store_category_id`, `feedback_id`, `store_name`, `store_owner`, `store_details`, `store_status`, `store_media`, `store_profile_picture`, `store_coverphoto`, `store_createdAt`, `store_type`, `store_contact`, `store_email`, `store_description`, `store_location`) VALUES
(4, 5, 1, NULL, 'Test', '', 'tetsdt', 'active', NULL, 'uploads/profile_pictures/1740508911_3131c198-29b4-47ea-a7be-4b9011482a0c.jpg', 'uploads/cover_photos/1740508911_Maisen Margiela poster.jpg', '2025-02-25 18:41:51', '', '0909090909', 'suan@gmail.com', '', 'sdf'),
(8, 5, 10, NULL, 'Camera Ant Films', '', 'We create good films for your events, we also provide good quality film services.', 'active', NULL, 'uploads/profile_pictures/1740708230_Void Poster Design.jpg', 'uploads/cover_photos/1740708230_outside_studio.jpg', '2025-02-28 02:03:50', '', '09095905909', 'cameraants@gmail.com', '', 'Cagayan de Oro City'),
(10, 15, 4, NULL, 'Project Likha Crafts', '', 'We create good crafts for your needs, please visit us and collaborate with us with your events', 'active', NULL, 'uploads/profile_pictures/1741150684_head.png', 'uploads/cover_photos/1741150684_Anches - Parol.jpg', '2025-03-05 04:58:04', '', '0909090950909509', 'projectlikha@gmail.com', '', 'Cagayan de Oro City'),
(11, 15, 3, NULL, 'Serot Flower Shops', '', 'We cater different types of serot flower shops for your needs. Please visit us and be the amazing guess for you!', 'active', NULL, 'uploads/profile_pictures/1741150926_golden-flower-black-background-floral-logo-187684955.webp', 'uploads/cover_photos/1741150926_Screenshot 2025-02-01 093216.png', '2025-03-05 05:02:06', '', '090909090909', 'serotflowshops@gmail.com', '', 'Cagayan de Oro City'),
(12, 15, 15, NULL, 'Light Works & Films', '', 'Your beauty our passion', 'active', NULL, 'uploads/profile_pictures/1741151119_1000_F_135432421_yNN5je47KAmpcfdZDhosQIcCps4ok0QY.jpg', 'uploads/cover_photos/1741151119_a-banner-with-copy-space-featuring-a-professional-video-camera-against-a-background-of-a-lake-photo.jpg', '2025-03-05 05:05:19', '', '0909090909', 'lightworks@gmail.com', '', 'Capistrano St.'),
(13, 15, 1, NULL, 'Food Hub', '', '', 'active', NULL, 'uploads/profile_pictures/1741230623_sample.jpg', 'uploads/cover_photos/1741230623_years-old-birthday-cake-to-old-woman-royalty-free-image-1718042584.avif', '2025-03-06 03:10:23', '', '', '', '', '');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_store_category`
--

CREATE TABLE `tbl_store_category` (
  `store_category_id` int(11) NOT NULL,
  `store_category_type` varchar(100) NOT NULL,
  `store_category_description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_store_category`
--

INSERT INTO `tbl_store_category` (`store_category_id`, `store_category_type`, `store_category_description`) VALUES
(1, 'Catering', 'Food and beverage catering services for events.'),
(2, 'Photography', 'Event photography and videography services.'),
(3, 'Decoration', 'Event decoration and styling services.'),
(4, 'Entertainment', 'Live bands, DJs, and performers for events.'),
(5, 'Event Planning', 'Professional event planning and coordination services.'),
(6, 'Florists', 'Flower arrangement and bouquet services for events.'),
(7, 'Catering Equipment Rental', 'Rental services for catering equipment and tableware.'),
(8, 'Lighting & Sound', 'Professional lighting and sound system services for events.'),
(9, 'Venue Rental', 'Event spaces available for rent.'),
(10, 'Printing Services', 'Invitation cards, banners, and other event print materials.'),
(11, 'Gifts & Souvenirs', 'Personalized giveaways and event souvenirs.'),
(12, 'Costume & Attire Rental', 'Formal wear and costume rental services for themed events.'),
(13, 'Transportation Services', 'Shuttle and vehicle rental for event guests and participants.'),
(14, 'Security Services', 'Professional security personnel for event safety.'),
(15, 'Event Staffing', 'Ushers, waitstaff, and manpower services for events.'),
(16, 'Tech & AV Equipment Rental', 'Projectors, screens, and other audiovisual equipment for events.');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_store_price`
--

CREATE TABLE `tbl_store_price` (
  `tbl_store_price_id` int(11) NOT NULL,
  `store_id` int(11) NOT NULL,
  `store_price_title` varchar(255) NOT NULL,
  `store_price_min` decimal(10,2) NOT NULL,
  `store_price_max` decimal(10,2) NOT NULL,
  `store_price_description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_store_price`
--

INSERT INTO `tbl_store_price` (`tbl_store_price_id`, `store_id`, `store_price_title`, `store_price_min`, `store_price_max`, `store_price_description`) VALUES
(1, 10, '', 0.00, 0.00, ''),
(2, 11, '', 0.00, 0.00, ''),
(3, 12, '', 0.00, 0.00, ''),
(4, 13, '', 0.00, 0.00, '');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_suppliers`
--

CREATE TABLE `tbl_suppliers` (
  `supplier_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL COMMENT 'FK to tbl_users for internal suppliers',
  `supplier_type` enum('internal','external') NOT NULL DEFAULT 'external',
  `business_name` varchar(255) NOT NULL,
  `contact_number` varchar(20) NOT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `business_address` text DEFAULT NULL,
  `agreement_signed` tinyint(1) NOT NULL DEFAULT 0,
  `registration_docs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'JSON array of document uploads',
  `business_description` text DEFAULT NULL,
  `specialty_category` varchar(100) DEFAULT NULL COMMENT 'Category of services (catering, photography, etc.)',
  `rating_average` decimal(3,2) DEFAULT 0.00 COMMENT 'Average rating from feedback',
  `total_ratings` int(11) DEFAULT 0 COMMENT 'Total number of ratings received',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Admin verification status',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Active status',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_suppliers`
--

INSERT INTO `tbl_suppliers` (`supplier_id`, `user_id`, `supplier_type`, `business_name`, `contact_number`, `contact_email`, `contact_person`, `business_address`, `agreement_signed`, `registration_docs`, `business_description`, `specialty_category`, `rating_average`, `total_ratings`, `is_verified`, `is_active`, `created_at`, `updated_at`) VALUES
(1, NULL, 'external', 'Elegant Catering Services', '09123456789', 'info@elegantcatering.com', 'Maria Santos', '123 Food Street, Makati City', 1, '[]', 'Premium catering services for weddings and corporate events', 'Catering', 4.50, 12, 1, 1, '2024-01-15 00:30:00', '2024-01-15 00:30:00'),
(2, NULL, 'external', 'Perfect Shots Photography', '09234567890', 'contact@perfectshots.ph', 'John Dela Cruz', '456 Photo Avenue, BGC, Taguig', 1, '[]', 'Professional wedding and event photography with cinematic approach', 'Photography', 4.80, 8, 1, 1, '2024-01-20 02:15:00', '2024-01-20 02:15:00'),
(3, NULL, 'external', 'Blooming Gardens Florals', '09345678901', 'hello@bloominggardens.com', 'Rose Fernandez', '789 Flower Road, Quezon City', 1, '[]', 'Exquisite floral arrangements and garden decorations for special occasions', 'Floral Design', 4.65, 15, 1, 1, '2024-01-25 06:20:00', '2024-01-25 06:20:00'),
(4, NULL, 'internal', 'EventCorp AV Solutions', '09456789012', 'av@eventcorp.com', 'Mike Rodriguez', 'Internal Department - Main Office', 1, '[]', 'In-house audio visual equipment and technical support services', 'Audio Visual', 4.40, 6, 1, 1, '2024-02-01 01:45:00', '2024-02-01 01:45:00'),
(5, NULL, 'external', 'Purple Yam', '090909509095', 'aizelartunlock@gmail.com', 'Jay Raval', 'CDO central city', 1, NULL, 'Purple Cakes Yum yum', 'Catering', 0.00, 0, 1, 1, '2025-07-11 06:36:33', '2025-07-11 06:36:33'),
(6, NULL, 'external', 'Animal Bite Center', '09009005909', 'animalbite@gmail.com', 'John Doe', 'Capistrano Highway', 0, NULL, 'Entertainment base website ', 'Entertainment', 0.00, 0, 0, 1, '2025-07-18 08:22:38', '2025-07-18 08:22:38'),
(7, NULL, 'external', 'Anima - Electronic Mascots', '09089909509', 'ram_ignacio@gmail.com', 'Mr. Ramon Ignacio', 'Capistrano Street, High Way, Cagayan de Oro City 9000', 1, '{\"tiers\":[{\"name\":\"Basic\",\"price\":\"20000\",\"description\":\"Perfect for birthday bash and more\"},{\"name\":\"Silver\",\"price\":\"35000\",\"description\":\"Whole day with special animatronic displays\"},{\"name\":\"Gold\",\"price\":\"120000\",\"description\":\"All-in package for all our animatronics\"}]}', 'Applying different types of good mascots for various events ', 'Entertainment', 0.00, 0, 1, 1, '2025-09-22 04:59:10', '2025-09-22 04:59:10');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_supplier_activity`
--

CREATE TABLE `tbl_supplier_activity` (
  `activity_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `activity_type` enum('created','updated','document_uploaded','document_verified','offer_created','offer_updated','component_delivered','profile_updated','login','password_changed') NOT NULL,
  `activity_description` text DEFAULT NULL,
  `related_id` int(11) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Triggers `tbl_supplier_activity`
--
DELIMITER $$
CREATE TRIGGER `tr_update_supplier_activity` AFTER INSERT ON `tbl_supplier_activity` FOR EACH ROW BEGIN
    UPDATE tbl_suppliers 
    SET last_activity = NEW.created_at 
    WHERE supplier_id = NEW.supplier_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_supplier_credentials`
--

CREATE TABLE `tbl_supplier_credentials` (
  `credential_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `temp_password_hash` varchar(255) NOT NULL,
  `email_sent` tinyint(1) DEFAULT 0,
  `used` tinyint(1) DEFAULT 0,
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_supplier_documents`
--

CREATE TABLE `tbl_supplier_documents` (
  `document_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `document_type` enum('dti','business_permit','contract','portfolio','certification','other') NOT NULL,
  `document_title` varchar(255) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int(11) DEFAULT 0,
  `file_type` varchar(100) DEFAULT NULL,
  `uploaded_by` int(11) NOT NULL,
  `upload_date` datetime DEFAULT current_timestamp(),
  `is_verified` tinyint(1) DEFAULT 0,
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `verification_notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_supplier_offers`
--

CREATE TABLE `tbl_supplier_offers` (
  `offer_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `offer_title` varchar(255) NOT NULL,
  `offer_description` text DEFAULT NULL,
  `price_min` decimal(10,2) NOT NULL,
  `price_max` decimal(10,2) DEFAULT NULL,
  `service_category` varchar(100) DEFAULT NULL,
  `package_size` enum('small','medium','large','custom') DEFAULT NULL,
  `tier_level` int(11) DEFAULT 1,
  `delivery_timeframe` varchar(100) DEFAULT NULL,
  `terms_conditions` text DEFAULT NULL,
  `offer_attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'JSON array of offer attachments',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_supplier_offers`
--

INSERT INTO `tbl_supplier_offers` (`offer_id`, `supplier_id`, `offer_title`, `offer_description`, `price_min`, `price_max`, `service_category`, `package_size`, `tier_level`, `delivery_timeframe`, `terms_conditions`, `offer_attachments`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'Wedding Catering Package - Premium', 'Full service catering for 100-200 guests including appetizers, main course, desserts, and beverages', 75000.00, 150000.00, 'Catering', 'large', 1, '2-3 days preparation', 'Payment terms: 50% down payment, 50% on event day', '[]', 1, '2024-01-15 00:35:00', '2024-01-15 00:35:00'),
(2, 1, 'Corporate Event Catering', 'Business lunch and meeting catering services for 20-50 people', 25000.00, 50000.00, 'Catering', 'medium', 1, '1-2 days preparation', 'Minimum order 20 pax, advance booking required', '[]', 1, '2024-01-15 00:40:00', '2024-01-15 00:40:00'),
(3, 2, 'Wedding Photography Full Day', 'Complete wedding coverage from preparation to reception with 2 photographers', 45000.00, 75000.00, 'Photography', 'large', 1, 'Same day coverage', 'Includes 500+ edited photos, 1 highlight video, USB delivery', '[]', 1, '2024-01-20 02:20:00', '2024-01-20 02:20:00'),
(4, 2, 'Event Photography Half Day', 'Professional event photography for parties and celebrations (4-6 hours)', 20000.00, 35000.00, 'Photography', 'medium', 1, 'Same day coverage', 'Includes 200+ edited photos, online gallery access', '[]', 1, '2024-01-20 02:25:00', '2024-01-20 02:25:00'),
(5, 3, 'Bridal Bouquet & Ceremony Florals', 'Complete floral package including bridal bouquet, bridesmaids bouquets, and ceremony decorations', 15000.00, 35000.00, 'Floral Design', 'medium', 1, '3-5 days preparation', 'Fresh flowers guaranteed, setup included on event day', '[]', 1, '2024-01-25 06:25:00', '2024-01-25 06:25:00'),
(6, 3, 'Reception Centerpieces', 'Elegant table centerpieces and reception area floral arrangements', 8000.00, 25000.00, 'Floral Design', 'small', 1, '2-3 days preparation', 'Rental vases available, pickup service after event', '[]', 1, '2024-01-25 06:30:00', '2024-01-25 06:30:00'),
(7, 4, 'Complete AV Setup - Large Events', 'Full audio visual setup for weddings and large events including sound system, microphones, projectors, and lighting', 35000.00, 60000.00, 'Audio Visual', 'large', 1, 'Setup on event day', 'Technical support included throughout event, backup equipment available', '[]', 1, '2024-02-01 01:50:00', '2024-02-01 01:50:00'),
(8, 4, 'Basic Sound System Package', 'Essential sound system for small to medium events with wireless microphones', 12000.00, 25000.00, 'Audio Visual', 'medium', 1, 'Setup on event day', 'Includes 2 wireless mics, speakers, and mixer', '[]', 1, '2024-02-01 01:55:00', '2024-02-01 01:55:00');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_supplier_ratings`
--

CREATE TABLE `tbl_supplier_ratings` (
  `rating_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `event_id` int(11) DEFAULT NULL COMMENT 'FK to tbl_events for post-event ratings',
  `client_id` int(11) DEFAULT NULL COMMENT 'FK to tbl_users (client who gave rating)',
  `admin_id` int(11) DEFAULT NULL COMMENT 'FK to tbl_users (admin who gave rating)',
  `rating` tinyint(1) NOT NULL,
  `feedback` text DEFAULT NULL,
  `service_quality` tinyint(1) DEFAULT NULL,
  `punctuality` tinyint(1) DEFAULT NULL,
  `communication` tinyint(1) DEFAULT NULL,
  `value_for_money` tinyint(1) DEFAULT NULL,
  `would_recommend` tinyint(1) DEFAULT NULL COMMENT '1=Yes, 0=No',
  `feedback_attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'JSON array of attached photos/files',
  `is_public` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether rating is visible publicly',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Triggers `tbl_supplier_ratings`
--
DELIMITER $$
CREATE TRIGGER `update_supplier_rating_average_on_delete` AFTER DELETE ON `tbl_supplier_ratings` FOR EACH ROW BEGIN
    DECLARE avg_rating DECIMAL(3,2);
    DECLARE total_count INT;

    SELECT AVG(rating), COUNT(*)
    INTO avg_rating, total_count
    FROM tbl_supplier_ratings
    WHERE supplier_id = OLD.supplier_id AND is_public = 1;

    UPDATE tbl_suppliers
    SET rating_average = COALESCE(avg_rating, 0.00),
        total_ratings = COALESCE(total_count, 0)
    WHERE supplier_id = OLD.supplier_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_supplier_rating_average_on_insert` AFTER INSERT ON `tbl_supplier_ratings` FOR EACH ROW BEGIN
    DECLARE avg_rating DECIMAL(3,2);
    DECLARE total_count INT;

    SELECT AVG(rating), COUNT(*)
    INTO avg_rating, total_count
    FROM tbl_supplier_ratings
    WHERE supplier_id = NEW.supplier_id AND is_public = 1;

    UPDATE tbl_suppliers
    SET rating_average = COALESCE(avg_rating, 0.00),
        total_ratings = COALESCE(total_count, 0)
    WHERE supplier_id = NEW.supplier_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_supplier_rating_average_on_update` AFTER UPDATE ON `tbl_supplier_ratings` FOR EACH ROW BEGIN
    DECLARE avg_rating DECIMAL(3,2);
    DECLARE total_count INT;

    SELECT AVG(rating), COUNT(*)
    INTO avg_rating, total_count
    FROM tbl_supplier_ratings
    WHERE supplier_id = NEW.supplier_id AND is_public = 1;

    UPDATE tbl_suppliers
    SET rating_average = COALESCE(avg_rating, 0.00),
        total_ratings = COALESCE(total_count, 0)
    WHERE supplier_id = NEW.supplier_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_supplier_verification_requests`
--

CREATE TABLE `tbl_supplier_verification_requests` (
  `verification_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `requested_by` int(11) NOT NULL,
  `verification_type` enum('initial','document_update','renewal') DEFAULT 'initial',
  `status` enum('pending','in_review','approved','rejected','requires_action') DEFAULT 'pending',
  `admin_notes` text DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_system_activity_logs`
--

CREATE TABLE `tbl_system_activity_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action_type` enum('settings_updated','user_created','user_updated','user_deleted','role_changed','permission_changed','backup_created','migration_run','email_sent','notification_sent','report_generated','export_created') NOT NULL,
  `target_user_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `ip_address` varchar(64) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_users`
--

CREATE TABLE `tbl_users` (
  `user_id` int(11) NOT NULL,
  `user_firstName` varchar(50) NOT NULL,
  `user_lastName` varchar(50) NOT NULL,
  `user_suffix` varchar(10) DEFAULT NULL,
  `user_birthdate` date DEFAULT NULL,
  `user_email` varchar(100) NOT NULL,
  `user_contact` varchar(20) NOT NULL,
  `user_username` varchar(50) NOT NULL,
  `user_pwd` varchar(255) NOT NULL,
  `force_password_change` tinyint(1) DEFAULT 0,
  `last_login` datetime DEFAULT NULL,
  `account_status` enum('active','inactive','suspended') DEFAULT 'active',
  `user_pfp` varchar(255) DEFAULT 'uploads/user_profile/default_pfp.png',
  `user_role` enum('admin','organizer','client','supplier','staff') NOT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT 1,
  `email_verified_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_users`
--

INSERT INTO `tbl_users` (`user_id`, `user_firstName`, `user_lastName`, `user_suffix`, `user_birthdate`, `user_email`, `user_contact`, `user_username`, `user_pwd`, `force_password_change`, `last_login`, `account_status`, `user_pfp`, `user_role`, `is_verified`, `email_verified_at`, `created_at`) VALUES
(5, 'test', 'test', 'III', '1995-10-20', 'test@gmail.com', '0909090990', 'test', '$2y$10$kINW0dn.gMncgts2MHlwAeuJluo1eotovACTt.z5TUhZ5rf2Ewhhm', 0, NULL, 'active', 'uploads/user_profile/sample.jpg', 'client', 1, NULL, '2025-02-25 12:43:54'),
(7, 'Mayette', 'Lagdamin', '', '1995-12-12', 'aizsingidas@gmail.com', '099909009', 'admin', '$2y$10$/kqcsB6g/loADYG7FIi09ufxRzrU7xF19ap7MpF0DibA77vmVhPAS', 0, '2025-09-23 16:19:40', 'active', 'uploads/profile_pictures/profile_7_1752809428.jpg', 'admin', 1, NULL, '2025-02-25 16:41:22'),
(20, 'Jesse', 'Morcillos', '', '2000-01-09', 'projectlikha.archives@gmail.com', '09054135594', 'jessemorcillos', '$2y$10$A.P0FYybx2WtUt7ai7Ro/OYYLLhSlAGNWiVN/E.6fAF/wnHn4KdG6', 0, '2025-09-22 15:00:21', 'active', 'uploads/profile_pictures/profile_20_1752461113.jpg', 'client', 1, NULL, '2025-07-09 12:04:49'),
(21, 'Richard', 'Gamon', NULL, '1995-01-01', 'contact.aizworks@gmail.com', '+630995059950', 'richardq20', '$2y$10$iSf.6ZlAVsOR0Gcuwazw4uHeGggmQetB2raODfOzAjhz8qqxjopaW', 0, '2025-07-22 10:21:55', 'active', 'uploads/profile_pictures/profile_21_1752549645.jpg', 'client', 1, '2025-07-14 14:03:53', '2025-07-14 06:03:28'),
(23, 'Christine', 'Bacsarsa', NULL, '2003-07-26', 'chis.bacsarsa.coc@phinmaed.com', '+639059490590', 'christinegrace', '$2y$10$c82pB7cRnWdV2.GoMCBVqe.kHzB..MjSJy1EjMi1w0CmIkbO.XlM.', 0, '2025-07-17 10:56:17', 'active', 'uploads/profile_pictures/profile_23_1752474108.jpg', 'client', 1, '2025-07-14 14:20:03', '2025-07-14 06:19:38'),
(27, 'Boss', 'Zata', NULL, '1998-12-12', 'lasi.anches.coc@phinmaed.com', '+639055455544', 'boss.zata22', '$2y$10$m0xfTZ0docbytsrYxzaHceDJgiwPZuDALih4KeVUZcy3ypexVOShK', 0, NULL, 'active', 'uploads/profile_pictures/1752506654_6875211e813a4.png', 'organizer', 1, NULL, '2025-07-14 15:24:41'),
(28, 'Rendon', 'Labrabis', NULL, '1995-12-12', 'rendon@gmail.com', '+63 63 905 190 3994', 'rendon.labrabis', '$2y$10$5gfBKZ1ZevsTrvtUJ8nmVe53K4jQVorO1o4fkjN9RYV6ZtrICAMze', 0, '2025-09-11 11:16:37', 'active', 'uploads/profile_pictures/profile_28_1757549853.jpg', 'organizer', 1, NULL, '2025-07-16 18:31:57'),
(29, 'Ralph', 'Gallegos', NULL, '1995-10-10', 'ralp.pelino11@gmail.com', '+630977349175', 'ralphg48', '$2y$10$oTXf0C.ogNxflEcAux3BtuzC1cozvGsvZvFDU5WOeD5n2zSz8akgm', 0, '2025-09-10 05:58:27', 'active', 'uploads/user_profile/default_pfp.png', 'client', 1, '2025-07-17 13:51:07', '2025-07-17 05:50:39'),
(30, 'Clyde', 'Parol', NULL, '2003-12-16', 'cllu.parol.coc@phinmaed.com', '+639274276461', 'clydeparol', '$2y$10$cEpVxZuLdvPPPeWjdmOIy.CYluyKi35gqx2glo/9fGi6ffLxA9bCO', 0, '2025-09-11 14:04:19', 'active', 'uploads/profile_pictures/profile_30_1752831457.jpg', 'client', 1, '2025-07-18 17:35:23', '2025-07-18 09:34:58'),
(31, 'Rhein', 'Manoy', NULL, '0000-00-00', 'rhienmanoy@gmail.com', '+63 63 905 190 3994', 'rhein.manoy', '$2y$10$qRiBg2tCvZ0Vieifi58ssObSCMDeNgK1t2dktM5GAnMeJKn2w7.gu', 0, NULL, 'active', 'uploads/profile_pictures/1753152278_687efb166a675.jpg', 'organizer', 1, NULL, '2025-07-22 02:44:52'),
(32, 'Brian', 'Renan', NULL, '1998-12-12', 'brianrenan@gmail.com', '+63 63 905 190 3994', 'brian.renan', '$2y$10$zIQ/3m1R4x.iJDoq/NcVJe.mkz2l2ayE.O07gbAoyYLCmAU9z4qja', 0, '2025-08-31 15:19:35', 'active', 'uploads/profile_pictures/1753613294_688603eeb6358.png', 'organizer', 1, NULL, '2025-07-27 10:48:21'),
(33, 'Start', 'Up', NULL, '1995-10-12', 'startup@gmail.com', '+63 63 905 190 3994', 'start.up', '$2y$10$18ciwU.MyRVllT0MO3ZMrOUMcrchN.a3TXHG5OGIrDC6/73BoHCpW', 0, '2025-08-18 22:40:29', 'active', NULL, 'organizer', 1, NULL, '2025-08-13 16:22:45'),
(34, 'Staff', 'Seryo', NULL, NULL, 'staff.seryo@gmail.com', '09059049', 'staffseryo', '$2y$10$dzVGwviI6.n7LMZi82d3aOqGHGDoc/26XWncR01V6sRJcHpnoK0QC', 0, NULL, 'active', 'uploads/profile_pictures/1757018612_68b9f9f4b57ef.jpg', 'staff', 1, NULL, '2025-09-04 20:44:04');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_user_activity_logs`
--

CREATE TABLE `tbl_user_activity_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `session_id` varchar(128) DEFAULT NULL,
  `action_type` varchar(100) NOT NULL COMMENT 'Type of activity',
  `action_category` enum('authentication','event','booking','payment','venue','package','supplier','organizer','client','admin','system') NOT NULL,
  `description` text DEFAULT NULL,
  `user_role` enum('admin','organizer','client','supplier','staff') NOT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `related_entity_type` varchar(50) DEFAULT NULL COMMENT 'Type of related entity (event, booking, payment, etc.)',
  `related_entity_id` int(11) DEFAULT NULL COMMENT 'ID of related entity',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional activity metadata' CHECK (json_valid(`metadata`)),
  `success` tinyint(1) DEFAULT 1,
  `failure_reason` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_user_activity_logs`
--

INSERT INTO `tbl_user_activity_logs` (`id`, `user_id`, `session_id`, `action_type`, `action_category`, `description`, `user_role`, `ip_address`, `user_agent`, `related_entity_type`, `related_entity_id`, `metadata`, `success`, `failure_reason`, `created_at`, `updated_at`) VALUES
(1, 20, NULL, 'login', 'authentication', 'User Jesse Morcillos logged in successfully', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0', NULL, NULL, NULL, 1, NULL, '2025-08-13 01:39:54', '2025-08-13 01:39:54'),
(2, 20, NULL, 'created', 'booking', 'Booking BK-20250812-9325 created for Test logs on 2025-10-03 with 100 guests', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0', 'booking', 10, '{\"booking_reference\":\"BK-20250812-9325\",\"event_type_id\":5,\"event_date\":\"2025-10-03\",\"guest_count\":100,\"venue_id\":29,\"package_id\":14}', 1, NULL, '2025-08-13 01:41:27', '2025-08-13 01:41:27'),
(3, 7, NULL, 'logout', 'authentication', 'User Mayette Lagdamin logged out', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-08-13 02:16:52', '2025-08-13 02:16:52'),
(4, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-08-13 02:17:18', '2025-08-13 02:17:18'),
(5, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0', NULL, NULL, NULL, 1, NULL, '2025-08-13 11:46:53', '2025-08-13 11:46:53'),
(6, 7, NULL, 'logout', 'authentication', 'User Mayette Lagdamin logged out', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-08-13 11:47:24', '2025-08-13 11:47:24'),
(7, 20, NULL, 'login', 'authentication', 'User Jesse Morcillos logged in successfully', 'client', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-08-13 11:48:11', '2025-08-13 11:48:11'),
(8, 30, NULL, 'created', 'payment', 'Payment of 44200 received via gcash for event ID 12', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0', 'payment', 48, '{\"event_id\":12,\"payment_reference\":\"99839292019\",\"payment_date\":\"2025-08-13\"}', 1, NULL, '2025-08-13 13:22:10', '2025-08-13 13:22:10'),
(9, 7, NULL, 'status_updated', 'booking', 'Booking BK-20250812-9325 status changed to cancelled', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0', 'booking', 10, '{\"booking_reference\":\"BK-20250812-9325\"}', 1, NULL, '2025-08-13 13:23:00', '2025-08-13 13:23:00'),
(10, 20, NULL, 'logout', 'authentication', 'User Jesse Morcillos logged out', 'client', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-08-13 22:28:42', '2025-08-13 22:28:42'),
(11, 28, NULL, 'login_attempt', 'authentication', 'Failed login attempt for Rendon Labrabis', 'organizer', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', NULL, NULL, NULL, 0, 'Invalid password', '2025-08-13 22:31:37', '2025-08-13 22:31:37'),
(12, 28, NULL, 'login_attempt', 'authentication', 'Failed login attempt for Rendon Labrabis', 'organizer', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', NULL, NULL, NULL, 0, 'Invalid password', '2025-08-13 22:31:53', '2025-08-13 22:31:53'),
(13, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-08-13 22:32:21', '2025-08-13 22:32:21'),
(14, 7, NULL, 'created', 'organizer', 'Organizer account created for Start Up (startup@gmail.com)', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 'organizer', 7, '{\"user_id\":\"33\",\"username\":\"start.up\",\"years_of_experience\":5,\"has_certifications\":true,\"has_resume\":true}', 1, NULL, '2025-08-14 00:22:48', '2025-08-14 00:22:48'),
(15, 33, NULL, 'login', 'authentication', 'User Start Up logged in successfully', 'organizer', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0', NULL, NULL, NULL, 1, NULL, '2025-08-14 00:48:34', '2025-08-14 00:48:34'),
(16, 33, NULL, 'login', 'authentication', 'User Start Up logged in successfully', 'organizer', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0', NULL, NULL, NULL, 1, NULL, '2025-08-14 01:48:47', '2025-08-14 01:48:47'),
(17, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-08-14 16:33:20', '2025-08-14 16:33:20'),
(18, 33, NULL, 'login', 'authentication', 'User Start Up logged in successfully', 'organizer', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0', NULL, NULL, NULL, 1, NULL, '2025-08-18 22:40:29', '2025-08-18 22:40:29'),
(19, 7, NULL, 'created', 'event', 'Event \'Test\' created for 100 guests on 2025-08-23', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 'event', 59, '{\"event_type_id\":5,\"venue_id\":30,\"package_id\":22,\"total_budget\":158000,\"original_booking_reference\":null}', 1, NULL, '2025-08-19 00:09:28', '2025-08-19 00:09:28'),
(20, 7, NULL, 'created', 'event', 'Event \'This is just a test\' created for 100 guests on 2025-10-29', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 'event', 60, '{\"event_type_id\":1,\"venue_id\":29,\"package_id\":15,\"total_budget\":150000,\"original_booking_reference\":null}', 1, NULL, '2025-08-19 00:14:58', '2025-08-19 00:14:58'),
(21, 7, NULL, 'created', 'event', 'Event \'Organizer \' created for 100 guests on 2025-10-30', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 'event', 61, '{\"event_type_id\":5,\"venue_id\":34,\"package_id\":20,\"total_budget\":52000,\"original_booking_reference\":null}', 1, NULL, '2025-08-20 00:22:23', '2025-08-20 00:22:23'),
(22, 7, NULL, 'organizer_assigned', 'authentication', 'Assigned organizer ID 7 to event ID 61', 'admin', NULL, NULL, NULL, NULL, NULL, 1, NULL, '2025-08-20 00:22:23', '2025-08-20 00:22:23'),
(23, 7, NULL, 'created', 'event', 'Event \'Organizer Birthday\' created for 100 guests on 2025-10-20', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 'event', 62, '{\"event_type_id\":3,\"venue_id\":34,\"package_id\":22,\"total_budget\":130000,\"original_booking_reference\":null}', 1, NULL, '2025-08-20 12:35:17', '2025-08-20 12:35:17'),
(24, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-08-30 12:29:31', '2025-08-30 12:29:31'),
(25, 32, NULL, 'login', 'authentication', 'User Brian Renan logged in successfully', 'organizer', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', NULL, NULL, NULL, 1, NULL, '2025-08-30 12:30:58', '2025-08-30 12:30:58'),
(26, 20, NULL, 'login', 'authentication', 'User Jesse Morcillos logged in successfully', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', NULL, NULL, NULL, 1, NULL, '2025-08-30 12:32:26', '2025-08-30 12:32:26'),
(27, 7, NULL, 'created', 'event', 'Event \'Sample\' created for 150 guests on 2025-11-01', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 'event', 63, '{\"event_type_id\":3,\"venue_id\":30,\"package_id\":19,\"total_budget\":318000,\"original_booking_reference\":null}', 1, NULL, '2025-08-30 12:34:47', '2025-08-30 12:34:47'),
(28, 7, NULL, 'created', 'event', 'Event \'Baptism\' created for 150 guests on 2025-11-05', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 'event', 64, '{\"event_type_id\":10,\"venue_id\":29,\"package_id\":24,\"total_budget\":85500,\"original_booking_reference\":null}', 1, NULL, '2025-08-30 15:44:02', '2025-08-30 15:44:02'),
(29, 20, NULL, 'login', 'authentication', 'User Jesse Morcillos logged in successfully', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', NULL, NULL, NULL, 1, NULL, '2025-08-30 15:51:05', '2025-08-30 15:51:05'),
(30, 20, NULL, 'created', 'booking', 'Booking BK-20250830-1256 created for teedt on 2025-11-08 with 100 guests', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', 'booking', 11, '{\"booking_reference\":\"BK-20250830-1256\",\"event_type_id\":1,\"event_date\":\"2025-11-08\",\"guest_count\":100,\"venue_id\":29,\"package_id\":23}', 1, NULL, '2025-08-30 15:54:10', '2025-08-30 15:54:10'),
(31, 7, NULL, 'status_updated', 'booking', 'Booking BK-20250830-1256 status changed to confirmed', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 'booking', 11, '{\"booking_reference\":\"BK-20250830-1256\"}', 1, NULL, '2025-08-30 15:58:46', '2025-08-30 15:58:46'),
(32, 20, NULL, 'created', 'booking', 'Booking BK-20250830-1779 created for Anniv on 2025-11-15 with 100 guests', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', 'booking', 12, '{\"booking_reference\":\"BK-20250830-1779\",\"event_type_id\":2,\"event_date\":\"2025-11-15\",\"guest_count\":100,\"venue_id\":29,\"package_id\":19}', 1, NULL, '2025-08-30 16:08:58', '2025-08-30 16:08:58'),
(33, 7, NULL, 'status_updated', 'booking', 'Booking BK-20250830-1779 status changed to confirmed', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 'booking', 12, '{\"booking_reference\":\"BK-20250830-1779\"}', 1, NULL, '2025-08-30 16:09:22', '2025-08-30 16:09:22'),
(34, 7, NULL, 'created', 'event', 'Event \'Montreal Wedding\' created for 100 guests on 2025-11-20', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 'event', 65, '{\"event_type_id\":5,\"venue_id\":30,\"package_id\":15,\"total_budget\":162000,\"original_booking_reference\":null}', 1, NULL, '2025-08-30 16:25:58', '2025-08-30 16:25:58'),
(35, 32, NULL, 'login', 'authentication', 'User Brian Renan logged in successfully', 'organizer', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', NULL, NULL, NULL, 1, NULL, '2025-08-31 15:19:35', '2025-08-31 15:19:35'),
(36, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-09-08 22:24:33', '2025-09-08 22:24:33'),
(37, 7, NULL, 'organizer_assigned', 'authentication', 'Assigned organizer ID 4 to event ID 60', 'admin', NULL, NULL, NULL, NULL, NULL, 1, NULL, '2025-09-09 00:57:26', '2025-09-09 00:57:26'),
(38, 20, NULL, 'login', 'authentication', 'User Jesse Morcillos logged in successfully', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', NULL, NULL, NULL, 1, NULL, '2025-09-09 01:11:41', '2025-09-09 01:11:41'),
(39, 20, NULL, 'created', 'booking', 'Booking BK-20250908-9174 created for test_wedding on 2025-10-24 with 100 guests', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', 'booking', 13, '{\"booking_reference\":\"BK-20250908-9174\",\"event_type_id\":1,\"event_date\":\"2025-10-24\",\"guest_count\":100,\"venue_id\":1,\"package_id\":25}', 1, NULL, '2025-09-09 01:12:17', '2025-09-09 01:12:17'),
(40, 21, NULL, 'created', 'payment', 'Payment of 26000 received via gcash for event ID 61', 'client', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 'payment', 56, '{\"event_id\":61,\"payment_reference\":\"2131233423423\",\"payment_date\":\"2025-09-08\"}', 1, NULL, '2025-09-09 01:43:07', '2025-09-09 01:43:07'),
(41, 7, NULL, 'logout', 'authentication', 'User Mayette Lagdamin logged out', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-09-09 03:48:18', '2025-09-09 03:48:18'),
(42, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-09-09 03:48:38', '2025-09-09 03:48:38'),
(43, 7, NULL, 'organizer_assigned', 'authentication', 'Assigned organizer ID 4 to event ID 61', 'admin', NULL, NULL, NULL, NULL, NULL, 1, NULL, '2025-09-09 04:01:32', '2025-09-09 04:01:32'),
(44, 7, NULL, 'organizer_assigned', 'authentication', 'Assigned organizer ID 6 to event ID 61', 'admin', NULL, NULL, NULL, NULL, NULL, 1, NULL, '2025-09-09 04:16:36', '2025-09-09 04:16:36'),
(45, 20, NULL, 'login', 'authentication', 'User Jesse Morcillos logged in successfully', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', NULL, NULL, NULL, 1, NULL, '2025-09-09 05:33:37', '2025-09-09 05:33:37'),
(46, 7, NULL, 'logout', 'authentication', 'User Mayette Lagdamin logged out', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-09-09 23:10:35', '2025-09-09 23:10:35'),
(47, 29, NULL, 'login', 'authentication', 'User Ralph Gallegos logged in successfully', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', NULL, NULL, NULL, 1, NULL, '2025-09-10 05:58:27', '2025-09-10 05:58:27'),
(50, 27, NULL, 'login_attempt', 'authentication', 'Failed login attempt for Boss Zata', 'organizer', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', NULL, NULL, NULL, 0, 'Invalid password', '2025-09-10 06:21:21', '2025-09-10 06:21:21'),
(51, 27, NULL, 'login_attempt', 'authentication', 'Failed login attempt for Boss Zata', 'organizer', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', NULL, NULL, NULL, 0, 'Invalid password', '2025-09-10 06:26:06', '2025-09-10 06:26:06'),
(52, 28, NULL, 'login_attempt', 'authentication', 'Failed login attempt for Rendon Labrabis', 'organizer', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', NULL, NULL, NULL, 0, 'Invalid password', '2025-09-10 06:26:26', '2025-09-10 06:26:26'),
(53, 28, NULL, 'login', 'authentication', 'User Rendon Labrabis logged in successfully', 'organizer', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', NULL, NULL, NULL, 1, NULL, '2025-09-10 06:27:19', '2025-09-10 06:27:19'),
(54, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-09-10 07:00:33', '2025-09-10 07:00:33'),
(55, 7, NULL, 'created', 'event', 'Event \'b_day_sample\' created for 150 guests on 2025-12-01', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 'event', 66, '{\"event_type_id\":3,\"venue_id\":34,\"package_id\":22,\"total_budget\":140000,\"original_booking_reference\":null}', 1, NULL, '2025-09-10 07:01:51', '2025-09-10 07:01:51'),
(56, 28, NULL, 'login', 'authentication', 'User Rendon Labrabis logged in successfully', 'organizer', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', NULL, NULL, NULL, 1, NULL, '2025-09-10 07:14:33', '2025-09-10 07:14:33'),
(57, 28, NULL, 'login', 'authentication', 'User Rendon Labrabis logged in successfully', 'organizer', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', NULL, NULL, NULL, 1, NULL, '2025-09-11 05:25:36', '2025-09-11 05:25:36'),
(58, 7, NULL, 'logout', 'authentication', 'User Mayette Lagdamin logged out', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-09-11 08:35:06', '2025-09-11 08:35:06'),
(59, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-09-11 08:35:34', '2025-09-11 08:35:34'),
(60, 20, NULL, 'created', 'payment', 'Payment of 75000 received via bank-transfer for event ID 60', 'client', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 'payment', 58, '{\"event_id\":60,\"payment_reference\":\"\",\"payment_date\":\"2025-09-11\"}', 1, NULL, '2025-09-11 08:37:42', '2025-09-11 08:37:42'),
(61, 20, NULL, 'login', 'authentication', 'User Jesse Morcillos logged in successfully', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', NULL, NULL, NULL, 1, NULL, '2025-09-11 08:41:44', '2025-09-11 08:41:44'),
(62, 28, NULL, 'login', 'authentication', 'User Rendon Labrabis logged in successfully', 'organizer', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0', NULL, NULL, NULL, 1, NULL, '2025-09-11 11:16:37', '2025-09-11 11:16:37'),
(63, 7, NULL, 'created', 'event', 'Event \'Test Event [NEW]\' created for 150 guests on 2025-10-25', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 'event', 67, '{\"event_type_id\":2,\"venue_id\":30,\"package_id\":19,\"total_budget\":338000,\"original_booking_reference\":null}', 1, NULL, '2025-09-11 14:01:51', '2025-09-11 14:01:51'),
(64, 30, NULL, 'login', 'authentication', 'User Clyde Parol logged in successfully', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', NULL, NULL, NULL, 1, NULL, '2025-09-11 14:04:19', '2025-09-11 14:04:19'),
(65, 7, NULL, 'created', 'event', 'Event \'Clyde\'s Event 2005\' created for 100 guests on 2025-11-30', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 'event', 68, '{\"event_type_id\":2,\"venue_id\":30,\"package_id\":19,\"total_budget\":278000,\"original_booking_reference\":null}', 1, NULL, '2025-09-11 14:10:22', '2025-09-11 14:10:22'),
(66, 20, NULL, 'login', 'authentication', 'User Jesse Morcillos logged in successfully', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0', NULL, NULL, NULL, 1, NULL, '2025-09-12 10:44:55', '2025-09-12 10:44:55'),
(67, 20, NULL, 'created', 'booking', 'Booking BK-20250913-5280 created for Test on 2025-10-31 with 100 guests', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0', 'booking', 14, '{\"booking_reference\":\"BK-20250913-5280\",\"event_type_id\":5,\"event_date\":\"2025-10-31\",\"guest_count\":100,\"venue_id\":30,\"package_id\":15}', 1, NULL, '2025-09-13 12:45:05', '2025-09-13 12:45:05'),
(68, 20, NULL, 'created', 'booking', 'Booking BK-20250913-4422 created for Test on 2025-10-31 with 100 guests', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0', 'booking', 15, '{\"booking_reference\":\"BK-20250913-4422\",\"event_type_id\":5,\"event_date\":\"2025-10-31\",\"guest_count\":100,\"venue_id\":30,\"package_id\":15}', 1, NULL, '2025-09-13 12:51:28', '2025-09-13 12:51:28'),
(69, 7, NULL, 'status_updated', 'booking', 'Booking BK-20250913-4422 status changed to confirmed', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 'booking', 15, '{\"booking_reference\":\"BK-20250913-4422\"}', 1, NULL, '2025-09-13 12:52:16', '2025-09-13 12:52:16'),
(70, 7, NULL, 'created', 'event', 'Event \'test_test\' created for 100 guests on 2025-11-29', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 'event', 69, '{\"event_type_id\":3,\"venue_id\":34,\"package_id\":22,\"total_budget\":45000,\"original_booking_reference\":null}', 1, NULL, '2025-09-13 13:25:59', '2025-09-13 13:25:59'),
(71, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', NULL, NULL, NULL, 1, NULL, '2025-09-20 23:02:46', '2025-09-20 23:02:46'),
(72, 7, NULL, 'logout', 'authentication', 'User Mayette Lagdamin logged out', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 OPR/121.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-09-21 03:42:23', '2025-09-21 03:42:23'),
(73, 20, NULL, 'login', 'authentication', 'User Jesse Morcillos logged in successfully', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', NULL, NULL, NULL, 1, NULL, '2025-09-21 13:51:06', '2025-09-21 13:51:06'),
(74, 20, NULL, 'login', 'authentication', 'User Jesse Morcillos logged in successfully', 'client', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 OPR/121.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-09-21 14:45:27', '2025-09-21 14:45:27'),
(75, 20, NULL, 'created', 'booking', 'Booking BK-20250922-7592 created for Test on 2025-10-01 with 160 guests', 'client', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 OPR/121.0.0.0', 'booking', 16, '{\"booking_reference\":\"BK-20250922-7592\",\"event_type_id\":3,\"event_date\":\"2025-10-01\",\"guest_count\":160,\"venue_id\":34,\"package_id\":22}', 1, NULL, '2025-09-22 07:36:09', '2025-09-22 07:36:09'),
(76, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', NULL, NULL, NULL, 1, NULL, '2025-09-22 07:58:43', '2025-09-22 07:58:43'),
(77, 7, NULL, 'status_updated', 'booking', 'Booking BK-20250922-7592 status changed to cancelled', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', 'booking', 16, '{\"booking_reference\":\"BK-20250922-7592\"}', 1, NULL, '2025-09-22 07:59:24', '2025-09-22 07:59:24'),
(78, 7, NULL, 'status_updated', 'booking', 'Booking BK-20250913-5280 status changed to cancelled', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', 'booking', 14, '{\"booking_reference\":\"BK-20250913-5280\"}', 1, NULL, '2025-09-22 08:07:07', '2025-09-22 08:07:07'),
(79, 7, NULL, 'status_updated', 'booking', 'Booking BK-20250908-9174 status changed to cancelled', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', 'booking', 13, '{\"booking_reference\":\"BK-20250908-9174\"}', 1, NULL, '2025-09-22 08:07:51', '2025-09-22 08:07:51'),
(80, 20, NULL, 'created', 'booking', 'Booking BK-20250922-9694 created for nnn on 2025-09-23 with 100 guests', 'client', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 OPR/121.0.0.0', 'booking', 17, '{\"booking_reference\":\"BK-20250922-9694\",\"event_type_id\":10,\"event_date\":\"2025-09-23\",\"guest_count\":100,\"venue_id\":1,\"package_id\":24}', 1, NULL, '2025-09-22 08:08:24', '2025-09-22 08:08:24'),
(81, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', NULL, NULL, NULL, 1, NULL, '2025-09-22 09:16:52', '2025-09-22 09:16:52'),
(82, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', NULL, NULL, NULL, 1, NULL, '2025-09-22 12:36:41', '2025-09-22 12:36:41'),
(83, 7, NULL, 'status_updated', 'booking', 'Booking BK-20250922-9694 status changed to confirmed', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', 'booking', 17, '{\"booking_reference\":\"BK-20250922-9694\"}', 1, NULL, '2025-09-22 12:47:06', '2025-09-22 12:47:06'),
(84, 20, NULL, 'login_attempt', 'authentication', 'Failed login attempt for Jesse Morcillos', 'client', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 OPR/121.0.0.0', NULL, NULL, NULL, 0, 'Invalid password', '2025-09-22 12:59:44', '2025-09-22 12:59:44'),
(85, 20, NULL, 'login_attempt', 'authentication', 'Failed login attempt for Jesse Morcillos', 'client', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 OPR/121.0.0.0', NULL, NULL, NULL, 0, 'Invalid password', '2025-09-22 12:59:53', '2025-09-22 12:59:53'),
(86, 20, NULL, 'login', 'authentication', 'User Jesse Morcillos logged in successfully', 'client', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 OPR/121.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-09-22 13:00:15', '2025-09-22 13:00:15'),
(87, 20, NULL, 'created', 'booking', 'Booking BK-20250922-1878 created for Test on 2025-09-25 with 300 guests', 'client', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 OPR/121.0.0.0', 'booking', 18, '{\"booking_reference\":\"BK-20250922-1878\",\"event_type_id\":1,\"event_date\":\"2025-09-25\",\"guest_count\":300,\"venue_id\":34,\"package_id\":25}', 1, NULL, '2025-09-22 13:33:10', '2025-09-22 13:33:10'),
(88, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', NULL, NULL, NULL, 1, NULL, '2025-09-22 13:33:46', '2025-09-22 13:33:46'),
(89, 7, NULL, 'login_attempt', 'authentication', 'Failed login attempt for Mayette Lagdamin', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', NULL, NULL, NULL, 0, 'Invalid password', '2025-09-22 14:08:13', '2025-09-22 14:08:13'),
(90, 7, NULL, 'login_attempt', 'authentication', 'Failed login attempt for Mayette Lagdamin', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', NULL, NULL, NULL, 0, 'Invalid password', '2025-09-22 14:08:21', '2025-09-22 14:08:21'),
(91, 7, NULL, 'login_attempt', 'authentication', 'Failed login attempt for Mayette Lagdamin', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', NULL, NULL, NULL, 0, 'Invalid password', '2025-09-22 14:08:28', '2025-09-22 14:08:28'),
(92, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', NULL, NULL, NULL, 1, NULL, '2025-09-22 14:09:00', '2025-09-22 14:09:00'),
(93, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', NULL, NULL, NULL, 1, NULL, '2025-09-22 14:57:46', '2025-09-22 14:57:46'),
(94, 7, NULL, 'status_updated', 'booking', 'Booking BK-20250922-1878 status changed to confirmed', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', 'booking', 18, '{\"booking_reference\":\"BK-20250922-1878\"}', 1, NULL, '2025-09-22 14:57:56', '2025-09-22 14:57:56'),
(95, 7, NULL, 'created', 'event', 'Event \'Test\' created for 100 guests on 2025-09-25', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', 'event', 70, '{\"event_type_id\":3,\"venue_id\":34,\"package_id\":25,\"total_budget\":32000,\"original_booking_reference\":null}', 1, NULL, '2025-09-22 14:59:23', '2025-09-22 14:59:23'),
(96, 20, NULL, 'login', 'authentication', 'User Jesse Morcillos logged in successfully', 'client', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 OPR/121.0.0.0', NULL, NULL, NULL, 1, NULL, '2025-09-22 15:00:21', '2025-09-22 15:00:21'),
(97, 20, NULL, 'created', 'payment', 'Payment of 16000 received via gcash for event ID 70', 'client', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', 'payment', 63, '{\"event_id\":70,\"payment_reference\":\"324234234\",\"payment_date\":\"2025-09-22\"}', 1, NULL, '2025-09-22 15:45:10', '2025-09-22 15:45:10'),
(98, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', NULL, NULL, NULL, 1, NULL, '2025-09-23 15:51:08', '2025-09-23 15:51:08'),
(99, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', NULL, NULL, NULL, 1, NULL, '2025-09-23 16:09:05', '2025-09-23 16:09:05'),
(100, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully (OTP disabled)', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', NULL, NULL, NULL, 1, NULL, '2025-09-23 16:18:35', '2025-09-23 16:18:35'),
(101, 7, NULL, 'login', 'authentication', 'User Mayette Lagdamin logged in successfully', 'admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', NULL, NULL, NULL, 1, NULL, '2025-09-23 16:19:40', '2025-09-23 16:19:40');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_user_sessions`
--

CREATE TABLE `tbl_user_sessions` (
  `session_id` varchar(128) NOT NULL,
  `user_id` int(11) NOT NULL,
  `user_role` enum('admin','organizer','client','supplier','staff') NOT NULL,
  `login_time` datetime NOT NULL,
  `last_activity` datetime NOT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `logout_time` datetime DEFAULT NULL,
  `session_duration` int(11) DEFAULT NULL COMMENT 'Duration in seconds',
  `logout_reason` enum('manual','timeout','forced','expired') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_venue`
--

CREATE TABLE `tbl_venue` (
  `venue_id` int(11) NOT NULL,
  `venue_title` varchar(255) NOT NULL,
  `user_id` int(11) NOT NULL,
  `feedback_id` int(11) DEFAULT NULL,
  `venue_owner` varchar(255) NOT NULL,
  `venue_location` text NOT NULL,
  `venue_contact` varchar(20) NOT NULL,
  `venue_details` text DEFAULT NULL,
  `venue_status` enum('available','booked','unavailable','maintenance') DEFAULT 'available',
  `is_active` tinyint(1) DEFAULT 1,
  `venue_capacity` int(11) NOT NULL,
  `venue_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `extra_pax_rate` decimal(10,2) DEFAULT 0.00,
  `venue_type` enum('indoor','outdoor','hybrid','garden','hall','pavilion') DEFAULT 'indoor',
  `venue_profile_picture` varchar(255) DEFAULT NULL,
  `venue_cover_photo` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_venue`
--

INSERT INTO `tbl_venue` (`venue_id`, `venue_title`, `user_id`, `feedback_id`, `venue_owner`, `venue_location`, `venue_contact`, `venue_details`, `venue_status`, `is_active`, `venue_capacity`, `venue_price`, `extra_pax_rate`, `venue_type`, `venue_profile_picture`, `venue_cover_photo`, `created_at`, `updated_at`) VALUES
(1, 'Ultrawinds Mountain Resort', 7, NULL, 'Admin', 'Capistrano Street High Way, Cagayan de Oro City', '09176273275', 'Best overlooking place for your events or staycation! ', 'available', 1, 150, 50000.00, 300.00, 'outdoor', 'uploads/venue_profile_pictures/1752900046_687b21ce6a469.jpg', 'uploads/venue_cover_photos/1752900046_687b21ce6ab72.webp', '2025-07-19 04:40:46', '2025-07-19 04:40:46'),
(29, 'Pearlmont Hotel', 7, NULL, 'Admin', 'Limketkai Drive, Cagayan de Oro City', '09176273275', 'Wedding Package 1', 'available', 1, 100, 44000.00, 350.00, '', 'uploads/venue_profile_pictures/1749899533_684d590da78aa.jpg', 'uploads/venue_cover_photos/1749899533_684d590da7bbd.jpg', '2025-06-14 11:12:13', '2025-07-16 17:09:36'),
(30, 'Pearlmont Hotel - Package 2', 7, NULL, 'Admin', 'Limketkai Drive, Cagayan de Oro City', '09176273275', 'Package 2', 'available', 1, 100, 48000.00, 300.00, '', 'uploads/venue_profile_pictures/1749900114_684d5b5252fe9.jpg', 'uploads/venue_cover_photos/1749900114_684d5b5253360.jpg', '2025-06-14 11:21:54', '2025-07-16 17:09:36'),
(34, 'Demiren Hotel', 7, NULL, 'Admin', 'Tiano Kalambaguhan Street, Brgy 14, Cagayan de Oro, Philippines', '0906 231 4236', 'Demiren Hotel & Restuarant has 87 air conditioned rooms w/ hot & cold showers.It has 2 function halls for all occasions. Wifi is free.It has an elevator & 2 standby generators.', 'available', 1, 100, 20000.00, 200.00, 'outdoor', 'uploads/venue_profile_pictures/1751980388_686d1964acfe5.jpg', 'uploads/venue_cover_photos/1751980388_686d1964ad3b8.jpg', '2025-07-08 13:13:08', '2025-07-16 17:09:36'),
(35, 'Ultrawinds Package 2', 7, NULL, 'Admin', 'Limketkai Drive, Cagayan de Oro City', '09176273275', '', 'available', 1, 100, 45000.00, 450.00, 'indoor', 'uploads/venue_profile_pictures/1757017207_68b9f4775064c.jpg', 'uploads/venue_cover_photos/1757017207_68b9f4775097b.jpg', '2025-09-04 20:20:07', '2025-09-04 20:20:07');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_venue_components`
--

CREATE TABLE `tbl_venue_components` (
  `component_id` int(11) NOT NULL,
  `inclusion_id` int(11) NOT NULL,
  `component_name` varchar(255) NOT NULL,
  `component_description` text DEFAULT NULL,
  `component_quantity` int(11) DEFAULT 1,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_venue_components`
--

INSERT INTO `tbl_venue_components` (`component_id`, `inclusion_id`, `component_name`, `component_description`, `component_quantity`, `is_active`, `created_at`) VALUES
(28, 20, '1 room for overnight stay for two', '', 1, 1, '2025-06-14 11:12:13'),
(29, 20, 'Gift Tables', '', 1, 1, '2025-06-14 11:12:13'),
(30, 20, 'White seat cover with motif', '', 1, 1, '2025-06-14 11:12:13'),
(31, 20, 'Debutant\'s Chair', '', 1, 1, '2025-06-14 11:12:13'),
(32, 20, 'Buffet Serving', '', 1, 1, '2025-06-14 11:12:13'),
(33, 20, 'Sound System', '', 1, 1, '2025-06-14 11:12:13'),
(34, 20, 'Standby Waiters', '', 1, 1, '2025-06-14 11:12:13'),
(35, 20, 'Free Corkage on 2 Lechon only', '', 1, 1, '2025-06-14 11:12:13'),
(36, 21, '1 room for overnight stay for two', '', 1, 1, '2025-06-14 11:21:54'),
(37, 21, 'Gift Tables', '', 1, 1, '2025-06-14 11:21:54'),
(38, 21, 'Debutant\'s Chair', '', 1, 1, '2025-06-14 11:21:54'),
(39, 21, 'Buffet Serving', '', 1, 1, '2025-06-14 11:21:54'),
(40, 21, 'Sound System and Disco Lights', '', 1, 1, '2025-06-14 11:21:54'),
(41, 21, 'Standby Waiters', '', 1, 1, '2025-06-14 11:21:54'),
(42, 21, 'Free Corkage on 2 Lechon only', '', 1, 1, '2025-06-14 11:21:54');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_venue_inclusions`
--

CREATE TABLE `tbl_venue_inclusions` (
  `inclusion_id` int(11) NOT NULL,
  `venue_id` int(11) NOT NULL,
  `inclusion_name` varchar(255) NOT NULL,
  `inclusion_price` decimal(10,2) NOT NULL,
  `inclusion_description` text DEFAULT NULL,
  `is_required` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_venue_inclusions`
--

INSERT INTO `tbl_venue_inclusions` (`inclusion_id`, `venue_id`, `inclusion_name`, `inclusion_price`, `inclusion_description`, `is_required`, `is_active`, `created_at`, `updated_at`) VALUES
(20, 29, 'Inclusions', 0.00, '', 0, 1, '2025-06-14 11:12:13', '2025-06-14 11:12:13'),
(21, 30, 'Inclusions', 0.00, '', 0, 1, '2025-06-14 11:21:54', '2025-06-14 11:21:54'),
(22, 34, 'Free Room Accomodation for Two', 0.00, '', 0, 1, '2025-07-08 13:13:08', '2025-07-08 13:13:08'),
(23, 34, 'Free Breakfast', 0.00, '', 0, 1, '2025-07-08 13:13:08', '2025-07-08 13:13:08'),
(24, 34, 'Free Swimming Pool', 0.00, '', 0, 1, '2025-07-08 13:13:08', '2025-07-08 13:13:08'),
(25, 34, 'Full-Pack Catering', 0.00, '', 0, 1, '2025-07-08 13:13:08', '2025-07-08 13:13:08'),
(26, 1, 'All access to all areas', 0.00, '', 0, 1, '2025-07-19 04:40:46', '2025-08-08 19:56:06'),
(27, 1, 'Free Bedroom for 2', 0.00, '', 0, 1, '2025-07-19 04:40:46', '2025-08-08 19:56:06'),
(28, 1, 'Free Breakfast', 0.00, '', 0, 1, '2025-07-19 04:40:46', '2025-08-08 19:56:06'),
(29, 1, 'Free Room Acomodation', 0.00, '', 0, 1, '2025-07-19 04:40:46', '2025-08-08 19:56:06'),
(30, 1, 'Full Dinner Buffet', 0.00, '', 0, 1, '2025-07-19 04:40:46', '2025-08-08 19:56:06'),
(31, 1, 'Live Bands', 0.00, '', 0, 1, '2025-07-19 04:40:46', '2025-08-08 19:56:06'),
(32, 35, 'Room Accomodation', 0.00, '', 0, 1, '2025-09-04 20:20:07', '2025-09-04 20:20:07'),
(33, 35, 'Free Breakfast course meals', 0.00, '', 0, 1, '2025-09-04 20:20:07', '2025-09-04 20:20:07'),
(34, 35, 'Free night party', 0.00, '', 0, 1, '2025-09-04 20:20:07', '2025-09-04 20:20:07');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_venue_price`
--

CREATE TABLE `tbl_venue_price` (
  `tbl_venue_price_id` int(11) NOT NULL,
  `venue_id` int(11) NOT NULL,
  `venue_price_title` varchar(255) NOT NULL,
  `venue_price_min` decimal(10,2) NOT NULL DEFAULT 0.00,
  `venue_price_max` decimal(10,2) NOT NULL DEFAULT 0.00,
  `venue_price_description` text DEFAULT NULL,
  `tbl_capacity` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `price_type` enum('per_hour','per_day','fixed','per_guest') DEFAULT 'fixed'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_website_settings`
--

CREATE TABLE `tbl_website_settings` (
  `setting_id` int(11) NOT NULL,
  `company_name` varchar(255) DEFAULT 'Event Coordination System',
  `company_logo` text DEFAULT NULL,
  `hero_image` text DEFAULT NULL,
  `primary_color` varchar(7) DEFAULT '#16a34a',
  `secondary_color` varchar(7) DEFAULT '#059669',
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `about_text` text DEFAULT NULL,
  `social_facebook` varchar(255) DEFAULT NULL,
  `social_instagram` varchar(255) DEFAULT NULL,
  `social_twitter` varchar(255) DEFAULT NULL,
  `require_otp_on_login` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_website_settings`
--

INSERT INTO `tbl_website_settings` (`setting_id`, `company_name`, `company_logo`, `hero_image`, `primary_color`, `secondary_color`, `contact_email`, `contact_phone`, `address`, `about_text`, `social_facebook`, `social_instagram`, `social_twitter`, `require_otp_on_login`, `created_at`, `updated_at`) VALUES
(1, 'Event Coordination System', '', '', '#059669', '#059669', '', '', '', '', '', '', '', 0, '2025-06-26 05:19:02', '2025-09-23 08:19:49');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_wedding_details`
--

CREATE TABLE `tbl_wedding_details` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `nuptial` varchar(255) DEFAULT NULL,
  `motif` varchar(255) DEFAULT NULL,
  `bride_name` varchar(255) DEFAULT NULL,
  `bride_size` varchar(50) DEFAULT NULL,
  `groom_name` varchar(255) DEFAULT NULL,
  `groom_size` varchar(50) DEFAULT NULL,
  `mother_bride_name` varchar(255) DEFAULT NULL,
  `mother_bride_size` varchar(50) DEFAULT NULL,
  `father_bride_name` varchar(255) DEFAULT NULL,
  `father_bride_size` varchar(50) DEFAULT NULL,
  `mother_groom_name` varchar(255) DEFAULT NULL,
  `mother_groom_size` varchar(50) DEFAULT NULL,
  `father_groom_name` varchar(255) DEFAULT NULL,
  `father_groom_size` varchar(50) DEFAULT NULL,
  `maid_of_honor_name` varchar(255) DEFAULT NULL,
  `maid_of_honor_size` varchar(50) DEFAULT NULL,
  `best_man_name` varchar(255) DEFAULT NULL,
  `best_man_size` varchar(50) DEFAULT NULL,
  `little_bride_name` varchar(255) DEFAULT NULL,
  `little_bride_size` varchar(50) DEFAULT NULL,
  `little_groom_name` varchar(255) DEFAULT NULL,
  `little_groom_size` varchar(50) DEFAULT NULL,
  `bridesmaids_qty` int(11) DEFAULT 0,
  `groomsmen_qty` int(11) DEFAULT 0,
  `junior_groomsmen_qty` int(11) DEFAULT 0,
  `flower_girls_qty` int(11) DEFAULT 0,
  `ring_bearer_qty` int(11) DEFAULT 0,
  `bible_bearer_qty` int(11) DEFAULT 0,
  `coin_bearer_qty` int(11) DEFAULT 0,
  `bridesmaids_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`bridesmaids_names`)),
  `groomsmen_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`groomsmen_names`)),
  `junior_groomsmen_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`junior_groomsmen_names`)),
  `flower_girls_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`flower_girls_names`)),
  `ring_bearer_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ring_bearer_names`)),
  `bible_bearer_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`bible_bearer_names`)),
  `coin_bearer_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`coin_bearer_names`)),
  `cushions_qty` int(11) DEFAULT 0,
  `headdress_qty` int(11) DEFAULT 0,
  `shawls_qty` int(11) DEFAULT 0,
  `veil_cord_qty` int(11) DEFAULT 0,
  `basket_qty` int(11) DEFAULT 0,
  `petticoat_qty` int(11) DEFAULT 0,
  `neck_bowtie_qty` int(11) DEFAULT 0,
  `garter_leg_qty` int(11) DEFAULT 0,
  `fitting_form_qty` int(11) DEFAULT 0,
  `robe_qty` int(11) DEFAULT 0,
  `prepared_by` varchar(255) DEFAULT NULL,
  `received_by` varchar(255) DEFAULT NULL,
  `pickup_date` date DEFAULT NULL,
  `return_date` date DEFAULT NULL,
  `customer_signature` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_activity_timeline`
-- (See below for the actual view)
--
CREATE TABLE `vw_activity_timeline` (
`id` int(11)
,`user_id` int(11)
,`user_name` varchar(101)
,`user_email` varchar(100)
,`user_role` varchar(9)
,`action_type` varchar(100)
,`action_category` varchar(14)
,`description` mediumtext
,`related_entity_type` varchar(50)
,`related_entity_id` int(11)
,`metadata` longtext
,`ip_address` varchar(64)
,`timestamp` datetime
,`success` int(4)
,`failure_reason` varchar(255)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_session_analytics`
-- (See below for the actual view)
--
CREATE TABLE `vw_session_analytics` (
`user_role` enum('admin','organizer','client','supplier','staff')
,`unique_users_logged_in` bigint(21)
,`total_logins` bigint(21)
,`total_logouts` bigint(21)
,`logins_today` bigint(21)
,`logouts_today` bigint(21)
,`logins_week` bigint(21)
,`logouts_week` bigint(21)
,`avg_session_duration` int(1)
,`last_activity` datetime
);

-- --------------------------------------------------------

--
-- Structure for view `vw_activity_timeline`
--
DROP TABLE IF EXISTS `vw_activity_timeline`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_activity_timeline`  AS SELECT `ual`.`id` AS `id`, `ual`.`user_id` AS `user_id`, concat(`u`.`user_firstName`,' ',`u`.`user_lastName`) AS `user_name`, `u`.`user_email` AS `user_email`, `ual`.`user_role` AS `user_role`, `ual`.`action_type` AS `action_type`, `ual`.`action_category` AS `action_category`, `ual`.`description` AS `description`, `ual`.`related_entity_type` AS `related_entity_type`, `ual`.`related_entity_id` AS `related_entity_id`, `ual`.`metadata` AS `metadata`, `ual`.`ip_address` AS `ip_address`, `ual`.`created_at` AS `timestamp`, `ual`.`success` AS `success`, `ual`.`failure_reason` AS `failure_reason` FROM (`tbl_user_activity_logs` `ual` join `tbl_users` `u` on(`ual`.`user_id` = `u`.`user_id`))union all select `pal`.`id` AS `id`,`pal`.`user_id` AS `user_id`,concat(`u`.`user_firstName`,' ',`u`.`user_lastName`) AS `user_name`,`u`.`user_email` AS `user_email`,`u`.`user_role` AS `user_role`,`pal`.`action` AS `action_type`,'payment' AS `action_category`,`pal`.`description` AS `description`,'payment' AS `related_entity_type`,`pal`.`payment_id` AS `related_entity_id`,`pal`.`metadata` AS `metadata`,NULL AS `ip_address`,`pal`.`created_at` AS `timestamp`,1 AS `success`,NULL AS `failure_reason` from (`tbl_payment_activity_logs` `pal` join `tbl_users` `u` on(`pal`.`user_id` = `u`.`user_id`)) union all select `eal`.`id` AS `id`,`eal`.`user_id` AS `user_id`,concat(`u`.`user_firstName`,' ',`u`.`user_lastName`) AS `user_name`,`u`.`user_email` AS `user_email`,`u`.`user_role` AS `user_role`,`eal`.`action` AS `action_type`,'event' AS `action_category`,`eal`.`description` AS `description`,'event' AS `related_entity_type`,`eal`.`event_id` AS `related_entity_id`,`eal`.`metadata` AS `metadata`,NULL AS `ip_address`,`eal`.`created_at` AS `timestamp`,1 AS `success`,NULL AS `failure_reason` from (`tbl_event_activity_logs` `eal` join `tbl_users` `u` on(`eal`.`user_id` = `u`.`user_id`)) union all select `bal`.`id` AS `id`,`bal`.`user_id` AS `user_id`,concat(`u`.`user_firstName`,' ',`u`.`user_lastName`) AS `user_name`,`u`.`user_email` AS `user_email`,`u`.`user_role` AS `user_role`,`bal`.`action` AS `action_type`,'booking' AS `action_category`,`bal`.`description` AS `description`,'booking' AS `related_entity_type`,`bal`.`booking_id` AS `related_entity_id`,`bal`.`metadata` AS `metadata`,NULL AS `ip_address`,`bal`.`created_at` AS `timestamp`,1 AS `success`,NULL AS `failure_reason` from (`tbl_booking_activity_logs` `bal` join `tbl_users` `u` on(`bal`.`user_id` = `u`.`user_id`)) order by `timestamp` desc  ;

-- --------------------------------------------------------

--
-- Structure for view `vw_session_analytics`
--
DROP TABLE IF EXISTS `vw_session_analytics`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_session_analytics`  AS SELECT `u`.`user_role` AS `user_role`, count(distinct `ual`.`user_id`) AS `unique_users_logged_in`, count(case when `ual`.`action_type` = 'login' then 1 end) AS `total_logins`, count(case when `ual`.`action_type` = 'logout' then 1 end) AS `total_logouts`, count(case when `ual`.`action_type` = 'login' and cast(`ual`.`created_at` as date) = curdate() then 1 end) AS `logins_today`, count(case when `ual`.`action_type` = 'logout' and cast(`ual`.`created_at` as date) = curdate() then 1 end) AS `logouts_today`, count(case when `ual`.`action_type` = 'login' and `ual`.`created_at` >= current_timestamp() - interval 7 day then 1 end) AS `logins_week`, count(case when `ual`.`action_type` = 'logout' and `ual`.`created_at` >= current_timestamp() - interval 7 day then 1 end) AS `logouts_week`, 0 AS `avg_session_duration`, max(`ual`.`created_at`) AS `last_activity` FROM (`tbl_user_activity_logs` `ual` join `tbl_users` `u` on(`ual`.`user_id` = `u`.`user_id`)) WHERE `ual`.`created_at` >= current_timestamp() - interval 30 day GROUP BY `u`.`user_role` ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tbl_bookings`
--
ALTER TABLE `tbl_bookings`
  ADD PRIMARY KEY (`booking_id`);

--
-- Indexes for table `tbl_booking_activity_logs`
--
ALTER TABLE `tbl_booking_activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_booking_activity_booking` (`booking_id`),
  ADD KEY `idx_booking_activity_user` (`user_id`),
  ADD KEY `idx_booking_activity_date` (`created_at`),
  ADD KEY `idx_booking_activity_timestamp` (`created_at`);

--
-- Indexes for table `tbl_booking_custom_inclusions`
--
ALTER TABLE `tbl_booking_custom_inclusions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `inclusion_id` (`inclusion_id`);

--
-- Indexes for table `tbl_booking_removed_inclusions`
--
ALTER TABLE `tbl_booking_removed_inclusions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `inclusion_id` (`inclusion_id`);

--
-- Indexes for table `tbl_document_types`
--
ALTER TABLE `tbl_document_types`
  ADD PRIMARY KEY (`type_id`),
  ADD UNIQUE KEY `type_code` (`type_code`);

--
-- Indexes for table `tbl_email_logs`
--
ALTER TABLE `tbl_email_logs`
  ADD PRIMARY KEY (`email_log_id`),
  ADD KEY `idx_email_logs_recipient` (`recipient_email`),
  ADD KEY `idx_email_logs_type` (`email_type`),
  ADD KEY `idx_email_logs_status` (`sent_status`),
  ADD KEY `idx_email_logs_date` (`created_at`);

--
-- Indexes for table `tbl_events`
--
ALTER TABLE `tbl_events`
  ADD PRIMARY KEY (`event_id`),
  ADD KEY `idx_organizer_id` (`organizer_id`);

--
-- Indexes for table `tbl_event_activity_logs`
--
ALTER TABLE `tbl_event_activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_event_activity_event` (`event_id`),
  ADD KEY `idx_event_activity_user` (`user_id`),
  ADD KEY `idx_event_activity_date` (`created_at`),
  ADD KEY `idx_event_activity_timestamp` (`created_at`);

--
-- Indexes for table `tbl_event_components`
--
ALTER TABLE `tbl_event_components`
  ADD PRIMARY KEY (`component_id`),
  ADD KEY `idx_event_component_supplier` (`supplier_id`),
  ADD KEY `idx_event_component_offer` (`offer_id`),
  ADD KEY `idx_event_component_status` (`supplier_status`),
  ADD KEY `idx_event_component_rated` (`is_rated`),
  ADD KEY `idx_event_components_payment_status` (`payment_status`);

--
-- Indexes for table `tbl_event_organizer_assignments`
--
ALTER TABLE `tbl_event_organizer_assignments`
  ADD PRIMARY KEY (`assignment_id`),
  ADD UNIQUE KEY `unique_organizer_event` (`organizer_id`,`event_id`),
  ADD KEY `idx_event_id` (`event_id`),
  ADD KEY `idx_organizer_id` (`organizer_id`),
  ADD KEY `idx_assigned_by` (`assigned_by`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_assignment_fee_status` (`fee_status`,`organizer_id`);

--
-- Indexes for table `tbl_offer_subcomponents`
--
ALTER TABLE `tbl_offer_subcomponents`
  ADD PRIMARY KEY (`component_id`),
  ADD KEY `offer_id` (`offer_id`);

--
-- Indexes for table `tbl_organizer`
--
ALTER TABLE `tbl_organizer`
  ADD PRIMARY KEY (`organizer_id`),
  ADD UNIQUE KEY `unique_user_organizer` (`user_id`),
  ADD KEY `idx_organizer_availability` (`organizer_availability`),
  ADD KEY `idx_organizer_created` (`created_at`),
  ADD KEY `idx_organizer_talent_fee_range` (`talent_fee_min`,`talent_fee_max`);

--
-- Indexes for table `tbl_organizer_activity_logs`
--
ALTER TABLE `tbl_organizer_activity_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `idx_organizer_activity` (`organizer_id`),
  ADD KEY `idx_activity_type` (`activity_type`),
  ADD KEY `idx_activity_date` (`created_at`);

--
-- Indexes for table `tbl_packages`
--
ALTER TABLE `tbl_packages`
  ADD PRIMARY KEY (`package_id`);

--
-- Indexes for table `tbl_payments`
--
ALTER TABLE `tbl_payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `idx_payment_duplicate_check` (`event_id`,`payment_amount`,`payment_date`,`payment_method`,`payment_status`);

--
-- Indexes for table `tbl_payment_activity_logs`
--
ALTER TABLE `tbl_payment_activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_payment_activity_payment` (`payment_id`),
  ADD KEY `idx_payment_activity_user` (`user_id`),
  ADD KEY `idx_payment_activity_date` (`created_at`),
  ADD KEY `idx_payment_activity_timestamp` (`created_at`);

--
-- Indexes for table `tbl_signup_otp`
--
ALTER TABLE `tbl_signup_otp`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_email` (`user_id`,`email`),
  ADD KEY `idx_otp_email` (`email`),
  ADD KEY `idx_otp_expires` (`expires_at`);

--
-- Indexes for table `tbl_staff`
--
ALTER TABLE `tbl_staff`
  ADD PRIMARY KEY (`staff_id`),
  ADD UNIQUE KEY `unique_user_staff` (`user_id`),
  ADD KEY `idx_staff_role` (`role_title`),
  ADD KEY `idx_staff_created_at` (`created_at`);

--
-- Indexes for table `tbl_suppliers`
--
ALTER TABLE `tbl_suppliers`
  ADD PRIMARY KEY (`supplier_id`),
  ADD KEY `idx_supplier_user` (`user_id`),
  ADD KEY `idx_supplier_type` (`supplier_type`),
  ADD KEY `idx_supplier_category` (`specialty_category`),
  ADD KEY `idx_supplier_verified` (`is_verified`),
  ADD KEY `idx_supplier_active` (`is_active`);

--
-- Indexes for table `tbl_supplier_activity`
--
ALTER TABLE `tbl_supplier_activity`
  ADD PRIMARY KEY (`activity_id`),
  ADD KEY `idx_supplier_activity_supplier` (`supplier_id`),
  ADD KEY `idx_supplier_activity_type` (`activity_type`),
  ADD KEY `idx_supplier_activity_date` (`created_at`);

--
-- Indexes for table `tbl_supplier_credentials`
--
ALTER TABLE `tbl_supplier_credentials`
  ADD PRIMARY KEY (`credential_id`),
  ADD KEY `idx_supplier_credentials_supplier` (`supplier_id`),
  ADD KEY `idx_supplier_credentials_user` (`user_id`),
  ADD KEY `idx_supplier_credentials_expires` (`expires_at`);

--
-- Indexes for table `tbl_supplier_documents`
--
ALTER TABLE `tbl_supplier_documents`
  ADD PRIMARY KEY (`document_id`),
  ADD KEY `idx_supplier_documents_supplier` (`supplier_id`),
  ADD KEY `idx_supplier_documents_type` (`document_type`),
  ADD KEY `idx_supplier_documents_active` (`is_active`);

--
-- Indexes for table `tbl_supplier_offers`
--
ALTER TABLE `tbl_supplier_offers`
  ADD PRIMARY KEY (`offer_id`),
  ADD KEY `fk_offer_supplier` (`supplier_id`),
  ADD KEY `idx_offer_category` (`service_category`),
  ADD KEY `idx_offer_package_size` (`package_size`),
  ADD KEY `idx_offer_active` (`is_active`);

--
-- Indexes for table `tbl_supplier_ratings`
--
ALTER TABLE `tbl_supplier_ratings`
  ADD PRIMARY KEY (`rating_id`),
  ADD KEY `fk_rating_supplier` (`supplier_id`),
  ADD KEY `fk_rating_event` (`event_id`),
  ADD KEY `fk_rating_client` (`client_id`),
  ADD KEY `fk_rating_admin` (`admin_id`),
  ADD KEY `idx_rating_public` (`is_public`);

--
-- Indexes for table `tbl_supplier_verification_requests`
--
ALTER TABLE `tbl_supplier_verification_requests`
  ADD PRIMARY KEY (`verification_id`),
  ADD KEY `idx_supplier_verification_supplier` (`supplier_id`),
  ADD KEY `idx_supplier_verification_status` (`status`),
  ADD KEY `idx_supplier_verification_date` (`created_at`);

--
-- Indexes for table `tbl_system_activity_logs`
--
ALTER TABLE `tbl_system_activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_system_activity_user` (`user_id`),
  ADD KEY `idx_system_activity_type` (`action_type`),
  ADD KEY `idx_system_activity_date` (`created_at`),
  ADD KEY `idx_system_activity_timestamp` (`created_at`);

--
-- Indexes for table `tbl_users`
--
ALTER TABLE `tbl_users`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `tbl_user_activity_logs`
--
ALTER TABLE `tbl_user_activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_activity_user` (`user_id`),
  ADD KEY `idx_user_activity_action` (`action_type`),
  ADD KEY `idx_user_activity_category` (`action_category`),
  ADD KEY `idx_user_activity_date` (`created_at`),
  ADD KEY `idx_user_activity_role` (`user_role`),
  ADD KEY `idx_user_activity_session` (`session_id`),
  ADD KEY `idx_user_activity_entity` (`related_entity_type`,`related_entity_id`),
  ADD KEY `idx_activity_timeline_timestamp` (`created_at`);

--
-- Indexes for table `tbl_user_sessions`
--
ALTER TABLE `tbl_user_sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `idx_sessions_user` (`user_id`),
  ADD KEY `idx_sessions_active` (`is_active`),
  ADD KEY `idx_sessions_role` (`user_role`),
  ADD KEY `idx_sessions_login_time` (`login_time`),
  ADD KEY `idx_sessions_last_activity` (`last_activity`);

--
-- Indexes for table `tbl_venue`
--
ALTER TABLE `tbl_venue`
  ADD PRIMARY KEY (`venue_id`);

--
-- Indexes for table `tbl_venue_inclusions`
--
ALTER TABLE `tbl_venue_inclusions`
  ADD PRIMARY KEY (`inclusion_id`),
  ADD KEY `idx_tbl_venue_inclusions_venue_id` (`venue_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tbl_bookings`
--
ALTER TABLE `tbl_bookings`
  MODIFY `booking_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `tbl_booking_activity_logs`
--
ALTER TABLE `tbl_booking_activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `tbl_booking_custom_inclusions`
--
ALTER TABLE `tbl_booking_custom_inclusions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_booking_removed_inclusions`
--
ALTER TABLE `tbl_booking_removed_inclusions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_document_types`
--
ALTER TABLE `tbl_document_types`
  MODIFY `type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `tbl_email_logs`
--
ALTER TABLE `tbl_email_logs`
  MODIFY `email_log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tbl_events`
--
ALTER TABLE `tbl_events`
  MODIFY `event_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=71;

--
-- AUTO_INCREMENT for table `tbl_event_activity_logs`
--
ALTER TABLE `tbl_event_activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_event_components`
--
ALTER TABLE `tbl_event_components`
  MODIFY `component_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=529;

--
-- AUTO_INCREMENT for table `tbl_event_organizer_assignments`
--
ALTER TABLE `tbl_event_organizer_assignments`
  MODIFY `assignment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

--
-- AUTO_INCREMENT for table `tbl_offer_subcomponents`
--
ALTER TABLE `tbl_offer_subcomponents`
  MODIFY `component_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_organizer`
--
ALTER TABLE `tbl_organizer`
  MODIFY `organizer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tbl_organizer_activity_logs`
--
ALTER TABLE `tbl_organizer_activity_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=109;

--
-- AUTO_INCREMENT for table `tbl_packages`
--
ALTER TABLE `tbl_packages`
  MODIFY `package_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `tbl_payments`
--
ALTER TABLE `tbl_payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=64;

--
-- AUTO_INCREMENT for table `tbl_payment_activity_logs`
--
ALTER TABLE `tbl_payment_activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_signup_otp`
--
ALTER TABLE `tbl_signup_otp`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_staff`
--
ALTER TABLE `tbl_staff`
  MODIFY `staff_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_suppliers`
--
ALTER TABLE `tbl_suppliers`
  MODIFY `supplier_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tbl_supplier_activity`
--
ALTER TABLE `tbl_supplier_activity`
  MODIFY `activity_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_supplier_credentials`
--
ALTER TABLE `tbl_supplier_credentials`
  MODIFY `credential_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_supplier_documents`
--
ALTER TABLE `tbl_supplier_documents`
  MODIFY `document_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_supplier_offers`
--
ALTER TABLE `tbl_supplier_offers`
  MODIFY `offer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_supplier_ratings`
--
ALTER TABLE `tbl_supplier_ratings`
  MODIFY `rating_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_supplier_verification_requests`
--
ALTER TABLE `tbl_supplier_verification_requests`
  MODIFY `verification_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_system_activity_logs`
--
ALTER TABLE `tbl_system_activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_users`
--
ALTER TABLE `tbl_users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `tbl_user_activity_logs`
--
ALTER TABLE `tbl_user_activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=102;

--
-- AUTO_INCREMENT for table `tbl_venue`
--
ALTER TABLE `tbl_venue`
  MODIFY `venue_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `tbl_venue_inclusions`
--
ALTER TABLE `tbl_venue_inclusions`
  MODIFY `inclusion_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tbl_booking_activity_logs`
--
ALTER TABLE `tbl_booking_activity_logs`
  ADD CONSTRAINT `tbl_booking_activity_logs_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `tbl_bookings` (`booking_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_booking_activity_logs_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_event_activity_logs`
--
ALTER TABLE `tbl_event_activity_logs`
  ADD CONSTRAINT `tbl_event_activity_logs_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_event_activity_logs_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_event_components`
--
ALTER TABLE `tbl_event_components`
  ADD CONSTRAINT `fk_event_component_offer` FOREIGN KEY (`offer_id`) REFERENCES `tbl_supplier_offers` (`offer_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_component_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `tbl_suppliers` (`supplier_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `tbl_event_organizer_assignments`
--
ALTER TABLE `tbl_event_organizer_assignments`
  ADD CONSTRAINT `fk_event_organizer_admin` FOREIGN KEY (`assigned_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_event_organizer_event` FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_event_organizer_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `tbl_organizer` (`organizer_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_offer_subcomponents`
--
ALTER TABLE `tbl_offer_subcomponents`
  ADD CONSTRAINT `fk_offer_subcomponents_offer` FOREIGN KEY (`offer_id`) REFERENCES `tbl_supplier_offers` (`offer_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_organizer`
--
ALTER TABLE `tbl_organizer`
  ADD CONSTRAINT `fk_organizer_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_organizer_activity_logs`
--
ALTER TABLE `tbl_organizer_activity_logs`
  ADD CONSTRAINT `fk_activity_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `tbl_organizer` (`organizer_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_payment_activity_logs`
--
ALTER TABLE `tbl_payment_activity_logs`
  ADD CONSTRAINT `tbl_payment_activity_logs_ibfk_1` FOREIGN KEY (`payment_id`) REFERENCES `tbl_payments` (`payment_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_payment_activity_logs_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_staff`
--
ALTER TABLE `tbl_staff`
  ADD CONSTRAINT `fk_staff_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_supplier_offers`
--
ALTER TABLE `tbl_supplier_offers`
  ADD CONSTRAINT `fk_offer_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `tbl_suppliers` (`supplier_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_supplier_ratings`
--
ALTER TABLE `tbl_supplier_ratings`
  ADD CONSTRAINT `fk_rating_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `tbl_suppliers` (`supplier_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_system_activity_logs`
--
ALTER TABLE `tbl_system_activity_logs`
  ADD CONSTRAINT `tbl_system_activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_user_activity_logs`
--
ALTER TABLE `tbl_user_activity_logs`
  ADD CONSTRAINT `tbl_user_activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_user_sessions`
--
ALTER TABLE `tbl_user_sessions`
  ADD CONSTRAINT `tbl_user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_venue_inclusions`
--
ALTER TABLE `tbl_venue_inclusions`
  ADD CONSTRAINT `fk_inclusions_venue` FOREIGN KEY (`venue_id`) REFERENCES `tbl_venue` (`venue_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
