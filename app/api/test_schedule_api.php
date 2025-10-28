<?php
// Quick test script to verify the schedule API
require_once 'db_connect.php';

echo "<h1>Schedule API Test</h1>";

// Test 1: Check if we can access schedule.php directly
echo "<h2>Test 1: Direct schedule.php access</h2>";

// Simulate a POST request
$_POST['subaction'] = 'get';
$_POST['event_id'] = 1; // Use a test event ID

echo "<p>Testing with event_id: 1</p>";

// Capture output
ob_start();
include 'schedule.php';
$output = ob_get_clean();

echo "<p>Response: " . htmlspecialchars($output) . "</p>";

// Test 2: Check admin.php integration
echo "<h2>Test 2: Admin.php integration</h2>";

// Simulate admin.php request
$_POST['operation'] = 'schedules';
$_POST['subaction'] = 'get';
$_POST['event_id'] = 1;

echo "<p>Testing admin.php with schedules operation</p>";

// We need to simulate the admin.php environment
$operation = 'schedules';
$data = $_POST;

// Capture output
ob_start();
// Include the schedules case from admin.php
error_log("Test - Schedules case hit");
error_log("Test - POST data: " . json_encode($_POST));
include_once 'schedule.php';
$adminOutput = ob_get_clean();

echo "<p>Admin.php Response: " . htmlspecialchars($adminOutput) . "</p>";

// Test 3: Check database table
echo "<h2>Test 3: Database table check</h2>";
try {
    $checkQuery = "SELECT COUNT(*) as count FROM tbl_event_schedule";
    $result = $pdo->query($checkQuery);
    $count = $result->fetch(PDO::FETCH_ASSOC)['count'];
    echo "<p>Schedule items in database: $count</p>";
} catch (Exception $e) {
    echo "<p style='color: red;'>Error: " . $e->getMessage() . "</p>";
}

echo "<h2>Summary</h2>";
echo "<p>If you see JSON responses above, the API is working correctly.</p>";
echo "<p>Check the browser console and server logs for more debugging information.</p>";
?>
