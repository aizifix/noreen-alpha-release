<?php
require_once 'db_connect.php';

if (!$pdo) {
    echo "Database connection failed\n";
    exit();
}

try {
    echo "=== Testing Organizer Events ===\n\n";

    // Check if the assignment table exists and has data
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_event_organizer_assignments");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Total event assignments: " . $result['count'] . "\n";

    if ($result['count'] > 0) {
        echo "\n=== Recent Assignments ===\n";
        $stmt = $pdo->query("
            SELECT
                eoa.assignment_id,
                eoa.event_id,
                eoa.organizer_id,
                eoa.status,
                eoa.assigned_at,
                e.event_title,
                e.event_date,
                CONCAT(u.user_firstName, ' ', u.user_lastName) as organizer_name
            FROM tbl_event_organizer_assignments eoa
            JOIN tbl_events e ON eoa.event_id = e.event_id
            JOIN tbl_organizer o ON eoa.organizer_id = o.organizer_id
            JOIN tbl_users u ON o.user_id = u.user_id
            ORDER BY eoa.assigned_at DESC
            LIMIT 5
        ");
        $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($assignments as $assignment) {
            echo "Assignment ID: " . $assignment['assignment_id'] . "\n";
            echo "Event: " . $assignment['event_title'] . " (ID: " . $assignment['event_id'] . ")\n";
            echo "Date: " . $assignment['event_date'] . "\n";
            echo "Organizer: " . $assignment['organizer_name'] . " (ID: " . $assignment['organizer_id'] . ")\n";
            echo "Status: " . $assignment['status'] . "\n";
            echo "Assigned: " . $assignment['assigned_at'] . "\n";
            echo "---\n";
        }
    }

    // Test the GetOrganizerEvents procedure for organizer ID 7
    echo "\n=== Testing GetOrganizerEvents for organizer ID 7 ===\n";
    $stmt = $pdo->prepare("CALL GetOrganizerEvents(?)");
    $stmt->execute([7]);
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Found " . count($events) . " events for organizer ID 7\n";
    if (count($events) > 0) {
        foreach ($events as $event) {
            echo "Event: " . $event['event_title'] . " (ID: " . $event['event_id'] . ")\n";
            echo "Date: " . $event['event_date'] . "\n";
            echo "Client: " . $event['client_name'] . "\n";
            echo "Status: " . $event['assignment_status'] . "\n";
            echo "---\n";
        }
    }

    // Check for events on October 30, 2025
    echo "\n=== Checking for events on October 30, 2025 ===\n";
    $stmt = $pdo->query("
        SELECT
            e.event_id,
            e.event_title,
            e.event_date,
            e.organizer_id,
            eoa.assignment_id,
            eoa.status as assignment_status,
            CONCAT(u.user_firstName, ' ', u.user_lastName) as organizer_name
        FROM tbl_events e
        LEFT JOIN tbl_event_organizer_assignments eoa ON e.event_id = eoa.event_id
        LEFT JOIN tbl_organizer o ON eoa.organizer_id = o.organizer_id
        LEFT JOIN tbl_users u ON o.user_id = u.user_id
        WHERE e.event_date = '2025-10-30'
    ");
    $octoberEvents = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Found " . count($octoberEvents) . " events on October 30, 2025\n";
    if (count($octoberEvents) > 0) {
        foreach ($octoberEvents as $event) {
            echo "Event: " . $event['event_title'] . " (ID: " . $event['event_id'] . ")\n";
            echo "Organizer ID (from events): " . $event['organizer_id'] . "\n";
            echo "Assignment ID: " . $event['assignment_id'] . "\n";
            echo "Assignment Status: " . $event['assignment_status'] . "\n";
            echo "Organizer Name: " . $event['organizer_name'] . "\n";
            echo "---\n";
        }
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
