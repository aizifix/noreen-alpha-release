<?php
/**
 * Debug script to check the database structure
 */

require_once 'app/api/db_connect.php';

try {
    echo "Debugging Database Structure\n";
    echo "===========================\n\n";

    // Check a specific event
    $eventId = 28; // Change this to a real event ID

    echo "Testing Event ID: $eventId\n\n";

    // Check if event exists
    $stmt = $pdo->prepare("SELECT event_id, event_title, package_id FROM tbl_events WHERE event_id = ?");
    $stmt->execute([$eventId]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$event) {
        echo "Event $eventId does not exist!\n";
        echo "Let's check what events exist...\n";

        $stmt = $pdo->query("SELECT event_id, event_title, package_id FROM tbl_events ORDER BY event_id DESC LIMIT 5");
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo "Recent events:\n";
        foreach ($events as $e) {
            echo "  Event {$e['event_id']}: {$e['event_title']} (Package: {$e['package_id']})\n";
        }
        exit;
    }

    echo "Event: {$event['event_title']}\n";
    echo "Package ID: {$event['package_id']}\n\n";

    // Get event components
    $stmt = $pdo->prepare("
        SELECT
            ec.*,
            pc.inclusion_name as original_component_name,
            pc.components_list as original_component_description
        FROM tbl_event_components ec
        LEFT JOIN tbl_package_inclusions pc ON ec.original_package_component_id = pc.inclusion_id
        WHERE ec.event_id = ?
        ORDER BY ec.display_order
    ");
    $stmt->execute([$eventId]);
    $eventComponents = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($eventComponents)) {
        echo "No event components found!\n";
        echo "This might be why the dropdown is empty.\n";
        exit;
    }

    echo "Found " . count($eventComponents) . " event components:\n\n";

    foreach ($eventComponents as $component) {
        echo "Component: {$component['component_name']}\n";
        echo "Original Package Component ID: " . ($component['original_package_component_id'] ?: 'NULL') . "\n";
        echo "Original Component Name: " . ($component['original_component_name'] ?: 'NULL') . "\n";
        echo "Original Component Description: " . ($component['original_component_description'] ?: 'NULL') . "\n";
        echo "Component Description: " . ($component['component_description'] ?: 'NULL') . "\n";

        // Test the parsing logic
        $subComponents = [];

        // Test fallback parsing
        $rawDescription = isset($component['original_component_description']) ? trim((string)$component['original_component_description']) : '';

        if (empty($rawDescription)) {
            $rawDescription = isset($component['component_description']) ? trim((string)$component['component_description']) : '';
        }

        if ($rawDescription !== '') {
            echo "Parsing: '$rawDescription'\n";
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
            echo "No description to parse\n";
        }

        echo "Final subComponents count: " . count($subComponents) . "\n";
        echo "---\n\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
