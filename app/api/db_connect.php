<?php

$host = 'localhost';
$dbname = 'es_v3';
$username = 'root';
$password = 'godisgood'; // password

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

try {
    // Create PDO connection with comprehensive error handling
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ]);

    // Test the connection
    $pdo->query("SELECT 1");
    error_log("PDO Database connection successful to $dbname");

} catch(PDOException $e) {
    error_log("PDO Connection failed: " . $e->getMessage());
    error_log("Connection details - Host: $host, Database: $dbname, User: $username");

    // Try to provide more specific error information
    if (strpos($e->getMessage(), 'Access denied') !== false) {
        die(json_encode([
            "status" => "error",
            "message" => "Database access denied. Please check credentials.",
            "debug" => "Host: $host, Database: $dbname"
        ]));
    } elseif (strpos($e->getMessage(), 'Unknown database') !== false) {
        die(json_encode([
            "status" => "error",
            "message" => "Database '$dbname' not found. Please check database name.",
            "debug" => "Available databases need to be checked"
        ]));
    } else {
        die(json_encode([
            "status" => "error",
            "message" => "Database connection failed: " . $e->getMessage()
        ]));
    }
}

// Also create mysqli connection for backward compatibility
try {
    $conn = new mysqli($host, $username, $password, $dbname);

    // Check connection
    if ($conn->connect_error) {
        throw new Exception("MySQLi connection failed: " . $conn->connect_error);
    }

    // Set charset to utf8mb4
    $conn->set_charset("utf8mb4");
    error_log("MySQLi Database connection successful to $dbname");

} catch(Exception $e) {
    error_log("MySQLi Connection failed: " . $e->getMessage());
    die(json_encode([
        "status" => "error",
        "message" => "MySQLi connection failed: " . $e->getMessage()
    ]));
}

// Function to check if table exists
function tableExists($pdo, $tableName) {
    try {
        $stmt = $pdo->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$tableName]);
        return $stmt->rowCount() > 0;
    } catch(PDOException $e) {
        error_log("Error checking table existence: " . $e->getMessage());
        return false;
    }
}

// Function to check if column exists
function columnExists($pdo, $tableName, $columnName) {
    try {
        $stmt = $pdo->prepare("SHOW COLUMNS FROM `$tableName` LIKE ?");
        $stmt->execute([$columnName]);
        return $stmt->rowCount() > 0;
    } catch(PDOException $e) {
        error_log("Error checking column existence: " . $e->getMessage());
        return false;
    }
}

// Check critical tables and log status
$criticalTables = ['tbl_users', 'tbl_2fa', 'tbl_suppliers'];
foreach ($criticalTables as $table) {
    if (!tableExists($pdo, $table)) {
        error_log("CRITICAL: Table $table does not exist!");
    } else {
        error_log("Table $table exists");
    }
}

// Check critical columns in tbl_users
if (tableExists($pdo, 'tbl_users')) {
    $criticalColumns = ['force_password_change', 'last_login', 'account_status'];
    foreach ($criticalColumns as $column) {
        if (!columnExists($pdo, 'tbl_users', $column)) {
            error_log("WARNING: Column $column does not exist in tbl_users");
        }
    }
}

?>
