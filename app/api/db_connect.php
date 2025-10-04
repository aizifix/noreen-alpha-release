<?php
// Database connection parameters
$host = 'localhost';
$dbname = 'norejixd_miko';
$username = 'norejixd_admin';
$password = 'Godisgood_31!';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_general_ci"
    ]);

    // Comprehensive collation enforcement to prevent all collation conflicts
    $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_general_ci");
    $pdo->exec("SET SESSION collation_connection = 'utf8mb4_general_ci'");
    $pdo->exec("SET SESSION collation_database = 'utf8mb4_general_ci'");
    $pdo->exec("SET SESSION collation_server = 'utf8mb4_general_ci'");
    $pdo->exec("SET SESSION character_set_connection = 'utf8mb4'");
    $pdo->exec("SET SESSION character_set_database = 'utf8mb4'");
    $pdo->exec("SET SESSION character_set_server = 'utf8mb4'");
    $pdo->exec("SET SESSION sql_mode = ''");

    // Additional global collation enforcement
    $pdo->exec("SET SESSION collation_database = 'utf8mb4_general_ci'");
    $pdo->exec("SET SESSION collation_server = 'utf8mb4_general_ci'");
    $pdo->exec("SET SESSION collation_connection = 'utf8mb4_general_ci'");

    // Force all string operations to use utf8mb4_general_ci
    $pdo->exec("SET SESSION character_set_results = 'utf8mb4'");
    $pdo->exec("SET SESSION character_set_client = 'utf8mb4'");

} catch (PDOException $e) {
    die("ERROR: Could not connect. " . $e->getMessage());
}
?>
