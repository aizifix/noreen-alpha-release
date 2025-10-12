<?php
require_once 'db_connect.php';

try {
    echo "Starting migration: Add supplier support to package components...\n";

    // Read the migration file
    $migrationFile = __DIR__ . '/migrations/add_supplier_support_to_package_components.sql';
    if (!file_exists($migrationFile)) {
        throw new Exception("Migration file not found: $migrationFile");
    }

    $migrationSQL = file_get_contents($migrationFile);

    // Split the SQL into individual statements
    $statements = array_filter(array_map('trim', explode(';', $migrationSQL)));

    foreach ($statements as $statement) {
        if (empty($statement) || strpos($statement, '--') === 0) {
            continue; // Skip empty statements and comments
        }

        echo "Executing: " . substr($statement, 0, 100) . "...\n";

        try {
            $pdo->exec($statement);
            echo "✓ Success\n";
        } catch (PDOException $e) {
            // Check if it's a "already exists" error
            if (strpos($e->getMessage(), 'already exists') !== false ||
                strpos($e->getMessage(), 'Duplicate') !== false) {
                echo "⚠ Skipped (already exists): " . $e->getMessage() . "\n";
            } else {
                echo "✗ Error: " . $e->getMessage() . "\n";
                throw $e;
            }
        }
    }

    echo "\n✅ Migration completed successfully!\n";
    echo "Package components table now supports supplier information.\n";

} catch (Exception $e) {
    echo "\n❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>
