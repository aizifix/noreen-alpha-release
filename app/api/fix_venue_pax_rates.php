<?php
// Script to fix venue pax rates
require 'db_connect.php';

echo "=== Fixing Venue Pax Rates ===\n";

try {
    // Check if extra_pax_rate column exists
    $stmt = $pdo->query("DESCRIBE tbl_venue");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (!in_array('extra_pax_rate', $columns)) {
        echo "Adding extra_pax_rate column...\n";
        $pdo->exec("ALTER TABLE `tbl_venue` ADD COLUMN `extra_pax_rate` DECIMAL(10, 2) DEFAULT 0.00 AFTER `venue_price`");
        echo "✓ Column added\n";
    } else {
        echo "✓ extra_pax_rate column exists\n";
    }
    
    // Check current venue data
    $stmt = $pdo->query("SELECT venue_id, venue_title, venue_price, extra_pax_rate FROM tbl_venue WHERE is_active = 1");
    $venues = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "\nCurrent venues:\n";
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
        $stmt = $pdo->query("SELECT venue_id, venue_title, venue_price, extra_pax_rate FROM tbl_venue WHERE is_active = 1");
        $venues = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "\nAfter migration:\n";
        foreach ($venues as $venue) {
            echo sprintf(
                "ID: %s | %s | Price: %s | Pax Rate: %s\n",
                $venue['venue_id'],
                $venue['venue_title'],
                $venue['venue_price'],
                $venue['extra_pax_rate']
            );
        }
    } else {
        echo "\n✓ Venues already have pax rates\n";
    }
    
    // Test the API endpoint
    echo "\n=== Testing API Endpoint ===\n";
    
    $testData = [
        'operation' => 'getAllAvailableVenues'
    ];
    
    $url = 'http://localhost/events-api/admin.php';
    $ch = curl_init();
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    echo "HTTP Code: $httpCode\n";
    if ($error) {
        echo "CURL Error: $error\n";
    }
    
    $decodedResponse = json_decode($response, true);
    if ($decodedResponse && isset($decodedResponse['venues'])) {
        echo "API returned " . count($decodedResponse['venues']) . " venues\n";
        foreach ($decodedResponse['venues'] as $venue) {
            echo sprintf(
                "API Venue: %s | Pax Rate: %s\n",
                $venue['venue_title'],
                $venue['extra_pax_rate']
            );
        }
    } else {
        echo "API Response: $response\n";
    }
    
} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n=== Fix Complete ===\n";
?> 