<?php
// Quick diagnostic script to check revenue data
$host = 'localhost';
$dbname = 'es_v3';
$username = 'root';
$password = ''; // Try empty password first

echo "=== Revenue Data Diagnostic ===\n\n";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✓ Connected to database\n\n";
} catch(PDOException $e) {
    $password = 'godisgood';
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        echo "✓ Connected to database\n\n";
    } catch(PDOException $e) {
        die("✗ Connection failed: " . $e->getMessage() . "\n");
    }
}

// Check if required columns exist
echo "=== Checking tbl_payments structure ===\n";
$stmt = $pdo->query("DESCRIBE tbl_payments");
$columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "Columns found: " . implode(", ", $columns) . "\n\n";

$requiredColumns = ['schedule_id', 'payment_percentage', 'payment_reference'];
$missingColumns = [];
foreach ($requiredColumns as $col) {
    if (!in_array($col, $columns)) {
        $missingColumns[] = $col;
    }
}

if (!empty($missingColumns)) {
    echo "⚠ WARNING: Missing columns: " . implode(", ", $missingColumns) . "\n";
    echo "✗ You MUST run the migration first!\n";
    echo "Run: php run_payment_percentage_migration.php\n\n";
    exit(1);
} else {
    echo "✓ All required columns exist\n\n";
}

// Check total payments
echo "=== Checking Payment Data ===\n";
$stmt = $pdo->query("SELECT COUNT(*) as total FROM tbl_payments");
$totalPayments = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
echo "Total payments in database: $totalPayments\n";

// Check completed payments
$stmt = $pdo->query("SELECT COUNT(*) as total FROM tbl_payments WHERE payment_status = 'completed'");
$completedPayments = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
echo "Completed payments: $completedPayments\n";

// Check total revenue
$stmt = $pdo->query("SELECT COALESCE(SUM(payment_amount), 0) as total_revenue FROM tbl_payments WHERE payment_status = 'completed'");
$totalRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['total_revenue'];
echo "Total revenue from completed payments: ₱" . number_format($totalRevenue, 2) . "\n\n";

if ($totalRevenue == 0) {
    echo "⚠ WARNING: Total revenue is 0!\n";
    echo "Possible reasons:\n";
    echo "1. No completed payments in the database\n";
    echo "2. All payments have status other than 'completed'\n";
    echo "3. Payment amounts are all 0\n\n";

    // Show payment status breakdown
    echo "=== Payment Status Breakdown ===\n";
    $stmt = $pdo->query("
        SELECT
            payment_status,
            COUNT(*) as count,
            SUM(payment_amount) as total_amount
        FROM tbl_payments
        GROUP BY payment_status
    ");
    $statusBreakdown = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($statusBreakdown as $row) {
        echo "  {$row['payment_status']}: {$row['count']} payments, ₱" . number_format($row['total_amount'], 2) . "\n";
    }
    echo "\n";

    // Show sample payments
    echo "=== Sample Payments ===\n";
    $stmt = $pdo->query("SELECT payment_id, event_id, payment_amount, payment_status, payment_date FROM tbl_payments LIMIT 5");
    $samplePayments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($samplePayments as $payment) {
        echo "  Payment {$payment['payment_id']}: Event {$payment['event_id']}, ₱" .
             number_format($payment['payment_amount'], 2) . " - {$payment['payment_status']} ({$payment['payment_date']})\n";
    }
} else {
    echo "✓ Revenue data looks good!\n";
}

echo "\n=== Revenue by Admin ===\n";
$stmt = $pdo->query("
    SELECT
        e.admin_id,
        CONCAT(u.user_firstName, ' ', u.user_lastName) as admin_name,
        COUNT(DISTINCT e.event_id) as total_events,
        COALESCE(SUM(p.payment_amount), 0) as total_revenue
    FROM tbl_events e
    LEFT JOIN tbl_payments p ON e.event_id = p.event_id AND p.payment_status = 'completed'
    LEFT JOIN tbl_users u ON e.admin_id = u.user_id
    GROUP BY e.admin_id, admin_name
    ORDER BY total_revenue DESC
");
$adminRevenue = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($adminRevenue as $admin) {
    echo "  Admin {$admin['admin_id']} ({$admin['admin_name']}): ";
    echo "{$admin['total_events']} events, ₱" . number_format($admin['total_revenue'], 2) . "\n";
}

echo "\n=== Diagnostic Complete ===\n";
