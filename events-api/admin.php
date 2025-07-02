<?php
require_once '../app/api/db_connect.php';

// Add CORS headers for API access
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Set content type to JSON
header("Content-Type: application/json");

// Error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

class Admin {
    private $conn;
    private $pdo;

    public function __construct($pdo) {
        $this->conn = $pdo;
        $this->pdo = $pdo;  // For compatibility with new methods
    }

    public function createPayment($data) {
        try {
            $this->pdo->beginTransaction();

            // Validate required fields
            if (empty($data['event_id']) || empty($data['client_id']) || empty($data['payment_amount'])) {
                throw new Exception("Event ID, Client ID, and Payment Amount are required");
            }

            // Get event details to validate
            $eventQuery = "SELECT e.*, u.user_firstName, u.user_lastName, u.user_email
                          FROM tbl_events e
                          JOIN tbl_users u ON e.user_id = u.user_id
                          WHERE e.event_id = :event_id";
            $eventStmt = $this->pdo->prepare($eventQuery);
            $eventStmt->bindParam(':event_id', $data['event_id'], PDO::PARAM_INT);
            $eventStmt->execute();
            $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

            if (!$event) {
                throw new Exception("Event not found");
            }

            // Calculate percentage if payment_type is percentage
            $paymentAmount = $data['payment_amount'];
            $paymentPercentage = null;

            if (isset($data['payment_type']) && $data['payment_type'] === 'percentage' && isset($data['payment_percentage'])) {
                $percentage = floatval($data['payment_percentage']);
                $totalBudget = floatval($event['total_budget']);
                $paymentAmount = ($percentage / 100) * $totalBudget;
                $paymentPercentage = $percentage;
            }

            // Insert payment record
            $query = "INSERT INTO tbl_payments (
                        event_id, client_id, payment_amount, payment_method,
                        payment_reference, payment_notes, payment_status,
                        payment_date, due_date, payment_percentage, created_at
                      ) VALUES (
                        :event_id, :client_id, :payment_amount, :payment_method,
                        :payment_reference, :payment_notes, :payment_status,
                        :payment_date, :due_date, :payment_percentage, NOW()
                      )";

            $stmt = $this->pdo->prepare($query);
            $stmt->bindParam(':event_id', $data['event_id'], PDO::PARAM_INT);
            $stmt->bindParam(':client_id', $data['client_id'], PDO::PARAM_INT);
            $stmt->bindParam(':payment_amount', $paymentAmount, PDO::PARAM_STR);
            $stmt->bindParam(':payment_method', $data['payment_method'], PDO::PARAM_STR);
            $stmt->bindParam(':payment_reference', $data['payment_reference'], PDO::PARAM_STR);
            $stmt->bindParam(':payment_notes', $data['payment_notes'], PDO::PARAM_STR);
            $stmt->bindParam(':payment_status', $data['payment_status'], PDO::PARAM_STR);
            $stmt->bindParam(':payment_date', $data['payment_date'], PDO::PARAM_STR);
            $stmt->bindParam(':due_date', $data['due_date'], PDO::PARAM_STR);
            $stmt->bindParam(':payment_percentage', $paymentPercentage, PDO::PARAM_STR);

            $stmt->execute();
            $paymentId = $this->pdo->lastInsertId();

            $this->pdo->commit();

            return json_encode([
                "status" => "success",
                "message" => "Payment created successfully",
                "payment_id" => $paymentId
            ]);

        } catch (Exception $e) {
            $this->pdo->rollBack();
            return json_encode([
                "status" => "error",
                "message" => "Failed to create payment: " . $e->getMessage()
            ]);
        }
    }

    public function uploadPaymentAttachment($eventId, $paymentId, $file, $description = '') {
        try {
            if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
                throw new Exception("No file uploaded or upload error occurred");
            }

            // Validate file type
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'image/webp'];
            if (!in_array($file['type'], $allowedTypes)) {
                throw new Exception("File type not allowed. Please upload images (JPEG, PNG, GIF, WebP) or PDF files only.");
            }

            // Validate file size (max 5MB)
            $maxSize = 5 * 1024 * 1024; // 5MB
            if ($file['size'] > $maxSize) {
                throw new Exception("File size too large. Maximum 5MB allowed.");
            }

            // Create upload directory if it doesn't exist
            $uploadDir = "../app/api/uploads/payment_attachments/";
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            // Generate unique filename
            $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $fileName = time() . '_' . uniqid() . '.' . $fileExtension;
            $filePath = $uploadDir . $fileName;

            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                throw new Exception("Failed to move uploaded file");
            }

            // Insert attachment record into database
            $query = "INSERT INTO tbl_payment_attachments (
                        payment_id, event_id, filename, original_name,
                        description, file_size, file_type, uploaded_at
                      ) VALUES (
                        :payment_id, :event_id, :filename, :original_name,
                        :description, :file_size, :file_type, NOW()
                      )";

            $stmt = $this->pdo->prepare($query);
            $stmt->bindParam(':payment_id', $paymentId, PDO::PARAM_INT);
            $stmt->bindParam(':event_id', $eventId, PDO::PARAM_INT);
            $stmt->bindParam(':filename', $fileName, PDO::PARAM_STR);
            $stmt->bindParam(':original_name', $file['name'], PDO::PARAM_STR);
            $stmt->bindParam(':description', $description, PDO::PARAM_STR);
            $stmt->bindParam(':file_size', $file['size'], PDO::PARAM_INT);
            $stmt->bindParam(':file_type', $file['type'], PDO::PARAM_STR);

            $stmt->execute();

            return json_encode([
                "status" => "success",
                "message" => "File uploaded successfully",
                "filename" => $fileName
            ]);

        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Failed to upload file: " . $e->getMessage()
            ]);
        }
    }

    public function getEventsForPayments($adminId, $searchTerm = '') {
        try {
            $query = "
                SELECT
                    e.event_id,
                    e.event_title,
                    e.event_date,
                    e.user_id as client_id,
                    CONCAT(u.user_firstName, ' ', u.user_lastName) as client_name,
                    u.user_email as client_email,
                    u.user_contact as client_contact,
                    e.total_budget,
                    COALESCE(SUM(p.payment_amount), 0) as total_paid,
                    (e.total_budget - COALESCE(SUM(p.payment_amount), 0)) as remaining_balance,
                    CASE
                        WHEN e.total_budget > 0 THEN
                            ROUND((COALESCE(SUM(p.payment_amount), 0) / e.total_budget) * 100, 2)
                        ELSE 0
                    END as payment_percentage,
                    COUNT(p.payment_id) as payment_count,
                    CASE
                        WHEN COALESCE(SUM(p.payment_amount), 0) >= e.total_budget THEN 'fully_paid'
                        WHEN COALESCE(SUM(p.payment_amount), 0) > 0 THEN 'partial'
                        ELSE 'unpaid'
                    END as event_payment_status
                FROM tbl_events e
                INNER JOIN tbl_users u ON e.user_id = u.user_id
                LEFT JOIN tbl_payments p ON e.event_id = p.event_id AND p.payment_status != 'cancelled'
                WHERE e.admin_id = :admin_id
                    AND (
                        :search_term = '' OR
                        e.event_title LIKE :search_pattern OR
                        CONCAT(u.user_firstName, ' ', u.user_lastName) LIKE :search_pattern OR
                        u.user_email LIKE :search_pattern
                    )
                GROUP BY e.event_id, e.event_title, e.event_date, e.user_id,
                         u.user_firstName, u.user_lastName, u.user_email, u.user_contact, e.total_budget
                ORDER BY e.event_date DESC
            ";

            $stmt = $this->pdo->prepare($query);
            $searchPattern = '%' . $searchTerm . '%';
            $stmt->bindParam(':admin_id', $adminId, PDO::PARAM_INT);
            $stmt->bindParam(':search_term', $searchTerm, PDO::PARAM_STR);
            $stmt->bindParam(':search_pattern', $searchPattern, PDO::PARAM_STR);
            $stmt->execute();

            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "events" => $events
            ]);

        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Failed to fetch events: " . $e->getMessage()
            ]);
        }
    }

    public function getEventPaymentDetails($eventId) {
        try {
            // Get event details with payment summary
            $eventQuery = "
                SELECT
                    e.event_id,
                    e.event_title,
                    e.event_date,
                    e.start_time as event_time,
                    e.user_id as client_id,
                    CONCAT(u.user_firstName, ' ', u.user_lastName) as client_name,
                    u.user_email as client_email,
                    u.user_contact as client_contact,
                    e.total_budget,
                    COALESCE(SUM(p.payment_amount), 0) as total_paid,
                    (e.total_budget - COALESCE(SUM(p.payment_amount), 0)) as remaining_balance,
                    CASE
                        WHEN e.total_budget > 0 THEN
                            ROUND((COALESCE(SUM(p.payment_amount), 0) / e.total_budget) * 100, 2)
                        ELSE 0
                    END as payment_percentage,
                    CASE
                        WHEN COALESCE(SUM(p.payment_amount), 0) >= e.total_budget THEN 'fully_paid'
                        WHEN COALESCE(SUM(p.payment_amount), 0) > 0 THEN 'partial'
                        ELSE 'unpaid'
                    END as event_payment_status,
                    COUNT(p.payment_id) as total_payments,
                    SUM(CASE WHEN p.payment_status = 'paid' OR p.payment_status = 'completed' THEN 1 ELSE 0 END) as completed_payments,
                    SUM(CASE WHEN p.payment_status = 'pending' OR p.payment_status = 'processing' THEN 1 ELSE 0 END) as pending_payments
                FROM tbl_events e
                INNER JOIN tbl_users u ON e.user_id = u.user_id
                LEFT JOIN tbl_payments p ON e.event_id = p.event_id AND p.payment_status != 'cancelled'
                WHERE e.event_id = :event_id
                GROUP BY e.event_id, e.event_title, e.event_date, e.start_time, e.user_id,
                         u.user_firstName, u.user_lastName, u.user_email, u.user_contact, e.total_budget
            ";

            $stmt = $this->pdo->prepare($eventQuery);
            $stmt->bindParam(':event_id', $eventId, PDO::PARAM_INT);
            $stmt->execute();
            $event = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$event) {
                throw new Exception("Event not found");
            }

            // Get payments for this event
            $paymentsQuery = "
                SELECT
                    p.payment_id,
                    p.payment_amount,
                    p.payment_method,
                    p.payment_status,
                    p.payment_date,
                    p.payment_reference,
                    p.payment_notes,
                    p.created_at,
                    p.updated_at,
                    DATE_FORMAT(p.created_at, '%M %d, %Y at %h:%i %p') as formatted_created_at,
                    DATE_FORMAT(p.updated_at, '%M %d, %Y at %h:%i %p') as formatted_updated_at,
                    CONCAT(u.user_firstName, ' ', u.user_lastName) as client_name,
                    COALESCE(p.payment_attachments, '[]') as payment_attachments
                FROM tbl_payments p
                INNER JOIN tbl_users u ON p.client_id = u.user_id
                WHERE p.event_id = :event_id
                ORDER BY p.payment_date DESC, p.created_at DESC
            ";

            $stmt = $this->pdo->prepare($paymentsQuery);
            $stmt->bindParam(':event_id', $eventId, PDO::PARAM_INT);
            $stmt->execute();
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get payment attachments for each payment
            foreach ($payments as &$payment) {
                $attachmentsQuery = "
                    SELECT filename, original_name, description, file_size, file_type, uploaded_at
                    FROM tbl_payment_attachments
                    WHERE payment_id = :payment_id
                    ORDER BY uploaded_at DESC
                ";
                $attachStmt = $this->pdo->prepare($attachmentsQuery);
                $attachStmt->bindParam(':payment_id', $payment['payment_id'], PDO::PARAM_INT);
                $attachStmt->execute();
                $payment['attachments'] = $attachStmt->fetchAll(PDO::FETCH_ASSOC);
            }

            // Get payment summary by method
            $summaryQuery = "
                SELECT
                    payment_method,
                    COUNT(*) as payment_count,
                    SUM(payment_amount) as total_amount
                FROM tbl_payments
                WHERE event_id = :event_id AND payment_status != 'cancelled'
                GROUP BY payment_method
                ORDER BY total_amount DESC
            ";

            $stmt = $this->pdo->prepare($summaryQuery);
            $stmt->bindParam(':event_id', $eventId, PDO::PARAM_INT);
            $stmt->execute();
            $paymentSummary = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "event" => $event,
                "payments" => $payments,
                "payment_summary" => $paymentSummary
            ]);

        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Failed to fetch event payment details: " . $e->getMessage()
            ]);
        }
    }

    public function getEventsWithPaymentStatus($adminId) {
        try {
            $query = "
                SELECT
                    e.event_id,
                    e.event_title,
                    e.event_date,
                    e.total_budget,
                    COALESCE(SUM(p.payment_amount), 0) as total_paid,
                    (e.total_budget - COALESCE(SUM(p.payment_amount), 0)) as remaining_balance,
                    CASE
                        WHEN e.total_budget > 0 THEN
                            ROUND((COALESCE(SUM(p.payment_amount), 0) / e.total_budget) * 100, 2)
                        ELSE 0
                    END as payment_percentage,
                    CASE
                        WHEN COALESCE(SUM(p.payment_amount), 0) >= e.total_budget THEN 'fully_paid'
                        WHEN COALESCE(SUM(p.payment_amount), 0) > 0 THEN 'partial'
                        ELSE 'unpaid'
                    END as event_payment_status,
                    CONCAT(u.user_firstName, ' ', u.user_lastName) as client_name,
                    u.user_id as client_id,
                    u.user_email as client_email,
                    COUNT(p.payment_id) as payment_count
                FROM tbl_events e
                INNER JOIN tbl_users u ON e.user_id = u.user_id
                LEFT JOIN tbl_payments p ON e.event_id = p.event_id AND p.payment_status != 'cancelled'
                WHERE e.admin_id = :admin_id
                GROUP BY e.event_id, e.event_title, e.event_date, e.total_budget,
                         u.user_firstName, u.user_lastName, u.user_id, u.user_email
                ORDER BY e.event_date DESC
            ";

            $stmt = $this->pdo->prepare($query);
            $stmt->bindParam(':admin_id', $adminId, PDO::PARAM_INT);
            $stmt->execute();

            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "events" => $events
            ]);

        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Failed to fetch events with payment status: " . $e->getMessage()
            ]);
        }
    }

    public function getAdminPayments($adminId) {
        try {
            $query = "
                SELECT
                    p.payment_id,
                    p.payment_amount,
                    p.payment_method,
                    p.payment_status,
                    p.payment_date,
                    p.payment_reference,
                    p.payment_notes,
                    p.created_at,
                    e.event_title,
                    e.event_date,
                    e.event_id,
                    CONCAT(u.user_firstName, ' ', u.user_lastName) as client_name
                FROM tbl_payments p
                INNER JOIN tbl_events e ON p.event_id = e.event_id
                INNER JOIN tbl_users u ON p.client_id = u.user_id
                WHERE e.admin_id = :admin_id
                ORDER BY p.payment_date DESC, p.created_at DESC
            ";

            $stmt = $this->pdo->prepare($query);
            $stmt->bindParam(':admin_id', $adminId, PDO::PARAM_INT);
            $stmt->execute();

            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "payments" => $payments
            ]);

        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Failed to fetch admin payments: " . $e->getMessage()
            ]);
        }
    }

    public function getPaymentAnalytics($adminId, $startDate = null, $endDate = null) {
        try {
            $dateCondition = "";
            $params = [':admin_id' => $adminId];

            if ($startDate && $endDate) {
                $dateCondition = "AND p.payment_date BETWEEN :start_date AND :end_date";
                $params[':start_date'] = $startDate;
                $params[':end_date'] = $endDate;
            }

            $query = "
                SELECT
                    COUNT(DISTINCT e.event_id) as total_events,
                    COUNT(p.payment_id) as total_payments,
                    COALESCE(SUM(p.payment_amount), 0) as total_revenue,
                    SUM(CASE WHEN p.payment_status = 'pending' THEN 1 ELSE 0 END) as pending_payments,
                    COALESCE(AVG(p.payment_amount), 0) as average_payment,
                    SUM(CASE WHEN p.payment_method = 'gcash' THEN 1 ELSE 0 END) as gcash_payments,
                    SUM(CASE WHEN p.payment_method = 'bank-transfer' THEN 1 ELSE 0 END) as bank_payments,
                    SUM(CASE WHEN p.payment_method = 'cash' THEN 1 ELSE 0 END) as cash_payments
                FROM tbl_events e
                LEFT JOIN tbl_payments p ON e.event_id = p.event_id AND p.payment_status != 'cancelled'
                WHERE e.admin_id = :admin_id $dateCondition
            ";

            $stmt = $this->pdo->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();

            $analytics = $stmt->fetch(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "analytics" => $analytics
            ]);

        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Failed to fetch payment analytics: " . $e->getMessage()
            ]);
        }
    }

    public function updatePaymentStatus($paymentId, $status, $notes = null) {
        try {
            $this->pdo->beginTransaction();

            // Get payment details first
            $query = "SELECT * FROM tbl_payments WHERE payment_id = :payment_id";
            $stmt = $this->pdo->prepare($query);
            $stmt->bindParam(':payment_id', $paymentId, PDO::PARAM_INT);
            $stmt->execute();
            $payment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$payment) {
                throw new Exception("Payment not found");
            }

            // Update payment status
            $updateQuery = "
                UPDATE tbl_payments
                SET payment_status = :status,
                    payment_notes = CASE
                        WHEN :notes IS NOT NULL THEN CONCAT(COALESCE(payment_notes, ''), '\n', :notes)
                        ELSE payment_notes
                    END,
                    updated_at = NOW()
                WHERE payment_id = :payment_id
            ";

            $stmt = $this->pdo->prepare($updateQuery);
            $stmt->bindParam(':payment_id', $paymentId, PDO::PARAM_INT);
            $stmt->bindParam(':status', $status, PDO::PARAM_STR);
            $stmt->bindParam(':notes', $notes, PDO::PARAM_STR);
            $stmt->execute();

            $this->pdo->commit();

            return json_encode([
                "status" => "success",
                "message" => "Payment status updated successfully"
            ]);

        } catch (Exception $e) {
            $this->pdo->rollBack();
            return json_encode([
                "status" => "error",
                "message" => "Failed to update payment status: " . $e->getMessage()
            ]);
        }
    }

    // Add other necessary methods for compatibility
    public function getVenuesForPackage() {
        try {
            $sql = "SELECT
                        v.venue_id,
                        v.venue_title,
                        v.venue_owner,
                        v.venue_location,
                        v.venue_contact,
                        v.venue_details,
                        v.venue_capacity,
                        v.venue_price,
                        v.venue_type,
                        v.venue_profile_picture,
                        v.venue_cover_photo,
                        v.venue_status
                    FROM tbl_venue v
                    WHERE v.venue_status = 'available'
                    ORDER BY v.venue_title";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $venues = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "venues" => $venues,
                "count" => count($venues)
            ]);
        } catch (Exception $e) {
            error_log("getVenuesForPackage error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function getEventTypes() {
        try {
            $sql = "SELECT event_type_id, event_name, event_description FROM tbl_event_type ORDER BY event_name";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $eventTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return json_encode(["status" => "success", "event_types" => $eventTypes]);
        } catch (Exception $e) {
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function getAllVenues() {
        try {
            $sql = "SELECT * FROM tbl_venue ORDER BY venue_title";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $venues = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return json_encode(["status" => "success", "venues" => $venues]);
        } catch (Exception $e) {
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }
}

// Handle the API request
try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        $input = $_POST;
    }

    $operation = $input['operation'] ?? $_GET['operation'] ?? '';

    if (empty($operation)) {
        echo json_encode(["status" => "error", "message" => "No operation specified"]);
        exit;
    }

    $admin = new Admin($pdo);

    switch ($operation) {
        case "createPayment":
            echo $admin->createPayment($input);
            break;
        case "uploadPaymentAttachment":
            $eventId = $_POST['event_id'] ?? $input['event_id'] ?? 0;
            $paymentId = $_POST['payment_id'] ?? $input['payment_id'] ?? 0;
            $description = $_POST['description'] ?? $input['description'] ?? '';
            $file = $_FILES['file'] ?? null;
            echo $admin->uploadPaymentAttachment($eventId, $paymentId, $file, $description);
            break;
        case "getEventsForPayments":
            $adminId = $_GET['admin_id'] ?? $input['admin_id'] ?? 0;
            $searchTerm = $_GET['search_term'] ?? $input['search_term'] ?? '';
            echo $admin->getEventsForPayments($adminId, $searchTerm);
            break;
        case "getEventPaymentDetails":
            $eventId = $_GET['event_id'] ?? $input['event_id'] ?? 0;
            echo $admin->getEventPaymentDetails($eventId);
            break;
        case "getEventsWithPaymentStatus":
            $adminId = $_GET['admin_id'] ?? $input['admin_id'] ?? 0;
            echo $admin->getEventsWithPaymentStatus($adminId);
            break;
        case "getAdminPayments":
            $adminId = $_GET['admin_id'] ?? $input['admin_id'] ?? 0;
            echo $admin->getAdminPayments($adminId);
            break;
        case "getPaymentAnalytics":
            $adminId = $_GET['admin_id'] ?? $input['admin_id'] ?? 0;
            $startDate = $_GET['start_date'] ?? $input['start_date'] ?? null;
            $endDate = $_GET['end_date'] ?? $input['end_date'] ?? null;
            echo $admin->getPaymentAnalytics($adminId, $startDate, $endDate);
            break;
        case "updatePaymentStatus":
            echo $admin->updatePaymentStatus($input['payment_id'], $input['status'], $input['notes'] ?? null);
            break;
        case "getVenuesForPackage":
            echo $admin->getVenuesForPackage();
            break;
        case "getEventTypes":
            echo $admin->getEventTypes();
            break;
        case "getAllVenues":
            echo $admin->getAllVenues();
            break;
        default:
            echo json_encode(["status" => "error", "message" => "Invalid operation: " . $operation]);
            break;
    }

} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    echo json_encode(["status" => "error", "message" => "Server error: " . $e->getMessage()]);
}
?>
