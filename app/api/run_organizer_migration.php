<?php
require_once 'db_connect.php';

echo "Starting Organizer Assignment Migration...\n";

try {
    // Read the migration file
    $migrationFile = 'migrations/add_organizer_assignment_feature.sql';

    if (!file_exists($migrationFile)) {
        echo "Error: Migration file not found: $migrationFile\n";
        exit(1);
    }

    $sql = file_get_contents($migrationFile);

    // Split the SQL into individual statements
    $statements = explode(';', $sql);

    $successCount = 0;
    $errorCount = 0;

    foreach ($statements as $statement) {
        $statement = trim($statement);

        // Skip empty statements and comments
        if (empty($statement) || strpos($statement, '--') === 0) {
            continue;
        }

        try {
            echo "Executing: " . substr($statement, 0, 50) . "...\n";
            $pdo->exec($statement);
            $successCount++;
            echo "✓ Success\n";
        } catch (PDOException $e) {
            $errorCount++;
            echo "✗ Error: " . $e->getMessage() . "\n";
        }
    }

    echo "\nMigration completed!\n";
    echo "Successful statements: $successCount\n";
    echo "Failed statements: $errorCount\n";

    if ($errorCount > 0) {
        echo "\nSome statements failed. Please check the errors above.\n";
        exit(1);
    } else {
        echo "\nAll statements executed successfully!\n";
    }

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>


