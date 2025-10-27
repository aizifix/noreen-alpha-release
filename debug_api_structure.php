<?php
/**
 * Debug script to check the API response structure
 */

require_once 'app/api/db_connect.php';

try {
    echo "Testing API Response Structure\n";
    echo "============================\n\n";

    // Test 1: Check a specific event
    $eventId = 28; // Use a known event ID

    echo "Testing Event ID: $eventId\n";

    // Get event components
    $stmt = $pdo->prepare("
        SELECT
            ec.*,
            pc.component_name as original_component_name,
            pc.component_description as original_component_description
        FROM tbl_event_components ec
        LEFT JOIN tbl_package_inclusions pc ON ec.original_package_component_id = pc.inclusion_id
        WHERE ec.event_id = ?
        ORDER BY ec.display_order
    ");
    $stmt->execute([$eventId]);
    $eventComponents = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Found " . count($eventComponents) . " event components:\n";

    foreach ($eventComponents as $component) {
        echo "\nComponent: {$component['component_name']}\n";
        echo "Original Package Component ID: " . ($component['original_package_component_id'] ?: 'NULL') . "\n";

        // Fetch real components
        if (!empty($component['original_package_component_id'])) {
            $componentsSql = "SELECT component_id, component_name, component_description, component_price, display_order
                            FROM tbl_inclusion_components
                            WHERE inclusion_id = :inclusion_id
                            ORDER BY display_order";
            $componentsStmt = $pdo->prepare($componentsSql);
            $componentsStmt->execute([':inclusion_id' => $component['original_package_component_id']]);
            $realComponents = $componentsStmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($realComponents)) {
                echo "Real Components (" . count($realComponents) . "):\n";
                foreach ($realComponents as $realComponent) {
                    echo "  - {$realComponent['component_name']} (₱{$realComponent['component_price']})\n";
                }
            } else {
                echo "No real components found\n";
            }
        } else {
            echo "No original_package_component_id\n";
        }
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
