<?php
// Simple test file to check API endpoints
echo "<h1>API Testing</h1>";

// Test getPackagesByEventType
echo "<h2>Testing getPackagesByEventType (Others = 5)</h2>";
$url = "http://localhost/events-api/admin.php?operation=getPackagesByEventType&event_type_id=5";
$response = file_get_contents($url);
echo "<pre>" . htmlspecialchars($response) . "</pre>";

// Test getPackageById
echo "<h2>Testing getPackageById (Package 15)</h2>";
$url = "http://localhost/events-api/admin.php?operation=getPackageById&package_id=15";
$response = file_get_contents($url);
echo "<pre>" . htmlspecialchars($response) . "</pre>";

// Test getBookingByReference
echo "<h2>Testing getBookingByReference</h2>";
$url = "http://localhost/events-api/admin.php?operation=getBookingByReference&reference=BK-20250625-1100";
$response = file_get_contents($url);
echo "<pre>" . htmlspecialchars($response) . "</pre>";
?>
