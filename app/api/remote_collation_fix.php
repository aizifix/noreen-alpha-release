<?php
// UPLOAD THIS FILE TO YOUR REMOTE SERVER AND RUN IT
// This will fix the collation issues on the remote server

header('Content-Type: application/json');

try {
    // Connect to the remote database
    $pdo = new PDO('mysql:host=localhost;dbname=es_v4;charset=utf8mb4', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $results = [];

    // Step 1: Check current collation
    $stmt = $pdo->query("SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = 'es_v4'");
    $dbInfo = $stmt->fetch(PDO::FETCH_ASSOC);
    $results['database_collation'] = $dbInfo['DEFAULT_COLLATION_NAME'];

    // Step 2: Fix database collation
    $pdo->exec("ALTER DATABASE es_v4 CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");
    $results['database_fixed'] = true;

    // Step 3: Fix table collations
    $tables = ['tbl_users', 'tbl_events', 'tbl_payments', 'tbl_venue', 'tbl_packages'];
    $results['tables_fixed'] = [];

    foreach ($tables as $table) {
        try {
            $pdo->exec("ALTER TABLE $table CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");
            $results['tables_fixed'][] = $table;
        } catch (Exception $e) {
            $results['table_errors'][$table] = $e->getMessage();
        }
    }

    // Step 4: Fix specific columns
    $columnFixes = [
        "ALTER TABLE tbl_users MODIFY COLUMN user_firstName VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci",
        "ALTER TABLE tbl_users MODIFY COLUMN user_lastName VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci",
        "ALTER TABLE tbl_users MODIFY COLUMN user_email VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci",
        "ALTER TABLE tbl_events MODIFY COLUMN event_title VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci",
        "ALTER TABLE tbl_events MODIFY COLUMN event_theme VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci"
    ];

    $results['columns_fixed'] = [];
    foreach ($columnFixes as $fix) {
        try {
            $pdo->exec($fix);
            $results['columns_fixed'][] = "Column updated";
        } catch (Exception $e) {
            $results['column_errors'][] = $e->getMessage();
        }
    }

    // Step 5: Test CONCAT operations
    $results['tests'] = [];

    $tests = [
        "SELECT CONCAT(u.user_firstName, ' ', u.user_lastName) as client_name FROM tbl_users u LIMIT 1",
        "SELECT CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as client_name FROM tbl_users u LIMIT 1"
    ];

    foreach ($tests as $i => $test) {
        try {
            $stmt = $pdo->query($test);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $results['tests'][] = "Test " . ($i + 1) . " passed: " . $result['client_name'];
        } catch (Exception $e) {
            $results['tests'][] = "Test " . ($i + 1) . " failed: " . $e->getMessage();
        }
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Collation fix completed',
        'results' => $results
    ]);

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>
