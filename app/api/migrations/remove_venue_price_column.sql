-- Migration: Remove venue_price column from tbl_venue table
-- Date: 2025-01-27
-- Description: Remove the base price column from venues table since pricing will be calculated based on extra_pax_rate only

-- Step 1: Remove the venue_price column from tbl_venue table
ALTER TABLE `tbl_venue` DROP COLUMN `venue_price`;

-- Note: This migration removes the venue_price column from the tbl_venue table.
-- After this migration, venue pricing will be calculated based solely on the extra_pax_rate field.
-- Make sure to update any application code that references the venue_price column before running this migration.
