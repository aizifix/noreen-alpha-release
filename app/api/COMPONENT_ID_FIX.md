# Package Components - component_id = 0 Fix

## Problem Description

Some rows in the `tbl_package_components` table have `component_id = 0` instead of proper auto-incrementing IDs. This causes issues because:

1. **Duplicate Keys**: Multiple components can't have the same ID (0)
2. **Dropdown Issues**: Frontend dropdown components rely on unique `component_id` values
3. **Selection Problems**: When clients select components during booking creation, duplicate IDs cause conflicts
4. **Data Integrity**: The primary key constraint is violated

### Example of the Problem

```sql
-- BAD: Multiple rows with component_id = 0
component_id | package_id | component_name
0            | 41         | Wedding Essentials
0            | 41         | Entertainment & Effects
0            | 41         | Freebies
0            | 42         | Gold
0            | 42         | Bridal Bouquet
```

### Expected Behavior

```sql
-- GOOD: Unique auto-incrementing IDs
component_id | package_id | component_name
1206         | 41         | Wedding Essentials
1207         | 41         | Entertainment & Effects
1208         | 41         | Freebies
1209         | 42         | Gold
1210         | 42         | Bridal Bouquet
```

## Root Cause

The issue occurs when:
1. Components were manually inserted with explicit `component_id = 0` values
2. SQL import files contained `INSERT` statements with `component_id = 0`
3. The AUTO_INCREMENT property was not properly set on the table

## Solution

### Important: PRIMARY KEY Requirement

The error you encountered:
```
#1075 - Incorrect table definition; there can be only one auto column and it must be defined as a key
```

This happens because **AUTO_INCREMENT requires the column to be a PRIMARY KEY**. The table should already have `component_id` as PRIMARY KEY, so we don't modify the table structure—we just fix the data.

### Step 1: Run the Migration Script

**Option A: Using Batch File (Recommended)**
```batch
cd app/api
fix_component_ids.bat
```

**Option B: Direct PHP Execution**
```batch
cd app/api
php run_component_fix.php
```

**Option C: Direct SQL (if needed)**
```batch
cd app/api
mysql -u your_user -p your_database < migrations/fix_component_id_zero_safe.sql
```

This script will:
1. Identify all rows with `component_id = 0`
2. Back them up to a temporary table
3. Delete the problematic rows
4. Re-insert them, allowing AUTO_INCREMENT to assign proper IDs
5. Reset the AUTO_INCREMENT counter to the next available ID
6. Show a summary of components by package
7. Rollback everything if any error occurs (transaction safety)

### Step 2: Verify the Fix

After running the script, check your database:

```sql
-- Should return 0 rows
SELECT * FROM tbl_package_components WHERE component_id = 0;

-- Should show proper component IDs for each package
SELECT
    package_id,
    component_id,
    component_name,
    component_price,
    display_order
FROM tbl_package_components
WHERE package_id IN (41, 42, 43, 44, 49)
ORDER BY package_id, display_order;
```

## How Package Components Work with Dropdowns

### Frontend Flow

1. **Package Selection** (`create-booking/page.tsx`)
   - Client selects a package (e.g., "Enchanted Garden Wedding")
   - System fetches all components for that package

2. **Components Step** (`ComponentsStep.tsx`)
   - Displays package components in a list
   - Each component has a unique `component_id` for tracking
   - Client can:
     - ✅ Keep components (checked)
     - ❌ Remove components (unchecked)
     - ➕ Add custom components from all available components

3. **API Endpoints**
   ```typescript
   // Get all components for a specific package
   GET /api/client?operation=getPackageComponents&package_id=41

   // Get all available components (for adding custom ones)
   GET /api/client?operation=getAllPackageComponents
   ```

4. **Database Structure**
   ```sql
   tbl_package_components
   ├─ component_id (PK, AUTO_INCREMENT) ← Must be unique!
   ├─ package_id (FK to tbl_packages)
   ├─ component_name (e.g., "Wedding Essentials")
   ├─ component_description
   ├─ component_price
   ├─ display_order (for sorting in dropdowns)
   ├─ supplier_id (optional - if from supplier)
   └─ offer_id (optional - if from specific offer)
   ```

### Example Component Data

**Package 41: "Enchanted Garden Wedding"**
```
component_id | component_name              | component_price | display_order
1206         | Wedding Essentials          | 7000.00        | 5
1207         | Entertainment & Effects     | 8000.00        | 6
1208         | Freebies                    | 130000.00      | 7
```

**Package 42: "Rustic Barn Celebration"**
```
component_id | component_name              | component_price | display_order
1209         | Gold Package                | 120000.00      | 0
1210         | Bridal Bouquet & Florals    | 15000.00       | 1
1211         | Silver Package              | 35000.00       | 2
```

### Dropdown Population

When a client creates a booking:

1. **Initial Components** (from selected package)
   ```javascript
   // Frontend receives these as default checked
   packageComponents = [
     { component_id: 1206, component_name: "Wedding Essentials", ... },
     { component_id: 1207, component_name: "Entertainment & Effects", ... },
     { component_id: 1208, component_name: "Freebies", ... }
   ]
   ```

2. **Available Components** (for customization)
   ```javascript
   // Client can browse and add from all components
   availableComponents = [
     { component_id: 1206, component_name: "Wedding Essentials", ... },
     { component_id: 1207, component_name: "Entertainment & Effects", ... },
     // ... components from all packages
   ]
   ```

