<?php
/**
 * Cleanup script for expired unverified signups
 * This script should be run periodically (e.g., via cron job) to clean up
 * users who registered but never verified their email
 */

require_once 'db_connect.php';
require_once 'auth.php';

// Set timezone
date_default_timezone_set('Asia/Manila');

try {
    // Initialize Auth class
    $auth = new Auth($pdo);

    // Call the cleanup method
    $result = $auth->cleanupExpiredSignups();
    $response = json_decode($result, true);

    if ($response['status'] === 'success') {
        echo "SUCCESS: " . $response['message'] . "\n";
        error_log("Cleanup completed: " . $response['message']);
    } else {
        echo "ERROR: " . $response['message'] . "\n";
        error_log("Cleanup failed: " . $response['message']);
    }

} catch (Exception $e) {
    echo "FATAL ERROR: " . $e->getMessage() . "\n";
    error_log("Cleanup script fatal error: " . $e->getMessage());
}

// Optional: Also cleanup expired OTPs that are older than 24 hours
try {
    $stmt = $pdo->prepare("DELETE FROM tbl_signup_otp WHERE expires_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)");
    $stmt->execute();
    $deletedOTPs = $stmt->rowCount();

    if ($deletedOTPs > 0) {
        echo "Cleaned up $deletedOTPs expired OTP records\n";
        error_log("Cleaned up $deletedOTPs expired OTP records");
    }
} catch (Exception $e) {
    echo "Warning: Failed to cleanup expired OTPs: " . $e->getMessage() . "\n";
    error_log("Failed to cleanup expired OTPs: " . $e->getMessage());
}

echo "Cleanup script completed at " . date('Y-m-d H:i:s') . "\n";
?>
