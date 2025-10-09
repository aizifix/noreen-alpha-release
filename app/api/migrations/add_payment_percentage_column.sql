-- Fix ALL missing columns in tbl_payments
-- Date: 2025-10-06
-- Description: Add all missing columns and remove deprecated ones

-- Step 1: Add schedule_id column if it doesn't exist
SET @dbname = DATABASE();
SET @tablename = 'tbl_payments';
SET @columnname = 'schedule_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT ''Column schedule_id already exists'' as msg;',
  'ALTER TABLE tbl_payments ADD COLUMN schedule_id INT(11) DEFAULT NULL COMMENT ''Link to payment schedule'' AFTER event_id;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Step 2: Add payment_percentage column if it doesn't exist
SET @columnname2 = 'payment_percentage';
SET @preparedStatement2 = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname2)
  ) > 0,
  'SELECT ''Column payment_percentage already exists'' as msg;',
  'ALTER TABLE tbl_payments ADD COLUMN payment_percentage DECIMAL(5,2) DEFAULT NULL COMMENT ''Percentage of total if this is a partial payment'' AFTER payment_notes;'
));
PREPARE alterIfNotExists2 FROM @preparedStatement2;
EXECUTE alterIfNotExists2;
DEALLOCATE PREPARE alterIfNotExists2;

-- Step 3: Add payment_reference column if it doesn't exist
SET @columnname3 = 'payment_reference';
SET @preparedStatement3 = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname3)
  ) > 0,
  'SELECT ''Column payment_reference already exists'' as msg;',
  'ALTER TABLE tbl_payments ADD COLUMN payment_reference VARCHAR(100) DEFAULT NULL COMMENT ''Payment transaction reference number'' AFTER payment_percentage;'
));
PREPARE alterIfNotExists3 FROM @preparedStatement3;
EXECUTE alterIfNotExists3;
DEALLOCATE PREPARE alterIfNotExists3;

-- Step 4: Remove payment_attachments column if it exists (should be in tbl_payment_attachments table)
SET @columnname4 = 'payment_attachments';
SET @preparedStatement4 = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname4)
  ) > 0,
  'ALTER TABLE tbl_payments DROP COLUMN payment_attachments;',
  'SELECT ''Column payment_attachments does not exist (good - it should be in tbl_payment_attachments)'' as msg;'
));
PREPARE alterIfNotExists4 FROM @preparedStatement4;
EXECUTE alterIfNotExists4;
DEALLOCATE PREPARE alterIfNotExists4;

-- Verify the columns
SELECT 'Verification: Checking tbl_payments structure...' as status;
SELECT
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tbl_payments'
  AND COLUMN_NAME IN ('schedule_id', 'payment_percentage', 'payment_reference', 'payment_notes')
ORDER BY ORDINAL_POSITION;

-- Check for deprecated column (should NOT exist)
SELECT 'Checking for deprecated columns (should be empty)...' as status;
SELECT
    COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tbl_payments'
  AND COLUMN_NAME = 'payment_attachments';

SELECT 'Migration completed successfully!' as status;
SELECT '✓ schedule_id - Link to payment schedules' as added;
SELECT '✓ payment_percentage - Track payment percentage' as added;
SELECT '✓ payment_reference - Store transaction references' as added;
SELECT '✓ payment_attachments - Removed (now in separate table)' as removed;
