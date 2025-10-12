<?php
require_once 'db_connect.php';

try {
    echo "Checking existing columns in tbl_package_components...\n\n";

    // Get table structure
    $stmt = $pdo->query("DESCRIBE tbl_package_components");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "📋 Current table structure:\n";
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

    echo "\n🔍 Column Status:\n";
    echo "supplier_id column: " . ($hasSupplierId ? "✅ EXISTS" : "❌ MISSING") . "\n";
    echo "offer_id column: " . ($hasOfferId ? "✅ EXISTS" : "❌ MISSING") . "\n";

    if ($hasSupplierId && $hasOfferId) {
        echo "\n✅ All required columns exist!\n";
        echo "The supplier badges should work now. Try refreshing the page.\n";
    } else {
        echo "\n⚠️  Some columns are missing. Here's what to run:\n";
        if (!$hasOfferId) {
            echo "ALTER TABLE `tbl_package_components` ADD COLUMN `offer_id` int(11) DEFAULT NULL COMMENT 'Reference to supplier offer if this is from a specific offer' AFTER `supplier_id`;\n";
        }
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
