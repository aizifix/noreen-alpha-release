<?php
// Include the database connection
require_once 'db_connect.php';

// Set headers for output
header('Content-Type: text/plain');

try {
    // Read the SQL file
    $sql = file_get_contents('migrations/add_booking_inclusions_tables.sql');

    if (!$sql) {
        echo "Error: Could not read SQL file.\n";
        exit;
    }

    // Execute the SQL statements
    echo "Running booking inclusions migration...\n";

    // Split the SQL into separate statements
    $statements = explode(';', $sql);

    foreach ($statements as $statement) {
        $statement = trim($statement);
        if (!empty($statement)) {
            // Execute each statement
            $result = $pdo->exec($statement);
            echo "Executed: " . substr($statement, 0, 50) . "...\n";
        }
    }

    echo "Migration completed successfully!\n";

} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
