<?php
// Migration script to add missing columns to tbl_bookings
// Run this once to update your database schema

require_once 'db_connect.php';

header('Content-Type: application/json');

try {
    echo "Starting migration...\n";

    // Check if columns already exist
    $checkSql = "SHOW COLUMNS FROM tbl_bookings LIKE 'start_time'";
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute();

    if ($checkStmt->rowCount() > 0) {
        echo json_encode([
            "status" => "info",
            "message" => "Columns already exist. Migration not needed."
        ]);
        exit;
    }

    // Add missing columns
    $migrations = [
        "ALTER TABLE tbl_bookings ADD COLUMN start_time TIME NULL AFTER event_time",
        "ALTER TABLE tbl_bookings ADD COLUMN end_time TIME NULL AFTER start_time",
        "ALTER TABLE tbl_bookings ADD COLUMN booking_status VARCHAR(20) DEFAULT 'pending' AFTER notes",
        "ALTER TABLE tbl_bookings ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER booking_status"
    ];

    foreach ($migrations as $sql) {
        try {
            $pdo->exec($sql);
            echo "✓ Executed: $sql\n";
        } catch (PDOException $e) {
            // Continue if column already exists
            if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
                echo "ℹ Column already exists, skipping...\n";
            } else {
                throw $e;
            }
        }
    }

    // Update existing records
    $updateSql = "UPDATE tbl_bookings SET booking_status = 'pending' WHERE booking_status IS NULL OR booking_status = ''";
    $pdo->exec($updateSql);
    echo "✓ Updated existing records with default status\n";

    // Add indexes
    $indexes = [
        "ALTER TABLE tbl_bookings ADD INDEX idx_booking_status (booking_status)",
        "ALTER TABLE tbl_bookings ADD INDEX idx_booking_date (event_date)",
        "ALTER TABLE tbl_bookings ADD INDEX idx_booking_user (user_id)"
    ];

    foreach ($indexes as $sql) {
        try {
            $pdo->exec($sql);
            echo "✓ Added index\n";
        } catch (PDOException $e) {
            // Continue if index already exists
            if (strpos($e->getMessage(), 'Duplicate key name') !== false) {
                echo "ℹ Index already exists, skipping...\n";
            } else {
                throw $e;
            }
        }
    }

    // Create view
    $viewSql = "CREATE OR REPLACE VIEW vw_admin_bookings AS
        SELECT
            b.*,
            CONCAT(u.user_firstName, ' ', u.user_lastName) as client_name,
            u.user_email as client_email,
            u.user_contact as client_phone,
            et.event_name as event_type_name,
            v.venue_title as venue_name,
            p.package_title as package_name,
            e.event_id as converted_event_id,
            CASE
                WHEN e.event_id IS NOT NULL THEN 'converted'
                ELSE b.booking_status
            END as effective_status
        FROM tbl_bookings b
        LEFT JOIN tbl_users u ON b.user_id = u.user_id
        LEFT JOIN tbl_event_type et ON b.event_type_id = et.event_type_id
        LEFT JOIN tbl_venue v ON b.venue_id = v.venue_id
        LEFT JOIN tbl_packages p ON b.package_id = p.package_id
        LEFT JOIN tbl_events e ON b.booking_reference = e.original_booking_reference
        ORDER BY b.created_at DESC";

    $pdo->exec($viewSql);
    echo "✓ Created admin bookings view\n";

    echo json_encode([
        "status" => "success",
        "message" => "Migration completed successfully! All booking system enhancements have been applied."
    ]);

} catch (PDOException $e) {
    echo json_encode([
        "status" => "error",
        "message" => "Migration failed: " . $e->getMessage()
    ]);
}
?>
