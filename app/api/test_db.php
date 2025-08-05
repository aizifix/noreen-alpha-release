<?php
// Simple database test
$host = 'localhost';
$dbname = 'es_v3';
$username = 'root';
$password = ''; // Try empty password

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✓ Database connected successfully\n";
    
    // Check if tbl_venue exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'tbl_venue'");
    if ($stmt->rowCount() > 0) {
        echo "✓ tbl_venue table exists\n";
        
        // Check if extra_pax_rate column exists
        $stmt = $pdo->query("DESCRIBE tbl_venue");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        if (in_array('extra_pax_rate', $columns)) {
            echo "✓ extra_pax_rate column exists\n";
            
            // Get venue data
            $stmt = $pdo->query("SELECT venue_id, venue_title, venue_price, extra_pax_rate FROM tbl_venue WHERE is_active = 1");
            $venues = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo "\nVenues with pax rates:\n";
            foreach ($venues as $venue) {
                echo sprintf(
                    "ID: %s | %s | Price: %s | Pax Rate: %s\n",
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
            
            if (count($venuesWithPaxRates) === 0) {
                echo "\nNo venues have pax rates. Setting them now...\n";
                
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
            }
            
        } else {
            echo "✗ extra_pax_rate column does not exist\n";
            echo "Adding extra_pax_rate column...\n";
            $pdo->exec("ALTER TABLE `tbl_venue` ADD COLUMN `extra_pax_rate` DECIMAL(10, 2) DEFAULT 0.00 AFTER `venue_price`");
            echo "✓ Column added\n";
        }
        
    } else {
        echo "✗ tbl_venue table does not exist\n";
    }
    
} catch(PDOException $e) {
    echo "✗ Database error: " . $e->getMessage() . "\n";
}
?> 