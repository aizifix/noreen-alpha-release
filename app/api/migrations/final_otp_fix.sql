-- ===================================================
-- FINAL OTP FIX - SAFE VERSION WITH COLUMN CHECKS
-- ===================================================
-- This script safely adds missing columns and creates the OTP table

-- Check and add is_verified column only if it doesn't exist
SET @has_is_verified = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = 'es_v3'
    AND table_name = 'tbl_users'
    AND column_name = 'is_verified'
);

SET @sql = IF(@has_is_verified = 0,
    'ALTER TABLE `tbl_users` ADD COLUMN `is_verified` tinyint(1) NOT NULL DEFAULT 1 AFTER `user_role`',
    'SELECT "is_verified column already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add email_verified_at column only if it doesn't exist
SET @has_email_verified = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = 'es_v3'
    AND table_name = 'tbl_users'
    AND column_name = 'email_verified_at'
);

SET @sql = IF(@has_email_verified = 0,
    'ALTER TABLE `tbl_users` ADD COLUMN `email_verified_at` datetime NULL DEFAULT NULL AFTER `is_verified`',
    'SELECT "email_verified_at column already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create the signup OTP table with EXACT same specifications as tbl_users
CREATE TABLE `tbl_signup_otp` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Update existing users to be verified (for backward compatibility)
UPDATE `tbl_users`
SET `is_verified` = 1, `email_verified_at` = `created_at`
WHERE `email_verified_at` IS NULL;

-- Success message
SELECT 'SUCCESS: OTP signup system is ready!' AS result;
