<?php
require_once 'db_connect.php';

if (!$pdo) {
    echo "Database connection failed\n";
    exit();
}

try {
    echo "=== Running Organizer Fix Migration ===\n\n";

    // Read the migration file
    $migrationFile = 'migrations/fix_organizer_issues.sql';
    if (!file_exists($migrationFile)) {
        echo "❌ Migration file not found: $migrationFile\n";
        exit();
    }

    $sql = file_get_contents($migrationFile);

    // Split the SQL into individual statements
    $statements = array_filter(array_map('trim', explode(';', $sql)));

    $successCount = 0;
    $errorCount = 0;

    foreach ($statements as $statement) {
        if (empty($statement) || strpos($statement, '--') === 0) {
            continue; // Skip comments and empty lines
        }

        try {
            // Handle DELIMITER statements specially
            if (strpos($statement, 'DELIMITER') === 0) {
                echo "ℹ️  Skipping DELIMITER statement\n";
                continue;
            }

            // Execute the statement
            $result = $pdo->exec($statement);

            if ($result !== false) {
                echo "✅ Executed: " . substr($statement, 0, 50) . "...\n";
                $successCount++;
            } else {
                echo "⚠️  Statement executed but may have warnings: " . substr($statement, 0, 50) . "...\n";
                $successCount++;
            }

        } catch (PDOException $e) {
            // Check if it's a duplicate key error (which we expect for the index)
            if (strpos($e->getMessage(), 'Duplicate key name') !== false) {
                echo "ℹ️  Index already exists (expected): " . substr($statement, 0, 50) . "...\n";
                $successCount++;
            } else {
                echo "❌ Error executing: " . substr($statement, 0, 50) . "...\n";
                echo "   Error: " . $e->getMessage() . "\n";
                $errorCount++;
            }
        }
    }

    echo "\n=== Migration Summary ===\n";
    echo "✅ Successful statements: $successCount\n";
    echo "❌ Failed statements: $errorCount\n";

    if ($errorCount === 0) {
        echo "\n🎉 Migration completed successfully!\n";

        // Test the new functionality
        echo "\n=== Testing New Functionality ===\n";

        // Test 1: Check if the index exists
        try {
            $stmt = $pdo->query("SHOW INDEX FROM tbl_events WHERE Key_name = 'idx_organizer_id'");
            $indexExists = $stmt->rowCount() > 0;
            echo $indexExists ? "✅ Index idx_organizer_id exists\n" : "❌ Index idx_organizer_id not found\n";
        } catch (Exception $e) {
            echo "❌ Error checking index: " . $e->getMessage() . "\n";
        }

        // Test 2: Check if the unique constraint exists
        try {
            $stmt = $pdo->query("SHOW INDEX FROM tbl_event_organizer_assignments WHERE Key_name = 'unique_organizer_date'");
            $constraintExists = $stmt->rowCount() > 0;
            echo $constraintExists ? "✅ Unique constraint unique_organizer_date exists\n" : "❌ Unique constraint unique_organizer_date not found\n";
        } catch (Exception $e) {
            echo "❌ Error checking constraint: " . $e->getMessage() . "\n";
        }

        // Test 3: Check if the procedure exists
        try {
            $stmt = $pdo->query("SHOW PROCEDURE STATUS WHERE Name = 'CheckOrganizerDateConflict'");
            $procedureExists = $stmt->rowCount() > 0;
            echo $procedureExists ? "✅ Procedure CheckOrganizerDateConflict exists\n" : "❌ Procedure CheckOrganizerDateConflict not found\n";
        } catch (Exception $e) {
            echo "❌ Error checking procedure: " . $e->getMessage() . "\n";
        }

        // Test 4: Check if the trigger exists
        try {
            $stmt = $pdo->query("SHOW TRIGGERS WHERE `Trigger` = 'prevent_organizer_date_conflict'");
            $triggerExists = $stmt->rowCount() > 0;
            echo $triggerExists ? "✅ Trigger prevent_organizer_date_conflict exists\n" : "❌ Trigger prevent_organizer_date_conflict not found\n";
        } catch (Exception $e) {
            echo "❌ Error checking trigger: " . $e->getMessage() . "\n";
        }

        // Test 5: Check for any existing duplicate assignments
        try {
            $stmt = $pdo->query("
                SELECT
                    eoa.organizer_id,
                    e.event_date,
                    COUNT(*) as assignment_count
                FROM tbl_event_organizer_assignments eoa
                JOIN tbl_events e ON eoa.event_id = e.event_id
                WHERE eoa.status IN ('assigned', 'accepted')
                AND e.event_status NOT IN ('cancelled', 'done')
                GROUP BY eoa.organizer_id, e.event_date
                HAVING COUNT(*) > 1
            ");
            $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($duplicates)) {
                echo "✅ No duplicate organizer assignments found\n";
            } else {
                echo "⚠️  Found " . count($duplicates) . " duplicate organizer assignments:\n";
                foreach ($duplicates as $duplicate) {
                    echo "   - Organizer ID: " . $duplicate['organizer_id'] . ", Date: " . $duplicate['event_date'] . " (" . $duplicate['assignment_count'] . " assignments)\n";
                }

                // Offer to clean up duplicates
                echo "\nWould you like to clean up these duplicates? (y/n): ";
                $handle = fopen("php://stdin", "r");
                $line = fgets($handle);
                fclose($handle);

                if (trim(strtolower($line)) === 'y') {
                    try {
                        $pdo->exec("CALL CleanupDuplicateOrganizerAssignments()");
                        echo "✅ Duplicate assignments cleaned up\n";
                    } catch (Exception $e) {
                        echo "❌ Error cleaning up duplicates: " . $e->getMessage() . "\n";
                    }
                }
            }
        } catch (Exception $e) {
            echo "❌ Error checking duplicates: " . $e->getMessage() . "\n";
        }

    } else {
        echo "\n⚠️  Migration completed with errors. Please review the errors above.\n";
    }

} catch (Exception $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
}
?>
