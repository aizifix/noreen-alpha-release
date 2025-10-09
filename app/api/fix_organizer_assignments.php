<?php
// Script to sync organizer assignments from assignment table to main events table
require_once "db_connect.php";

try {
    // Connect to database
    $conn = get_db_connection();

    echo "Starting organizer assignment fix script...\n";

    // Begin a transaction
    $conn->beginTransaction();

    // Get all assignments from the organizer_event_assignments table
    $query = "SELECT event_id, organizer_id FROM tbl_organizer_event_assignments
              WHERE assignment_status = 'assigned' OR assignment_status = 'accepted'
              ORDER BY event_id";

    $stmt = $conn->prepare($query);
    $stmt->execute();
    $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Found " . count($assignments) . " organizer assignments to process.\n";

    $updated = 0;
    $errors = 0;

    foreach ($assignments as $assignment) {
        $eventId = $assignment['event_id'];
        $organizerId = $assignment['organizer_id'];

        // Only update if event exists and organizer_id is different or NULL
        $checkQuery = "SELECT event_id, organizer_id FROM tbl_events WHERE event_id = ?";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->execute([$eventId]);
        $event = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$event) {
            echo "Warning: Event ID $eventId not found in events table.\n";
            continue;
        }

        if ($event['organizer_id'] != $organizerId) {
            try {
                $updateQuery = "UPDATE tbl_events SET organizer_id = ? WHERE event_id = ?";
                $updateStmt = $conn->prepare($updateQuery);
                $updateStmt->execute([$organizerId, $eventId]);

                echo "Updated event ID $eventId with organizer ID $organizerId\n";
                $updated++;
            } catch (Exception $e) {
                echo "Error updating event ID $eventId: " . $e->getMessage() . "\n";
                $errors++;
            }
        } else {
            echo "Event ID $eventId already has correct organizer ID $organizerId\n";
        }
    }

    // Commit the transaction
    $conn->commit();

    echo "Summary: $updated events updated, $errors errors encountered.\n";
    echo "Fix script completed successfully.\n";

} catch (Exception $e) {
    // Roll back if an error occurred
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }
    echo "Fatal Error: " . $e->getMessage() . "\n";
}
