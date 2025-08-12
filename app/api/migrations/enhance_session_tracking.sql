-- Enhanced Session Tracking Migration
-- This migration ensures comprehensive login/logout tracking for all user roles

-- Create or modify the user activity logs table for comprehensive session tracking
CREATE TABLE IF NOT EXISTS `tbl_user_activity_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `session_id` VARCHAR(128) NULL,
    `action_type` ENUM('login','logout','session_expired','forced_logout') NOT NULL,
    `description` TEXT NULL,
    `user_role` ENUM('admin','organizer','client','supplier','staff') NOT NULL,
    `ip_address` VARCHAR(64) NULL,
    `user_agent` TEXT NULL,
    `login_method` ENUM('email','otp','2fa','auto') DEFAULT 'email',
    `device_info` JSON NULL,
    `location_info` JSON NULL,
    `success` BOOLEAN DEFAULT TRUE,
    `failure_reason` VARCHAR(255) NULL,
    `session_duration` INT NULL COMMENT 'Duration in seconds for logout entries',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX `idx_user_activity_user` (`user_id`),
    INDEX `idx_user_activity_action` (`action_type`),
    INDEX `idx_user_activity_date` (`created_at`),
    INDEX `idx_user_activity_role` (`user_role`),
    INDEX `idx_user_activity_session` (`session_id`),
    INDEX `idx_user_activity_ip` (`ip_address`),

    FOREIGN KEY (`user_id`) REFERENCES `tbl_users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create a dedicated session tracking table for active sessions
CREATE TABLE IF NOT EXISTS `tbl_user_sessions` (
    `session_id` VARCHAR(128) PRIMARY KEY,
    `user_id` INT NOT NULL,
    `user_role` ENUM('admin','organizer','client','supplier','staff') NOT NULL,
    `login_time` DATETIME NOT NULL,
    `last_activity` DATETIME NOT NULL,
    `ip_address` VARCHAR(64) NULL,
    `user_agent` TEXT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `logout_time` DATETIME NULL,
    `session_duration` INT NULL COMMENT 'Duration in seconds',
    `logout_reason` ENUM('manual','timeout','forced','expired') NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX `idx_sessions_user` (`user_id`),
    INDEX `idx_sessions_active` (`is_active`),
    INDEX `idx_sessions_role` (`user_role`),
    INDEX `idx_sessions_login_time` (`login_time`),
    INDEX `idx_sessions_last_activity` (`last_activity`),

    FOREIGN KEY (`user_id`) REFERENCES `tbl_users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create a view for comprehensive session analytics
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
    AVG(CASE WHEN ual.action_type = 'logout' AND ual.session_duration IS NOT NULL THEN ual.session_duration END) as avg_session_duration,
    MAX(ual.created_at) as last_activity
FROM tbl_user_activity_logs ual
JOIN tbl_users u ON ual.user_id = u.user_id
WHERE ual.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.user_role;

-- Create stored procedures for session management

DELIMITER //

-- Procedure to log user login
CREATE OR REPLACE PROCEDURE LogUserLogin(
    IN p_user_id INT,
    IN p_session_id VARCHAR(128),
    IN p_user_role VARCHAR(20),
    IN p_ip_address VARCHAR(64),
    IN p_user_agent TEXT,
    IN p_login_method VARCHAR(20),
    IN p_description TEXT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Log the login activity
    INSERT INTO tbl_user_activity_logs (
        user_id, session_id, action_type, description, user_role,
        ip_address, user_agent, login_method, success
    ) VALUES (
        p_user_id, p_session_id, 'login', p_description, p_user_role,
        p_ip_address, p_user_agent, p_login_method, TRUE
    );

    -- Create or update session record
    INSERT INTO tbl_user_sessions (
        session_id, user_id, user_role, login_time, last_activity,
        ip_address, user_agent, is_active
    ) VALUES (
        p_session_id, p_user_id, p_user_role, NOW(), NOW(),
        p_ip_address, p_user_agent, TRUE
    ) ON DUPLICATE KEY UPDATE
        last_activity = NOW(),
        is_active = TRUE,
        logout_time = NULL,
        logout_reason = NULL;

    COMMIT;
END //

-- Procedure to log user logout
CREATE OR REPLACE PROCEDURE LogUserLogout(
    IN p_user_id INT,
    IN p_session_id VARCHAR(128),
    IN p_user_role VARCHAR(20),
    IN p_ip_address VARCHAR(64),
    IN p_user_agent TEXT,
    IN p_logout_reason VARCHAR(20),
    IN p_description TEXT
)
BEGIN
    DECLARE v_login_time DATETIME;
    DECLARE v_session_duration INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Get login time to calculate session duration
    SELECT login_time INTO v_login_time
    FROM tbl_user_sessions
    WHERE session_id = p_session_id AND user_id = p_user_id;

    IF v_login_time IS NOT NULL THEN
        SET v_session_duration = TIMESTAMPDIFF(SECOND, v_login_time, NOW());
    END IF;

    -- Log the logout activity
    INSERT INTO tbl_user_activity_logs (
        user_id, session_id, action_type, description, user_role,
        ip_address, user_agent, session_duration, success
    ) VALUES (
        p_user_id, p_session_id, 'logout', p_description, p_user_role,
        p_ip_address, p_user_agent, v_session_duration, TRUE
    );

    -- Update session record
    UPDATE tbl_user_sessions
    SET
        is_active = FALSE,
        logout_time = NOW(),
        session_duration = v_session_duration,
        logout_reason = p_logout_reason
    WHERE session_id = p_session_id AND user_id = p_user_id;

    COMMIT;
END //

DELIMITER ;

-- Create triggers to automatically clean up old sessions
CREATE EVENT IF NOT EXISTS cleanup_old_sessions
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    -- Mark sessions as expired if inactive for more than 24 hours
    UPDATE tbl_user_sessions
    SET is_active = FALSE, logout_reason = 'expired'
    WHERE is_active = TRUE
    AND last_activity < DATE_SUB(NOW(), INTERVAL 24 HOUR);

    -- Clean up very old session records (older than 6 months)
    DELETE FROM tbl_user_sessions
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);

    -- Clean up very old activity logs (older than 1 year)
    DELETE FROM tbl_user_activity_logs
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
END;

-- Insert initial data if needed (update existing records to have proper role mapping)
UPDATE tbl_user_activity_logs ual
JOIN tbl_users u ON ual.user_id = u.user_id
SET ual.user_role = LOWER(u.user_role)
WHERE ual.user_role != LOWER(u.user_role) OR ual.user_role IS NULL;

-- Add staff role support if it doesn't exist
ALTER TABLE tbl_user_activity_logs
MODIFY COLUMN user_role ENUM('admin','organizer','client','supplier','staff') NOT NULL;

ALTER TABLE tbl_user_sessions
MODIFY COLUMN user_role ENUM('admin','organizer','client','supplier','staff') NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_last_login ON tbl_users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_role_created ON tbl_users(user_role, created_at);

