-- Fix Database Triggers - Remove user_status References
-- Date: 2024-01-26
-- Description: Fix triggers that reference non-existent user_status column

-- First, drop the existing problematic triggers
DROP TRIGGER IF EXISTS `notify_on_event_create`;
DROP TRIGGER IF EXISTS `notify_on_payment_create`;

-- Recreate notify_on_event_create trigger WITHOUT user_status reference
DELIMITER $$
CREATE TRIGGER `notify_on_event_create` AFTER INSERT ON `tbl_events` FOR EACH ROW
BEGIN
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
END$$
DELIMITER ;

-- Recreate notify_on_payment_create trigger WITHOUT user_status reference
DELIMITER $$
CREATE TRIGGER `notify_on_payment_create` AFTER INSERT ON `tbl_payments` FOR EACH ROW
BEGIN
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
END$$
DELIMITER ;

-- Verification queries (uncomment to test)
-- SHOW TRIGGERS WHERE `Table` = 'tbl_events';
-- SHOW TRIGGERS WHERE `Table` = 'tbl_payments';
-- SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE FROM INFORMATION_SCHEMA.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE();
