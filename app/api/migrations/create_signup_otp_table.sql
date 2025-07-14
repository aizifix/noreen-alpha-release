-- Migration: Create signup OTP verification table
-- Date: 2024-01-25
-- Description: Creates a table to store OTP codes for email verification during signup

-- First, add the missing is_verified column to tbl_users if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'tbl_users'
     AND COLUMN_NAME = 'is_verified') > 0,
    'SELECT ''Column is_verified already exists''',
    'ALTER TABLE `tbl_users` ADD COLUMN `is_verified` tinyint(1) NOT NULL DEFAULT 1 AFTER `user_role`'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add email_verified_at column to tbl_users if it doesn't exist
SET @sql2 = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'tbl_users'
     AND COLUMN_NAME = 'email_verified_at') > 0,
    'SELECT ''Column email_verified_at already exists''',
    'ALTER TABLE `tbl_users` ADD COLUMN `email_verified_at` datetime NULL DEFAULT NULL AFTER `is_verified`'
));
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Now create the signup OTP table
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

-- Clean up expired OTP codes (optional, for maintenance)
-- This can be run periodically to remove expired OTP codes
-- DELETE FROM `tbl_signup_otp` WHERE `expires_at` < NOW();
