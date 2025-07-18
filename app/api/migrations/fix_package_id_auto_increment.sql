-- Fix package_id to be auto-increment and primary key
-- First, drop the existing primary key if it exists
ALTER TABLE tbl_packages DROP PRIMARY KEY;

-- Modify package_id to be auto-increment
ALTER TABLE tbl_packages MODIFY COLUMN package_id INT(11) NOT NULL AUTO_INCREMENT;

-- Add primary key constraint
ALTER TABLE tbl_packages ADD PRIMARY KEY (package_id);

-- Reset auto-increment to the next available ID
ALTER TABLE tbl_packages AUTO_INCREMENT = 21;
