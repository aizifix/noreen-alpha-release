-- ===================================================
-- SIGNUP OTP MIGRATION - EXECUTABLE SCRIPT
-- ===================================================
-- Run this script to enable the OTP-based signup system
-- This script is safe to run multiple times

USE es_v3;

-- Step 1: Add is_verified column if it doesn't exist
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'es_v3'
    AND TABLE_NAME = 'tbl_users'
    AND COLUMN_NAME = 'is_verified'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE `tbl_users` ADD COLUMN `is_verified` tinyint(1) NOT NULL DEFAULT 1 AFTER `user_role`',
    'SELECT "Column is_verified already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Add email_verified_at column if it doesn't exist
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'es_v3'
    AND TABLE_NAME = 'tbl_users'
    AND COLUMN_NAME = 'email_verified_at'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE `tbl_users` ADD COLUMN `email_verified_at` datetime NULL DEFAULT NULL AFTER `is_verified`',
    'SELECT "Column email_verified_at already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Create tbl_signup_otp table
CREATE TABLE IF NOT EXISTS `tbl_signup_otp` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `otp_code` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_email` (`user_id`, `email`),
  KEY `idx_otp_email` (`email`),
  KEY `idx_otp_expires` (`expires_at`),
  CONSTRAINT `fk_signup_otp_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 4: Update existing users to be verified (for backward compatibility)
UPDATE `tbl_users` SET `is_verified` = 1, `email_verified_at` = `created_at` WHERE `is_verified` IS NULL OR `is_verified` = 0;

-- Step 5: Create cleanup procedure for expired OTP codes
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS CleanupExpiredOTP()
BEGIN
    DELETE FROM `tbl_signup_otp` WHERE `expires_at` < NOW();
    SELECT ROW_COUNT() AS 'Expired OTP codes removed';
END$$

DELIMITER ;

-- Success message
SELECT 'Signup OTP migration completed successfully!' AS status;
SELECT 'You can now use the OTP-based signup system.' AS message;
