<?php
// Test script to debug Activity Timeline
require_once 'app/api/db_connect.php';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Database connected successfully!\n";
    
    // Test 1: Check if there are any events
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_events");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Total events in database: " . $result['count'] . "\n";
    
    // Test 2: Check if there are any payment logs
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_payment_logs");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Total payment logs in database: " . $result['count'] . "\n";
    
    // Test 3: Check if there are any bookings
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_bookings");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Total bookings in database: " . $result['count'] . "\n";
    
    // Test 4: Check recent events with admin_id
    $stmt = $pdo->query("SELECT event_id, event_title, admin_id, created_at FROM tbl_events ORDER BY created_at DESC LIMIT 5");
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Recent events:\n";
    foreach ($events as $event) {
        echo "- Event ID: " . $event['event_id'] . ", Title: " . $event['event_title'] . ", Admin ID: " . $event['admin_id'] . ", Created: " . $event['created_at'] . "\n";
    }
    
    // Test 5: Check recent payment logs
    $stmt = $pdo->query("SELECT log_id, event_id, action_type, amount, created_at FROM tbl_payment_logs ORDER BY created_at DESC LIMIT 5");
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Recent payment logs:\n";
    foreach ($payments as $payment) {
        echo "- Log ID: " . $payment['log_id'] . ", Event ID: " . $payment['event_id'] . ", Action: " . $payment['action_type'] . ", Amount: " . $payment['amount'] . ", Created: " . $payment['created_at'] . "\n";
    }
    
    // Test 6: Check if events have admin_id
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_events WHERE admin_id IS NOT NULL AND admin_id > 0");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Events with admin_id: " . $result['count'] . "\n";
    
    // Test 7: Check date range for recent data
    $stmt = $pdo->query("SELECT MIN(created_at) as earliest, MAX(created_at) as latest FROM tbl_events");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Events date range: " . $result['earliest'] . " to " . $result['latest'] . "\n";
    
    $stmt = $pdo->query("SELECT MIN(created_at) as earliest, MAX(created_at) as latest FROM tbl_payment_logs");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Payment logs date range: " . $result['earliest'] . " to " . $result['latest'] . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
