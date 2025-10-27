<?php
$host = 'localhost';
$dbname = 'event_planning_system';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "=== Testing getPackageById for Silver Debut Package ===\n";

    // Get the package ID for Silver Debut Package
    $packageSql = "SELECT package_id FROM tbl_packages WHERE package_title LIKE '%Silver%' OR package_title LIKE '%Debut%' LIMIT 1";
    $packageStmt = $pdo->prepare($packageSql);
    $packageStmt->execute();
    $package = $packageStmt->fetch(PDO::FETCH_ASSOC);

    if (!$package) {
        echo "No Silver/Debut package found\n";
        exit;
    }

    $packageId = $package['package_id'];
    echo "Package ID: " . $packageId . "\n\n";

    // Get package components (same query as in getPackageById)
    $componentsSql = "SELECT inclusion_id as component_id, inclusion_name as component_name, components_list as component_description, inclusion_price as component_price, display_order, supplier_id, offer_id FROM tbl_package_inclusions WHERE package_id = :package_id ORDER BY display_order";
    $componentsStmt = $pdo->prepare($componentsSql);
    $componentsStmt->execute([':package_id' => $packageId]);
    $components = $componentsStmt->fetchAll(PDO::FETCH_ASSOC);

    echo "=== Package Components ===\n";
    foreach ($components as $component) {
        echo "Component: " . $component['component_name'] . "\n";
        echo "Components List: '" . $component['component_description'] . "'\n";
        echo "---\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
