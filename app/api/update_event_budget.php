<?php
/**
 * Script to update event budget for event_id 222
 * This fixes the calculation discrepancy between frontend display and database
 */

require_once 'admin.php';

// Database connection
$host = 'localhost';
$dbname = 'norejixd_miko';
$username = 'norejixd_admin';
$password = 'Godisgood_31!';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "Connected to database successfully.\n";

    // Get current event data for event_id 222
    $eventId = 222;
    $sql = "SELECT * FROM tbl_events WHERE event_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$eventId]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$event) {
        echo "Event with ID $eventId not found.\n";
        exit;
    }

    echo "Current event data:\n";
    echo "- Event ID: " . $event['event_id'] . "\n";
    echo "- Event Title: " . $event['event_title'] . "\n";
    echo "- Package ID: " . $event['package_id'] . "\n";
    echo "- Venue ID: " . $event['venue_id'] . "\n";
    echo "- Guest Count: " . $event['guest_count'] . "\n";
    echo "- Current Total Budget: ₱" . number_format($event['total_budget'], 2) . "\n";
    echo "- Current Down Payment: ₱" . number_format($event['down_payment'], 2) . "\n";

    // Calculate the correct budget
    $currentBudget = floatval($event['total_budget']);
    $correctBudget = 260000.00; // Based on your calculation
    $budgetChange = $correctBudget - $currentBudget;

    echo "\nBudget calculation:\n";
    echo "- Current Budget: ₱" . number_format($currentBudget, 2) . "\n";
    echo "- Correct Budget: ₱" . number_format($correctBudget, 2) . "\n";
    echo "- Budget Change: ₱" . number_format($budgetChange, 2) . "\n";

    if ($budgetChange == 0) {
        echo "Budget is already correct. No update needed.\n";
        exit;
    }

    // Update the budget
    $updateSql = "UPDATE tbl_events SET total_budget = ?, updated_at = CURRENT_TIMESTAMP WHERE event_id = ?";
    $updateStmt = $pdo->prepare($updateSql);
    $result = $updateStmt->execute([$correctBudget, $eventId]);

    if ($result) {
        echo "\n✅ Budget updated successfully!\n";
        echo "- New Total Budget: ₱" . number_format($correctBudget, 2) . "\n";

        // Verify the update
        $verifySql = "SELECT total_budget FROM tbl_events WHERE event_id = ?";
        $verifyStmt = $pdo->prepare($verifySql);
        $verifyStmt->execute([$eventId]);
        $newBudget = $verifyStmt->fetch(PDO::FETCH_ASSOC)['total_budget'];

        echo "- Verified Budget in DB: ₱" . number_format($newBudget, 2) . "\n";

        if (floatval($newBudget) == $correctBudget) {
            echo "✅ Verification successful! Budget correctly updated in database.\n";
        } else {
            echo "❌ Verification failed! Budget mismatch detected.\n";
        }
    } else {
        echo "❌ Failed to update budget.\n";
    }

} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
