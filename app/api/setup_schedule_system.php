<?php
// Create table and test the schedule API
require_once 'db_connect.php';

echo "<h1>Schedule System Setup & Test</h1>";

// Step 1: Create the table
echo "<h2>Step 1: Creating tbl_event_schedule table</h2>";
try {
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS `tbl_event_schedule` (
      `schedule_id` INT AUTO_INCREMENT PRIMARY KEY,
      `event_id` INT NOT NULL,
      `inclusion_name` VARCHAR(255) NULL,
      `component_name` VARCHAR(255) NOT NULL,
      `is_custom` TINYINT(1) DEFAULT 0 COMMENT '0 = parsed from inclusion_description, 1 = manually added free-text',
      `scheduled_date` DATE NOT NULL,
      `scheduled_time` TIME NOT NULL,
      `status` ENUM('Pending','Done','Delivered','Cancelled') DEFAULT 'Pending',
      `assigned_organizer_id` INT NULL,
      `remarks` TEXT NULL,
      `created_by` INT NULL,
      `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
      `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (`event_id`) REFERENCES `tbl_events`(`event_id`) ON DELETE CASCADE,
      INDEX `idx_event_id` (`event_id`),
      INDEX `idx_scheduled_date` (`scheduled_date`),
      INDEX `idx_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Event schedule components with timing and status tracking'
    ";

    $pdo->exec($createTableSQL);
    echo "<p style='color: green;'>✅ Table created successfully</p>";
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Error creating table: " . $e->getMessage() . "</p>";
}

// Step 2: Test the API
echo "<h2>Step 2: Testing Schedule API</h2>";

// Get a sample event_id
try {
    $eventQuery = "SELECT event_id FROM tbl_events LIMIT 1";
    $eventResult = $pdo->query($eventQuery);
    $event = $eventResult->fetch(PDO::FETCH_ASSOC);

    if ($event) {
        $eventId = $event['event_id'];
        echo "<p>Testing with event_id: $eventId</p>";

        // Test the get operation
        $_POST['subaction'] = 'get';
        $_POST['event_id'] = $eventId;

        ob_start();
        include 'schedule.php';
        $output = ob_get_clean();

        echo "<p>API Response:</p>";
        echo "<pre>" . htmlspecialchars($output) . "</pre>";

        $response = json_decode($output, true);
        if ($response && isset($response['status'])) {
            echo "<p style='color: green;'>✅ API is working correctly</p>";
        } else {
            echo "<p style='color: red;'>❌ API returned invalid response</p>";
        }
    } else {
        echo "<p style='color: orange;'>⚠️ No events found in database</p>";
    }
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Error testing API: " . $e->getMessage() . "</p>";
}

echo "<h2>Next Steps</h2>";
echo "<ul>";
echo "<li>1. If the table was created successfully, the schedule system should work</li>";
echo "<li>2. Check the browser console for any JavaScript errors</li>";
echo "<li>3. Verify that the event object is being passed correctly to the component</li>";
echo "<li>4. Check server logs for any PHP errors</li>";
echo "</ul>";
?>
