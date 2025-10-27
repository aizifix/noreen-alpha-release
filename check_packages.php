<?php
$host = 'localhost';
$dbname = 'event_planning_system';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "=== All Packages ===\n";
    $sql = "SELECT package_id, package_name FROM tbl_packages ORDER BY package_name";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($results as $row) {
        echo "ID: " . $row['package_id'] . " - Name: " . $row['package_name'] . "\n";
    }

    echo "\n=== Silver/Debut Package Components ===\n";
    $sql = "SELECT
        pi.inclusion_id,
        pi.inclusion_name,
        pi.components_list,
        pi.inclusion_price,
        pi.package_id,
        p.package_name
    FROM tbl_package_inclusions pi
    JOIN tbl_packages p ON pi.package_id = p.package_id
    WHERE p.package_name LIKE '%Silver%' OR p.package_name LIKE '%Debut%'
    ORDER BY pi.display_order";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($results as $row) {
        echo "Inclusion ID: " . $row['inclusion_id'] . "\n";
        echo "Name: " . $row['inclusion_name'] . "\n";
        echo "Components List: '" . $row['components_list'] . "'\n";
        echo "Price: " . $row['inclusion_price'] . "\n";
        echo "Package: " . $row['package_name'] . "\n";
        echo "---\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
