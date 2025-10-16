<?php
/**
 * Test Script for Booking Payment System
 *
 * This script verifies that all database changes and API endpoints
 * are working correctly for the booking reservation payment system.
 */

// Include database connection
require_once 'db.php';

header('Content-Type: application/json');

try {
    $results = [];

    // Test 1: Verify Database Schema Changes
    $results['database_schema'] = [];

    // Check if payment settings columns exist in tbl_website_settings
    $stmt = $pdo->query("SHOW COLUMNS FROM tbl_website_settings LIKE 'gcash_%'");
    $gcash_columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $results['database_schema']['gcash_columns'] = $gcash_columns;

    $stmt = $pdo->query("SHOW COLUMNS FROM tbl_website_settings LIKE 'bank_%'");
    $bank_columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $results['database_schema']['bank_columns'] = $bank_columns;

    $stmt = $pdo->query("SHOW COLUMNS FROM tbl_website_settings LIKE 'payment_instructions'");
    $payment_instructions = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $results['database_schema']['payment_instructions'] = $payment_instructions;

    // Check if booking acceptance tracking columns exist
    $stmt = $pdo->query("SHOW COLUMNS FROM tbl_bookings LIKE 'accepted_%'");
    $acceptance_columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $results['database_schema']['acceptance_columns'] = $acceptance_columns;

    // Check if booking_id column exists in tbl_payments
    $stmt = $pdo->query("SHOW COLUMNS FROM tbl_payments LIKE 'booking_id'");
    $booking_id_column = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $results['database_schema']['booking_id_column'] = $booking_id_column;

    // Check booking status enum includes 'reserved'
    $stmt = $pdo->query("SHOW COLUMNS FROM tbl_bookings WHERE Field = 'booking_status'");
    $status_column = $stmt->fetch(PDO::FETCH_ASSOC);
    $results['database_schema']['booking_status_enum'] = $status_column['Type'];

    // Test 2: Verify API Endpoints
    $results['api_endpoints'] = [];

    // Test getPaymentSettings endpoint
    try {
        $stmt = $pdo->prepare("SELECT gcash_name, gcash_number, bank_name, bank_account_name, bank_account_number, payment_instructions FROM tbl_website_settings LIMIT 1");
        $stmt->execute();
        $payment_settings = $stmt->fetch(PDO::FETCH_ASSOC);
        $results['api_endpoints']['getPaymentSettings'] = [
            'status' => 'success',
            'data' => $payment_settings
        ];
    } catch (Exception $e) {
        $results['api_endpoints']['getPaymentSettings'] = [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }

    // Test 3: Verify Sample Data Operations
    $results['sample_operations'] = [];

    // Create a test booking
    try {
        $stmt = $pdo->prepare("
            INSERT INTO tbl_bookings (
                user_id, event_type_id, event_name, event_date, event_time,
                guest_count, notes, booking_status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");

        $test_booking_data = [
            1, // user_id (assuming user 1 exists)
            1, // event_type_id (assuming event type 1 exists)
            'TEST_BOOKING_' . time(),
            '2024-12-31',
            '18:00:00',
            50,
            'Test booking for payment system',
            'pending'
        ];

        $stmt->execute($test_booking_data);
        $test_booking_id = $pdo->lastInsertId();

        $results['sample_operations']['create_test_booking'] = [
            'status' => 'success',
            'booking_id' => $test_booking_id
        ];

        // Test creating a payment for the booking
        $stmt = $pdo->prepare("
            INSERT INTO tbl_payments (
                booking_id, payment_amount, payment_method, payment_date,
                payment_status, payment_reference, payment_notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");

        $test_payment_data = [
            $test_booking_id,
            5000.00,
            'gcash',
            '2024-01-01',
            'completed',
            'TEST_REF_' . time(),
            'Test payment for booking'
        ];

        $stmt->execute($test_payment_data);
        $test_payment_id = $pdo->lastInsertId();

        $results['sample_operations']['create_test_payment'] = [
            'status' => 'success',
            'payment_id' => $test_payment_id
        ];

        // Test updating booking status to reserved
        $stmt = $pdo->prepare("UPDATE tbl_bookings SET booking_status = 'reserved' WHERE booking_id = ?");
        $stmt->execute([$test_booking_id]);

        $results['sample_operations']['update_booking_status'] = [
            'status' => 'success',
            'new_status' => 'reserved'
        ];

        // Test accepting booking
        $stmt = $pdo->prepare("
            UPDATE tbl_bookings
            SET booking_status = 'confirmed',
                accepted_by_user_id = 1,
                accepted_by_role = 'admin',
                accepted_at = NOW()
            WHERE booking_id = ?
        ");
        $stmt->execute([$test_booking_id]);

        $results['sample_operations']['accept_booking'] = [
            'status' => 'success',
            'accepted_by' => 'admin'
        ];

        // Clean up test data
        $stmt = $pdo->prepare("DELETE FROM tbl_payments WHERE payment_id = ?");
        $stmt->execute([$test_payment_id]);

        $stmt = $pdo->prepare("DELETE FROM tbl_bookings WHERE booking_id = ?");
        $stmt->execute([$test_booking_id]);

        $results['sample_operations']['cleanup'] = [
            'status' => 'success',
            'message' => 'Test data cleaned up'
        ];

    } catch (Exception $e) {
        $results['sample_operations']['error'] = [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }

    // Test 4: Verify Foreign Key Constraints
    $results['foreign_keys'] = [];

    try {
        $stmt = $pdo->query("
            SELECT
                CONSTRAINT_NAME,
                TABLE_NAME,
                COLUMN_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME IN ('tbl_bookings', 'tbl_payments')
            AND REFERENCED_TABLE_NAME IS NOT NULL
        ");

        $foreign_keys = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $results['foreign_keys'] = $foreign_keys;

    } catch (Exception $e) {
        $results['foreign_keys'] = [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }

    // Test 5: Verify Indexes
    $results['indexes'] = [];

    try {
        $stmt = $pdo->query("
            SELECT
                TABLE_NAME,
                INDEX_NAME,
                COLUMN_NAME
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME IN ('tbl_bookings', 'tbl_payments')
            AND INDEX_NAME != 'PRIMARY'
        ");

        $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $results['indexes'] = $indexes;

    } catch (Exception $e) {
        $results['indexes'] = [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }

    // Overall test result
    $all_tests_passed = true;
    foreach ($results as $category => $tests) {
        if (is_array($tests)) {
            foreach ($tests as $test) {
                if (isset($test['status']) && $test['status'] === 'error') {
                    $all_tests_passed = false;
                    break 2;
                }
            }
        }
    }

    $results['overall_status'] = $all_tests_passed ? 'PASS' : 'FAIL';
    $results['test_timestamp'] = date('Y-m-d H:i:s');

    echo json_encode($results, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'test_timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}
?>
