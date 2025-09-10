<?php
require_once 'db_connect.php';

if (!$pdo) {
    echo "Database connection failed\n";
    exit();
}

try {
    // Drop the existing procedure
    $pdo->exec("DROP PROCEDURE IF EXISTS GetOrganizerEvents");
    echo "Dropped existing GetOrganizerEvents procedure\n";

    // Create the updated procedure
    $sql = "
    CREATE PROCEDURE `GetOrganizerEvents`(IN p_organizer_id INT)
    BEGIN
        SELECT
            e.event_id,
            e.event_title,
            e.event_date,
            e.start_time,
            e.end_time,
            e.event_status,
            e.payment_status,
            e.guest_count,
            e.total_budget,
            e.down_payment,
            et.event_type_name,
            v.venue_title,
            v.venue_location,
            CONCAT(c.user_firstName, ' ', c.user_lastName) as client_name,
            c.user_email as client_email,
            c.user_contact as client_contact,
            c.user_pfp as client_pfp,
            eoa.assigned_at,
            eoa.status as assignment_status
        FROM tbl_event_organizer_assignments eoa
        JOIN tbl_events e ON eoa.event_id = e.event_id
        LEFT JOIN tbl_users c ON e.user_id = c.user_id
        LEFT JOIN tbl_event_type et ON e.event_type_id = et.event_type_id
        LEFT JOIN tbl_venue v ON e.venue_id = v.venue_id
        WHERE eoa.organizer_id = p_organizer_id
        AND eoa.status IN ('assigned', 'accepted')
        ORDER BY e.event_date ASC, e.start_time ASC;
    END";

    $pdo->exec($sql);
    echo "Successfully updated GetOrganizerEvents procedure\n";

    // Test the procedure
    $stmt = $pdo->prepare("CALL GetOrganizerEvents(?)");
    $stmt->execute([7]); // Test with organizer ID 7
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Test query returned " . count($results) . " events\n";
    if (count($results) > 0) {
        echo "Sample event data:\n";
        print_r($results[0]);
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
