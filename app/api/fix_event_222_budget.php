<?php
/**
 * Script to fix event_id 222 budget using the existing API
 * This uses the updateEventBudget function to add 20,000 to the current budget
 */

// Simulate the API call to updateEventBudget
$eventId = 222;
$budgetChange = 20000; // Add 20,000 to go from 240,000 to 260,000

// Create the data array as if it came from a POST request
$_POST['operation'] = 'updateEventBudget';
$_POST['event_id'] = $eventId;
$_POST['budget_change'] = $budgetChange;

// Set up the data array
$data = [
    'operation' => 'updateEventBudget',
    'event_id' => $eventId,
    'budget_change' => $budgetChange
];

echo "Attempting to update event_id $eventId budget by adding ₱" . number_format($budgetChange, 2) . "\n";
echo "This should change the budget from ₱240,000.00 to ₱260,000.00\n\n";

// Include the admin.php file which will handle the operation
try {
    // Capture the output
    ob_start();
    include 'admin.php';
    $output = ob_get_clean();

    echo "API Response:\n";
    echo $output . "\n";

    // Try to decode the JSON response
    $response = json_decode($output, true);
    if ($response) {
        if ($response['status'] === 'success') {
            echo "✅ SUCCESS: " . $response['message'] . "\n";
            echo "Old Budget: ₱" . number_format($response['old_budget'], 2) . "\n";
            echo "New Budget: ₱" . number_format($response['new_budget'], 2) . "\n";
            echo "Change: ₱" . number_format($response['change'], 2) . "\n";
        } else {
            echo "❌ ERROR: " . $response['message'] . "\n";
        }
    } else {
        echo "❌ Failed to parse API response as JSON\n";
        echo "Raw output: " . $output . "\n";
    }

} catch (Exception $e) {
    echo "❌ Exception occurred: " . $e->getMessage() . "\n";
}
?>
