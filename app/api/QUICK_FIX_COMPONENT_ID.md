# Quick Fix: component_id = 0 Issue

## The Problem
Your `tbl_package_components` table has rows with `component_id = 0`, causing dropdown selection issues.

## Quick Solution (2 Options)

### Option A: Complete Fix (Recommended - fixes table structure + data)

```batch
cd event-planning-system/app/api
run_complete_fix.bat
```

This will:
- ✅ Fix the table structure (add AUTO_INCREMENT PRIMARY KEY)
- ✅ Fix all existing rows with component_id = 0
- ✅ Reset AUTO_INCREMENT counter
- ✅ Verify everything is working

### Option B: Data-Only Fix (if table structure is already correct)

```batch
cd event-planning-system/app/api
php run_component_fix.php
```

### Verify it Worked

```sql
SELECT COUNT(*) FROM tbl_package_components WHERE component_id = 0;
```
**Expected result**: 0 (zero rows)

```sql
SHOW CREATE TABLE tbl_package_components;
```
**Expected result**: Should show `AUTO_INCREMENT PRIMARY KEY` on `component_id`

## What the Script Does

1. ✅ Finds all components with `component_id = 0`
2. ✅ Backs them up safely
3. ✅ Deletes the problematic rows
4. ✅ Re-inserts them with proper AUTO_INCREMENT IDs
5. ✅ Resets AUTO_INCREMENT counter
6. ✅ Shows you a summary
7. ✅ Rolls back if any error occurs

## Expected Output

```
================================================
  Fix Package Components with component_id = 0
================================================

✓ Database connection established

--- CURRENT STATE ---
Rows with component_id = 0: 15

Starting migration...

Current max component_id: 282
Backing up components...
Backed up 15 components

Deleting components with component_id = 0...
Deleted 15 rows

Re-inserting components with proper IDs...
...............
Re-inserted 15 components

--- VERIFICATION ---
Rows with component_id = 0 after fix: 0

--- COMPONENTS BY PACKAGE ---
Package 41 (Enchanted Garden): 3 components (IDs: 283-285)
Package 42 (Rustic Barn): 3 components (IDs: 286-288)
...

--- RESETTING AUTO_INCREMENT ---
Next AUTO_INCREMENT value set to: 299

================================================
✓ Migration completed successfully!
================================================
Fixed 15 components
All components now have proper unique IDs
```

## About the AUTO_INCREMENT Error

If you tried to run:
```sql
ALTER TABLE tbl_package_components
MODIFY COLUMN component_id INT(11) NOT NULL AUTO_INCREMENT;
```

And got:
```
#1075 - Incorrect table definition; there can be only one auto column and it must be defined as a key
```

**Why?** AUTO_INCREMENT requires PRIMARY KEY. The column `component_id` should already be a PRIMARY KEY in your table. Our fix script doesn't modify the table structure—it just fixes the data.

## After the Fix

✅ All component_id values are unique and > 0
✅ Dropdowns work properly in booking creation
✅ Clients can select/deselect components without issues
✅ New components auto-increment correctly
✅ Database integrity maintained

## Need More Info?

See the full documentation: `COMPONENT_ID_FIX.md`

## Still Having Issues?

1. Check if `component_id` is a PRIMARY KEY:
   ```sql
   SHOW KEYS FROM tbl_package_components WHERE Key_name = 'PRIMARY';
   ```

2. If no PRIMARY KEY exists, add it:
   ```sql
   ALTER TABLE tbl_package_components ADD PRIMARY KEY (component_id);
   ```

3. Then re-run the fix script

## That's It!

Your package components should now work perfectly with the booking dropdowns. 🎉
