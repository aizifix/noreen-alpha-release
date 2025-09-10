<?php
require_once 'db_connect.php';

if (!$pdo) {
    echo "Database connection failed\n";
    exit();
}

try {
    echo "=== Checking Organizer Assignment Migration ===\n\n";

    // Check if the assignment table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'tbl_event_organizer_assignments'");
    $tableExists = $stmt->rowCount() > 0;

    if ($tableExists) {
        echo "✅ tbl_event_organizer_assignments table exists\n";

        // Check if it has data
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_event_organizer_assignments");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "📊 Assignment table has " . $result['count'] . " records\n";

        if ($result['count'] > 0) {
            echo "\n=== Recent Assignments ===\n";
            $stmt = $pdo->query("
                SELECT
                    eoa.assignment_id,
                    eoa.event_id,
                    eoa.organizer_id,
                    eoa.status,
                    eoa.assigned_at,
                    e.event_title,
                    e.event_date
                FROM tbl_event_organizer_assignments eoa
                JOIN tbl_events e ON eoa.event_id = e.event_id
                ORDER BY eoa.assigned_at DESC
                LIMIT 3
            ");
            $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($assignments as $assignment) {
                echo "Assignment ID: " . $assignment['assignment_id'] . "\n";
                echo "Event: " . $assignment['event_title'] . " (ID: " . $assignment['event_id'] . ")\n";
                echo "Date: " . $assignment['event_date'] . "\n";
                echo "Organizer ID: " . $assignment['organizer_id'] . "\n";
                echo "Status: " . $assignment['status'] . "\n";
                echo "---\n";
            }
        }
    } else {
        echo "❌ tbl_event_organizer_assignments table does not exist\n";
        echo "Running migration...\n";

        // Read and execute the migration file
        $migrationFile = 'migrations/add_organizer_assignment_feature.sql';
        if (file_exists($migrationFile)) {
            $sql = file_get_contents($migrationFile);
            $statements = explode(';', $sql);

            foreach ($statements as $statement) {
                $statement = trim($statement);
                if (!empty($statement) && !preg_match('/^(--|\/\*|DELIMITER)/', $statement)) {
                    try {
                        $pdo->exec($statement);
                        echo "Executed: " . substr($statement, 0, 50) . "...\n";
                    } catch (Exception $e) {
                        echo "Error executing: " . $e->getMessage() . "\n";
                    }
                }
            }
            echo "✅ Migration completed\n";
        } else {
            echo "❌ Migration file not found: $migrationFile\n";
        }
    }

    // Ensure organizer and venue payment status columns exist; if not, run migration
    echo "\n=== Checking organizer/venue payment status columns ===\n";
    $eoaPaymentColExists = false;
    $eventVenuePaymentColExists = false;
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM tbl_event_organizer_assignments LIKE 'payment_status'");
        $eoaPaymentColExists = $stmt->rowCount() > 0;
    } catch (Exception $e) {
        $eoaPaymentColExists = false;
    }
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM tbl_events LIKE 'venue_payment_status'");
        $eventVenuePaymentColExists = $stmt->rowCount() > 0;
    } catch (Exception $e) {
        $eventVenuePaymentColExists = false;
    }

    if ($eoaPaymentColExists && $eventVenuePaymentColExists) {
        echo "✅ Required columns already exist (payment_status on assignments, venue_payment_status on events)\n";
    } else {
        echo "❌ Missing required columns. Applying migration add_organizer_venue_payment_status.sql...\n";
        $migrationFile = 'migrations/add_organizer_venue_payment_status.sql';
        if (file_exists($migrationFile)) {
            $sql = file_get_contents($migrationFile);
            $statements = explode(';', $sql);

            foreach ($statements as $statement) {
                $statement = trim($statement);
                if (!empty($statement) && !preg_match('/^(--|\/\*|DELIMITER)/', $statement)) {
                    try {
                        $pdo->exec($statement);
                        echo "Executed: " . substr($statement, 0, 60) . "...\n";
                    } catch (Exception $e) {
                        echo "Error executing: " . $e->getMessage() . "\n";
                    }
                }
            }
            echo "✅ Migration for organizer/venue payment status completed\n";
        } else {
            echo "❌ Migration file not found: $migrationFile\n";
        }
    }

    // Check if the GetOrganizerEvents procedure exists
    $stmt = $pdo->query("SHOW PROCEDURE STATUS WHERE Name = 'GetOrganizerEvents'");
    $procedureExists = $stmt->rowCount() > 0;

    if ($procedureExists) {
        echo "✅ GetOrganizerEvents procedure exists\n";
    } else {
        echo "❌ GetOrganizerEvents procedure does not exist\n";
        echo "Creating procedure...\n";

        $procedureSql = "
        CREATE PROCEDURE `GetOrganizerEvents`(IN p_organizer_id INT)
        BEGIN
            SELECT
                e.event_id,
                e.event_title,
                e.event_date,
                e.start_time,
                e.end_time,
                e.event_status,
                e.payment_status,
                e.guest_count,
                e.total_budget,
                e.down_payment,
                et.event_type_name,
                v.venue_title,
                v.venue_location,
                CONCAT(c.user_firstName, ' ', c.user_lastName) as client_name,
                c.user_email as client_email,
                c.user_contact as client_contact,
                c.user_pfp as client_pfp,
                eoa.assigned_at,
                eoa.status as assignment_status
            FROM tbl_event_organizer_assignments eoa
            JOIN tbl_events e ON eoa.event_id = e.event_id
            LEFT JOIN tbl_users c ON e.user_id = c.user_id
            LEFT JOIN tbl_event_type et ON e.event_type_id = et.event_type_id
            LEFT JOIN tbl_venue v ON e.venue_id = v.venue_id
            WHERE eoa.organizer_id = p_organizer_id
            AND eoa.status IN ('assigned', 'accepted')
            ORDER BY e.event_date ASC, e.start_time ASC;
        END";

        try {
            $pdo->exec($procedureSql);
            echo "✅ GetOrganizerEvents procedure created\n";
        } catch (Exception $e) {
            echo "❌ Error creating procedure: " . $e->getMessage() . "\n";
        }
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
