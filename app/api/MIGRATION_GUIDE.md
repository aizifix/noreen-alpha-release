

# Package Structure Normalization Migration Guide

## 📋 Overview

This guide helps you migrate from the denormalized structure (components as comma-separated values) to a properly normalized 3-level hierarchy.

### Before (Denormalized)
```
tbl_packages
└── tbl_package_components
    - component_id
    - component_name: "Wedding Essentials"
    - component_description: "3-Layer Cake, Bridal Car, Flowers..." ← Comma-separated!
```

### After (Normalized)
```
tbl_packages
└── tbl_package_inclusions (renamed)
    - inclusion_id
    - inclusion_name: "Wedding Essentials"
    - inclusion_price
    └── tbl_inclusion_components (NEW!)
        - component_id
        - component_name: "3-Layer Wedding Cake"
        - component_name: "Bridal Car"
        - component_name: "Fresh Flowers"
```

## 🚀 Migration Steps

### Step 1: Backup Database
```batch
cd event-planning-system/app/api
run_normalize_migration.bat
```

This will:
1. Create a timestamped database backup
2. Run the normalization migration
3. Show verification results

### Step 2: Verify Migration
```sql
-- Check inclusions
SELECT * FROM tbl_package_inclusions LIMIT 10;

-- Check components
SELECT
    i.inclusion_name,
    c.component_name
FROM tbl_package_inclusions i
JOIN tbl_inclusion_components c ON i.inclusion_id = c.inclusion_id
WHERE i.package_id = 41
ORDER BY i.display_order, c.display_order;
```

Expected result:
```
inclusion_name        | component_name
"Wedding Essentials"  | "3-Layer Wedding Cake"
"Wedding Essentials"  | "Bridal Car with Fresh Flowers"
"Wedding Essentials"  | "...more components..."
```

### Step 3: Update Backend Code

#### A. admin.php - Create Package Operation

**Before:**
```php
// Old: Single table insert
$componentSql = "INSERT INTO tbl_package_components (
    package_id, component_name, component_description,
    component_price, display_order
) VALUES (?, ?, ?, ?, ?)";

$componentStmt->execute([
    $packageId,
    $component['component_name'],
    $component['component_description'] ?? '', // ← Comma-separated list
    $component['component_price'],
    $index
]);
```

**After:**
```php
// New: Two-level insert
// 1. Insert inclusion
$inclusionSql = "INSERT INTO tbl_package_inclusions (
    package_id, inclusion_name, inclusion_price,
    display_order, supplier_id, offer_id
) VALUES (?, ?, ?, ?, ?, ?)";

$inclusionStmt = $conn->prepare($inclusionSql);
$inclusionStmt->execute([
    $packageId,
    $inclusion['inclusion_name'],
    $inclusion['inclusion_price'],
    $index,
    $inclusion['supplier_id'] ?? null,
    $inclusion['offer_id'] ?? null
]);

$inclusionId = $conn->lastInsertId();

// 2. Insert components for this inclusion
if (!empty($inclusion['components'])) {
    $componentSql = "INSERT INTO tbl_inclusion_components (
        inclusion_id, component_name, component_description,
        component_price, display_order
    ) VALUES (?, ?, ?, ?, ?)";

    $componentStmt = $conn->prepare($componentSql);

    foreach ($inclusion['components'] as $compIndex => $component) {
        $componentStmt->execute([
            $inclusionId,
            $component['name'],
            $component['description'] ?? '',
            $component['price'] ?? 0,
            $compIndex
        ]);
    }
}
```

#### B. admin.php - Get Package Details Operation

**Before:**
```php
// Old: Single query
$componentsSql = "SELECT * FROM tbl_package_components
                  WHERE package_id = ? ORDER BY display_order";
$componentsStmt = $conn->prepare($componentsSql);
$componentsStmt->execute([$packageId]);
$components = $componentsStmt->fetchAll(PDO::FETCH_ASSOC);
```

