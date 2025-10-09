<?php
// Debug script to check admin assignment status
require_once "db_connect.php";

try {
    // Connect to database
    $pdo = get_db_connection();

    echo "=== Admin Assignment Debug Script ===\n\n";

    // Get event ID from command line argument
    $eventId = $argv[1] ?? null;

    if (!$eventId) {
        echo "Usage: php debug_admin_assignment.php <event_id>\n";
        echo "Example: php debug_admin_assignment.php 123\n";
        exit(1);
    }

    echo "Checking Event ID: $eventId\n\n";

    // Check the main events table
    echo "1. Main Events Table (tbl_events):\n";
    $stmt = $pdo->prepare("SELECT event_id, organizer_id, admin_id, event_title FROM tbl_events WHERE event_id = ?");
    $stmt->execute([$eventId]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($event) {
        echo "   Event ID: " . $event['event_id'] . "\n";
        echo "   Event Title: " . $event['event_title'] . "\n";
        echo "   Organizer ID: " . ($event['organizer_id'] ?? 'NULL') . "\n";
        echo "   Admin ID: " . ($event['admin_id'] ?? 'NULL') . "\n";

        if ($event['organizer_id'] === null) {
            echo "   ✅ Event is assigned to admin (organizer_id is NULL)\n";
        } else {
            echo "   ❌ Event is assigned to organizer ID: " . $event['organizer_id'] . "\n";
        }
    } else {
        echo "   ❌ Event not found!\n";
        exit(1);
    }

    echo "\n2. Organizer Assignments Table (tbl_event_organizer_assignments):\n";
    $stmt = $pdo->prepare("SELECT * FROM tbl_event_organizer_assignments WHERE event_id = ?");
    $stmt->execute([$eventId]);
    $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($assignments)) {
        echo "   ✅ No assignment records found (correct for admin assignment)\n";
    } else {
        echo "   ❌ Found " . count($assignments) . " assignment record(s):\n";
        foreach ($assignments as $assignment) {
            echo "      Assignment ID: " . $assignment['assignment_id'] . "\n";
            echo "      Organizer ID: " . $assignment['organizer_id'] . "\n";
            echo "      Status: " . $assignment['status'] . "\n";
            echo "      Assigned By: " . $assignment['assigned_by'] . "\n";
            echo "      Assigned At: " . $assignment['assigned_at'] . "\n";
            echo "      ---\n";
        }
    }

    echo "\n3. Test getEventById API Response:\n";

    // Simulate the getEventById query
    $sql = "
        SELECT
            e.*,
            CONCAT(c.user_firstName COLLATE utf8mb4_general_ci, ' ', c.user_lastName COLLATE utf8mb4_general_ci) as client_name,
            CONCAT(a.user_firstName COLLATE utf8mb4_general_ci, ' ', a.user_lastName COLLATE utf8mb4_general_ci) as admin_name,
            eoa.organizer_id,
            eoa.assignment_id AS organizer_assignment_id,
            eoa.status AS assignment_status,
            eoa.notes AS organizer_notes,
            eoa.assigned_at,
            CONCAT(org.user_firstName COLLATE utf8mb4_general_ci, ' ', org.user_lastName COLLATE utf8mb4_general_ci) as organizer_name,
            org.user_email as organizer_email,
            org.user_contact as organizer_contact
        FROM tbl_events e
        LEFT JOIN tbl_users c ON e.user_id = c.user_id
        LEFT JOIN tbl_users a ON e.admin_id = a.user_id
        LEFT JOIN tbl_event_organizer_assignments eoa ON e.event_id = eoa.event_id AND eoa.status IN ('assigned','accepted')
        LEFT JOIN tbl_organizer o ON eoa.organizer_id = o.organizer_id
        LEFT JOIN tbl_users org ON o.user_id = org.user_id
        WHERE e.event_id = ?
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$eventId]);
    $apiEvent = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($apiEvent) {
        echo "   Event ID: " . $apiEvent['event_id'] . "\n";
        echo "   Organizer ID: " . ($apiEvent['organizer_id'] ?? 'NULL') . "\n";
        echo "   Organizer Name: " . ($apiEvent['organizer_name'] ?? 'NULL') . "\n";
        echo "   Assignment Status: " . ($apiEvent['assignment_status'] ?? 'NULL') . "\n";
        echo "   Admin Name: " . ($apiEvent['admin_name'] ?? 'NULL') . "\n";

        if ($apiEvent['organizer_id'] === null) {
            echo "   ✅ API correctly shows admin assignment\n";
        } else {
            echo "   ❌ API still shows organizer assignment\n";
        }
    }

    echo "\n4. Recommendations:\n";

    if ($event['organizer_id'] === null && empty($assignments)) {
        echo "   ✅ Database is correctly set up for admin assignment\n";
        echo "   ✅ No action needed - the issue might be in the frontend\n";
    } elseif ($event['organizer_id'] !== null) {
        echo "   ❌ Main events table still has organizer_id set\n";
        echo "   💡 Run: UPDATE tbl_events SET organizer_id = NULL WHERE event_id = $eventId;\n";
    } elseif (!empty($assignments)) {
        echo "   ❌ Assignment records still exist\n";
        echo "   💡 Run: DELETE FROM tbl_event_organizer_assignments WHERE event_id = $eventId;\n";
    }

    echo "\n=== Debug Complete ===\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>
