<?php
// API-based duplicate cleanup script
// This uses the functions we added to client.php

// Include the client.php file to access our functions
require_once 'app/api/client.php';

echo "=== API-BASED DUPLICATE CLEANUP ===\n\n";

try {
    // Step 1: Get all duplicates using our API function
    echo "Step 1: Getting duplicate bookings...\n";
    $result = getDuplicateBookings();

    if ($result['status'] !== 'success') {
        echo "❌ Error getting duplicates: " . $result['message'] . "\n";
        exit;
    }

    $duplicates = $result['duplicates'];

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

    if (empty($allBookingIds)) {
        echo "✅ No bookings to cancel.\n";
        exit;
    }

    // Step 3: Execute cleanup using our API function
    echo "Step 3: Executing cleanup...\n";
    echo "============================\n";

    $cleanupResult = cleanupDuplicateBookings($allBookingIds);

    if ($cleanupResult['status'] === 'success') {
        echo "✅ Successfully cancelled {$cleanupResult['cancelled_count']} duplicate bookings!\n";
        echo "✅ Kept booking ID: {$cleanupResult['kept_booking_id']}\n";
        echo "✅ Cancelled booking IDs: " . implode(', ', $cleanupResult['cancelled_booking_ids']) . "\n";
        echo "✅ Cleanup completed successfully!\n\n";

        // Step 4: Verify cleanup
        echo "Step 4: Verification\n";
        echo "===================\n";

        $verifyResult = getDuplicateBookings();
        if ($verifyResult['status'] === 'success' && empty($verifyResult['duplicates'])) {
            echo "✅ Verification passed! No duplicate bookings remain.\n";
        } else {
            echo "⚠️  Warning: " . count($verifyResult['duplicates']) . " duplicate groups still exist.\n";
        }
    } else {
        echo "❌ Cleanup failed: " . $cleanupResult['message'] . "\n";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
