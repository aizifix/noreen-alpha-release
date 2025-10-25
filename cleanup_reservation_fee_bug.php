<?php
/**
 * Cleanup script for reservation fee bug
 * This script identifies and fixes events that were incorrectly created with reservation fees
 */

require_once 'app/api/db_connect.php';

try {
    echo "Starting cleanup of reservation fee bug...\n";

    // Find events that have reservation fee payments but no legitimate booking reference
    $sql = "
        SELECT DISTINCT e.event_id, e.original_booking_reference, e.reserved_payment_total,
               COUNT(p.payment_id) as reserved_payment_count,
               SUM(p.payment_amount) as total_reserved_amount
        FROM tbl_events e
        LEFT JOIN tbl_payments p ON e.event_id = p.event_id
            AND p.payment_type = 'reserved'
            AND p.payment_status != 'cancelled'
        WHERE e.original_booking_reference IS NOT NULL
            AND e.original_booking_reference != ''
        GROUP BY e.event_id
        HAVING reserved_payment_count > 0
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $problematicEvents = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Found " . count($problematicEvents) . " potentially problematic events\n";

    foreach ($problematicEvents as $event) {
        echo "\nProcessing Event ID: " . $event['event_id'] . "\n";
        echo "Original Booking Reference: " . $event['original_booking_reference'] . "\n";
        echo "Reserved Payment Total: " . $event['reserved_payment_total'] . "\n";
        echo "Reserved Payment Count: " . $event['reserved_payment_count'] . "\n";
        echo "Total Reserved Amount: " . $event['total_reserved_amount'] . "\n";

        // Check if the booking reference actually exists and is valid
        $bookingCheckSql = "
            SELECT booking_id, booking_status, total_price
            FROM tbl_bookings
            WHERE booking_reference = ?
        ";
        $bookingStmt = $pdo->prepare($bookingCheckSql);
        $bookingStmt->execute([$event['original_booking_reference']]);
        $booking = $bookingStmt->fetch(PDO::FETCH_ASSOC);

        if (!$booking) {
            echo "❌ Booking reference does not exist - this is a bug!\n";

            // Clean up the event
            $pdo->beginTransaction();

            try {
                // Remove reservation fee payments
                $deletePaymentsSql = "
                    DELETE FROM tbl_payments
                    WHERE event_id = ?
                    AND payment_type = 'reserved'
                ";
                $deleteStmt = $pdo->prepare($deletePaymentsSql);
                $deleteStmt->execute([$event['event_id']]);
                echo "✅ Removed " . $deleteStmt->rowCount() . " reservation fee payments\n";

                // Update the event
                $updateEventSql = "
                    UPDATE tbl_events
                    SET original_booking_reference = NULL,
                        reserved_payment_total = 0
                    WHERE event_id = ?
                ";
                $updateStmt = $pdo->prepare($updateEventSql);
                $updateStmt->execute([$event['event_id']]);
                echo "✅ Updated event to remove booking reference and reserved payment total\n";

                $pdo->commit();
                echo "✅ Event ID " . $event['event_id'] . " has been cleaned up\n";

            } catch (Exception $e) {
                $pdo->rollBack();
                echo "❌ Failed to clean up event ID " . $event['event_id'] . ": " . $e->getMessage() . "\n";
            }

        } else {
            echo "✅ Booking reference exists and is valid - this is a legitimate booking event\n";
            echo "   Booking ID: " . $booking['booking_id'] . "\n";
            echo "   Booking Status: " . $booking['booking_status'] . "\n";
            echo "   Booking Total: " . $booking['total_price'] . "\n";
        }
    }

    echo "\nCleanup completed!\n";

} catch (Exception $e) {
    echo "❌ Error during cleanup: " . $e->getMessage() . "\n";
}
?>
