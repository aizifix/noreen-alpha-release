<?php
/**
 * Test script to verify payment status update functionality
 * This script tests the new updateEventPaymentStatus method
 */

require_once 'app/api/admin.php';

// Database connection (you may need to adjust this based on your setup)
$host = 'localhost';
$dbname = 'your_database_name';
$username = 'your_username';
$password = 'your_password';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $admin = new Admin($pdo);

    // Test with a specific event ID (replace with an actual event ID from your database)
    $testEventId = 1; // Change this to an actual event ID

    echo "Testing payment status update for event ID: $testEventId\n";
    echo "===============================================\n";

    // Get event details before update
    $response = json_decode($admin->getEventById($testEventId), true);
    if ($response['status'] === 'success') {
        $event = $response['event'];
        echo "Event Title: " . $event['event_title'] . "\n";
        echo "Total Budget: ₱" . number_format($event['total_budget'], 2) . "\n";
        echo "Down Payment: ₱" . number_format($event['down_payment'], 2) . "\n";
        echo "Current Payment Status: " . $event['payment_status'] . "\n";

        // Calculate total payments
        $totalPaid = 0;
        if (isset($event['payments']) && is_array($event['payments'])) {
            foreach ($event['payments'] as $payment) {
                if (in_array($payment['payment_status'], ['completed', 'paid', 'confirmed', 'processed', 'successful'])) {
                    $totalPaid += floatval($payment['payment_amount']);
                }
            }
        }

        echo "Total Paid from Payments: ₱" . number_format($totalPaid, 2) . "\n";
        echo "Remaining Balance: ₱" . number_format($event['total_budget'] - $totalPaid, 2) . "\n";

        // Test the updateEventPaymentStatus method
        echo "\nUpdating event payment status...\n";
        $updateResult = $admin->updateEventPaymentStatus($testEventId);

        if ($updateResult) {
            echo "✅ Payment status update successful!\n";

            // Get updated event details
            $updatedResponse = json_decode($admin->getEventById($testEventId), true);
            if ($updatedResponse['status'] === 'success') {
                $updatedEvent = $updatedResponse['event'];
                echo "Updated Payment Status: " . $updatedEvent['payment_status'] . "\n";

                if ($updatedEvent['payment_status'] === 'paid') {
                    echo "🎉 Event is now marked as fully paid!\n";
                } elseif ($updatedEvent['payment_status'] === 'partial') {
                    echo "📊 Event is marked as partially paid.\n";
                } else {
                    echo "⚠️ Event is still marked as unpaid.\n";
                }
            }
        } else {
            echo "❌ Payment status update failed!\n";
        }

    } else {
        echo "❌ Failed to fetch event details: " . $response['message'] . "\n";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\nTest completed.\n";
?>
