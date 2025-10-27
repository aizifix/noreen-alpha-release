<?php
/**
 * Debug script to check the actual API response for event details
 */

require_once 'app/api/db_connect.php';

try {
    echo "Debugging Event Details API Response\n";
    echo "===================================\n\n";

    // Test with a specific event
    $eventId = 28; // Change this to a real event ID

    echo "Testing Event ID: $eventId\n\n";

    // Simulate the API call
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
            echo "Original Package Component ID: " . ($component['original_package_component_id'] ?: 'NULL') . "\n";
            echo "SubComponents count: " . count($component['subComponents']) . "\n";

            if (!empty($component['subComponents'])) {
                echo "SubComponents:\n";
                foreach ($component['subComponents'] as $subComp) {
                    echo "  - {$subComp['name']} (₱{$subComp['price']})\n";
                }
            } else {
                echo "No subComponents found!\n";
                echo "Component Description: " . ($component['component_description'] ?: 'NULL') . "\n";
                echo "Original Component Description: " . ($component['original_component_description'] ?: 'NULL') . "\n";
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
