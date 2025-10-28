<?php
// Test script for Event Scheduling System
// This script tests the database table creation and API functionality

require_once 'db_connect.php';

echo "<h1>Event Scheduling System Test</h1>";

// Test 1: Check if tbl_event_schedule table exists
echo "<h2>Test 1: Database Table Check</h2>";
try {
    $checkTableQuery = "SHOW TABLES LIKE 'tbl_event_schedule'";
    $result = $pdo->query($checkTableQuery);

    if ($result->rowCount() > 0) {
        echo "<p style='color: green;'>✅ tbl_event_schedule table exists</p>";

        // Show table structure
        $structureQuery = "DESCRIBE tbl_event_schedule";
        $structureResult = $pdo->query($structureQuery);
        echo "<h3>Table Structure:</h3>";
        echo "<table border='1' cellpadding='5'>";
        echo "<tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";
        while ($row = $structureResult->fetch(PDO::FETCH_ASSOC)) {
            echo "<tr>";
            echo "<td>" . $row['Field'] . "</td>";
            echo "<td>" . $row['Type'] . "</td>";
            echo "<td>" . $row['Null'] . "</td>";
            echo "<td>" . $row['Key'] . "</td>";
            echo "<td>" . $row['Default'] . "</td>";
            echo "<td>" . $row['Extra'] . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p style='color: red;'>❌ tbl_event_schedule table does not exist</p>";
        echo "<p>Please run the SQL script: create_schedule_table.sql</p>";
    }
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Error checking table: " . $e->getMessage() . "</p>";
}

// Test 2: Check if schedule.php exists and is accessible
echo "<h2>Test 2: Schedule API Check</h2>";
if (file_exists('schedule.php')) {
    echo "<p style='color: green;'>✅ schedule.php file exists</p>";
} else {
    echo "<p style='color: red;'>❌ schedule.php file does not exist</p>";
}

// Test 3: Check if admin.php includes schedule.php
echo "<h2>Test 3: Admin.php Integration Check</h2>";
$adminContent = file_get_contents('admin.php');
if (strpos($adminContent, 'case "schedules"') !== false) {
    echo "<p style='color: green;'>✅ Admin.php includes schedules case</p>";
} else {
    echo "<p style='color: red;'>❌ Admin.php does not include schedules case</p>";
}

// Test 4: Test API endpoints (if table exists)
if ($result->rowCount() > 0) {
    echo "<h2>Test 4: API Endpoint Tests</h2>";

    // Test get operation
    echo "<h3>Testing GET operation:</h3>";
    try {
        // Get a sample event_id
        $eventQuery = "SELECT event_id FROM tbl_events LIMIT 1";
        $eventResult = $pdo->query($eventQuery);
        $event = $eventResult->fetch(PDO::FETCH_ASSOC);

        if ($event) {
            $eventId = $event['event_id'];
            echo "<p>Testing with event_id: $eventId</p>";

            // Simulate GET request
            $_GET['subaction'] = 'get';
            $_GET['event_id'] = $eventId;

            // Capture output
            ob_start();
            include 'schedule.php';
            $output = ob_get_clean();

            $response = json_decode($output, true);
            if ($response && isset($response['status'])) {
                echo "<p style='color: green;'>✅ GET operation works</p>";
                echo "<p>Response: " . htmlspecialchars($output) . "</p>";
            } else {
                echo "<p style='color: red;'>❌ GET operation failed</p>";
                echo "<p>Response: " . htmlspecialchars($output) . "</p>";
            }
        } else {
            echo "<p style='color: orange;'>⚠️ No events found in database</p>";
        }
    } catch (Exception $e) {
        echo "<p style='color: red;'>❌ Error testing GET operation: " . $e->getMessage() . "</p>";
    }
}

// Test 5: Check frontend components
echo "<h2>Test 5: Frontend Components Check</h2>";
if (file_exists('../app/(authenticated)/admin/events/[id]/schedule-component.tsx')) {
    echo "<p style='color: green;'>✅ Schedule component file exists</p>";
} else {
    echo "<p style='color: red;'>❌ Schedule component file does not exist</p>";
}

echo "<h2>Test Summary</h2>";
echo "<p>If all tests pass, the Event Scheduling System is ready to use!</p>";
echo "<p><strong>Next Steps:</strong></p>";
echo "<ul>";
echo "<li>1. Run the SQL script to create the table (if not done already)</li>";
echo "<li>2. Test the schedule functionality in the admin panel</li>";
echo "<li>3. Verify date restrictions work correctly</li>";
echo "<li>4. Test the print functionality</li>";
echo "<li>5. Verify role-based permissions</li>";
echo "</ul>";
?>
