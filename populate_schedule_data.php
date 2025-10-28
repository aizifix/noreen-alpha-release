<?php
// Populate schedule table with sample data
require_once 'app/api/db_connect.php';

echo "<h1>Schedule Data Population</h1>";

try {
    // Get events that have packages assigned
    $eventsQuery = "SELECT event_id, event_title, event_date, package_id
                    FROM tbl_events
                    WHERE package_id IS NOT NULL
                    ORDER BY event_id DESC
                    LIMIT 5";
    $eventsStmt = $pdo->prepare($eventsQuery);
    $eventsStmt->execute();
    $events = $eventsStmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<h2>Found " . count($events) . " events with packages</h2>";

    $totalInserted = 0;

    foreach ($events as $event) {
        echo "<h3>Processing Event: " . $event['event_title'] . " (ID: " . $event['event_id'] . ")</h3>";

        // Sample schedule components for different event types
        $sampleComponents = [
            'Venue Setup',
            'Catering Arrival',
            'Sound System Setup',
            'Photography Setup',
            'Guest Arrival',
            'Ceremony Start',
            'Reception Start',
            'Cake Cutting',
            'First Dance',
            'Event Cleanup'
        ];

        $insertedCount = 0;
        $eventDate = $event['event_date'];

        // Create schedule items for this event
        foreach ($sampleComponents as $index => $component) {
            // Calculate scheduled date (event date minus some days for setup items)
            $scheduledDate = $eventDate;
            if ($index < 4) {
                // Setup items happen 1-3 days before
                $scheduledDate = date('Y-m-d', strtotime($eventDate . ' -' . (4 - $index) . ' days'));
            }

            // Calculate scheduled time
            $scheduledTime = '09:00:00';
            if ($index >= 4) {
                // Event day items have different times
                $times = ['10:00:00', '11:00:00', '12:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00', '18:00:00', '19:00:00', '20:00:00'];
                $scheduledTime = $times[$index - 4] ?? '12:00:00';
            }

            // Insert schedule item
            $insertQuery = "INSERT INTO tbl_event_schedule
                           (event_id, inclusion_name, component_name, scheduled_date, scheduled_time, status, is_custom, remarks)
                           VALUES (?, ?, ?, ?, ?, 'Pending', 1, ?)";

            $insertStmt = $pdo->prepare($insertQuery);
            $result = $insertStmt->execute([
                $event['event_id'],
                'Event Components',
                $component,
                $scheduledDate,
                $scheduledTime,
                'Sample schedule item for testing'
            ]);

            if ($result) {
                $insertedCount++;
                echo "<p>✅ Added: $component on $scheduledDate at $scheduledTime</p>";
            }
        }

        $totalInserted += $insertedCount;
        echo "<p><strong>Inserted $insertedCount schedule items for this event</strong></p>";
    }

    echo "<h2>Summary</h2>";
    echo "<p style='color: green; font-size: 18px;'>✅ Successfully inserted $totalInserted schedule items across " . count($events) . " events</p>";

    // Show current schedule data
    echo "<h2>Current Schedule Data</h2>";
    $scheduleQuery = "SELECT es.*, e.event_title
                      FROM tbl_event_schedule es
                      LEFT JOIN tbl_events e ON es.event_id = e.event_id
                      ORDER BY es.event_id, es.scheduled_date, es.scheduled_time";
    $scheduleStmt = $pdo->prepare($scheduleQuery);
    $scheduleStmt->execute();
    $schedules = $scheduleStmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<p>Total schedule items in database: " . count($schedules) . "</p>";

    if (count($schedules) > 0) {
        echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
        echo "<tr><th>Event</th><th>Component</th><th>Date</th><th>Time</th><th>Status</th></tr>";

        foreach ($schedules as $schedule) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($schedule['event_title']) . "</td>";
            echo "<td>" . htmlspecialchars($schedule['component_name']) . "</td>";
            echo "<td>" . $schedule['scheduled_date'] . "</td>";
            echo "<td>" . $schedule['scheduled_time'] . "</td>";
            echo "<td>" . $schedule['status'] . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    }

} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Error: " . $e->getMessage() . "</p>";
}

echo "<h2>Next Steps</h2>";
echo "<ul>";
echo "<li>✅ Schedule table now has sample data</li>";
echo "<li>✅ The schedule API should now return data instead of empty results</li>";
echo "<li>✅ You can test the schedule system in the admin panel</li>";
echo "<li>✅ Use the 'Add Schedule Item' button to add custom items</li>";
echo "<li>✅ Use the status toggle buttons to mark items as Done/Delivered</li>";
echo "</ul>";
?>
