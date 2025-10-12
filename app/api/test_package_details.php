<?php
// Simple test script for package details API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Include the database connection
    require_once __DIR__ . '/db_connect.php';

    // Include the admin class
    require_once __DIR__ . '/admin.php';

    // Get package ID from URL parameter
    $packageId = $_GET['package_id'] ?? 42; // Default to 42 for testing

    echo "Testing package details for ID: " . $packageId . "\n";

    // Create admin instance
    $admin = new Admin($pdo);

    // Test the getPackageDetails function
    $result = $admin->getPackageDetails($packageId);

    echo "Result: " . $result . "\n";

} catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => "Test failed: " . $e->getMessage(),
        "trace" => $e->getTraceAsString()
    ]);
}
?>
