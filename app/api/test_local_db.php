<?php
// Test local database connection
header('Content-Type: application/json');

try {
    // Try different local database configurations
    $configs = [
        ['host' => 'localhost', 'dbname' => 'es_v3', 'username' => 'root', 'password' => ''],
        ['host' => 'localhost', 'dbname' => 'mysql', 'username' => 'root', 'password' => ''],
        ['host' => '127.0.0.1', 'dbname' => 'es_v3', 'username' => 'root', 'password' => ''],
        ['host' => 'localhost', 'dbname' => 'test', 'username' => 'root', 'password' => ''],
    ];

    $connected = false;
    $workingConfig = null;

    foreach ($configs as $config) {
        try {
            echo "Trying: {$config['host']}/{$config['dbname']} with user {$config['username']}\n";
            $pdo = new PDO("mysql:host={$config['host']};dbname={$config['dbname']};charset=utf8mb4",
                          $config['username'], $config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);

            // Test the connection
            $stmt = $pdo->query("SELECT 1 as test");
            $result = $stmt->fetch();

            if ($result) {
                echo "✓ SUCCESS: Connected to {$config['host']}/{$config['dbname']}\n";
                $connected = true;
                $workingConfig = $config;
                break;
            }
        } catch (Exception $e) {
            echo "✗ FAILED: " . $e->getMessage() . "\n";
        }
    }

    if ($connected) {
        echo "\nWorking configuration found!\n";
        echo "Host: {$workingConfig['host']}\n";
        echo "Database: {$workingConfig['dbname']}\n";
        echo "Username: {$workingConfig['username']}\n";
        echo "Password: " . (empty($workingConfig['password']) ? '(empty)' : '(set)') . "\n";

        // Test if we can create the required database
        try {
            $pdo->exec("CREATE DATABASE IF NOT EXISTS es_v3 CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");
            echo "✓ Database 'es_v3' created or already exists\n";
        } catch (Exception $e) {
            echo "✗ Could not create database: " . $e->getMessage() . "\n";
        }
    } else {
        echo "\n❌ No working database configuration found.\n";
        echo "Please ensure MySQL/MariaDB is running and accessible.\n";
    }

} catch (Exception $e) {
    echo "Test failed: " . $e->getMessage() . "\n";
}
?>
