-- Migration: Fix CreateNotification procedure parameter mismatch
-- Date: 2025-01-27
-- Description: Update CreateNotification procedure to accept all parameters being passed by triggers

-- Drop the existing procedure
DROP PROCEDURE IF EXISTS `CreateNotification`;

-- Create the updated procedure with all required parameters
DELIMITER $$

CREATE DEFINER=`root`@`localhost` PROCEDURE `CreateNotification` (
    IN `p_user_id` INT,
    IN `p_notification_type` VARCHAR(50),
    IN `p_notification_title` VARCHAR(255),
    IN `p_notification_message` TEXT,
    IN `p_notification_priority` VARCHAR(10),
    IN `p_notification_icon` VARCHAR(50),
    IN `p_notification_url` VARCHAR(500),
    IN `p_event_id` INT,
    IN `p_booking_id` INT,
    IN `p_venue_id` INT,
    IN `p_store_id` INT,
    IN `p_budget_id` INT,
    IN `p_feedback_id` INT,
    IN `p_expires_at` TIMESTAMP
)
BEGIN
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

DELIMITER ;

-- Migration completed successfully
