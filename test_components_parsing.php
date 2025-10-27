<?php
/**
 * Test script to verify components_list parsing is working
 */

require_once 'app/api/db_connect.php';

try {
    echo "Testing Components List Parsing\n";
    echo "==============================\n\n";

    // Test with package 1001 which has the data you showed
    $packageId = 1001;

    echo "Testing Package ID: $packageId\n\n";

    // Get package inclusions
    $stmt = $pdo->prepare("
        SELECT inclusion_id, inclusion_name, components_list, inclusion_price
        FROM tbl_package_inclusions
        WHERE package_id = ?
        ORDER BY display_order
    ");
    $stmt->execute([$packageId]);
    $inclusions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($inclusions)) {
        echo "No inclusions found for package $packageId\n";
        exit;
    }

    echo "Found " . count($inclusions) . " inclusions:\n\n";

    foreach ($inclusions as $inclusion) {
        echo "Inclusion: {$inclusion['inclusion_name']}\n";
        echo "Components List: " . ($inclusion['components_list'] ?: 'NULL') . "\n";

        // Test the parsing logic (same as in the API)
        $subComponents = [];
        $rawDescription = isset($inclusion['components_list']) ? trim((string)$inclusion['components_list']) : '';

        if ($rawDescription !== '') {
            // Normalize common delimiters to commas
            $normalized = preg_replace('/[\r\n;•]+/u', ',', $rawDescription);
            $parts = array_filter(array_map('trim', explode(',', (string)$normalized)), function($p) { return $p !== ''; });

            echo "Parsed " . count($parts) . " components:\n";
            foreach ($parts as $part) {
                echo "  - '$part'\n";
                $subComponents[] = [
                    'name' => $part,
                    'price' => 0
                ];
            }
        } else {
            echo "No components to parse\n";
        }

        echo "Final subComponents count: " . count($subComponents) . "\n";
        echo "---\n\n";
    }

    // Now test the actual API call
    echo "Testing API Response Structure:\n";
    echo "==============================\n\n";

    // Simulate the API call
    require_once 'app/api/admin.php';
    $admin = new Admin();

    // Get package details
    $response = $admin->getPackageDetails($packageId);
    $data = json_decode($response, true);

    if ($data['status'] === 'success') {
        $package = $data['package'];
        echo "Package: {$package['package_title']}\n";
        echo "Inclusions count: " . count($package['inclusions']) . "\n\n";

        foreach ($package['inclusions'] as $inclusion) {
            echo "Inclusion: {$inclusion['name']}\n";
            echo "SubComponents count: " . count($inclusion['subComponents']) . "\n";

            if (!empty($inclusion['subComponents'])) {
                echo "Components:\n";
                foreach ($inclusion['subComponents'] as $component) {
                    echo "  - {$component['name']}\n";
                }
            } else {
                echo "No components found!\n";
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
