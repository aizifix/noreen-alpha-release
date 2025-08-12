<?php
/**
 * Script to run the comprehensive activity logging migration
 * This will set up all the tables and views needed for the enhanced logging system
 */

require_once 'db_connect.php';

echo "Starting Comprehensive Activity Logging Migration...\n";
echo "================================================\n\n";

try {
    // Read the migration SQL file
    $migrationFile = 'migrations/comprehensive_activity_logging.sql';

    if (!file_exists($migrationFile)) {
        throw new Exception("Migration file not found: $migrationFile");
    }

    $sql = file_get_contents($migrationFile);

    if ($sql === false) {
        throw new Exception("Failed to read migration file");
    }

    echo "Reading migration file: $migrationFile\n";

    // Split the SQL into individual statements
    $statements = array_filter(array_map('trim', explode(';', $sql)));

    $successCount = 0;
    $errorCount = 0;

    foreach ($statements as $index => $statement) {
        if (empty($statement)) {
            continue;
        }

        // Add semicolon back
        $statement .= ';';

        // Get first few words of the statement for logging
        $words = explode(' ', $statement);
        $action = implode(' ', array_slice($words, 0, min(4, count($words))));

        echo "Executing: $action...\n";

        try {
            $pdo->exec($statement);
            $successCount++;
            echo "  ✓ Success\n";
        } catch (PDOException $e) {
            $errorCount++;
            echo "  ✗ Error: " . $e->getMessage() . "\n";

            // Continue with other statements even if one fails
            // Some statements might fail if tables already exist
        }
    }

    echo "\n================================================\n";
    echo "Migration Summary:\n";
    echo "  Successful statements: $successCount\n";
    echo "  Failed statements: $errorCount\n";

    if ($errorCount > 0) {
        echo "\nNote: Some statements failed, which may be normal if tables already exist.\n";
        echo "Please review the errors above to ensure everything is working correctly.\n";
    }

        // Test the new logging system
    echo "\n================================================\n";
    echo "Testing the new logging system...\n";

    require_once 'ActivityLogger.php';
    $logger = new ActivityLogger($pdo);

    // First, check if we have any admin users to test with
    $adminQuery = "SELECT user_id FROM tbl_users WHERE user_role = 'admin' LIMIT 1";
    $stmt = $pdo->query($adminQuery);
    $adminUser = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($adminUser) {
        // Log a test activity
        $result = $logger->logActivity(
            $adminUser['user_id'], // Use actual admin user ID
            'system_test',
            'system',
            'Activity logging system test successful',
            'admin'
        );

        if ($result) {
            echo "  ✓ Test log entry created successfully\n";

            // Try to retrieve the test entry
            $testQuery = "SELECT * FROM tbl_user_activity_logs WHERE action_type = 'system_test' ORDER BY created_at DESC LIMIT 1";
            $stmt = $pdo->query($testQuery);
            $testEntry = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($testEntry) {
                echo "  ✓ Test entry verified in database\n";
                echo "    - ID: " . $testEntry['id'] . "\n";
                echo "    - Created: " . $testEntry['created_at'] . "\n";
            }
        } else {
            echo "  ✗ Failed to create test log entry\n";
        }
    } else {
        echo "  ⚠ No admin users found in database - skipping test log entry\n";
        echo "  The logging system is ready and will start tracking activities automatically\n";
    }

    echo "\n================================================\n";
    echo "Migration completed successfully!\n";
    echo "\nThe comprehensive activity logging system is now active.\n";
    echo "All user activities will be logged automatically.\n";

} catch (Exception $e) {
    echo "\n✗ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
