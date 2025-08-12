-- Simple Session Tracking Fix
-- This fixes the session analytics view and ensures basic session tracking works

-- First, let's check if the user activity logs table exists and has the right structure
CREATE TABLE IF NOT EXISTS `tbl_user_activity_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `action_type` ENUM('login','logout','signup','event_created','booking_created','payment_received','admin_action') NOT NULL,
    `description` TEXT NULL,
    `user_role` ENUM('admin','organizer','client','supplier','staff') NOT NULL,
    `ip_address` VARCHAR(64) NULL,
    `user_agent` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX `idx_user_activity_user` (`user_id`),
    INDEX `idx_user_activity_action` (`action_type`),
    INDEX `idx_user_activity_date` (`created_at`),
    INDEX `idx_user_activity_role` (`user_role`),

    FOREIGN KEY (`user_id`) REFERENCES `tbl_users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create a simple view for session analytics (without session_duration for now)
CREATE OR REPLACE VIEW `vw_session_analytics` AS
SELECT
    u.user_role,
    COUNT(DISTINCT ual.user_id) as unique_users_logged_in,
    COUNT(CASE WHEN ual.action_type = 'login' THEN 1 END) as total_logins,
    COUNT(CASE WHEN ual.action_type = 'logout' THEN 1 END) as total_logouts,
    COUNT(CASE WHEN ual.action_type = 'login' AND DATE(ual.created_at) = CURDATE() THEN 1 END) as logins_today,
    COUNT(CASE WHEN ual.action_type = 'logout' AND DATE(ual.created_at) = CURDATE() THEN 1 END) as logouts_today,
    COUNT(CASE WHEN ual.action_type = 'login' AND ual.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as logins_week,
    COUNT(CASE WHEN ual.action_type = 'logout' AND ual.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as logouts_week,
    0 as avg_session_duration, -- Simplified for now
    MAX(ual.created_at) as last_activity
FROM tbl_user_activity_logs ual
JOIN tbl_users u ON ual.user_id = u.user_id
WHERE ual.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.user_role;

-- Simple procedure to log user activities
DELIMITER //

CREATE OR REPLACE PROCEDURE LogUserActivity(
    IN p_user_id INT,
    IN p_action_type VARCHAR(50),
    IN p_description TEXT,
    IN p_user_role VARCHAR(20),
    IN p_ip_address VARCHAR(64),
    IN p_user_agent TEXT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Log the activity
    INSERT INTO tbl_user_activity_logs (
        user_id, action_type, description, user_role,
        ip_address, user_agent
    ) VALUES (
        p_user_id, p_action_type, p_description, p_user_role,
        p_ip_address, p_user_agent
    );

    COMMIT;
END //

DELIMITER ;

-- Update existing getActivityTimeline method to work without session_duration field
-- This ensures the current system works properly

