-- ===================================================
-- ADD USER ADDRESS FIELD MIGRATION
-- ===================================================
-- This migration adds a user_address field to tbl_users table
-- to store client address information

-- Check if user_address column already exists
SET @has_user_address = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'tbl_users'
    AND column_name = 'user_address'
);

-- Add user_address column if it doesn't exist
SELECT
    CASE
        WHEN @has_user_address > 0 THEN 'user_address column already exists'
        ELSE 'Adding user_address column'
    END AS address_column_status;

SET @sql = IF(@has_user_address = 0,
    'ALTER TABLE tbl_users ADD COLUMN user_address TEXT NULL AFTER user_contact',
    'SELECT "user_address column already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the column was added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
AND table_name = 'tbl_users'
AND column_name = 'user_address';

SELECT 'Migration completed successfully' AS status;
