<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Include database connection
require_once 'app/api/db_connect.php';
require_once 'app/api/admin.php';

// Test database connection
echo "<h1>Wedding Form Debug Test</h1>";

try {
    // Check if table exists
    $checkTable = $pdo->query("SHOW TABLES LIKE 'tbl_wedding_details'");
    if ($checkTable->rowCount() > 0) {
        echo "✅ Table 'tbl_wedding_details' exists<br>";

        // Check table structure
        $structure = $pdo->query("DESCRIBE tbl_wedding_details");
        echo "<h3>Table Structure:</h3>";
        echo "<table border='1'>";
        echo "<tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th></tr>";
        while ($row = $structure->fetch(PDO::FETCH_ASSOC)) {
            echo "<tr>";
            echo "<td>{$row['Field']}</td>";
            echo "<td>{$row['Type']}</td>";
            echo "<td>{$row['Null']}</td>";
            echo "<td>{$row['Key']}</td>";
            echo "<td>{$row['Default']}</td>";
            echo "</tr>";
        }
        echo "</table><br>";

    } else {
        echo "❌ Table 'tbl_wedding_details' does NOT exist<br>";
        echo "You need to run the migration or import the SQL file<br>";
    }

    // Test Admin class
    $admin = new Admin($pdo);
    echo "✅ Admin class initialized successfully<br>";

    // Test saveWeddingDetails with sample data
    $testData = [
        'event_id' => 999, // Use a test event ID
        'nuptial' => 'Test Nuptial',
        'motif' => 'Test Motif',
        'bride_name' => 'Test Bride',
        'bride_gown_size' => 'Medium',
        'groom_name' => 'Test Groom',
        'groom_attire_size' => 'Large',
        'mothers_attire_name' => 'Test Mother',
        'mothers_attire_size' => 'Small',
        'fathers_attire_name' => 'Test Father',
        'fathers_attire_size' => 'Large',
        'cushions_quantity' => 2,
        'headdress_for_bride_quantity' => 1,
        'bridesmaids' => [
            ['name' => 'Bridesmaid 1', 'size' => 'S'],
            ['name' => 'Bridesmaid 2', 'size' => 'M']
        ],
        'groomsmen' => [
            ['name' => 'Groomsman 1', 'size' => 'L']
        ],
        'prepared_by' => 'Test Admin',
        'pick_up_date' => '2025-07-01'
    ];

    echo "<h3>Testing saveWeddingDetails:</h3>";
    $result = $admin->saveWeddingDetails($testData);
    $response = json_decode($result, true);

    if ($response['status'] === 'success') {
        echo "✅ Wedding details saved successfully!<br>";
        if (isset($response['debug'])) {
            echo "<h4>Debug Info:</h4>";
            echo "<pre>" . print_r($response['debug'], true) . "</pre>";
        }

        // Try to retrieve the saved data
        echo "<h3>Testing getWeddingDetails:</h3>";
        $getResult = $admin->getWeddingDetails(999);
        $getResponse = json_decode($getResult, true);

        if ($getResponse['status'] === 'success') {
            echo "✅ Wedding details retrieved successfully!<br>";
            echo "<h4>Retrieved Data:</h4>";
            echo "<pre>" . print_r($getResponse['wedding_details'], true) . "</pre>";
        } else {
            echo "❌ Failed to retrieve wedding details: " . $getResponse['message'] . "<br>";
        }

        // Clean up test data
        $pdo->exec("DELETE FROM tbl_wedding_details WHERE event_id = 999");
        echo "<br>🧹 Test data cleaned up<br>";

    } else {
        echo "❌ Failed to save wedding details: " . $response['message'] . "<br>";
        if (isset($response['debug'])) {
            echo "<h4>Debug Info:</h4>";
            echo "<pre>" . print_r($response['debug'], true) . "</pre>";
        }
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "<br>";
    echo "Stack trace: <pre>" . $e->getTraceAsString() . "</pre>";
}

// Check for existing wedding details in the database
try {
    $existing = $pdo->query("SELECT COUNT(*) as count FROM tbl_wedding_details");
    $count = $existing->fetch(PDO::FETCH_ASSOC)['count'];
    echo "<h3>Existing Wedding Details:</h3>";
    echo "Total records in tbl_wedding_details: {$count}<br>";

    if ($count > 0) {
        $details = $pdo->query("SELECT event_id, bride_name, groom_name, created_at FROM tbl_wedding_details ORDER BY created_at DESC LIMIT 5");
        echo "<h4>Recent Records:</h4>";
        echo "<table border='1'>";
        echo "<tr><th>Event ID</th><th>Bride Name</th><th>Groom Name</th><th>Created At</th></tr>";
        while ($row = $details->fetch(PDO::FETCH_ASSOC)) {
            echo "<tr>";
            echo "<td>{$row['event_id']}</td>";
            echo "<td>{$row['bride_name']}</td>";
            echo "<td>{$row['groom_name']}</td>";
            echo "<td>{$row['created_at']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
} catch (Exception $e) {
    echo "❌ Error checking existing data: " . $e->getMessage() . "<br>";
}

?>
