<?php
// Run payment_percentage column migration
// This adds the missing payment_percentage column to tbl_payments

$host = 'localhost';
$dbname = 'es_v3';
$username = 'root';
$password = ''; // Try empty password first

echo "=== Payment Table Complete Fix Migration ===\n";
echo "This migration will:\n";
echo "1. Add schedule_id column (if missing)\n";
echo "2. Add payment_percentage column (if missing)\n";
echo "3. Add payment_reference column (if missing)\n";
echo "4. Remove payment_attachments column (if exists)\n";
echo "Starting migration process...\n\n";

try {
    // Try connection with empty password
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✓ Connected successfully to database '$dbname'\n";
} catch(PDOException $e) {
    // If that fails, try with the password from db_connect.php
    $password = 'godisgood';
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        echo "✓ Connected successfully to database '$dbname'\n";
    } catch(PDOException $e) {
        die("✗ Connection failed: " . $e->getMessage() . "\n");
    }
}

// Read the migration file
$migrationFile = 'migrations/add_payment_percentage_column.sql';
if (!file_exists($migrationFile)) {
    die("✗ Migration file not found: $migrationFile\n");
}

$sql = file_get_contents($migrationFile);
echo "✓ Migration file loaded\n";

try {
    // Execute the migration as multi-query
    $pdo->exec($sql);
    echo "✓ Migration executed successfully!\n\n";

    // Verify the column was added
    $stmt = $pdo->query("
        SELECT
            COLUMN_NAME,
            COLUMN_TYPE,
            IS_NULLABLE,
            COLUMN_DEFAULT,
            COLUMN_COMMENT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = '$dbname'
          AND TABLE_NAME = 'tbl_payments'
          AND COLUMN_NAME = 'payment_percentage'
    ");

    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($result) {
        echo "=== Verification ===\n";
        echo "Column Name: {$result['COLUMN_NAME']}\n";
        echo "Column Type: {$result['COLUMN_TYPE']}\n";
        echo "Nullable: {$result['IS_NULLABLE']}\n";
        echo "Default: " . ($result['COLUMN_DEFAULT'] ?? 'NULL') . "\n";
        echo "Comment: {$result['COLUMN_COMMENT']}\n";
        echo "\n✓ Column 'payment_percentage' exists and is ready to use!\n";
    } else {
        echo "\n⚠ Warning: Could not verify column existence\n";
    }

} catch(PDOException $e) {
    echo "✗ Error executing migration: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n=== Migration Complete ===\n";
echo "You can now restart your Next.js application.\n";
