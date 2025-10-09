<?php
// Clear all booking data from the database
require_once 'app/api/admin.php';

try {
    // Create database connection
    $host = 'localhost';
    $dbname = 'norejixd_miko';
    $username = 'norejixd_admin';
    $password = 'Godisgood_31!';

    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

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

    echo "✅ Successfully cleared $deletedRows booking records from the database.\n";
    echo "✅ Reset booking_id auto increment to 1.\n";
    echo "✅ All booking data has been removed.\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
