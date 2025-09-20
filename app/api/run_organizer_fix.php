<?php
// Database connection
require_once 'db_connect.php';

echo "Starting organizer assignment fix...\n";

try {
    // Read the SQL script
    $sql = file_get_contents('fix_duplicate_organizer_assignments.sql');

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

                // Show the results if it's the duplicate check query
                if (stripos($statement, 'HAVING COUNT(*) > 1') !== false) {
                    if (count($rows) > 0) {
                        echo "Found duplicate assignments:\n";
                        foreach ($rows as $row) {
                            echo "Event ID: " . $row['event_id'] .
                                 ", Assignment Count: " . $row['assignment_count'] . "\n";
                        }
                    } else {
                        echo "No duplicate assignments found.\n";
                    }
                }
            }
        }
    }

    echo "Organizer assignment fix completed successfully.\n";

} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
    exit(1);
}
