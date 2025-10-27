<?php
$host = 'localhost';
$dbname = 'event_planning_system';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "=== Event #270 Component Description Data ===\n";
    $sql = "SELECT
        ec.component_id,
        ec.component_name,
        ec.component_description,
        ec.original_package_component_id
    FROM tbl_event_components ec
    WHERE ec.event_id = 270
    ORDER BY ec.display_order";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($results as $row) {
        echo "Component ID: " . $row['component_id'] . "\n";
        echo "Name: " . $row['component_name'] . "\n";
        echo "Description: '" . $row['component_description'] . "'\n";
        echo "Original Package Component ID: " . $row['original_package_component_id'] . "\n";
        echo "---\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
