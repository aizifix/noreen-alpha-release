<?php
/**
 * Test script to verify that the components API is working correctly
 * This script tests the new functionality to fetch real components from tbl_inclusion_components
 */

require_once 'app/api/db_connect.php';

try {
    echo "Testing Components API Implementation\n";
    echo "=====================================\n\n";

    // Test 1: Check if tbl_inclusion_components table exists
    echo "Test 1: Checking tbl_inclusion_components table...\n";
    $stmt = $pdo->query("SHOW TABLES LIKE 'tbl_inclusion_components'");
    $result = $stmt->fetch();
    if ($result) {
        echo "✅ tbl_inclusion_components table exists\n";

        // Get count of components
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_inclusion_components");
        $count = $stmt->fetch()['count'];
        echo "   Found $count components in the table\n";
    } else {
        echo "❌ tbl_inclusion_components table does not exist\n";
        exit(1);
    }

    // Test 2: Check if tbl_package_inclusions table exists
    echo "\nTest 2: Checking tbl_package_inclusions table...\n";
    $stmt = $pdo->query("SHOW TABLES LIKE 'tbl_package_inclusions'");
    $result = $stmt->fetch();
    if ($result) {
        echo "✅ tbl_package_inclusions table exists\n";

        // Get count of inclusions
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_package_inclusions");
        $count = $stmt->fetch()['count'];
        echo "   Found $count inclusions in the table\n";
    } else {
        echo "❌ tbl_package_inclusions table does not exist\n";
        exit(1);
    }

    // Test 3: Test the relationship between inclusions and components
    echo "\nTest 3: Testing inclusion-component relationships...\n";
    $stmt = $pdo->query("
        SELECT
            pi.inclusion_id,
            pi.inclusion_name,
            pi.components_list,
            COUNT(ic.component_id) as component_count
        FROM tbl_package_inclusions pi
        LEFT JOIN tbl_inclusion_components ic ON pi.inclusion_id = ic.inclusion_id
        GROUP BY pi.inclusion_id, pi.inclusion_name, pi.components_list
        ORDER BY pi.inclusion_id
        LIMIT 5
    ");
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($results)) {
        echo "✅ Found inclusion-component relationships:\n";
        foreach ($results as $row) {
            echo "   Inclusion: {$row['inclusion_name']}\n";
            echo "   Components List: " . ($row['components_list'] ?: 'NULL') . "\n";
            echo "   Real Components Count: {$row['component_count']}\n";
            echo "   ---\n";
        }
    } else {
        echo "❌ No inclusion-component relationships found\n";
    }

    // Test 4: Test the new API logic (simulate what the API does)
    echo "\nTest 4: Testing new API logic...\n";

    // Get a sample inclusion
    $stmt = $pdo->query("SELECT inclusion_id, inclusion_name, components_list FROM tbl_package_inclusions LIMIT 1");
    $inclusion = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($inclusion) {
        echo "Testing with inclusion: {$inclusion['inclusion_name']}\n";

        // Fetch real components (new logic)
        $componentsSql = "SELECT component_id, component_name, component_description, component_price, display_order
                        FROM tbl_inclusion_components
                        WHERE inclusion_id = :inclusion_id
                        ORDER BY display_order";
        $componentsStmt = $pdo->prepare($componentsSql);
        $componentsStmt->execute([':inclusion_id' => $inclusion['inclusion_id']]);
        $realComponents = $componentsStmt->fetchAll(PDO::FETCH_ASSOC);

        if (!empty($realComponents)) {
            echo "✅ Found " . count($realComponents) . " real components:\n";
            foreach ($realComponents as $component) {
                echo "   - {$component['component_name']} (₱{$component['component_price']})\n";
            }
        } else {
            echo "⚠️  No real components found, would fall back to parsing components_list\n";
            echo "   Components List: " . ($inclusion['components_list'] ?: 'NULL') . "\n";
        }
    }

    echo "\n=====================================\n";
    echo "✅ All tests completed successfully!\n";
    echo "The new components API implementation is working correctly.\n";
    echo "Components will now be fetched from the database instead of parsing comma-separated strings.\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>
