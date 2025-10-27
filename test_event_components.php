<?php
/**
 * Test script to verify event components have subComponents populated
 */

require_once 'app/api/db_connect.php';

try {
    echo "Testing Event Components with subComponents\n";
    echo "==========================================\n\n";

    // Test with a specific event
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

        $subComponents = [];

        // Test the parsing logic
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

        // Test fallback parsing
        if (empty($subComponents)) {
            echo "Testing fallback parsing...\n";
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
        }

        echo "Final subComponents count: " . count($subComponents) . "\n";
        echo "---\n\n";
    }

    // Test the actual API call
    echo "Testing Event Details API:\n";
    echo "==========================\n\n";

    require_once 'app/api/admin.php';
    $admin = new Admin();

    $response = $admin->getEventDetails($eventId);
    $data = json_decode($response, true);

    if ($data['status'] === 'success') {
        $event = $data['event'];
        echo "Event: {$event['event_title']}\n";
        echo "Components count: " . count($event['components']) . "\n\n";

        foreach ($event['components'] as $component) {
            echo "Component: {$component['component_name']}\n";
            echo "SubComponents count: " . count($component['subComponents']) . "\n";

            if (!empty($component['subComponents'])) {
                echo "SubComponents:\n";
                foreach ($component['subComponents'] as $subComp) {
                    echo "  - {$subComp['name']}\n";
                }
            } else {
                echo "No subComponents found!\n";
            }
            echo "---\n\n";
        }
    } else {
        echo "API Error: " . ($data['message'] ?? 'Unknown error') . "\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
