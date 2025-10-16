-- Add reserved payment columns to tbl_events table
-- This migration adds the missing columns for reserved payment tracking

-- Add reserved_payment_total column
ALTER TABLE tbl_events
ADD COLUMN reserved_payment_total DECIMAL(10,2) DEFAULT 0.00
COMMENT 'Total amount of reserved payments from original booking';

-- Add adjusted_total column
ALTER TABLE tbl_events
ADD COLUMN adjusted_total DECIMAL(10,2) DEFAULT 0.00
COMMENT 'Total amount after subtracting reserved payments';

-- Update existing records to have default values
UPDATE tbl_events
SET reserved_payment_total = 0.00, adjusted_total = total_budget
WHERE reserved_payment_total IS NULL OR adjusted_total IS NULL;
