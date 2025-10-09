-- ===================================================
-- ADD USER ADDRESS FIELDS MIGRATION
-- ===================================================
-- This migration adds additional address fields to tbl_users table
-- to store complete client address information

-- Check if columns already exist
SET @has_user_city = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'tbl_users'
    AND column_name = 'user_city'
);

SET @has_user_state = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'tbl_users'
    AND column_name = 'user_state'
);

SET @has_user_zipcode = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'tbl_users'
    AND column_name = 'user_zipcode'
);

SET @has_user_country = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'tbl_users'
    AND column_name = 'user_country'
);

-- Add user_city column if it doesn't exist
SELECT
    CASE
        WHEN @has_user_city > 0 THEN 'user_city column already exists'
        ELSE 'Adding user_city column'
    END AS city_column_status;

SET @sql_city = IF(@has_user_city = 0,
    'ALTER TABLE tbl_users ADD COLUMN user_city VARCHAR(100) NULL AFTER user_address',
    'SELECT "user_city column already exists"'
);

PREPARE stmt_city FROM @sql_city;
EXECUTE stmt_city;
DEALLOCATE PREPARE stmt_city;

-- Add user_state column if it doesn't exist
SELECT
    CASE
        WHEN @has_user_state > 0 THEN 'user_state column already exists'
        ELSE 'Adding user_state column'
    END AS state_column_status;

SET @sql_state = IF(@has_user_state = 0,
    'ALTER TABLE tbl_users ADD COLUMN user_state VARCHAR(100) NULL AFTER user_city',
    'SELECT "user_state column already exists"'
);

PREPARE stmt_state FROM @sql_state;
EXECUTE stmt_state;
DEALLOCATE PREPARE stmt_state;

-- Add user_zipcode column if it doesn't exist
SELECT
    CASE
        WHEN @has_user_zipcode > 0 THEN 'user_zipcode column already exists'
        ELSE 'Adding user_zipcode column'
    END AS zipcode_column_status;

SET @sql_zipcode = IF(@has_user_zipcode = 0,
    'ALTER TABLE tbl_users ADD COLUMN user_zipcode VARCHAR(20) NULL AFTER user_state',
    'SELECT "user_zipcode column already exists"'
);

PREPARE stmt_zipcode FROM @sql_zipcode;
EXECUTE stmt_zipcode;
DEALLOCATE PREPARE stmt_zipcode;

-- Add user_country column if it doesn't exist
SELECT
    CASE
        WHEN @has_user_country > 0 THEN 'user_country column already exists'
        ELSE 'Adding user_country column'
    END AS country_column_status;

SET @sql_country = IF(@has_user_country = 0,
    'ALTER TABLE tbl_users ADD COLUMN user_country VARCHAR(100) NULL AFTER user_zipcode',
    'SELECT "user_country column already exists"'
);

PREPARE stmt_country FROM @sql_country;
EXECUTE stmt_country;
DEALLOCATE PREPARE stmt_country;

-- Verify all columns were added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
AND table_name = 'tbl_users'
AND column_name IN ('user_address', 'user_city', 'user_state', 'user_zipcode', 'user_country')
ORDER BY ordinal_position;

SELECT 'Address fields migration completed successfully' AS status;
