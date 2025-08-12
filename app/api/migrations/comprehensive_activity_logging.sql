-- Comprehensive Activity Logging System
-- This migration creates a unified activity logging system for all user actions

-- Drop existing limited activity logs table to recreate with comprehensive structure
DROP TABLE IF EXISTS `tbl_user_activity_logs`;

-- Create comprehensive activity logging table
CREATE TABLE `tbl_user_activity_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `session_id` VARCHAR(128) NULL,
    `action_type` VARCHAR(100) NOT NULL COMMENT 'Type of activity',
    `action_category` ENUM('authentication','event','booking','payment','venue','package','supplier','organizer','client','admin','system') NOT NULL,
    `description` TEXT NULL,
    `user_role` ENUM('admin','organizer','client','supplier','staff') NOT NULL,
    `ip_address` VARCHAR(64) NULL,
    `user_agent` TEXT NULL,
    `related_entity_type` VARCHAR(50) NULL COMMENT 'Type of related entity (event, booking, payment, etc.)',
    `related_entity_id` INT NULL COMMENT 'ID of related entity',
    `metadata` JSON NULL COMMENT 'Additional activity metadata',
    `success` BOOLEAN DEFAULT TRUE,
    `failure_reason` VARCHAR(255) NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX `idx_user_activity_user` (`user_id`),
    INDEX `idx_user_activity_action` (`action_type`),
    INDEX `idx_user_activity_category` (`action_category`),
    INDEX `idx_user_activity_date` (`created_at`),
    INDEX `idx_user_activity_role` (`user_role`),
    INDEX `idx_user_activity_session` (`session_id`),
    INDEX `idx_user_activity_entity` (`related_entity_type`, `related_entity_id`),

    FOREIGN KEY (`user_id`) REFERENCES `tbl_users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create detailed payment activity logs
CREATE TABLE IF NOT EXISTS `tbl_payment_activity_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `payment_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `action` ENUM('created','updated','confirmed','rejected','refunded','proof_uploaded','proof_deleted') NOT NULL,
    `old_status` VARCHAR(50) NULL,
    `new_status` VARCHAR(50) NULL,
    `amount` DECIMAL(10, 2) NULL,
    `description` TEXT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX `idx_payment_activity_payment` (`payment_id`),
    INDEX `idx_payment_activity_user` (`user_id`),
    INDEX `idx_payment_activity_date` (`created_at`),

    FOREIGN KEY (`payment_id`) REFERENCES `tbl_payments`(`payment_id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `tbl_users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create event activity logs for detailed event tracking
CREATE TABLE IF NOT EXISTS `tbl_event_activity_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `event_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `action` ENUM('created','updated','finalized','cancelled','component_added','component_removed','component_updated','attachment_added','attachment_removed','venue_changed','package_changed') NOT NULL,
    `description` TEXT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX `idx_event_activity_event` (`event_id`),
    INDEX `idx_event_activity_user` (`user_id`),
    INDEX `idx_event_activity_date` (`created_at`),

    FOREIGN KEY (`event_id`) REFERENCES `tbl_events`(`event_id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `tbl_users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create booking activity logs
CREATE TABLE IF NOT EXISTS `tbl_booking_activity_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `action` ENUM('created','confirmed','pending','cancelled','completed','payment_received','payment_pending','viewed','modified','assigned_organizer','offer_sent','offer_accepted','offer_rejected') NOT NULL,
    `old_status` VARCHAR(50) NULL,
    `new_status` VARCHAR(50) NULL,
    `description` TEXT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX `idx_booking_activity_booking` (`booking_id`),
    INDEX `idx_booking_activity_user` (`user_id`),
    INDEX `idx_booking_activity_date` (`created_at`),

    FOREIGN KEY (`booking_id`) REFERENCES `tbl_bookings`(`booking_id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `tbl_users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create system activity logs for administrative actions
CREATE TABLE IF NOT EXISTS `tbl_system_activity_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `action_type` ENUM('settings_updated','user_created','user_updated','user_deleted','role_changed','permission_changed','backup_created','migration_run','email_sent','notification_sent','report_generated','export_created') NOT NULL,
    `target_user_id` INT NULL,
    `description` TEXT NULL,
    `metadata` JSON NULL,
    `ip_address` VARCHAR(64) NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX `idx_system_activity_user` (`user_id`),
    INDEX `idx_system_activity_type` (`action_type`),
    INDEX `idx_system_activity_date` (`created_at`),

    FOREIGN KEY (`user_id`) REFERENCES `tbl_users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create view for comprehensive activity timeline
CREATE OR REPLACE VIEW `vw_activity_timeline` AS
SELECT
    ual.id,
    ual.user_id,
    CONCAT(u.user_firstName, ' ', u.user_lastName) as user_name,
    u.user_email,
    ual.user_role,
    ual.action_type,
    ual.action_category,
    ual.description,
    ual.related_entity_type,
    ual.related_entity_id,
    ual.metadata,
    ual.ip_address,
    ual.created_at as timestamp,
    ual.success,
    ual.failure_reason
FROM tbl_user_activity_logs ual
JOIN tbl_users u ON ual.user_id = u.user_id

UNION ALL

SELECT
    pal.id,
    pal.user_id,
    CONCAT(u.user_firstName, ' ', u.user_lastName) as user_name,
    u.user_email,
    u.user_role,
    pal.action as action_type,
    'payment' as action_category,
    pal.description,
    'payment' as related_entity_type,
    pal.payment_id as related_entity_id,
    pal.metadata,
    NULL as ip_address,
    pal.created_at as timestamp,
    TRUE as success,
    NULL as failure_reason
FROM tbl_payment_activity_logs pal
JOIN tbl_users u ON pal.user_id = u.user_id

UNION ALL

SELECT
    eal.id,
    eal.user_id,
    CONCAT(u.user_firstName, ' ', u.user_lastName) as user_name,
    u.user_email,
    u.user_role,
    eal.action as action_type,
    'event' as action_category,
    eal.description,
    'event' as related_entity_type,
    eal.event_id as related_entity_id,
    eal.metadata,
    NULL as ip_address,
    eal.created_at as timestamp,
    TRUE as success,
    NULL as failure_reason
FROM tbl_event_activity_logs eal
JOIN tbl_users u ON eal.user_id = u.user_id

UNION ALL

SELECT
    bal.id,
    bal.user_id,
    CONCAT(u.user_firstName, ' ', u.user_lastName) as user_name,
    u.user_email,
    u.user_role,
    bal.action as action_type,
    'booking' as action_category,
    bal.description,
    'booking' as related_entity_type,
    bal.booking_id as related_entity_id,
    bal.metadata,
    NULL as ip_address,
    bal.created_at as timestamp,
    TRUE as success,
    NULL as failure_reason
FROM tbl_booking_activity_logs bal
JOIN tbl_users u ON bal.user_id = u.user_id

ORDER BY timestamp DESC;

-- Create indexes for better performance
CREATE INDEX idx_activity_timeline_timestamp ON tbl_user_activity_logs(created_at DESC);
CREATE INDEX idx_payment_activity_timestamp ON tbl_payment_activity_logs(created_at DESC);
CREATE INDEX idx_event_activity_timestamp ON tbl_event_activity_logs(created_at DESC);
CREATE INDEX idx_booking_activity_timestamp ON tbl_booking_activity_logs(created_at DESC);
CREATE INDEX idx_system_activity_timestamp ON tbl_system_activity_logs(created_at DESC);

-- Note: System will start logging activities automatically once tables are created
-- No sample data needed as it will be populated by actual user activities
