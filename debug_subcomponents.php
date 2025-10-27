<?php
/**
 * Debug script to check why subComponents are not showing
 */

require_once 'app/api/db_connect.php';

try {
    echo "Debugging subComponents Issue\n";
    echo "============================\n\n";

    // Test with a specific event
    $eventId = 28; // Change this to a real event ID

    echo "Checking Event ID: $eventId\n\n";

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

    if (empty($eventComponents)) {
        echo "No event components found for event $eventId\n";
        echo "Let's check if the event exists...\n";

        $stmt = $pdo->prepare("SELECT event_id, event_title FROM tbl_events WHERE event_id = ?");
        $stmt->execute([$eventId]);
        $event = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($event) {
            echo "Event exists: {$event['event_title']}\n";
        } else {
            echo "Event does not exist!\n";
        }
        exit;
    }

    echo "Found " . count($eventComponents) . " event components:\n\n";

    foreach ($eventComponents as $component) {
        echo "Component: {$component['component_name']}\n";
        echo "Original Package Component ID: " . ($component['original_package_component_id'] ?: 'NULL') . "\n";
        echo "Component Description: " . ($component['component_description'] ?: 'NULL') . "\n";

        $subComponents = [];

        // Check if this component has an original_package_component_id
        if (!empty($component['original_package_component_id'])) {
            echo "Fetching real components for inclusion_id: {$component['original_package_component_id']}\n";

            $componentsSql = "SELECT component_id, component_name, component_description, component_price, display_order
                            FROM tbl_inclusion_components
                            WHERE inclusion_id = :inclusion_id
                            ORDER BY display_order";
            $componentsStmt = $pdo->prepare($componentsSql);
            $componentsStmt->execute([':inclusion_id' => $component['original_package_component_id']]);
            $realComponents = $componentsStmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($realComponents)) {
                echo "Found " . count($realComponents) . " real components:\n";
                foreach ($realComponents as $realComponent) {
                    echo "  - {$realComponent['component_name']} (₱{$realComponent['component_price']})\n";
                    $subComponents[] = [
                        'name' => $realComponent['component_name'],
                        'price' => (float)$realComponent['component_price']
                    ];
                }
            } else {
                echo "No real components found in tbl_inclusion_components\n";
            }
        } else {
            echo "No original_package_component_id - this is a custom component\n";
        }

        // Check fallback parsing
        if (empty($subComponents)) {
            echo "Checking fallback parsing...\n";
            $rawDescription = isset($component['component_description']) ? trim((string)$component['component_description']) : '';

            if ($rawDescription !== '') {
                echo "Parsing component_description: '$rawDescription'\n";
                $normalized = preg_replace('/[\r\n;•]+/u', ',', $rawDescription);
                $parts = array_filter(array_map('trim', explode(',', (string)$normalized)), function($p) { return $p !== ''; });

                if (!empty($parts)) {
                    echo "Parsed " . count($parts) . " parts:\n";
                    foreach ($parts as $part) {
                        echo "  - '$part'\n";
                        $subComponents[] = [
                            'name' => $part,
                            'price' => 0
                        ];
                    }
                } else {
                    echo "No parts found after parsing\n";
                }
            } else {
                echo "No component_description to parse\n";
            }
        }

        echo "Final subComponents count: " . count($subComponents) . "\n";
        echo "---\n\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
