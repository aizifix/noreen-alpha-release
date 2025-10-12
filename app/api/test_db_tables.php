<?php
// Test script to check if required database tables exist
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    // Include the database connection
    require_once __DIR__ . '/db_connect.php';

    echo "Testing database connection and tables...\n";

    // Test basic connection
    $stmt = $pdo->query("SELECT 1 as test");
    $result = $stmt->fetch();
    echo "Database connection: " . ($result ? "OK" : "FAILED") . "\n";

    // Check if required tables exist
    $tables = [
        'tbl_packages',
        'tbl_package_components',
        'tbl_package_freebies',
        'tbl_package_venues',
        'tbl_package_event_types',
        'tbl_users',
        'tbl_venue',
        'tbl_event_type'
    ];

    foreach ($tables as $table) {
        try {
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM $table LIMIT 1");
            $result = $stmt->fetch();
            echo "Table $table: EXISTS (count: " . $result['count'] . ")\n";
        } catch (Exception $e) {
            echo "Table $table: MISSING - " . $e->getMessage() . "\n";
        }
    }

    // Test if package 42 exists
    try {
        $stmt = $pdo->prepare("SELECT package_id, package_title FROM tbl_packages WHERE package_id = ?");
        $stmt->execute([42]);
        $package = $stmt->fetch();
        if ($package) {
            echo "Package 42: EXISTS - " . $package['package_title'] . "\n";
        } else {
            echo "Package 42: NOT FOUND\n";
        }
    } catch (Exception $e) {
        echo "Package 42 test: ERROR - " . $e->getMessage() . "\n";
    }

} catch (Exception $e) {
    echo "Database test failed: " . $e->getMessage() . "\n";
}
?>
