-- Migration: Create missing notification procedures
-- Date: 2025-01-27
-- Description: Create CreatePaymentDueNotifications and CleanupExpiredNotifications procedures

-- Drop existing procedures if they exist
DROP PROCEDURE IF EXISTS `CreatePaymentDueNotifications`;
DROP PROCEDURE IF EXISTS `CleanupExpiredNotifications`;

DELIMITER $$

-- Procedure to create payment due notifications
CREATE DEFINER=`root`@`localhost` PROCEDURE `CreatePaymentDueNotifications`()
BEGIN
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

-- Procedure to cleanup expired notifications
CREATE DEFINER=`root`@`localhost` PROCEDURE `CleanupExpiredNotifications`()
BEGIN
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

DELIMITER ;

-- Migration completed successfully
