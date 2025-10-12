<?php
require_once 'app/api/db_connect.php';

try {
    echo "=== DUPLICATE BOOKING CLEANUP TOOL ===\n\n";

    // Step 1: Find all duplicates
    echo "Step 1: Finding duplicate bookings...\n";
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

    if (empty($duplicates)) {
        echo "✅ No duplicate bookings found!\n";
        exit;
    }

    echo "Found " . count($duplicates) . " duplicate booking groups:\n\n";

    $totalToCancel = 0;
    $allBookingIds = [];

    foreach ($duplicates as $dup) {
        echo "📋 User ID: {$dup['user_id']}, Event: {$dup['event_name']}, Date: {$dup['event_date']}\n";
        echo "   Duplicates: {$dup['duplicate_count']}, IDs: {$dup['booking_ids']}\n";
        echo "   References: {$dup['booking_references']}\n";
        echo "   Statuses: {$dup['booking_statuses']}\n";
        echo "   First: {$dup['first_created']}, Last: {$dup['last_created']}\n\n";

        // Parse booking IDs (keep first, cancel rest)
        $bookingIds = explode(',', $dup['booking_ids']);
        $keepId = $bookingIds[0]; // Keep the first (oldest) booking
        $cancelIds = array_slice($bookingIds, 1); // Cancel the rest

        echo "   ✅ Will KEEP booking ID: {$keepId} (first created)\n";
        echo "   ❌ Will CANCEL booking IDs: " . implode(', ', $cancelIds) . "\n\n";

        $totalToCancel += count($cancelIds);
        $allBookingIds = array_merge($allBookingIds, $cancelIds);
    }

    echo "Step 2: Summary\n";
    echo "==============\n";
    echo "Total duplicate groups: " . count($duplicates) . "\n";
    echo "Total bookings to cancel: {$totalToCancel}\n";
    echo "Total bookings to keep: " . count($duplicates) . "\n\n";

    // Step 3: Confirm and execute cleanup
    echo "Step 3: Executing cleanup...\n";
    echo "============================\n";

    if (empty($allBookingIds)) {
        echo "✅ No bookings to cancel.\n";
        exit;
    }

    $pdo->beginTransaction();

    try {
        // Cancel duplicate bookings
        $placeholders = str_repeat('?,', count($allBookingIds) - 1) . '?';
        $cancelSql = "UPDATE tbl_bookings
                     SET booking_status = 'cancelled',
                         updated_at = NOW(),
                         notes = CONCAT(COALESCE(notes, ''), '\n[CANCELLED: Duplicate booking cleanup on ', NOW(), ']')
                     WHERE booking_id IN ($placeholders)";

        $cancelStmt = $pdo->prepare($cancelSql);
        $cancelStmt->execute($allBookingIds);
        $cancelledCount = $cancelStmt->rowCount();

        $pdo->commit();

        echo "✅ Successfully cancelled {$cancelledCount} duplicate bookings!\n";
        echo "✅ Kept " . count($duplicates) . " original bookings.\n";
        echo "✅ Cleanup completed successfully!\n\n";

        // Step 4: Verify cleanup
        echo "Step 4: Verification\n";
        echo "===================\n";

        $verifyStmt = $pdo->prepare($sql);
        $verifyStmt->execute();
        $remainingDuplicates = $verifyStmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($remainingDuplicates)) {
            echo "✅ Verification passed! No duplicate bookings remain.\n";
        } else {
            echo "⚠️  Warning: " . count($remainingDuplicates) . " duplicate groups still exist.\n";
        }

    } catch (Exception $e) {
        $pdo->rollback();
        echo "❌ Error during cleanup: " . $e->getMessage() . "\n";
        echo "❌ All changes have been rolled back.\n";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
