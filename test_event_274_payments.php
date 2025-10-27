<?php
/**
 * Test script to verify payment calculation for event 274
 */

// Database connection
$host = 'localhost';
$dbname = 'event_planning_system';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "🔍 Payment Calculation Test for Event 274\n";
    echo "==========================================\n\n";

    // Get event details
    $eventSql = "SELECT * FROM tbl_events WHERE event_id = 274";
    $eventStmt = $pdo->prepare($eventSql);
    $eventStmt->execute();
    $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

    if (!$event) {
        echo "❌ Event 274 not found!\n";
        exit;
    }

    echo "Event Details:\n";
    echo "- Title: {$event['event_title']}\n";
    echo "- Total Budget: ₱" . number_format($event['total_budget'], 2) . "\n";
    echo "- Down Payment: ₱" . number_format($event['down_payment'], 2) . "\n";
    echo "- Reserved Payment Total: ₱" . number_format($event['reserved_payment_total'], 2) . "\n";
    echo "- Adjusted Total: ₱" . number_format($event['adjusted_total'], 2) . "\n";
    echo "- Current Payment Status: {$event['payment_status']}\n\n";

    // Get all payments for this event
    $paymentSql = "
        SELECT
            payment_id,
            payment_amount,
            payment_status,
            payment_date,
            payment_method,
            payment_notes,
            payment_type
        FROM tbl_payments
        WHERE event_id = 274
        ORDER BY payment_date DESC
    ";
    $paymentStmt = $pdo->prepare($paymentSql);
    $paymentStmt->execute();
    $payments = $paymentStmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Payments Found: " . count($payments) . "\n";
    echo "================\n";

    $totalPaid = 0;
    $validStatuses = ['completed', 'paid', 'confirmed', 'processed', 'successful'];

    foreach ($payments as $payment) {
        $isPaid = in_array($payment['payment_status'], $validStatuses);
        $amount = floatval($payment['payment_amount']);

        echo "- Payment #{$payment['payment_id']}: ₱" . number_format($amount, 2) . " ({$payment['payment_status']}) - " . ($isPaid ? "✅ COUNTED" : "❌ NOT COUNTED") . "\n";
        echo "  Method: {$payment['payment_method']}, Date: {$payment['payment_date']}\n";
        echo "  Notes: {$payment['payment_notes']}\n";

        if ($isPaid) {
            $totalPaid += $amount;
        }
        echo "\n";
    }

    echo "Payment Calculation:\n";
    echo "===================\n";
    echo "Total Budget: ₱" . number_format($event['total_budget'], 2) . "\n";
    echo "Total Paid: ₱" . number_format($totalPaid, 2) . "\n";
    echo "Remaining: ₱" . number_format($event['total_budget'] - $totalPaid, 2) . "\n";
    echo "Percentage Paid: " . number_format(($totalPaid / $event['total_budget']) * 100, 2) . "%\n\n";

    // Determine correct status
    $correctStatus = 'unpaid';
    if ($totalPaid >= $event['total_budget'] && $event['total_budget'] > 0) {
        $correctStatus = 'paid';
    } elseif ($totalPaid > 0) {
        $correctStatus = 'partial';
    }

    echo "Status Analysis:\n";
    echo "===============\n";
    echo "Current Status: {$event['payment_status']}\n";
    echo "Correct Status: $correctStatus\n";
    echo "Status Match: " . ($event['payment_status'] === $correctStatus ? "✅ CORRECT" : "❌ INCORRECT") . "\n\n";

    if ($event['payment_status'] !== $correctStatus) {
        echo "🔧 Fixing payment status...\n";
        $updateSql = "UPDATE tbl_events SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE event_id = 274";
        $updateStmt = $pdo->prepare($updateSql);
        $updateStmt->execute([$correctStatus]);

        if ($updateStmt->rowCount() > 0) {
            echo "✅ Payment status updated to: $correctStatus\n";
        } else {
            echo "❌ Failed to update payment status\n";
        }
    } else {
        echo "✅ Payment status is already correct!\n";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\nTest completed.\n";
?>
