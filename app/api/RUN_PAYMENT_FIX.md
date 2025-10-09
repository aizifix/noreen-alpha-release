# Fix: Missing payment_percentage Column

## Problem
The application throws an error:
```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'payment_percentage' in 'SELECT'
```

This means the database is missing the `payment_percentage` column in the `tbl_payments` table.

## Solution

### Option 1: Run Migration Script (Recommended)

1. **Navigate to the API directory:**
   ```bash
   cd event-planning-system/app/api
   ```

2. **Run the migration script:**
   ```bash
   php run_payment_percentage_migration.php
   ```

3. **Expected Output:**
   ```
   === Payment Percentage Column Migration ===
   Starting migration process...

   ✓ Connected successfully to database 'es_v3'
   ✓ Migration file loaded
   ✓ Migration executed successfully!

   === Verification ===
   Column Name: payment_percentage
   Column Type: decimal(5,2)
   Nullable: YES
   Default: NULL
   Comment: Percentage of total if this is a partial payment

   ✓ Column 'payment_percentage' exists and is ready to use!

   === Migration Complete ===
   You can now restart your Next.js application.
   ```

4. **Restart your Next.js app** to see the fix in action.

### Option 2: Manual SQL Execution

If you prefer to run the SQL manually:

1. **Open your database management tool** (phpMyAdmin, MySQL Workbench, etc.)

2. **Select the `es_v3` database**

3. **Run this SQL command:**
   ```sql
   ALTER TABLE tbl_payments
   ADD COLUMN payment_percentage DECIMAL(5,2) DEFAULT NULL
   COMMENT 'Percentage of total if this is a partial payment'
   AFTER payment_notes;
   ```

4. **Verify the column was added:**
   ```sql
   DESCRIBE tbl_payments;
   ```

5. **Restart your Next.js app**

## What This Does

The migration adds a new column `payment_percentage` to the `tbl_payments` table:
- **Type:** `DECIMAL(5,2)` - Stores percentages like 50.00, 25.50, etc.
- **Nullable:** YES - Can be NULL for payments without percentage tracking
- **Default:** NULL
- **Purpose:** Tracks what percentage of the total budget each payment represents

## Usage

After this fix, the system will:
- ✅ Store payment percentages automatically when creating payments
- ✅ Calculate percentages based on payment amount vs total budget
- ✅ Display payment progress in the admin dashboard
- ✅ Support partial payment tracking

## Troubleshooting

### Migration Script Fails with Connection Error

If you get a connection error, update the database credentials in `run_payment_percentage_migration.php`:

```php
$host = 'localhost';
$dbname = 'es_v3';  // Your database name
$username = 'root';  // Your MySQL username
$password = '';      // Your MySQL password
```

### Column Already Exists

If the migration says "Column payment_percentage already exists", then:
1. The column is already in your database
2. The error might be coming from a different issue
3. Check the full error log for more details

### Still Getting Errors After Migration

1. **Clear your browser cache and cookies**
2. **Restart your development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
3. **Check if the column was actually added:**
   ```sql
   SHOW COLUMNS FROM tbl_payments LIKE 'payment_percentage';
   ```

## Need Help?

If you continue to experience issues after running this migration:
1. Check the PHP error logs in `event-planning-system/app/api/php_errors.log`
2. Check the browser console for JavaScript errors
3. Verify your database connection settings in `db_connect.php`
