<?php
// Fix converted bookings to link them to their corresponding events
require_once 'db_connect.php';

try {
    // Update existing converted bookings to link them to their corresponding events
    $sql = "UPDATE tbl_bookings b
            INNER JOIN tbl_events e ON b.booking_reference = e.original_booking_reference
            SET b.converted_event_id = e.event_id
            WHERE b.booking_status = 'converted' AND b.converted_event_id IS NULL";

    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute();

    if ($result) {
        $affectedRows = $stmt->rowCount();
        echo "Successfully updated $affectedRows converted bookings with their event IDs.\n";
    } else {
        echo "No bookings were updated.\n";
    }

} catch (PDOException $e) {
    echo "Error updating converted bookings: " . $e->getMessage() . "\n";
}
?>