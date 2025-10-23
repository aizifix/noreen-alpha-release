-- Create table for event cancellations
CREATE TABLE IF NOT EXISTS `tbl_event_cancellations` (
  `cancellation_id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `cancelled_by` int(11) NOT NULL COMMENT 'Admin or user who cancelled',
  `cancellation_reason` text NOT NULL,
  `cancellation_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `refund_amount` decimal(10,2) DEFAULT 0.00,
  `refund_status` enum('pending','processed','denied') DEFAULT 'pending',
  `refund_processed_date` timestamp NULL DEFAULT NULL,
  `refund_processed_by` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`cancellation_id`),
  KEY `idx_event_cancellation` (`event_id`),
  KEY `idx_cancelled_by` (`cancelled_by`),
  KEY `idx_cancellation_date` (`cancellation_date`),
  CONSTRAINT `fk_event_cancellation_event` FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_event_cancellation_user` FOREIGN KEY (`cancelled_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
COMMENT='Event cancellation records with refund tracking';
