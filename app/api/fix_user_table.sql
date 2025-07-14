-- Fix tbl_users table to add AUTO_INCREMENT to user_id column
-- This will fix the "Invalid user ID" error during registration

USE es_v3;

-- First, let's check the current table structure
DESCRIBE tbl_users;

-- Step 1: Check if user_id is already a primary key
SELECT CONSTRAINT_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'es_v3'
AND TABLE_NAME = 'tbl_users'
AND CONSTRAINT_NAME = 'PRIMARY';

-- Step 2: If user_id is not a primary key, add it as primary key first
-- Then add AUTO_INCREMENT
ALTER TABLE tbl_users ADD PRIMARY KEY (user_id);
ALTER TABLE tbl_users MODIFY COLUMN user_id INT(11) NOT NULL AUTO_INCREMENT;

-- Alternative approach if above fails (drop and recreate with proper constraints):
-- If the above commands fail, use this approach instead:

-- Step 3: Set the AUTO_INCREMENT starting value to be safe (higher than current max)
-- This will prevent conflicts with existing user IDs
SET @max_user_id = (SELECT COALESCE(MAX(user_id), 0) FROM tbl_users);
SET @sql = CONCAT('ALTER TABLE tbl_users AUTO_INCREMENT = ', @max_user_id + 1);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the fix
SHOW CREATE TABLE tbl_users;

-- Check that AUTO_INCREMENT is now set
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    EXTRA
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'es_v3'
AND TABLE_NAME = 'tbl_users'
AND COLUMN_NAME = 'user_id';

SELECT 'AUTO_INCREMENT fix completed successfully!' AS status;
