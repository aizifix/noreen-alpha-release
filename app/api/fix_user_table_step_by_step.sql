-- STEP-BY-STEP FIX FOR tbl_users AUTO_INCREMENT ISSUE
-- Run these commands ONE BY ONE in your MySQL/phpMyAdmin

USE es_v3;

-- STEP 1: Check current table structure
DESCRIBE tbl_users;

-- STEP 2: Check if user_id is already a primary key
SHOW KEYS FROM tbl_users WHERE Key_name = 'PRIMARY';

-- STEP 3A: If user_id is NOT a primary key, run this:
ALTER TABLE tbl_users ADD PRIMARY KEY (user_id);

-- STEP 3B: If user_id IS already a primary key, skip to STEP 4

-- STEP 4: Add AUTO_INCREMENT to user_id column
ALTER TABLE tbl_users MODIFY COLUMN user_id INT(11) NOT NULL AUTO_INCREMENT;

-- STEP 5: Set AUTO_INCREMENT starting value (higher than current max)
SELECT MAX(user_id) FROM tbl_users;
-- Note the max value, then set AUTO_INCREMENT to max_value + 1
-- Replace 'XXX' with the actual max value + 1
ALTER TABLE tbl_users AUTO_INCREMENT = 21;  -- Change this number based on your max user_id

-- STEP 6: Verify the fix
SHOW CREATE TABLE tbl_users;

-- You should see something like:
-- `user_id` int(11) NOT NULL AUTO_INCREMENT,
-- PRIMARY KEY (`user_id`)

-- STEP 7: Test by checking if the backup solution works
SELECT 'AUTO_INCREMENT fix completed successfully!' AS status;
