<?php
require_once 'app/api/db_connect.php';

try {
    $sql = "SELECT
                user_id,
                event_name,
                event_date,
                COUNT(*) as duplicate_count,
                GROUP_CONCAT(booking_id ORDER BY created_at ASC) as booking_ids,
                GROUP_CONCAT(booking_reference ORDER BY created_at ASC) as booking_references,
                GROUP_CONCAT(booking_status ORDER BY created_at ASC) as booking_statuses,
                MIN(created_at) as first_created,
                MAX(created_at) as last_created
            FROM tbl_bookings
            WHERE booking_status NOT IN ('cancelled', 'completed')
            GROUP BY user_id, event_name, event_date
            HAVING COUNT(*) > 1
            ORDER BY duplicate_count DESC, last_created DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Found " . count($duplicates) . " duplicate booking groups:\n\n";
    foreach ($duplicates as $dup) {
        echo "User ID: {$dup['user_id']}, Event: {$dup['event_name']}, Date: {$dup['event_date']}\n";
        echo "Duplicates: {$dup['duplicate_count']}, IDs: {$dup['booking_ids']}\n";
        echo "References: {$dup['booking_references']}\n";
        echo "Statuses: {$dup['booking_statuses']}\n";
        echo "First: {$dup['first_created']}, Last: {$dup['last_created']}\n\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
