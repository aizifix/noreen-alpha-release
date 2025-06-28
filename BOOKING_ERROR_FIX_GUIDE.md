# Booking System Error Fix Guide

## 🚨 Error: "Unknown column 'start_time' in 'field list'"

This error occurs because the database schema hasn't been updated with the new columns required for the enhanced booking system.

## 🔧 Quick Fix Options

### Option 1: Run the PHP Migration Script (Recommended)

1. Navigate to: `http://localhost/events-api/migrate_bookings.php`
2. This will automatically add the required columns and create the necessary database structures
3. You should see success messages for each step

### Option 2: Manual SQL Execution

Copy and paste this SQL into your database management tool (phpMyAdmin, MySQL Workbench, etc.):

```sql
-- Add missing columns to tbl_bookings
ALTER TABLE tbl_bookings ADD COLUMN start_time TIME NULL AFTER event_time;
ALTER TABLE tbl_bookings ADD COLUMN end_time TIME NULL AFTER start_time;
ALTER TABLE tbl_bookings ADD COLUMN booking_status VARCHAR(20) DEFAULT 'pending' AFTER notes;
ALTER TABLE tbl_bookings ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER booking_status;

-- Update existing records
UPDATE tbl_bookings SET booking_status = 'pending' WHERE booking_status IS NULL OR booking_status = '';

-- Add indexes for better performance
ALTER TABLE tbl_bookings ADD INDEX idx_booking_status (booking_status);
ALTER TABLE tbl_bookings ADD INDEX idx_booking_date (event_date);
ALTER TABLE tbl_bookings ADD INDEX idx_booking_user (user_id);
```

### Option 3: Use the SQL File

1. Import the `fix_bookings_table.sql` file into your database
2. This contains the same commands as Option 2 but in a ready-to-import format

## 🛡️ Backward Compatibility

The system has been updated with backward compatibility:

- **Client API**: Automatically detects if new columns exist and adjusts accordingly
- **Admin API**: Falls back to legacy queries if enhanced view isn't available
- **No data loss**: Existing bookings will continue to work

## ✅ Verification Steps

After applying the fix, verify it worked by:

1. **Check Database Structure**:

   ```sql
   DESCRIBE tbl_bookings;
   ```

   You should see these new columns:

   - `start_time` (TIME)
   - `end_time` (TIME)
   - `booking_status` (VARCHAR)
   - `updated_at` (TIMESTAMP)

2. **Test Booking Creation**:

   - Go to `/client/bookings/create-booking`
   - Create a test booking
   - Should complete without errors

3. **Test Admin Interface**:
   - Go to `/admin/bookings`
   - Should display bookings with proper statuses
   - Accept/Reject buttons should appear for pending bookings

## 🔄 What Gets Enhanced

After applying the fix:

### Database:

- ✅ New time tracking columns (`start_time`, `end_time`)
- ✅ Proper status management (`booking_status`)
- ✅ Update tracking (`updated_at`)
- ✅ Performance indexes
- ✅ Admin dashboard view (`vw_admin_bookings`)

### Functionality:

- ✅ Booking status workflow (pending → confirmed → converted)
- ✅ Admin accept/reject functionality
- ✅ Enhanced event builder integration
- ✅ Notification system for status changes
- ✅ Proper validation and security

## 🚨 Troubleshooting

### Error persists after running migration?

1. Clear browser cache and restart the application
2. Check if the migration script completed successfully
3. Verify database connection in `db_connect.php`

### Migration script gives permission errors?

1. Ensure your database user has ALTER privileges
2. Contact your hosting provider if using shared hosting
3. Use Option 2 (manual SQL) via phpMyAdmin instead

### Bookings page shows errors?

1. Refresh the page after running the migration
2. Check browser console for JavaScript errors
3. Verify all API endpoints are accessible

## 📞 Support

If you continue experiencing issues:

1. Check the browser console for detailed error messages
2. Verify your database connection settings
3. Ensure all file permissions are correct
4. Try clearing server-side cache if applicable

## 🎯 Expected Result

After successful migration:

- ✅ Client booking creation works without errors
- ✅ Admin can see all bookings with status badges
- ✅ Accept/Reject buttons appear for pending bookings
- ✅ Event builder only shows confirmed bookings
- ✅ Status changes trigger notifications

The enhanced booking system will be fully functional with proper workflow management.