**After:**
```php
// New: Join query to get inclusions with components
$inclusionsSql = "
    SELECT
        i.inclusion_id,
        i.inclusion_name,
        i.inclusion_price,
        i.display_order,
        i.supplier_id,
        i.offer_id,
        c.component_id,
        c.component_name,
        c.component_description,
        c.component_price as component_price,
        c.display_order as component_display_order
    FROM tbl_package_inclusions i
    LEFT JOIN tbl_inclusion_components c ON i.inclusion_id = c.inclusion_id
    WHERE i.package_id = ?
    ORDER BY i.display_order, c.display_order
";

$inclusionsStmt = $conn->prepare($inclusionsSql);
$inclusionsStmt->execute([$packageId]);
$rows = $inclusionsStmt->fetchAll(PDO::FETCH_ASSOC);

// Group components under their inclusions
$inclusions = [];
foreach ($rows as $row) {
    $inclusionId = $row['inclusion_id'];

    if (!isset($inclusions[$inclusionId])) {
        $inclusions[$inclusionId] = [
            'name' => $row['inclusion_name'],
            'price' => $row['inclusion_price'],
            'supplier_id' => $row['supplier_id'],
            'offer_id' => $row['offer_id'],
            'components' => []
        ];
    }

    if ($row['component_id']) {
        $inclusions[$inclusionId]['components'][] = [
            'name' => $row['component_name'],
            'description' => $row['component_description'],
            'price' => $row['component_price']
        ];
    }
}

$package['inclusions'] = array_values($inclusions);
```

#### C. admin.php - Update Package Operation

**Before:**
```php
// Delete and re-insert components
$deleteComponentsSql = "DELETE FROM tbl_package_components WHERE package_id = ?";
$deleteStmt->execute([$packageId]);

foreach ($data['components'] as $index => $component) {
    $componentSql = "INSERT INTO tbl_package_components ...";
    // Insert with comma-separated description
}
```

**After:**
```php
// Delete inclusions and components (CASCADE will handle components)
$deleteInclusionsSql = "DELETE FROM tbl_package_inclusions WHERE package_id = ?";
$deleteStmt->execute([$packageId]);

foreach ($data['inclusions'] as $index => $inclusion) {
    // Insert inclusion
    $inclusionSql = "INSERT INTO tbl_package_inclusions ...";
    $inclusionId = $conn->lastInsertId();

    // Insert components for this inclusion
    foreach ($inclusion['components'] as $compIndex => $component) {
        $componentSql = "INSERT INTO tbl_inclusion_components ...";
    }
}
```

### Step 4: Update Frontend Code

#### A. Frontend Type Definitions (`types/index.ts` or similar)

**Before:**
```typescript
interface Component {
  component_id: number;
  component_name: string;
  component_description: string; // comma-separated
  component_price: number;
}
```

**After:**
```typescript
interface Inclusion {
  inclusion_id: number;
  inclusion_name: string;
  inclusion_price: number;
  display_order: number;
  supplier_id?: number;
  offer_id?: number;
  components: Component[]; // Now an array!
}

interface Component {
  component_id: number;
  component_name: string;
  component_description: string;
  component_price: number;
  display_order: number;
}
```

#### B. Package Details Page (`packages/[id]/page.tsx`)

**Before:**
```typescript
// Old: Flat list
const [editedInclusions, setEditedInclusions] = useState<Component[]>([]);

// Rendering
{editedInclusions.map((inclusion) => (
  <div key={inclusion.component_id}>
    <h3>{inclusion.component_name}</h3>
    <p>{inclusion.component_description}</p> {/* comma-separated */}
  </div>
))}
```

**After:**
```typescript
// New: Nested structure
const [editedInclusions, setEditedInclusions] = useState<Inclusion[]>([]);

// Rendering
{editedInclusions.map((inclusion) => (
  <div key={inclusion.inclusion_id}>
    <h3>{inclusion.inclusion_name}</h3>
    <div className="components">
      {inclusion.components.map((component) => (
        <div key={component.component_id}>
          <span>{component.component_name}</span>
          <span>{formatPrice(component.component_price)}</span>
        </div>
      ))}
    </div>
  </div>
))}
```

