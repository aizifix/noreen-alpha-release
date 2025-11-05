-- Migration: Add rejection_reason column to tbl_bookings table
-- This allows admins to provide a reason when rejecting bookings

ALTER TABLE `tbl_bookings`
ADD COLUMN `rejection_reason` TEXT DEFAULT NULL COMMENT 'Reason provided by admin when rejecting/cancelling a booking'
AFTER `booking_status`;
