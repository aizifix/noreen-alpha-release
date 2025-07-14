-- ===================================================
-- COMPREHENSIVE OTP TABLE FIX - HANDLES ALL FK ISSUES
-- ===================================================

-- Step 1: Check current database and basic info
SELECT 'Step 1: Database Information' AS step;
SELECT DATABASE() AS current_database;
SELECT VERSION() AS mysql_version;

-- Step 2: Check if tbl_users exists and show its complete structure
SELECT 'Step 2: tbl_users Table Analysis' AS step;

-- Check if table exists
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN 'tbl_users EXISTS'
        ELSE 'tbl_users DOES NOT EXIST'
    END AS table_status
FROM information_schema.tables
WHERE table_schema = 'es_v3' AND table_name = 'tbl_users';

-- Show complete table structure
SELECT
    column_name,
    data_type,
    column_type,
    is_nullable,
    column_key,
    extra,
    column_default
FROM information_schema.columns
WHERE table_schema = 'es_v3' AND table_name = 'tbl_users'
ORDER BY ordinal_position;

-- Step 3: Check table engine and character set
SELECT 'Step 3: Table Engine and Character Set' AS step;

SELECT
    table_name,
    engine,
    table_collation,
    row_format
FROM information_schema.tables
WHERE table_schema = 'es_v3' AND table_name = 'tbl_users';

-- Step 4: Clean up any existing tbl_signup_otp table
SELECT 'Step 4: Cleaning up existing table' AS step;
DROP TABLE IF EXISTS es_v3.tbl_signup_otp;

-- Step 5: Add missing columns to tbl_users if needed
SELECT 'Step 5: Adding missing columns to tbl_users' AS step;

-- Check and add is_verified column
SET @has_is_verified = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = 'es_v3'
    AND table_name = 'tbl_users'
    AND column_name = 'is_verified'
);

SELECT
    CASE
        WHEN @has_is_verified > 0 THEN 'is_verified column already exists'
        ELSE 'Adding is_verified column'
    END AS is_verified_status;

SET @sql = IF(@has_is_verified = 0,
    'ALTER TABLE es_v3.tbl_users ADD COLUMN is_verified tinyint(1) NOT NULL DEFAULT 1',
    'SELECT "Column exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add email_verified_at column
SET @has_email_verified = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = 'es_v3'
    AND table_name = 'tbl_users'
    AND column_name = 'email_verified_at'
);

SELECT
    CASE
        WHEN @has_email_verified > 0 THEN 'email_verified_at column already exists'
        ELSE 'Adding email_verified_at column'
    END AS email_verified_status;

SET @sql = IF(@has_email_verified = 0,
    'ALTER TABLE es_v3.tbl_users ADD COLUMN email_verified_at datetime NULL DEFAULT NULL',
    'SELECT "Column exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 6: Get the exact engine and collation from tbl_users to match
SELECT 'Step 6: Getting table specifications for matching' AS step;

SELECT
    @users_engine := engine,
    @users_collation := table_collation
FROM information_schema.tables
WHERE table_schema = 'es_v3' AND table_name = 'tbl_users';

SELECT @users_engine AS users_engine, @users_collation AS users_collation;

-- Step 7: Create tbl_signup_otp with EXACT same specifications as tbl_users
SELECT 'Step 7: Creating tbl_signup_otp with matching specifications' AS step;

-- Get the exact user_id column definition
SELECT @user_id_type := column_type
FROM information_schema.columns
WHERE table_schema = 'es_v3'
AND table_name = 'tbl_users'
AND column_name = 'user_id';

SELECT @user_id_type AS user_id_column_type;

-- Create the table with dynamic engine and collation
SET @create_sql = CONCAT(
    'CREATE TABLE es_v3.tbl_signup_otp (',
    'id ', @user_id_type, ' NOT NULL AUTO_INCREMENT,',
    'user_id ', @user_id_type, ' NOT NULL,',
    'email varchar(255) NOT NULL,',
    'otp_code varchar(6) NOT NULL,',
    'expires_at datetime NOT NULL,',
    'created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,',
    'updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,',
    'PRIMARY KEY (id),',
    'UNIQUE KEY unique_user_email (user_id, email),',
    'KEY idx_otp_email (email),',
    'KEY idx_otp_expires (expires_at)',
    ') ENGINE=', @users_engine, ' DEFAULT CHARSET=utf8mb4 COLLATE=', @users_collation
);

PREPARE create_stmt FROM @create_sql;
EXECUTE create_stmt;
DEALLOCATE PREPARE create_stmt;

SELECT 'Table created successfully with matching specifications!' AS result;

-- Step 8: Verify both tables have compatible structures
SELECT 'Step 8: Verifying table compatibility' AS step;

SELECT
    table_name,
    engine,
    table_collation
FROM information_schema.tables
WHERE table_schema = 'es_v3'
AND table_name IN ('tbl_users', 'tbl_signup_otp');

-- Compare user_id columns
SELECT
    table_name,
    column_name,
    column_type,
    is_nullable,
    column_key
FROM information_schema.columns
WHERE table_schema = 'es_v3'
AND table_name IN ('tbl_users', 'tbl_signup_otp')
AND column_name = 'user_id';

-- Step 9: Add the foreign key constraint
SELECT 'Step 9: Adding foreign key constraint' AS step;

ALTER TABLE es_v3.tbl_signup_otp
ADD CONSTRAINT fk_signup_otp_user
FOREIGN KEY (user_id) REFERENCES es_v3.tbl_users(user_id)
ON DELETE CASCADE;

SELECT 'SUCCESS: Foreign key constraint added!' AS result;

-- Step 10: Update existing users for backward compatibility
SELECT 'Step 10: Updating existing users' AS step;

UPDATE es_v3.tbl_users
SET is_verified = 1, email_verified_at = created_at
WHERE is_verified = 0 OR email_verified_at IS NULL;

SELECT 'Migration completed successfully!' AS final_status;

-- Step 11: Final verification
SELECT 'Step 11: Final verification' AS step;

SHOW CREATE TABLE es_v3.tbl_signup_otp;

SELECT 'OTP signup system is ready to use!' AS final_message;
