<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Simple test without dependencies
$operation = $_POST['operation'] ?? $_GET['operation'] ?? '';

if ($operation === 'test') {
    echo json_encode([
        'status' => 'success',
        'message' => 'PHP is working correctly',
        'php_version' => PHP_VERSION,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} else {
    echo json_encode([
        'status' => 'error',
        'message' => 'Please provide operation parameter',
        'php_version' => PHP_VERSION
    ]);
}
?>
