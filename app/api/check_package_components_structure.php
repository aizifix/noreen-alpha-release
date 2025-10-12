<?php
require_once 'db_connect.php';

try {
    echo "Checking tbl_package_components table structure...\n\n";

    // Check if the table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'tbl_package_components'");
    if ($stmt->rowCount() == 0) {
        echo "❌ Table 'tbl_package_components' does not exist!\n";
        exit(1);
    }
    echo "✅ Table 'tbl_package_components' exists\n";

    // Get table structure
    $stmt = $pdo->query("DESCRIBE tbl_package_components");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "\n📋 Current table structure:\n";
    echo "Column Name\t\tType\t\tNull\tKey\tDefault\tExtra\n";
    echo str_repeat("-", 80) . "\n";

    $hasSupplierId = false;
    $hasOfferId = false;

    foreach ($columns as $column) {
        echo sprintf("%-20s\t%-15s\t%-5s\t%-5s\t%-10s\t%s\n",
            $column['Field'],
            $column['Type'],
            $column['Null'],
            $column['Key'],
            $column['Default'] ?? 'NULL',
            $column['Extra']
        );

        if ($column['Field'] === 'supplier_id') {
            $hasSupplierId = true;
        }
        if ($column['Field'] === 'offer_id') {
            $hasOfferId = true;
        }
    }

    echo "\n🔍 Migration Status:\n";
    echo "supplier_id column: " . ($hasSupplierId ? "✅ EXISTS" : "❌ MISSING") . "\n";
    echo "offer_id column: " . ($hasOfferId ? "✅ EXISTS" : "❌ MISSING") . "\n";

    if (!$hasSupplierId || !$hasOfferId) {
        echo "\n⚠️  MIGRATION NEEDED!\n";
        echo "Please run the manual_migration.sql script in your database management tool.\n";
    } else {
        echo "\n✅ Migration already completed!\n";
    }

    // Test a sample query
    echo "\n🧪 Testing sample query...\n";
    try {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_package_components");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "✅ Found {$result['count']} package components\n";
    } catch (Exception $e) {
        echo "❌ Error querying package components: " . $e->getMessage() . "\n";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>
