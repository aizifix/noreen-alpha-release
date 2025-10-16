<?php
// Migration runner for adding reserved payment columns to tbl_events
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
    echo "Connected successfully to database: $dbname\n";
} catch(PDOException $e) {
    die("Connection failed: " . $e->getMessage() . "\n");
}

// Read and execute the migration
$sql = file_get_contents('migrations/add_reserved_payment_columns_to_events.sql');

// Split the SQL into individual statements
$statements = array_filter(array_map('trim', explode(';', $sql)));

foreach ($statements as $statement) {
    if (!empty($statement)) {
        try {
            $pdo->exec($statement);
            echo "Executed: " . substr($statement, 0, 50) . "...\n";
        } catch(PDOException $e) {
            echo "Error executing statement: " . $e->getMessage() . "\n";
            echo "Statement: " . $statement . "\n";
        }
    }
}

echo "Migration completed!\n";
?>
