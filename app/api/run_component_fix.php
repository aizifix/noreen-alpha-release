<?php
/**
 * Fix Package Components with component_id = 0
 *
 * This script fixes components that have component_id = 0 by:
 * 1. Backing them up
 * 2. Deleting them
 * 3. Re-inserting them (allowing AUTO_INCREMENT to assign proper IDs)
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "================================================\n";
echo "  Fix Package Components with component_id = 0\n";
echo "================================================\n\n";

try {
    // Include database connection
    require_once __DIR__ . '/db_connect.php';

    echo "✓ Database connection established\n\n";

    // Check current state
    echo "--- CURRENT STATE ---\n";
    $stmt = $conn->query("SELECT COUNT(*) as count FROM tbl_package_components WHERE component_id = 0");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $countBefore = $result['count'];
    echo "Rows with component_id = 0: {$countBefore}\n\n";

    if ($countBefore == 0) {
        echo "✓ No components with component_id = 0 found. Nothing to fix!\n";
        exit(0);
    }

    echo "Starting migration...\n\n";

    // Start transaction
    $conn->beginTransaction();

    // Get max component_id
    $stmt = $conn->query("SELECT IFNULL(MAX(component_id), 0) as max_id FROM tbl_package_components WHERE component_id > 0");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $maxId = $result['max_id'];
    echo "Current max component_id: {$maxId}\n";

    // Backup components with component_id = 0
    echo "Backing up components...\n";
    $stmt = $conn->query("
        SELECT
            package_id,
            component_name,
            component_description,
            component_price,
            display_order,
            supplier_id,
            offer_id
        FROM tbl_package_components
        WHERE component_id = 0
        ORDER BY package_id, display_order
    ");
    $componentsToFix = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Backed up {count($componentsToFix)} components\n\n";

    // Delete components with component_id = 0
    echo "Deleting components with component_id = 0...\n";
    $stmt = $conn->exec("DELETE FROM tbl_package_components WHERE component_id = 0");
    echo "Deleted {$stmt} rows\n\n";

    // Re-insert components (AUTO_INCREMENT will assign proper IDs)
    echo "Re-inserting components with proper IDs...\n";
    $insertStmt = $conn->prepare("
        INSERT INTO tbl_package_components (
            package_id,
            component_name,
            component_description,
            component_price,
            display_order,
            supplier_id,
            offer_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ");

    $insertedCount = 0;
    foreach ($componentsToFix as $component) {
        $insertStmt->execute([
            $component['package_id'],
            $component['component_name'],
            $component['component_description'],
            $component['component_price'],
            $component['display_order'],
            $component['supplier_id'],
            $component['offer_id']
        ]);
        $insertedCount++;
        echo ".";
    }
    echo "\n";
    echo "Re-inserted {$insertedCount} components\n\n";

    // Verify the fix
    echo "--- VERIFICATION ---\n";
    $stmt = $conn->query("SELECT COUNT(*) as count FROM tbl_package_components WHERE component_id = 0");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $countAfter = $result['count'];
    echo "Rows with component_id = 0 after fix: {$countAfter}\n";

    if ($countAfter > 0) {
        throw new Exception("Fix failed! Still have {$countAfter} rows with component_id = 0");
    }

    // Show components by package
    echo "\n--- COMPONENTS BY PACKAGE ---\n";
    $stmt = $conn->query("
        SELECT
            pc.package_id,
            p.package_name,
            COUNT(*) as component_count,
            MIN(pc.component_id) as min_id,
            MAX(pc.component_id) as max_id
        FROM tbl_package_components pc
        LEFT JOIN tbl_packages p ON pc.package_id = p.package_id
        GROUP BY pc.package_id, p.package_name
        ORDER BY pc.package_id
    ");

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        printf(
            "Package %d (%s): %d components (IDs: %d-%d)\n",
            $row['package_id'],
            $row['package_name'] ?? 'Unknown',
            $row['component_count'],
            $row['min_id'],
            $row['max_id']
        );
    }

    // Reset AUTO_INCREMENT
    echo "\n--- RESETTING AUTO_INCREMENT ---\n";
    $stmt = $conn->query("SELECT IFNULL(MAX(component_id), 0) + 1 as next_id FROM tbl_package_components");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $nextId = $result['next_id'];

    $conn->exec("ALTER TABLE tbl_package_components AUTO_INCREMENT = {$nextId}");
    echo "Next AUTO_INCREMENT value set to: {$nextId}\n";

    // Commit transaction
    $conn->commit();

    echo "\n================================================\n";
    echo "✓ Migration completed successfully!\n";
    echo "================================================\n";
    echo "Fixed {$countBefore} components\n";
    echo "All components now have proper unique IDs\n";

} catch (Exception $e) {
    // Rollback on error
    if ($conn && $conn->inTransaction()) {
        $conn->rollBack();
    }

    echo "\n================================================\n";
    echo "✗ ERROR OCCURRED\n";
    echo "================================================\n";
    echo "Error: " . $e->getMessage() . "\n";
    echo "\nTransaction rolled back. No changes were made.\n";
    exit(1);
}
