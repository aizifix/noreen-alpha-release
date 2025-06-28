<?php
include_once 'app/config/dbconnection.php';

echo "<h2>Database Debug for Bookings</h2>";

try {
    // Test basic connection
    echo "<h3>1. Testing database connection:</h3>";
    $stmt = $pdo->query("SELECT 1");
    echo "✓ Database connection working<br>";

    // Test bookings table existence
    echo "<h3>2. Testing bookings table:</h3>";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_bookings");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "✓ Found " . $result['count'] . " bookings in table<br>";

    // Test basic booking fetch
    echo "<h3>3. Testing basic booking fetch:</h3>";
    $stmt = $pdo->query("SELECT * FROM tbl_bookings LIMIT 1");
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($booking) {
        echo "✓ Sample booking:<br>";
        echo "<pre>" . print_r($booking, true) . "</pre>";
    } else {
        echo "✗ No bookings found<br>";
    }

    // Test user table
    echo "<h3>4. Testing users table:</h3>";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_users");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "✓ Found " . $result['count'] . " users in table<br>";

    // Test the full query from getAllBookings
    echo "<h3>5. Testing full getAllBookings query:</h3>";
    $sql = "SELECT b.*,
                COALESCE(u.user_firstName, '') as user_firstName,
                COALESCE(u.user_lastName, '') as user_lastName,
                COALESCE(u.user_email, '') as user_email,
                COALESCE(u.user_contact, '') as user_contact,
                COALESCE(et.event_name, 'Unknown Event Type') as event_type_name,
                COALESCE(v.venue_title, '') as venue_name,
                COALESCE(p.package_title, '') as package_name
            FROM tbl_bookings b
            LEFT JOIN tbl_users u ON b.user_id = u.user_id
            LEFT JOIN tbl_event_type et ON b.event_type_id = et.event_type_id
            LEFT JOIN tbl_venue v ON b.venue_id = v.venue_id
            LEFT JOIN tbl_packages p ON b.package_id = p.package_id
            ORDER BY b.created_at DESC
            LIMIT 1";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $fullBooking = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($fullBooking) {
        echo "✓ Full query result:<br>";
        echo "<pre>" . print_r($fullBooking, true) . "</pre>";
    } else {
        echo "✗ Full query returned no results<br>";
    }

    // Test individual tables
    echo "<h3>6. Testing individual table existence:</h3>";
    $tables = ['tbl_bookings', 'tbl_users', 'tbl_event_type', 'tbl_venue', 'tbl_packages'];
    foreach ($tables as $table) {
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM $table");
            $count = $stmt->fetchColumn();
            echo "✓ $table: $count records<br>";
        } catch (PDOException $e) {
            echo "✗ $table: " . $e->getMessage() . "<br>";
        }
    }

} catch (PDOException $e) {
    echo "✗ Error: " . $e->getMessage() . "<br>";
}
?>
