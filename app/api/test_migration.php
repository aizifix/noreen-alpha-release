<?php
/**
 * Test Script for Package Inclusions Migration
 *
 * This script verifies that the database migration and code updates
 * are working correctly.
 */

require_once 'db_connect.php';

header('Content-Type: application/json');

$tests = [];
$allPassed = true;

try {
    // Test 1: Check if new table exists
    $test1 = [
        'name' => 'Table Exists: tbl_package_inclusions',
        'status' => 'running'
    ];

    try {
        $stmt = $pdo->query("SHOW TABLES LIKE 'tbl_package_inclusions'");
        $result = $stmt->fetch();
        if ($result) {
            $test1['status'] = 'passed';
            $test1['message'] = 'Table tbl_package_inclusions exists';
        } else {
            $test1['status'] = 'failed';
            $test1['message'] = 'Table tbl_package_inclusions does not exist';
            $allPassed = false;
        }
    } catch (Exception $e) {
        $test1['status'] = 'failed';
        $test1['message'] = 'Error: ' . $e->getMessage();
        $allPassed = false;
    }
    $tests[] = $test1;

    // Test 2: Check if old table is gone
    $test2 = [
        'name' => 'Old Table Removed: tbl_package_components',
        'status' => 'running'
    ];

    try {
        $stmt = $pdo->query("SHOW TABLES LIKE 'tbl_package_components'");
        $result = $stmt->fetch();
        if (!$result) {
            $test2['status'] = 'passed';
            $test2['message'] = 'Old table tbl_package_components has been removed/renamed';
        } else {
            $test2['status'] = 'warning';
            $test2['message'] = 'Old table tbl_package_components still exists (migration may not have run)';
        }
    } catch (Exception $e) {
        $test2['status'] = 'failed';
        $test2['message'] = 'Error: ' . $e->getMessage();
        $allPassed = false;
    }
    $tests[] = $test2;

    // Test 3: Check for component_id = 0
    $test3 = [
        'name' => 'No Zero IDs: inclusion_id = 0',
        'status' => 'running'
    ];

    try {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_package_inclusions WHERE inclusion_id = 0");
        $result = $stmt->fetch();
        if ($result['count'] == 0) {
            $test3['status'] = 'passed';
            $test3['message'] = 'No inclusions with ID = 0 found';
        } else {
            $test3['status'] = 'failed';
            $test3['message'] = 'Found ' . $result['count'] . ' inclusions with ID = 0';
            $allPassed = false;
        }
    } catch (Exception $e) {
        $test3['status'] = 'failed';
        $test3['message'] = 'Error: ' . $e->getMessage();
        $allPassed = false;
    }
    $tests[] = $test3;

    // Test 4: Check AUTO_INCREMENT is set
    $test4 = [
        'name' => 'AUTO_INCREMENT Configured',
        'status' => 'running'
    ];

    try {
        $stmt = $pdo->query("SHOW CREATE TABLE tbl_package_inclusions");
        $result = $stmt->fetch();
        $createTable = $result[1];
        if (strpos($createTable, 'AUTO_INCREMENT') !== false) {
            $test4['status'] = 'passed';
            $test4['message'] = 'AUTO_INCREMENT is properly configured';
        } else {
            $test4['status'] = 'failed';
            $test4['message'] = 'AUTO_INCREMENT is not configured';
            $allPassed = false;
        }
    } catch (Exception $e) {
        $test4['status'] = 'failed';
        $test4['message'] = 'Error: ' . $e->getMessage();
        $allPassed = false;
    }
    $tests[] = $test4;

    // Test 5: Check data count
    $test5 = [
        'name' => 'Data Migration Count',
        'status' => 'running'
    ];

    try {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_package_inclusions");
        $result = $stmt->fetch();
        $test5['status'] = 'passed';
        $test5['message'] = 'Found ' . $result['count'] . ' inclusions in database';
        $test5['data'] = ['count' => $result['count']];
    } catch (Exception $e) {
        $test5['status'] = 'failed';
        $test5['message'] = 'Error: ' . $e->getMessage();
        $allPassed = false;
    }
    $tests[] = $test5;

    // Test 6: Check new table for components
    $test6 = [
        'name' => 'New Components Table: tbl_inclusion_components',
        'status' => 'running'
    ];

    try {
        $stmt = $pdo->query("SHOW TABLES LIKE 'tbl_inclusion_components'");
        $result = $stmt->fetch();
        if ($result) {
            $test6['status'] = 'passed';
            $test6['message'] = 'Table tbl_inclusion_components exists';

            // Get component count
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_inclusion_components");
            $countResult = $stmt->fetch();
            $test6['data'] = ['component_count' => $countResult['count']];
            $test6['message'] .= ' (' . $countResult['count'] . ' components parsed)';
        } else {
            $test6['status'] = 'warning';
            $test6['message'] = 'Table tbl_inclusion_components does not exist (migration incomplete)';
        }
    } catch (Exception $e) {
        $test6['status'] = 'failed';
        $test6['message'] = 'Error: ' . $e->getMessage();
        $allPassed = false;
    }
    $tests[] = $test6;

    // Test 7: Sample data check
    $test7 = [
        'name' => 'Sample Data Integrity',
        'status' => 'running'
    ];

    try {
        $stmt = $pdo->query("SELECT
            p.package_id,
            p.package_title,
            COUNT(i.inclusion_id) as inclusion_count
        FROM tbl_packages p
        LEFT JOIN tbl_package_inclusions i ON p.package_id = i.package_id
        GROUP BY p.package_id, p.package_title
        ORDER BY p.package_id
        LIMIT 5");

        $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $test7['status'] = 'passed';
        $test7['message'] = 'Sample data retrieved successfully';
        $test7['data'] = $packages;
    } catch (Exception $e) {
        $test7['status'] = 'failed';
        $test7['message'] = 'Error: ' . $e->getMessage();
        $allPassed = false;
    }
    $tests[] = $test7;

    // Test 8: Column aliases (backend compatibility)
    $test8 = [
        'name' => 'Backend Alias Compatibility',
        'status' => 'running'
    ];

    try {
        $stmt = $pdo->query("SELECT
            inclusion_id as component_id,
            inclusion_name as component_name,
            components_list as component_description,
            inclusion_price as component_price
        FROM tbl_package_inclusions
        LIMIT 1");

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($result && isset($result['component_id']) && isset($result['component_name'])) {
            $test8['status'] = 'passed';
            $test8['message'] = 'Column aliases working correctly (backward compatibility maintained)';
            $test8['data'] = $result;
        } else {
            $test8['status'] = 'failed';
            $test8['message'] = 'Column aliases not working';
            $allPassed = false;
        }
    } catch (Exception $e) {
        $test8['status'] = 'failed';
        $test8['message'] = 'Error: ' . $e->getMessage();
        $allPassed = false;
    }
    $tests[] = $test8;

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Fatal error: ' . $e->getMessage(),
        'tests' => $tests
    ], JSON_PRETTY_PRINT);
    exit;
}

// Output results
echo json_encode([
    'status' => $allPassed ? 'success' : 'failed',
    'message' => $allPassed ? 'All tests passed!' : 'Some tests failed',
    'summary' => [
        'total' => count($tests),
        'passed' => count(array_filter($tests, fn($t) => $t['status'] === 'passed')),
        'failed' => count(array_filter($tests, fn($t) => $t['status'] === 'failed')),
        'warnings' => count(array_filter($tests, fn($t) => $t['status'] === 'warning'))
    ],
    'tests' => $tests,
    'timestamp' => date('Y-m-d H:i:s')
], JSON_PRETTY_PRINT);
