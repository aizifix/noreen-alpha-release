<?php
// Standalone migration runner with direct database connection
$host = 'localhost';
$dbname = 'es_v3';
$username = 'root';
$password = ''; // Try empty password first

try {
    // Try connection with empty password
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connected successfully with empty password\n";
} catch(PDOException $e) {
    // If that fails, try with the password from db_connect.php
    $password = 'godisgood';
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        echo "Connected successfully with password\n";
    } catch(PDOException $e) {
        die("Connection failed: " . $e->getMessage() . "\n");
    }
}

// Read and execute the migration
$sql = file_get_contents('migrations/fix_createnotification_procedure.sql');

// Remove DELIMITER statements for PDO
$sql = preg_replace('/DELIMITER\s+\$\$/', '', $sql);
$sql = preg_replace('/\$\$/', ';', $sql);
$sql = preg_replace('/DELIMITER\s+;/', '', $sql);

try {
    $pdo->exec($sql);
    echo "CreateNotification procedure created successfully!\n";
} catch(PDOException $e) {
    echo "Error creating procedure: " . $e->getMessage() . "\n";
}
