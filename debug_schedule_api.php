<?php
require_once 'app/api/db_connect.php';

// Simulate the POST data that the frontend sends
$_POST = [
    'operation' => 'schedules',
    'subaction' => 'get',
    'event_id' => '274'
];

echo "Testing schedule API with event_id 274...\n";
echo "POST data: " . json_encode($_POST) . "\n\n";

// Start output buffering to capture the response
ob_start();

try {
    include 'app/api/admin.php';
    $output = ob_get_clean();
    echo "API Response:\n";
    echo $output;
} catch (Exception $e) {
    ob_end_clean();
    echo "Error: " . $e->getMessage() . "\n";
}
?>
