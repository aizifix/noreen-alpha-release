<?php
// Test script to check if remote admin.php has the collation fixes
// Upload this to your remote server and run it

header('Content-Type: application/json');

try {
    // Read the admin.php file and check for collation fixes
    $adminFile = file_get_contents('admin.php');

    $checks = [
        'has_collate_utf8mb4_general_ci' => strpos($adminFile, 'COLLATE utf8mb4_general_ci') !== false,
        'has_user_firstName_collate' => strpos($adminFile, 'user_firstName COLLATE utf8mb4_general_ci') !== false,
        'has_user_lastName_collate' => strpos($adminFile, 'user_lastName COLLATE utf8mb4_general_ci') !== false,
        'has_concat_fixes' => substr_count($adminFile, 'COLLATE utf8mb4_general_ci') > 10,
        'file_size' => strlen($adminFile),
        'last_modified' => filemtime('admin.php')
    ];

    // Count how many CONCAT operations have collation fixes
    $concatCount = substr_count($adminFile, 'CONCAT(');
    $collateCount = substr_count($adminFile, 'COLLATE utf8mb4_general_ci');

    $checks['concat_operations'] = $concatCount;
    $checks['collate_fixes'] = $collateCount;
    $checks['fix_percentage'] = $concatCount > 0 ? round(($collateCount / $concatCount) * 100, 2) : 0;

    echo json_encode([
        'status' => 'success',
        'message' => 'Admin.php file analysis complete',
        'checks' => $checks,
        'recommendation' => $checks['fix_percentage'] < 50 ? 'Upload the updated admin.php file' : 'File appears to be updated'
    ]);

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>
