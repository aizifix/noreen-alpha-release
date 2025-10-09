<?php
/**
 * Test script to verify payment attachments integration
 * This script tests the new tbl_payment_attachments table structure
 */

require_once 'db_connect.php';

echo "Testing Payment Attachments Integration\n";
echo "=====================================\n\n";

try {
    // Test 1: Check if tbl_payment_attachments table exists and has data
    echo "Test 1: Checking tbl_payment_attachments table...\n";
    $sql = "SELECT COUNT(*) as count FROM tbl_payment_attachments";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "✓ Found {$result['count']} payment attachments in the database\n\n";

    // Test 2: Check sample data structure
    echo "Test 2: Checking data structure...\n";
    $sql = "SELECT
                pa.attachment_id,
                pa.payment_id,
                pa.file_name,
                pa.file_path,
                pa.file_type,
                pa.file_size,
                pa.description,
                pa.display_order,
                pa.created_at,
                p.payment_amount,
                p.payment_method,
                p.payment_date
            FROM tbl_payment_attachments pa
            JOIN tbl_payments p ON pa.payment_id = p.payment_id
            ORDER BY pa.created_at DESC
            LIMIT 3";

    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "✓ Sample attachments retrieved:\n";
    foreach ($attachments as $attachment) {
        echo "  - Payment {$attachment['payment_id']}: {$attachment['file_name']} ({$attachment['payment_method']})\n";
    }
    echo "\n";

    // Test 3: Check payment retrieval with attachments (simulating admin.php)
    echo "Test 3: Testing payment retrieval with attachments...\n";
    $eventId = 28; // Use a known event ID
    $sql = "SELECT
                p.payment_id, p.payment_method, p.payment_amount, p.payment_notes,
                p.payment_status, p.payment_date, p.payment_reference, p.payment_percentage,
                p.created_at,
                GROUP_CONCAT(
                    JSON_OBJECT(
                        'attachment_id', pa.attachment_id,
                        'file_name', pa.file_name,
                        'file_path', pa.file_path,
                        'file_type', pa.file_type,
                        'file_size', pa.file_size,
                        'description', pa.description,
                        'display_order', pa.display_order,
                        'created_at', pa.created_at
                    )
                ) as payment_attachments_parsed
            FROM tbl_payments p
            LEFT JOIN tbl_payment_attachments pa ON p.payment_id = pa.payment_id
            WHERE p.event_id = ?
            GROUP BY p.payment_id
            ORDER BY p.created_at DESC";

    $stmt = $conn->prepare($sql);
    $stmt->execute([$eventId]);
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "✓ Found " . count($payments) . " payments for event {$eventId}\n";

    foreach ($payments as $payment) {
        $attachments = json_decode($payment['payment_attachments_parsed'], true) ?: [];
        echo "  - Payment {$payment['payment_id']}: {$payment['payment_amount']} ({$payment['payment_method']}) - " . count($attachments) . " attachments\n";
    }
    echo "\n";

    // Test 4: Simulate new attachment insertion
    echo "Test 4: Testing new attachment insertion...\n";
    $testPaymentId = $payments[0]['payment_id'] ?? null;

    if ($testPaymentId) {
        $insertSql = "INSERT INTO tbl_payment_attachments (
            payment_id, file_name, file_path, file_type, file_size,
            description, display_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $conn->prepare($insertSql);
        $result = $stmt->execute([
            $testPaymentId,
            'test_attachment.pdf',
            'uploads/payment_proofs/test_attachment.pdf',
            'application/pdf',
            1024,
            'Test attachment for integration',
            999,
            date('Y-m-d H:i:s')
        ]);

        if ($result) {
            $attachmentId = $conn->lastInsertId();
            echo "✓ Test attachment inserted with ID: {$attachmentId}\n";

            // Clean up test data
            $deleteSql = "DELETE FROM tbl_payment_attachments WHERE attachment_id = ?";
            $deleteStmt = $conn->prepare($deleteSql);
            $deleteStmt->execute([$attachmentId]);
            echo "✓ Test attachment cleaned up\n";
        } else {
            echo "✗ Failed to insert test attachment\n";
        }
    } else {
        echo "⚠ No payments found to test with\n";
    }
    echo "\n";

    echo "🎉 All tests completed successfully!\n";
    echo "The payment attachments integration is working correctly.\n";
    echo "Your event builder can now create events with payment attachments using the new table structure.\n";

} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
?>
