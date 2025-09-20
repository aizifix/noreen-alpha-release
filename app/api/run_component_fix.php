<?php
// Database connection
require_once 'db_connect.php';

echo "Starting event component fix...\n";

try {
    // Read the SQL script
    $sql = file_get_contents('fix_duplicate_component_ids.sql');

    // Split the SQL file into individual statements
    $statements = array_filter(
        array_map('trim',
            explode(';', $sql)
        )
    );

    // Execute each statement
    foreach ($statements as $statement) {
        if (!empty($statement)) {
            echo "Executing: " . substr($statement, 0, 50) . "...\n";
            $result = $pdo->query($statement);

            // If this is a SELECT statement, display results
            if (stripos($statement, 'SELECT') === 0) {
                $rows = $result->fetchAll(PDO::FETCH_ASSOC);
                echo "Results: " . count($rows) . " rows\n";

                if (count($rows) > 0) {
                    // Display the issue found
                    if (stripos($statement, 'component_id = 0') !== false) {
                        echo "Found components with ID 0:\n";
                        foreach ($rows as $row) {
                            echo "Event ID: " . $row['event_id'] .
                                 ", Component: " . $row['component_name'] . "\n";
                        }
                    }
                    // Display duplicate component IDs
                    else if (stripos($statement, 'HAVING COUNT(*) > 1') !== false) {
                        echo "Found duplicate component IDs:\n";
                        foreach ($rows as $row) {
                            echo "Component ID: " . $row['component_id'] .
                                 ", Occurrences: " . $row['occurrence_count'] . "\n";
                        }
                    }
                    // Display remaining issues after fix
                    else if (stripos($statement, 'remaining_zero_ids') !== false) {
                        echo "Remaining components with ID 0: " . $rows[0]['remaining_zero_ids'] . "\n";
                    }
                } else {
                    if (stripos($statement, 'component_id = 0') !== false) {
                        echo "No components with ID 0 found.\n";
                    } else if (stripos($statement, 'HAVING COUNT(*) > 1') !== false) {
                        echo "No duplicate component IDs found.\n";
                    }
                }
            }
        }
    }

    echo "Event component fix completed successfully.\n";

} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
    exit(1);
}
