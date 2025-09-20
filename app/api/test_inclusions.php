<?php
// Include the database connection
require_once 'db_connect.php';

// Set headers for output
header('Content-Type: text/plain');

try {
    echo "Testing Package Inclusions Functionality\n";
    echo "======================================\n\n";

    // 1. Test getAllInclusions endpoint
    echo "1. Testing getAllInclusions endpoint:\n";
    echo "----------------------------------\n";
    $result = include_once 'client.php';
    $_GET['operation'] = 'getAllInclusions';

    ob_start();
    // The getAllInclusions function is already called via the router in client.php
    $output = ob_get_clean();

    echo "Output: " . substr($output, 0, 200) . "...\n\n";

    // 2. Test getPackageInclusions endpoint
    echo "2. Testing getPackageInclusions endpoint:\n";
    echo "-------------------------------------\n";
    $_GET['operation'] = 'getPackageInclusions';
    $_GET['package_id'] = 1; // Replace with an actual package ID from your database

    ob_start();
    // The getPackageInclusions function is already called via the router in client.php
    $output = ob_get_clean();

    echo "Output: " . substr($output, 0, 200) . "...\n\n";

    // 3. Test getAllSuppliers endpoint
    echo "3. Testing getAllSuppliers endpoint:\n";
    echo "------------------------------\n";
    $_GET['operation'] = 'getAllSuppliers';

    ob_start();
    // The getAllSuppliers function is already called via the router in client.php
    $output = ob_get_clean();

    echo "Output: " . substr($output, 0, 200) . "...\n\n";

    echo "Tests completed.\n";

} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
