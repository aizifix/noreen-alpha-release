<?php
/**
 * Quick test to check what's happening with event 28
 */

require_once 'app/api/db_connect.php';

try {
    echo "Quick Test for Event 28\n";
    echo "======================\n\n";

    // Check event 28 components
    $stmt = $pdo->prepare("
        SELECT
            ec.component_id,
            ec.component_name,
            ec.original_package_component_id,
            pc.inclusion_name,
            pc.components_list
        FROM tbl_event_components ec
        LEFT JOIN tbl_package_inclusions pc ON ec.original_package_component_id = pc.inclusion_id
        WHERE ec.event_id = 28
        ORDER BY ec.display_order
    ");
    $stmt->execute();
    $components = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Event 28 Components:\n";
    foreach ($components as $comp) {
        echo "Component: {$comp['component_name']}\n";
        echo "Original Package Component ID: " . ($comp['original_package_component_id'] ?: 'NULL') . "\n";
        echo "Inclusion Name: " . ($comp['inclusion_name'] ?: 'NULL') . "\n";
        echo "Components List: " . ($comp['components_list'] ?: 'NULL') . "\n";
        echo "---\n";
    }

    echo "\nNow let's check what inclusions exist for the package:\n";

    // Get the package ID for event 28
    $stmt = $pdo->prepare("SELECT package_id FROM tbl_events WHERE event_id = 28");
    $stmt->execute();
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($event && $event['package_id']) {
        echo "Event 28 Package ID: {$event['package_id']}\n\n";

        // Get all inclusions for this package
        $stmt = $pdo->prepare("
            SELECT inclusion_id, inclusion_name, components_list
            FROM tbl_package_inclusions
            WHERE package_id = ?
            ORDER BY display_order
        ");
        $stmt->execute([$event['package_id']]);
        $inclusions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo "Package {$event['package_id']} Inclusions:\n";
        foreach ($inclusions as $inc) {
            echo "Inclusion ID: {$inc['inclusion_id']}\n";
            echo "Inclusion Name: {$inc['inclusion_name']}\n";
            echo "Components List: " . ($inc['components_list'] ?: 'NULL') . "\n";
            echo "---\n";
        }
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
