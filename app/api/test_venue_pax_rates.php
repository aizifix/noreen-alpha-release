<?php
// Test script to check and fix venue pax rates
$host = 'localhost';
$dbname = 'es_v3';
$username = 'root';
$password = ''; // Try empty password first

try {
    // Try connection with empty password
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connected successfully with empty password\n";
} catch(PDOException $e) {
    // If that fails, try with the password from db_connect.php
    $password = 'godisgood';
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        echo "Connected successfully with password\n";
    } catch(PDOException $e) {
        die("Connection failed: " . $e->getMessage() . "\n");
    }
}

echo "\n=== Testing Venue Pax Rates ===\n";

// Check if extra_pax_rate column exists
try {
    $stmt = $pdo->query("DESCRIBE tbl_venue");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (in_array('extra_pax_rate', $columns)) {
        echo "✓ extra_pax_rate column exists\n";
    } else {
        echo "✗ extra_pax_rate column does not exist - adding it...\n";
        
        // Add the column
        $pdo->exec("ALTER TABLE `tbl_venue` ADD COLUMN `extra_pax_rate` DECIMAL(10, 2) DEFAULT 0.00 AFTER `venue_price`");
        echo "✓ extra_pax_rate column added\n";
    }
} catch(PDOException $e) {
    echo "Error checking/adding column: " . $e->getMessage() . "\n";
}

// Check current venue data
try {
    $stmt = $pdo->query("SELECT venue_id, venue_title, venue_price, extra_pax_rate FROM tbl_venue WHERE is_active = 1 LIMIT 10");
    $venues = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "\nCurrent venue data:\n";
    foreach ($venues as $venue) {
        echo sprintf(
            "ID: %s | %s | Price: %s | Extra Pax Rate: %s\n",
            $venue['venue_id'],
            $venue['venue_title'],
            $venue['venue_price'],
            $venue['extra_pax_rate']
        );
    }
    
    // Count venues with pax rates
    $venuesWithPaxRates = array_filter($venues, function($venue) {
        return floatval($venue['extra_pax_rate']) > 0;
    });
    
    echo "\nVenues with pax rates: " . count($venuesWithPaxRates) . " out of " . count($venues) . "\n";
    
    // Apply the migration if no venues have pax rates
    if (count($venuesWithPaxRates) === 0) {
        echo "\nNo venues have pax rates. Applying migration...\n";
        
        // Update venues with example data
        $updates = [
            ['Pearlmont Hotel', 350.00],
            ['Pearlmont Hotel - Package 2', 300.00],
            ['Demiren Hotel', 200.00]
        ];
        
        foreach ($updates as $update) {
            $stmt = $pdo->prepare("UPDATE tbl_venue SET extra_pax_rate = ? WHERE venue_title = ?");
            $result = $stmt->execute([$update[1], $update[0]]);
            
            if ($result) {
                echo "✓ Updated {$update[0]} with pax rate {$update[1]}\n";
            } else {
                echo "✗ Failed to update {$update[0]}\n";
            }
        }
        
        // Check again after update
        $stmt = $pdo->query("SELECT venue_id, venue_title, venue_price, extra_pax_rate FROM tbl_venue WHERE is_active = 1 LIMIT 10");
        $venues = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "\nAfter migration:\n";
        foreach ($venues as $venue) {
            echo sprintf(
                "ID: %s | %s | Price: %s | Extra Pax Rate: %s\n",
                $venue['venue_id'],
                $venue['venue_title'],
                $venue['venue_price'],
                $venue['extra_pax_rate']
            );
        }
    }
    
} catch(PDOException $e) {
    echo "Error checking venue data: " . $e->getMessage() . "\n";
}

echo "\n=== Test Complete ===\n";
?> 