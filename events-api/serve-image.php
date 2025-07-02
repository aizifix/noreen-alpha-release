<?php
// Image serving script for venue images and other uploads
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

// Get the requested image path
$imagePath = $_GET['path'] ?? '';

if (empty($imagePath)) {
    // If no path specified, try to serve from URL path
    $requestUri = $_SERVER['REQUEST_URI'];
    $imagePath = str_replace('/events-api/', '', $requestUri);
}

// Security: only allow files from uploads directory
if (!preg_match('/^uploads\//', $imagePath)) {
    http_response_code(403);
    exit('Access denied');
}

// Build full file path
$fullPath = '../app/api/' . $imagePath;

// Check if file exists
if (!file_exists($fullPath)) {
    http_response_code(404);
    exit('Image not found');
}

// Get file info
$fileInfo = pathinfo($fullPath);
$mimeTypes = [
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'gif' => 'image/gif',
    'webp' => 'image/webp'
];

$extension = strtolower($fileInfo['extension']);
$mimeType = $mimeTypes[$extension] ?? 'application/octet-stream';

// Set headers
header("Content-Type: $mimeType");
header("Content-Length: " . filesize($fullPath));
header("Cache-Control: public, max-age=3600"); // Cache for 1 hour

// Output the file
readfile($fullPath);
?>
