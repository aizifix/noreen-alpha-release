-- Manual fix for tbl_packages table
-- Run these commands one by one in phpMyAdmin or MySQL console

-- Step 1: Add customized_package column (if it doesn't exist)
ALTER TABLE tbl_packages
ADD COLUMN IF NOT EXISTS customized_package TINYINT(1) DEFAULT 0
COMMENT '1 if this is a customized package created from event components, 0 for regular packages';

-- Step 2: Update existing packages to mark them as not customized
UPDATE tbl_packages SET customized_package = 0 WHERE customized_package IS NULL;

-- Step 3: Get current maximum package_id
SELECT MAX(package_id) as max_id FROM tbl_packages WHERE package_id > 0;

-- Step 4: Delete duplicate packages with package_id = 0
DELETE FROM tbl_packages WHERE package_id = 0;

-- Step 5: Check if package_id is already auto-increment
DESCRIBE tbl_packages;

-- Step 6: If package_id is not auto-increment, run these commands:
-- (Replace '21' with the next available ID from Step 3)

-- First, check if there's a primary key
SHOW INDEX FROM tbl_packages WHERE Key_name = 'PRIMARY';

-- If primary key exists, drop it (this might fail if no primary key exists)
-- ALTER TABLE tbl_packages DROP PRIMARY KEY;

-- Modify package_id to be auto-increment
ALTER TABLE tbl_packages MODIFY COLUMN package_id INT(11) NOT NULL AUTO_INCREMENT;

-- Add primary key constraint
ALTER TABLE tbl_packages ADD PRIMARY KEY (package_id);

-- Reset auto-increment to the next available ID
ALTER TABLE tbl_packages AUTO_INCREMENT = 21;

-- Step 7: Verify the changes
DESCRIBE tbl_packages;
SELECT COUNT(*) as total_packages FROM tbl_packages;
SELECT COUNT(*) as customized_packages FROM tbl_packages WHERE customized_package = 1;
