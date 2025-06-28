-- Payment System Enhancements for Event Management System
-- This file contains additional tables and modifications to handle payment schedules and installments

-- ========================================
-- 1. Payment Schedule Types Table
-- ========================================
CREATE TABLE `tbl_payment_schedule_types` (
  `schedule_type_id` int(11) NOT NULL AUTO_INCREMENT,
  `schedule_name` varchar(100) NOT NULL,
  `schedule_description` text DEFAULT NULL,
  `installment_count` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`schedule_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert default payment schedule types
INSERT INTO `tbl_payment_schedule_types` (`schedule_name`, `schedule_description`, `installment_count`) VALUES
('Full Payment', 'Pay the entire amount at once', 1),
('50-50 Payment', '50% down payment, 50% before event', 2),
('Monthly Installments', 'Pay in monthly installments', 3),
('Quarterly Installments', 'Pay in quarterly installments', 4),
('Custom Schedule', 'Custom payment schedule as agreed', 0);

-- ========================================
-- 2. Event Payment Schedules Table
-- ========================================
CREATE TABLE `tbl_event_payment_schedules` (
  `schedule_id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `schedule_type_id` int(11) NOT NULL,
  `installment_number` int(11) NOT NULL DEFAULT 1,
  `due_date` date NOT NULL,
  `amount_due` decimal(12,2) NOT NULL,
  `amount_paid` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_status` enum('pending','partial','paid','overdue') NOT NULL DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`schedule_id`),
  KEY `fk_schedule_event` (`event_id`),
  KEY `fk_schedule_type` (`schedule_type_id`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_payment_status` (`payment_status`),
  CONSTRAINT `fk_schedule_event` FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_schedule_type` FOREIGN KEY (`schedule_type_id`) REFERENCES `tbl_payment_schedule_types` (`schedule_type_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- 3. Enhanced Payment Logs Table
-- ========================================
CREATE TABLE `tbl_payment_logs` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `schedule_id` int(11) DEFAULT NULL,
  `payment_id` int(11) DEFAULT NULL,
  `client_id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `action_type` enum('payment_received','payment_confirmed','payment_rejected','schedule_created','schedule_updated','reminder_sent') NOT NULL,
  `amount` decimal(12,2) DEFAULT NULL,
  `reference_number` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`),
  KEY `fk_log_event` (`event_id`),
  KEY `fk_log_schedule` (`schedule_id`),
  KEY `fk_log_payment` (`payment_id`),
  KEY `fk_log_client` (`client_id`),
  KEY `fk_log_admin` (`admin_id`),
  KEY `idx_action_type` (`action_type`),
  CONSTRAINT `fk_log_event` FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_log_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `tbl_event_payment_schedules` (`schedule_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_log_payment` FOREIGN KEY (`payment_id`) REFERENCES `tbl_payments` (`payment_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_log_client` FOREIGN KEY (`client_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_log_admin` FOREIGN KEY (`admin_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- 4. Add Payment Schedule Reference to Events Table
-- ========================================
ALTER TABLE `tbl_events`
ADD COLUMN `payment_schedule_type_id` int(11) DEFAULT NULL AFTER `payment_method`,
ADD KEY `fk_event_schedule_type` (`payment_schedule_type_id`),
ADD CONSTRAINT `fk_event_schedule_type` FOREIGN KEY (`payment_schedule_type_id`) REFERENCES `tbl_payment_schedule_types` (`schedule_type_id`) ON DELETE SET NULL;

-- ========================================
-- 5. Add Schedule Reference to Payments Table
-- ========================================
ALTER TABLE `tbl_payments`
ADD COLUMN `schedule_id` int(11) DEFAULT NULL AFTER `event_id`,
ADD KEY `fk_payment_schedule` (`schedule_id`),
ADD CONSTRAINT `fk_payment_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `tbl_event_payment_schedules` (`schedule_id`) ON DELETE SET NULL;

-- ========================================
-- 6. Enhanced Payment Status Update Triggers
-- ========================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS `update_event_payment_status`;
DROP TRIGGER IF EXISTS `update_event_payment_status_on_update`;

-- New trigger to update payment schedule when payment is made
DELIMITER $$
CREATE TRIGGER `update_payment_schedule_on_payment`
AFTER INSERT ON `tbl_payments`
FOR EACH ROW
BEGIN
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

END$$

-- Trigger for payment updates
CREATE TRIGGER `update_payment_schedule_on_payment_update`
AFTER UPDATE ON `tbl_payments`
FOR EACH ROW
BEGIN
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

END$$
DELIMITER ;

-- ========================================
-- 7. Enhanced Views for Payment Tracking
-- ========================================

-- Drop existing view
DROP VIEW IF EXISTS `view_event_payments`;

-- Enhanced event payments view
CREATE VIEW `view_event_payments` AS
SELECT
  e.event_id,
  e.event_title,
  e.event_date,
  e.payment_status as event_payment_status,
  e.total_budget,
  e.down_payment,
  e.payment_schedule_type_id,
  pst.schedule_name as payment_schedule_name,
  c.user_firstName,
  c.user_lastName,
  c.user_email,
  a.user_firstName as admin_firstName,
  a.user_lastName as admin_lastName,

  -- Payment schedule details
  eps.schedule_id,
  eps.installment_number,
  eps.due_date,
  eps.amount_due as schedule_amount_due,
  eps.amount_paid as schedule_amount_paid,
  eps.payment_status as schedule_payment_status,

  -- Individual payment details
  p.payment_id,
  p.payment_amount,
  p.payment_method,
  p.payment_status,
  p.payment_date,
  p.payment_reference,
  p.payment_percentage,

  -- Calculated fields
  e.total_budget - COALESCE((SELECT SUM(payment_amount) FROM tbl_payments WHERE event_id = e.event_id AND payment_status = 'completed'), 0) as remaining_balance,
  COALESCE((SELECT SUM(payment_amount) FROM tbl_payments WHERE event_id = e.event_id AND payment_status = 'completed'), 0) as total_paid,

  -- Overdue check
  CASE
    WHEN eps.due_date < CURDATE() AND eps.payment_status != 'paid' THEN 'overdue'
    WHEN eps.due_date = CURDATE() AND eps.payment_status != 'paid' THEN 'due_today'
    ELSE 'current'
  END as payment_urgency

FROM tbl_events e
LEFT JOIN tbl_users c ON e.user_id = c.user_id
LEFT JOIN tbl_users a ON e.admin_id = a.user_id
LEFT JOIN tbl_payment_schedule_types pst ON e.payment_schedule_type_id = pst.schedule_type_id
LEFT JOIN tbl_event_payment_schedules eps ON e.event_id = eps.event_id
LEFT JOIN tbl_payments p ON eps.schedule_id = p.schedule_id AND p.payment_status = 'completed'
ORDER BY e.event_id, eps.installment_number, p.payment_date;

-- Client payment summary view
CREATE VIEW `view_client_payment_summary` AS
SELECT
  e.event_id,
  e.event_title,
  e.event_date,
  e.user_id as client_id,
  CONCAT(c.user_firstName, ' ', c.user_lastName) as client_name,
  e.total_budget,
  e.down_payment,
  pst.schedule_name,

  -- Payment totals
  COALESCE(SUM(p.payment_amount), 0) as total_paid,
  e.total_budget - COALESCE(SUM(p.payment_amount), 0) as remaining_balance,

  -- Payment progress
  ROUND((COALESCE(SUM(p.payment_amount), 0) / e.total_budget) * 100, 2) as payment_progress_percent,

  -- Schedule status
  COUNT(eps.schedule_id) as total_installments,
  SUM(CASE WHEN eps.payment_status = 'paid' THEN 1 ELSE 0 END) as paid_installments,
  SUM(CASE WHEN eps.payment_status = 'overdue' OR (eps.due_date < CURDATE() AND eps.payment_status != 'paid') THEN 1 ELSE 0 END) as overdue_installments,

  -- Next payment info
  (SELECT MIN(due_date) FROM tbl_event_payment_schedules WHERE event_id = e.event_id AND payment_status != 'paid') as next_payment_due,
  (SELECT amount_due FROM tbl_event_payment_schedules WHERE event_id = e.event_id AND payment_status != 'paid' ORDER BY due_date LIMIT 1) as next_payment_amount,

  e.payment_status as overall_status

FROM tbl_events e
LEFT JOIN tbl_users c ON e.user_id = c.user_id
LEFT JOIN tbl_payment_schedule_types pst ON e.payment_schedule_type_id = pst.schedule_type_id
LEFT JOIN tbl_event_payment_schedules eps ON e.event_id = eps.event_id
LEFT JOIN tbl_payments p ON eps.schedule_id = p.schedule_id AND p.payment_status = 'completed'
GROUP BY e.event_id;

-- ========================================
-- 8. Stored Procedures for Payment Management
-- ========================================

-- Procedure to create payment schedule for an event
DELIMITER $$
CREATE PROCEDURE `sp_create_payment_schedule`(
  IN p_event_id INT,
  IN p_schedule_type_id INT,
  IN p_installment_dates TEXT, -- JSON format: [{"date":"2025-07-01","amount":50000}, ...]
  IN p_admin_id INT
)
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE installment_num INT DEFAULT 1;
  DECLARE due_date_str VARCHAR(20);
  DECLARE amount_due_val DECIMAL(12,2);

  -- Delete existing schedules for this event
  DELETE FROM tbl_event_payment_schedules WHERE event_id = p_event_id;

  -- Update event with schedule type
  UPDATE tbl_events SET payment_schedule_type_id = p_schedule_type_id WHERE event_id = p_event_id;

  -- Parse installment dates and create schedule entries
  -- This is a simplified version - in real implementation, you'd parse JSON properly
  -- For now, we'll create a basic schedule based on type

  IF p_schedule_type_id = 1 THEN -- Full Payment
    INSERT INTO tbl_event_payment_schedules (event_id, schedule_type_id, installment_number, due_date, amount_due)
    SELECT p_event_id, p_schedule_type_id, 1, event_date, total_budget - down_payment
    FROM tbl_events WHERE event_id = p_event_id;

  ELSEIF p_schedule_type_id = 2 THEN -- 50-50 Payment
    INSERT INTO tbl_event_payment_schedules (event_id, schedule_type_id, installment_number, due_date, amount_due)
    SELECT p_event_id, p_schedule_type_id, 1, DATE_SUB(event_date, INTERVAL 30 DAY), (total_budget - down_payment) / 2
    FROM tbl_events WHERE event_id = p_event_id;

    INSERT INTO tbl_event_payment_schedules (event_id, schedule_type_id, installment_number, due_date, amount_due)
    SELECT p_event_id, p_schedule_type_id, 2, DATE_SUB(event_date, INTERVAL 7 DAY), (total_budget - down_payment) / 2
    FROM tbl_events WHERE event_id = p_event_id;
  END IF;

  -- Log the schedule creation
  INSERT INTO tbl_payment_logs (event_id, client_id, admin_id, action_type, notes)
  SELECT p_event_id, user_id, p_admin_id, 'schedule_created', CONCAT('Payment schedule created with type: ', pst.schedule_name)
  FROM tbl_events e
  LEFT JOIN tbl_payment_schedule_types pst ON pst.schedule_type_id = p_schedule_type_id
  WHERE e.event_id = p_event_id;

END$$
DELIMITER ;

-- ========================================
-- 9. Sample Data for Testing
-- ========================================

-- Insert sample payment schedules for existing events
INSERT INTO `tbl_event_payment_schedules` (`event_id`, `schedule_type_id`, `installment_number`, `due_date`, `amount_due`)
SELECT
  e.event_id,
  2 as schedule_type_id, -- 50-50 payment
  1 as installment_number,
  DATE_SUB(e.event_date, INTERVAL 30 DAY) as due_date,
  (e.total_budget - e.down_payment) / 2 as amount_due
FROM tbl_events e
WHERE e.event_id IN (10, 11, 12);

INSERT INTO `tbl_event_payment_schedules` (`event_id`, `schedule_type_id`, `installment_number`, `due_date`, `amount_due`)
SELECT
  e.event_id,
  2 as schedule_type_id, -- 50-50 payment
  2 as installment_number,
  DATE_SUB(e.event_date, INTERVAL 7 DAY) as due_date,
  (e.total_budget - e.down_payment) / 2 as amount_due
FROM tbl_events e
WHERE e.event_id IN (10, 11, 12);

-- Update existing events with payment schedule type
UPDATE tbl_events SET payment_schedule_type_id = 2 WHERE event_id IN (10, 11, 12);