#### C. Package Creation/Edit - Data Submission

**Before:**
```typescript
// Old: Submit flat components
const updateData = {
  operation: "updatePackage",
  package_id: packageId,
  components: editedInclusions.map((inc, index) => ({
    component_name: inc.name,
    component_description: inc.components.join(", "), // ← Join to comma-separated
    component_price: inc.price,
    display_order: index
  }))
};
```

**After:**
```typescript
// New: Submit nested structure
const updateData = {
  operation: "updatePackage",
  package_id: packageId,
  inclusions: editedInclusions.map((inc, index) => ({
    inclusion_name: inc.name,
    inclusion_price: inc.price,
    display_order: index,
    supplier_id: inc.supplier_id,
    offer_id: inc.offer_id,
    components: inc.components.map((comp, compIndex) => ({
      component_name: comp.name,
      component_description: comp.description,
      component_price: comp.price,
      display_order: compIndex
    }))
  }))
};
```

## 🧪 Testing Checklist

After migration, test these features:

### Admin Dashboard
- [ ] Create new package with inclusions and components
- [ ] Edit existing package
- [ ] Add new inclusion to package
- [ ] Add components to inclusion
- [ ] Remove inclusion from package
- [ ] Remove component from inclusion
- [ ] Reorder inclusions
- [ ] Reorder components within inclusion
- [ ] Duplicate package (should copy all inclusions and components)

### Client Dashboard
- [ ] View package details
- [ ] Select package for booking
- [ ] View inclusions with components in booking creation
- [ ] Customize inclusions during booking
- [ ] Submit booking with customized inclusions

### Database Integrity
```sql
-- Check for orphaned components
SELECT c.* FROM tbl_inclusion_components c
LEFT JOIN tbl_package_inclusions i ON c.inclusion_id = i.inclusion_id
WHERE i.inclusion_id IS NULL;
-- Should return 0 rows

-- Check CASCADE delete works
DELETE FROM tbl_package_inclusions WHERE inclusion_id = [test_id];
-- Components should be automatically deleted

-- Verify component counts
SELECT
    p.package_title,
    COUNT(DISTINCT i.inclusion_id) as inclusion_count,
    COUNT(c.component_id) as component_count
FROM tbl_packages p
LEFT JOIN tbl_package_inclusions i ON p.package_id = i.package_id
LEFT JOIN tbl_inclusion_components c ON i.inclusion_id = c.inclusion_id
GROUP BY p.package_id, p.package_title;
```

## 🔄 Rollback

If something goes wrong:

```batch
cd event-planning-system/app/api
rollback_normalize_migration.bat
```

This will:
1. Restore comma-separated component descriptions
2. Rename tables back to original names
3. Drop the tbl_inclusion_components table

## 📝 Benefits of New Structure

### 1. **Proper Normalization**
- No more comma-separated values
- Each component is a separate row
- Easy to query, filter, and sort

### 2. **Better Data Integrity**
- Foreign key constraints
- Cascade deletes
- Type safety

### 3. **Future Features**
Easy to add:
- Component pricing breakdown
- Component availability tracking
- Component inventory management
- Component substitutions
- Component categories/tags
- Per-component supplier assignments

### 4. **Better UX**
- Drag-and-drop component reordering
- Individual component selection
- Component-level pricing visibility
- Component search and filtering

## 🎯 Next Steps

After successful migration:

1. **Clean up old column**
   ```sql
   ALTER TABLE tbl_package_inclusions DROP COLUMN components_list;
   ```

2. **Add indexes for performance**
   ```sql
   CREATE INDEX idx_components_inclusion_display
   ON tbl_inclusion_components(inclusion_id, display_order);
   ```

3. **Consider additional features**
   - Component images
   - Component categories
   - Component templates
   - Component marketplace

## 📞 Support

If you encounter issues:
1. Check the error logs
2. Verify foreign key constraints
3. Check for orphaned data
4. Use rollback script if needed
5. Restore from backup as last resort

---

**Remember**: Always backup before running migrations! 🔒
