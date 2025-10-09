# 🚨 QUICK FIX: Payment Column Errors

## Errors You're Seeing

```
❌ Column not found: 1054 Unknown column 'payment_percentage' in 'SELECT'
❌ Column not found: 1054 Unknown column 'payment_attachments' in 'SELECT'
❌ Column not found: 1054 Unknown column 'schedule_id' in 'ON'
```

## ✅ What I Fixed

### 1. Backend Code Fixed (`admin.php`)
- ✅ Removed `payment_attachments` from payment queries
- ✅ Added `payment_percentage` to payment queries
- ✅ Updated payment attachment upload to use proper normalized table
- ✅ No more JSON column references

### 2. Database Migration Ready
- ✅ Created migration to add `schedule_id` column
- ✅ Created migration to add `payment_percentage` column
- ✅ Created migration to add `payment_reference` column
- ✅ Created migration to remove `payment_attachments` column (if exists)
- ✅ Ready to run!

## 🔧 TO FIX - Run This NOW:

### Option 1: Use the Batch File (Easiest for Windows)

```bash
# Navigate to the API folder
cd event-planning-system/app/api

# Double-click this file:
fix-payment-column.bat
```

### Option 2: Run PHP Script

```bash
cd event-planning-system/app/api
php run_payment_percentage_migration.php
```

### Option 3: Direct SQL (Manual)

Open phpMyAdmin or MySQL Workbench and run:

```sql
-- Add schedule_id column
ALTER TABLE tbl_payments
ADD COLUMN schedule_id INT(11) DEFAULT NULL
COMMENT 'Link to payment schedule'
AFTER event_id;

-- Add payment_percentage column
ALTER TABLE tbl_payments
ADD COLUMN payment_percentage DECIMAL(5,2) DEFAULT NULL
COMMENT 'Percentage of total if this is a partial payment'
AFTER payment_notes;

-- Add payment_reference column
ALTER TABLE tbl_payments
ADD COLUMN payment_reference VARCHAR(100) DEFAULT NULL
COMMENT 'Payment transaction reference number'
AFTER payment_percentage;

-- Remove old payment_attachments column if it exists
ALTER TABLE tbl_payments DROP COLUMN IF EXISTS payment_attachments;

-- Verify
DESCRIBE tbl_payments;
```

## ⚠️ IMPORTANT: After Running Migration

1. **Stop your Next.js dev server** (Ctrl+C)
2. **Restart it:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
3. **Hard refresh your browser** (Ctrl+Shift+R)
4. **The errors should be GONE!** ✅

## 📋 What Changed in the Database

### Before (Broken):
```
tbl_payments:
- payment_id
- event_id
- payment_amount
- payment_attachments ❌ (JSON - causes collation errors)
- (missing schedule_id ❌)
- (missing payment_percentage ❌)
- (missing payment_reference ❌)
- ...
```

### After (Fixed):
```
tbl_payments:
- payment_id
- event_id
- schedule_id ✅ (NEW - links to payment schedules)
- payment_amount
- payment_notes
- payment_percentage ✅ (NEW - tracks payment %)
- payment_reference ✅ (NEW - transaction references)
- ...

tbl_payment_attachments: (separate table)
- attachment_id
- payment_id
- file_name
- file_path
- ...
```

## 🎯 Expected Result

After running the migration and restarting:

✅ Event details page loads without errors
✅ Payment history displays correctly
✅ Can create new payments
✅ Can record payment transactions
✅ No more "Column not found" errors

## 🆘 Troubleshooting

### "Connection refused"
- Make sure XAMPP/WAMP/MySQL is running
- Check database name in script (should be `es_v3`)

### "Column already exists"
- Migration is smart - it will skip if column exists
- Just restart your Next.js server

### Still getting errors?
1. Clear browser cache completely
2. Check `php_errors.log` in `/app/api/`
3. Verify migration ran: `DESCRIBE tbl_payments;` in phpMyAdmin

## 📁 Files Modified/Created

✅ `app/api/admin.php` - Fixed backend queries
✅ `app/api/migrations/add_payment_percentage_column.sql` - Migration SQL
✅ `app/api/run_payment_percentage_migration.php` - Runner script
✅ `app/api/fix-payment-column.bat` - Windows batch file

---

## 🚀 NEXT STEPS

1. **RUN THE MIGRATION NOW** (choose one method above)
2. **Restart Next.js server**
3. **Test the event details page**
4. **Create a test payment to verify**

Everything should work perfectly after this! 🎉
