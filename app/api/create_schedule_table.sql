-- Create tbl_event_schedule table for Event Scheduling System
-- This table stores parsed components with scheduling metadata, date, time, and progress status

CREATE TABLE IF NOT EXISTS `tbl_event_schedule` (
  `schedule_id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT NOT NULL,
  `inclusion_name` VARCHAR(255) NULL,
  `component_name` VARCHAR(255) NOT NULL,
  `is_custom` TINYINT(1) DEFAULT 0 COMMENT '0 = parsed from inclusion_description, 1 = manually added free-text',
  `scheduled_date` DATE NOT NULL,
  `scheduled_time` TIME NOT NULL,
  `status` ENUM('Pending','Done','Delivered','Cancelled') DEFAULT 'Pending',
  `assigned_organizer_id` INT NULL,
  `remarks` TEXT NULL,
  `created_by` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `tbl_events`(`event_id`) ON DELETE CASCADE,
  INDEX `idx_event_id` (`event_id`),
  INDEX `idx_scheduled_date` (`scheduled_date`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Event schedule components with timing and status tracking';
