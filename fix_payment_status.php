<?php
/**
 * Quick fix script for payment status issues
 * Run this script to fix event payment statuses based on actual payment totals
 */

// Database connection - adjust these values for your setup
$host = 'localhost';
$dbname = 'event_planning_system';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "🔧 Payment Status Fix Script\n";
    echo "============================\n\n";

    // Get all events with their payment totals
    $sql = "
        SELECT
            e.event_id,
            e.event_title,
            e.total_budget,
            e.down_payment,
            e.payment_status as current_status,
            e.reserved_payment_total,
            COALESCE(SUM(p.payment_amount), 0) as total_payments,
            (e.total_budget - COALESCE(SUM(p.payment_amount), 0)) as remaining_balance
        FROM tbl_events e
        LEFT JOIN tbl_payments p ON e.event_id = p.event_id
            AND p.payment_status IN ('completed', 'paid', 'confirmed', 'processed', 'successful')
        GROUP BY e.event_id, e.event_title, e.total_budget, e.down_payment, e.payment_status, e.reserved_payment_total
        ORDER BY e.event_id
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $fixedCount = 0;
    $totalEvents = count($events);

    echo "Found $totalEvents events to check...\n\n";

    foreach ($events as $event) {
        $eventId = $event['event_id'];
        $totalBudget = floatval($event['total_budget']);
        $totalPaid = floatval($event['total_payments']);
        $currentStatus = $event['current_status'];

        // Calculate what the status should be
        $calculatedStatus = 'unpaid';
        if ($totalPaid >= $totalBudget && $totalBudget > 0) {
            $calculatedStatus = 'paid';
        } elseif ($totalPaid > 0) {
            $calculatedStatus = 'partial';
        }

        // Check if status needs to be updated
        if ($currentStatus !== $calculatedStatus) {
            echo "🔧 Fixing Event #$eventId: {$event['event_title']}\n";
            echo "   Current Status: $currentStatus\n";
            echo "   Calculated Status: $calculatedStatus\n";
            echo "   Total Budget: ₱" . number_format($totalBudget, 2) . "\n";
            echo "   Total Paid: ₱" . number_format($totalPaid, 2) . "\n";
            echo "   Remaining: ₱" . number_format($totalBudget - $totalPaid, 2) . "\n";

            // Update the payment status
            $updateSql = "UPDATE tbl_events SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE event_id = ?";
            $updateStmt = $pdo->prepare($updateSql);
            $updateStmt->execute([$calculatedStatus, $eventId]);

            if ($updateStmt->rowCount() > 0) {
                echo "   ✅ Status updated to: $calculatedStatus\n";
                $fixedCount++;
            } else {
                echo "   ❌ Failed to update status\n";
            }
            echo "\n";
        }
    }

    echo "🎉 Fix completed!\n";
    echo "Fixed $fixedCount out of $totalEvents events\n";

    // Show summary of current statuses
    echo "\n📊 Current Payment Status Summary:\n";
    $summarySql = "SELECT payment_status, COUNT(*) as count FROM tbl_events GROUP BY payment_status";
    $summaryStmt = $pdo->prepare($summarySql);
    $summaryStmt->execute();
    $summary = $summaryStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($summary as $row) {
        echo "   {$row['payment_status']}: {$row['count']} events\n";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\nScript completed.\n";
?>