3. **Selection Tracking**
   ```javascript
   // Frontend tracks selections by component_id
   isComponentAdded(componentId) {
     return packageComponents.some(c => c.component_id === componentId) ||
            customComponents.some(c => c.component_id === componentId);
   }
   ```

## Prevention

To prevent this issue in the future:

### 1. Never Explicitly Insert component_id

**❌ BAD:**
```sql
INSERT INTO tbl_package_components
(component_id, package_id, component_name, ...)
VALUES (0, 41, 'Test Component', ...);
```

**✅ GOOD:**
```sql
INSERT INTO tbl_package_components
(package_id, component_name, component_description, component_price, display_order)
VALUES (41, 'Test Component', 'Description', 5000.00, 0);
```

### 2. PHP Insert Statements

All PHP code correctly omits `component_id`:

```php
// Correct - from admin.php line 1358
$componentSql = "INSERT INTO tbl_package_components (
    package_id, component_name, component_description,
    component_price, display_order
) VALUES (?, ?, ?, ?, ?)";

$componentStmt = $this->conn->prepare($componentSql);
$componentStmt->execute([
    $packageId,
    $component['component_name'],
    $component['component_description'] ?? '',
    $component['component_price'],
    $index
]);
```

### 3. Verify Table Structure

Ensure the table has proper structure with PRIMARY KEY:

```sql
-- Check current structure
SHOW CREATE TABLE tbl_package_components;

-- Verify PRIMARY KEY exists
SHOW KEYS FROM tbl_package_components WHERE Key_name = 'PRIMARY';

-- If needed, add PRIMARY KEY with AUTO_INCREMENT
-- (only if it doesn't exist - this is usually not needed)
ALTER TABLE tbl_package_components
MODIFY COLUMN component_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY;
```

**Note**: AUTO_INCREMENT **must** be defined on a PRIMARY KEY column. You cannot have AUTO_INCREMENT without PRIMARY KEY.

## Testing After Fix

### Test 1: Verify No Zeros
```sql
SELECT COUNT(*) as zero_count
FROM tbl_package_components
WHERE component_id = 0;
-- Expected: 0
```

### Test 2: Check Component Uniqueness
```sql
SELECT component_id, COUNT(*) as dup_count
FROM tbl_package_components
GROUP BY component_id
HAVING dup_count > 1;
-- Expected: No rows (all IDs are unique)
```

### Test 3: Test Frontend Dropdown
1. Go to Client Dashboard → Create Booking
2. Select a package with components
3. Navigate to "Components" or "Inclusions" step
4. Verify all components show with proper names
5. Try checking/unchecking components
6. Try adding custom components
7. Ensure no duplicate selections or errors

### Test 4: Create a New Package
1. Go to Admin Dashboard → Packages → Create New
2. Add 3-5 components
3. Save the package
4. Query the database to verify all components have unique IDs > 0

```sql
SELECT * FROM tbl_package_components
WHERE package_id = [your_new_package_id]
ORDER BY display_order;
```

## Related Files

- **PHP Migration Runner**: `app/api/run_component_fix.php` ⭐ (recommended)
- **Batch Runner**: `app/api/fix_component_ids.bat`
- **SQL Migration (Safe)**: `app/api/migrations/fix_component_id_zero_safe.sql`
- **SQL Migration (Original)**: `app/api/migrations/fix_component_id_zero.sql`
- **PHP Backend**: `app/api/admin.php` (lines 1358-1371, 4187-4209)
- **PHP Backend**: `app/api/client.php` (component retrieval endpoints)
- **Frontend**: `app/(authenticated)/client/bookings/create-booking/ComponentsStep.tsx`
- **Frontend**: `app/(authenticated)/client/bookings/create-booking/InclusionsStep.tsx`

## Support

If you encounter issues after running the migration:

1. **Check the console output** for any errors
2. **Verify the transaction completed successfully** - look for "✓ Migration completed successfully!"
3. **Check database logs** for constraint violations
4. **Ensure no other processes** are writing to the table during migration
5. **Verify PRIMARY KEY exists**: Run `SHOW KEYS FROM tbl_package_components WHERE Key_name = 'PRIMARY';`

### Common Issues

**Issue 1: AUTO_INCREMENT Error**
```
#1075 - Incorrect table definition; there can be only one auto column and it must be defined as a key
```
**Solution**: This is now handled automatically in the migration. The `component_id` column should already be a PRIMARY KEY. If not, run:
```sql
ALTER TABLE tbl_package_components
ADD PRIMARY KEY (component_id);
```

**Issue 2: Duplicate Entry Error**
```
#1062 - Duplicate entry '123' for key 'PRIMARY'
```
**Solution**: This means there's already a component with that ID. The PHP script uses transactions to prevent this, but if it happens, ensure you're using the safe migration script.

**Issue 3: Foreign Key Constraint**
```
#1451 - Cannot delete or update a parent row: a foreign key constraint fails
```
**Solution**: Check if any bookings or events reference the components being fixed. You may need to temporarily disable foreign key checks:
```sql
SET FOREIGN_KEY_CHECKS=0;
-- run migration
SET FOREIGN_KEY_CHECKS=1;
```

## Summary

✅ **After running the fix:**
- All components will have unique, non-zero IDs
- Dropdowns will work correctly
- Clients can select/deselect components without conflicts
- New components will auto-increment properly
- Database integrity is maintained
