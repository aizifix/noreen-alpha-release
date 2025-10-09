<?php
// Clear all booking data endpoint
require_once 'app/api/db_connect.php';

// Set content type to JSON
header("Content-Type: application/json");

try {
    // Disable foreign key checks temporarily
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

    // Clear all booking data
    $stmt = $pdo->prepare("DELETE FROM tbl_bookings");
    $stmt->execute();
    $deletedRows = $stmt->rowCount();

    // Reset auto increment for booking_id
    $pdo->exec("ALTER TABLE tbl_bookings AUTO_INCREMENT = 1");

    // Re-enable foreign key checks
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

    echo json_encode([
        "status" => "success",
        "message" => "All booking data has been cleared",
        "deleted_rows" => $deletedRows
    ]);

} catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => "Error clearing booking data: " . $e->getMessage()
    ]);
}
?>
