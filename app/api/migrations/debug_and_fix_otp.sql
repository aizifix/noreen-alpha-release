-- ===================================================
-- DEBUG AND FIX OTP SIGNUP TABLE
-- ===================================================
-- This script helps debug the foreign key constraint issue

-- Make sure we're using the correct database
USE es_v3;

-- Verify database selection
SELECT DATABASE() AS current_database;

-- Step 1: Check if tbl_users table exists and its structure
SELECT 'Checking tbl_users table structure...' AS step;

SHOW CREATE TABLE tbl_users;

-- Step 2: Check the exact column details for user_id
SELECT 'Checking user_id column details...' AS step;

SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_KEY,
    EXTRA,
    COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'tbl_users'
AND COLUMN_NAME = 'user_id';

-- Step 3: Check if there are any existing foreign key constraints that might conflict
SELECT 'Checking existing foreign key constraints...' AS step;

SELECT
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
AND REFERENCED_TABLE_NAME = 'tbl_users';

-- Step 4: Drop the table if it exists (to start fresh)
DROP TABLE IF EXISTS `tbl_signup_otp`;

-- Step 5: Create the table WITHOUT foreign key constraint first
SELECT 'Creating tbl_signup_otp without foreign key...' AS step;

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
  KEY `idx_otp_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Table created successfully without foreign key!' AS result;

-- Step 6: Now try to add the foreign key constraint separately
SELECT 'Adding foreign key constraint...' AS step;

-- First, let's make sure there are no orphaned records
DELETE FROM `tbl_signup_otp`
WHERE `user_id` NOT IN (SELECT `user_id` FROM `tbl_users`);

-- Now add the foreign key constraint
ALTER TABLE `tbl_signup_otp`
ADD CONSTRAINT `fk_signup_otp_user`
FOREIGN KEY (`user_id`) REFERENCES `tbl_users`(`user_id`)
ON DELETE CASCADE;

SELECT 'Foreign key constraint added successfully!' AS result;

-- Step 7: Add the missing columns to tbl_users if needed
SELECT 'Adding missing columns to tbl_users...' AS step;

SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_users'
    AND COLUMN_NAME = 'is_verified'
);

SELECT IF(@column_exists > 0, 'is_verified column already exists', 'Adding is_verified column') AS is_verified_status;

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE `tbl_users` ADD COLUMN `is_verified` tinyint(1) NOT NULL DEFAULT 1 AFTER `user_role`',
    'SELECT "Column is_verified already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add email_verified_at column
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_users'
    AND COLUMN_NAME = 'email_verified_at'
);

SELECT IF(@column_exists > 0, 'email_verified_at column already exists', 'Adding email_verified_at column') AS email_verified_status;

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE `tbl_users` ADD COLUMN `email_verified_at` datetime NULL DEFAULT NULL AFTER `is_verified`',
    'SELECT "Column email_verified_at already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 8: Update existing users to be verified
UPDATE `tbl_users` SET `is_verified` = 1, `email_verified_at` = `created_at`
WHERE `is_verified` IS NULL OR `is_verified` = 0 OR `email_verified_at` IS NULL;

SELECT 'Migration completed successfully!' AS final_status;
SELECT 'OTP signup system is now ready to use.' AS final_message;
