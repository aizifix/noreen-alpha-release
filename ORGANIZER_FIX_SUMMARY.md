# Organizer Assignment Fix

## Issue Resolved

We fixed a React key error where `Encountered two children with the same key, '0'` by:

1. Adding organizer_name to the getClientEvents API response by joining the organizer user table
2. Creating a SQL script to fix duplicate organizer assignments in the database

## Fix Details

### 1. API Fix

Modified `app/api/client.php` to include organizer name in the client events response:

```php
$sql = "SELECT e.*,
        CONCAT(a.user_firstName, ' ', a.user_lastName) as admin_name,
        CONCAT(org.user_firstName, ' ', org.user_lastName) as organizer_name,  // Added this line
        ...
        FROM tbl_events e
        LEFT JOIN tbl_users a ON e.admin_id = a.user_id
        LEFT JOIN tbl_users org ON e.organizer_id = org.user_id  // Added this line
        ...
```

### 2. Database Fix

Created two scripts:

- `app/api/fix_duplicate_organizer_assignments.sql`: SQL script that:

  - Identifies duplicate organizer assignments
  - Creates a temporary table with only the latest assignment for each event
  - Deletes duplicate assignments
  - Updates the events table to use the correct organizer_id

- `app/api/run_organizer_fix.php`: PHP script to execute the SQL fix

## How to Run the Fix

Execute the PHP script in the API directory:

```
php app/api/run_organizer_fix.php
```

This will fix any duplicate organizer assignments in the database while keeping only the latest assignment for each event.

## Prevention

The issue was caused by duplicate entries in the organizer assignment table. The fix ensures each event has only one active organizer assignment, preventing the duplicate React key errors.
