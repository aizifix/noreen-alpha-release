-- ===================================================
-- SIMPLE OTP TABLE CREATION (EXPLICIT DATABASE REFERENCES)
-- ===================================================

-- Check database and table structure
SELECT 'Current database info:' AS info;
SELECT SCHEMA() AS current_database;

-- Check if tbl_users exists
SELECT 'Checking if tbl_users exists...' AS step;
SELECT COUNT(*) AS table_exists
FROM information_schema.tables
WHERE table_schema = 'es_v3'
AND table_name = 'tbl_users';

-- Show tbl_users structure
SELECT 'tbl_users column structure:' AS step;
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_KEY,
    EXTRA,
    COLUMN_TYPE
FROM information_schema.columns
WHERE table_schema = 'es_v3'
AND table_name = 'tbl_users'
ORDER BY ordinal_position;

-- Drop existing tbl_signup_otp if it exists
DROP TABLE IF EXISTS es_v3.tbl_signup_otp;

-- Add missing columns to tbl_users first
-- Add is_verified column if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'es_v3'
     AND table_name = 'tbl_users'
     AND column_name = 'is_verified') > 0,
    'SELECT "is_verified column already exists"',
    'ALTER TABLE es_v3.tbl_users ADD COLUMN is_verified tinyint(1) NOT NULL DEFAULT 1 AFTER user_role'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add email_verified_at column if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'es_v3'
     AND table_name = 'tbl_users'
     AND column_name = 'email_verified_at') > 0,
    'SELECT "email_verified_at column already exists"',
    'ALTER TABLE es_v3.tbl_users ADD COLUMN email_verified_at datetime NULL DEFAULT NULL AFTER is_verified'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create tbl_signup_otp without foreign key first
SELECT 'Creating tbl_signup_otp table...' AS step;

CREATE TABLE es_v3.tbl_signup_otp (
  id int(11) NOT NULL AUTO_INCREMENT,
  user_id int(11) NOT NULL,
  email varchar(255) NOT NULL,
  otp_code varchar(6) NOT NULL,
  expires_at datetime NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_user_email (user_id, email),
  KEY idx_otp_email (email),
  KEY idx_otp_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Table created successfully!' AS result;

-- Now try to add foreign key constraint
SELECT 'Adding foreign key constraint...' AS step;

-- Clean up any potential orphaned records first
DELETE FROM es_v3.tbl_signup_otp
WHERE user_id NOT IN (SELECT user_id FROM es_v3.tbl_users);

-- Check table engines and character sets before adding foreign key
SELECT 'Checking table engines and character sets...' AS step;

SELECT
    table_name,
    engine,
    table_collation,
    table_comment
FROM information_schema.tables
WHERE table_schema = 'es_v3'
AND table_name IN ('tbl_users', 'tbl_signup_otp');

-- Check the exact data types of user_id in both tables
SELECT 'Checking user_id column compatibility...' AS step;

SELECT
    table_name,
    column_name,
    data_type,
    column_type,
    is_nullable,
    column_key,
    extra
FROM information_schema.columns
WHERE table_schema = 'es_v3'
AND table_name IN ('tbl_users', 'tbl_signup_otp')
AND column_name = 'user_id';

-- Try adding foreign key constraint with explicit table reference
ALTER TABLE es_v3.tbl_signup_otp
ADD CONSTRAINT fk_signup_otp_user
FOREIGN KEY (user_id) REFERENCES es_v3.tbl_users(user_id)
ON DELETE CASCADE;

SELECT 'Foreign key added successfully!' AS result;

-- Update existing users to be verified (for backward compatibility)
UPDATE es_v3.tbl_users
SET is_verified = 1, email_verified_at = created_at
WHERE is_verified IS NULL OR is_verified = 0 OR email_verified_at IS NULL;

SELECT 'All done! OTP signup system is ready.' AS final_message;
