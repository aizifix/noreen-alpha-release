<?php
// Start output buffering to prevent any accidental output
ob_start();

require 'db_connect.php';
require_once 'ActivityLogger.php';

// Add CORS headers for API access
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Set content type to JSON
header("Content-Type: application/json");

// Error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors directly, return them as JSON
ini_set('log_errors', 1);
ini_set('error_log', 'php_errors.log');

// Custom error handler to return JSON errors
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("PHP Error: $errstr in $errfile on line $errline");
    header('Content-Type: application/json');
    echo json_encode([
        "status" => "error",
        "message" => "Server error occurred",
        "debug" => [
            "error" => $errstr,
            "file" => basename($errfile),
            "line" => $errline
        ]
    ]);
    exit;
});

class Staff {
    private $conn;
    private $pdo;
    private $logger;

    public function __construct($pdo) {
        $this->conn = $pdo;
        $this->pdo = $pdo;  // For compatibility with new methods
        $this->logger = new ActivityLogger($pdo); // Re-enabled for staff activity tracking
    }

    // Staff-specific permission checking
    private function hasStaffPermission($module, $action) {
        // Staff permissions matrix - more restrictive than admin
        $permissions = [
            'dashboard' => ['view'],
            'reports' => ['view'],
            'events' => ['view', 'update'], // Can view and update events, but not create/delete
            'event_builder' => ['partial'], // Limited event creation
            'bookings' => ['create', 'edit', 'verify_payment'],
            'packages' => ['view'],
            'venues' => ['view'],
            'clients' => ['create', 'edit'],
            'organizers' => ['view'],
            'suppliers' => ['view'],
            'staff' => ['view_own'], // Can only view own profile
            'payments' => ['record', 'verify']
        ];

        return isset($permissions[$module]) && in_array($action, $permissions[$module]);
    }

    // Check if staff user has permission for specific action
    private function checkStaffAccess($module, $action) {
        if (!$this->hasStaffPermission($module, $action)) {
            return json_encode(["status" => "error", "message" => "Access denied - insufficient permissions"]);
        }
        return null; // No error, access granted
    }

    // Global collation enforcement method - Enhanced with stronger enforcement
    private function enforceCollation() {
        try {
            // Set session level collation settings
            $this->conn->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
            $this->conn->exec("SET SESSION collation_connection = 'utf8mb4_unicode_ci'");
            $this->conn->exec("SET SESSION collation_database = 'utf8mb4_unicode_ci'");
            $this->conn->exec("SET SESSION collation_server = 'utf8mb4_unicode_ci'");
            $this->conn->exec("SET SESSION character_set_connection = 'utf8mb4'");
            $this->conn->exec("SET SESSION character_set_database = 'utf8mb4'");
            $this->conn->exec("SET SESSION character_set_server = 'utf8mb4'");
            $this->conn->exec("SET SESSION sql_mode = ''");
            error_log("Collation enforcement applied successfully");
        } catch (Exception $e) {
            error_log("Collation enforcement failed: " . $e->getMessage());
        }
    }

    /**
     * Helper function to ensure consistent collation for string fields
     * @param string $field Database field name or string literal
     * @return string SQL expression with proper collation
     */
    private function convertField($field) {
        return "CONVERT($field USING utf8mb4) COLLATE utf8mb4_unicode_ci";
    }

    /**
     * Helper function for safe concatenation of fields with consistent collation
     * @param array $parts Array of field names or string literals to concatenate
     * @return string SQL CONCAT statement with proper collation
     */
    private function safeConcat($parts) {
        $convertedParts = [];
        foreach ($parts as $part) {
            // Check if this is a literal string (starts and ends with quote marks)
            if ((substr($part, 0, 1) === "'" && substr($part, -1) === "'") ||
                (substr($part, 0, 1) === '"' && substr($part, -1) === '"')) {
                // It's a string literal, keep as is but add collation
                $convertedParts[] = "$part COLLATE utf8mb4_unicode_ci";
            } else {
                // It's a field name, so convert it
                $convertedParts[] = $this->convertField($part);
            }
        }
        return "CONCAT(" . implode(", ", $convertedParts) . ")";
    }

    /**
     * Helper function to check if a column exists in a table
     * @param string $tableName The table name
     * @param string $columnName The column name
     * @return bool True if column exists, false otherwise
     */
    private function checkColumnExists($tableName, $columnName) {
        try {
            $sql = "SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = ?
                    AND COLUMN_NAME = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$tableName, $columnName]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] > 0;
        } catch (Exception $e) {
            error_log("Error checking column existence: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Helper function to validate if a supplier exists
     * @param int $supplierId The supplier ID to validate
     * @return bool True if supplier exists, false otherwise
     */
    private function validateSupplierExists($supplierId) {
        try {
            $sql = "SELECT COUNT(*) as count FROM tbl_suppliers WHERE supplier_id = ? AND is_active = 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$supplierId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] > 0;
        } catch (Exception $e) {
            error_log("Error validating supplier: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Helper function to validate if an offer exists
     * @param mixed $offerId The offer ID to validate (can be int or string)
     * @return bool True if offer exists, false otherwise
     */
    private function validateOfferExists($offerId) {
        try {
            // If offer_id starts with 'json_', it's a virtual offer from registration_docs
            // These don't exist in the database, so we consider them valid
            if (is_string($offerId) && strpos($offerId, 'json_') === 0) {
                return true;
            }

            // For numeric offer_ids, check if they exist in the database
            $sql = "SELECT COUNT(*) as count FROM tbl_supplier_offers WHERE offer_id = ? AND is_active = 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$offerId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] > 0;
        } catch (Exception $e) {
            error_log("Error validating offer: " . $e->getMessage());
            return false;
        }
    }

    // Simple bypass method for problematic queries
    private function safeExecute($sql, $params = []) {
        try {
            $this->enforceCollation();
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), '1271') !== false) {
                error_log("Collation error detected, retrying with explicit conversion");
                // Retry with explicit collation conversion
                $this->enforceCollation();
                $stmt = $this->conn->prepare($sql);
                $stmt->execute($params);
                return $stmt;
            }
            throw $e;
        }
    }

    // Ultra-simple payment insertion method that bypasses all collation issues
    private function insertPaymentSimple($eventId, $clientId, $paymentMethod, $amount, $notes, $status, $date, $reference = null, $percentage = null, $attachments = null) {
        try {
            // Enforce collation settings before insertion
            $this->enforceCollation();

            // Insert payment without attachments (we'll handle them separately in the new table)
            $sql = "INSERT INTO tbl_payments (
                event_id,
                client_id,
                payment_method,
                payment_amount,
                payment_notes,
                payment_status,
                payment_date,
                payment_reference,
                payment_percentage
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

            error_log("insertPaymentSimple: Starting payment insertion");
            error_log("insertPaymentSimple: Event ID: $eventId, Client ID: $clientId, Amount: $amount, Status: $status, Attachments: " . (is_array($attachments) ? count($attachments) : 'NULL'));
            error_log("insertPaymentSimple: Payment method: $paymentMethod, Date: $date, Reference: " . ($reference ?? 'NULL'));

            $stmt = $this->conn->prepare($sql);
            $executeParams = [
                intval($eventId),
                intval($clientId),
                $paymentMethod,
                floatval($amount),
                $notes,
                $status,
                $date,
                $reference,
                $percentage ? floatval($percentage) : null
            ];
            error_log("insertPaymentSimple: Execute parameters: " . json_encode($executeParams));

            $result = $stmt->execute($executeParams);
            error_log("insertPaymentSimple: Execute result: " . ($result ? 'SUCCESS' : 'FAILED'));

            if ($result) {
                $paymentId = $this->conn->lastInsertId();
                error_log("insertPaymentSimple: Payment created successfully with ID: " . $paymentId);

                // Attachments intentionally ignored per simplified payment model

                return $paymentId;
            } else {
                error_log("insertPaymentSimple: CRITICAL - Payment insertion failed, no rows affected");
                return false;
            }
        } catch (PDOException $e) {
            error_log("Simple payment insertion failed: " . $e->getMessage());
            error_log("SQL Error Code: " . $e->getCode());
            error_log("SQL Error Info: " . print_r($e->errorInfo, true));
            throw $e;
        }
    }

    // Helper method to calculate payment percentage
    private function calculatePaymentPercentage($amount, $totalBudget) {
        if ($totalBudget <= 0) return null;
        return round(($amount / $totalBudget) * 100, 2);
    }

    // Emergency fallback method that completely avoids collation issues
    private function createEventMinimal($data) {
        try {
            // Create the event with more essential fields to avoid NULL values
            $sql = "INSERT INTO tbl_events (
                user_id, admin_id, organizer_id, event_title, event_theme,
                event_description, event_type_id, guest_count, event_date,
                start_time, end_time, package_id, venue_id, total_budget,
                down_payment, payment_method, payment_schedule_type_id,
                reference_number, additional_notes, event_status, venue_payment_status,
                payment_status, event_attachments, client_signature
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            // Process event attachments
            $attachmentsJson = null;
            if (isset($data['event_attachments']) && is_array($data['event_attachments']) && !empty($data['event_attachments'])) {
                error_log("Processing " . count($data['event_attachments']) . " attachments for minimal event creation");
                $attachmentsJson = json_encode($data['event_attachments']);
                error_log("Encoded attachments: " . substr($attachmentsJson, 0, 100) . "...");
            }

            // Prepare signature
            $clientSignature = isset($data['client_signature']) ? $data['client_signature'] : null;

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                intval($data['user_id']),
                intval($data['admin_id']),
                isset($data['organizer_id']) ? intval($data['organizer_id']) : null,
                $data['event_title'],
                isset($data['event_theme']) ? $data['event_theme'] : null,
                isset($data['event_description']) ? $data['event_description'] : null,
                intval($data['event_type_id']),
                intval($data['guest_count']),
                $data['event_date'],
                isset($data['start_time']) ? $data['start_time'] : '00:00:00',
                isset($data['end_time']) ? $data['end_time'] : '23:59:59',
                isset($data['package_id']) ? intval($data['package_id']) : null,
                isset($data['venue_id']) ? intval($data['venue_id']) : null,
                isset($data['total_budget']) ? floatval($data['total_budget']) : 0.00,
                isset($data['down_payment']) ? floatval($data['down_payment']) : 0.00,
                isset($data['payment_method']) ? $data['payment_method'] : 'cash',
                isset($data['payment_schedule_type_id']) ? intval($data['payment_schedule_type_id']) : 2,
                isset($data['reference_number']) ? $data['reference_number'] : null,
                isset($data['additional_notes']) ? $data['additional_notes'] : null,
                isset($data['event_status']) ? $data['event_status'] : 'draft',
                'unpaid',
                'unpaid',
                $attachmentsJson,
                $clientSignature
            ]);

            $eventId = $this->conn->lastInsertId();

            // Handle payment attachments if available
            if (isset($data['payment_attachments']) && is_array($data['payment_attachments']) && !empty($data['payment_attachments'])) {
                error_log("Processing payment attachments for minimal event creation");
                try {
                    foreach ($data['payment_attachments'] as $attachment) {
                        if (!isset($attachment['file_path']) || !file_exists($attachment['file_path'])) {
                            error_log("Payment attachment file not found: " . ($attachment['file_path'] ?? 'undefined'));
                            continue;
                        }

                        $sql = "INSERT INTO tbl_payment_attachments (
                            event_id, original_filename, stored_filename, file_path, file_type, description
                        ) VALUES (?, ?, ?, ?, ?, ?)";

                        $paymentStmt = $this->conn->prepare($sql);
                        $paymentStmt->execute([
                            $eventId,
                            $attachment['original_name'] ?? 'unknown',
                            $attachment['file_name'] ?? 'unknown',
                            $attachment['file_path'] ?? '',
                            $attachment['file_type'] ?? 'application/octet-stream',
                            $attachment['description'] ?? ''
                        ]);
                    }
                } catch (Exception $e) {
                    error_log("Failed to save payment attachments in minimal mode: " . $e->getMessage());
                    // Continue without failing the entire transaction
                }
            }

            // Process event components if available
            if (isset($data['components']) && is_array($data['components']) && !empty($data['components'])) {
                error_log("Processing " . count($data['components']) . " components for minimal event creation");
                try {
                    foreach ($data['components'] as $index => $component) {
                        $sql = "INSERT INTO tbl_event_components (
                            event_id, component_name, component_price, component_description,
                            is_custom, is_included, original_package_component_id,
                            supplier_id, offer_id, display_order
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

                        $componentStmt = $this->conn->prepare($sql);
                        $componentStmt->execute([
                            $eventId,
                            $component['component_name'] ?? 'Unknown Component',
                            floatval($component['component_price'] ?? 0),
                            $component['component_description'] ?? '',
                            isset($component['is_custom']) ? (bool)$component['is_custom'] : false,
                            isset($component['is_included']) ? (bool)$component['is_included'] : true,
                            isset($component['original_package_component_id']) ? intval($component['original_package_component_id']) : null,
                            isset($component['supplier_id']) ? intval($component['supplier_id']) : null,
                            isset($component['offer_id']) ? intval($component['offer_id']) : null,
                            $index
                        ]);
                    }
                    error_log("Successfully saved " . count($data['components']) . " components");
                } catch (Exception $e) {
                    error_log("Failed to save components in minimal mode: " . $e->getMessage());
                    // Continue without failing the entire transaction
                }
            }

            // Process event timeline if available
            if (isset($data['timeline']) && is_array($data['timeline']) && !empty($data['timeline'])) {
                error_log("Processing " . count($data['timeline']) . " timeline items for minimal event creation");
                try {
                    foreach ($data['timeline'] as $index => $item) {
                        $sql = "INSERT INTO tbl_event_timeline (
                            event_id, activity_title, activity_date, start_time, end_time,
                            location, notes, assigned_to, status, display_order
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

                        $timelineStmt = $this->conn->prepare($sql);
                        $timelineStmt->execute([
                            $eventId,
                            $item['activity_title'] ?? 'Activity',
                            $item['activity_date'] ?? $data['event_date'],
                            $item['start_time'] ?? '00:00:00',
                            $item['end_time'] ?? '23:59:59',
                            $item['location'] ?? '',
                            $item['notes'] ?? '',
                            isset($item['assigned_to']) ? intval($item['assigned_to']) : null,
                            $item['status'] ?? 'pending',
                            $index
                        ]);
                    }
                    error_log("Successfully saved " . count($data['timeline']) . " timeline items");
                } catch (Exception $e) {
                    error_log("Failed to save timeline in minimal mode: " . $e->getMessage());
                    // Continue without failing the entire transaction
                }
            }

            // Log that we used the minimal version
            error_log("Event created using enhanced minimal mode with attachments: Event ID " . $eventId);

            return json_encode([
                "status" => "success",
                "message" => "Event created successfully (enhanced minimal mode)",
                "event_id" => $eventId
            ]);
        } catch (Exception $e) {
            error_log("Minimal event creation failed: " . $e->getMessage());
            throw $e;
        }
    }

    public function createEvent($data) {
        try {
            // Apply global collation enforcement with full diagnostics
            error_log("Enforcing collation settings for createEvent");
            $this->enforceCollation();

            // Force extra stringent collation enforcement for this method
            try {
                // Simplified collation settings that are more likely to succeed
                $this->conn->exec("SET NAMES utf8mb4");
                error_log("✓ SET NAMES successful");

                // Try to use more compatible collation
                $this->conn->exec("SET SESSION collation_connection = 'utf8mb4_unicode_ci'");
                error_log("✓ SET SESSION collation_connection successful");

                // Use simpler character set settings
                $this->conn->exec("SET SESSION character_set_connection = 'utf8mb4'");
                error_log("✓ SET SESSION character_set_connection successful");

                $this->conn->exec("SET SESSION character_set_server = 'utf8mb4'");
                error_log("✓ SET SESSION character_set_server successful");

                $this->conn->exec("SET SESSION sql_mode = ''");
                error_log("✓ SET SESSION sql_mode successful");

                // Check current collation settings
                $checkStmt = $this->conn->query("SHOW VARIABLES LIKE 'collation%'");
                while ($row = $checkStmt->fetch(PDO::FETCH_ASSOC)) {
                    error_log("Current setting: " . $row['Variable_name'] . " = " . $row['Value']);
                }
            } catch (Exception $ce) {
                error_log("⚠️ Collation setting failed: " . $ce->getMessage());
                // Continue anyway
            }

            // Log the incoming data for debugging
            error_log("========== CREATE EVENT START ==========");
            error_log("createEvent received data: " . json_encode($data));
            error_log("createEvent function called successfully");

            // Debug ALL critical fields with their types
            error_log("createEvent: user_id = " . ($data['user_id'] ?? 'NOT SET') . " (type: " . gettype($data['user_id'] ?? null) . ")");
            error_log("createEvent: admin_id = " . ($data['admin_id'] ?? 'NOT SET') . " (type: " . gettype($data['admin_id'] ?? null) . ")");
            error_log("createEvent: Raw package_id = " . ($data['package_id'] ?? 'NOT SET') . " (type: " . gettype($data['package_id'] ?? null) . ")");
            error_log("createEvent: Raw venue_id = " . ($data['venue_id'] ?? 'NOT SET') . " (type: " . gettype($data['venue_id'] ?? null) . ")");
            error_log("createEvent: Raw organizer_id = " . ($data['organizer_id'] ?? 'NOT SET') . " (type: " . gettype($data['organizer_id'] ?? null) . ")");
            error_log("createEvent: Raw total_budget = " . ($data['total_budget'] ?? 'NOT SET') . " (type: " . gettype($data['total_budget'] ?? null) . ")");
            error_log("createEvent: Raw down_payment = " . ($data['down_payment'] ?? 'NOT SET') . " (type: " . gettype($data['down_payment'] ?? null) . ")");
            error_log("createEvent: event_title = " . ($data['event_title'] ?? 'NOT SET'));
            error_log("createEvent: event_date = " . ($data['event_date'] ?? 'NOT SET'));
            error_log("createEvent: event_type_id = " . ($data['event_type_id'] ?? 'NOT SET'));
            error_log("createEvent: guest_count = " . ($data['guest_count'] ?? 'NOT SET'));
            error_log("createEvent: payment_method = " . ($data['payment_method'] ?? 'NOT SET'));
            error_log("createEvent: reference_number = " . ($data['reference_number'] ?? 'NOT SET'));
            error_log("createEvent: Components array exists: " . (isset($data['components']) ? 'YES' : 'NO'));
            error_log("createEvent: Components count: " . (isset($data['components']) && is_array($data['components']) ? count($data['components']) : 'NOT AN ARRAY'));

            // Filter input data to only include expected fields to prevent SQL injection of unknown columns
            $allowedFields = [
                'operation', 'original_booking_reference', 'user_id', 'admin_id', 'organizer_id',
                'external_organizer', 'event_title', 'event_theme', 'event_description',
                'church_location', 'church_start_time', 'event_type_id', 'guest_count',
                'event_date', 'start_time', 'end_time', 'package_id', 'venue_id', 'total_budget',
                'down_payment', 'payment_method', 'payment_schedule_type_id', 'reference_number',
                'additional_notes', 'event_status', 'is_recurring', 'recurrence_rule',
                'client_signature', 'finalized_at', 'event_attachments',
                'components', 'timeline'
            ];

            $filteredData = [];
            foreach ($allowedFields as $field) {
                // Include fields even if they're null or empty, but check if the key exists in the original data
                if (array_key_exists($field, $data)) {
                    $filteredData[$field] = $data[$field];
                }
            }

            // Use filtered data from here on
            $data = $filteredData;
            error_log("createEvent filtered data: " . json_encode($data));

            // Handle collation issues by ensuring all string parameters are properly encoded
            // This avoids collation conflicts without modifying the database connection

            // Collation already enforced at method start

            $this->conn->beginTransaction();

            // Validate required event fields
            $required = ['user_id', 'admin_id', 'event_title', 'event_type_id', 'guest_count', 'event_date'];
            foreach ($required as $field) {
                if (!isset($data[$field]) || $data[$field] === null || $data[$field] === '') {
                    if ($this->conn->inTransaction()) {
                        $this->conn->rollback();
                    }
                    error_log("createEvent error: Missing required field: $field");
                    return json_encode(["status" => "error", "message" => "$field is required"]);
                }
            }

            // Wedding-specific validation - removed church start time requirement
            // Note: church_location and church_start_time are now optional for weddings

            // Validate foreign key references before insertion
            // Check if user exists
            $userCheck = $this->conn->prepare("SELECT user_id FROM tbl_users WHERE user_id = ? LIMIT 1");
            $userCheck->execute([$data['user_id']]);
            if (!$userCheck->fetch(PDO::FETCH_ASSOC)) {
                if ($this->conn->inTransaction()) {
                    $this->conn->rollback();
                }
                return json_encode(["status" => "error", "message" => "Invalid user_id: User does not exist"]);
            }

            // Check if admin exists - temporarily make this less strict for debugging
            $adminCheck = $this->conn->prepare("SELECT user_id, user_role FROM tbl_users WHERE user_id = ? LIMIT 1");
            $adminCheck->execute([$data['admin_id']]);
            $adminUser = $adminCheck->fetch(PDO::FETCH_ASSOC);
            if (!$adminUser) {
                if ($this->conn->inTransaction()) {
                    $this->conn->rollback();
                }
                error_log("createEvent: Admin user not found with ID: " . $data['admin_id']);
                return json_encode(["status" => "error", "message" => "Invalid admin_id: User does not exist"]);
            }
            error_log("createEvent: Admin user found with role: " . $adminUser['user_role']);

            // Check if event type exists
            $eventTypeCheck = $this->conn->prepare("SELECT event_type_id FROM tbl_event_type WHERE event_type_id = ? LIMIT 1");
            $eventTypeCheck->execute([$data['event_type_id']]);
            if (!$eventTypeCheck->fetch(PDO::FETCH_ASSOC)) {
                if ($this->conn->inTransaction()) {
                    $this->conn->rollback();
                }
                return json_encode(["status" => "error", "message" => "Invalid event_type_id: Event type does not exist. Available types: 1=Wedding, 2=Anniversary, 3=Birthday, 4=Corporate, 5=Others"]);
            }

            // Check if package exists (if provided)
            if (!empty($data['package_id'])) {
                $packageCheck = $this->conn->prepare("SELECT package_id FROM tbl_packages WHERE package_id = ? LIMIT 1");
                $packageCheck->execute([$data['package_id']]);
                if (!$packageCheck->fetch(PDO::FETCH_ASSOC)) {
                    if ($this->conn->inTransaction()) {
                        $this->conn->rollback();
                    }
                    return json_encode(["status" => "error", "message" => "Invalid package_id: Package does not exist"]);
                }
            }

            // Check if venue exists (if provided)
            if (!empty($data['venue_id'])) {
                $venueCheck = $this->conn->prepare("SELECT venue_id FROM tbl_venue WHERE venue_id = ? LIMIT 1");
                $venueCheck->execute([$data['venue_id']]);
                if (!$venueCheck->fetch(PDO::FETCH_ASSOC)) {
                    if ($this->conn->inTransaction()) {
                        $this->conn->rollback();
                    }
                    return json_encode(["status" => "error", "message" => "Invalid venue_id: Venue does not exist"]);
                }
            }

            // Wedding-specific business rule validation
            if ($data['event_type_id'] == 1) { // Wedding event
                // Check if there's already a wedding on the same date
                $weddingCheck = $this->conn->prepare("
                    SELECT event_id, event_title
                    FROM tbl_events
                    WHERE event_date = ?
                    AND event_type_id = 1
                    AND event_status NOT IN ('cancelled', 'done')
                    LIMIT 1
                ");
                $weddingCheck->execute([$data['event_date']]);
                $existingWedding = $weddingCheck->fetch(PDO::FETCH_ASSOC);

                if ($existingWedding) {
                    if ($this->conn->inTransaction()) {
                        $this->conn->rollback();
                    }
                    return json_encode([
                        "status" => "error",
                        "message" => "Business rule violation: Only one wedding is allowed per day. There is already a wedding scheduled on " . $data['event_date'] . "."
                    ]);
                }

                // Check if there are other events on the same date (weddings cannot be scheduled alongside other events)
                $otherEventsCheck = $this->conn->prepare("
                    SELECT event_id, event_title, event_type_id
                    FROM tbl_events
                    WHERE event_date = ?
                    AND event_type_id != 1
                    AND event_status NOT IN ('cancelled', 'done')
                ");
                $otherEventsCheck->execute([$data['event_date']]);
                $otherEvents = $otherEventsCheck->fetchAll();

                if (!empty($otherEvents)) {
                    if ($this->conn->inTransaction()) {
                        $this->conn->rollback();
                    }
                    $eventTypes = array_unique(array_column($otherEvents, 'event_type_id'));
                    return json_encode([
                        "status" => "error",
                        "message" => "Business rule violation: Weddings cannot be scheduled alongside other events. There are other events already scheduled on " . $data['event_date'] . "."
                    ]);
                }
            } else {
                // For non-wedding events, check if there's a wedding on the same date
                $weddingCheck = $this->conn->prepare("
                    SELECT event_id, event_title
                    FROM tbl_events
                    WHERE event_date = ?
                    AND event_type_id = 1
                    AND event_status NOT IN ('cancelled', 'done')
                    LIMIT 1
                ");
                $weddingCheck->execute([$data['event_date']]);
                $existingWedding = $weddingCheck->fetch(PDO::FETCH_ASSOC);

                if ($existingWedding) {
                    if ($this->conn->inTransaction()) {
                        $this->conn->rollback();
                    }
                    return json_encode([
                        "status" => "error",
                        "message" => "Business rule violation: Other events cannot be scheduled on the same date as a wedding. There is already a wedding scheduled on " . $data['event_date'] . "."
                    ]);
                }
            }

            // Calculate reserved payment total if this event is from a booking
            $reservedPaymentTotal = 0.00;
            $adjustedTotal = 0.00;

            if (isset($data['original_booking_reference']) && !empty($data['original_booking_reference'])) {
                try {
                    error_log("createEvent: Calculating reserved payments for booking reference: " . $data['original_booking_reference']);

                    // Get booking ID and payments
                    $bookingStmt = $this->conn->prepare("SELECT booking_id FROM tbl_bookings WHERE booking_reference = ?");
                    $bookingStmt->execute([$data['original_booking_reference']]);
                    $booking = $bookingStmt->fetch(PDO::FETCH_ASSOC);

                    if ($booking) {
                        // Get all completed/paid payments for this booking
                        $paymentStmt = $this->conn->prepare("
                            SELECT SUM(payment_amount) as total_paid
                            FROM tbl_payments
                            WHERE booking_id = ?
                            AND payment_status IN ('completed', 'paid')
                        ");
                        $paymentStmt->execute([$booking['booking_id']]);
                        $paymentData = $paymentStmt->fetch(PDO::FETCH_ASSOC);

                        $reservedPaymentTotal = floatval($paymentData['total_paid'] ?? 0);
                        error_log("createEvent: Reserved payment total from booking: " . $reservedPaymentTotal);
                    }
                } catch (Exception $e) {
                    error_log("createEvent: Error calculating reserved payments: " . $e->getMessage());
                    // Continue with 0 values if there's an error
                }
            }

            // Calculate adjusted total (total budget minus reserved payments)
            $totalBudget = isset($data['total_budget']) && is_numeric($data['total_budget']) ? floatval($data['total_budget']) : 0.00;
            $adjustedTotal = $totalBudget - $reservedPaymentTotal;

            error_log("createEvent: Reserved Payment Total: " . $reservedPaymentTotal);
            error_log("createEvent: Total Budget: " . $totalBudget);
            error_log("createEvent: Adjusted Total: " . $adjustedTotal);

            // Insert the main event (now WITH reserved_payment_total and adjusted_total columns)
            $sql = "INSERT INTO tbl_events (
                        original_booking_reference, user_id, admin_id, organizer_id, event_title,
                        event_theme, event_description, church_location, church_start_time, event_type_id, guest_count, event_date, start_time, end_time,
                        package_id, venue_id, total_budget, down_payment, payment_method,
                        reference_number, additional_notes, event_status, payment_schedule_type_id,
                        is_recurring, recurrence_rule, client_signature, finalized_at, event_attachments,
                        reserved_payment_total, adjusted_total
                    ) VALUES (
                        :original_booking_reference, :user_id, :admin_id, :organizer_id, :event_title,
                        :event_theme, :event_description, :church_location, :church_start_time, :event_type_id, :guest_count, :event_date, :start_time, :end_time,
                        :package_id, :venue_id, :total_budget, :down_payment, :payment_method,
                        :reference_number, :additional_notes, :event_status, :payment_schedule_type_id,
                        :is_recurring, :recurrence_rule, :client_signature, :finalized_at, :event_attachments,
                        :reserved_payment_total, :adjusted_total
                    )";

            $stmt = $this->conn->prepare($sql);

            // Prepare all string parameters to avoid collation issues
            // Ensure all string parameters are properly encoded to prevent collation conflicts
            $originalBookingRef = isset($data['original_booking_reference']) && $data['original_booking_reference'] ? trim($data['original_booking_reference']) : null;
            $eventTitle = isset($data['event_title']) ? trim($data['event_title']) : '';
            if ($eventTitle === '') { $eventTitle = 'Event'; }
            $eventTheme = isset($data['event_theme']) && $data['event_theme'] ? trim($data['event_theme']) : 'N/A';
            $eventDescription = isset($data['event_description']) && $data['event_description'] ? trim($data['event_description']) : 'N/A';
            $churchLocation = isset($data['church_location']) && $data['church_location'] ? trim($data['church_location']) : 'N/A';
            $churchStartTime = isset($data['church_start_time']) && $data['church_start_time'] ? trim($data['church_start_time']) : '00:00:00';
            $eventDate = trim($data['event_date']);
            $startTime = isset($data['start_time']) ? trim($data['start_time']) : '00:00:00';
            $endTime = isset($data['end_time']) ? trim($data['end_time']) : '23:59:59';
            $paymentMethod = isset($data['payment_method']) && !empty($data['payment_method']) ? trim($data['payment_method']) : 'cash';
            $referenceNumber = isset($data['reference_number']) && $data['reference_number'] ? trim($data['reference_number']) : 'N/A';
            $additionalNotes = isset($data['additional_notes']) && $data['additional_notes'] ? trim($data['additional_notes']) : 'N/A';
            // Normalize event status to allowed enum values
            $allowedStatuses = ['done', 'confirmed', 'on_going', 'cancelled'];
            $eventStatus = isset($data['event_status']) && !empty($data['event_status']) ? trim($data['event_status']) : 'confirmed';
            if (!in_array($eventStatus, $allowedStatuses, true)) {
                error_log("createEvent: Invalid event_status '{$eventStatus}', defaulting to 'confirmed'");
                $eventStatus = 'confirmed';
            }
            $recurrenceRule = isset($data['recurrence_rule']) && $data['recurrence_rule'] ? trim($data['recurrence_rule']) : null;
            $clientSignature = isset($data['client_signature']) && $data['client_signature'] ? trim($data['client_signature']) : 'N/A';
            $finalizedAt = isset($data['finalized_at']) && $data['finalized_at'] ? trim($data['finalized_at']) : null;
            // Accept event_attachments as JSON string or array; convert arrays to JSON
            $eventAttachments = null;
            if (isset($data['event_attachments']) && $data['event_attachments']) {
                if (is_array($data['event_attachments'])) {
                    $eventAttachments = json_encode($data['event_attachments'], JSON_UNESCAPED_UNICODE);
                } else {
                    $eventAttachments = $data['event_attachments'];
                }
            }

            // Helper function to properly handle null values from JSON
            $sanitizeValue = function($value, $type = 'int') {
                // For debugging purposes
                error_log("sanitizeValue received: " . print_r($value, true) . " of type " . gettype($value) . " for expected type " . $type);

                if ($value === null || $value === '' || $value === 'null') {
                    error_log("Value is null/empty, returning NULL");
                    return null;
                }

                if ($type === 'int') {
                    // Handle numeric strings and actual integers
                    if (is_numeric($value)) {
                        $intValue = intval($value);
                        error_log("Converted numeric value to int: " . $intValue);
                        return $intValue;
                    } else {
                        error_log("Value is not numeric, returning NULL");
                        return null;
                    }
                }

                if ($type === 'float') {
                    if (is_numeric($value)) {
                        $floatValue = floatval($value);
                        error_log("Converted numeric value to float: " . $floatValue);
                        return $floatValue;
                    } else {
                        error_log("Value is not numeric, returning 0.0 for float");
                        return 0.0;
                    }
                }

                error_log("Returning value as is: " . print_r($value, true));
                return $value;
            };

            // Default organizer_id to admin_id when not provided to avoid NULL
            $resolvedOrganizerId = isset($data['organizer_id']) && $data['organizer_id'] ? intval($data['organizer_id']) : intval($data['admin_id']);

            $eventParams = [
                ':original_booking_reference' => $originalBookingRef,
                ':user_id' => intval($data['user_id']),
                ':admin_id' => intval($data['admin_id']),
                ':organizer_id' => $resolvedOrganizerId,
                ':event_title' => $eventTitle,
                ':event_theme' => $eventTheme,
                ':event_description' => $eventDescription,
                ':church_location' => $churchLocation,
                ':church_start_time' => $churchStartTime,
                ':event_type_id' => intval($data['event_type_id']),
                ':guest_count' => intval($data['guest_count']),
                ':event_date' => $eventDate,
                ':start_time' => $startTime,
                ':end_time' => $endTime,
                ':package_id' => isset($data['package_id']) && $data['package_id'] ? intval($data['package_id']) : null,
                ':venue_id' => isset($data['venue_id']) && $data['venue_id'] ? intval($data['venue_id']) : null,
                ':total_budget' => $totalBudget,
                ':down_payment' => isset($data['down_payment']) && is_numeric($data['down_payment']) ? floatval($data['down_payment']) : 0.00,
                ':payment_method' => $paymentMethod,
                ':reference_number' => $referenceNumber,
                ':additional_notes' => $additionalNotes,
                ':event_status' => $eventStatus,
                ':payment_schedule_type_id' => isset($data['payment_schedule_type_id']) && !empty($data['payment_schedule_type_id']) ? intval($data['payment_schedule_type_id']) : 2,
                ':is_recurring' => isset($data['is_recurring']) && !empty($data['is_recurring']) ? $data['is_recurring'] : false,
                ':recurrence_rule' => $recurrenceRule,
                ':client_signature' => $clientSignature,
                ':finalized_at' => $finalizedAt,
                ':event_attachments' => $eventAttachments,
                ':reserved_payment_total' => $reservedPaymentTotal,
                ':adjusted_total' => $adjustedTotal
            ];

            // Enhanced detailed logging of parameters
            error_log("========== EVENT DATA BEING INSERTED ==========");
            error_log("Event Title: " . $eventParams[':event_title']);
            error_log("User ID: " . $eventParams[':user_id']);
            error_log("Admin ID: " . $eventParams[':admin_id']);
            error_log("Event Type ID: " . $eventParams[':event_type_id']);
            error_log("Event Date: " . $eventParams[':event_date']);
            error_log("Guest Count: " . $eventParams[':guest_count']);

            // Critical fields that we need to fix
            error_log("Package ID: " . var_export($eventParams[':package_id'], true) . " (original: " . var_export($data['package_id'], true) . ")");
            error_log("Venue ID: " . var_export($eventParams[':venue_id'], true) . " (original: " . var_export($data['venue_id'], true) . ")");
            error_log("Organizer ID: " . var_export($eventParams[':organizer_id'], true) . " (original: " . var_export($data['organizer_id'], true) . ")");
            error_log("Total Budget: " . var_export($eventParams[':total_budget'], true) . " (original: " . var_export($data['total_budget'], true) . ")");
            error_log("Down Payment: " . var_export($eventParams[':down_payment'], true) . " (original: " . var_export($data['down_payment'], true) . ")");

            // Event Attachments
            error_log("Event Attachments: " . (is_null($eventParams[':event_attachments'])
                ? 'NULL'
                : (strlen($eventParams[':event_attachments']) > 200
                    ? substr($eventParams[':event_attachments'], 0, 200) . '... (' . strlen($eventParams[':event_attachments']) . ' chars total)'
                    : $eventParams[':event_attachments'])));

            // Full params for debugging
            error_log("All SQL params: " . json_encode($eventParams));

            $stmt->execute($eventParams);

            $eventId = $this->conn->lastInsertId();
            error_log("createEvent: Event created with ID: $eventId");

            // Verify the data was actually saved
            $verifyStmt = $this->conn->prepare("SELECT package_id, venue_id, organizer_id, total_budget, down_payment FROM tbl_events WHERE event_id = ?");
            $verifyStmt->execute([$eventId]);
            $verifyData = $verifyStmt->fetch(PDO::FETCH_ASSOC);
            error_log("createEvent: Verification - Package ID saved: " . ($verifyData['package_id'] ?? 'NULL'));
            error_log("createEvent: Verification - Venue ID saved: " . ($verifyData['venue_id'] ?? 'NULL'));
            error_log("createEvent: Verification - Organizer ID saved: " . ($verifyData['organizer_id'] ?? 'NULL'));
            error_log("createEvent: Verification - Total Budget saved: " . ($verifyData['total_budget'] ?? '0'));
            error_log("createEvent: Verification - Down Payment saved: " . ($verifyData['down_payment'] ?? '0'));

            // Create organizer assignment record if organizer is specified
            if (!empty($data['organizer_id'])) {
                try {
                    error_log("createEvent: Creating organizer assignment for organizer ID: " . $data['organizer_id']);

                    // First try with all columns
                    // Add the organizer as an assignment - with explicit collation
                    error_log("Adding organizer assignment - eventId: " . $eventId . ", organizer_id: " . $data['organizer_id'] . ", admin_id: " . $data['admin_id']);

                    // Force all string parameters to have the correct collation
                    $assignmentNotes = 'Assigned during event creation';
                    $feeCurrency = isset($data['fee_currency']) ? $data['fee_currency'] : 'PHP';
                    $feeStatus = isset($data['fee_status']) ? $data['fee_status'] : 'unset';

                    try {
                        // Use the safe execute method with parameter binding to avoid collation issues
                        $this->enforceCollation(); // Enforce again before this operation

                        $assignmentSql = "INSERT INTO tbl_event_organizer_assignments (
                            event_id, organizer_id, assigned_by, status, notes, agreed_talent_fee, fee_currency, fee_status
                        ) VALUES (
                            :event_id, :organizer_id, :assigned_by, 'assigned', :notes, :agreed_talent_fee, :fee_currency, :fee_status
                        )";

                        $assignmentStmt = $this->conn->prepare($assignmentSql);
                        $assignmentStmt->bindValue(':event_id', $eventId, PDO::PARAM_INT);
                        $assignmentStmt->bindValue(':organizer_id', $data['organizer_id'], PDO::PARAM_INT);
                        $assignmentStmt->bindValue(':assigned_by', $data['admin_id'], PDO::PARAM_INT);
                        $assignmentStmt->bindValue(':notes', $assignmentNotes, PDO::PARAM_STR);
                        $assignmentStmt->bindValue(':agreed_talent_fee', isset($data['agreed_talent_fee']) ? $data['agreed_talent_fee'] : null, PDO::PARAM_STR);
                        $assignmentStmt->bindValue(':fee_currency', $feeCurrency, PDO::PARAM_STR);
                        $assignmentStmt->bindValue(':fee_status', $feeStatus, PDO::PARAM_STR);
                        $assignmentStmt->execute();

                        error_log("✓ Organizer assignment created successfully with fee columns");
                    } catch (Exception $e2) {
                        error_log("⚠️ Fee columns don't exist, trying fallback: " . $e2->getMessage());

                        // Fallback if fee columns don't exist yet
                        try {
                            $this->enforceCollation(); // Enforce again before fallback

                            $assignmentSql2 = "INSERT INTO tbl_event_organizer_assignments (
                                event_id, organizer_id, assigned_by, status, notes
                            ) VALUES (
                                :event_id, :organizer_id, :assigned_by, 'assigned', :notes
                            )";

                            $assignmentStmt2 = $this->conn->prepare($assignmentSql2);
                            $assignmentStmt2->bindValue(':event_id', $eventId, PDO::PARAM_INT);
                            $assignmentStmt2->bindValue(':organizer_id', $data['organizer_id'], PDO::PARAM_INT);
                            $assignmentStmt2->bindValue(':assigned_by', $data['admin_id'], PDO::PARAM_INT);
                            $assignmentStmt2->bindValue(':notes', $assignmentNotes, PDO::PARAM_STR);
                            $assignmentStmt2->execute();

                            error_log("✓ Organizer assignment created successfully with fallback");
                        } catch (Exception $e3) {
                            error_log("❌ Organizer assignment creation failed completely: " . $e3->getMessage());
                            // Continue anyway to avoid blocking event creation
                        }
                    }

                    // Verify the assignment was created
                    $verifyAssignment = $this->conn->prepare("SELECT assignment_id FROM tbl_event_organizer_assignments WHERE event_id = ? AND organizer_id = ?");
                    $verifyAssignment->execute([$eventId, $data['organizer_id']]);
                    $assignmentId = $verifyAssignment->fetchColumn();

                    if ($assignmentId) {
                        error_log("createEvent: Organizer assignment verified - Assignment ID: " . $assignmentId);
                    } else {
                        error_log("createEvent: WARNING - Organizer assignment not found after creation!");
                    }

                } catch (Exception $e) {
                    error_log("createEvent: CRITICAL ERROR - Failed to create organizer assignment: " . $e->getMessage());
                    error_log("createEvent: Assignment error stack trace: " . $e->getTraceAsString());
                    // Don't fail the entire transaction for assignment creation, but log it as critical
                }
            } else {
                error_log("createEvent: No organizer_id provided - skipping organizer assignment");
            }

            // Insert event components if provided
            error_log("createEvent: Components data: " . json_encode($data['components'] ?? 'NOT SET'));
            if (!empty($data['components']) && is_array($data['components'])) {
                error_log("createEvent: Processing " . count($data['components']) . " components");
                $componentCount = 0;
                foreach ($data['components'] as $index => $component) {
                    try {
                        // Validate component and map fields from frontend format
                        $componentName = $component['component_name'] ?? $component['name'] ?? null;
                        $componentPrice = $component['component_price'] ?? $component['price'] ?? 0;
                        $componentDescription = $component['component_description'] ?? $component['description'] ?? null;
                        $isCustom = $component['is_custom'] ?? $component['isCustom'] ?? false;
                        $isIncluded = $component['is_included'] ?? ($component['included'] !== false) ?? true;
                        $originalId = $component['original_package_component_id'] ?? $component['originalId'] ?? null;
                        $supplierId = $component['supplier_id'] ?? null;
                        $offerId = $component['offer_id'] ?? null;

                        if (empty($componentName)) {
                            error_log("createEvent: Skipping invalid component at index $index - missing name/component_name");
                            continue; // Skip invalid components
                        }
                        error_log("createEvent: Processing component: " . $componentName . " - Price: " . $componentPrice);

                        $sql = "INSERT INTO tbl_event_components (
                                    event_id, component_name, component_description,
                                    component_price, is_custom, is_included,
                                    original_package_component_id, supplier_id, offer_id, display_order
                                ) VALUES (
                                    :event_id, :name, :description,
                                    :price, :is_custom, :is_included,
                                    :original_package_component_id, :supplier_id, :offer_id, :display_order
                                )";

                        $stmt = $this->conn->prepare($sql);
                        $stmt->execute([
                            ':event_id' => $eventId,
                            ':name' => $componentName,
                            ':description' => $componentDescription,
                            ':price' => $componentPrice,
                            ':is_custom' => $isCustom,
                            ':is_included' => $isIncluded,
                            ':original_package_component_id' => $originalId,
                            ':supplier_id' => $supplierId,
                            ':offer_id' => $offerId,
                            ':display_order' => $index
                        ]);
                        $componentCount++;
                        error_log("createEvent: Component inserted successfully - " . $componentName);
                    } catch (Exception $e) {
                        error_log("createEvent: Failed to insert component at index $index: " . $e->getMessage());
                        // Continue with other components even if one fails
                    }
                }
                error_log("createEvent: Successfully inserted $componentCount of " . count($data['components']) . " components");
            } else {
                error_log("createEvent: No components to insert or components is not an array");
            }

            // Insert timeline items if provided
            error_log("createEvent: Timeline data: " . json_encode($data['timeline'] ?? 'NOT SET'));
            if (!empty($data['timeline']) && is_array($data['timeline'])) {
                error_log("createEvent: Processing " . count($data['timeline']) . " timeline items");
                $timelineCount = 0;
                foreach ($data['timeline'] as $index => $item) {
                    try {
                        // Validate timeline item
                        if (empty($item['activity_title']) || empty($item['activity_date']) || empty($item['start_time'])) {
                            error_log("createEvent: Skipping invalid timeline item at index $index - missing required fields");
                            continue; // Skip invalid timeline items
                        }
                        error_log("createEvent: Processing timeline item: " . $item['activity_title'] . " - Date: " . $item['activity_date']);

                        $sql = "INSERT INTO tbl_event_timeline (
                                    event_id, component_id, activity_title,
                                    activity_date, start_time, end_time,
                                    location, notes, assigned_to,
                                    status, display_order
                                ) VALUES (
                                    :event_id, :component_id, :title,
                                    :date, :start_time, :end_time,
                                    :location, :notes, :assigned_to,
                                    :status, :display_order
                                )";

                        $stmt = $this->conn->prepare($sql);
                        $stmt->execute([
                            ':event_id' => $eventId,
                            ':component_id' => $item['component_id'] ?? null,
                            ':title' => $item['activity_title'],
                            ':date' => $item['activity_date'],
                            ':start_time' => $item['start_time'],
                            ':end_time' => $item['end_time'] ?? null,
                            ':location' => $item['location'] ?? null,
                            ':notes' => $item['notes'] ?? null,
                            ':assigned_to' => $item['assigned_to'] ?? null,
                            ':status' => $item['status'] ?? 'pending',
                            ':display_order' => $index
                        ]);
                        $timelineCount++;
                        error_log("createEvent: Timeline item inserted successfully - " . $item['activity_title']);
                    } catch (Exception $e) {
                        error_log("createEvent: Failed to insert timeline item at index $index: " . $e->getMessage());
                        // Continue with other timeline items even if one fails
                    }
                }
                error_log("createEvent: Successfully inserted $timelineCount of " . count($data['timeline']) . " timeline items");
            } else {
                error_log("createEvent: No timeline items to insert or timeline is not an array");
            }

            // Create initial payment record if down payment is specified
            error_log("createEvent: Checking for down payment: " . ($data['down_payment'] ?? 'not set'));

            if (!empty($data['down_payment']) && $data['down_payment'] > 0) {
                error_log("createEvent: Creating payment record with amount: " . $data['down_payment']);
                error_log("createEvent: Down payment check passed - amount: " . $data['down_payment'] . ", type: " . gettype($data['down_payment']));

                // Check for duplicate payment reference if provided
                if (isset($data['reference_number']) && !empty($data['reference_number'])) {
                    $referenceCheckSql = "SELECT payment_id FROM tbl_payments WHERE payment_reference = ? LIMIT 1";
                    $referenceCheckStmt = $this->conn->prepare($referenceCheckSql);
                    $referenceCheckStmt->execute([$data['reference_number']]);
                    if ($referenceCheckStmt->fetch(PDO::FETCH_ASSOC)) {
                        if ($this->conn->inTransaction()) {
                            $this->conn->rollback();
                        }
                        error_log("createEvent: Duplicate payment reference detected: " . $data['reference_number']);
                        return json_encode(["status" => "error", "message" => "Payment reference already exists. Please use a unique reference number."]);
                    }
                }

                // Prepare payment data
                $paymentMethod = isset($data['payment_method']) ? trim($data['payment_method']) : 'cash';
                $paymentNotes = 'Initial down payment for event creation';
                $paymentStatus = 'completed';
                $paymentDate = date('Y-m-d');
                $paymentReference = isset($data['reference_number']) && $data['reference_number'] ? trim($data['reference_number']) : null;

                // Ensure all string values are properly encoded
                $paymentMethod = mb_convert_encoding($paymentMethod, 'UTF-8', 'UTF-8');
                $paymentNotes = mb_convert_encoding($paymentNotes, 'UTF-8', 'UTF-8');
                $paymentStatus = mb_convert_encoding($paymentStatus, 'UTF-8', 'UTF-8');
                $paymentReference = $paymentReference ? mb_convert_encoding($paymentReference, 'UTF-8', 'UTF-8') : null;

                // Attachments removed per simplification
                $attachments = [];

                error_log("createEvent: Payment params - Method: $paymentMethod, Amount: " . $data['down_payment'] . ", Reference: " . ($paymentReference ?? 'none') . ", Attachments: " . count($attachments));

                try {
                    // Calculate payment percentage if down payment is provided
                    $paymentPercentage = $this->calculatePaymentPercentage($data['down_payment'], $data['total_budget'] ?? 0);

                    error_log("createEvent: Creating payment record with attachments: " . count($attachments));

                    // Use the simple payment insertion method that bypasses all collation issues
                    $paymentId = $this->insertPaymentSimple(
                        $eventId,
                        $data['user_id'],
                        $paymentMethod,
                        $data['down_payment'],
                        $paymentNotes,
                        $paymentStatus,
                        $paymentDate,
                        $paymentReference,
                        $paymentPercentage,
                        $attachments
                    );

                    if ($paymentId) {
                        error_log("createEvent: Payment inserted successfully with ID: " . $paymentId);

                        // Verify payment was created
                        $verifyPayment = $this->conn->prepare("SELECT payment_id, payment_amount FROM tbl_payments WHERE payment_id = ?");
                        $verifyPayment->execute([$paymentId]);
                        $paymentData = $verifyPayment->fetch(PDO::FETCH_ASSOC);

                        if ($paymentData) {
                            error_log("createEvent: Payment verification - ID: " . $paymentData['payment_id'] . ", Amount: " . $paymentData['payment_amount']);

                            // Attachments no longer stored for payments
                        } else {
                            error_log("createEvent: CRITICAL - Payment not found after creation!");
                        }
                    } else {
                        error_log("createEvent: CRITICAL - Payment insertion returned no ID!");
                    }
                } catch (PDOException $e) {
                    error_log("createEvent: CRITICAL ERROR - Payment insertion failed: " . $e->getMessage());
                    error_log("createEvent: Payment error stack trace: " . $e->getTraceAsString());
                    throw $e;
                }
            } else {
                error_log("createEvent: No payment record created - down_payment is empty or zero");
            }

            // If this event was created from a booking, mark the booking as converted
            if (isset($data['original_booking_reference']) && !empty($data['original_booking_reference'])) {
                try {
                    // Check if converted_event_id column exists
                    $columnCheckSql = "SHOW COLUMNS FROM tbl_bookings LIKE 'converted_event_id'";
                    $columnCheckStmt = $this->conn->prepare($columnCheckSql);
                    $columnCheckStmt->execute();
                    $hasConvertedEventId = $columnCheckStmt->rowCount() > 0;

                    if ($hasConvertedEventId) {
                        // Column exists, use the full update
                        $bookingConvertSql = "UPDATE tbl_bookings
                                             SET booking_status = 'converted', converted_event_id = :event_id, updated_at = NOW()
                                             WHERE booking_reference = :booking_reference";
                        $bookingStmt = $this->conn->prepare($bookingConvertSql);
                        $bookingStmt->execute([
                            ':event_id' => $eventId,
                            ':booking_reference' => $data['original_booking_reference']
                        ]);
                        error_log("createEvent: Updated booking with converted_event_id column");
                    } else {
                        // Column doesn't exist, just update the status
                        $bookingConvertSql = "UPDATE tbl_bookings
                                             SET booking_status = 'converted'
                                             WHERE booking_reference = :booking_reference";
                        $bookingStmt = $this->conn->prepare($bookingConvertSql);
                        $bookingStmt->execute([
                            ':booking_reference' => $data['original_booking_reference']
                        ]);
                        error_log("createEvent: Updated booking status only (converted_event_id column not found)");
                    }
                } catch (Exception $e) {
                    error_log("createEvent: Failed to update booking status: " . $e->getMessage());
                    // Continue with event creation even if booking update fails
                }

                // Transfer booking payments to event
                try {
                    // Get booking ID from the reference
                    $bookingIdSql = "SELECT booking_id FROM tbl_bookings WHERE booking_reference = :booking_reference";
                    $bookingIdStmt = $this->conn->prepare($bookingIdSql);
                    $bookingIdStmt->execute([':booking_reference' => $data['original_booking_reference']]);
                    $booking = $bookingIdStmt->fetch(PDO::FETCH_ASSOC);

                    if ($booking) {
                        $bookingId = $booking['booking_id'];

                        // Update payment records to link them to the event
                        $transferPaymentsSql = "UPDATE tbl_payments
                                              SET event_id = :event_id
                                              WHERE booking_id = :booking_id AND event_id IS NULL";
                        $transferStmt = $this->conn->prepare($transferPaymentsSql);
                        $transferStmt->execute([
                            ':event_id' => $eventId,
                            ':booking_id' => $bookingId
                        ]);

                        $transferredCount = $transferStmt->rowCount();
                        if ($transferredCount > 0) {
                            error_log("createEvent: Transferred {$transferredCount} payment(s) from booking to event");
                        }
                    }
                } catch (Exception $e) {
                    error_log("createEvent: Failed to transfer booking payments: " . $e->getMessage());
                    // Continue with event creation even if payment transfer fails
                }
            }

            $this->conn->commit();
            error_log("createEvent: Transaction committed successfully");

            // Log event creation activity - DISABLED TO PREVENT CONCAT COLLATION ERRORS
            // if ($this->logger) {
            //     $this->logger->logEvent(
            //         $data['admin_id'],
            //         $eventId,
            //         'created',
            //         "Event '{$data['event_title']}' created for {$data['guest_count']} guests on {$data['event_date']}",
            //         [
            //             'event_type_id' => $data['event_type_id'],
            //             'venue_id' => $data['venue_id'] ?? null,
            //             'package_id' => $data['package_id'] ?? null,
            //             'total_budget' => $data['total_budget'] ?? 0,
            //             'original_booking_reference' => $data['original_booking_reference'] ?? null
            //         ]
            //     );
            // }

            error_log("createEvent: Success - Event created with ID: " . $eventId);

            // Verify components were saved
            $componentVerifyStmt = $this->conn->prepare("SELECT COUNT(*) as count FROM tbl_event_components WHERE event_id = ?");
            $componentVerifyStmt->execute([$eventId]);
            $componentVerifyData = $componentVerifyStmt->fetch(PDO::FETCH_ASSOC);
            $savedComponentsCount = $componentVerifyData['count'] ?? 0;

            // Verify payment was saved
            $paymentVerifyStmt = $this->conn->prepare("SELECT COUNT(*) as count FROM tbl_payments WHERE event_id = ?");
            $paymentVerifyStmt->execute([$eventId]);
            $paymentVerifyData = $paymentVerifyStmt->fetch(PDO::FETCH_ASSOC);
            $savedPaymentsCount = $paymentVerifyData['count'] ?? 0;

            // Create comprehensive summary of what was created
            $summary = [
                'event_id' => $eventId,
                'package_id' => $verifyData['package_id'] ?? null,
                'venue_id' => $verifyData['venue_id'] ?? null,
                'organizer_id' => $verifyData['organizer_id'] ?? null,
                'total_budget' => $verifyData['total_budget'] ?? 0,
                'down_payment' => $verifyData['down_payment'] ?? 0,
                'components_sent' => $componentCount ?? 0,
                'components_saved' => $savedComponentsCount,
                'timeline_count' => $timelineCount ?? 0,
                'payments_saved' => $savedPaymentsCount,
                'payment_created' => isset($paymentId) ? 'YES (ID: ' . $paymentId . ')' : 'NO'
            ];
            error_log("createEvent: SUMMARY - " . json_encode($summary));

            // Create detailed comparison of sent vs saved data
            error_log("========== DATA VERIFICATION ==========");
            error_log("SENT: package_id = " . ($data['package_id'] ?? 'NULL') . " | SAVED: package_id = " . ($verifyData['package_id'] ?? 'NULL'));
            error_log("SENT: venue_id = " . ($data['venue_id'] ?? 'NULL') . " | SAVED: venue_id = " . ($verifyData['venue_id'] ?? 'NULL'));
            error_log("SENT: organizer_id = " . ($data['organizer_id'] ?? 'NULL') . " | SAVED: organizer_id = " . ($verifyData['organizer_id'] ?? 'NULL'));
            error_log("SENT: total_budget = " . ($data['total_budget'] ?? 'NULL') . " | SAVED: total_budget = " . ($verifyData['total_budget'] ?? 'NULL'));
            error_log("SENT: down_payment = " . ($data['down_payment'] ?? 'NULL') . " | SAVED: down_payment = " . ($verifyData['down_payment'] ?? 'NULL'));
            error_log("SENT: components = " . (isset($data['components']) ? count($data['components']) . ' items' : 'NULL') . " | SAVED: components = " . $savedComponentsCount . ' items');
            error_log("========================================");

            // Alert if data mismatch
            if ($savedComponentsCount != ($componentCount ?? 0)) {
                error_log("⚠️ WARNING: Component count mismatch! Sent: " . ($componentCount ?? 0) . ", Saved: " . $savedComponentsCount);
            }
            if ($savedPaymentsCount == 0 && isset($paymentId)) {
                error_log("⚠️ WARNING: Payment was supposed to be created but none found in database!");
            }
            if (($data['package_id'] ?? null) != ($verifyData['package_id'] ?? null)) {
                error_log("⚠️ WARNING: package_id mismatch! Sent: " . ($data['package_id'] ?? 'NULL') . ", Saved: " . ($verifyData['package_id'] ?? 'NULL'));
            }
            if (($data['venue_id'] ?? null) != ($verifyData['venue_id'] ?? null)) {
                error_log("⚠️ WARNING: venue_id mismatch! Sent: " . ($data['venue_id'] ?? 'NULL') . ", Saved: " . ($verifyData['venue_id'] ?? 'NULL'));
            }
            if (($data['organizer_id'] ?? null) != ($verifyData['organizer_id'] ?? null)) {
                error_log("⚠️ WARNING: organizer_id mismatch! Sent: " . ($data['organizer_id'] ?? 'NULL') . ", Saved: " . ($verifyData['organizer_id'] ?? 'NULL'));
            }
            error_log("========== CREATE EVENT END ==========");

            $response = json_encode([
                "status" => "success",
                "message" => "Event created successfully",
                "event_id" => $eventId,
                "summary" => $summary
            ]);
            error_log("createEvent: Returning response: " . $response);
            return $response;

        } catch (Exception $e) {
            // Only rollback if there's an active transaction
            if ($this->conn->inTransaction()) {
                $this->conn->rollback();
            }
            error_log("createEvent error: " . $e->getMessage());
            error_log("createEvent stack trace: " . $e->getTraceAsString());

            // Check if it's a collation error and try minimal approach
            if (strpos($e->getMessage(), '1271') !== false || strpos($e->getMessage(), 'collation') !== false) {
                error_log("Collation error detected in createEvent, trying minimal approach");
                try {
                    return $this->createEventMinimal($data);
                } catch (Exception $minimalError) {
                    error_log("Minimal event creation also failed: " . $minimalError->getMessage());
                    $errorResponse = json_encode([
                        "status" => "error",
                        "message" => "Database collation error - please contact support",
                        "debug" => [
                            "error" => "Collation mismatch detected",
                            "file" => basename($e->getFile()),
                            "line" => $e->getLine(),
                            "suggestion" => "Try again or contact administrator"
                        ]
                    ]);
                }
            } else {
                $errorResponse = json_encode([
                    "status" => "error",
                    "message" => "Server error occurred",
                    "debug" => [
                        "error" => $e->getMessage(),
                        "file" => basename($e->getFile()),
                        "line" => $e->getLine()
                    ]
                ]);
            }
            error_log("createEvent: Returning error response: " . $errorResponse);
            return $errorResponse;
        }
    }

    public function createCustomizedPackage($data) {
        try {
            $this->conn->beginTransaction();

            // Validate required fields
            $required = ['admin_id', 'package_title', 'event_type_id', 'guest_capacity', 'components'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    return json_encode(["status" => "error", "message" => "$field is required"]);
                }
            }

            // Calculate total package price from components
            $totalPrice = 0;
            foreach ($data['components'] as $component) {
                $totalPrice += floatval($component['component_price'] || 0);
            }

            // Create the customized package
            $sql = "INSERT INTO tbl_packages (
                        package_title, package_description, package_price, guest_capacity,
                        created_by, is_active, original_price, is_price_locked, price_lock_date,
                        customized_package
                    ) VALUES (
                        :package_title, :package_description, :package_price, :guest_capacity,
                        :created_by, 1, :original_price, 0, NULL, 1
                    )";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':package_title' => $data['package_title'],
                ':package_description' => $data['package_description'] ?? 'Customized package created from event builder',
                ':package_price' => $totalPrice,
                ':guest_capacity' => $data['guest_capacity'],
                ':created_by' => $data['admin_id'],
                ':original_price' => $totalPrice
            ]);

            $packageId = $this->conn->lastInsertId();

            // Link package to event types
            $eventTypeSql = "INSERT INTO tbl_package_event_types (package_id, event_type_id) VALUES (?, ?)";
            $eventTypeStmt = $this->conn->prepare($eventTypeSql);
            $eventTypeStmt->execute([$packageId, $data['event_type_id']]);

            // Add components to the package
            foreach ($data['components'] as $index => $component) {
                $componentSql = "INSERT INTO tbl_package_inclusions (
                                    package_id, inclusion_name, components_list,
                                    inclusion_price, display_order
                                ) VALUES (?, ?, ?, ?, ?)";

                $componentStmt = $this->conn->prepare($componentSql);
                $componentStmt->execute([
                    $packageId,
                    $component['component_name'],
                    $component['component_description'] ?? '',
                    $component['component_price'],
                    $index
                ]);
            }

            // Link venue if provided
            if (!empty($data['venue_id'])) {
                $venueSql = "INSERT INTO tbl_package_venues (package_id, venue_id) VALUES (?, ?)";
                $venueStmt = $this->conn->prepare($venueSql);
                $venueStmt->execute([$packageId, $data['venue_id']]);
            }

            $this->conn->commit();

            return json_encode([
                "status" => "success",
                "message" => "Customized package created successfully",
                "package_id" => $packageId,
                "package_price" => $totalPrice
            ]);

        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollback();
            }
            error_log("createCustomizedPackage error: " . $e->getMessage());
            return json_encode([
                "status" => "error",
                "message" => "Server error occurred",
                "debug" => [
                    "error" => $e->getMessage(),
                    "file" => basename($e->getFile()),
                    "line" => $e->getLine()
                ]
            ]);
        }
    }

    // Add other essential methods that might be needed
    public function getClients() {
        try {
            // Get pagination parameters
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
            $offset = ($page - 1) * $limit;

            // Get search and filter parameters
            $search = isset($_GET['search']) ? trim($_GET['search']) : '';
            $status = isset($_GET['status']) ? trim($_GET['status']) : '';
            $activity_level = isset($_GET['activity_level']) ? trim($_GET['activity_level']) : '';

            // Build WHERE conditions
            $whereConditions = ["u.user_role = 'client'", "u.account_status != 'deleted'"];
            $params = [];

            // Add search condition
            if (!empty($search)) {
                $whereConditions[] = "(u.user_firstName LIKE ? OR u.user_lastName LIKE ? OR u.user_email LIKE ? OR u.user_contact LIKE ? OR u.user_address LIKE ?)";
                $searchParam = "%{$search}%";
                $params = array_merge($params, [$searchParam, $searchParam, $searchParam, $searchParam, $searchParam]);
            }

            // Add status filter
            if (!empty($status)) {
                switch ($status) {
                    case 'active':
                        $whereConditions[] = "COUNT(DISTINCT e.event_id) > 0";
                        break;
                    case 'pending':
                        $whereConditions[] = "COUNT(DISTINCT b.booking_id) > 0 AND COUNT(DISTINCT e.event_id) = 0";
                        break;
                    case 'new':
                        $whereConditions[] = "COUNT(DISTINCT b.booking_id) = 0 AND COUNT(DISTINCT e.event_id) = 0";
                        break;
                }
            }

            // Add activity level filter
            if (!empty($activity_level)) {
                switch ($activity_level) {
                    case 'high':
                        $whereConditions[] = "COUNT(DISTINCT e.event_id) > 5";
                        break;
                    case 'medium':
                        $whereConditions[] = "COUNT(DISTINCT e.event_id) BETWEEN 2 AND 5";
                        break;
                    case 'low':
                        $whereConditions[] = "COUNT(DISTINCT e.event_id) = 1";
                        break;
                }
            }

            $whereClause = implode(' AND ', $whereConditions);

            // Get total count for pagination
            $countSql = "SELECT COUNT(DISTINCT u.user_id) as total
                        FROM tbl_users u
                        LEFT JOIN tbl_events e ON u.user_id = e.user_id
                        LEFT JOIN tbl_bookings b ON u.user_id = b.user_id
                        WHERE {$whereClause}";

            $countStmt = $this->pdo->prepare($countSql);
            $countStmt->execute($params);
            $totalClients = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            $totalPages = ceil($totalClients / $limit);

            // Main query with pagination
            $sql = "SELECT
                        u.user_id,
                        u.user_firstName,
                        u.user_lastName,
                        u.user_email,
                        u.user_contact,
                        u.user_address,
                        u.user_city,
                        u.user_state,
                        u.user_zipcode,
                        u.user_country,
                        u.user_pfp,
                        u.created_at as registration_date,
                        COUNT(DISTINCT e.event_id) as total_events,
                        COUNT(DISTINCT b.booking_id) as total_bookings,
                        COALESCE(SUM(p.payment_amount), 0) as total_payments,
                        MAX(e.event_date) as last_event_date
                    FROM tbl_users u
                    LEFT JOIN tbl_events e ON u.user_id = e.user_id
                    LEFT JOIN tbl_bookings b ON u.user_id = b.user_id
                    LEFT JOIN tbl_payments p ON e.event_id = p.event_id AND p.payment_status = 'completed'
                    WHERE {$whereClause}
                    GROUP BY u.user_id
                    ORDER BY u.user_firstName, u.user_lastName
                    LIMIT {$limit} OFFSET {$offset}";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);

            $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "clients" => $clients,
                "pagination" => [
                    "current_page" => $page,
                    "total_pages" => $totalPages,
                    "total_clients" => $totalClients,
                    "per_page" => $limit
                ]
            ]);
        } catch (Exception $e) {
            error_log("getClients error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function deleteClient($clientId) {
        try {
            $this->conn->beginTransaction();

            // First, check if client exists and get their details
            $checkSql = "SELECT user_id, user_firstName, user_lastName, user_email FROM tbl_users WHERE user_id = ? AND user_role = 'client'";
            $checkStmt = $this->conn->prepare($checkSql);
            $checkStmt->execute([$clientId]);
            $client = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$client) {
                throw new Exception('Client not found');
            }

            // Check if client has any active events or bookings
            $activeEventsSql = "SELECT COUNT(*) as count FROM tbl_events WHERE user_id = ? AND event_status IN ('confirmed', 'in_progress', 'pending')";
            $activeEventsStmt = $this->conn->prepare($activeEventsSql);
            $activeEventsStmt->execute([$clientId]);
            $activeEvents = $activeEventsStmt->fetch(PDO::FETCH_ASSOC)['count'];

            $activeBookingsSql = "SELECT COUNT(*) as count FROM tbl_bookings WHERE user_id = ? AND booking_status IN ('confirmed', 'pending')";
            $activeBookingsStmt = $this->conn->prepare($activeBookingsSql);
            $activeBookingsStmt->execute([$clientId]);
            $activeBookings = $activeBookingsStmt->fetch(PDO::FETCH_ASSOC)['count'];

            if ($activeEvents > 0 || $activeBookings > 0) {
                throw new Exception('Cannot delete client with active events or bookings. Please cancel or complete them first.');
            }

            // Soft delete by setting account_status to 'deleted' instead of hard delete
            // This preserves data integrity and allows for potential recovery
            // Check if deleted_at column exists before using it
            $checkColumnSql = "SHOW COLUMNS FROM tbl_users LIKE 'deleted_at'";
            $checkColumnStmt = $this->conn->prepare($checkColumnSql);
            $checkColumnStmt->execute();
            $columnExists = $checkColumnStmt->fetch();

            if ($columnExists) {
                $deleteSql = "UPDATE tbl_users SET account_status = 'deleted', deleted_at = NOW() WHERE user_id = ?";
            } else {
                $deleteSql = "UPDATE tbl_users SET account_status = 'deleted' WHERE user_id = ?";
            }

            $deleteStmt = $this->conn->prepare($deleteSql);
            $deleteStmt->execute([$clientId]);

            // Log the deletion activity if logger is available
            if ($this->logger) {
                $this->logger->logActivity(
                    'client_deleted',
                    $clientId,
                    'Client deleted: ' . $client['user_firstName'] . ' ' . $client['user_lastName'] . ' (' . $client['user_email'] . ')'
                );
            }

            $this->conn->commit();
            return json_encode([
                'status' => 'success',
                'message' => 'Client deleted successfully'
            ]);

        } catch (Exception $e) {
            $this->conn->rollBack();
            error_log("deleteClient error: " . $e->getMessage());
            return json_encode([
                'status' => 'error',
                'message' => 'Error deleting client: ' . $e->getMessage()
            ]);
        }
    }

    public function deleteClients($clientIds) {
        try {
            if (empty($clientIds) || !is_array($clientIds)) {
                throw new Exception('No client IDs provided');
            }

            $this->conn->beginTransaction();
            $deletedCount = 0;
            $errors = [];

            foreach ($clientIds as $clientId) {
                try {
                    // Check if client exists and get their details
                    $checkSql = "SELECT user_id, user_firstName, user_lastName, user_email FROM tbl_users WHERE user_id = ? AND user_role = 'client'";
                    $checkStmt = $this->conn->prepare($checkSql);
                    $checkStmt->execute([$clientId]);
                    $client = $checkStmt->fetch(PDO::FETCH_ASSOC);

                    if (!$client) {
                        $errors[] = "Client ID {$clientId} not found";
                        continue;
                    }

                    // Check if client has any active events or bookings
                    $activeEventsSql = "SELECT COUNT(*) as count FROM tbl_events WHERE user_id = ? AND event_status IN ('confirmed', 'in_progress', 'pending')";
                    $activeEventsStmt = $this->conn->prepare($activeEventsSql);
                    $activeEventsStmt->execute([$clientId]);
                    $activeEvents = $activeEventsStmt->fetch(PDO::FETCH_ASSOC)['count'];

                    $activeBookingsSql = "SELECT COUNT(*) as count FROM tbl_bookings WHERE user_id = ? AND booking_status IN ('confirmed', 'pending')";
                    $activeBookingsStmt = $this->conn->prepare($activeBookingsSql);
                    $activeBookingsStmt->execute([$clientId]);
                    $activeBookings = $activeBookingsStmt->fetch(PDO::FETCH_ASSOC)['count'];

                    if ($activeEvents > 0 || $activeBookings > 0) {
                        $errors[] = "Client {$client['user_firstName']} {$client['user_lastName']} has active events or bookings";
                        continue;
                    }

                    // Soft delete by setting account_status to 'deleted'
                    // Check if deleted_at column exists before using it
                    $checkColumnSql = "SHOW COLUMNS FROM tbl_users LIKE 'deleted_at'";
                    $checkColumnStmt = $this->conn->prepare($checkColumnSql);
                    $checkColumnStmt->execute();
                    $columnExists = $checkColumnStmt->fetch();

                    if ($columnExists) {
                        $deleteSql = "UPDATE tbl_users SET account_status = 'deleted', deleted_at = NOW() WHERE user_id = ?";
                    } else {
                        $deleteSql = "UPDATE tbl_users SET account_status = 'deleted' WHERE user_id = ?";
                    }

                    $deleteStmt = $this->conn->prepare($deleteSql);
                    $deleteStmt->execute([$clientId]);

                    $deletedCount++;

                    // Log the deletion activity if logger is available
                    if ($this->logger) {
                        $this->logger->logActivity(
                            'client_deleted',
                            $clientId,
                            'Client deleted: ' . $client['user_firstName'] . ' ' . $client['user_lastName'] . ' (' . $client['user_email'] . ')'
                        );
                    }

                } catch (Exception $e) {
                    $errors[] = "Error deleting client ID {$clientId}: " . $e->getMessage();
                }
            }

            $this->conn->commit();

            $message = "Successfully deleted {$deletedCount} client(s)";
            if (!empty($errors)) {
                $message .= ". Errors: " . implode('; ', $errors);
            }

            return json_encode([
                'status' => $deletedCount > 0 ? 'success' : 'error',
                'message' => $message,
                'deleted_count' => $deletedCount,
                'errors' => $errors
            ]);

        } catch (Exception $e) {
            $this->conn->rollBack();
            error_log("deleteClients error: " . $e->getMessage());
            return json_encode([
                'status' => 'error',
                'message' => 'Error deleting clients: ' . $e->getMessage()
            ]);
        }
    }

    public function createClient($clientData) {
        try {
            // Validate required fields
            if (empty($clientData['firstName']) || empty($clientData['lastName']) ||
                empty($clientData['email']) || empty($clientData['contact']) ||
                empty($clientData['password'])) {
                return json_encode([
                    "status" => "error",
                    "message" => "Missing required fields: firstName, lastName, email, contact, password"
                ]);
            }

            // Check if email already exists
            $checkEmailSql = "SELECT user_id FROM tbl_users WHERE user_email = ?";
            $checkStmt = $this->pdo->prepare($checkEmailSql);
            $checkStmt->execute([$clientData['email']]);

            if ($checkStmt->fetch()) {
                return json_encode([
                    "status" => "error",
                    "message" => "Email already exists"
                ]);
            }

            // Hash the password
            $hashedPassword = password_hash($clientData['password'], PASSWORD_DEFAULT);

            // Insert new client
            $sql = "INSERT INTO tbl_users (
                        user_firstName,
                        user_lastName,
                        user_email,
                        user_contact,
                        user_address,
                        user_pwd,
                        user_role,
                        is_verified,
                        account_status,
                        created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 'client', 1, 'active', NOW())";

            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute([
                $clientData['firstName'],
                $clientData['lastName'],
                $clientData['email'],
                $clientData['contact'],
                $clientData['address'] ?? null,
                $hashedPassword
            ]);

            if ($result) {
                $clientId = $this->pdo->lastInsertId();
                return json_encode([
                    "status" => "success",
                    "message" => "Client created successfully",
                    "client_id" => $clientId
                ]);
            } else {
                return json_encode([
                    "status" => "error",
                    "message" => "Failed to create client"
                ]);
            }
        } catch (Exception $e) {
            error_log("createClient error: " . $e->getMessage());
            return json_encode([
                "status" => "error",
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
    }

    public function getAvailableBookings() {
        try {
            $sql = "SELECT
                        b.booking_id,
                        b.booking_reference,
                        b.user_id,
                        CONCAT(u.user_firstName COLLATE utf8mb4_unicode_ci, ' ', u.user_lastName COLLATE utf8mb4_unicode_ci) as client_name,
                        u.user_email as client_email,
                        u.user_contact as client_phone,
                        b.event_type_id,
                        et.event_name as event_type_name,
                        b.event_name,
                        b.event_date,
                        b.event_time,
                        b.guest_count,
                        b.venue_id,
                        v.venue_title as venue_name,
                        b.package_id,
                        p.package_title as package_name,
                        b.notes,
                        b.booking_status,
                        b.created_at
                    FROM tbl_bookings b
                    JOIN tbl_users u ON b.user_id = u.user_id
                    JOIN tbl_event_type et ON b.event_type_id = et.event_type_id
                    LEFT JOIN tbl_venue v ON b.venue_id = v.venue_id
                    LEFT JOIN tbl_packages p ON b.package_id = p.package_id
                    LEFT JOIN tbl_events e ON b.booking_reference = e.original_booking_reference
                    WHERE b.booking_status = 'confirmed'
                    AND e.event_id IS NULL
                    ORDER BY b.created_at DESC";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();

            $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "bookings" => $bookings
            ]);
        } catch (Exception $e) {
            error_log("getAvailableBookings error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function getBookingByReference($reference) {
        try {
            // First try to find confirmed bookings
            $sql = "SELECT b.*,
                        u.user_id, u.user_firstName, u.user_lastName, u.user_email, u.user_contact,
                        et.event_name as event_type_name,
                        v.venue_title as venue_name,
                        p.package_title as package_name,
                        CASE WHEN e.event_id IS NOT NULL THEN 1 ELSE 0 END as is_converted,
                        e.event_id as converted_event_id
                    FROM tbl_bookings b
                    JOIN tbl_users u ON b.user_id = u.user_id
                    JOIN tbl_event_type et ON b.event_type_id = et.event_type_id
                    LEFT JOIN tbl_venue v ON b.venue_id = v.venue_id
                    LEFT JOIN tbl_packages p ON b.package_id = p.package_id
                    LEFT JOIN tbl_events e ON b.booking_reference = e.original_booking_reference
                    WHERE b.booking_reference = :reference
                    AND b.booking_status = 'confirmed'";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':reference' => $reference]);

            $booking = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($booking) {
                error_log("getBookingByReference: Found confirmed booking for reference: " . $reference);
                return json_encode(["status" => "success", "booking" => $booking]);
            } else {
                // If no confirmed booking found, try to find any booking with this reference
                $sqlAny = "SELECT b.*,
                            u.user_id, u.user_firstName, u.user_lastName, u.user_email, u.user_contact,
                            et.event_name as event_type_name,
                            v.venue_title as venue_name,
                            p.package_title as package_name,
                            CASE WHEN e.event_id IS NOT NULL THEN 1 ELSE 0 END as is_converted,
                            e.event_id as converted_event_id
                        FROM tbl_bookings b
                        JOIN tbl_users u ON b.user_id = u.user_id
                        JOIN tbl_event_type et ON b.event_type_id = et.event_type_id
                        LEFT JOIN tbl_venue v ON b.venue_id = v.venue_id
                        LEFT JOIN tbl_packages p ON b.package_id = p.package_id
                        LEFT JOIN tbl_events e ON b.booking_reference = e.original_booking_reference
                        WHERE b.booking_reference = :reference";

                $stmtAny = $this->conn->prepare($sqlAny);
                $stmtAny->execute([':reference' => $reference]);

                $bookingAny = $stmtAny->fetch(PDO::FETCH_ASSOC);

                if ($bookingAny) {
                    error_log("getBookingByReference: Found booking with status '" . $bookingAny['booking_status'] . "' for reference: " . $reference);
                    return json_encode([
                        "status" => "error",
                        "message" => "Booking found but status is '" . $bookingAny['booking_status'] . "'. Only confirmed bookings can be converted to events.",
                        "booking_status" => $bookingAny['booking_status']
                    ]);
                } else {
                    error_log("getBookingByReference: No booking found for reference: " . $reference);
                    return json_encode(["status" => "error", "message" => "Booking not found"]);
                }
            }
        } catch (Exception $e) {
            error_log("getBookingByReference error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }



    // Placeholder methods for missing functionality - these prevent fatal errors
    // ==================== SUPPLIER MANAGEMENT ====================

    // Create a new supplier (Admin only)
    // Enhanced supplier creation with auto-generated credentials and email notification
    public function createSupplier($data) {
        try {
            $this->conn->beginTransaction();

            // Validate required fields
            $required = ['business_name', 'contact_number', 'contact_email', 'supplier_type'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    throw new Exception("$field is required");
                }
            }

            // Validate email format
            if (!filter_var($data['contact_email'], FILTER_VALIDATE_EMAIL)) {
                throw new Exception("Invalid email format");
            }

            // Check for duplicate business name or email
            $checkStmt = $this->conn->prepare("SELECT supplier_id FROM tbl_suppliers WHERE (business_name = ? OR contact_email = ?) AND is_active = 1");
            $checkStmt->execute([$data['business_name'], $data['contact_email']]);
            if ($checkStmt->fetch(PDO::FETCH_ASSOC)) {
                throw new Exception("A supplier with this business name or email already exists");
            }

            // Check if email already exists in users table
            $userEmailCheck = $this->conn->prepare("SELECT user_id FROM tbl_users WHERE user_email = ?");
            $userEmailCheck->execute([$data['contact_email']]);
            if ($userEmailCheck->fetch(PDO::FETCH_ASSOC)) {
                throw new Exception("An account with this email already exists");
            }

            $userId = null;
            $tempPassword = null;

            // Create user account for internal suppliers
            if ($data['supplier_type'] === 'internal') {
                // Generate secure random password
                $tempPassword = $this->generateSecurePassword();
                $hashedPassword = password_hash($tempPassword, PASSWORD_DEFAULT);

                // Parse contact person or use business name
                $nameParts = $this->parseContactPersonName($data['contact_person'] ?? $data['business_name']);

                $userSql = "INSERT INTO tbl_users (
                               user_firstName, user_lastName, user_email, user_contact,
                               user_pwd, user_role, force_password_change, account_status, created_at
                           ) VALUES (?, ?, ?, ?, ?, 'supplier', 1, 'active', NOW())";

                $userStmt = $this->conn->prepare($userSql);
                $userStmt->execute([
                    $nameParts['firstName'],
                    $nameParts['lastName'],
                    $data['contact_email'],
                    $data['contact_number'],
                    $hashedPassword
                ]);

                $userId = $this->conn->lastInsertId();
            }

            // Insert supplier with existing table structure
            $sql = "INSERT INTO tbl_suppliers (
                        user_id, supplier_type, business_name, contact_number, contact_email,
                        contact_person, business_address, agreement_signed, registration_docs,
                        business_description, specialty_category, is_active, is_verified,
                        created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())";

            $stmt = $this->conn->prepare($sql);

            $agreementSigned = isset($data['agreement_signed']) ? (int)$data['agreement_signed'] : 0;
            $registrationDocs = isset($data['registration_docs']) ? json_encode($data['registration_docs']) : null;
            $isVerified = isset($data['is_verified']) ? (int)$data['is_verified'] : 0;

            $stmt->execute([
                $userId,
                $data['supplier_type'],
                $data['business_name'],
                $data['contact_number'],
                $data['contact_email'],
                $data['contact_person'] ?? null,
                $data['business_address'] ?? null,
                $agreementSigned,
                $registrationDocs,
                $data['business_description'] ?? null,
                $data['specialty_category'] ?? null,
                $isVerified
            ]);

            $supplierId = $this->conn->lastInsertId();

            // Store temporary credentials for email sending
            if ($tempPassword && $userId) {
                $credentialSql = "INSERT INTO tbl_supplier_credentials (
                                     supplier_id, user_id, temp_password_hash, expires_at, created_at
                                 ) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())";

                $credentialStmt = $this->conn->prepare($credentialSql);
                $credentialStmt->execute([$supplierId, $userId, password_hash($tempPassword, PASSWORD_DEFAULT)]);
            }

            // Log supplier creation activity
            $this->logSupplierActivity($supplierId, 'created', 'Supplier account created by admin', null, [
                'admin_id' => $data['admin_id'] ?? null,
                'supplier_type' => $data['supplier_type']
            ]);

            // Handle document uploads if provided
            if (isset($data['documents']) && is_array($data['documents'])) {
                foreach ($data['documents'] as $document) {
                    $this->saveSupplierDocument($supplierId, $document, $data['admin_id'] ?? null);
                }
            }

            // Handle pricing tiers if provided
            if (isset($data['registration_docs']['tiers']) && is_array($data['registration_docs']['tiers'])) {
                $tierLevel = 1;
                foreach ($data['registration_docs']['tiers'] as $tier) {
                    if (!empty($tier['name']) && isset($tier['price']) && $tier['price'] >= 0) {
                        $tierSql = "INSERT INTO tbl_supplier_offers (
                                        supplier_id, offer_title, offer_description, price_min, price_max,
                                        service_category, tier_level, delivery_timeframe, terms_conditions,
                                        is_active, created_at
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())";

                        $tierStmt = $this->conn->prepare($tierSql);
                        $tierStmt->execute([
                            $supplierId,
                            $tier['name'],
                            $tier['description'] ?? '',
                            $tier['price'],
                            $tier['price'], // Use same price for min and max
                            $data['specialty_category'] ?? 'General',
                            $tierLevel,
                            'Standard delivery',
                            'Standard terms and conditions',
                        ]);
                        $tierLevel++;
                    }
                }
            }

            $this->conn->commit();

            // Send welcome email for internal suppliers
            $emailSent = false;
            if ($data['supplier_type'] === 'internal' && $tempPassword) {
                $emailSent = $this->sendSupplierWelcomeEmail(
                    $data['contact_email'],
                    $data['contact_person'] ?? $data['business_name'],
                    $tempPassword,
                    $supplierId
                );
            }

            // Determine onboarding status based on created supplier
            $onboardingStatus = 'pending';
            if ($isVerified) {
                $onboardingStatus = 'active';
            } elseif ($agreementSigned) {
                $onboardingStatus = 'verified';
            }

            return json_encode([
                "status" => "success",
                "message" => "Supplier created successfully" . ($emailSent ? " and welcome email sent" : ""),
                "supplier_id" => $supplierId,
                "user_id" => $userId,
                "onboarding_status" => $onboardingStatus,
                "email_sent" => $emailSent,
                "credentials" => $tempPassword ? [
                    "username" => $data['contact_email'], // Use email as username
                    "password" => $tempPassword,
                    "email_sent" => $emailSent
                ] : null
            ]);

        } catch (Exception $e) {
            $this->conn->rollback();
            return json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    }

    // Generate secure random password
    private function generateSecurePassword($length = 12) {
        $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        $password = '';
        $charLength = strlen($chars);

        // Ensure at least one of each type
        $password .= $chars[random_int(0, 25)]; // lowercase
        $password .= $chars[random_int(26, 51)]; // uppercase
        $password .= $chars[random_int(52, 61)]; // number
        $password .= $chars[random_int(62, $charLength - 1)]; // special

        // Fill the rest randomly
        for ($i = 4; $i < $length; $i++) {
            $password .= $chars[random_int(0, $charLength - 1)];
        }

        return str_shuffle($password);
    }

    // Parse contact person name into first and last name
    private function parseContactPersonName($fullName) {
        $nameParts = explode(' ', trim($fullName));
        $firstName = $nameParts[0];
        $lastName = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : 'Account';

        return [
            'firstName' => $firstName,
            'lastName' => $lastName
        ];
    }

    // Log supplier activity
    private function logSupplierActivity($supplierId, $activityType, $description, $relatedId = null, $metadata = null) {
        try {
            $sql = "INSERT INTO tbl_supplier_activity (
                        supplier_id, activity_type, activity_description, related_id, metadata,
                        ip_address, user_agent, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                $supplierId,
                $activityType,
                $description,
                $relatedId,
                $metadata ? json_encode($metadata) : null,
                $_SERVER['REMOTE_ADDR'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null
            ]);
        } catch (Exception $e) {
            error_log("Failed to log supplier activity: " . $e->getMessage());
        }
    }

    // Save supplier document
    private function saveSupplierDocument($supplierId, $documentData, $uploadedBy) {
        try {
            if (!isset($documentData['file_name']) || !isset($documentData['file_path'])) {
                return false;
            }

            $sql = "INSERT INTO tbl_supplier_documents (
                        supplier_id, document_type, document_title, file_name, file_path,
                        file_size, file_type, uploaded_by, is_active, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                $supplierId,
                $documentData['document_type'] ?? 'other',
                $documentData['document_title'] ?? 'Uploaded Document',
                $documentData['file_name'],
                $documentData['file_path'],
                $documentData['file_size'] ?? 0,
                $documentData['file_type'] ?? null,
                $uploadedBy
            ]);

            return true;
        } catch (Exception $e) {
            error_log("Failed to save supplier document: " . $e->getMessage());
            return false;
        }
    }

        // Send supplier welcome email with credentials
    private function sendSupplierWelcomeEmail($email, $supplierName, $tempPassword, $supplierId) {
        try {
            require_once 'vendor/autoload.php';

            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

            // Use existing SMTP configuration from auth.php
            $mail->isSMTP();
            $mail->Host = 'smtp.gmail.com';
            $mail->SMTPAuth = true;
            $mail->Username = 'aizelartunlock@gmail.com';
            $mail->Password = 'nhueuwnriexqdbpt';
            $mail->SMTPSecure = 'tls';
            $mail->Port = 587;

            $mail->setFrom('aizelartunlock@gmail.com', 'Event Planning System');
            $mail->addAddress($email, $supplierName);

            $mail->isHTML(true);
            $mail->Subject = '🎉 Welcome to Event Planning System – Supplier Portal Access Granted';

            // Generate professional welcome email
            $portalUrl = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . '/supplier/login';

            $mail->Body = $this->generateSupplierWelcomeEmailTemplate(
                $supplierName,
                $email,
                $tempPassword,
                $portalUrl
            );

            $mail->AltBody = $this->generateSupplierWelcomeEmailText(
                $supplierName,
                $email,
                $tempPassword,
                $portalUrl
            );

            $success = $mail->send();

            // Log email activity
            $this->logEmailActivity(
                $email,
                $supplierName,
                'supplier_welcome',
                $mail->Subject,
                $success ? 'sent' : 'failed',
                $success ? null : $mail->ErrorInfo,
                null,
                $supplierId
            );

            return $success;

        } catch (Exception $e) {
            error_log("Failed to send supplier welcome email: " . $e->getMessage());

            // Log failed email attempt
            $this->logEmailActivity(
                $email,
                $supplierName,
                'supplier_welcome',
                'Welcome Email Failed',
                'failed',
                $e->getMessage(),
                null,
                $supplierId
            );

            return false;
        }
    }

    // Generate HTML email template for supplier welcome
    private function generateSupplierWelcomeEmailTemplate($supplierName, $email, $tempPassword, $portalUrl) {
        return '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: #f8fafc;
                    line-height: 1.6;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 40px 30px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }
                .header p {
                    margin: 10px 0 0 0;
                    opacity: 0.9;
                    font-size: 16px;
                }
                .content {
                    padding: 40px 30px;
                }
                .welcome-message {
                    font-size: 18px;
                    color: #2d3748;
                    margin-bottom: 30px;
                }
                .credentials-box {
                    background-color: #f7fafc;
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 24px;
                    margin: 30px 0;
                }
                .credentials-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: #2d3748;
                    margin-bottom: 16px;
                }
                .credential-item {
                    margin-bottom: 12px;
                }
                .credential-label {
                    font-weight: 500;
                    color: #4a5568;
                }
                .credential-value {
                    font-family: "Monaco", "Menlo", monospace;
                    background-color: #edf2f7;
                    padding: 8px 12px;
                    border-radius: 4px;
                    border: 1px solid #cbd5e0;
                    font-size: 14px;
                    color: #2d3748;
                    margin-top: 4px;
                    word-break: break-all;
                }
                .features-list {
                    background-color: #f0fff4;
                    border-left: 4px solid #48bb78;
                    padding: 20px;
                    margin: 30px 0;
                }
                .features-list h3 {
                    color: #2f855a;
                    margin-top: 0;
                    font-size: 16px;
                }
                .features-list ul {
                    margin: 12px 0;
                    padding-left: 20px;
                }
                .features-list li {
                    color: #2d3748;
                    margin-bottom: 8px;
                }
                .security-notice {
                    background-color: #fffbeb;
                    border: 1px solid #f6e05e;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 30px 0;
                }
                .security-notice h3 {
                    color: #d69e2e;
                    margin-top: 0;
                    font-size: 16px;
                }
                .security-notice ol {
                    margin: 12px 0;
                    padding-left: 20px;
                }
                .security-notice li {
                    color: #744210;
                    margin-bottom: 8px;
                }
                .cta-button {
                    display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-decoration: none;
                    padding: 14px 28px;
                    border-radius: 8px;
                    font-weight: 600;
                    margin: 20px 0;
                    text-align: center;
                }
                .footer {
                    background-color: #2d3748;
                    color: #a0aec0;
                    padding: 30px;
                    text-align: center;
                    font-size: 14px;
                }
                .footer p {
                    margin: 8px 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Welcome to Event Planning System</h1>
                    <p>Supplier Portal Access Granted</p>
                </div>

                <div class="content">
                    <div class="welcome-message">
                        Dear <strong>' . htmlspecialchars($supplierName) . '</strong>,
                    </div>

                    <p>Congratulations! You are now officially onboarded as a partnered supplier of <strong>Event Planning System</strong>.</p>

                    <div class="features-list">
                        <h3>🚀 As part of our supplier network, you can now:</h3>
                        <ul>
                            <li>Manage your service tiers and packages</li>
                            <li>View assigned events and bookings</li>
                            <li>Upload proposals and portfolio items</li>
                            <li>Track payment schedules and earnings</li>
                            <li>Receive client feedback and ratings</li>
                            <li>Access comprehensive analytics dashboard</li>
                        </ul>
                    </div>

                    <div class="credentials-box">
                        <div class="credentials-title">🔐 Your Login Credentials:</div>
                        <div class="credential-item">
                            <div class="credential-label">Username/Email:</div>
                            <div class="credential-value">' . htmlspecialchars($email) . '</div>
                        </div>
                        <div class="credential-item">
                            <div class="credential-label">Temporary Password:</div>
                            <div class="credential-value">' . htmlspecialchars($tempPassword) . '</div>
                        </div>
                    </div>

                    <div class="security-notice">
                        <h3>🔒 Important Security Steps:</h3>
                        <ol>
                            <li>Log in to the Supplier Portal using the link below</li>
                            <li><strong>Change your password immediately</strong> after first login</li>
                            <li>Keep your credentials private and secure</li>
                            <li>Enable two-factor authentication if available</li>
                        </ol>
                    </div>

                    <div style="text-align: center;">
                        <a href="' . htmlspecialchars($portalUrl) . '" class="cta-button">
                            Access Supplier Portal →
                        </a>
                    </div>

                    <p><strong>Important:</strong> Do not reply to this message. If you did not expect this access or have any questions, please contact our admin team immediately.</p>
                </div>

                <div class="footer">
                    <p><strong>Event Planning System</strong></p>
                    <p>Admin Team | support@eventplanning.com</p>
                    <p>This is an automated message. Please do not reply.</p>
                </div>
            </div>
        </body>
        </html>';
    }

    // Generate plain text email for supplier welcome
    private function generateSupplierWelcomeEmailText($supplierName, $email, $tempPassword, $portalUrl) {
        return "
WELCOME TO EVENT PLANNING SYSTEM - SUPPLIER PORTAL ACCESS GRANTED

Dear {$supplierName},

Congratulations! You are now officially onboarded as a partnered supplier of Event Planning System.

As part of our supplier network, you can now:
- Manage your service tiers and packages
- View assigned events and bookings
- Upload proposals and portfolio items
- Track payment schedules and earnings
- Receive client feedback and ratings
- Access comprehensive analytics dashboard

YOUR LOGIN CREDENTIALS:
Username/Email: {$email}
Temporary Password: {$tempPassword}

IMPORTANT SECURITY STEPS:
1. Log in to the Supplier Portal at: {$portalUrl}
2. Change your password immediately after first login
3. Keep your credentials private and secure
4. Enable two-factor authentication if available

Do not reply to this message. If you did not expect this access or have any questions, please contact our admin team immediately.

Regards,
Event Planning System Admin Team
support@eventplanning.com

This is an automated message. Please do not reply.
        ";
    }

    // Log email activity
    private function logEmailActivity($recipientEmail, $recipientName, $emailType, $subject, $status, $errorMessage = null, $userId = null, $supplierId = null) {
        try {
            $sql = "INSERT INTO tbl_email_logs (
                        recipient_email, recipient_name, email_type, subject, sent_status,
                        sent_at, error_message, related_user_id, related_supplier_id, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                $recipientEmail,
                $recipientName,
                $emailType,
                $subject,
                $status,
                $status === 'sent' ? date('Y-m-d H:i:s') : null,
                $errorMessage,
                $userId,
                $supplierId
            ]);
        } catch (Exception $e) {
            error_log("Failed to log email activity: " . $e->getMessage());
        }
    }

    // Get all suppliers with pagination and filtering (Admin view)
    public function getAllSuppliers($page = 1, $limit = 20, $filters = []) {
        try {
            $offset = ($page - 1) * $limit;

            $whereClauses = ["s.is_active = 1"];
            $params = [];

            // Apply filters
            if (!empty($filters['supplier_type'])) {
                $whereClauses[] = "s.supplier_type = ?";
                $params[] = $filters['supplier_type'];
            }

            if (!empty($filters['specialty_category'])) {
                $whereClauses[] = "s.specialty_category = ?";
                $params[] = $filters['specialty_category'];
            }

            if (!empty($filters['is_verified'])) {
                $whereClauses[] = "s.is_verified = ?";
                $params[] = (int)$filters['is_verified'];
            }

            if (!empty($filters['onboarding_status'])) {
                switch ($filters['onboarding_status']) {
                    case 'active':
                        $whereClauses[] = "s.is_verified = 1";
                        break;
                    case 'verified':
                        $whereClauses[] = "s.is_verified = 0 AND s.agreement_signed = 1";
                        break;
                    case 'pending':
                        $whereClauses[] = "s.is_verified = 0 AND s.agreement_signed = 0";
                        break;
                    case 'documents_uploaded':
                        $whereClauses[] = "s.is_verified = 0 AND s.agreement_signed = 0";
                        break;
                    case 'suspended':
                        $whereClauses[] = "s.is_active = 0";
                        break;
                }
            }

            if (!empty($filters['search'])) {
                $whereClauses[] = "(s.business_name LIKE ? OR s.contact_person LIKE ? OR s.contact_email LIKE ?)";
                $searchTerm = "%" . $filters['search'] . "%";
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }

            $whereSQL = "WHERE " . implode(" AND ", $whereClauses);

            // Get total count
            $countSql = "SELECT COUNT(*) as total FROM tbl_suppliers s $whereSQL";
            $countStmt = $this->conn->prepare($countSql);
            $countStmt->execute($params);
            $totalResult = $countStmt->fetch();
            $total = $totalResult['total'];

            // Get suppliers with basic information first (simplified query for debugging)
            $sql = "SELECT s.*
                    FROM tbl_suppliers s
                    $whereSQL
                    ORDER BY s.created_at DESC
                    LIMIT ? OFFSET ?";

            $stmt = $this->conn->prepare($sql);
            $params[] = $limit;
            $params[] = $offset;

            // Debug logging (commented out for production)
            // error_log("getAllSuppliers SQL: " . $sql);
            // error_log("getAllSuppliers params: " . print_r($params, true));

            $stmt->execute($params);

            $suppliers = [];
            while ($row = $stmt->fetch()) {
                // Parse registration docs
                $row['registration_docs'] = $row['registration_docs'] ? json_decode($row['registration_docs'], true) : [];

                // Set default values for missing fields
                $row['total_offers'] = 0;
                $row['total_bookings'] = 0;
                $row['total_ratings'] = $row['total_ratings'] ?? 0;
                $row['total_documents'] = 0;

                // Set default onboarding status based on existing fields
                if ($row['is_verified']) {
                    $row['onboarding_status'] = 'active';
                } elseif ($row['agreement_signed']) {
                    $row['onboarding_status'] = 'verified';
                } else {
                    $row['onboarding_status'] = 'pending';
                }

                // Set default values for other missing fields
                $row['last_activity'] = $row['updated_at'] ?? $row['created_at'];

                $suppliers[] = $row;
            }

            // Debug logging (commented out for production)
            // error_log("getAllSuppliers found " . count($suppliers) . " suppliers");
            // if (count($suppliers) > 0) {
            //     error_log("First supplier: " . print_r($suppliers[0], true));
            // }

            return json_encode([
                "status" => "success",
                "suppliers" => $suppliers,
                "pagination" => [
                    "current_page" => $page,
                    "total_pages" => ceil($total / $limit),
                    "total_records" => $total,
                    "limit" => $limit
                ]
            ]);

        } catch (Exception $e) {
            return json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    }

    // New method specifically for event builder supplier selection
    public function getSuppliersForEventBuilder($page = 1, $limit = 100, $filters = []) {
        try {
            $offset = ($page - 1) * $limit;

            $whereClauses = ["s.is_active = 1", "s.is_verified = 1"];
            $params = [];

            // Apply filters
            if (!empty($filters['specialty_category'])) {
                $whereClauses[] = "s.specialty_category = ?";
                $params[] = $filters['specialty_category'];
            }

            if (!empty($filters['search'])) {
                $whereClauses[] = "(s.business_name LIKE ? OR s.contact_person LIKE ? OR s.contact_email LIKE ?)";
                $searchTerm = "%" . $filters['search'] . "%";
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }

            $whereSQL = "WHERE " . implode(" AND ", $whereClauses);

            // Get total count
            $countSql = "SELECT COUNT(*) as total FROM tbl_suppliers s $whereSQL";
            $countStmt = $this->conn->prepare($countSql);
            $countStmt->execute($params);
            $totalResult = $countStmt->fetch();
            $total = $totalResult['total'];

            // Get suppliers with offers for pricing tiers
            $sql = "SELECT
                        s.supplier_id,
                        s.business_name,
                        s.specialty_category,
                        s.contact_email,
                        s.contact_number,
                        s.contact_person,
                        s.business_description,
                        s.rating_average,
                        s.total_ratings,
                        s.is_active,
                        s.is_verified,
                        s.created_at,
                        s.updated_at
                    FROM tbl_suppliers s
                    $whereSQL
                    ORDER BY s.business_name ASC
                    LIMIT ? OFFSET ?";

            $stmt = $this->conn->prepare($sql);
            $params[] = $limit;
            $params[] = $offset;
            $stmt->execute($params);

            $suppliers = [];
            while ($row = $stmt->fetch()) {
                // Get pricing tiers from offers
                $offersSql = "SELECT
                                offer_title,
                                price_min,
                                price_max,
                                service_category,
                                package_size
                              FROM tbl_supplier_offers
                              WHERE supplier_id = ? AND is_active = 1
                              ORDER BY price_min ASC";

                $offersStmt = $this->conn->prepare($offersSql);
                $offersStmt->execute([$row['supplier_id']]);
                $offers = $offersStmt->fetchAll();

                // Format pricing tiers
                $pricingTiers = [];
                foreach ($offers as $offer) {
                    $pricingTiers[] = [
                        'tier_name' => $offer['offer_title'],
                        'tier_price' => (float)$offer['price_min'],
                        'tier_description' => $offer['service_category'] . ' - ' . $offer['package_size']
                    ];
                }

                // Format supplier data for frontend
                $formattedSupplier = [
                    'supplier_id' => $row['supplier_id'],
                    'supplier_name' => $row['business_name'],
                    'supplier_category' => $row['specialty_category'],
                    'supplier_email' => $row['contact_email'],
                    'supplier_phone' => $row['contact_number'],
                    'supplier_status' => $row['is_active'] ? 'active' : 'inactive',
                    'pricing_tiers' => $pricingTiers,
                    'rating_average' => (float)$row['rating_average'],
                    'total_ratings' => (int)$row['total_ratings'],
                    'business_description' => $row['business_description'],
                    'contact_person' => $row['contact_person']
                ];

                $suppliers[] = $formattedSupplier;
            }

            return json_encode([
                "status" => "success",
                "data" => [
                    "suppliers" => $suppliers,
                    "pagination" => [
                        "current_page" => $page,
                        "total_pages" => ceil($total / $limit),
                        "total_records" => $total,
                        "per_page" => $limit
                    ]
                ]
            ]);

        } catch (Exception $e) {
            return json_encode(["status" => "error", "message" => "Error fetching suppliers: " . $e->getMessage()]);
        }
    }

    // Get suppliers for package editing with offers and pricing tiers
    public function getSuppliersForPackage($page = 1, $limit = 100, $filters = []) {
        try {
            $offset = ($page - 1) * $limit;

            $whereClauses = ["s.is_active = 1"];
            $params = [];

            // Apply filters
            if (!empty($filters['specialty_category'])) {
                $whereClauses[] = "s.specialty_category = ?";
                $params[] = $filters['specialty_category'];
            }

            if (!empty($filters['search'])) {
                $whereClauses[] = "(s.business_name LIKE ? OR s.specialty_category LIKE ?)";
                $searchTerm = "%" . $filters['search'] . "%";
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }

            $whereSQL = !empty($whereClauses) ? "WHERE " . implode(" AND ", $whereClauses) : "";

            // Get total count
            $countSql = "SELECT COUNT(*) as total FROM tbl_suppliers s $whereSQL";
            $countStmt = $this->conn->prepare($countSql);
            $countStmt->execute($params);
            $total = $countStmt->fetch()['total'];

            // Get suppliers with offers for pricing tiers
            $sql = "SELECT DISTINCT
                        s.supplier_id,
                        s.business_name,
                        s.specialty_category,
                        s.contact_email,
                        s.contact_number,
                        s.is_active,
                        s.is_verified,
                        s.created_at,
                        s.registration_docs
                    FROM tbl_suppliers s
                    LEFT JOIN tbl_supplier_offers so ON s.supplier_id = so.supplier_id AND so.is_active = 1
                    $whereSQL
                    ORDER BY s.business_name ASC
                    LIMIT ? OFFSET ?";

            $params[] = $limit;
            $params[] = $offset;

            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);

            $suppliers = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $offers = [];

                // First, try to get offers from tbl_supplier_offers table
                $offersSql = "SELECT
                                offer_id,
                                offer_title,
                                offer_description,
                                price_min,
                                price_max,
                                tier_level,
                                offer_attachments
                              FROM tbl_supplier_offers
                              WHERE supplier_id = ? AND is_active = 1
                              ORDER BY tier_level ASC, price_min ASC";

                $offersStmt = $this->conn->prepare($offersSql);
                $offersStmt->execute([$row['supplier_id']]);
                $dbOffers = $offersStmt->fetchAll(PDO::FETCH_ASSOC);

                // If no offers in database, check registration_docs for tier information
                if (empty($dbOffers) && $row['registration_docs']) {
                    $registrationDocs = json_decode($row['registration_docs'], true);
                    if (isset($registrationDocs['tiers']) && is_array($registrationDocs['tiers'])) {
                        foreach ($registrationDocs['tiers'] as $index => $tier) {
                            $offers[] = [
                                'offer_id' => 'json_' . $row['supplier_id'] . '_' . $index,
                                'offer_title' => $tier['name'] ?? 'Tier ' . ($index + 1),
                                'offer_description' => $tier['description'] ?? '',
                                'price_min' => floatval($tier['price'] ?? 0),
                                'price_max' => floatval($tier['price'] ?? 0),
                                'tier_level' => $index + 1,
                                'offer_attachments' => []
                            ];
                        }
                    }
                } else {
                    $offers = $dbOffers;
                }

                // Format offers
                foreach ($offers as &$offer) {
                    $offer['offer_attachments'] = $offer['offer_attachments'] ? json_decode($offer['offer_attachments'], true) : [];
                }

                // Format supplier data for frontend
                $formattedSupplier = [
                    'supplier_id' => $row['supplier_id'],
                    'supplier_name' => $row['business_name'],
                    'supplier_category' => $row['specialty_category'],
                    'supplier_email' => $row['contact_email'],
                    'supplier_phone' => $row['contact_number'],
                    'supplier_status' => $row['is_active'] ? 'active' : 'inactive',
                    'is_verified' => (bool)$row['is_verified'],
                    'created_at' => $row['created_at'],
                    'offers' => $offers
                ];

                $suppliers[] = $formattedSupplier;
            }

            return json_encode([
                "status" => "success",
                "suppliers" => $suppliers,
                "pagination" => [
                    "current_page" => $page,
                    "per_page" => $limit,
                    "total" => $total,
                    "total_pages" => ceil($total / $limit)
                ]
            ]);

        } catch (Exception $e) {
            error_log("Error in getSuppliersForPackage: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Error fetching suppliers: " . $e->getMessage()]);
        }
    }

    // Get supplier by ID with complete details (Admin view)
    public function getSupplierById($supplierId) {
        try {
            $sql = "SELECT s.*,
                           u.user_firstName, u.user_lastName, u.user_email as user_account_email
                    FROM tbl_suppliers s
                    LEFT JOIN tbl_users u ON s.user_id = u.user_id
                    WHERE s.supplier_id = ? AND s.is_active = 1";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$supplierId]);
            $supplier = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$supplier) {
                return json_encode(["status" => "error", "message" => "Supplier not found"]);
            }

            $supplier['registration_docs'] = $supplier['registration_docs'] ? json_decode($supplier['registration_docs'], true) : [];

            // Get supplier offers with subcomponents
            $offersSql = "SELECT so.*,
                        GROUP_CONCAT(CONCAT(sc.component_name COLLATE utf8mb4_unicode_ci, '|', sc.component_description COLLATE utf8mb4_unicode_ci) SEPARATOR ';;') as subcomponents
                          FROM tbl_supplier_offers so
                          LEFT JOIN tbl_offer_subcomponents sc ON so.offer_id = sc.offer_id AND sc.is_active = 1
                          WHERE so.supplier_id = ? AND so.is_active = 1
                          GROUP BY so.offer_id
                          ORDER BY so.tier_level ASC, so.created_at DESC";
            $offersStmt = $this->conn->prepare($offersSql);
            $offersStmt->execute([$supplierId]);

            $offers = [];
            while ($offer = $offersStmt->fetch()) {
                $offer['offer_attachments'] = $offer['offer_attachments'] ? json_decode($offer['offer_attachments'], true) : [];

                // Parse subcomponents
                $subcomponents = [];
                if ($offer['subcomponents']) {
                    $components = explode(';;', $offer['subcomponents']);
                    foreach ($components as $comp) {
                        $parts = explode('|', $comp);
                        if (count($parts) >= 2) {
                            $subcomponents[] = [
                                'title' => $parts[0],
                                'description' => $parts[1],
                                'is_customizable' => false // Default value since column doesn't exist
                            ];
                        }
                    }
                }
                $offer['subcomponents'] = $subcomponents;
                unset($offer['subcomponents_raw']);

                $offers[] = $offer;
            }
            $supplier['offers'] = $offers;

            // Get supplier documents
            $docsSql = "SELECT * FROM tbl_supplier_documents WHERE supplier_id = ? AND is_active = 1 ORDER BY created_at DESC";
            $docsStmt = $this->conn->prepare($docsSql);
            $docsStmt->execute([$supplierId]);

            $documents = [];
            while ($doc = $docsStmt->fetch()) {
                $documents[] = $doc;
            }
            $supplier['documents'] = $documents;

            // Get recent ratings with event details
            $ratingsSql = "SELECT sr.*, u.user_firstName, u.user_lastName, e.event_title, ec.component_name
                          FROM tbl_supplier_ratings sr
                          LEFT JOIN tbl_users u ON sr.client_id = u.user_id
                          LEFT JOIN tbl_events e ON sr.event_id = e.event_id
                          LEFT JOIN tbl_event_components ec ON sr.event_component_id = ec.event_component_id
                          WHERE sr.supplier_id = ? AND sr.is_public = 1
                          ORDER BY sr.created_at DESC
                          LIMIT 10";
            $ratingsStmt = $this->conn->prepare($ratingsSql);
            $ratingsStmt->execute([$supplierId]);

            $ratings = [];
            while ($rating = $ratingsStmt->fetch()) {
                $rating['feedback_attachments'] = $rating['feedback_attachments'] ? json_decode($rating['feedback_attachments'], true) : [];
                $ratings[] = $rating;
            }
            $supplier['recent_ratings'] = $ratings;

            // Get supplier activity log
            $activitySql = "SELECT * FROM tbl_supplier_activity WHERE supplier_id = ? ORDER BY created_at DESC LIMIT 20";
            $activityStmt = $this->conn->prepare($activitySql);
            $activityStmt->execute([$supplierId]);

            $activities = [];
            while ($activity = $activityStmt->fetch()) {
                $activity['metadata'] = $activity['metadata'] ? json_decode($activity['metadata'], true) : [];
                $activities[] = $activity;
            }
            $supplier['recent_activities'] = $activities;

            return json_encode([
                "status" => "success",
                "supplier" => $supplier
            ]);

        } catch (Exception $e) {
            return json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    }

    // Update supplier (Admin only)
    public function updateSupplier($supplierId, $data) {
        try {
            $this->conn->beginTransaction();

            // Check if supplier exists
            $checkStmt = $this->conn->prepare("SELECT user_id FROM tbl_suppliers WHERE supplier_id = ? AND is_active = 1");
            $checkStmt->execute([$supplierId]);
            $supplierData = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$supplierData) {
                throw new Exception("Supplier not found");
            }

            // Update user account if exists and email is being changed
            if ($supplierData['user_id'] && isset($data['contact_email'])) {
                $userUpdateStmt = $this->conn->prepare("UPDATE tbl_users SET user_email = ? WHERE user_id = ?");
                $userUpdateStmt->execute([$data['contact_email'], $supplierData['user_id']]);
            }

            // Build update query dynamically
            $updateFields = [];
            $params = [];

            $allowedFields = [
                'business_name', 'contact_number', 'contact_email', 'contact_person',
                'business_address', 'agreement_signed', 'business_description',
                'specialty_category', 'is_verified'
            ];

            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updateFields[] = "$field = ?";
                    $params[] = $data[$field];
                }
            }

            if (isset($data['registration_docs'])) {
                $updateFields[] = "registration_docs = ?";
                $params[] = json_encode($data['registration_docs']);
            }

            if (empty($updateFields)) {
                throw new Exception("No fields to update");
            }

            $updateFields[] = "updated_at = NOW()";
            $params[] = $supplierId;

            $sql = "UPDATE tbl_suppliers SET " . implode(", ", $updateFields) . " WHERE supplier_id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);

            // Handle pricing tiers update if provided
            if (isset($data['registration_docs']['tiers']) && is_array($data['registration_docs']['tiers'])) {
                // First, deactivate existing offers
                $deactivateSql = "UPDATE tbl_supplier_offers SET is_active = 0, updated_at = NOW() WHERE supplier_id = ?";
                $deactivateStmt = $this->conn->prepare($deactivateSql);
                $deactivateStmt->execute([$supplierId]);

                // Then create new offers for the tiers
                $tierLevel = 1;
                foreach ($data['registration_docs']['tiers'] as $tier) {
                    if (!empty($tier['name']) && isset($tier['price']) && $tier['price'] >= 0) {
                        $tierSql = "INSERT INTO tbl_supplier_offers (
                                        supplier_id, offer_title, offer_description, price_min, price_max,
                                        service_category, tier_level, delivery_timeframe, terms_conditions,
                                        is_active, created_at
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())";

                        $tierStmt = $this->conn->prepare($tierSql);
                        $tierStmt->execute([
                            $supplierId,
                            $tier['name'],
                            $tier['description'] ?? '',
                            $tier['price'],
                            $tier['price'], // Use same price for min and max
                            $data['specialty_category'] ?? 'General',
                            $tierLevel,
                            'Standard delivery',
                            'Standard terms and conditions',
                        ]);
                        $tierLevel++;
                    }
                }
            }

            $this->conn->commit();

            return json_encode([
                "status" => "success",
                "message" => "Supplier updated successfully"
            ]);

        } catch (Exception $e) {
            $this->conn->rollback();
            return json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    }

    // Delete supplier (Admin only - soft delete)
    public function deleteSupplier($supplierId) {
        try {
            $stmt = $this->conn->prepare("UPDATE tbl_suppliers SET is_active = 0, updated_at = NOW() WHERE supplier_id = ?");
            $stmt->execute([$supplierId]);

            if ($stmt->rowCount() === 0) {
                return json_encode(["status" => "error", "message" => "Supplier not found"]);
            }

            return json_encode([
                "status" => "success",
                "message" => "Supplier deleted successfully"
            ]);

        } catch (Exception $e) {
            return json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    }

    // Get supplier categories for filtering (Admin use)
    public function getSupplierCategories() {
        try {
            $sql = "SELECT DISTINCT specialty_category
                    FROM tbl_suppliers
                    WHERE specialty_category IS NOT NULL AND is_active = 1
                    ORDER BY specialty_category";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();

            $categories = [];
            while ($row = $stmt->fetch()) {
                $categories[] = $row['specialty_category'];
            }

            return json_encode([
                "status" => "success",
                "categories" => $categories
            ]);

        } catch (Exception $e) {
            return json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    }

    // Get supplier statistics for admin dashboard
    public function getSupplierStats() {
        try {
            $sql = "SELECT
                        COUNT(*) as total_suppliers,
                        SUM(CASE WHEN supplier_type = 'internal' THEN 1 ELSE 0 END) as internal_suppliers,
                        SUM(CASE WHEN supplier_type = 'external' THEN 1 ELSE 0 END) as external_suppliers,
                        SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_suppliers,
                        AVG(rating_average) as overall_avg_rating
                    FROM tbl_suppliers
                    WHERE is_active = 1";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $stats = $stmt->fetch();

            // Get category breakdown
            $categorySql = "SELECT specialty_category, COUNT(*) as count
                           FROM tbl_suppliers
                           WHERE is_active = 1 AND specialty_category IS NOT NULL
                           GROUP BY specialty_category
                           ORDER BY count DESC";

            $categoryStmt = $this->conn->prepare($categorySql);
            $categoryStmt->execute();

            $categoryBreakdown = [];
            while ($row = $categoryStmt->fetch()) {
                $categoryBreakdown[] = $row;
            }

            $stats['category_breakdown'] = $categoryBreakdown;
            $stats['overall_avg_rating'] = round($stats['overall_avg_rating'], 2);

            return json_encode([
                "status" => "success",
                "stats" => $stats
            ]);

        } catch (Exception $e) {
            return json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    }

    // ==================== SUPPLIER DOCUMENT MANAGEMENT ====================

    // Upload supplier document
    public function uploadSupplierDocument($supplierId, $file, $documentType, $title, $uploadedBy) {
        try {
            // Validate inputs
            if (empty($supplierId) || empty($file) || empty($documentType)) {
                throw new Exception("Supplier ID, file, and document type are required");
            }

            // Validate document type
            $allowedTypes = ['dti', 'business_permit', 'contract', 'portfolio', 'certification', 'other'];
            if (!in_array($documentType, $allowedTypes)) {
                throw new Exception("Invalid document type. Allowed: " . implode(', ', $allowedTypes));
            }

            // Validate file
            $allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];
            $maxFileSize = 10 * 1024 * 1024; // 10MB

            $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($fileExtension, $allowedExtensions)) {
                throw new Exception("Invalid file type. Allowed: " . implode(', ', $allowedExtensions));
            }

            if ($file['size'] > $maxFileSize) {
                throw new Exception("File size exceeds 10MB limit");
            }

            // Create upload directory if it doesn't exist
            $uploadDir = "uploads/supplier_documents/{$documentType}/";
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            // Generate unique filename
            $fileName = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $file['name']);
            $filePath = $uploadDir . $fileName;

            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                throw new Exception("Failed to upload file");
            }

            // Save to database
            $sql = "INSERT INTO tbl_supplier_documents (
                        supplier_id, document_type, document_title, file_name, file_path,
                        file_size, file_type, uploaded_by, is_active, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                $supplierId,
                $documentType,
                $title,
                $fileName,
                $filePath,
                $file['size'],
                $file['type'],
                $uploadedBy
            ]);

            $documentId = $this->conn->lastInsertId();

            // Log activity
            $this->logSupplierActivity($supplierId, 'document_uploaded',
                "Uploaded document: {$title}", $documentId, [
                    'document_type' => $documentType,
                    'file_name' => $fileName,
                    'file_size' => $file['size']
                ]);

            return json_encode([
                "status" => "success",
                "message" => "Document uploaded successfully",
                "document_id" => $documentId,
                "file_path" => $filePath
            ]);

        } catch (Exception $e) {
            // Clean up file if database insert failed
            if (isset($filePath) && file_exists($filePath)) {
                unlink($filePath);
            }
            return json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    }

    // Get supplier documents
    public function getSupplierDocuments($supplierId, $documentType = null) {
        try {
            $whereClauses = ["sd.supplier_id = ?", "sd.is_active = 1"];
            $params = [$supplierId];

            if ($documentType) {
                $whereClauses[] = "sd.document_type = ?";
                $params[] = $documentType;
            }

            $whereSQL = "WHERE " . implode(" AND ", $whereClauses);

            $sql = "SELECT sd.*, u.user_firstName, u.user_lastName,
                           dt.type_name, dt.description as type_description
                    FROM tbl_supplier_documents sd
                    LEFT JOIN tbl_users u ON sd.uploaded_by = u.user_id
                    LEFT JOIN tbl_document_types dt ON sd.document_type = dt.type_code
                    {$whereSQL}
                    ORDER BY sd.document_type ASC, sd.created_at DESC";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);

            $documents = [];
            while ($row = $stmt->fetch()) {
                // Add file URL for download
                $row['file_url'] = $this->generateSecureFileUrl($row['file_path']);
                $row['file_size_formatted'] = $this->formatFileSize($row['file_size']);
                $documents[] = $row;
            }

            return json_encode([
                "status" => "success",
                "documents" => $documents
            ]);

        } catch (Exception $e) {
            return json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    }

    // Verify supplier document
    public function verifySupplierDocument($documentId, $verifiedBy, $status = 'verified', $notes = null) {
        try {
            $sql = "UPDATE tbl_supplier_documents
                    SET is_verified = ?, verified_by = ?, verified_at = NOW(),
                        verification_notes = ?, updated_at = NOW()
                    WHERE document_id = ?";

            $stmt = $this->conn->prepare($sql);
            $isVerified = $status === 'verified' ? 1 : 0;
            $stmt->execute([$isVerified, $verifiedBy, $notes, $documentId]);

            if ($stmt->rowCount() === 0) {
                throw new Exception("Document not found");
            }

            // Get document and supplier info for activity log
            $docSql = "SELECT sd.*, s.supplier_id FROM tbl_supplier_documents sd
                       JOIN tbl_suppliers s ON sd.supplier_id = s.supplier_id
                       WHERE sd.document_id = ?";
            $docStmt = $this->conn->prepare($docSql);
            $docStmt->execute([$documentId]);
            $document = $docStmt->fetch();

            if ($document) {
                $this->logSupplierActivity($document['supplier_id'], 'document_verified',
                    "Document {$status}: {$document['document_title']}", $documentId, [
                        'status' => $status,
                        'verified_by' => $verifiedBy,
                        'notes' => $notes
                    ]);
            }

            return json_encode([
                "status" => "success",
                "message" => "Document {$status} successfully"
            ]);

        } catch (Exception $e) {
            return json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    }

    // Get document types for form
    public function getDocumentTypes() {
        try {
            $sql = "SELECT * FROM tbl_document_types
                    WHERE is_active = 1
                    ORDER BY display_order ASC, type_name ASC";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();

            $types = [];
            while ($row = $stmt->fetch()) {
                $row['allowed_extensions'] = json_decode($row['allowed_extensions'], true);
                $types[] = $row;
            }

            return json_encode([
                "status" => "success",
                "document_types" => $types
            ]);

        } catch (Exception $e) {
            return json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    }

    // Generate secure file URL for document access
    private function generateSecureFileUrl($filePath) {
        // This should generate a secure, time-limited URL
        // For now, return relative path - implement token-based access in production
        return "/" . $filePath;
    }

    // Format file size for display
    private function formatFileSize($bytes) {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        } else {
            return $bytes . ' bytes';
        }
    }

    public function getAllVendors() { return json_encode(["status" => "error", "message" => "Method not implemented"]); }
    public function createPackage($data) {
        try {
            $this->conn->beginTransaction();

            // Validate required fields
            if (empty($data['package_title']) || empty($data['package_price']) || empty($data['guest_capacity']) || empty($data['created_by'])) {
                return json_encode(["status" => "error", "message" => "Package title, price, guest capacity, and creator are required"]);
            }

            // Insert main package
            $sql = "INSERT INTO tbl_packages (package_title, package_description, package_price, guest_capacity, created_by, is_active)
                    VALUES (:title, :description, :price, :capacity, :created_by, 1)";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':title' => $data['package_title'],
                ':description' => $data['package_description'] ?? '',
                ':price' => $data['package_price'],
                ':capacity' => $data['guest_capacity'],
                ':created_by' => $data['created_by']
            ]);

            $packageId = $this->conn->lastInsertId();

            // Insert components if provided
            if (!empty($data['components']) && is_array($data['components'])) {
                foreach ($data['components'] as $index => $component) {
                    if (!empty($component['component_name'])) {
                        $componentSql = "INSERT INTO tbl_package_inclusions (package_id, inclusion_name, components_list, inclusion_price, display_order)
                                        VALUES (:package_id, :name, :description, :price, :order)";
                        $componentStmt = $this->conn->prepare($componentSql);
                        $componentStmt->execute([
                            ':package_id' => $packageId,
                            ':name' => $component['component_name'],
                            ':description' => $component['component_description'] ?? '',
                            ':price' => $component['component_price'] ?? 0,
                            ':order' => $index
                        ]);
                    }
                }
            }

            // Insert freebies if provided
            if (!empty($data['freebies']) && is_array($data['freebies'])) {
                foreach ($data['freebies'] as $index => $freebie) {
                    if (!empty($freebie['freebie_name'])) {
                        $freebieSql = "INSERT INTO tbl_package_freebies (package_id, freebie_name, freebie_description, freebie_value, display_order)
                                      VALUES (:package_id, :name, :description, :value, :order)";
                        $freebieStmt = $this->conn->prepare($freebieSql);
                        $freebieStmt->execute([
                            ':package_id' => $packageId,
                            ':name' => $freebie['freebie_name'],
                            ':description' => $freebie['freebie_description'] ?? '',
                            ':value' => $freebie['freebie_value'] ?? 0,
                            ':order' => $index
                        ]);
                    }
                }
            }

            // Insert event types if provided
            if (!empty($data['event_types']) && is_array($data['event_types'])) {
                foreach ($data['event_types'] as $eventTypeId) {
                    $eventTypeSql = "INSERT INTO tbl_package_event_types (package_id, event_type_id) VALUES (:package_id, :event_type_id)";
                    $eventTypeStmt = $this->conn->prepare($eventTypeSql);
                    $eventTypeStmt->execute([
                        ':package_id' => $packageId,
                        ':event_type_id' => $eventTypeId
                    ]);
                }
            }

            // Insert venues if provided
            if (!empty($data['venues']) && is_array($data['venues'])) {
                foreach ($data['venues'] as $venueId) {
                    $venueSql = "INSERT INTO tbl_package_venues (package_id, venue_id) VALUES (:package_id, :venue_id)";
                    $venueStmt = $this->conn->prepare($venueSql);
                    $venueStmt->execute([
                        ':package_id' => $packageId,
                        ':venue_id' => $venueId
                    ]);
                }
            }

            $this->conn->commit();

            return json_encode([
                "status" => "success",
                "message" => "Package created successfully",
                "package_id" => $packageId
            ]);
        } catch (Exception $e) {
            // Only rollback if there's an active transaction
            if ($this->conn->inTransaction()) {
                $this->conn->rollback();
            }
            error_log("createPackage error: " . $e->getMessage());
            return json_encode([
                "status" => "error",
                "message" => "Server error occurred",
                "debug" => [
                    "error" => $e->getMessage(),
                    "file" => basename($e->getFile()),
                    "line" => $e->getLine()
                ]
            ]);
        }
    }
    public function getAllPackages() {
        try {
            $sql = "SELECT
                        p.package_id,
                        p.package_title,
                        p.package_description,
                        p.package_price,
                        p.guest_capacity,
                        p.created_at,
                        p.is_active,
                        CONCAT(u.user_firstName COLLATE utf8mb4_unicode_ci, ' ', u.user_lastName COLLATE utf8mb4_unicode_ci) as created_by_name,
                        u.user_firstName,
                        u.user_lastName,
                        COUNT(DISTINCT pc.component_id) as component_count,
                        COUNT(DISTINCT pf.freebie_id) as freebie_count,
                        COUNT(DISTINCT pv.venue_id) as venue_count
                    FROM tbl_packages p
                    LEFT JOIN tbl_users u ON p.created_by = u.user_id
                    LEFT JOIN tbl_package_inclusions pc ON p.package_id = pc.package_id
                    LEFT JOIN tbl_package_freebies pf ON p.package_id = pf.package_id
                    LEFT JOIN tbl_package_venues pv ON p.package_id = pv.package_id
                    WHERE p.is_active = 1
                    GROUP BY p.package_id
                    ORDER BY p.created_at DESC";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // For each package, get components, freebies, and event types
            foreach ($packages as &$package) {
                // Get components for inclusions preview
                $componentsSql = "SELECT inclusion_name as component_name FROM tbl_package_inclusions WHERE package_id = ? ORDER BY display_order LIMIT 5";
                $componentsStmt = $this->conn->prepare($componentsSql);
                $componentsStmt->execute([$package['package_id']]);
                $components = $componentsStmt->fetchAll(PDO::FETCH_COLUMN);
                $package['inclusions'] = $components;

                // Get freebies
                $freebiesSql = "SELECT freebie_name FROM tbl_package_freebies WHERE package_id = ? ORDER BY display_order LIMIT 5";
                $freebiesStmt = $this->conn->prepare($freebiesSql);
                $freebiesStmt->execute([$package['package_id']]);
                $freebies = $freebiesStmt->fetchAll(PDO::FETCH_COLUMN);
                $package['freebies'] = $freebies;

                // Get event types associated with this package
                $eventTypesSql = "SELECT et.event_type_id, et.event_name
                                 FROM tbl_package_event_types pet
                                 JOIN tbl_event_type et ON pet.event_type_id = et.event_type_id
                                 WHERE pet.package_id = ?";
                $eventTypesStmt = $this->conn->prepare($eventTypesSql);
                $eventTypesStmt->execute([$package['package_id']]);
                $eventTypes = $eventTypesStmt->fetchAll(PDO::FETCH_ASSOC);

                // Extract event type IDs and names for easier frontend handling
                $package['event_type_ids'] = array_column($eventTypes, 'event_type_id');
                $package['event_type_names'] = array_column($eventTypes, 'event_name');
            }

            return json_encode([
                "status" => "success",
                "packages" => $packages,
                "count" => count($packages)
            ]);
        } catch (Exception $e) {
            error_log("getAllPackages error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }
    public function getPackageById($packageId) {
        try {
            // Get package basic info
            $sql = "SELECT * FROM tbl_packages WHERE package_id = :package_id AND is_active = 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':package_id' => $packageId]);
            $package = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$package) {
                return json_encode(["status" => "error", "message" => "Package not found"]);
            }

            // Get package components
            $componentsSql = "SELECT inclusion_id as component_id, inclusion_name as component_name, components_list as component_description, inclusion_price as component_price, display_order, supplier_id, offer_id FROM tbl_package_inclusions WHERE package_id = :package_id ORDER BY display_order";
            $componentsStmt = $this->conn->prepare($componentsSql);
            $componentsStmt->execute([':package_id' => $packageId]);
            $components = $componentsStmt->fetchAll(PDO::FETCH_ASSOC);

            // Get package freebies
            $freebiesSql = "SELECT * FROM tbl_package_freebies WHERE package_id = :package_id ORDER BY display_order";
            $freebiesStmt = $this->conn->prepare($freebiesSql);
            $freebiesStmt->execute([':package_id' => $packageId]);
            $freebies = $freebiesStmt->fetchAll(PDO::FETCH_ASSOC);

            // Get package venues with their inclusions
            $venuesSql = "SELECT
                            v.venue_id,
                            v.venue_title,
                            v.venue_owner,
                            v.venue_location,
                            v.venue_contact,
                            v.venue_details,
                            v.venue_capacity,
                            COALESCE(v.extra_pax_rate, 0) AS extra_pax_rate,
                            v.venue_type,
                            v.venue_profile_picture,
                            v.venue_cover_photo
                        FROM tbl_package_venues pv
                        JOIN tbl_venue v ON pv.venue_id = v.venue_id
                        WHERE pv.package_id = :package_id AND v.venue_status = 'available'
                        ORDER BY v.venue_title";

            $venuesStmt = $this->conn->prepare($venuesSql);
            $venuesStmt->execute([':package_id' => $packageId]);
            $venues = $venuesStmt->fetchAll(PDO::FETCH_ASSOC);

            // For each venue, get its inclusions and components
            foreach ($venues as &$venue) {
                // Get venue inclusions
                $inclusionsSql = "SELECT * FROM tbl_venue_inclusions WHERE venue_id = :venue_id AND is_active = 1";
                $inclusionsStmt = $this->conn->prepare($inclusionsSql);
                $inclusionsStmt->execute([':venue_id' => $venue['venue_id']]);
                $inclusions = $inclusionsStmt->fetchAll(PDO::FETCH_ASSOC);

                // For each inclusion, get its components
                foreach ($inclusions as &$inclusion) {
                    $componentsSql = "SELECT * FROM tbl_venue_components WHERE inclusion_id = :inclusion_id AND is_active = 1";
                    $componentsStmt = $this->conn->prepare($componentsSql);
                    $componentsStmt->execute([':inclusion_id' => $inclusion['inclusion_id']]);
                    $inclusion['components'] = $componentsStmt->fetchAll(PDO::FETCH_ASSOC);
                }

                $venue['inclusions'] = $inclusions;
            }

            // Combine all data
            $packageData = [
                'package_id' => $package['package_id'],
                'package_title' => $package['package_title'],
                'package_description' => $package['package_description'],
                'package_price' => $package['package_price'],
                'guest_capacity' => $package['guest_capacity'],
                'venue_fee_buffer' => $package['venue_fee_buffer'],
                'is_active' => $package['is_active'],
                'components' => $components,
                'freebies' => $freebies,
                'venues' => $venues
            ];

            return json_encode([
                "status" => "success",
                "package" => $packageData
            ]);
        } catch (Exception $e) {
            error_log("getPackageById error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function getPackageDetails($packageId) {
        try {
            error_log("getPackageDetails called with packageId: " . $packageId);

            // Check database connection
            if (!$this->conn) {
                error_log("getPackageDetails: Database connection is null");
                return json_encode(["status" => "error", "message" => "Database connection error"]);
            }

            // Validate package ID
            if (empty($packageId) || !is_numeric($packageId)) {
                error_log("getPackageDetails: Invalid package ID provided");
                return json_encode(["status" => "error", "message" => "Invalid package ID"]);
            }

            // Get package basic info with creator information
            $sql = "SELECT p.*,
                           u.user_firstName, u.user_lastName,
                           CONCAT(COALESCE(u.user_firstName, ''), ' ', COALESCE(u.user_lastName, '')) as created_by_name
                    FROM tbl_packages p
                    LEFT JOIN tbl_users u ON p.created_by = u.user_id
                    WHERE p.package_id = :package_id AND p.is_active = 1";

            error_log("getPackageDetails: Executing SQL: " . $sql);
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':package_id' => $packageId]);
            $package = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$package) {
                error_log("getPackageDetails: Package not found for ID: " . $packageId);
                return json_encode(["status" => "error", "message" => "Package not found"]);
            }

            error_log("getPackageDetails: Package found: " . $package['package_title']);

            // Get package components/inclusions with supplier information (if columns exist)
            $hasSupplierColumns = $this->checkColumnExists('tbl_package_inclusions', 'supplier_id');

            if ($hasSupplierColumns) {
                $componentsSql = "SELECT DISTINCT pc.*, s.business_name as supplier_name, so.tier_level
                                  FROM tbl_package_inclusions pc
                                  LEFT JOIN tbl_suppliers s ON pc.supplier_id = s.supplier_id
                                  LEFT JOIN tbl_supplier_offers so ON pc.offer_id = so.offer_id
                                  WHERE pc.package_id = :package_id
                                  ORDER BY pc.display_order";
            } else {
                $componentsSql = "SELECT DISTINCT pc.*
                                  FROM tbl_package_inclusions pc
                                  WHERE pc.package_id = :package_id
                                  ORDER BY pc.display_order";
            }
            error_log("getPackageDetails: Getting components with SQL: " . $componentsSql);
            $componentsStmt = $this->conn->prepare($componentsSql);
            $componentsStmt->execute([':package_id' => $packageId]);
            $components = $componentsStmt->fetchAll(PDO::FETCH_ASSOC);
            error_log("getPackageDetails: Found " . count($components) . " components");

            // Transform components into the expected structure for detailed view
            // Parse component_description into child components so UI can show dropdown per inclusion
            $inclusions = [];
            foreach ($components as $component) {
                $childComponents = [];
                $rawDescription = isset($component['component_description']) ? trim((string)$component['component_description']) : '';

                if ($rawDescription !== '') {
                    // Normalize common delimiters to commas (supports comma, semicolon, newline, bullet)
                    $normalized = preg_replace('/[\r\n;•]+/u', ',', $rawDescription);
                    $parts = array_filter(array_map('trim', explode(',', (string)$normalized)), function($p) { return $p !== ''; });

                    foreach ($parts as $part) {
                        $childComponents[] = [
                            'name' => $part,
                            // No per-item pricing stored at this granularity
                            'price' => 0,
                            // Frontend expects this key; provide empty list
                            'subComponents' => [],
                        ];
                    }
                }

                $inclusion = [
                    'name' => $component['component_name'],
                    'price' => (float)$component['component_price'],
                    'components' => $childComponents,
                ];

                // Add supplier information if available and columns exist
                if ($hasSupplierColumns && !empty($component['supplier_id'])) {
                    $inclusion['supplier_id'] = (int)$component['supplier_id'];
                    $inclusion['supplier_name'] = $component['supplier_name'];
                    $inclusion['offer_id'] = !empty($component['offer_id']) ? (int)$component['offer_id'] : null;
                    $inclusion['tier_level'] = !empty($component['tier_level']) ? (int)$component['tier_level'] : null;
                    // is_customizable is not available in tbl_supplier_offers, set default to false
                    $inclusion['is_customizable'] = false;
                }

                $inclusions[] = $inclusion;
            }

            // Get package freebies
            $freebiesSql = "SELECT * FROM tbl_package_freebies WHERE package_id = :package_id ORDER BY display_order";
            $freebiesStmt = $this->conn->prepare($freebiesSql);
            $freebiesStmt->execute([':package_id' => $packageId]);
            $freebiesData = $freebiesStmt->fetchAll(PDO::FETCH_ASSOC);

            $freebies = [];
            foreach ($freebiesData as $freebie) {
                $freebies[] = $freebie['freebie_name'];
            }

            // Get package venues with their inclusions
            $venuesSql = "SELECT
                            v.venue_id,
                            v.venue_title,
                            v.venue_owner,
                            v.venue_location,
                            v.venue_contact,
                            v.venue_details,
                            v.venue_capacity,
                            COALESCE(v.extra_pax_rate, 0) AS extra_pax_rate,
                            v.venue_type,
                            v.venue_profile_picture,
                            v.venue_cover_photo,
                            COALESCE(vp.venue_price_min, 0) AS total_price
                        FROM tbl_package_venues pv
                        JOIN tbl_venue v ON pv.venue_id = v.venue_id
                        LEFT JOIN tbl_venue_price vp ON v.venue_id = vp.venue_id AND vp.is_active = 1
                        WHERE pv.package_id = :package_id AND v.venue_status = 'available'
                        ORDER BY v.venue_title";

            $venuesStmt = $this->conn->prepare($venuesSql);
            $venuesStmt->execute([':package_id' => $packageId]);
            $venues = $venuesStmt->fetchAll(PDO::FETCH_ASSOC);

            // For each venue, get its inclusions and components
            foreach ($venues as &$venue) {
                // Get venue inclusions
                $inclusionsSql = "SELECT * FROM tbl_venue_inclusions WHERE venue_id = :venue_id AND is_active = 1";
                $inclusionsStmt = $this->conn->prepare($inclusionsSql);
                $inclusionsStmt->execute([':venue_id' => $venue['venue_id']]);
                $venueInclusions = $inclusionsStmt->fetchAll(PDO::FETCH_ASSOC);

                // For each inclusion, get its components
                foreach ($venueInclusions as &$inclusion) {
                    $componentsSql = "SELECT * FROM tbl_venue_components WHERE inclusion_id = :inclusion_id AND is_active = 1";
                    $componentsStmt = $this->conn->prepare($componentsSql);
                    $componentsStmt->execute([':inclusion_id' => $inclusion['inclusion_id']]);
                    $inclusion['components'] = $componentsStmt->fetchAll(PDO::FETCH_ASSOC);
                }

                $venue['inclusions'] = $venueInclusions;
                $venue['total_price'] = (float)($venue['total_price'] ?? 0);
            }

            // Get event types associated with this package
            $eventTypesSql = "SELECT et.*
                             FROM tbl_package_event_types pet
                             JOIN tbl_event_type et ON pet.event_type_id = et.event_type_id
                             WHERE pet.package_id = :package_id";
            $eventTypesStmt = $this->conn->prepare($eventTypesSql);
            $eventTypesStmt->execute([':package_id' => $packageId]);
            $eventTypes = $eventTypesStmt->fetchAll(PDO::FETCH_ASSOC);

            // Extract event type IDs and names for easier frontend handling
            $eventTypeIds = array_column($eventTypes, 'event_type_id');
            $eventTypeNames = array_column($eventTypes, 'event_name');

            // Combine all data
            $packageData = [
                'package_id' => (int)$package['package_id'],
                'package_title' => $package['package_title'],
                'package_description' => $package['package_description'],
                'package_price' => (float)$package['package_price'],
                'guest_capacity' => (int)$package['guest_capacity'],
                'venue_fee_buffer' => (float)($package['venue_fee_buffer'] ?? 0),
                'created_at' => $package['created_at'],
                'user_firstName' => $package['user_firstName'],
                'user_lastName' => $package['user_lastName'],
                'created_by_name' => $package['created_by_name'],
                'is_active' => (int)$package['is_active'],
                'inclusions' => $inclusions,
                'freebies' => $freebies,
                'venues' => $venues,
                'event_types' => $eventTypes,
                'event_type_ids' => $eventTypeIds,
                'event_type_names' => $eventTypeNames
            ];

            return json_encode([
                "status" => "success",
                "package" => $packageData
            ]);
        } catch (Exception $e) {
            error_log("getPackageDetails error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function updatePackage($data) {
        $transactionStarted = false;
        try {
            error_log("updatePackage called with data: " . json_encode($data));

            // Validate that we have the required data
            if (empty($data)) {
                error_log("updatePackage: No data provided");
                return json_encode(["status" => "error", "message" => "No data provided"]);
            }

            // Check if connection is valid
            if (!$this->conn) {
                error_log("updatePackage: Database connection is null");
                return json_encode(["status" => "error", "message" => "Database connection failed"]);
            }

            $this->conn->beginTransaction();
            $transactionStarted = true;
            error_log("updatePackage: Transaction started successfully");

            // Validate required fields
            if (empty($data['package_id']) || empty($data['package_title']) || !isset($data['package_price']) || !isset($data['guest_capacity'])) {
                if ($transactionStarted && $this->conn->inTransaction()) {
                    $this->conn->rollback();
                }
                error_log("updatePackage: Missing required fields - package_id: " . ($data['package_id'] ?? 'null') . ", title: " . ($data['package_title'] ?? 'null') . ", price: " . ($data['package_price'] ?? 'null') . ", capacity: " . ($data['guest_capacity'] ?? 'null'));
                return json_encode(["status" => "error", "message" => "Package ID, title, price, and guest capacity are required"]);
            }

            // Get current package data to check price lock status
            $currentPackageSql = "SELECT package_price, original_price, is_price_locked FROM tbl_packages WHERE package_id = :package_id";
            $currentStmt = $this->conn->prepare($currentPackageSql);
            if (!$currentStmt) {
                error_log("updatePackage: Failed to prepare current package query");
                if ($transactionStarted && $this->conn->inTransaction()) {
                    $this->conn->rollback();
                }
                return json_encode(["status" => "error", "message" => "Database query preparation failed"]);
            }

            $currentStmt->execute([':package_id' => $data['package_id']]);
            $currentPackage = $currentStmt->fetch(PDO::FETCH_ASSOC);

            if (!$currentPackage) {
                if ($transactionStarted && $this->conn->inTransaction()) {
                    $this->conn->rollback();
                }
                error_log("updatePackage: Package not found with ID: " . $data['package_id']);
                return json_encode(["status" => "error", "message" => "Package not found"]);
            }

            // Enforce non-decreasing price rule
            $newPrice = floatval($data['package_price']);
            $currentPrice = floatval($currentPackage['package_price']);
            $isLocked = intval($currentPackage['is_price_locked']);

            if ($isLocked && $newPrice < $currentPrice) {
                if ($transactionStarted && $this->conn->inTransaction()) {
                    $this->conn->rollback();
                }
                error_log("updatePackage: Price reduction attempted on locked package - current: $currentPrice, attempted: $newPrice");
                return json_encode([
                    "status" => "error",
                    "message" => "Cannot reduce package price. Package prices are locked and can only increase or remain the same.",
                    "current_price" => $currentPrice,
                    "attempted_price" => $newPrice
                ]);
            }

            // Check for overage warnings if components are being updated
            if (isset($data['components'])) {
                $totalComponentCost = 0;
                foreach ($data['components'] as $component) {
                    $totalComponentCost += floatval($component['component_price'] ?? 0);
                }

                if ($totalComponentCost > $newPrice) {
                    $overage = $totalComponentCost - $newPrice;
                    if (!isset($data['confirm_overage']) || !$data['confirm_overage']) {
                        if ($transactionStarted && $this->conn->inTransaction()) {
                            $this->conn->rollback();
                        }
                        error_log("updatePackage: Budget overage detected - package: $newPrice, inclusions: $totalComponentCost, overage: $overage");
                        return json_encode([
                            "status" => "warning",
                            "message" => "Budget overage detected: Inclusions total exceeds package price",
                            "package_price" => $newPrice,
                            "inclusions_total" => $totalComponentCost,
                            "overage_amount" => $overage,
                            "requires_confirmation" => true
                        ]);
                    }
                }
            }

            // Update main package
            $sql = "UPDATE tbl_packages SET
                        package_title = :title,
                        package_description = :description,
                        package_price = :price,
                        guest_capacity = :capacity,
                        is_price_locked = 1,
                        price_lock_date = CASE
                            WHEN is_price_locked = 0 THEN CURRENT_TIMESTAMP
                            ELSE price_lock_date
                        END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE package_id = :package_id";

            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                error_log("updatePackage: Failed to prepare package update query");
                if ($transactionStarted && $this->conn->inTransaction()) {
                    $this->conn->rollback();
                }
                return json_encode(["status" => "error", "message" => "Database query preparation failed"]);
            }

            $result = $stmt->execute([
                ':title' => $data['package_title'],
                ':description' => $data['package_description'] ?? '',
                ':price' => $newPrice,
                ':capacity' => $data['guest_capacity'],
                ':package_id' => $data['package_id']
            ]);

            if (!$result) {
                error_log("updatePackage: Package update execution failed");
                if ($transactionStarted && $this->conn->inTransaction()) {
                    $this->conn->rollback();
                }
                return json_encode(["status" => "error", "message" => "Failed to update package"]);
            }

            error_log("Package update result: " . ($result ? "success" : "failed"));
            error_log("Rows affected: " . $stmt->rowCount());

            // Update components - delete existing and insert new ones
            if (isset($data['components'])) {
                error_log("Updating components: " . json_encode($data['components']));
                // Delete existing components
                $deleteComponentsSql = "DELETE FROM tbl_package_inclusions WHERE package_id = :package_id";
                $deleteStmt = $this->conn->prepare($deleteComponentsSql);
                $deleteResult = $deleteStmt->execute([':package_id' => $data['package_id']]);
                error_log("Delete components result: " . ($deleteResult ? "success" : "failed"));

                // Insert new components
                if (is_array($data['components'])) {
                    // Check if supplier_id and offer_id columns exist
                    $hasSupplierColumns = $this->checkColumnExists('tbl_package_inclusions', 'supplier_id');
                    error_log("Has supplier columns: " . ($hasSupplierColumns ? "true" : "false"));

                    foreach ($data['components'] as $index => $component) {
                        if (!empty($component['component_name'])) {
                            error_log("Processing component $index: " . json_encode($component));
                            if ($hasSupplierColumns) {
                                // Validate supplier_id and offer_id before inserting
                                $supplierId = $component['supplier_id'] ?? null;
                                $offerId = $component['offer_id'] ?? null;
                                error_log("Original supplier_id: $supplierId, offer_id: $offerId");

                                // Check if supplier_id exists if provided
                                if ($supplierId && !$this->validateSupplierExists($supplierId)) {
                                    error_log("Invalid supplier_id: $supplierId");
                                    $supplierId = null;
                                }

                                // Check if offer_id exists if provided
                                if ($offerId) {
                                    // If it's a virtual offer (json_*), set to null for database storage
                                    if (is_string($offerId) && strpos($offerId, 'json_') === 0) {
                                        error_log("Virtual offer_id detected: $offerId, setting to null for database");
                                        $offerId = null;
                                    } elseif (!$this->validateOfferExists($offerId)) {
                                        error_log("Invalid offer_id: $offerId");
                                        $offerId = null;
                                    }
                                }

                                error_log("Final supplier_id: $supplierId, offer_id: $offerId");

                                $componentSql = "INSERT INTO tbl_package_inclusions (package_id, inclusion_name, components_list, inclusion_price, display_order, supplier_id, offer_id)
                                                VALUES (:package_id, :name, :description, :price, :order, :supplier_id, :offer_id)";
                                $componentStmt = $this->conn->prepare($componentSql);
                                $componentResult = $componentStmt->execute([
                                    ':package_id' => $data['package_id'],
                                    ':name' => $component['component_name'],
                                    ':description' => $component['component_description'] ?? '',
                                    ':price' => $component['component_price'] ?? 0,
                                    ':order' => $index,
                                    ':supplier_id' => $supplierId,
                                    ':offer_id' => $offerId
                                ]);
                            } else {
                                $componentSql = "INSERT INTO tbl_package_inclusions (package_id, inclusion_name, components_list, inclusion_price, display_order)
                                                VALUES (:package_id, :name, :description, :price, :order)";
                                $componentStmt = $this->conn->prepare($componentSql);
                                $componentResult = $componentStmt->execute([
                                    ':package_id' => $data['package_id'],
                                    ':name' => $component['component_name'],
                                    ':description' => $component['component_description'] ?? '',
                                    ':price' => $component['component_price'] ?? 0,
                                    ':order' => $index
                                ]);
                            }
                            error_log("Insert component $index result: " . ($componentResult ? "success" : "failed"));
                        }
                    }
                }
            }

            // Update freebies - delete existing and insert new ones
            if (isset($data['freebies'])) {
                error_log("Updating freebies: " . json_encode($data['freebies']));
                // Delete existing freebies
                $deleteFreebiesSql = "DELETE FROM tbl_package_freebies WHERE package_id = :package_id";
                $deleteStmt = $this->conn->prepare($deleteFreebiesSql);
                $deleteResult = $deleteStmt->execute([':package_id' => $data['package_id']]);
                error_log("Delete freebies result: " . ($deleteResult ? "success" : "failed"));

                // Insert new freebies
                if (is_array($data['freebies'])) {
                    foreach ($data['freebies'] as $index => $freebie) {
                        if (!empty($freebie['freebie_name'])) {
                            $freebieSql = "INSERT INTO tbl_package_freebies (package_id, freebie_name, freebie_description, freebie_value, display_order)
                                          VALUES (:package_id, :name, :description, :value, :order)";
                            $freebieStmt = $this->conn->prepare($freebieSql);
                            $freebieStmt->execute([
                                ':package_id' => $data['package_id'],
                                ':name' => $freebie['freebie_name'],
                                ':description' => $freebie['freebie_description'] ?? '',
                                ':value' => $freebie['freebie_value'] ?? 0,
                                ':order' => $index
                            ]);
                        }
                    }
                }
            }

            // Update event types
            if (isset($data['event_types'])) {
                error_log("Updating event types: " . json_encode($data['event_types']));
                // Delete existing event types
                $deleteEventTypesSql = "DELETE FROM tbl_package_event_types WHERE package_id = :package_id";
                $deleteStmt = $this->conn->prepare($deleteEventTypesSql);
                $deleteResult = $deleteStmt->execute([':package_id' => $data['package_id']]);
                error_log("Delete event types result: " . ($deleteResult ? "success" : "failed"));

                // Insert new event types
                if (is_array($data['event_types'])) {
                    foreach ($data['event_types'] as $eventTypeId) {
                        $eventTypeSql = "INSERT INTO tbl_package_event_types (package_id, event_type_id) VALUES (:package_id, :event_type_id)";
                        $eventTypeStmt = $this->conn->prepare($eventTypeSql);
                        $eventTypeResult = $eventTypeStmt->execute([
                            ':package_id' => $data['package_id'],
                            ':event_type_id' => $eventTypeId
                        ]);
                        error_log("Insert event type $eventTypeId result: " . ($eventTypeResult ? "success" : "failed"));
                    }
                }
            } else {
                error_log("No event_types data provided for update");
            }

            // Update venues
            if (isset($data['venues'])) {
                error_log("Updating venues: " . json_encode($data['venues']));
                // Delete existing venues
                $deleteVenuesSql = "DELETE FROM tbl_package_venues WHERE package_id = :package_id";
                $deleteStmt = $this->conn->prepare($deleteVenuesSql);
                $deleteResult = $deleteStmt->execute([':package_id' => $data['package_id']]);
                error_log("Delete venues result: " . ($deleteResult ? "success" : "failed"));

                // Insert new venues
                if (is_array($data['venues'])) {
                    foreach ($data['venues'] as $venueId) {
                        $venueSql = "INSERT INTO tbl_package_venues (package_id, venue_id) VALUES (:package_id, :venue_id)";
                        $venueStmt = $this->conn->prepare($venueSql);
                        $venueResult = $venueStmt->execute([
                            ':package_id' => $data['package_id'],
                            ':venue_id' => $venueId
                        ]);
                        error_log("Insert venue $venueId result: " . ($venueResult ? "success" : "failed"));
                    }
                }
            }

            $this->conn->commit();
            error_log("updatePackage transaction committed successfully");

            // Log activity after successful commit to avoid transaction issues
            if (isset($data['log_activity']) && $data['log_activity']) {
                try {
                    $userId = $data['user_id'] ?? 1; // Default to admin user if not provided
                    $activityType = $data['activity_type'] ?? 'package_edited';
                    $activityDescription = $data['activity_description'] ?? "Package '{$data['package_title']}' was edited";

                    // Simple activity logging that won't interfere with main transaction
                    $logResult = $this->logActivity($userId, $activityType, $activityDescription, 'admin');
                    if (!$logResult) {
                        error_log("Activity logging returned false, but this is non-critical");
                    }
                } catch (Exception $logError) {
                    // Don't let activity logging errors affect the main response
                    error_log("Activity logging failed (non-critical): " . $logError->getMessage());
                }
            }

            return json_encode([
                "status" => "success",
                "message" => "Package updated successfully"
            ]);
        } catch (Exception $e) {
            // Only rollback if we started a transaction
            if ($transactionStarted && $this->conn->inTransaction()) {
                try {
                    $this->conn->rollback();
                    error_log("updatePackage: Transaction rolled back successfully");
                } catch (Exception $rollbackError) {
                    error_log("updatePackage: Rollback failed (transaction may already be closed): " . $rollbackError->getMessage());
                }
            } else {
                error_log("updatePackage: No active transaction to rollback");
            }
            error_log("updatePackage error: " . $e->getMessage());
            error_log("updatePackage error file: " . $e->getFile() . " line: " . $e->getLine());
            error_log("updatePackage error trace: " . $e->getTraceAsString());

            return json_encode([
                "status" => "error",
                "message" => "Server error occurred",
                "debug" => [
                    "error" => $e->getMessage(),
                    "file" => basename($e->getFile()),
                    "line" => $e->getLine()
                ]
            ]);
        }
    }
    public function deletePackage($packageId) {
        try {
            // Check if package exists
            $checkSql = "SELECT package_id FROM tbl_packages WHERE package_id = :package_id";
            $checkStmt = $this->conn->prepare($checkSql);
            $checkStmt->execute([':package_id' => $packageId]);

            if (!$checkStmt->fetch(PDO::FETCH_ASSOC)) {
                return json_encode(["status" => "error", "message" => "Package not found"]);
            }

            // Check if package is being used in any events
            $eventCheckSql = "SELECT COUNT(*) as event_count FROM tbl_events WHERE package_id = :package_id";
            $eventCheckStmt = $this->conn->prepare($eventCheckSql);
            $eventCheckStmt->execute([':package_id' => $packageId]);
            $eventCount = $eventCheckStmt->fetch(PDO::FETCH_ASSOC)['event_count'];

            if ($eventCount > 0) {
                // Soft delete - mark as inactive instead of hard delete
                $softDeleteSql = "UPDATE tbl_packages SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE package_id = :package_id";
                $softDeleteStmt = $this->conn->prepare($softDeleteSql);
                $softDeleteStmt->execute([':package_id' => $packageId]);

                return json_encode([
                    "status" => "success",
                    "message" => "Package deactivated successfully (it was being used in events)"
                ]);
            } else {
                // Hard delete - remove completely
                $this->conn->beginTransaction();

                // Delete related records first
                $deleteComponentsSql = "DELETE FROM tbl_package_inclusions WHERE package_id = :package_id";
                $deleteStmt = $this->conn->prepare($deleteComponentsSql);
                $deleteStmt->execute([':package_id' => $packageId]);

                $deleteFreebiesSql = "DELETE FROM tbl_package_freebies WHERE package_id = :package_id";
                $deleteStmt = $this->conn->prepare($deleteFreebiesSql);
                $deleteStmt->execute([':package_id' => $packageId]);

                $deleteEventTypesSql = "DELETE FROM tbl_package_event_types WHERE package_id = :package_id";
                $deleteStmt = $this->conn->prepare($deleteEventTypesSql);
                $deleteStmt->execute([':package_id' => $packageId]);

                $deleteVenuesSql = "DELETE FROM tbl_package_venues WHERE package_id = :package_id";
                $deleteStmt = $this->conn->prepare($deleteVenuesSql);
                $deleteStmt->execute([':package_id' => $packageId]);

                // Delete the main package
                $deleteSql = "DELETE FROM tbl_packages WHERE package_id = :package_id";
                $deleteStmt = $this->conn->prepare($deleteSql);
                $deleteStmt->execute([':package_id' => $packageId]);

                $this->conn->commit();

                return json_encode([
                    "status" => "success",
                    "message" => "Package deleted successfully"
                ]);
            }
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollback();
            }
            error_log("deletePackage error: " . $e->getMessage());
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

    public function updatePackageEventTypes($data) {
        try {
            error_log("updatePackageEventTypes called with data: " . json_encode($data));

            // Validate required fields
            if (empty($data['package_id']) || !isset($data['event_type_ids'])) {
                return json_encode(["status" => "error", "message" => "Package ID and event type IDs are required"]);
            }

            $this->conn->beginTransaction();

            // Check if package exists
            $packageCheck = $this->conn->prepare("SELECT package_id FROM tbl_packages WHERE package_id = ? LIMIT 1");
            $packageCheck->execute([$data['package_id']]);
            if (!$packageCheck->fetch(PDO::FETCH_ASSOC)) {
                if ($this->conn->inTransaction()) {
                    $this->conn->rollback();
                }
                return json_encode(["status" => "error", "message" => "Package not found"]);
            }

            // Delete existing event types for this package
            $deleteEventTypesSql = "DELETE FROM tbl_package_event_types WHERE package_id = :package_id";
            $deleteStmt = $this->conn->prepare($deleteEventTypesSql);
            $deleteStmt->execute([':package_id' => $data['package_id']]);

            // Insert new event types if provided
            if (!empty($data['event_type_ids']) && is_array($data['event_type_ids'])) {
                foreach ($data['event_type_ids'] as $eventTypeId) {
                    // Validate event type exists
                    $eventTypeCheck = $this->conn->prepare("SELECT event_type_id FROM tbl_event_type WHERE event_type_id = ? LIMIT 1");
                    $eventTypeCheck->execute([$eventTypeId]);
                    if (!$eventTypeCheck->fetch(PDO::FETCH_ASSOC)) {
                        if ($this->conn->inTransaction()) {
                            $this->conn->rollback();
                        }
                        return json_encode(["status" => "error", "message" => "Invalid event type ID: $eventTypeId"]);
                    }

                    $eventTypeSql = "INSERT INTO tbl_package_event_types (package_id, event_type_id) VALUES (:package_id, :event_type_id)";
                    $eventTypeStmt = $this->conn->prepare($eventTypeSql);
                    $eventTypeStmt->execute([
                        ':package_id' => $data['package_id'],
                        ':event_type_id' => $eventTypeId
                    ]);
                }
            }

            // Log activity if requested
            if (isset($data['log_activity']) && $data['log_activity']) {
                $userId = $data['user_id'] ?? 1;
                $activityType = $data['activity_type'] ?? 'package_event_types_updated';
                $activityDescription = $data['activity_description'] ?? "Package event types were updated";
                $this->logActivity($userId, $activityType, $activityDescription, 'admin');
            }

            $this->conn->commit();
            error_log("updatePackageEventTypes transaction committed successfully");

            return json_encode([
                "status" => "success",
                "message" => "Package event types updated successfully"
            ]);
        } catch (Exception $e) {
            // Only rollback if there's an active transaction
            if ($this->conn->inTransaction()) {
                $this->conn->rollback();
            }
            error_log("updatePackageEventTypes error: " . $e->getMessage());
            return json_encode([
                "status" => "error",
                "message" => "Server error occurred",
                "debug" => [
                    "error" => $e->getMessage(),
                    "file" => basename($e->getFile()),
                    "line" => $e->getLine()
                ]
            ]);
        }
    }

    public function getPackagesByEventType($eventTypeId) {
        try {
            error_log("getPackagesByEventType called with eventTypeId: " . $eventTypeId);

            // Enhanced query to get packages with venue and component information
            // If no specific event type relationships exist, return all active packages
            $sql = "SELECT DISTINCT p.package_id,
                        p.package_title,
                        p.package_description,
                        p.package_price,
                        p.guest_capacity,
                        p.created_at,
                        p.is_active,
                        COUNT(DISTINCT pc.component_id) as component_count,
                        COUNT(DISTINCT pf.freebie_id) as freebie_count,
                        COUNT(DISTINCT pv.venue_id) as venue_count
                    FROM tbl_packages p
                    LEFT JOIN tbl_package_event_types pet ON p.package_id = pet.package_id
                    LEFT JOIN tbl_package_inclusions pc ON p.package_id = pc.package_id
                    LEFT JOIN tbl_package_freebies pf ON p.package_id = pf.package_id
                    LEFT JOIN tbl_package_venues pv ON p.package_id = pv.package_id
                    WHERE p.is_active = 1
                    AND (
                        pet.event_type_id = ?
                        OR pet.event_type_id IS NULL
                        OR NOT EXISTS (SELECT 1 FROM tbl_package_event_types WHERE package_id = p.package_id)
                    )
                    GROUP BY p.package_id, p.package_title, p.package_description, p.package_price, p.guest_capacity, p.created_at, p.is_active
                    ORDER BY p.package_title";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$eventTypeId]);
            $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Enhance each package with detailed information
            foreach ($packages as &$package) {
                $packageId = $package['package_id'];

                // Get component names for inclusions preview
                $componentsSql = "SELECT inclusion_name as component_name FROM tbl_package_inclusions WHERE package_id = ? ORDER BY display_order LIMIT 10";
                $componentsStmt = $this->conn->prepare($componentsSql);
                $componentsStmt->execute([$packageId]);
                $componentNames = $componentsStmt->fetchAll(PDO::FETCH_COLUMN);
                $package['inclusions'] = $componentNames;

                // Get freebie names
                $freebiesSql = "SELECT freebie_name FROM tbl_package_freebies WHERE package_id = ? ORDER BY display_order LIMIT 10";
                $freebiesStmt = $this->conn->prepare($freebiesSql);
                $freebiesStmt->execute([$packageId]);
                $freebieNames = $freebiesStmt->fetchAll(PDO::FETCH_COLUMN);
                $package['freebies'] = $freebieNames;

                // Get venue previews with pricing
                $venuesSql = "SELECT v.venue_id, v.venue_title, v.venue_location, v.venue_capacity,
                                    v.venue_profile_picture, v.venue_cover_photo,
                                    COALESCE(SUM(vi.inclusion_price), 0) as inclusions_total
                             FROM tbl_package_venues pv
                             JOIN tbl_venue v ON pv.venue_id = v.venue_id
                             LEFT JOIN tbl_venue_inclusions vi ON v.venue_id = vi.venue_id AND vi.is_active = 1
                             WHERE pv.package_id = ? AND v.venue_status = 'available'
                             GROUP BY v.venue_id, v.venue_title, v.venue_location, v.venue_capacity,
                                      v.venue_profile_picture, v.venue_cover_photo
                             ORDER BY v.venue_title";
                $venuesStmt = $this->conn->prepare($venuesSql);
                $venuesStmt->execute([$packageId]);
                $venues = $venuesStmt->fetchAll(PDO::FETCH_ASSOC);

                $package['venue_previews'] = [];
                $venuePrices = [];

                foreach ($venues as $venue) {
                    // Add to previews
                    $package['venue_previews'][] = [
                        'venue_id' => $venue['venue_id'],
                        'venue_title' => $venue['venue_title'],
                        'venue_location' => $venue['venue_location'],
                        'venue_capacity' => intval($venue['venue_capacity']),
                        'venue_profile_picture' => $venue['venue_profile_picture'],
                        'venue_cover_photo' => $venue['venue_cover_photo'],
                    ];

                    // Calculate total venue price (inclusions only, no base price)
                    $totalVenuePrice = floatval($venue['inclusions_total']);
                    $venuePrices[] = $totalVenuePrice;
                }

                // Calculate price ranges
                if (!empty($venuePrices)) {
                    $minVenuePrice = min($venuePrices);
                    $maxVenuePrice = max($venuePrices);
                    $packagePrice = floatval($package['package_price']);

                    $package['venue_price_range'] = [
                        'min' => $minVenuePrice,
                        'max' => $maxVenuePrice,
                        'venues' => array_map(function($venue) use ($packageId) {
                            return [
                                'venue_id' => $venue['venue_id'],
                                'venue_title' => $venue['venue_title'],
                                'venue_location' => $venue['venue_location'],
                                'venue_capacity' => intval($venue['venue_capacity']),
                                'venue_profile_picture' => $venue['venue_profile_picture'],
                                'venue_cover_photo' => $venue['venue_cover_photo'],
                                'inclusions_total' => $venue['inclusions_total'],
                                'total_venue_price' => strval(floatval($venue['inclusions_total']))
                            ];
                        }, $venues)
                    ];

                    $package['total_price_range'] = [
                        'min' => $packagePrice + $minVenuePrice,
                        'max' => $packagePrice + $maxVenuePrice
                    ];
                } else {
                    $package['venue_price_range'] = null;
                    $package['total_price_range'] = null;
                }
            }

            error_log("Returning " . count($packages) . " enhanced packages for eventTypeId {$eventTypeId}");

            return json_encode([
                "status" => "success",
                "packages" => $packages
            ]);
        } catch (Exception $e) {
            error_log("getPackagesByEventType error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function getAllEvents() {
        try {
            $stmt = $this->pdo->prepare("
                SELECT
                    e.*,
                    u.user_firstName,
                    u.user_lastName,
                    u.user_email,
                    et.event_name as event_type_name,
                    p.package_title,
                    v.venue_title
                FROM tbl_events e
                LEFT JOIN tbl_users u ON e.user_id = u.user_id
                LEFT JOIN tbl_event_type et ON e.event_type_id = et.event_type_id
                LEFT JOIN tbl_packages p ON e.package_id = p.package_id
                LEFT JOIN tbl_venue v ON e.venue_id = v.venue_id
                ORDER BY e.created_at DESC
            ");
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
    public function getEvents() {
        // Check staff permissions for viewing events
        $accessCheck = $this->checkStaffAccess('events', 'view');
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            $sql = "SELECT
                        e.*,
                        CONCAT(c.user_firstName COLLATE utf8mb4_unicode_ci, ' ', c.user_lastName COLLATE utf8mb4_unicode_ci) as client_name,
                        c.user_firstName as client_first_name,
                        c.user_lastName as client_last_name,
                        c.user_suffix as client_suffix,
                        c.user_email as client_email,
                        c.user_contact as client_contact,
                        c.user_pfp as client_pfp,
                        c.user_birthdate as client_birthdate,
                        c.created_at as client_joined_date,
                        CONCAT(a.user_firstName COLLATE utf8mb4_general_ci, ' ', a.user_lastName COLLATE utf8mb4_general_ci) as admin_name,
                        CONCAT(o.user_firstName COLLATE utf8mb4_general_ci, ' ', o.user_lastName COLLATE utf8mb4_general_ci) as organizer_name,
                        et.event_name as event_type_name,
                        v.venue_title as venue_name,
                        v.venue_location as venue_location,
                        p.package_title as package_title
                    FROM tbl_events e
                    LEFT JOIN tbl_users c ON e.user_id = c.user_id
                    LEFT JOIN tbl_users a ON e.admin_id = a.user_id
                    LEFT JOIN tbl_users o ON e.organizer_id = o.user_id
                    LEFT JOIN tbl_event_type et ON e.event_type_id = et.event_type_id
                    LEFT JOIN tbl_venue v ON e.venue_id = v.venue_id
                    LEFT JOIN tbl_packages p ON e.package_id = p.package_id
                    ORDER BY e.event_date ASC, e.start_time ASC";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "events" => $events,
                "count" => count($events)
            ]);
        } catch (Exception $e) {
            error_log("getEvents error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }
    public function getClientEvents($userId) { return json_encode(["status" => "error", "message" => "Method not implemented"]); }
    public function checkEventConflicts($eventDate, $startTime, $endTime, $excludeEventId = null) {
        try {
            $sql = "
                SELECT
                    e.event_id,
                    e.event_title,
                    e.event_date,
                    e.start_time,
                    e.end_time,
                    e.event_type_id,
                    et.event_name as event_type_name,
                    CONCAT(c.user_firstName COLLATE utf8mb4_unicode_ci, ' ', c.user_lastName COLLATE utf8mb4_unicode_ci) as client_name,
                    COALESCE(v.venue_title, 'TBD') as venue_name
                FROM tbl_events e
                LEFT JOIN tbl_users c ON e.user_id = c.user_id
                LEFT JOIN tbl_venue v ON e.venue_id = v.venue_id
                LEFT JOIN tbl_event_type et ON e.event_type_id = et.event_type_id
                WHERE e.event_date = ?
                AND e.event_status NOT IN ('cancelled', 'completed')
                AND (
                    (e.start_time < ? AND e.end_time > ?) OR
                    (e.start_time < ? AND e.end_time > ?) OR
                    (e.start_time >= ? AND e.end_time <= ?)
                )
            ";

            $params = [$eventDate, $endTime, $startTime, $endTime, $startTime, $startTime, $endTime];

            if ($excludeEventId) {
                $sql .= " AND e.event_id != ?";
                $params[] = $excludeEventId;
            }

            $sql .= " ORDER BY e.start_time";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $conflicts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format conflicts for frontend
            $formattedConflicts = [];
            $hasWedding = false;
            $hasOtherEvents = false;

            foreach ($conflicts as $conflict) {
                $formattedConflicts[] = [
                    'event_id' => (int)$conflict['event_id'],
                    'event_title' => $conflict['event_title'],
                    'event_date' => $conflict['event_date'],
                    'start_time' => $conflict['start_time'],
                    'end_time' => $conflict['end_time'],
                    'event_type_id' => (int)$conflict['event_type_id'],
                    'event_type_name' => $conflict['event_type_name'],
                    'client_name' => $conflict['client_name'] ?: 'Unknown Client',
                    'venue_name' => $conflict['venue_name'] ?: 'TBD'
                ];

                // Check for wedding conflicts (business rule: only one wedding per day)
                if ($conflict['event_type_id'] == 1) {
                    $hasWedding = true;
                } else {
                    $hasOtherEvents = true;
                }
            }

            $response = [
                'hasConflicts' => count($formattedConflicts) > 0,
                'hasWedding' => $hasWedding,
                'hasOtherEvents' => $hasOtherEvents,
                'conflicts' => $formattedConflicts,
                'totalConflicts' => count($formattedConflicts),
                'checkDate' => $eventDate,
                'checkStartTime' => $startTime,
                'checkEndTime' => $endTime
            ];

            return json_encode([
                "status" => "success",
                "hasConflicts" => $response['hasConflicts'],
                "hasWedding" => $response['hasWedding'],
                "hasOtherEvents" => $response['hasOtherEvents'],
                "conflicts" => $response['conflicts']
            ]);
        } catch (Exception $e) {
            error_log("checkEventConflicts error: " . $e->getMessage());
            return json_encode([
                "status" => "error",
                "message" => "Failed to check event conflicts: " . $e->getMessage(),
                "hasConflicts" => false,
                "hasWedding" => false,
                "hasOtherEvents" => false,
                "conflicts" => []
            ]);
        }
    }

    public function getCalendarConflictData($startDate, $endDate) {
        try {
            $sql = "
                SELECT
                    e.event_date,
                    e.event_type_id,
                    et.event_name as event_type_name,
                    COUNT(*) as event_count
                FROM tbl_events e
                LEFT JOIN tbl_event_type et ON e.event_type_id = et.event_type_id
                WHERE e.event_date BETWEEN ? AND ?
                AND e.event_status NOT IN ('cancelled', 'completed')
                GROUP BY e.event_date, e.event_type_id, et.event_name
                ORDER BY e.event_date
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$startDate, $endDate]);
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Structure the data for frontend calendar
            $calendarData = [];

            foreach ($events as $event) {
                $date = $event['event_date'];
                $eventTypeId = (int)$event['event_type_id'];

                if (!isset($calendarData[$date])) {
                    $calendarData[$date] = [
                        'hasWedding' => false,
                        'hasOtherEvents' => false,
                        'eventCount' => 0,
                        'events' => []
                    ];
                }

                $calendarData[$date]['eventCount'] += $event['event_count'];

                if ($eventTypeId == 1) { // Wedding
                    $calendarData[$date]['hasWedding'] = true;
                } else {
                    $calendarData[$date]['hasOtherEvents'] = true;
                }

                $calendarData[$date]['events'][] = [
                    'event_type_id' => $eventTypeId,
                    'event_type_name' => $event['event_type_name'],
                    'count' => $event['event_count']
                ];
            }

            return json_encode([
                "status" => "success",
                "calendarData" => $calendarData,
                "dateRange" => [
                    "startDate" => $startDate,
                    "endDate" => $endDate
                ]
            ]);
        } catch (Exception $e) {
            error_log("getCalendarConflictData error: " . $e->getMessage());
            return json_encode([
                "status" => "error",
                "message" => "Failed to get calendar conflict data: " . $e->getMessage(),
                "calendarData" => []
            ]);
        }
    }
        public function getEventById($eventId) {
        try {
            $hasEoaPaymentStatus = false;
            try {
                $colStmt = $this->pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_event_organizer_assignments' AND COLUMN_NAME = 'payment_status' LIMIT 1");
                $colStmt->execute();
                $hasEoaPaymentStatus = (bool)$colStmt->fetchColumn();
            } catch (Exception $e) {
                $hasEoaPaymentStatus = false;
            }

            $organizerPaymentSelect = $hasEoaPaymentStatus ? "eoa.payment_status AS organizer_payment_status," : "NULL AS organizer_payment_status,";

            $sql = "
                SELECT
                    e.*,
                    CONCAT(c.user_firstName COLLATE utf8mb4_general_ci, ' ', c.user_lastName COLLATE utf8mb4_general_ci) as client_name,
                    c.user_firstName as client_first_name,
                    c.user_lastName as client_last_name,
                    c.user_suffix as client_suffix,
                    c.user_email as client_email,
                    c.user_contact as client_contact,
                    c.user_pfp as client_pfp,
                    c.user_birthdate as client_birthdate,
                    c.created_at as client_joined_date,
                    c.user_username as client_username,
                    CONCAT(a.user_firstName COLLATE utf8mb4_general_ci, ' ', a.user_lastName COLLATE utf8mb4_general_ci) as admin_name,
                    eoa.organizer_id,
                    eoa.assignment_id AS organizer_assignment_id,
                    eoa.status AS assignment_status,
                    eoa.notes AS organizer_notes,
                    eoa.assigned_at,
                    " . $organizerPaymentSelect . "
                    CONCAT(org.user_firstName COLLATE utf8mb4_general_ci, ' ', org.user_lastName COLLATE utf8mb4_general_ci) as organizer_name,
                    org.user_email as organizer_email,
                    org.user_contact as organizer_contact,
                    et.event_name as event_type_name,
                    et.event_description as event_type_description,
                    p.package_title,
                    p.package_description,
                    v.venue_title,
                    v.venue_location,
                    v.venue_contact,
                    v.venue_capacity,
                    COALESCE(vp.venue_price_min, 0) as venue_price,
                    pst.schedule_name as payment_schedule_name,
                    pst.schedule_description as payment_schedule_description,
                    pst.installment_count
                FROM tbl_events e
                LEFT JOIN tbl_users c ON e.user_id = c.user_id
                LEFT JOIN tbl_users a ON e.admin_id = a.user_id
                LEFT JOIN tbl_event_organizer_assignments eoa ON e.event_id = eoa.event_id AND eoa.status IN ('assigned','accepted')
                LEFT JOIN tbl_organizer o ON eoa.organizer_id = o.organizer_id
                LEFT JOIN tbl_users org ON o.user_id = org.user_id
                LEFT JOIN tbl_event_type et ON e.event_type_id = et.event_type_id
                LEFT JOIN tbl_packages p ON e.package_id = p.package_id
                LEFT JOIN tbl_venue v ON e.venue_id = v.venue_id
                LEFT JOIN tbl_venue_price vp ON v.venue_id = vp.venue_id AND vp.is_active = 1
                LEFT JOIN tbl_payment_schedule_types pst ON e.payment_schedule_type_id = pst.schedule_type_id
                WHERE e.event_id = ?
            ";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$eventId]);
            $event = $stmt->fetch(PDO::FETCH_ASSOC);

            // Debug logging for organizer assignment issues
            if ($event) {
                error_log("getEventById - Event ID: $eventId, organizer_id: " . ($event['organizer_id'] ?? 'NULL'));
                error_log("getEventById - organizer_name: " . ($event['organizer_name'] ?? 'NULL'));
                error_log("getEventById - assignment_status: " . ($event['assignment_status'] ?? 'NULL'));
            }

            if ($event) {
                // Parse event_attachments JSON field
                if (!empty($event['event_attachments'])) {
                    $event['attachments'] = json_decode($event['event_attachments'], true);
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        $event['attachments'] = [];
                        error_log("JSON decode error for event attachments: " . json_last_error_msg());
                    }
                } else {
                    $event['attachments'] = [];
                }

                // Get payment data (attachments removed)
                $paymentSql = "SELECT
                    p.payment_id, p.payment_method, p.payment_amount, p.payment_notes,
                    p.payment_status, p.payment_date, p.payment_reference, p.payment_percentage,
                    p.created_at
                FROM tbl_payments p
                WHERE p.event_id = ?
                ORDER BY p.created_at DESC";
                $paymentStmt = $this->pdo->prepare($paymentSql);
                $paymentStmt->execute([$eventId]);
                $payments = $paymentStmt->fetchAll(PDO::FETCH_ASSOC);

                // No attachment parsing needed

                $event['payments'] = $payments;
                error_log("getEventById: Found " . count($payments) . " payments for event " . $eventId);

                // For testing: Add sample attachments if event has none (only for event 28)
                if ($eventId == 28 && empty($event['attachments'])) {
                    $event['attachments'] = [
                        [
                            'file_name' => 'wedding_contract_2025.pdf',
                            'original_name' => 'Wedding Contract - Laurenz & Partner.pdf',
                            'file_path' => 'uploads/event_attachments/sample_contract.pdf',
                            'file_size' => 245760,
                            'file_type' => 'application/pdf',
                            'upload_date' => '2025-06-25 10:30:00',
                            'description' => 'Signed wedding contract and terms'
                        ],
                        [
                            'file_name' => 'venue_layout_plan.jpg',
                            'original_name' => 'Pearlmont Hotel Layout Plan.jpg',
                            'file_path' => 'uploads/event_attachments/venue_layout.jpg',
                            'file_size' => 512000,
                            'file_type' => 'image/jpeg',
                            'upload_date' => '2025-06-25 11:15:00',
                            'description' => 'Venue seating arrangement and layout'
                        ],
                        [
                            'file_name' => 'menu_preferences.docx',
                            'original_name' => 'Catering Menu Selections.docx',
                            'file_path' => 'uploads/event_attachments/menu_selections.docx',
                            'file_size' => 87040,
                            'file_type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            'upload_date' => '2025-06-25 14:45:00',
                            'description' => 'Detailed menu preferences and dietary requirements'
                        ]
                    ];

                    error_log("Added sample attachments for event 28");
                }

                // Debug client profile picture
                error_log("Event ID: $eventId, Client PFP: " . ($event['client_pfp'] ?? 'NULL'));

                // Get event components
                $stmt = $this->pdo->prepare("
                    SELECT * FROM tbl_event_components
                    WHERE event_id = ?
                    ORDER BY display_order
                ");
                $stmt->execute([$eventId]);
                $event['components'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Get event timeline
                $stmt = $this->pdo->prepare("
                    SELECT * FROM tbl_event_timeline
                    WHERE event_id = ?
                    ORDER BY display_order
                ");
                $stmt->execute([$eventId]);
                $event['timeline'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Get payment history (exclude cancelled payments)
                $stmt = $this->pdo->prepare("
                    SELECT * FROM tbl_payments
                    WHERE event_id = ? AND payment_status != 'cancelled'
                    ORDER BY payment_date DESC, created_at DESC
                ");
                $stmt->execute([$eventId]);
                $event['payments'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Do not merge payment proofs into event attachments.
                // The Files tab should only show event/theme attachments from tbl_events.event_attachments.

                return json_encode([
                    "status" => "success",
                    "event" => $event
                ]);
            } else {
                return json_encode([
                    "status" => "error",
                    "message" => "Event not found"
                ]);
            }
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Failed to fetch event: " . $e->getMessage()
            ]);
        }
    }

    public function uploadEventAttachment($eventId, $file, $description = '') {
        try {
            $uploadDir = 'uploads/event_attachments/';

            // Create directory if it doesn't exist
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $fileName = time() . '_' . $file['name'];
            $filePath = $uploadDir . $fileName;

            if (move_uploaded_file($file['tmp_name'], $filePath)) {
                // Get current attachments
                $stmt = $this->pdo->prepare("SELECT event_attachments FROM tbl_events WHERE event_id = ?");
                $stmt->execute([$eventId]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);

                $attachments = [];
                if (!empty($result['event_attachments'])) {
                    $attachments = json_decode($result['event_attachments'], true) ?: [];
                }

                // Add new attachment
                $newAttachment = [
                    'file_name' => $fileName,
                    'original_name' => $file['name'],
                    'file_path' => $filePath,
                    'file_size' => $file['size'],
                    'file_type' => $file['type'],
                    'upload_date' => date('Y-m-d H:i:s'),
                    'description' => $description
                ];

                $attachments[] = $newAttachment;

                // Update event with new attachments
                $stmt = $this->pdo->prepare("UPDATE tbl_events SET event_attachments = ? WHERE event_id = ?");
                $stmt->execute([json_encode($attachments), $eventId]);

                return json_encode([
                    "status" => "success",
                    "message" => "File uploaded successfully",
                    "attachment" => $newAttachment
                ]);
            } else {
                return json_encode([
                    "status" => "error",
                    "message" => "Failed to upload file"
                ]);
            }
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Upload error: " . $e->getMessage()
            ]);
        }
    }

    public function getEnhancedEventDetails($eventId) {
        try {
            // Get comprehensive event details using the enhanced view
            $stmt = $this->pdo->prepare("
                SELECT
                    e.*,
                    CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as client_name,
                    u.user_firstName as client_first_name,
                    u.user_lastName as client_last_name,
                    u.user_suffix as client_suffix,
                    u.user_email as client_email,
                    u.user_contact as client_contact,
                    u.user_pfp as client_pfp,
                    u.user_birthdate as client_birthdate,
                    u.created_at as client_joined_date,
                    u.user_username as client_username,
                        CONCAT(a.user_firstName COLLATE utf8mb4_general_ci, ' ', a.user_lastName COLLATE utf8mb4_general_ci) as admin_name,
                    CONCAT(org.user_firstName COLLATE utf8mb4_general_ci, ' ', org.user_lastName COLLATE utf8mb4_general_ci) as organizer_name,
                    CONCAT(cb.user_firstName COLLATE utf8mb4_general_ci, ' ', cb.user_lastName COLLATE utf8mb4_general_ci) as created_by_name,
                    CONCAT(ub.user_firstName COLLATE utf8mb4_general_ci, ' ', ub.user_lastName COLLATE utf8mb4_general_ci) as updated_by_name,
                    et.event_name as event_type_name,
                    et.event_description as event_type_description,
                    p.package_title,
                    p.package_description,
                    v.venue_title,
                    v.venue_location,
                    v.venue_contact,
                    v.venue_capacity,
                    COALESCE(vp.venue_price_min, 0) as venue_price,
                    pst.schedule_name as payment_schedule_name,
                    pst.schedule_description as payment_schedule_description,
                    pst.installment_count,
                    wd.id as wedding_details_id
                FROM tbl_events e
                LEFT JOIN tbl_users u ON e.user_id = u.user_id
                LEFT JOIN tbl_users a ON e.admin_id = a.user_id
                LEFT JOIN tbl_users org ON e.organizer_id = org.user_id
                LEFT JOIN tbl_users cb ON e.created_by = cb.user_id
                LEFT JOIN tbl_users ub ON e.updated_by = ub.user_id
                LEFT JOIN tbl_event_type et ON e.event_type_id = et.event_type_id
                LEFT JOIN tbl_packages p ON e.package_id = p.package_id
                LEFT JOIN tbl_venue v ON e.venue_id = v.venue_id
                LEFT JOIN tbl_venue_price vp ON v.venue_id = vp.venue_id AND vp.is_active = 1
                LEFT JOIN tbl_payment_schedule_types pst ON e.payment_schedule_type_id = pst.schedule_type_id
                LEFT JOIN tbl_wedding_details wd ON e.event_wedding_form_id = wd.id
                WHERE e.event_id = ?
            ");
            $stmt->execute([$eventId]);
            $event = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$event) {
                return json_encode([
                    "status" => "error",
                    "message" => "Event not found"
                ]);
            }

            // Get event components
            $stmt = $this->pdo->prepare("
                SELECT
                    ec.*,
                    pc.component_name as original_component_name,
                    pc.component_description as original_component_description
                FROM tbl_event_components ec
                LEFT JOIN tbl_package_inclusions pc ON ec.original_package_component_id = pc.inclusion_id
                WHERE ec.event_id = ?
                ORDER BY ec.display_order
            ");
            $stmt->execute([$eventId]);
            $event['components'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get event timeline
            $stmt = $this->pdo->prepare("
                SELECT
                    et.*,
                    CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as assigned_to_name
                FROM tbl_event_timeline et
                LEFT JOIN tbl_users u ON et.assigned_to = u.user_id
                WHERE et.event_id = ?
                ORDER BY et.display_order
            ");
            $stmt->execute([$eventId]);
            $event['timeline'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get payment schedule
            $stmt = $this->pdo->prepare("
                SELECT * FROM tbl_event_payment_schedules
                WHERE event_id = ?
                ORDER BY installment_number
            ");
            $stmt->execute([$eventId]);
            $event['payment_schedule'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get payments (exclude cancelled payments)
            $stmt = $this->pdo->prepare("
                SELECT
                    p.*,
                    eps.installment_number,
                    eps.due_date as schedule_due_date
                FROM tbl_payments p
                LEFT JOIN tbl_event_payment_schedules eps ON p.schedule_id = eps.schedule_id
                WHERE p.event_id = ? AND p.payment_status != 'cancelled'
                ORDER BY p.payment_date DESC
            ");
            $stmt->execute([$eventId]);
            $event['payments'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get wedding details if this is a wedding event and has wedding form
            if ($event['event_type_id'] == 1 && $event['event_wedding_form_id']) {
                $weddingDetails = $this->getWeddingDetails($eventId);
                $weddingResponse = json_decode($weddingDetails, true);
                if ($weddingResponse['status'] === 'success') {
                    $event['wedding_details'] = $weddingResponse['wedding_details'];
                }
            }

            // Get feedback if available
            if ($event['event_feedback_id']) {
                $stmt = $this->pdo->prepare("
                    SELECT
                        f.*,
                        CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as feedback_by_name
                    FROM tbl_feedback f
                    LEFT JOIN tbl_users u ON f.user_id = u.user_id
                    WHERE f.feedback_id = ?
                ");
                $stmt->execute([$event['event_feedback_id']]);
                $event['feedback'] = $stmt->fetch(PDO::FETCH_ASSOC);
            }

            // Parse JSON fields if they exist
            if ($event['event_attachments']) {
                $event['event_attachments'] = json_decode($event['event_attachments'], true);
            }
            if ($event['recurrence_rule']) {
                $event['recurrence_rule'] = json_decode($event['recurrence_rule'], true);
            }

            return json_encode([
                "status" => "success",
                "event" => $event
            ]);

        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Failed to fetch event details: " . $e->getMessage()
            ]);
        }
    }

    public function updateBookingStatus($bookingId, $status) {
        try {
            // Validate booking status
            $validStatuses = ['pending', 'confirmed', 'converted', 'cancelled', 'completed'];
            if (!in_array($status, $validStatuses)) {
                return json_encode(["status" => "error", "message" => "Invalid booking status"]);
            }

            // Check if booking exists
            $checkSql = "SELECT booking_id, booking_reference, user_id FROM tbl_bookings WHERE booking_id = :booking_id";
            $checkStmt = $this->conn->prepare($checkSql);
            $checkStmt->execute([':booking_id' => $bookingId]);
            $booking = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$booking) {
                return json_encode(["status" => "error", "message" => "Booking not found"]);
            }

            // Update booking status
            $sql = "UPDATE tbl_bookings SET booking_status = :status, updated_at = NOW() WHERE booking_id = :booking_id";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':status' => $status,
                ':booking_id' => $bookingId
            ]);

            // Create typed notification for client via stored procedure
            $titleByStatus = [
                'confirmed' => 'Booking Accepted',
                'cancelled' => 'Booking Cancelled',
                'completed' => 'Booking Completed',
            ];

            $messageByStatus = [
                'confirmed' => "Your booking {$booking['booking_reference']} has been accepted! You can now proceed with event planning.",
                'cancelled' => "Your booking {$booking['booking_reference']} has been cancelled.",
                'completed' => "Your booking {$booking['booking_reference']} has been completed.",
            ];

            $notificationType = 'booking_' . $status;
            $notificationTitle = $titleByStatus[$status] ?? 'Booking Status Updated';
            $notificationMessage = $messageByStatus[$status] ?? "Your booking {$booking['booking_reference']} status has been updated to {$status}.";

            try {
                $proc = $this->conn->prepare("CALL CreateNotification(
                    :p_user_id,
                    :p_notification_type,
                    :p_notification_title,
                    :p_notification_message,
                    :p_notification_priority,
                    :p_notification_icon,
                    :p_notification_url,
                    :p_event_id,
                    :p_booking_id,
                    :p_venue_id,
                    :p_store_id,
                    :p_budget_id,
                    :p_feedback_id,
                    :p_expires_at
                )");

                $proc->execute([
                    ':p_user_id' => (int)$booking['user_id'],
                    ':p_notification_type' => $notificationType,
                    ':p_notification_title' => $notificationTitle,
                    ':p_notification_message' => $notificationMessage,
                    ':p_notification_priority' => $status === 'confirmed' ? 'high' : 'medium',
                    ':p_notification_icon' => $status === 'confirmed' ? 'check-circle' : 'info',
                    ':p_notification_url' => '/client/bookings',
                    ':p_event_id' => null,
                    ':p_booking_id' => (int)$bookingId,
                    ':p_venue_id' => null,
                    ':p_store_id' => null,
                    ':p_budget_id' => null,
                    ':p_feedback_id' => null,
                    ':p_expires_at' => date('Y-m-d H:i:s', strtotime('+72 hours'))
                ]);
            } catch (Exception $eNotif) {
                error_log('updateBookingStatus: failed to create notification via procedure: ' . $eNotif->getMessage());
                // Fallback direct insert
                try {
                    $fallback = $this->conn->prepare("INSERT INTO tbl_notifications (
                        user_id, notification_type, notification_title, notification_message,
                        notification_priority, notification_icon, notification_url,
                        event_id, booking_id, venue_id, store_id, budget_id, feedback_id, expires_at
                    ) VALUES (
                        :user_id, :type, :title, :message,
                        :priority, :icon, :url,
                        :event_id, :booking_id, :venue_id, :store_id, :budget_id, :feedback_id, :expires_at
                    )");
                    $fallback->execute([
                        ':user_id' => (int)$booking['user_id'],
                        ':type' => $notificationType,
                        ':title' => $notificationTitle,
                        ':message' => $notificationMessage,
                        ':priority' => $status === 'confirmed' ? 'high' : 'medium',
                        ':icon' => $status === 'confirmed' ? 'check-circle' : 'info',
                        ':url' => '/client/bookings',
                        ':event_id' => null,
                        ':booking_id' => (int)$bookingId,
                        ':venue_id' => null,
                        ':store_id' => null,
                        ':budget_id' => null,
                        ':feedback_id' => null,
                        ':expires_at' => date('Y-m-d H:i:s', strtotime('+72 hours'))
                    ]);
                } catch (Exception $efb) {
                    error_log('updateBookingStatus: direct insert fallback failed: ' . $efb->getMessage());
                }
            }

            // Log booking status update
            if ($this->logger) {
                $oldStatus = 'pending'; // We should ideally fetch the old status first
                $this->logger->logBooking(
                    7, // Admin user ID - you should pass this properly
                    $bookingId,
                    'status_updated',
                    "Booking {$booking['booking_reference']} status changed to {$status}",
                    $oldStatus,
                    $status,
                    ['booking_reference' => $booking['booking_reference']]
                );
            }

            return json_encode([
                "status" => "success",
                "message" => "Booking status updated successfully"
            ]);
        } catch (Exception $e) {
            error_log("updateBookingStatus error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function acceptBooking($bookingId, $userId, $userRole) {
        try {
            // Validate user role
            if (!in_array($userRole, ['admin', 'staff'])) {
                return json_encode(["status" => "error", "message" => "Invalid user role"]);
            }

            // Check if booking exists and is in correct status
            $checkSql = "SELECT booking_id, booking_reference, user_id, booking_status FROM tbl_bookings WHERE booking_id = :booking_id";
            $checkStmt = $this->conn->prepare($checkSql);
            $checkStmt->execute([':booking_id' => $bookingId]);
            $booking = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$booking) {
                return json_encode(["status" => "error", "message" => "Booking not found"]);
            }

            if (!in_array($booking['booking_status'], ['pending', 'reserved'])) {
                return json_encode(["status" => "error", "message" => "Booking is not in pending or reserved status"]);
            }

            // Get user name for tracking
            $userSql = "SELECT user_firstName, user_lastName FROM tbl_users WHERE user_id = :user_id";
            $userStmt = $this->conn->prepare($userSql);
            $userStmt->execute([':user_id' => $userId]);
            $user = $userStmt->fetch(PDO::FETCH_ASSOC);
            $userName = trim(($user['user_firstName'] ?? 'User') . ' ' . ($user['user_lastName'] ?? ''));

            // Update booking status and acceptance tracking
            $updateSql = "UPDATE tbl_bookings SET
                         booking_status = 'confirmed',
                         accepted_by_user_id = :accepted_by_user_id,
                         accepted_by_role = :accepted_by_role,
                         accepted_at = NOW(),
                         updated_at = NOW()
                         WHERE booking_id = :booking_id";
            $updateStmt = $this->conn->prepare($updateSql);
            $updateStmt->execute([
                ':accepted_by_user_id' => $userId,
                ':accepted_by_role' => $userRole,
                ':booking_id' => $bookingId
            ]);

            // Notify client about acceptance
            try {
                $clientNotif = $this->conn->prepare("INSERT INTO tbl_notifications (
                    user_id, notification_type, notification_title, notification_message,
                    notification_priority, notification_icon, notification_url,
                    event_id, booking_id, venue_id, store_id, budget_id, feedback_id, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

                $clientNotif->execute([
                    $booking['user_id'],
                    'booking_accepted',
                    'Booking Accepted',
                    "Your booking {$booking['booking_reference']} has been accepted by {$userRole}: {$userName}",
                    'high',
                    'check-circle',
                    '/client/bookings',
                    null,
                    $bookingId,
                    null,
                    null,
                    null,
                    null,
                    date('Y-m-d H:i:s', strtotime('+72 hours'))
                ]);
            } catch (Exception $e) {
                error_log('acceptBooking: client notification failed: ' . $e->getMessage());
            }

            // Notify other admins and staff about acceptance
            try {
                $otherUsersSql = "SELECT user_id FROM tbl_users WHERE user_role IN ('admin', 'staff') AND user_id != :user_id";
                $otherUsersStmt = $this->conn->prepare($otherUsersSql);
                $otherUsersStmt->execute([':user_id' => $userId]);
                $otherUsers = $otherUsersStmt->fetchAll(PDO::FETCH_COLUMN);

                foreach ($otherUsers as $otherUserId) {
                    $otherNotif = $this->conn->prepare("INSERT INTO tbl_notifications (
                        user_id, notification_type, notification_title, notification_message,
                        notification_priority, notification_icon, notification_url,
                        event_id, booking_id, venue_id, store_id, budget_id, feedback_id, expires_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

                    $otherNotif->execute([
                        $otherUserId,
                        'booking_accepted_by_other',
                        'Booking Accepted by ' . ucfirst($userRole),
                        "Booking {$booking['booking_reference']} has been accepted by {$userRole}: {$userName}",
                        'medium',
                        'info',
                        '/staff/bookings',
                        null,
                        $bookingId,
                        null,
                        null,
                        null,
                        null,
                        date('Y-m-d H:i:s', strtotime('+72 hours'))
                    ]);
                }
            } catch (Exception $e) {
                error_log('acceptBooking: other users notification failed: ' . $e->getMessage());
            }

            return json_encode([
                "status" => "success",
                "message" => "Booking accepted successfully",
                "accepted_by" => $userName,
                "accepted_by_role" => $userRole
            ]);

        } catch (Exception $e) {
            error_log("acceptBooking error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }
    public function confirmBooking($bookingReference) {
        try {
            // Check if booking exists
            $checkSql = "SELECT booking_id, user_id, booking_status FROM tbl_bookings WHERE booking_reference = :reference";
            $checkStmt = $this->conn->prepare($checkSql);
            $checkStmt->execute([':reference' => $bookingReference]);
            $booking = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$booking) {
                return json_encode(["status" => "error", "message" => "Booking not found"]);
            }

            if ($booking['booking_status'] === 'confirmed') {
                return json_encode(["status" => "error", "message" => "Booking is already confirmed"]);
            }

            // Update booking status to confirmed
            $sql = "UPDATE tbl_bookings SET booking_status = 'confirmed', updated_at = NOW() WHERE booking_reference = :reference";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':reference' => $bookingReference]);

            // Create typed notification for client via stored procedure
            try {
                $proc = $this->conn->prepare("CALL CreateNotification(
                    :p_user_id,
                    :p_notification_type,
                    :p_notification_title,
                    :p_notification_message,
                    :p_notification_priority,
                    :p_notification_icon,
                    :p_notification_url,
                    :p_event_id,
                    :p_booking_id,
                    :p_venue_id,
                    :p_store_id,
                    :p_budget_id,
                    :p_feedback_id,
                    :p_expires_at
                )");

                $proc->execute([
                    ':p_user_id' => (int)$booking['user_id'],
                    ':p_notification_type' => 'booking_confirmed',
                    ':p_notification_title' => 'Booking Accepted',
                    ':p_notification_message' => "Your booking {$bookingReference} has been confirmed! You can now proceed with event planning.",
                    ':p_notification_priority' => 'high',
                    ':p_notification_icon' => 'check-circle',
                    ':p_notification_url' => '/client/bookings',
                    ':p_event_id' => null,
                    ':p_booking_id' => (int)$booking['booking_id'],
                    ':p_venue_id' => null,
                    ':p_store_id' => null,
                    ':p_budget_id' => null,
                    ':p_feedback_id' => null,
                    ':p_expires_at' => date('Y-m-d H:i:s', strtotime('+72 hours'))
                ]);
            } catch (Exception $eNotif) {
                error_log('confirmBooking: failed to create notification via procedure: ' . $eNotif->getMessage());
                // Fallback direct insert
                try {
                    $fallback = $this->conn->prepare("INSERT INTO tbl_notifications (
                        user_id, notification_type, notification_title, notification_message,
                        notification_priority, notification_icon, notification_url,
                        event_id, booking_id, venue_id, store_id, budget_id, feedback_id, expires_at
                    ) VALUES (
                        :user_id, :type, :title, :message,
                        :priority, :icon, :url,
                        :event_id, :booking_id, :venue_id, :store_id, :budget_id, :feedback_id, :expires_at
                    )");
                    $fallback->execute([
                        ':user_id' => (int)$booking['user_id'],
                        ':type' => 'booking_confirmed',
                        ':title' => 'Booking Accepted',
                        ':message' => "Your booking {$bookingReference} has been confirmed! You can now proceed with event planning.",
                        ':priority' => 'high',
                        ':icon' => 'check-circle',
                        ':url' => '/client/bookings',
                        ':event_id' => null,
                        ':booking_id' => (int)$booking['booking_id'],
                        ':venue_id' => null,
                        ':store_id' => null,
                        ':budget_id' => null,
                        ':feedback_id' => null,
                        ':expires_at' => date('Y-m-d H:i:s', strtotime('+72 hours'))
                    ]);
                } catch (Exception $efb) {
                    error_log('confirmBooking: direct insert fallback failed: ' . $efb->getMessage());
                }
            }

            return json_encode([
                "status" => "success",
                "message" => "Booking confirmed successfully"
            ]);
        } catch (Exception $e) {
            error_log("confirmBooking error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }
    public function getUserProfilePicture($userId) {
        try {
            $sql = "SELECT user_pfp as profile_picture FROM tbl_users WHERE user_id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$userId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($result) {
                return json_encode([
                    "status" => "success",
                    "profile_picture" => $result['profile_picture']
                ]);
            } else {
                return json_encode([
                    "status" => "error",
                    "message" => "User not found"
                ]);
            }
        } catch (Exception $e) {
            error_log("getUserProfilePicture error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function getAllBookings() {
        try {
            $sql = "SELECT
                        b.booking_id,
                        b.booking_reference,
                        b.user_id,
                        CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as client_name,
                        u.user_email as client_email,
                        u.user_contact as client_phone,
                        u.user_pfp as client_profile_picture,
                        b.event_type_id,
                        et.event_name as event_type_name,
                        b.event_name,
                        b.event_date,
                        b.event_time,
                        b.start_time,
                        b.end_time,
                        b.guest_count,
                        b.venue_id,
                        v.venue_title as venue_name,
                        b.package_id,
                        p.package_title as package_name,
                        b.notes,
                        b.booking_status,
                        b.total_price,
                        b.created_at,
                        b.updated_at,
                        CASE WHEN e.event_id IS NOT NULL THEN 1 ELSE 0 END as is_converted,
                        e.event_id as converted_event_id
                    FROM tbl_bookings b
                    JOIN tbl_users u ON b.user_id = u.user_id
                    JOIN tbl_event_type et ON b.event_type_id = et.event_type_id
                    LEFT JOIN tbl_venue v ON b.venue_id = v.venue_id
                    LEFT JOIN tbl_packages p ON b.package_id = p.package_id
                    LEFT JOIN tbl_events e ON b.booking_reference = e.original_booking_reference
                    ORDER BY b.created_at DESC";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();

            $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Add payment information for each booking
            foreach ($bookings as &$booking) {
                // Get payments for this booking
                $paymentStmt = $this->conn->prepare("
                    SELECT
                        payment_id,
                        payment_amount,
                        payment_method,
                        payment_date,
                        payment_status,
                        payment_reference,
                        payment_notes,
                        created_at
                    FROM tbl_payments
                    WHERE booking_id = ? AND payment_status != 'cancelled'
                    ORDER BY payment_date DESC
                ");
                $paymentStmt->execute([$booking['booking_id']]);
                $booking['payments'] = $paymentStmt->fetchAll(PDO::FETCH_ASSOC);

                // Calculate total reserved payment amount
                $booking['reserved_payment_total'] = 0;
                foreach ($booking['payments'] as $payment) {
                    if ($payment['payment_status'] === 'completed') {
                        $booking['reserved_payment_total'] += floatval($payment['payment_amount']);
                    }
                }
            }

            return json_encode([
                "status" => "success",
                "bookings" => $bookings,
                "count" => count($bookings)
            ]);
        } catch (Exception $e) {
            error_log("getAllBookings error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }
    public function getConfirmedBookings() {
        try {
            $sql = "SELECT
                        b.booking_id,
                        b.booking_reference,
                        b.user_id,
                        CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as client_name,
                        u.user_email as client_email,
                        u.user_contact as client_phone,
                        u.user_pfp as client_profile_picture,
                        b.event_type_id,
                        et.event_name as event_type_name,
                        b.event_name,
                        b.event_date,
                        b.event_time,
                        b.start_time,
                        b.end_time,
                        b.guest_count,
                        b.venue_id,
                        v.venue_title as venue_name,
                        b.package_id,
                        p.package_title as package_name,
                        b.notes,
                        b.booking_status,
                        b.total_price,
                        b.created_at,
                        b.updated_at,
                        CASE WHEN e.event_id IS NOT NULL THEN 1 ELSE 0 END as is_converted,
                        e.event_id as converted_event_id
                    FROM tbl_bookings b
                    JOIN tbl_users u ON b.user_id = u.user_id
                    JOIN tbl_event_type et ON b.event_type_id = et.event_type_id
                    LEFT JOIN tbl_venue v ON b.venue_id = v.venue_id
                    LEFT JOIN tbl_packages p ON b.package_id = p.package_id
                    LEFT JOIN tbl_events e ON b.booking_reference = e.original_booking_reference
                    WHERE b.booking_status = 'confirmed'
                    ORDER BY b.created_at DESC";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();

            $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "bookings" => $bookings,
                "count" => count($bookings)
            ]);
        } catch (Exception $e) {
            error_log("getConfirmedBookings error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }
    public function searchBookings($search) {
        try {
            $sql = "SELECT
                        b.booking_id,
                        b.booking_reference,
                        b.user_id,
                        CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as client_name,
                        u.user_email as client_email,
                        u.user_contact as client_phone,
                        b.event_type_id,
                        et.event_name as event_type_name,
                        b.event_name,
                        b.event_date,
                        b.event_time,
                        b.start_time,
                        b.end_time,
                        b.guest_count,
                        b.venue_id,
                        v.venue_title as venue_name,
                        b.package_id,
                        p.package_title as package_name,
                        b.notes,
                        b.booking_status,
                        b.created_at,
                        b.updated_at,
                        CASE WHEN e.event_id IS NOT NULL THEN 1 ELSE 0 END as is_converted,
                        e.event_id as converted_event_id
                    FROM tbl_bookings b
                    JOIN tbl_users u ON b.user_id = u.user_id
                    JOIN tbl_event_type et ON b.event_type_id = et.event_type_id
                    LEFT JOIN tbl_venue v ON b.venue_id = v.venue_id
                    LEFT JOIN tbl_packages p ON b.package_id = p.package_id
                    LEFT JOIN tbl_events e ON b.booking_reference = e.original_booking_reference
                    WHERE b.booking_status = 'confirmed' AND (
                        b.booking_reference LIKE :search1 OR
                        CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) LIKE :search2 OR
                        b.event_name LIKE :search3
                    )
                    ORDER BY b.created_at DESC";
            $stmt = $this->conn->prepare($sql);
            $searchTerm = "%$search%";
            $stmt->execute([
                ':search1' => $searchTerm,
                ':search2' => $searchTerm,
                ':search3' => $searchTerm
            ]);
            $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return json_encode([
                "status" => "success",
                "bookings" => $bookings,
                "count" => count($bookings)
            ]);
        } catch (Exception $e) {
            error_log("searchBookings error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function testBookings() {
        try {
            $sql = "SELECT booking_id, booking_reference, booking_status, event_name FROM tbl_bookings WHERE booking_status = 'confirmed' LIMIT 5";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "message" => "Test successful",
                "bookings" => $bookings,
                "count" => count($bookings)
            ]);
        } catch (Exception $e) {
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function getEventByBookingReference($bookingReference) { return json_encode(["status" => "error", "message" => "Method not implemented"]); }
    public function testBookingsTable() { return json_encode(["status" => "error", "message" => "Method not implemented"]); }
    public function createVenue() {
        try {
            // Validate required fields
            $requiredFields = ['venue_title', 'venue_location', 'venue_contact', 'venue_capacity'];
            foreach ($requiredFields as $field) {
                if (!isset($_POST[$field]) || empty($_POST[$field])) {
                    return json_encode([
                        "status" => "error",
                        "message" => "Missing required field: " . $field
                    ]);
                }
            }

            // Start transaction
            $this->conn->beginTransaction();

            // Handle file uploads first
            $profilePicture = null;
            $coverPhoto = null;

            if (isset($_FILES['venue_profile_picture']) && $_FILES['venue_profile_picture']['error'] === 0) {
                $uploadResult = json_decode($this->uploadVenueFile($_FILES['venue_profile_picture'], 'venue_profile_pictures'), true);
                if ($uploadResult['status'] === 'success') {
                    $profilePicture = $uploadResult['filePath'];
                } else {
                    throw new Exception("Failed to upload profile picture: " . $uploadResult['message']);
                }
            }

            if (isset($_FILES['venue_cover_photo']) && $_FILES['venue_cover_photo']['error'] === 0) {
                $uploadResult = json_decode($this->uploadVenueFile($_FILES['venue_cover_photo'], 'venue_cover_photos'), true);
                if ($uploadResult['status'] === 'success') {
                    $coverPhoto = $uploadResult['filePath'];
                } else {
                    throw new Exception("Failed to upload cover photo: " . $uploadResult['message']);
                }
            }

            // Set default user_id and venue_owner (can be customized later)
            $userId = isset($_POST['user_id']) ? $_POST['user_id'] : 7; // Default admin user
            $venueOwner = isset($_POST['venue_owner']) ? $_POST['venue_owner'] : 'Admin';

            // Validate venue_type against enum values
            $validVenueTypes = ['indoor', 'outdoor', 'hybrid', 'garden', 'hall', 'pavilion'];
            $venueType = isset($_POST['venue_type']) ? $_POST['venue_type'] : 'indoor';

            // Map frontend venue_type to database enum values
            if ($venueType === 'internal') {
                $venueType = 'indoor';
            } elseif ($venueType === 'external') {
                $venueType = 'outdoor';
            }

            if (!in_array($venueType, $validVenueTypes)) {
                $venueType = 'indoor'; // Default fallback
            }

            // Insert venue with all required fields
            $sql = "INSERT INTO tbl_venue (
                venue_title, venue_details, venue_location, venue_contact,
                venue_type, venue_capacity, extra_pax_rate, is_active,
                venue_profile_picture, venue_cover_photo, user_id, venue_owner,
                venue_status
            ) VALUES (
                :venue_title, :venue_details, :venue_location, :venue_contact,
                :venue_type, :venue_capacity, :extra_pax_rate, :is_active,
                :venue_profile_picture, :venue_cover_photo, :user_id, :venue_owner,
                :venue_status
            )";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                'venue_title' => $_POST['venue_title'],
                'venue_details' => $_POST['venue_details'] ?? '',
                'venue_location' => $_POST['venue_location'],
                'venue_contact' => $_POST['venue_contact'],
                'venue_type' => $venueType,
                'venue_capacity' => $_POST['venue_capacity'],
                'extra_pax_rate' => isset($_POST['extra_pax_rate']) ? $_POST['extra_pax_rate'] : 0.00,
                'is_active' => isset($_POST['is_active']) ? $_POST['is_active'] : 1,
                'venue_profile_picture' => $profilePicture,
                'venue_cover_photo' => $coverPhoto,
                'user_id' => $userId,
                'venue_owner' => $venueOwner,
                'venue_status' => 'available'
            ]);

            $venueId = $this->conn->lastInsertId();

            // Handle inclusions if provided
            if (isset($_POST['inclusions_data'])) {
                $inclusions = json_decode($_POST['inclusions_data'], true);

                if (is_array($inclusions)) {
                    foreach ($inclusions as $inclusion) {
                        // Insert inclusion
                        $sql = "INSERT INTO tbl_venue_inclusions (
                            venue_id, inclusion_name, inclusion_description, inclusion_price
                        ) VALUES (
                            :venue_id, :inclusion_name, :inclusion_description, :inclusion_price
                        )";

                        $stmt = $this->conn->prepare($sql);
                        $stmt->execute([
                            'venue_id' => $venueId,
                            'inclusion_name' => $inclusion['inclusion_name'],
                            'inclusion_description' => $inclusion['inclusion_description'] ?? '',
                            'inclusion_price' => $inclusion['inclusion_price'] ?? 0
                        ]);

                        $inclusionId = $this->conn->lastInsertId();

                        // Handle components if provided
                        if (isset($inclusion['components']) && is_array($inclusion['components'])) {
                            foreach ($inclusion['components'] as $component) {
                                $sql = "INSERT INTO tbl_venue_components (
                                    inclusion_id, component_name, component_description
                                ) VALUES (
                                    :inclusion_id, :component_name, :component_description
                                )";

                                $stmt = $this->conn->prepare($sql);
                                $stmt->execute([
                                    'inclusion_id' => $inclusionId,
                                    'component_name' => $component['component_name'],
                                    'component_description' => $component['component_description'] ?? ''
                                ]);
                            }
                        }
                    }
                }
            }

            $this->conn->commit();

            return json_encode([
                "status" => "success",
                "message" => "Venue created successfully",
                "venue_id" => $venueId
            ]);

        } catch (Exception $e) {
            $this->conn->rollBack();
            return json_encode([
                "status" => "error",
                "message" => "Failed to create venue: " . $e->getMessage()
            ]);
        }
    }
    public function checkAndFixVenuePaxRates() {
        try {
            // First, let's see what venues we have
            $sql = "SELECT v.venue_id, v.venue_title, COALESCE(vp.venue_price_min, 0) as venue_price, v.extra_pax_rate
                    FROM tbl_venue v
                    LEFT JOIN tbl_venue_price vp ON v.venue_id = vp.venue_id
                    WHERE v.is_active = 1";
            $stmt = $this->conn->query($sql);
            $venues = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $results = [];
            $updates = [];

            foreach ($venues as $venue) {
                $venueTitle = $venue['venue_title'];
                $currentPaxRate = floatval($venue['extra_pax_rate']);

                // Use the actual pax rate from the database
                $expectedPaxRate = floatval($venue['extra_pax_rate']);

                $results[] = [
                    'venue_id' => $venue['venue_id'],
                    'venue_title' => $venueTitle,
                    'current_pax_rate' => $currentPaxRate,
                    'expected_pax_rate' => $expectedPaxRate,
                    'needs_update' => $expectedPaxRate > 0 && $currentPaxRate != $expectedPaxRate
                ];

                // Update if needed
                if ($expectedPaxRate > 0 && $currentPaxRate != $expectedPaxRate) {
                    $updateSql = "UPDATE tbl_venue SET extra_pax_rate = ? WHERE venue_id = ?";
                    $updateStmt = $this->conn->prepare($updateSql);
                    $updateStmt->execute([$expectedPaxRate, $venue['venue_id']]);

                    $updates[] = [
                        'venue_id' => $venue['venue_id'],
                        'venue_title' => $venueTitle,
                        'old_rate' => $currentPaxRate,
                        'new_rate' => $expectedPaxRate
                    ];
                }
            }

            return json_encode([
                "status" => "success",
                "message" => "Venue pax rates checked and updated",
                "venues" => $results,
                "updates" => $updates,
                "total_venues" => count($venues),
                "updated_count" => count($updates)
            ]);
        } catch (PDOException $e) {
            return json_encode([
                "status" => "error",
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
    }

    public function setVenuePaxRate($venueId, $paxRate) {
        try {
            $sql = "UPDATE tbl_venue SET extra_pax_rate = ? WHERE venue_id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$paxRate, $venueId]);

            // Get the updated venue data
            $getSql = "SELECT v.venue_id, v.venue_title, COALESCE(vp.venue_price_min, 0) as venue_price, v.extra_pax_rate
                       FROM tbl_venue v
                       LEFT JOIN tbl_venue_price vp ON v.venue_id = vp.venue_id
                       WHERE v.venue_id = ?";
            $getStmt = $this->conn->prepare($getSql);
            $getStmt->execute([$venueId]);
            $venue = $getStmt->fetch(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "message" => "Venue pax rate updated successfully",
                "venue" => $venue
            ]);
        } catch (PDOException $e) {
            return json_encode([
                "status" => "error",
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
    }

    public function testVenueData() {
        try {
            $sql = "SELECT v.venue_id, v.venue_title, COALESCE(vp.venue_price_min, 0) as venue_price, v.extra_pax_rate
                    FROM tbl_venue v
                    LEFT JOIN tbl_venue_price vp ON v.venue_id = vp.venue_id
                    WHERE v.is_active = 1 LIMIT 5";
            $stmt = $this->conn->query($sql);
            $venues = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "message" => "Venue data test",
                "venues" => $venues,
                "total_venues" => count($venues),
                "venues_with_pax_rates" => array_filter($venues, function($venue) {
                    return floatval($venue['extra_pax_rate']) > 0;
                })
            ]);
        } catch (PDOException $e) {
            return json_encode([
                "status" => "error",
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
    }

    public function getAllVenues($includeInactive = false) {
        try {
            $whereClause = $includeInactive ? "" : "WHERE v.is_active = 1";
            $sql = "SELECT v.*,
                    GROUP_CONCAT(DISTINCT vc.component_name COLLATE utf8mb4_general_ci) as components,
                    GROUP_CONCAT(DISTINCT vi.inclusion_name COLLATE utf8mb4_general_ci) as inclusions
                    FROM tbl_venue v
                    LEFT JOIN tbl_venue_inclusions vi ON v.venue_id = vi.venue_id
                    LEFT JOIN tbl_venue_components vc ON vi.inclusion_id = vc.inclusion_id
                    $whereClause
                    GROUP BY v.venue_id
                    ORDER BY v.created_at DESC";

            $stmt = $this->conn->query($sql);
            $venues = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($venues as &$venue) {
                $venue['components'] = $venue['components'] ? explode(',', $venue['components']) : [];
                $venue['inclusions'] = $venue['inclusions'] ? explode(',', $venue['inclusions']) : [];
                $venue['is_active'] = (bool)$venue['is_active'];

                // Add pax rate information
                $venue['extra_pax_rate'] = floatval($venue['extra_pax_rate'] ?? 0);
                $venue['has_pax_rate'] = $venue['extra_pax_rate'] > 0;
                $venue['base_capacity'] = 100; // Base capacity for pax rate calculation
            }

            return json_encode([
                "status" => "success",
                "data" => $venues
            ]);
        } catch (PDOException $e) {
            return json_encode([
                "status" => "error",
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
    }
    public function getVenueById($venueId) {
        try {
            // Get venue basic info
            $sql = "SELECT * FROM tbl_venue WHERE venue_id = :venue_id";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':venue_id' => $venueId]);
            $venue = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$venue) {
                return json_encode(["status" => "error", "message" => "Venue not found"]);
            }

            // Get venue inclusions
            $inclusionsSql = "SELECT * FROM tbl_venue_inclusions WHERE venue_id = :venue_id AND is_active = 1 ORDER BY inclusion_name";
            $inclusionsStmt = $this->conn->prepare($inclusionsSql);
            $inclusionsStmt->execute([':venue_id' => $venueId]);
            $inclusions = $inclusionsStmt->fetchAll(PDO::FETCH_ASSOC);

            // For each inclusion, get its components
            foreach ($inclusions as &$inclusion) {
                $componentsSql = "SELECT * FROM tbl_venue_components WHERE inclusion_id = :inclusion_id AND is_active = 1 ORDER BY component_name";
                $componentsStmt = $this->conn->prepare($componentsSql);
                $componentsStmt->execute([':inclusion_id' => $inclusion['inclusion_id']]);
                $inclusion['components'] = $componentsStmt->fetchAll(PDO::FETCH_ASSOC);
            }

            $venue['inclusions'] = $inclusions;

            // Add pax rate information
            $venue['extra_pax_rate'] = floatval($venue['extra_pax_rate'] ?? 0);
            $venue['has_pax_rate'] = $venue['extra_pax_rate'] > 0;
            $venue['base_capacity'] = 100; // Base capacity for pax rate calculation

            return json_encode([
                "status" => "success",
                "venue" => $venue
            ]);
        } catch (Exception $e) {
            error_log("getVenueById error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }
    public function updateVenue($data) {
        try {
            $this->conn->beginTransaction();

            // Update venue basic information
            $stmt = $this->conn->prepare("
                UPDATE tbl_venue SET
                    venue_title = ?,
                    venue_owner = ?,
                    venue_location = ?,
                    venue_contact = ?,
                    venue_details = ?,
                    venue_status = ?,
                    venue_capacity = ?,
                    extra_pax_rate = ?,
                    venue_type = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE venue_id = ?
            ");

            $stmt->execute([
                $data['venue_title'],
                $data['venue_owner'],
                $data['venue_location'],
                $data['venue_contact'],
                $data['venue_details'] ?? '',
                $data['venue_status'] ?? 'available',
                $data['venue_capacity'],
                $data['extra_pax_rate'] ?? 0.00,
                $data['venue_type'] ?? 'indoor',
                $data['venue_id']
            ]);

            $this->conn->commit();

            return json_encode([
                "status" => "success",
                "message" => "Venue updated successfully"
            ]);
        } catch (Exception $e) {
            $this->conn->rollback();
            return json_encode([
                "status" => "error",
                "message" => "Failed to update venue: " . $e->getMessage()
            ]);
        }
    }

    public function deleteVenueImage($data) {
        try {
            $venueId = $data['venue_id'] ?? 0;
            $imageType = $data['image_type'] ?? '';

            if (!$venueId || !$imageType) {
                return json_encode([
                    "status" => "error",
                    "message" => "Venue ID and image type are required"
                ]);
            }

            // Get current image path before deletion
            $stmt = $this->conn->prepare("SELECT venue_profile_picture, venue_cover_photo FROM tbl_venue WHERE venue_id = ?");
            $stmt->execute([$venueId]);
            $venue = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$venue) {
                return json_encode([
                    "status" => "error",
                    "message" => "Venue not found"
                ]);
            }

            $imagePath = null;
            $updateField = '';

            if ($imageType === 'profile') {
                $imagePath = $venue['venue_profile_picture'];
                $updateField = 'venue_profile_picture';
            } elseif ($imageType === 'cover') {
                $imagePath = $venue['venue_cover_photo'];
                $updateField = 'venue_cover_photo';
            } else {
                return json_encode([
                    "status" => "error",
                    "message" => "Invalid image type"
                ]);
            }

            // Update database to remove image reference
            $stmt = $this->conn->prepare("UPDATE tbl_venue SET {$updateField} = NULL, updated_at = CURRENT_TIMESTAMP WHERE venue_id = ?");
            $stmt->execute([$venueId]);

            // Delete physical file if it exists
            if ($imagePath && file_exists($imagePath)) {
                unlink($imagePath);
            }

            return json_encode([
                "status" => "success",
                "message" => ucfirst($imageType) . " image deleted successfully"
            ]);
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Failed to delete image: " . $e->getMessage()
            ]);
        }
    }

    public function getVenuesForPackage() {
        try {
            $sql = "SELECT v.*,
                    GROUP_CONCAT(DISTINCT vc.component_name COLLATE utf8mb4_general_ci) as components,
                    GROUP_CONCAT(DISTINCT vi.inclusion_name COLLATE utf8mb4_general_ci) as inclusions,
                    COALESCE(v.extra_pax_rate, 0) as extra_pax_rate,
                    COALESCE(vp.venue_price_min, 0) as total_price
                    FROM tbl_venue v
                    LEFT JOIN tbl_venue_inclusions vi ON v.venue_id = vi.venue_id
                    LEFT JOIN tbl_venue_components vc ON vi.inclusion_id = vc.inclusion_id
                    LEFT JOIN tbl_venue_price vp ON v.venue_id = vp.venue_id AND vp.is_active = 1
                    WHERE v.is_active = 1
                    GROUP BY v.venue_id
                    ORDER BY v.created_at DESC";

            $stmt = $this->conn->query($sql);
            $venues = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($venues as &$venue) {
                $venue['components'] = $venue['components'] ? explode(',', $venue['components']) : [];
                $venue['inclusions'] = $venue['inclusions'] ? explode(',', $venue['inclusions']) : [];
                $venue['total_price'] = floatval($venue['total_price'] ?? 0);
                $venue['extra_pax_rate'] = floatval($venue['extra_pax_rate'] ?? 0);

                // Add pax rate information
                $venue['has_pax_rate'] = $venue['extra_pax_rate'] > 0;
                $venue['base_capacity'] = 100; // Base capacity for pax rate calculation
            }

            return json_encode([
                "status" => "success",
                "venues" => $venues
            ]);
        } catch (PDOException $e) {
            return json_encode([
                "status" => "error",
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
    }

    // Get all available venues for "start from scratch" events
    public function getAllAvailableVenues() {
        try {
            $sql = "SELECT v.*,
                           COALESCE(v.extra_pax_rate, 0) as extra_pax_rate,
                           v.venue_capacity,
                           v.venue_type,
                           v.venue_profile_picture,
                           v.venue_cover_photo
                    FROM tbl_venue v
                    WHERE v.is_active = 1 AND v.venue_status = 'available'
                    ORDER BY v.venue_title ASC";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $venues = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "venues" => $venues
            ]);
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
    }

    public function calculateVenuePricing($venueId, $guestCount) {
        try {
            // Get venue details
            $sql = "SELECT venue_id, venue_title, extra_pax_rate, venue_capacity
                    FROM tbl_venue
                    WHERE venue_id = :venue_id AND is_active = 1";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':venue_id' => $venueId]);
            $venue = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$venue) {
                return json_encode([
                    "status" => "error",
                    "message" => "Venue not found"
                ]);
            }

            $extraPaxRate = floatval($venue['extra_pax_rate']);
            $baseCapacity = 100; // Base capacity for pax rate calculation

            // Calculate overflow charges
            $extraGuests = max(0, $guestCount - $baseCapacity);
            $overflowCharge = $extraGuests * $extraPaxRate;
            $totalPrice = $overflowCharge;

            return json_encode([
                "status" => "success",
                "venue_id" => $venueId,
                "venue_title" => $venue['venue_title'],
                "guest_count" => $guestCount,
                "base_price" => $basePrice,
                "extra_pax_rate" => $extraPaxRate,
                "base_capacity" => $baseCapacity,
                "extra_guests" => $extraGuests,
                "overflow_charge" => $overflowCharge,
                "total_price" => $totalPrice,
                "has_overflow" => $extraGuests > 0
            ]);

        } catch (PDOException $e) {
            return json_encode([
                "status" => "error",
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
    }

    public function createPackageWithVenues($data) {
        try {
            $this->conn->beginTransaction();

            // Validate required fields
            $packageData = $data['package_data'];
            if (empty($packageData['package_title']) || empty($packageData['package_price']) ||
                empty($packageData['guest_capacity']) || empty($packageData['created_by'])) {
                return json_encode(["status" => "error", "message" => "Package title, price, guest capacity, and creator are required"]);
            }

            // Insert main package
            $sql = "INSERT INTO tbl_packages (package_title, package_description, package_price, guest_capacity, venue_fee_buffer, created_by, is_active)
                    VALUES (:title, :description, :price, :capacity, :venue_fee_buffer, :created_by, 1)";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':title' => $packageData['package_title'],
                ':description' => $packageData['package_description'] ?? '',
                ':price' => $packageData['package_price'],
                ':capacity' => $packageData['guest_capacity'],
                ':venue_fee_buffer' => $packageData['venue_fee_buffer'] ?? 0.00,
                ':created_by' => $packageData['created_by']
            ]);

            $packageId = $this->conn->lastInsertId();

            // Set original price and lock the package price after creation
            $lockPriceSql = "UPDATE tbl_packages SET
                                original_price = package_price,
                                is_price_locked = 1,
                                price_lock_date = CURRENT_TIMESTAMP
                            WHERE package_id = :package_id";
            $lockStmt = $this->conn->prepare($lockPriceSql);
            $lockStmt->execute([':package_id' => $packageId]);

            // Insert components if provided
            if (!empty($data['components']) && is_array($data['components'])) {
                foreach ($data['components'] as $index => $component) {
                    if (!empty($component['component_name'])) {
                        // Handle venue fee components with venue options
                        $description = $component['component_description'] ?? '';
                        if ($component['component_category'] === 'venue_fee' && !empty($component['venue_options'])) {
                            $venueOptions = json_encode($component['venue_options']);
                            $description = "Venue Fee Buffer - Options: " . $venueOptions;
                        }

                        $componentSql = "INSERT INTO tbl_package_inclusions (package_id, inclusion_name, components_list, inclusion_price, display_order)
                                        VALUES (:package_id, :name, :description, :price, :order)";
                        $componentStmt = $this->conn->prepare($componentSql);
                        $componentStmt->execute([
                            ':package_id' => $packageId,
                            ':name' => $component['component_name'],
                            ':description' => $description,
                            ':price' => $component['component_price'] ?? 0,
                            ':order' => $index
                        ]);
                    }
                }
            }

            // Insert freebies if provided
            if (!empty($data['freebies']) && is_array($data['freebies'])) {
                foreach ($data['freebies'] as $index => $freebie) {
                    if (!empty($freebie['freebie_name'])) {
                        $freebieSql = "INSERT INTO tbl_package_freebies (package_id, freebie_name, freebie_description, freebie_value, display_order)
                                      VALUES (:package_id, :name, :description, :value, :order)";
                        $freebieStmt = $this->conn->prepare($freebieSql);
                        $freebieStmt->execute([
                            ':package_id' => $packageId,
                            ':name' => $freebie['freebie_name'],
                            ':description' => $freebie['freebie_description'] ?? '',
                            ':value' => $freebie['freebie_value'] ?? 0,
                            ':order' => $index
                        ]);
                    }
                }
            }

            // Insert event types if provided
            if (!empty($data['event_types']) && is_array($data['event_types'])) {
                foreach ($data['event_types'] as $eventTypeId) {
                    $eventTypeSql = "INSERT INTO tbl_package_event_types (package_id, event_type_id) VALUES (:package_id, :event_type_id)";
                    $eventTypeStmt = $this->conn->prepare($eventTypeSql);
                    $eventTypeStmt->execute([
                        ':package_id' => $packageId,
                        ':event_type_id' => $eventTypeId
                    ]);
                }
            }

            // Insert venues if provided
            if (!empty($data['venue_ids']) && is_array($data['venue_ids'])) {
                foreach ($data['venue_ids'] as $venueId) {
                    $venueSql = "INSERT INTO tbl_package_venues (package_id, venue_id) VALUES (:package_id, :venue_id)";
                    $venueStmt = $this->conn->prepare($venueSql);
                    $venueStmt->execute([
                        ':package_id' => $packageId,
                        ':venue_id' => $venueId
                    ]);
                }
            }

            $this->conn->commit();

            return json_encode([
                "status" => "success",
                "message" => "Package created successfully",
                "package_id" => $packageId
            ]);
        } catch (Exception $e) {
            $this->conn->rollback();
            error_log("createPackageWithVenues error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }
    public function getDashboardMetrics($adminId) {
        try {
            $metrics = [];

            // Get total events for this admin
            $totalEventsSql = "SELECT COUNT(*) as total FROM tbl_events WHERE admin_id = ?";
            $stmt = $this->conn->prepare($totalEventsSql);
            $stmt->execute([$adminId]);
            $metrics['totalEvents'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Get total revenue (sum of all completed payments for admin's events)
            $revenueSql = "SELECT COALESCE(SUM(p.payment_amount), 0) as total_revenue
                          FROM tbl_payments p
                          JOIN tbl_events e ON p.event_id = e.event_id
                          WHERE e.admin_id = ? AND p.payment_status = 'completed'";
            $stmt = $this->conn->prepare($revenueSql);
            $stmt->execute([$adminId]);
            $metrics['totalRevenue'] = $stmt->fetch(PDO::FETCH_ASSOC)['total_revenue'];

            // Get total clients (unique clients who have events with this admin)
            $clientsSql = "SELECT COUNT(DISTINCT e.user_id) as total
                          FROM tbl_events e
                          WHERE e.admin_id = ?";
            $stmt = $this->conn->prepare($clientsSql);
            $stmt->execute([$adminId]);
            $metrics['totalClients'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Get completed (done) events
            $completedSql = "SELECT COUNT(*) as total
                            FROM tbl_events
                            WHERE admin_id = ? AND event_status = 'done'";
            $stmt = $this->conn->prepare($completedSql);
            $stmt->execute([$adminId]);
            $metrics['completedEvents'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Calculate monthly growth (comparing this month vs last month)
            $currentMonth = date('Y-m');
            $lastMonth = date('Y-m', strtotime('-1 month'));

            // Events growth
            $currentMonthEventsSql = "SELECT COUNT(*) as total FROM tbl_events
                                     WHERE admin_id = ? AND DATE_FORMAT(created_at, '%Y-%m') = ?";
            $stmt = $this->conn->prepare($currentMonthEventsSql);
            $stmt->execute([$adminId, $currentMonth]);
            $currentMonthEvents = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $stmt->execute([$adminId, $lastMonth]);
            $lastMonthEvents = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $eventsGrowth = $lastMonthEvents > 0 ? (($currentMonthEvents - $lastMonthEvents) / $lastMonthEvents) * 100 : 0;

            // Revenue growth
            $currentMonthRevenueSql = "SELECT COALESCE(SUM(p.payment_amount), 0) as total
                                      FROM tbl_payments p
                                      JOIN tbl_events e ON p.event_id = e.event_id
                                      WHERE e.admin_id = ? AND p.payment_status = 'completed'
                                      AND DATE_FORMAT(p.created_at, '%Y-%m') = ?";
            $stmt = $this->conn->prepare($currentMonthRevenueSql);
            $stmt->execute([$adminId, $currentMonth]);
            $currentMonthRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $stmt->execute([$adminId, $lastMonth]);
            $lastMonthRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $revenueGrowth = $lastMonthRevenue > 0 ? (($currentMonthRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100 : 0;

            // Clients growth
            $currentMonthClientsSql = "SELECT COUNT(DISTINCT e.user_id) as total
                                      FROM tbl_events e
                                      WHERE e.admin_id = ? AND DATE_FORMAT(e.created_at, '%Y-%m') = ?";
            $stmt = $this->conn->prepare($currentMonthClientsSql);
            $stmt->execute([$adminId, $currentMonth]);
            $currentMonthClients = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $stmt->execute([$adminId, $lastMonth]);
            $lastMonthClients = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $clientsGrowth = $lastMonthClients > 0 ? (($currentMonthClients - $lastMonthClients) / $lastMonthClients) * 100 : 0;

            // Done events growth
            $currentMonthCompletedSql = "SELECT COUNT(*) as total
                                        FROM tbl_events
                                        WHERE admin_id = ? AND event_status = 'done'
                                        AND DATE_FORMAT(updated_at, '%Y-%m') = ?";
            $stmt = $this->conn->prepare($currentMonthCompletedSql);
            $stmt->execute([$adminId, $currentMonth]);
            $currentMonthCompleted = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $stmt->execute([$adminId, $lastMonth]);
            $lastMonthCompleted = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $completedGrowth = $lastMonthCompleted > 0 ? (($currentMonthCompleted - $lastMonthCompleted) / $lastMonthCompleted) * 100 : 0;

            $metrics['monthlyGrowth'] = [
                'events' => round($eventsGrowth, 1),
                'revenue' => round($revenueGrowth, 1),
                'clients' => round($clientsGrowth, 1),
                'completed' => round($completedGrowth, 1)
            ];

            return json_encode([
                "status" => "success",
                "metrics" => $metrics
            ]);
        } catch (Exception $e) {
            error_log("getDashboardMetrics error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }
    public function getUpcomingEvents($adminId, $limit = 5) {
        try {
            $sql = "SELECT
                        e.event_id as id,
                        e.event_title as title,
                        e.event_date as date,
                        e.event_status as status,
                        e.total_budget as budget,
                        COALESCE(v.venue_title, 'No venue selected') as venue,
                        CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as client
                    FROM tbl_events e
                    LEFT JOIN tbl_venue v ON e.venue_id = v.venue_id
                    LEFT JOIN tbl_users u ON e.user_id = u.user_id
                    WHERE e.admin_id = ?
                    AND e.event_date >= CURDATE()
                    AND e.event_status IN ('draft', 'confirmed', 'on_going')
                    ORDER BY e.event_date ASC
                    LIMIT ?";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$adminId, $limit]);
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "events" => $events
            ]);
        } catch (Exception $e) {
            error_log("getUpcomingEvents error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }
    public function getRecentPayments($adminId, $limit = 5) {
        try {
            $sql = "SELECT
                        p.payment_id as id,
                        e.event_title as event,
                        p.payment_date as date,
                        p.payment_amount as amount,
                        p.payment_method as type,
                        p.payment_status as status
                    FROM tbl_payments p
                    JOIN tbl_events e ON p.event_id = e.event_id
                    WHERE e.admin_id = ?
                    ORDER BY p.created_at DESC
                    LIMIT ?";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$adminId, $limit]);
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "payments" => $payments
            ]);
        } catch (Exception $e) {
            error_log("getRecentPayments error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }
    public function createPayment($data) {
        try {
            $this->pdo->beginTransaction();

            // Check for duplicate payment reference if provided
            if (!empty($data['payment_reference'])) {
                $referenceCheckSql = "SELECT payment_id FROM tbl_payments WHERE payment_reference = ? LIMIT 1";
                $referenceCheckStmt = $this->pdo->prepare($referenceCheckSql);
                $referenceCheckStmt->execute([$data['payment_reference']]);
                if ($referenceCheckStmt->fetch(PDO::FETCH_ASSOC)) {
                    $this->pdo->rollback();
                    return json_encode([
                        "status" => "error",
                        "message" => "Payment reference already exists. Please use a unique reference number."
                    ]);
                }
            }

            // Determine if created_at column exists to safely use time-window checks
            $createdAtExists = false;
            try {
                $colStmt = $this->pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_payments' AND COLUMN_NAME = 'created_at' LIMIT 1");
                $colStmt->execute();
                $createdAtExists = (bool)$colStmt->fetchColumn();
            } catch (Exception $ignored) {
                $createdAtExists = false;
            }

            // Check for accidental duplicate payment within a very short window (same payload)
            // Allow legitimate multiple payments on the same day with same amount/method
            if ($createdAtExists) {
                $dupWindowMinutes = 2; // treat same submissions within 2 minutes as accidental duplicates
                $duplicateCheckSql = "SELECT payment_id FROM tbl_payments
                                     WHERE event_id = ?
                                       AND payment_amount = ?
                                       AND payment_method = ?
                                       AND payment_status != 'cancelled'
                                       AND created_at > DATE_SUB(NOW(), INTERVAL {$dupWindowMinutes} MINUTE)
                                     LIMIT 1";
                $duplicateCheckStmt = $this->pdo->prepare($duplicateCheckSql);
                $duplicateCheckStmt->execute([
                    $data['event_id'],
                    $data['payment_amount'],
                    $data['payment_method']
                ]);
                if ($duplicateCheckStmt->fetch(PDO::FETCH_ASSOC)) {
                    $this->pdo->rollback();
                    return json_encode([
                        "status" => "error",
                        "message" => "Duplicate payment detected. A similar payment was just recorded for this event. Please wait a moment and try again."
                    ]);
                }
            }

            // Additional check: Prevent multiple payments within 1 minute for same event and exact amount/method
            if ($createdAtExists) {
                $recentWindowMinutes = 1;
                $recentPaymentCheckSql = "SELECT payment_id FROM tbl_payments
                                         WHERE event_id = ? AND client_id = ?
                                           AND payment_amount = ? AND payment_method = ?
                                           AND created_at > DATE_SUB(NOW(), INTERVAL {$recentWindowMinutes} MINUTE)
                                           AND payment_status != 'cancelled'
                                         LIMIT 1";
                $recentPaymentStmt = $this->pdo->prepare($recentPaymentCheckSql);
                $recentPaymentStmt->execute([
                    $data['event_id'],
                    $data['client_id'],
                    $data['payment_amount'],
                    $data['payment_method']
                ]);
                if ($recentPaymentStmt->fetch(PDO::FETCH_ASSOC)) {
                    $this->pdo->rollback();
                    return json_encode([
                        "status" => "error",
                        "message" => "Payment creation too frequent. Please wait a moment before submitting the same amount again."
                    ]);
                }
            }

            // Attachments removed per simplification
            $attachments = [];

            // Prepare data with proper encoding and collation handling
            $paymentMethod = mb_convert_encoding($data['payment_method'], 'UTF-8', 'UTF-8');
            $paymentNotes = mb_convert_encoding($data['payment_notes'] ?? '', 'UTF-8', 'UTF-8');
            $paymentStatus = mb_convert_encoding($data['payment_status'] ?? 'completed', 'UTF-8', 'UTF-8');
            $paymentReference = mb_convert_encoding($data['payment_reference'] ?? '', 'UTF-8', 'UTF-8');

            // Use the collation-safe payment insertion method
            $paymentPercentage = null;
            if (isset($data['payment_percentage']) && $data['payment_percentage'] > 0) {
                $paymentPercentage = floatval($data['payment_percentage']);
            } elseif (isset($data['total_budget']) && $data['total_budget'] > 0) {
                $paymentPercentage = $this->calculatePaymentPercentage($data['payment_amount'], $data['total_budget']);
            }

            $paymentId = $this->insertPaymentSimple(
                $data['event_id'],
                $data['client_id'],
                $paymentMethod,
                $data['payment_amount'],
                $paymentNotes,
                $paymentStatus,
                $data['payment_date'] ?? date('Y-m-d'),
                $paymentReference,
                $paymentPercentage,
                $attachments
            );

            $this->pdo->commit();

            // Log payment creation activity - DISABLED TO PREVENT CONCAT COLLATION ERRORS
            // if ($this->logger) {
            //     $this->logger->logPayment(
            //         $data['client_id'],
            //         $paymentId,
            //         'created',
            //         "Payment of {$data['payment_amount']} received via {$paymentMethod} for event ID {$data['event_id']}",
            //         $data['payment_amount'],
            //         null,
            //         $paymentStatus,
            //         [
            //             'event_id' => $data['event_id'],
            //             'payment_reference' => $paymentReference ?: null,
            //             'payment_date' => $data['payment_date'] ?? date('Y-m-d')
            //         ]
            //     );
            // }

            return json_encode([
                "status" => "success",
                "payment_id" => $paymentId,
                "message" => "Payment created successfully"
            ]);
        } catch (Exception $e) {
            $this->pdo->rollback();
            return json_encode([
                "status" => "error",
                "message" => "Failed to create payment: " . $e->getMessage()
            ]);
        }
    }
    public function getEventPayments($eventId) {
        try {
            error_log("getEventPayments: Fetching payments for event ID: " . $eventId);

            // First get the payments
            $stmt = $this->pdo->prepare("
                SELECT
                    p.*,
                    u.user_firstName,
                    u.user_lastName,
                    eps.installment_number,
                    eps.due_date,
                    eps.amount_due as schedule_amount_due
                FROM tbl_payments p
                LEFT JOIN tbl_users u ON p.client_id = u.user_id
                LEFT JOIN tbl_event_payment_schedules eps ON p.schedule_id = eps.schedule_id
                WHERE p.event_id = ?
                ORDER BY p.payment_date DESC
            ");
            $stmt->execute([$eventId]);
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            error_log("getEventPayments: Found " . count($payments) . " payments for event " . $eventId);

            // Attachments no longer fetched or returned for payments

            error_log("getEventPayments: Returning " . count($payments) . " payments");
            error_log("getEventPayments: Payment data: " . json_encode($payments));

            return json_encode([
                "status" => "success",
                "payments" => $payments
            ]);
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Failed to fetch event payments: " . $e->getMessage()
            ]);
        }
    }
    public function getClientPayments($clientId) { return json_encode(["status" => "error", "message" => "Method not implemented"]); }
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
                    e.event_title,
                    e.event_date,
                    CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as client_name
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
            $updateQuery = "UPDATE tbl_payments SET payment_status = :status, updated_at = CURRENT_TIMESTAMP WHERE payment_id = :payment_id";
            $updateStmt = $this->pdo->prepare($updateQuery);
            $updateStmt->bindParam(':status', $status);
            $updateStmt->bindParam(':payment_id', $paymentId, PDO::PARAM_INT);
            $updateStmt->execute();

            // Log the status change
            $logQuery = "
                INSERT INTO tbl_payment_logs
                (event_id, payment_id, client_id, action_type, amount, reference_number, notes)
                VALUES (:event_id, :payment_id, :client_id, 'payment_confirmed', :amount, :reference_number, :notes)
            ";
            $logStmt = $this->pdo->prepare($logQuery);
            $logStmt->bindParam(':event_id', $payment['event_id'], PDO::PARAM_INT);
            $logStmt->bindParam(':payment_id', $paymentId, PDO::PARAM_INT);
            $logStmt->bindParam(':client_id', $payment['client_id'], PDO::PARAM_INT);
            $logStmt->bindParam(':amount', $payment['payment_amount']);
            $logStmt->bindParam(':reference_number', $payment['payment_reference']);
            $logStmt->bindParam(':notes', $notes);
            $logStmt->execute();

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
    public function getPaymentSchedule($eventId) { return json_encode(["status" => "error", "message" => "Method not implemented"]); }
    public function getEventsWithPaymentStatus($adminId) {
        try {
            $query = "
                SELECT
                    e.event_id,
                    e.event_title,
                    e.event_date,
                    e.total_budget,
                    e.payment_status as event_payment_status,
                    COALESCE(SUM(p.payment_amount), 0) as total_paid,
                    (e.total_budget - COALESCE(SUM(p.payment_amount), 0)) as remaining_balance,
                    CASE
                        WHEN e.total_budget > 0 THEN ROUND((COALESCE(SUM(p.payment_amount), 0) / e.total_budget) * 100, 2)
                        ELSE 0
                    END as payment_percentage,
                    CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as client_name,
                    COUNT(p.payment_id) as payment_count
                FROM tbl_events e
                LEFT JOIN tbl_users u ON e.user_id = u.user_id
                LEFT JOIN tbl_payments p ON e.event_id = p.event_id AND p.payment_status = 'completed'
                WHERE e.admin_id = :admin_id
                GROUP BY e.event_id
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
    public function getPaymentAnalytics($adminId, $startDate = null, $endDate = null) {
        try {
            // Base date filter
            $dateFilter = "";
            if ($startDate && $endDate) {
                $dateFilter = "AND p.payment_date BETWEEN :start_date AND :end_date";
            }

            $query = "
                SELECT
                    COUNT(DISTINCT e.event_id) as total_events,
                    COUNT(p.payment_id) as total_payments,
                    COALESCE(SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END), 0) as total_revenue,
                    COALESCE(SUM(CASE WHEN p.payment_status = 'pending' THEN p.payment_amount ELSE 0 END), 0) as pending_payments,
                    CASE
                        WHEN COUNT(CASE WHEN p.payment_status = 'completed' THEN 1 END) > 0
                        THEN COALESCE(SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END), 0) / COUNT(CASE WHEN p.payment_status = 'completed' THEN 1 END)
                        ELSE 0
                    END as average_payment,
                    COUNT(CASE WHEN p.payment_method = 'gcash' AND p.payment_status = 'completed' THEN 1 END) as gcash_payments,
                    COUNT(CASE WHEN p.payment_method = 'bank-transfer' AND p.payment_status = 'completed' THEN 1 END) as bank_payments,
                    COUNT(CASE WHEN p.payment_method = 'cash' AND p.payment_status = 'completed' THEN 1 END) as cash_payments
                FROM tbl_events e
                LEFT JOIN tbl_payments p ON e.event_id = p.event_id
                WHERE e.admin_id = :admin_id $dateFilter
            ";

            $stmt = $this->pdo->prepare($query);
            $stmt->bindParam(':admin_id', $adminId, PDO::PARAM_INT);

            if ($startDate && $endDate) {
                $stmt->bindParam(':start_date', $startDate);
                $stmt->bindParam(':end_date', $endDate);
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
    public function createPaymentSchedule($data) { return json_encode(["status" => "error", "message" => "Method not implemented"]); }
    public function getEventPaymentSchedule($eventId) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT
                    eps.*,
                    pst.schedule_name,
                    e.event_title,
                    e.total_budget
                FROM tbl_event_payment_schedules eps
                LEFT JOIN tbl_payment_schedule_types pst ON eps.schedule_type_id = pst.schedule_type_id
                LEFT JOIN tbl_events e ON eps.event_id = e.event_id
                WHERE eps.event_id = ?
                ORDER BY eps.installment_number
            ");
            $stmt->execute([$eventId]);
            $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "schedules" => $schedules
            ]);
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Failed to fetch event payment schedule: " . $e->getMessage()
            ]);
        }
    }
    public function getPaymentScheduleTypes() {
        try {
            $stmt = $this->pdo->prepare("
                SELECT * FROM tbl_payment_schedule_types
                WHERE is_active = 1
                ORDER BY schedule_type_id
            ");
            $stmt->execute();
            $scheduleTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "scheduleTypes" => $scheduleTypes
            ]);
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Failed to fetch payment schedule types: " . $e->getMessage()
            ]);
        }
    }
    public function recordScheduledPayment($data) { return json_encode(["status" => "error", "message" => "Method not implemented"]); }
    public function getPaymentLogs($eventId) {
        try {
            $query = "
                SELECT
                    pl.log_id,
                    pl.event_id,
                    pl.payment_id,
                    pl.action_type,
                    pl.amount,
                    pl.reference_number,
                    pl.notes,
                    pl.created_at,
                    CONCAT(c.user_firstName COLLATE utf8mb4_general_ci, ' ', c.user_lastName COLLATE utf8mb4_general_ci) as client_name,
                        CONCAT(a.user_firstName COLLATE utf8mb4_general_ci, ' ', a.user_lastName COLLATE utf8mb4_general_ci) as admin_name,
                    p.payment_method,
                    p.payment_status,
                    e.event_title
                FROM tbl_payment_logs pl
                LEFT JOIN tbl_users c ON pl.client_id = c.user_id
                LEFT JOIN tbl_users a ON pl.admin_id = a.user_id
                LEFT JOIN tbl_payments p ON pl.payment_id = p.payment_id
                LEFT JOIN tbl_events e ON pl.event_id = e.event_id
                WHERE pl.event_id = :event_id
                ORDER BY pl.created_at DESC
            ";

            $stmt = $this->pdo->prepare($query);
            $stmt->bindParam(':event_id', $eventId, PDO::PARAM_INT);
            $stmt->execute();

            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "logs" => $logs
            ]);

        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Failed to fetch payment logs: " . $e->getMessage()
            ]);
        }
    }
    public function getAdminPaymentLogs($adminId, $limit = 50) {
        try {
            $query = "
                SELECT
                    pl.log_id,
                    pl.event_id,
                    pl.payment_id,
                    pl.action_type,
                    pl.amount,
                    pl.reference_number,
                    pl.notes,
                    pl.created_at,
                    CONCAT(c.user_firstName COLLATE utf8mb4_general_ci, ' ', c.user_lastName COLLATE utf8mb4_general_ci) as client_name,
                        CONCAT(a.user_firstName COLLATE utf8mb4_general_ci, ' ', a.user_lastName COLLATE utf8mb4_general_ci) as admin_name,
                    p.payment_method,
                    p.payment_status,
                    e.event_title
                FROM tbl_payment_logs pl
                LEFT JOIN tbl_users c ON pl.client_id = c.user_id
                LEFT JOIN tbl_users a ON pl.admin_id = a.user_id
                LEFT JOIN tbl_payments p ON pl.payment_id = p.payment_id
                LEFT JOIN tbl_events e ON pl.event_id = e.event_id
                WHERE e.admin_id = :admin_id
                ORDER BY pl.created_at DESC
                LIMIT :limit
            ";

            $stmt = $this->pdo->prepare($query);
            $stmt->bindParam(':admin_id', $adminId, PDO::PARAM_INT);
            $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();

            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "logs" => $logs
            ]);

        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Failed to fetch admin payment logs: " . $e->getMessage()
            ]);
        }
    }

    public function getEnhancedPaymentDashboard($adminId) { return json_encode(["status" => "error", "message" => "Method not implemented"]); }

    // Settings Methods
    public function getUserProfile($userId) {
        try {
            $sql = "SELECT user_id, user_firstName, user_lastName, user_email, user_contact, user_pfp, created_at
                    FROM tbl_users WHERE user_id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$userId]);
            $profile = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($profile) {
                return json_encode([
                    "status" => "success",
                    "profile" => $profile
                ]);
            } else {
                return json_encode([
                    "status" => "error",
                    "message" => "User not found"
                ]);
            }
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Error fetching profile: " . $e->getMessage()
            ]);
        }
    }

    public function updateUserProfile($data) {
        try {
            // Build dynamic update query to handle optional profile picture
            $updateFields = [
                "user_firstName = ?",
                "user_lastName = ?",
                "user_email = ?",
                "user_contact = ?"
            ];

            $params = [
                $data['firstName'],
                $data['lastName'],
                $data['email'],
                $data['contact']
            ];

            // Add profile picture if provided
            if (isset($data['user_pfp'])) {
                $updateFields[] = "user_pfp = ?";
                $params[] = $data['user_pfp'];
            }

            $params[] = $data['user_id'];

            $sql = "UPDATE tbl_users SET " . implode(", ", $updateFields) . " WHERE user_id = ?";

            $stmt = $this->conn->prepare($sql);
            $result = $stmt->execute($params);

            if ($result) {
                return json_encode([
                    "status" => "success",
                    "message" => "Profile updated successfully"
                ]);
            } else {
                return json_encode([
                    "status" => "error",
                    "message" => "Failed to update profile"
                ]);
            }
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Error updating profile: " . $e->getMessage()
            ]);
        }
    }

    public function changePassword($data) {
        try {
            // Verify current password
            $sql = "SELECT user_password FROM tbl_users WHERE user_id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$data['user_id']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user || !password_verify($data['currentPassword'], $user['user_password'])) {
                return json_encode([
                    "status" => "error",
                    "message" => "Current password is incorrect"
                ]);
            }

            // Update password
            $hashedPassword = password_hash($data['newPassword'], PASSWORD_DEFAULT);
            $updateSql = "UPDATE tbl_users SET user_password = ? WHERE user_id = ?";
            $updateStmt = $this->conn->prepare($updateSql);
            $result = $updateStmt->execute([$hashedPassword, $data['user_id']]);

            if ($result) {
                return json_encode([
                    "status" => "success",
                    "message" => "Password changed successfully"
                ]);
            } else {
                return json_encode([
                    "status" => "error",
                    "message" => "Failed to change password"
                ]);
            }
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Error changing password: " . $e->getMessage()
            ]);
        }
    }

    public function getWebsiteSettings() {
        try {
            // Check if settings table exists, if not create default settings
            $checkSql = "SELECT COUNT(*) as count FROM information_schema.tables
                        WHERE table_schema = DATABASE() AND table_name = 'tbl_website_settings'";
            $checkStmt = $this->conn->prepare($checkSql);
            $checkStmt->execute();
            $tableExists = $checkStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0;

            if (!$tableExists) {
                // Create table if it doesn't exist
                $createTableSql = "CREATE TABLE tbl_website_settings (
                    setting_id INT PRIMARY KEY AUTO_INCREMENT,
                    company_name VARCHAR(255) DEFAULT 'Event Coordination System',
                    company_logo TEXT,
                    hero_image TEXT,
                    primary_color VARCHAR(7) DEFAULT '#16a34a',
                    secondary_color VARCHAR(7) DEFAULT '#059669',
                    contact_email VARCHAR(255),
                    contact_phone VARCHAR(50),
                    address TEXT,
                    about_text TEXT,
                    social_facebook VARCHAR(255),
                    social_instagram VARCHAR(255),
                    social_twitter VARCHAR(255),
                    require_otp_on_login TINYINT(1) NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )";
                $this->conn->exec($createTableSql);

                // Insert default settings
                $insertSql = "INSERT INTO tbl_website_settings (company_name) VALUES ('Event Coordination System')";
                $this->conn->exec($insertSql);
            } else {
                // Ensure the require_otp_on_login column exists (idempotent migration)
                try {
                    $colCheck = $this->conn->prepare("SELECT COUNT(*) as count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'tbl_website_settings' AND column_name = 'require_otp_on_login'");
                    $colCheck->execute();
                    $hasColumn = $colCheck->fetch(PDO::FETCH_ASSOC)['count'] > 0;
                    if (!$hasColumn) {
                        $this->conn->exec("ALTER TABLE tbl_website_settings ADD COLUMN require_otp_on_login TINYINT(1) NOT NULL DEFAULT 1 AFTER social_twitter");
                    }
                } catch (Exception $e) {
                    // ignore if cannot add column
                }
            }

            $sql = "SELECT * FROM tbl_website_settings ORDER BY setting_id DESC LIMIT 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $settings = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($settings) {
                return json_encode([
                    "status" => "success",
                    "settings" => $settings
                ]);
            } else {
                return json_encode([
                    "status" => "success",
                    "settings" => [
                        "company_name" => "Event Coordination System",
                        "primary_color" => "#16a34a",
                        "secondary_color" => "#059669"
                    ]
                ]);
            }
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Error fetching website settings: " . $e->getMessage()
            ]);
        }
    }

    public function updateWebsiteSettings($settings) {
        try {
            $sql = "UPDATE tbl_website_settings SET
                        company_name = ?,
                        company_logo = ?,
                        hero_image = ?,
                        primary_color = ?,
                        secondary_color = ?,
                        contact_email = ?,
                        contact_phone = ?,
                        address = ?,
                        about_text = ?,
                        social_facebook = ?,
                        social_instagram = ?,
                        social_twitter = ?,
                        require_otp_on_login = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE setting_id = (SELECT MAX(setting_id) FROM (SELECT setting_id FROM tbl_website_settings) as temp)";

            $stmt = $this->conn->prepare($sql);
            $result = $stmt->execute([
                $settings['company_name'],
                $settings['company_logo'],
                $settings['hero_image'],
                $settings['primary_color'],
                $settings['secondary_color'],
                $settings['contact_email'],
                $settings['contact_phone'],
                $settings['address'],
                $settings['about_text'],
                $settings['social_facebook'],
                $settings['social_instagram'],
                $settings['social_twitter'],
                (isset($settings['require_otp_on_login']) && ($settings['require_otp_on_login'] === 1 || $settings['require_otp_on_login'] === '1' || $settings['require_otp_on_login'] === true)) ? 1 : 0
            ]);

            if ($result) {
                return json_encode([
                    "status" => "success",
                    "message" => "Website settings updated successfully"
                ]);
            } else {
                return json_encode([
                    "status" => "error",
                    "message" => "Failed to update website settings"
                ]);
            }
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Error updating website settings: " . $e->getMessage()
            ]);
        }
    }

    public function getAllFeedbacks() {
        try {
            $sql = "SELECT
                        f.*,
                        CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as user_name,
                        u.user_firstName,
                        u.user_lastName,
                        u.user_email,
                        v.venue_title,
                        s.store_name
                    FROM tbl_feedback f
                    LEFT JOIN tbl_users u ON f.user_id = u.user_id
                    LEFT JOIN tbl_venue v ON f.venue_id = v.venue_id
                    LEFT JOIN tbl_store s ON f.store_id = s.store_id
                    ORDER BY f.created_at DESC";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $feedbacks = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "feedbacks" => $feedbacks
            ]);
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Error fetching feedbacks: " . $e->getMessage()
            ]);
        }
    }

    public function deleteFeedback($feedbackId) {
        try {
            $sql = "DELETE FROM tbl_feedback WHERE feedback_id = ?";
            $stmt = $this->conn->prepare($sql);
            $result = $stmt->execute([$feedbackId]);

            if ($result) {
                return json_encode([
                    "status" => "success",
                    "message" => "Feedback deleted successfully"
                ]);
            } else {
                return json_encode([
                    "status" => "error",
                    "message" => "Failed to delete feedback"
                ]);
            }
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Error deleting feedback: " . $e->getMessage()
            ]);
        }
    }

    public function uploadFile($file, $fileType) {
        try {
            $uploadDir = "uploads/";

            // Create directory based on file type
            switch ($fileType) {
                case 'profile':
                case 'profile_picture':
                    $uploadDir .= "profile_pictures/";
                    break;
                case 'company_logo':
                    $uploadDir .= "website/logos/";
                    break;
                case 'hero_image':
                    $uploadDir .= "website/hero/";
                    break;
                case 'event_attachment':
                    $uploadDir .= "event_attachments/";
                    break;
                case 'payment_proof':
                    $uploadDir .= "payment_proofs/";
                    break;
                case 'venue_profile_pictures':
                    $uploadDir .= "venue_profile_pictures/";
                    break;
                case 'venue_cover_photos':
                    $uploadDir .= "venue_cover_photos/";
                    break;
                case 'resume':
                    $uploadDir .= "resumes/";
                    break;
                case 'certification':
                    $uploadDir .= "certifications/";
                    break;
                default:
                    $uploadDir .= "misc/";
            }

            // Create directory if it doesn't exist
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            // Generate unique filename
            $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $fileName = time() . '_' . uniqid() . '.' . $fileExtension;
            $filePath = $uploadDir . $fileName;

            // Move uploaded file
            if (move_uploaded_file($file['tmp_name'], $filePath)) {
                return json_encode([
                    "status" => "success",
                    "filePath" => $filePath,
                    "message" => "File uploaded successfully"
                ]);
            } else {
                return json_encode([
                    "status" => "error",
                    "message" => "Failed to upload file"
                ]);
            }
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Error uploading file: " . $e->getMessage()
            ]);
        }
    }

    public function uploadProfilePicture($file, $userId) {
        try {
            $uploadDir = "uploads/profile_pictures/";

            // Create directory if it doesn't exist
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            // Validate file type
            $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            $fileType = $file['type'] ?? mime_content_type($file['tmp_name']);

            if (!in_array($fileType, $allowedTypes)) {
                return json_encode([
                    "status" => "error",
                    "message" => "Invalid file type. Only images are allowed."
                ]);
            }

            // Generate unique filename
            $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
            if (empty($fileExtension)) {
                $fileExtension = 'jpg'; // Default for blob uploads
            }
            $fileName = 'profile_' . $userId . '_' . time() . '.' . $fileExtension;
            $filePath = $uploadDir . $fileName;

            // Delete old profile picture if exists
            $getUserSql = "SELECT user_pfp FROM tbl_users WHERE user_id = ?";
            $getUserStmt = $this->conn->prepare($getUserSql);
            $getUserStmt->execute([$userId]);
            $userData = $getUserStmt->fetch(PDO::FETCH_ASSOC);

            if ($userData && $userData['user_pfp'] && file_exists($userData['user_pfp'])) {
                unlink($userData['user_pfp']);
            }

            // Move uploaded file
            if (move_uploaded_file($file['tmp_name'], $filePath)) {
                // Update user profile picture in database
                $updateSql = "UPDATE tbl_users SET user_pfp = ? WHERE user_id = ?";
                $updateStmt = $this->conn->prepare($updateSql);
                $updateStmt->execute([$filePath, $userId]);

                return json_encode([
                    "status" => "success",
                    "filePath" => $filePath,
                    "message" => "Profile picture uploaded successfully"
                ]);
            } else {
                return json_encode([
                    "status" => "error",
                    "message" => "Failed to upload file"
                ]);
            }
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Error uploading profile picture: " . $e->getMessage()
            ]);
        }
    }

    public function uploadVenueFile($file, $fileType) {
        try {
            // Validate file type for venues (images only)
            $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!in_array($file['type'], $allowedTypes)) {
                return json_encode([
                    "status" => "error",
                    "message" => "Invalid file type. Only images are allowed for venue uploads."
                ]);
            }

            // Validate file size (max 5MB for venue images)
            if ($file['size'] > 5 * 1024 * 1024) {
                return json_encode([
                    "status" => "error",
                    "message" => "File too large. Maximum 5MB allowed for venue images."
                ]);
            }

            $uploadDir = "uploads/" . $fileType . "/";

            // Create directory if it doesn't exist
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            // Generate unique filename with timestamp
            $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $fileName = time() . '_' . uniqid() . '.' . $fileExtension;
            $filePath = $uploadDir . $fileName;

            // Move uploaded file
            if (move_uploaded_file($file['tmp_name'], $filePath)) {
                return json_encode([
                    "status" => "success",
                    "filePath" => $filePath,
                    "fileName" => $fileName,
                    "message" => "Venue file uploaded successfully"
                ]);
            } else {
                return json_encode([
                    "status" => "error",
                    "message" => "Failed to upload venue file"
                ]);
            }
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Error uploading venue file: " . $e->getMessage()
            ]);
        }
    }

    public function uploadPaymentProof($eventId, $file, $description, $proofType) {
        try {
            if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
                return json_encode(["status" => "error", "message" => "File upload error"]);
            }

            // Validate file size (max 10MB)
            if ($file['size'] > 10 * 1024 * 1024) {
                return json_encode(["status" => "error", "message" => "File too large. Maximum 10MB allowed."]);
            }

            // Validate file type (expanded to support more document types)
            $allowedTypes = [
                // Images
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
                // Documents
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                // Text files
                'text/plain', 'text/csv',
                // Other common formats
                'application/zip', 'application/x-zip-compressed'
            ];
            if (!in_array($file['type'], $allowedTypes)) {
                return json_encode(["status" => "error", "message" => "Invalid file type. Allowed: Images, PDF, Word, Excel, PowerPoint, Text, and ZIP files."]);
            }

            // Create payment proofs directory
            $uploadDir = "uploads/payment_proofs/";
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            // Generate unique filename
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = "payment_proof_{$eventId}_" . time() . '_' . uniqid() . '.' . $extension;
            $targetPath = $uploadDir . $filename;

            // Move the uploaded file
            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                // Create new attachment object
                $newAttachment = [
                    'file_name' => $filename,
                    'original_name' => $file['name'],
                    'file_path' => $targetPath,
                    'file_size' => $file['size'],
                    'file_type' => $file['type'],
                    'description' => $description,
                    'proof_type' => $proofType, // receipt, screenshot, bank_slip, other
                    'uploaded_at' => date('Y-m-d H:i:s'),
                ];

                return json_encode([
                    "status" => "success",
                    "message" => "Payment proof uploaded successfully",
                    "attachment" => $newAttachment
                ]);
            } else {
                return json_encode(["status" => "error", "message" => "Failed to move uploaded file"]);
            }

        } catch (Exception $e) {
            error_log("uploadPaymentProof error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Upload error: " . $e->getMessage()]);
        }
    }

    public function getPaymentProofs($eventId) {
        try {
            // Get payment proofs from the new table structure
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
                        p.payment_date,
                        p.payment_reference,
                        p.payment_status
                    FROM tbl_payments p
                    WHERE p.event_id = ?
                    ORDER BY p.payment_date DESC, pa.display_order ASC";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$eventId]);
            $allProofs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "payment_proofs" => $allProofs
            ]);

        } catch (Exception $e) {
            error_log("getPaymentProofs error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Error retrieving payment proofs: " . $e->getMessage()]);
        }
    }

    public function deletePaymentProof($paymentId, $fileName) {
        return json_encode(["status" => "error", "message" => "Payment attachments feature is disabled" ]);
    }

    // Wedding Details Methods
    public function saveWeddingDetails($data) {
        try {
            $this->conn->beginTransaction();

            // Map form field names to database column names
            $mappedData = [
                'event_id' => $data['event_id'],
                'nuptial' => $data['nuptial'] ?? null,
                'motif' => $data['motif'] ?? null,
                'wedding_time' => $data['wedding_time'] ?? null,
                'church' => $data['church'] ?? null,
                'address' => $data['address'] ?? null,

                // Bride & Groom (form now uses correct field names)
                'bride_name' => $data['bride_name'] ?? null,
                'bride_size' => $data['bride_size'] ?? null,
                'groom_name' => $data['groom_name'] ?? null,
                'groom_size' => $data['groom_size'] ?? null,

                // Parents (form now uses correct field names)
                'mother_bride_name' => $data['mother_bride_name'] ?? null,
                'mother_bride_size' => $data['mother_bride_size'] ?? null,
                'father_bride_name' => $data['father_bride_name'] ?? null,
                'father_bride_size' => $data['father_bride_size'] ?? null,
                'mother_groom_name' => $data['mother_groom_name'] ?? null,
                'mother_groom_size' => $data['mother_groom_size'] ?? null,
                'father_groom_name' => $data['father_groom_name'] ?? null,
                'father_groom_size' => $data['father_groom_size'] ?? null,

                // Principal Sponsors
                'maid_of_honor_name' => $data['maid_of_honor_name'] ?? null,
                'maid_of_honor_size' => $data['maid_of_honor_size'] ?? null,
                'best_man_name' => $data['best_man_name'] ?? null,
                'best_man_size' => $data['best_man_size'] ?? null,

                // Little Bride & Groom
                'little_bride_name' => $data['little_bride_name'] ?? null,
                'little_bride_size' => $data['little_bride_size'] ?? null,
                'little_groom_name' => $data['little_groom_name'] ?? null,
                'little_groom_size' => $data['little_groom_size'] ?? null,

                // Processing Info
                'prepared_by' => $data['prepared_by'] ?? null,
                'received_by' => $data['received_by'] ?? null,
                'pickup_date' => $data['pickup_date'] ?? null,
                'return_date' => $data['return_date'] ?? null,
                'customer_signature' => $data['customer_signature'] ?? null
            ];

            // Process wedding party arrays (form now sends quantities and names directly)
            $weddingParties = [
                'bridesmaids' => ['bridesmaids_qty', 'bridesmaids_names'],
                'groomsmen' => ['groomsmen_qty', 'groomsmen_names'],
                'junior_groomsmen' => ['junior_groomsmen_qty', 'junior_groomsmen_names'],
                'flower_girls' => ['flower_girls_qty', 'flower_girls_names'],
                'ring_bearer' => ['ring_bearer_qty', 'ring_bearer_names'],
                'bible_bearer' => ['bible_bearer_qty', 'bible_bearer_names'],
                'coin_bearer' => ['coin_bearer_qty', 'coin_bearer_names']
            ];

            foreach ($weddingParties as $party => $fields) {
                $qtyField = $fields[0];
                $namesField = $fields[1];

                // Get quantity and names from form data
                $mappedData[$qtyField] = $data[$qtyField] ?? 0;
                $names = $data[$namesField] ?? [];

                // Ensure names is an array and encode as JSON
                if (!is_array($names)) {
                    $names = [];
                }
                $mappedData[$namesField] = json_encode($names);
            }

            // Process wedding items quantities (form now uses correct field names)
            $itemFields = [
                'cushions_qty', 'headdress_qty', 'shawls_qty', 'veil_cord_qty',
                'basket_qty', 'petticoat_qty', 'neck_bowtie_qty', 'garter_leg_qty',
                'fitting_form_qty', 'robe_qty'
            ];

            foreach ($itemFields as $field) {
                $mappedData[$field] = $data[$field] ?? 0;
            }

            // Check if wedding details already exist for this event
            $checkSql = "SELECT id FROM tbl_wedding_details WHERE event_id = ?";
            $checkStmt = $this->conn->prepare($checkSql);
            $checkStmt->execute([$mappedData['event_id']]);
            $existingRecord = $checkStmt->fetch(PDO::FETCH_ASSOC);

            // Debug: Log the mapped data to see what we're working with
            error_log("Mapped data keys: " . implode(', ', array_keys($mappedData)));
            error_log("Mapped data count: " . count($mappedData));

            // Try to get table structure for debugging
            try {
                $describeSql = "DESCRIBE tbl_wedding_details";
                $describeStmt = $this->conn->prepare($describeSql);
                $describeStmt->execute();
                $columns = $describeStmt->fetchAll(PDO::FETCH_ASSOC);
                error_log("Table columns: " . json_encode($columns));
            } catch (Exception $e) {
                error_log("Error describing table: " . $e->getMessage());
            }

            // Use a more robust approach with dynamic SQL generation
            if ($existingRecord) {
                // Update existing record
                $updateFields = [];
                $updateValues = [];

                // Build dynamic UPDATE statement
                foreach ($mappedData as $field => $value) {
                    if ($field !== 'event_id') { // Skip event_id for UPDATE
                        $updateFields[] = "$field = ?";
                        $updateValues[] = $value;
                    }
                }

                $updateValues[] = $mappedData['event_id']; // Add event_id for WHERE clause

                $sql = "UPDATE tbl_wedding_details SET " . implode(', ', $updateFields) . ", updated_at = CURRENT_TIMESTAMP WHERE event_id = ?";

                $stmt = $this->conn->prepare($sql);
                $stmt->execute($updateValues);
            } else {
                // Insert new record using dynamic INSERT
                $insertFields = array_keys($mappedData);
                $placeholders = str_repeat('?,', count($insertFields) - 1) . '?';

                $sql = "INSERT INTO tbl_wedding_details (" . implode(', ', $insertFields) . ") VALUES ($placeholders)";

                $stmt = $this->conn->prepare($sql);
                $stmt->execute(array_values($mappedData));
            }

            $this->conn->commit();

            return json_encode([
                "status" => "success",
                "message" => "Wedding details saved successfully",
                "debug" => [
                    "mapped_data" => $mappedData,
                    "original_data" => $data,
                    "sql" => $sql,
                    "values_count" => count($mappedData)
                ]
            ]);
        } catch (Exception $e) {
            $this->conn->rollback();
            error_log("saveWeddingDetails error: " . $e->getMessage());
            error_log("Wedding data received: " . json_encode($data));
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function getWeddingDetails($eventId) {
        try {
            $sql = "SELECT * FROM tbl_wedding_details WHERE event_id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$eventId]);
            $weddingDetails = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($weddingDetails) {
                // Map database column names to form field names (form now uses correct field names)
                $formData = [
                    'nuptial' => $weddingDetails['nuptial'],
                    'motif' => $weddingDetails['motif'],
                    'wedding_time' => $weddingDetails['wedding_time'],
                    'church' => $weddingDetails['church'],
                    'address' => $weddingDetails['address'],

                    // Bride & Groom
                    'bride_name' => $weddingDetails['bride_name'],
                    'bride_size' => $weddingDetails['bride_size'],
                    'groom_name' => $weddingDetails['groom_name'],
                    'groom_size' => $weddingDetails['groom_size'],

                    // Parents
                    'mother_bride_name' => $weddingDetails['mother_bride_name'],
                    'mother_bride_size' => $weddingDetails['mother_bride_size'],
                    'father_bride_name' => $weddingDetails['father_bride_name'],
                    'father_bride_size' => $weddingDetails['father_bride_size'],
                    'mother_groom_name' => $weddingDetails['mother_groom_name'],
                    'mother_groom_size' => $weddingDetails['mother_groom_size'],
                    'father_groom_name' => $weddingDetails['father_groom_name'],
                    'father_groom_size' => $weddingDetails['father_groom_size'],

                    // Principal Sponsors
                    'maid_of_honor_name' => $weddingDetails['maid_of_honor_name'],
                    'maid_of_honor_size' => $weddingDetails['maid_of_honor_size'],
                    'best_man_name' => $weddingDetails['best_man_name'],
                    'best_man_size' => $weddingDetails['best_man_size'],

                    // Little Bride & Groom
                    'little_bride_name' => $weddingDetails['little_bride_name'],
                    'little_bride_size' => $weddingDetails['little_bride_size'],
                    'little_groom_name' => $weddingDetails['little_groom_name'],
                    'little_groom_size' => $weddingDetails['little_groom_size'],

                    // Processing Info
                    'prepared_by' => $weddingDetails['prepared_by'],
                    'received_by' => $weddingDetails['received_by'],
                    'pickup_date' => $weddingDetails['pickup_date'],
                    'return_date' => $weddingDetails['return_date'],
                    'customer_signature' => $weddingDetails['customer_signature'],

                    // Wedding Items
                    'cushions_qty' => $weddingDetails['cushions_qty'] ?? 0,
                    'headdress_qty' => $weddingDetails['headdress_qty'] ?? 0,
                    'shawls_qty' => $weddingDetails['shawls_qty'] ?? 0,
                    'veil_cord_qty' => $weddingDetails['veil_cord_qty'] ?? 0,
                    'basket_qty' => $weddingDetails['basket_qty'] ?? 0,
                    'petticoat_qty' => $weddingDetails['petticoat_qty'] ?? 0,
                    'neck_bowtie_qty' => $weddingDetails['neck_bowtie_qty'] ?? 0,
                    'garter_leg_qty' => $weddingDetails['garter_leg_qty'] ?? 0,
                    'fitting_form_qty' => $weddingDetails['fitting_form_qty'] ?? 0,
                    'robe_qty' => $weddingDetails['robe_qty'] ?? 0,

                    // Wedding Party Quantities and Names
                    'bridesmaids_qty' => $weddingDetails['bridesmaids_qty'] ?? 0,
                    'bridesmaids_names' => json_decode($weddingDetails['bridesmaids_names'] ?? '[]', true),
                    'groomsmen_qty' => $weddingDetails['groomsmen_qty'] ?? 0,
                    'groomsmen_names' => json_decode($weddingDetails['groomsmen_names'] ?? '[]', true),
                    'junior_groomsmen_qty' => $weddingDetails['junior_groomsmen_qty'] ?? 0,
                    'junior_groomsmen_names' => json_decode($weddingDetails['junior_groomsmen_names'] ?? '[]', true),
                    'flower_girls_qty' => $weddingDetails['flower_girls_qty'] ?? 0,
                    'flower_girls_names' => json_decode($weddingDetails['flower_girls_names'] ?? '[]', true),
                    'ring_bearer_qty' => $weddingDetails['ring_bearer_qty'] ?? 0,
                    'ring_bearer_names' => json_decode($weddingDetails['ring_bearer_names'] ?? '[]', true),
                    'bible_bearer_qty' => $weddingDetails['bible_bearer_qty'] ?? 0,
                    'bible_bearer_names' => json_decode($weddingDetails['bible_bearer_names'] ?? '[]', true),
                    'coin_bearer_qty' => $weddingDetails['coin_bearer_qty'] ?? 0,
                    'coin_bearer_names' => json_decode($weddingDetails['coin_bearer_names'] ?? '[]', true)
                ];

                return json_encode([
                    "status" => "success",
                    "wedding_details" => $formData
                ]);
            } else {
                return json_encode([
                    "status" => "success",
                    "wedding_details" => null
                ]);
            }
        } catch (Exception $e) {
            error_log("getWeddingDetails error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    // Migration Methods
    public function describeWeddingTable() {
        try {
            $sql = "DESCRIBE tbl_wedding_details";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "columns" => $columns,
                "column_count" => count($columns)
            ]);
        } catch (Exception $e) {
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function testWeddingInsert() {
        try {
            // Test with minimal data
            $sql = "INSERT INTO tbl_wedding_details (event_id, nuptial, motif) VALUES (?, ?, ?)";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([999, "Test Nuptial", "Test Motif"]);

            return json_encode([
                "status" => "success",
                "message" => "Test insert successful"
            ]);
        } catch (Exception $e) {
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function runWeddingMigration() {
        try {
            $this->conn->beginTransaction();

            // Drop existing table if it exists to avoid conflicts
            $dropSql = "DROP TABLE IF EXISTS `tbl_wedding_details`";
            $this->conn->exec($dropSql);

            // Create the enhanced wedding details table
            $createSql = "CREATE TABLE `tbl_wedding_details` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `event_id` int(11) NOT NULL,

                -- Basic Information
                `nuptial` varchar(255) DEFAULT NULL,
                `motif` varchar(255) DEFAULT NULL,

                -- Bride & Groom Details
                `bride_name` varchar(255) DEFAULT NULL,
                `bride_size` varchar(50) DEFAULT NULL,
                `groom_name` varchar(255) DEFAULT NULL,
                `groom_size` varchar(50) DEFAULT NULL,

                -- Parents Details
                `mother_bride_name` varchar(255) DEFAULT NULL,
                `mother_bride_size` varchar(50) DEFAULT NULL,
                `father_bride_name` varchar(255) DEFAULT NULL,
                `father_bride_size` varchar(50) DEFAULT NULL,
                `mother_groom_name` varchar(255) DEFAULT NULL,
                `mother_groom_size` varchar(50) DEFAULT NULL,
                `father_groom_name` varchar(255) DEFAULT NULL,
                `father_groom_size` varchar(50) DEFAULT NULL,

                -- Principal Sponsors
                `maid_of_honor_name` varchar(255) DEFAULT NULL,
                `maid_of_honor_size` varchar(50) DEFAULT NULL,
                `best_man_name` varchar(255) DEFAULT NULL,
                `best_man_size` varchar(50) DEFAULT NULL,

                -- Little Bride & Groom
                `little_bride_name` varchar(255) DEFAULT NULL,
                `little_bride_size` varchar(50) DEFAULT NULL,
                `little_groom_name` varchar(255) DEFAULT NULL,
                `little_groom_size` varchar(50) DEFAULT NULL,

                -- Wedding Party Quantities
                `bridesmaids_qty` int(11) DEFAULT 0,
                `groomsmen_qty` int(11) DEFAULT 0,
                `junior_groomsmen_qty` int(11) DEFAULT 0,
                `flower_girls_qty` int(11) DEFAULT 0,
                `ring_bearer_qty` int(11) DEFAULT 0,
                `bible_bearer_qty` int(11) DEFAULT 0,
                `coin_bearer_qty` int(11) DEFAULT 0,

                -- Wedding Party Names (stored as JSON arrays)
                `bridesmaids_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`bridesmaids_names`)),
                `groomsmen_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`groomsmen_names`)),
                `junior_groomsmen_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`junior_groomsmen_names`)),
                `flower_girls_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`flower_girls_names`)),
                `ring_bearer_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ring_bearer_names`)),
                `bible_bearer_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`bible_bearer_names`)),
                `coin_bearer_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`coin_bearer_names`)),

                -- Wedding Items Quantities
                `cushions_qty` int(11) DEFAULT 0,
                `headdress_qty` int(11) DEFAULT 0,
                `shawls_qty` int(11) DEFAULT 0,
                `veil_cord_qty` int(11) DEFAULT 0,
                `basket_qty` int(11) DEFAULT 0,
                `petticoat_qty` int(11) DEFAULT 0,
                `neck_bowtie_qty` int(11) DEFAULT 0,
                `garter_leg_qty` int(11) DEFAULT 0,
                `fitting_form_qty` int(11) DEFAULT 0,
                `robe_qty` int(11) DEFAULT 0,

                -- Processing Information
                `prepared_by` varchar(255) DEFAULT NULL,
                `received_by` varchar(255) DEFAULT NULL,
                `pickup_date` date DEFAULT NULL,
                `return_date` date DEFAULT NULL,
                `customer_signature` varchar(255) DEFAULT NULL,

                -- Metadata
                `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
                `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),

                PRIMARY KEY (`id`),
                UNIQUE KEY `unique_event_wedding` (`event_id`),
                KEY `idx_wedding_event_id` (`event_id`),
                KEY `idx_wedding_bride_groom` (`bride_name`, `groom_name`),
                CONSTRAINT `fk_wedding_details_event` FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";

            $this->conn->exec($createSql);
            $this->conn->commit();

            return json_encode([
                "status" => "success",
                "message" => "Wedding details table created successfully with enhanced structure"
            ]);
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollback();
            }
            error_log("runWeddingMigration error: " . $e->getMessage());
            return json_encode([
                "status" => "error",
                "message" => "Migration failed: " . $e->getMessage()
            ]);
        }
    }

    // Analytics and Reports Methods
    public function getAnalyticsData($adminId, $startDate = null, $endDate = null) {
        try {
            if (!$startDate) $startDate = date('Y-m-01'); // First day of current month
            if (!$endDate) $endDate = date('Y-m-t'); // Last day of current month

            $analytics = [];

            // Monthly revenue trend (last 12 months)
            $monthlyRevenueSql = "SELECT
                                    DATE_FORMAT(p.payment_date, '%Y-%m') as month,
                                    SUM(p.payment_amount) as revenue,
                                    COUNT(DISTINCT p.event_id) as events_with_payments
                                FROM tbl_payments p
                                JOIN tbl_events e ON p.event_id = e.event_id
                                WHERE e.admin_id = ?
                                AND p.payment_status = 'completed'
                                AND p.payment_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                                GROUP BY DATE_FORMAT(p.payment_date, '%Y-%m')
                                ORDER BY month DESC";
            $stmt = $this->conn->prepare($monthlyRevenueSql);
            $stmt->execute([$adminId]);
            $analytics['monthlyRevenue'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Event types distribution
            $eventTypesSql = "SELECT
                                et.event_name,
                                COUNT(e.event_id) as count,
                                COALESCE(SUM(e.total_budget), 0) as total_budget
                            FROM tbl_events e
                            JOIN tbl_event_type et ON e.event_type_id = et.event_type_id
                            WHERE e.admin_id = ?
                            GROUP BY et.event_type_id, et.event_name
                            ORDER BY count DESC";
            $stmt = $this->conn->prepare($eventTypesSql);
            $stmt->execute([$adminId]);
            $analytics['eventTypes'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Payment status breakdown
            $paymentStatusSql = "SELECT
                                   e.payment_status,
                                   COUNT(e.event_id) as count,
                                   COALESCE(SUM(e.total_budget), 0) as total_amount
                               FROM tbl_events e
                               WHERE e.admin_id = ?
                               GROUP BY e.payment_status
                               ORDER BY count DESC";
            $stmt = $this->conn->prepare($paymentStatusSql);
            $stmt->execute([$adminId]);
            $analytics['paymentStatus'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Top venues by usage
            $topVenuesSql = "SELECT
                               v.venue_title,
                               COUNT(e.event_id) as events_count,
                               COALESCE(SUM(e.total_budget), 0) as total_revenue
                           FROM tbl_events e
                           JOIN tbl_venue v ON e.venue_id = v.venue_id
                           WHERE e.admin_id = ?
                           GROUP BY v.venue_id, v.venue_title
                           ORDER BY events_count DESC
                           LIMIT 10";
            $stmt = $this->conn->prepare($topVenuesSql);
            $stmt->execute([$adminId]);
            $analytics['topVenues'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Top packages by usage
            $topPackagesSql = "SELECT
                                 p.package_title,
                                 COUNT(e.event_id) as events_count,
                                 COALESCE(SUM(e.total_budget), 0) as total_revenue
                             FROM tbl_events e
                             JOIN tbl_packages p ON e.package_id = p.package_id
                             WHERE e.admin_id = ?
                             GROUP BY p.package_id, p.package_title
                             ORDER BY events_count DESC
                             LIMIT 10";
            $stmt = $this->conn->prepare($topPackagesSql);
            $stmt->execute([$adminId]);
            $analytics['topPackages'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Client statistics
            $clientStatsSql = "SELECT
                                 CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as client_name,
                                 COUNT(e.event_id) as events_count,
                                 COALESCE(SUM(e.total_budget), 0) as total_spent,
                                 MAX(e.created_at) as last_event_date
                             FROM tbl_events e
                             JOIN tbl_users u ON e.user_id = u.user_id
                             WHERE e.admin_id = ?
                             GROUP BY e.user_id, u.user_firstName, u.user_lastName
                             ORDER BY total_spent DESC
                             LIMIT 10";
            $stmt = $this->conn->prepare($clientStatsSql);
            $stmt->execute([$adminId]);
            $analytics['topClients'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Payment method distribution
            $paymentMethodsSql = "SELECT
                                    p.payment_method,
                                    COUNT(p.payment_id) as count,
                                    COALESCE(SUM(p.payment_amount), 0) as total_amount
                                FROM tbl_payments p
                                JOIN tbl_events e ON p.event_id = e.event_id
                                WHERE e.admin_id = ? AND p.payment_status = 'completed'
                                GROUP BY p.payment_method
                                ORDER BY total_amount DESC";
            $stmt = $this->conn->prepare($paymentMethodsSql);
            $stmt->execute([$adminId]);
            $analytics['paymentMethods'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "analytics" => $analytics
            ]);
        } catch (Exception $e) {
            error_log("getAnalyticsData error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function getReportsData($adminId, $reportType = 'summary', $startDate = null, $endDate = null) {
        try {
            if (!$startDate) $startDate = date('Y-m-01');
            if (!$endDate) $endDate = date('Y-m-t');

            $reports = [];

            switch ($reportType) {
                case 'summary':
                    // Overall summary report
                    $summarySql = "SELECT
                                     COUNT(e.event_id) as total_events,
                                     COUNT(CASE WHEN e.event_status = 'completed' THEN 1 END) as completed_events,
                                     COUNT(CASE WHEN e.event_status = 'cancelled' THEN 1 END) as cancelled_events,
                                     COUNT(DISTINCT e.user_id) as unique_clients,
                                     COALESCE(SUM(e.total_budget), 0) as total_contract_value,
                                     COALESCE(SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END), 0) as total_revenue_collected,
                                     AVG(e.total_budget) as average_event_value
                                 FROM tbl_events e
                                 LEFT JOIN tbl_payments p ON e.event_id = p.event_id
                                 WHERE e.admin_id = ?
                                 AND e.created_at BETWEEN ? AND ?";
                    $stmt = $this->conn->prepare($summarySql);
                    $stmt->execute([$adminId, $startDate, $endDate]);
                    $reports['summary'] = $stmt->fetch(PDO::FETCH_ASSOC);
                    break;

                case 'financial':
                    // Financial detailed report
                    $financialSql = "SELECT
                                       e.event_id,
                                       e.event_title,
                                       e.event_date,
                                       CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as client_name,
                                       e.total_budget,
                                       e.down_payment,
                                       e.payment_status,
                                       COALESCE(SUM(p.payment_amount), 0) as total_paid,
                                       (e.total_budget - COALESCE(SUM(p.payment_amount), 0)) as remaining_balance
                                   FROM tbl_events e
                                   JOIN tbl_users u ON e.user_id = u.user_id
                                   LEFT JOIN tbl_payments p ON e.event_id = p.event_id AND p.payment_status = 'completed'
                                   WHERE e.admin_id = ?
                                   AND e.created_at BETWEEN ? AND ?
                                   GROUP BY e.event_id
                                   ORDER BY e.event_date DESC";
                    $stmt = $this->conn->prepare($financialSql);
                    $stmt->execute([$adminId, $startDate, $endDate]);
                    $reports['financial'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    break;

                case 'events':
                    // Events detailed report
                    $eventsSql = "SELECT
                                    e.event_id,
                                    e.event_title,
                                    e.event_date,
                                    et.event_name as event_type,
                                    CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as client_name,
                                    v.venue_title,
                                    p.package_title,
                                    e.guest_count,
                                    e.total_budget,
                                    e.event_status,
                                    e.payment_status,
                                    e.created_at
                                FROM tbl_events e
                                JOIN tbl_users u ON e.user_id = u.user_id
                                JOIN tbl_event_type et ON e.event_type_id = et.event_type_id
                                LEFT JOIN tbl_venue v ON e.venue_id = v.venue_id
                                LEFT JOIN tbl_packages p ON e.package_id = p.package_id
                                WHERE e.admin_id = ?
                                AND e.created_at BETWEEN ? AND ?
                                ORDER BY e.event_date DESC";
                    $stmt = $this->conn->prepare($eventsSql);
                    $stmt->execute([$adminId, $startDate, $endDate]);
                    $reports['events'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    break;

                case 'clients':
                    // Clients detailed report
                    $clientsSql = "SELECT
                                     u.user_id,
                                     CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as client_name,
                                     u.user_email,
                                     u.user_contact,
                                     COUNT(e.event_id) as total_events,
                                     COALESCE(SUM(e.total_budget), 0) as total_contract_value,
                                     COALESCE(SUM(p.payment_amount), 0) as total_payments,
                                     MIN(e.created_at) as first_event_date,
                                     MAX(e.created_at) as last_event_date
                                 FROM tbl_users u
                                 JOIN tbl_events e ON u.user_id = e.user_id
                                 LEFT JOIN tbl_payments p ON e.event_id = p.event_id AND p.payment_status = 'completed'
                                 WHERE e.admin_id = ?
                                 AND e.created_at BETWEEN ? AND ?
                                 GROUP BY u.user_id
                                 ORDER BY total_contract_value DESC";
                    $stmt = $this->conn->prepare($clientsSql);
                    $stmt->execute([$adminId, $startDate, $endDate]);
                    $reports['clients'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    break;
            }

            return json_encode([
                "status" => "success",
                "reports" => $reports,
                "reportType" => $reportType,
                "dateRange" => [
                    "startDate" => $startDate,
                    "endDate" => $endDate
                ]
            ]);
        } catch (Exception $e) {
            error_log("getReportsData error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    // New method to associate payment proof with a specific payment
    public function attachPaymentProof($paymentId, $file, $description, $proofType) {
        try {
            if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
                return json_encode(["status" => "error", "message" => "File upload error"]);
            }

            // Validate file size (max 10MB)
            if ($file['size'] > 10 * 1024 * 1024) {
                return json_encode(["status" => "error", "message" => "File too large. Maximum 10MB allowed."]);
            }

            // Validate file type (expanded to support more document types)
            $allowedTypes = [
                // Images
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
                // Documents
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                // Text files
                'text/plain', 'text/csv',
                // Other common formats
                'application/zip', 'application/x-zip-compressed'
            ];
            if (!in_array($file['type'], $allowedTypes)) {
                return json_encode(["status" => "error", "message" => "Invalid file type. Allowed: Images, PDF, Word, Excel, PowerPoint, Text, and ZIP files."]);
            }

            // Check if payment exists
            $checkSql = "SELECT payment_id, event_id FROM tbl_payments WHERE payment_id = ?";
            $checkStmt = $this->conn->prepare($checkSql);
            $checkStmt->execute([$paymentId]);
            $payment = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$payment) {
                return json_encode(["status" => "error", "message" => "Payment not found"]);
            }

            // Create payment proofs directory
            $uploadDir = "uploads/payment_proofs/";
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            // Generate unique filename
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = "payment_proof_p{$paymentId}_" . time() . '_' . uniqid() . '.' . $extension;
            $targetPath = $uploadDir . $filename;

            // Move the uploaded file
            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                // Insert attachment into the new table structure
                $insertAttachmentSql = "INSERT INTO tbl_payment_attachments (
                    payment_id, file_name, file_path, file_type, file_size,
                    description, display_order, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

                // Get current attachment count for display order
                $countSql = "SELECT COUNT(*) FROM tbl_payment_attachments WHERE payment_id = ?";
                $countStmt = $this->conn->prepare($countSql);
                $countStmt->execute([$paymentId]);
                $attachmentCount = $countStmt->fetchColumn();

                $attachmentStmt = $this->conn->prepare($insertAttachmentSql);
                $result = $attachmentStmt->execute([
                    $paymentId,
                    $filename,
                    $targetPath,
                    $file['type'],
                    $file['size'],
                    $description,
                    $attachmentCount + 1,
                    date('Y-m-d H:i:s')
                ]);

                if ($result) {
                    $attachmentId = $this->conn->lastInsertId();

                    $newAttachment = [
                        'attachment_id' => $attachmentId,
                        'file_name' => $filename,
                        'original_name' => $file['name'],
                        'file_path' => $targetPath,
                        'file_size' => $file['size'],
                        'file_type' => $file['type'],
                        'description' => $description,
                        'display_order' => $attachmentCount + 1,
                        'created_at' => date('Y-m-d H:i:s')
                    ];

                    return json_encode([
                        "status" => "success",
                        "message" => "Payment proof attached successfully",
                        "attachment" => $newAttachment
                    ]);
                } else {
                    return json_encode(["status" => "error", "message" => "Failed to save attachment to database"]);
                }
            } else {
                return json_encode(["status" => "error", "message" => "Failed to move uploaded file"]);
            }

        } catch (Exception $e) {
            error_log("attachPaymentProof error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Attachment error: " . $e->getMessage()]);
        }
    }

        public function getEventsForPayments($adminId, $searchTerm = '') {
        try {
            $sql = "
                SELECT
                    e.event_id,
                    e.event_title,
                    e.event_date,
                    e.user_id as client_id,
                    e.total_budget,
                    e.payment_status as event_payment_status,
                    CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as client_name,
                    u.user_email as client_email,
                    u.user_contact as client_contact,
                    COALESCE(SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END), 0) as total_paid,
                    (e.total_budget - COALESCE(SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END), 0)) as remaining_balance,
                    CASE
                        WHEN e.total_budget > 0 THEN ROUND((COALESCE(SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END), 0) / e.total_budget) * 100, 2)
                        ELSE 0
                    END as payment_percentage,
                    COUNT(CASE WHEN p.payment_status != 'cancelled' THEN p.payment_id END) as payment_count
                FROM tbl_events e
                LEFT JOIN tbl_users u ON e.user_id = u.user_id
                LEFT JOIN tbl_payments p ON e.event_id = p.event_id AND p.payment_status != 'cancelled'
                WHERE e.admin_id = ?
            ";

            $params = [$adminId];

            if (!empty($searchTerm)) {
                $sql .= " AND (
                    e.event_title LIKE ? OR
                    e.event_id LIKE ? OR
                    CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) LIKE ? OR
                    u.user_email LIKE ?
                )";
                $searchParam = '%' . $searchTerm . '%';
                $params = array_merge($params, [$searchParam, $searchParam, $searchParam, $searchParam]);
            }

            $sql .= " GROUP BY e.event_id ORDER BY e.event_date DESC, e.event_title ASC";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "events" => $events
            ]);

        } catch (Exception $e) {
            error_log("getEventsForPayments error: " . $e->getMessage());
            return json_encode([
                "status" => "error",
                "message" => "Failed to fetch events: " . $e->getMessage()
            ]);
        }
    }

    public function getEventPaymentDetails($eventId) {
        try {
            // Get event details with payment summary - EXCLUDE CANCELLED PAYMENTS
            $eventQuery = "
                SELECT
                    e.event_id,
                    e.event_title,
                    e.event_date,
                    e.event_time,
                    e.user_id as client_id,
                    e.total_budget,
                    e.payment_status as event_payment_status,
                    CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as client_name,
                    u.user_email as client_email,
                    u.user_contact as client_contact,
                    COALESCE(SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END), 0) as total_paid,
                    (e.total_budget - COALESCE(SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END), 0)) as remaining_balance,
                    CASE
                        WHEN e.total_budget > 0 THEN ROUND((COALESCE(SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END), 0) / e.total_budget) * 100, 2)
                        ELSE 0
                    END as payment_percentage,
                    COUNT(CASE WHEN p.payment_status != 'cancelled' THEN 1 END) as total_payments,
                    COUNT(CASE WHEN p.payment_status = 'completed' THEN 1 END) as completed_payments,
                    COUNT(CASE WHEN p.payment_status = 'pending' THEN 1 END) as pending_payments
                FROM tbl_events e
                LEFT JOIN tbl_users u ON e.user_id = u.user_id
                LEFT JOIN tbl_payments p ON e.event_id = p.event_id
                WHERE e.event_id = ?
                GROUP BY e.event_id
            ";

            $stmt = $this->pdo->prepare($eventQuery);
            $stmt->execute([$eventId]);
            $eventDetails = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$eventDetails) {
                return json_encode([
                    "status" => "error",
                    "message" => "Event not found"
                ]);
            }

            // Get payment history for this event (exclude cancelled payments)
            $paymentsQuery = "
                SELECT
                    p.payment_id,
                    p.payment_amount,
                    p.payment_method,
                    p.payment_status,
                    p.payment_date,
                    p.payment_reference,
                    p.payment_notes,
                    p.payment_percentage,
                    p.created_at,
                    p.updated_at,
                    CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as client_name,
                    DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_at,
                    DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i:%s') as formatted_updated_at
                FROM tbl_payments p
                LEFT JOIN tbl_users u ON p.client_id = u.user_id
                WHERE p.event_id = ? AND p.payment_status != 'cancelled'
                ORDER BY p.created_at DESC, p.payment_date DESC
            ";

            $stmt = $this->pdo->prepare($paymentsQuery);
            $stmt->execute([$eventId]);
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Payment attachments are now in separate table tbl_payment_attachments
            // No JSON parsing needed

            // Get payment summary by method (exclude cancelled payments)
            $paymentSummaryQuery = "
                SELECT
                    p.payment_method,
                    COUNT(*) as payment_count,
                    SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) as total_amount
                FROM tbl_payments p
                WHERE p.event_id = ? AND p.payment_status != 'cancelled'
                GROUP BY p.payment_method
                ORDER BY total_amount DESC
            ";

            $stmt = $this->pdo->prepare($paymentSummaryQuery);
            $stmt->execute([$eventId]);
            $paymentSummary = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "event" => $eventDetails,
                "payments" => $payments,
                "payment_summary" => $paymentSummary
            ]);

        } catch (Exception $e) {
            error_log("getEventPaymentDetails error: " . $e->getMessage());
            return json_encode([
                "status" => "error",
                "message" => "Failed to fetch event payment details: " . $e->getMessage()
            ]);
        }
    }

    public function uploadPaymentAttachment($eventId, $paymentId, $file, $description = '') {
        try {
            $uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/events-api/uploads/payment_proof/';

            // Create directory if it doesn't exist
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            // Generate unique filename
            $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];

            if (!in_array($fileExtension, $allowedExtensions)) {
                return json_encode([
                    "status" => "error",
                    "message" => "Invalid file type. Allowed: " . implode(', ', $allowedExtensions)
                ]);
            }

            $fileName = time() . '_' . uniqid() . '.' . $fileExtension;
            $filePath = $uploadDir . $fileName;

            if (move_uploaded_file($file['tmp_name'], $filePath)) {
                // Insert attachment into tbl_payment_attachments (normalized table)
                $insertSql = "INSERT INTO tbl_payment_attachments (
                    payment_id, file_name, file_path, file_type, file_size,
                    description, display_order, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

                // Get current attachment count for display order
                $countSql = "SELECT COUNT(*) FROM tbl_payment_attachments WHERE payment_id = ?";
                $countStmt = $this->pdo->prepare($countSql);
                $countStmt->execute([$paymentId]);
                $attachmentCount = $countStmt->fetchColumn();

                $insertStmt = $this->pdo->prepare($insertSql);
                $insertStmt->execute([
                    $paymentId,
                    $fileName,
                    $filePath,
                    $fileExtension,
                    $file['size'],
                    $description,
                    $attachmentCount + 1,
                    date('Y-m-d H:i:s')
                ]);

                return json_encode([
                    "status" => "success",
                    "filename" => $fileName,
                    "message" => "Payment attachment uploaded successfully"
                ]);
            } else {
                return json_encode([
                    "status" => "error",
                    "message" => "Failed to upload file"
                ]);
            }
        } catch (Exception $e) {
            return json_encode([
                "status" => "error",
                "message" => "Failed to upload payment attachment: " . $e->getMessage()
            ]);
        }
    }

    public function updateVenueStatus($venueId, $isActive) {
        try {
            $sql = "UPDATE tbl_venue SET is_active = :is_active WHERE venue_id = :venue_id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                'is_active' => $isActive ? 1 : 0,
                'venue_id' => $venueId
            ]);

            if ($stmt->rowCount() > 0) {
                return json_encode([
                    "status" => "success",
                    "message" => "Venue status updated successfully"
                ]);
            } else {
                return json_encode([
                    "status" => "error",
                    "message" => "No venue found with the given ID"
                ]);
            }
        } catch (PDOException $e) {
            return json_encode([
                "status" => "error",
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
    }

    public function duplicateVenue($venueId) {
        try {
            // Start transaction
            $this->conn->beginTransaction();

            // Get the original venue data directly (including inactive venues)
            $sql = "SELECT * FROM tbl_venue WHERE venue_id = :venue_id";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':venue_id' => $venueId]);
            $venue = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$venue) {
                throw new Exception("Original venue not found");
            }

            // Create new venue with duplicated data but unique ID
            $sql = "INSERT INTO tbl_venue (
                venue_title, venue_details, venue_location, venue_contact,
                venue_type, venue_capacity, extra_pax_rate, is_active,
                venue_profile_picture, venue_cover_photo, user_id, venue_owner,
                venue_status
            ) VALUES (
                :venue_title, :venue_details, :venue_location, :venue_contact,
                :venue_type, :venue_capacity, :extra_pax_rate, :is_active,
                :venue_profile_picture, :venue_cover_photo, :user_id, :venue_owner,
                :venue_status
            )";

            $stmt = $this->conn->prepare($sql);
            $result = $stmt->execute([
                'venue_title' => $venue['venue_title'] . '_Copy',
                'venue_details' => $venue['venue_details'],
                'venue_location' => $venue['venue_location'],
                'venue_contact' => $venue['venue_contact'],
                'venue_type' => $venue['venue_type'],
                'venue_capacity' => $venue['venue_capacity'],
                'extra_pax_rate' => $venue['extra_pax_rate'] ?? 0,
                'is_active' => 1, // Set as active so it shows up immediately
                'venue_profile_picture' => $venue['venue_profile_picture'],
                'venue_cover_photo' => $venue['venue_cover_photo'],
                'user_id' => $venue['user_id'],
                'venue_owner' => $venue['venue_owner'],
                'venue_status' => 'available'
            ]);

            if (!$result) {
                throw new Exception("Failed to create duplicated venue");
            }

            $newVenueId = $this->conn->lastInsertId();

            // Get and duplicate venue inclusions
            $inclusionsSql = "SELECT * FROM tbl_venue_inclusions WHERE venue_id = :venue_id";
            $inclusionsStmt = $this->conn->prepare($inclusionsSql);
            $inclusionsStmt->execute([':venue_id' => $venueId]);
            $inclusions = $inclusionsStmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($inclusions)) {
                foreach ($inclusions as $inclusion) {
                    // Insert venue inclusion
                    $inclusionSql = "INSERT INTO tbl_venue_inclusions (
                        venue_id, inclusion_name, inclusion_price, inclusion_description,
                        is_required, is_active
                    ) VALUES (
                        :venue_id, :inclusion_name, :inclusion_price, :inclusion_description,
                        :is_required, :is_active
                    )";

                    $inclusionStmt = $this->conn->prepare($inclusionSql);
                    $inclusionStmt->execute([
                        'venue_id' => $newVenueId,
                        'inclusion_name' => $inclusion['inclusion_name'],
                        'inclusion_price' => $inclusion['inclusion_price'],
                        'inclusion_description' => $inclusion['inclusion_description'] ?? '',
                        'is_required' => $inclusion['is_required'] ?? 0,
                        'is_active' => $inclusion['is_active'] ?? 1
                    ]);

                    $newInclusionId = $this->conn->lastInsertId();

                    // Get and duplicate inclusion components
                    $componentsSql = "SELECT * FROM tbl_venue_components WHERE inclusion_id = :inclusion_id";
                    $componentsStmt = $this->conn->prepare($componentsSql);
                    $componentsStmt->execute([':inclusion_id' => $inclusion['inclusion_id']]);
                    $components = $componentsStmt->fetchAll(PDO::FETCH_ASSOC);

                    if (!empty($components)) {
                        foreach ($components as $component) {
                            $componentSql = "INSERT INTO tbl_venue_components (
                                inclusion_id, component_name, component_description
                            ) VALUES (
                                :inclusion_id, :component_name, :component_description
                            )";

                            $componentStmt = $this->conn->prepare($componentSql);
                            $componentStmt->execute([
                                'inclusion_id' => $newInclusionId,
                                'component_name' => $component['component_name'],
                                'component_description' => $component['component_description'] ?? ''
                            ]);
                        }
                    }
                }
            }

            // Commit transaction
            $this->conn->commit();

            return json_encode([
                "status" => "success",
                "message" => "Venue duplicated successfully",
                "new_venue_id" => $newVenueId
            ]);

        } catch (Exception $e) {
            // Rollback transaction on error
            $this->conn->rollback();
            error_log("duplicateVenue error: " . $e->getMessage());
            return json_encode([
                "status" => "error",
                "message" => "Failed to duplicate venue: " . $e->getMessage()
            ]);
        }
    }

    public function deleteVenue($venueId) {
        try {
            $stmt = $this->conn->prepare("UPDATE tbl_venue SET is_active = 0, updated_at = NOW() WHERE venue_id = ?");
            $stmt->execute([$venueId]);

            if ($stmt->rowCount() === 0) {
                return json_encode(["status" => "error", "message" => "Venue not found"]);
            }

            return json_encode([
                "status" => "success",
                "message" => "Venue deleted successfully"
            ]);

        } catch (Exception $e) {
            return json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    }

    public function duplicatePackage($packageId) {
        try {
            // Start transaction
            $this->conn->beginTransaction();

            // Get the original package data directly (including inactive packages)
            $sql = "SELECT * FROM tbl_packages WHERE package_id = :package_id";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':package_id' => $packageId]);
            $package = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$package) {
                throw new Exception("Original package not found");
            }

            // Create new package with duplicated data but unique ID
            $sql = "INSERT INTO tbl_packages (
                package_title, package_description, package_price, guest_capacity,
                created_by, is_active, original_price, is_price_locked, customized_package
            ) VALUES (
                :package_title, :package_description, :package_price, :guest_capacity,
                :created_by, :is_active, :original_price, :is_price_locked, :customized_package
            )";

            $stmt = $this->conn->prepare($sql);
            $result = $stmt->execute([
                'package_title' => $package['package_title'] . '_Copy',
                'package_description' => $package['package_description'],
                'package_price' => $package['package_price'],
                'guest_capacity' => $package['guest_capacity'],
                'created_by' => $package['created_by'],
                'is_active' => 1, // Set as active so it shows up immediately
                'original_price' => $package['package_price'],
                'is_price_locked' => 0, // Allow price modifications on duplicate
                'customized_package' => $package['customized_package'] ?? 0
            ]);

            if (!$result) {
                throw new Exception("Failed to create duplicated package");
            }

            $newPackageId = $this->conn->lastInsertId();

            // Get and duplicate package components
            $componentsSql = "SELECT inclusion_id as component_id, inclusion_name as component_name, components_list as component_description, inclusion_price as component_price, display_order, supplier_id, offer_id FROM tbl_package_inclusions WHERE package_id = :package_id ORDER BY display_order";
            $componentsStmt = $this->conn->prepare($componentsSql);
            $componentsStmt->execute([':package_id' => $packageId]);
            $components = $componentsStmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($components)) {
                foreach ($components as $index => $component) {
                    $componentSql = "INSERT INTO tbl_package_inclusions (
                        package_id, inclusion_name, components_list, inclusion_price, display_order
                    ) VALUES (
                        :package_id, :inclusion_name, :components_list, :inclusion_price, :display_order
                    )";

                    $componentStmt = $this->conn->prepare($componentSql);
                    $componentStmt->execute([
                        'package_id' => $newPackageId,
                        'inclusion_name' => $component['component_name'],
                        'components_list' => $component['component_description'] ?? '',
                        'inclusion_price' => $component['component_price'] ?? 0,
                        'display_order' => $component['display_order'] ?? $index
                    ]);
                }
            }

            // Get and duplicate package freebies
            $freebiesSql = "SELECT * FROM tbl_package_freebies WHERE package_id = :package_id ORDER BY display_order";
            $freebiesStmt = $this->conn->prepare($freebiesSql);
            $freebiesStmt->execute([':package_id' => $packageId]);
            $freebies = $freebiesStmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($freebies)) {
                foreach ($freebies as $index => $freebie) {
                    $freebieSql = "INSERT INTO tbl_package_freebies (
                        package_id, freebie_name, freebie_description, freebie_value, display_order
                    ) VALUES (
                        :package_id, :freebie_name, :freebie_description, :freebie_value, :display_order
                    )";

                    $freebieStmt = $this->conn->prepare($freebieSql);
                    $freebieStmt->execute([
                        'package_id' => $newPackageId,
                        'freebie_name' => $freebie['freebie_name'],
                        'freebie_description' => $freebie['freebie_description'] ?? '',
                        'freebie_value' => $freebie['freebie_value'] ?? 0,
                        'display_order' => $freebie['display_order'] ?? $index
                    ]);
                }
            }

            // Get and duplicate package event types
            $eventTypesSql = "SELECT event_type_id FROM tbl_package_event_types WHERE package_id = :package_id";
            $eventTypesStmt = $this->conn->prepare($eventTypesSql);
            $eventTypesStmt->execute([':package_id' => $packageId]);
            $eventTypes = $eventTypesStmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($eventTypes)) {
                foreach ($eventTypes as $eventType) {
                    $eventTypeSql = "INSERT INTO tbl_package_event_types (
                        package_id, event_type_id
                    ) VALUES (
                        :package_id, :event_type_id
                    )";

                    $eventTypeStmt = $this->conn->prepare($eventTypeSql);
                    $eventTypeStmt->execute([
                        'package_id' => $newPackageId,
                        'event_type_id' => $eventType['event_type_id']
                    ]);
                }
            }

            // Get and duplicate package venues
            $venuesSql = "SELECT venue_id FROM tbl_package_venues WHERE package_id = :package_id";
            $venuesStmt = $this->conn->prepare($venuesSql);
            $venuesStmt->execute([':package_id' => $packageId]);
            $venues = $venuesStmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($venues)) {
                foreach ($venues as $venue) {
                    $venueSql = "INSERT INTO tbl_package_venues (
                        package_id, venue_id
                    ) VALUES (
                        :package_id, :venue_id
                    )";

                    $venueStmt = $this->conn->prepare($venueSql);
                    $venueStmt->execute([
                        'package_id' => $newPackageId,
                        'venue_id' => $venue['venue_id']
                    ]);
                }
            }

            // Commit transaction
            $this->conn->commit();

            return json_encode([
                "status" => "success",
                "message" => "Package duplicated successfully",
                "new_package_id" => $newPackageId
            ]);

        } catch (Exception $e) {
            // Rollback transaction on error
            $this->conn->rollback();
            error_log("duplicatePackage error: " . $e->getMessage());
            return json_encode([
                "status" => "error",
                "message" => "Failed to duplicate package: " . $e->getMessage()
            ]);
        }
    }


    public function updateVenueWithPriceHistory() {
        try {
            $this->pdo->beginTransaction();

            // Get current venue data
            $stmt = $this->pdo->prepare("SELECT COALESCE(vp.venue_price_min, 0) as venue_price
                                         FROM tbl_venue v
                                         LEFT JOIN tbl_venue_price vp ON v.venue_id = vp.venue_id
                                         WHERE v.venue_id = ?");
            $stmt->execute([$_POST['venue_id']]);
            $currentVenue = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$currentVenue) {
                throw new Exception("Venue not found");
            }

            // If price is changing, record it in price history
            if (floatval($currentVenue['venue_price']) != floatval($_POST['venue_price'])) {
                $sql = "INSERT INTO tbl_venue_price_history (
                    venue_id, old_price, new_price
                ) VALUES (
                    :venue_id, :old_price, :new_price
                )";

                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([
                    ':venue_id' => $_POST['venue_id'],
                    ':old_price' => $currentVenue['venue_price'],
                    ':new_price' => $_POST['venue_price']
                ]);
            }

            // Handle file uploads
            $profilePicture = null;
            $coverPhoto = null;

            if (isset($_FILES['venue_profile_picture']) && $_FILES['venue_profile_picture']['error'] === 0) {
                $uploadResult = json_decode($this->uploadFile($_FILES['venue_profile_picture'], 'venue_profile_pictures'), true);
                if ($uploadResult['status'] === 'success') {
                    $profilePicture = $uploadResult['filePath'];
                } else {
                    throw new Exception("Failed to upload profile picture: " . $uploadResult['message']);
                }
            }

            if (isset($_FILES['venue_cover_photo']) && $_FILES['venue_cover_photo']['error'] === 0) {
                $uploadResult = json_decode($this->uploadFile($_FILES['venue_cover_photo'], 'venue_cover_photos'), true);
                if ($uploadResult['status'] === 'success') {
                    $coverPhoto = $uploadResult['filePath'];
                } else {
                    throw new Exception("Failed to upload cover photo: " . $uploadResult['message']);
                }
            }

            // Update venue basic info
            $sql = "UPDATE tbl_venue SET
                venue_title = :venue_title,
                venue_details = :venue_details,
                venue_location = :venue_location,
                venue_contact = :venue_contact,
                venue_capacity = :venue_capacity,
                venue_price = :venue_price,
                venue_type = :venue_type";

            // Only include files in update if they were uploaded
            if ($profilePicture) {
                $sql .= ", venue_profile_picture = :venue_profile_picture";
            }
            if ($coverPhoto) {
                $sql .= ", venue_cover_photo = :venue_cover_photo";
            }

            $sql .= " WHERE venue_id = :venue_id";

            $stmt = $this->pdo->prepare($sql);

            $params = [
                ':venue_title' => $_POST['venue_title'],
                ':venue_details' => $_POST['venue_details'],
                ':venue_location' => $_POST['venue_location'],
                ':venue_contact' => $_POST['venue_contact'],
                ':venue_capacity' => $_POST['venue_capacity'],
                ':venue_price' => $_POST['venue_price'],
                ':venue_type' => $_POST['venue_type'],
                ':venue_id' => $_POST['venue_id']
            ];

            if ($profilePicture) {
                $params[':venue_profile_picture'] = $profilePicture;
            }
            if ($coverPhoto) {
                $params[':venue_cover_photo'] = $coverPhoto;
            }

            $stmt->execute($params);

            $this->pdo->commit();

            return json_encode([
                "status" => "success",
                "message" => "Venue updated successfully"
            ]);

        } catch (Exception $e) {
            $this->pdo->rollBack();
            return json_encode([
                "status" => "error",
                "message" => "Failed to update venue: " . $e->getMessage()
            ]);
        }
    }

    // Event Component Management Methods
    public function addEventComponent($data) {
        try {
            $required = ['event_id', 'component_name', 'component_price'];
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    return json_encode(["status" => "error", "message" => "$field is required"]);
                }
            }

            $sql = "INSERT INTO tbl_event_components (
                        event_id, component_name, component_description,
                        component_price, is_custom, is_included,
                        original_package_component_id, supplier_id, offer_id, display_order,
                        payment_status, payment_date, payment_notes
                    ) VALUES (
                        :event_id, :name, :description,
                        :price, :is_custom, :is_included,
                        :original_package_component_id, :supplier_id, :offer_id, :display_order,
                        :payment_status, :payment_date, :payment_notes
                    )";

            $stmt = $this->conn->prepare($sql);
            $result = $stmt->execute([
                ':event_id' => $data['event_id'],
                ':name' => $data['component_name'],
                ':description' => $data['component_description'] ?? null,
                ':price' => $data['component_price'],
                ':is_custom' => $data['is_custom'] ?? true,
                ':is_included' => $data['is_included'] ?? true,
                ':original_package_component_id' => $data['original_package_component_id'] ?? null,
                ':supplier_id' => $data['supplier_id'] ?? null,
                ':offer_id' => $data['offer_id'] ?? null,
                ':display_order' => $data['display_order'] ?? 0,
                ':payment_status' => $data['payment_status'] ?? 'pending',
                ':payment_date' => (isset($data['payment_status']) && $data['payment_status'] === 'paid') ? date('Y-m-d H:i:s') : null,
                ':payment_notes' => $data['payment_notes'] ?? null
            ]);

            if ($result) {
                $componentId = $this->conn->lastInsertId();
                return json_encode([
                    "status" => "success",
                    "message" => "Component added successfully",
                    "component_id" => $componentId
                ]);
            } else {
                return json_encode(["status" => "error", "message" => "Failed to add component"]);
            }
        } catch (Exception $e) {
            error_log("addEventComponent error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function updateEventComponent($data) {
        try {
            $required = ['component_id', 'component_name', 'component_price'];
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    return json_encode(["status" => "error", "message" => "$field is required"]);
                }
            }

            // Fetch the current event component
            $sql = "SELECT * FROM tbl_event_components WHERE component_id = :component_id";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':component_id' => $data['component_id']]);
            $eventComponent = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$eventComponent) {
                return json_encode(["status" => "error", "message" => "Component not found"]);
            }

            // If not custom, enforce no downgrade
            if (!$eventComponent['is_custom'] && $eventComponent['original_package_component_id']) {
                $sql = "SELECT inclusion_price as component_price FROM tbl_package_inclusions WHERE inclusion_id = :original_id";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([':original_id' => $eventComponent['original_package_component_id']]);
                $original = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($original && floatval($data['component_price']) < floatval($original['component_price'])) {
                    return json_encode(["status" => "error", "message" => "Cannot downgrade inclusion price below original package value (₱" . number_format($original['component_price'],2) . ")"]);
                }
            }

            $sql = "UPDATE tbl_event_components SET
                        component_name = :name,
                        component_description = :description,
                        component_price = :price,
                        is_included = :is_included
                    WHERE component_id = :component_id";

            $stmt = $this->conn->prepare($sql);
            $result = $stmt->execute([
                ':component_id' => $data['component_id'],
                ':name' => $data['component_name'],
                ':description' => $data['component_description'] ?? null,
                ':price' => $data['component_price'],
                ':is_included' => $data['is_included'] ?? true
            ]);

            if ($result) {
                return json_encode([
                    "status" => "success",
                    "message" => "Component updated successfully"
                ]);
            } else {
                return json_encode(["status" => "error", "message" => "Failed to update component"]);
            }
        } catch (Exception $e) {
            error_log("updateEventComponent error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function deleteEventComponent($componentId) {
        try {
            if (empty($componentId)) {
                return json_encode(["status" => "error", "message" => "Component ID is required"]);
            }

            $sql = "DELETE FROM tbl_event_components WHERE component_id = :component_id";
            $stmt = $this->conn->prepare($sql);
            $result = $stmt->execute([':component_id' => $componentId]);

            if ($result) {
                return json_encode([
                    "status" => "success",
                    "message" => "Component deleted successfully"
                ]);
            } else {
                return json_encode(["status" => "error", "message" => "Failed to delete component"]);
            }
        } catch (Exception $e) {
            error_log("deleteEventComponent error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function updateComponentPaymentStatus($data) {
        try {
            if (!isset($data['component_id']) || !isset($data['payment_status'])) {
                return json_encode(["status" => "error", "message" => "Component ID and payment status are required"]);
            }

            $validStatuses = ['pending', 'paid', 'cancelled'];
            if (!in_array($data['payment_status'], $validStatuses)) {
                return json_encode(["status" => "error", "message" => "Invalid payment status"]);
            }

            // Determine if payment_date column exists and whether it allows NULL to avoid SQL errors on older schemas
            $paymentDateExists = false;
            $paymentDateNullable = true;
            try {
                $colStmt = $this->pdo->prepare("SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_event_components' AND COLUMN_NAME = 'payment_date' LIMIT 1");
                $colStmt->execute();
                $nullableFlag = $colStmt->fetchColumn();
                if ($nullableFlag !== false) {
                    $paymentDateExists = true;
                    $paymentDateNullable = (strtoupper((string)$nullableFlag) === 'YES');
                }
            } catch (Exception $ignored) {
                $paymentDateExists = false;
                $paymentDateNullable = true; // assume safe if we can't detect
            }

            $notes = isset($data['payment_notes']) ? (string)$data['payment_notes'] : '';
            $status = $data['payment_status'];
            $componentId = (int)$data['component_id'];

            if ($status === 'paid') {
                if ($paymentDateExists) {
                    $sql = "UPDATE tbl_event_components
                            SET payment_status = :payment_status,
                                payment_date = NOW(),
                                payment_notes = :payment_notes
                            WHERE component_id = :component_id";
                } else {
                    $sql = "UPDATE tbl_event_components
                            SET payment_status = :payment_status,
                                payment_notes = :payment_notes
                            WHERE component_id = :component_id";
                }
                $stmt = $this->pdo->prepare($sql);
                $result = $stmt->execute([
                    ':payment_status' => $status,
                    ':payment_notes' => $notes,
                    ':component_id' => $componentId
                ]);
            } else {
                // For pending/cancelled: clear date only if column is nullable; otherwise leave as-is
                if ($paymentDateExists && $paymentDateNullable) {
                    $sql = "UPDATE tbl_event_components
                            SET payment_status = :payment_status,
                                payment_date = NULL,
                                payment_notes = :payment_notes
                            WHERE component_id = :component_id";
                } else {
                    $sql = "UPDATE tbl_event_components
                            SET payment_status = :payment_status,
                                payment_notes = :payment_notes
                            WHERE component_id = :component_id";
                }
                $stmt = $this->pdo->prepare($sql);
                $result = $stmt->execute([
                    ':payment_status' => $status,
                    ':payment_notes' => $notes,
                    ':component_id' => $componentId
                ]);
            }

            if ($result) {
                // Get event details to check if all components are paid
                $sql = "SELECT ec.event_id,
                        COUNT(ec.component_id) as total_components,
                        SUM(CASE WHEN ec.payment_status = 'paid' THEN 1 ELSE 0 END) as paid_components
                        FROM tbl_event_components ec
                        WHERE ec.event_id = (SELECT event_id FROM tbl_event_components WHERE component_id = :component_id)
                        GROUP BY ec.event_id";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([':component_id' => $data['component_id']]);
                $eventStats = $stmt->fetch(PDO::FETCH_ASSOC);

                $completionPercentage = $eventStats && $eventStats['total_components'] > 0
                    ? round(($eventStats['paid_components'] / $eventStats['total_components']) * 100)
                    : 0;

                return json_encode([
                    "status" => "success",
                    "message" => "Component payment status updated successfully",
                    "total_components" => $eventStats ? (int)$eventStats['total_components'] : 0,
                    "paid_components" => $eventStats ? (int)$eventStats['paid_components'] : 0,
                    "completion_percentage" => $completionPercentage
                ]);
            } else {
                return json_encode(["status" => "error", "message" => "Failed to update payment status"]);
            }
        } catch (Exception $e) {
            error_log("updateComponentPaymentStatus error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function updateOrganizerPaymentStatus($data) {
        try {
            if (!isset($data['assignment_id']) || !isset($data['payment_status'])) {
                return json_encode(["status" => "error", "message" => "Assignment ID and payment status are required"]);
            }

            $validStatuses = ['unpaid','partial','paid','cancelled'];
            if (!in_array($data['payment_status'], $validStatuses)) {
                return json_encode(["status" => "error", "message" => "Invalid payment status"]);
            }

            $stmt = $this->pdo->prepare("UPDATE tbl_event_organizer_assignments SET payment_status = :status, updated_at = CURRENT_TIMESTAMP WHERE assignment_id = :id");
            $ok = $stmt->execute([':status' => $data['payment_status'], ':id' => $data['assignment_id']]);
            if ($ok) {
                return json_encode(["status" => "success", "message" => "Organizer payment status updated"]);
            }
            return json_encode(["status" => "error", "message" => "Failed to update organizer payment status"]);
        } catch (Exception $e) {
            error_log("updateOrganizerPaymentStatus error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function updateVenuePaymentStatus($data) {
        try {
            if (!isset($data['event_id']) || !isset($data['payment_status'])) {
                return json_encode(["status" => "error", "message" => "Event ID and payment status are required"]);
            }

            $validStatuses = ['unpaid','partial','paid','cancelled'];
            if (!in_array($data['payment_status'], $validStatuses)) {
                return json_encode(["status" => "error", "message" => "Invalid payment status"]);
            }

            $stmt = $this->pdo->prepare("UPDATE tbl_events SET venue_payment_status = :status, updated_at = CURRENT_TIMESTAMP WHERE event_id = :event_id");
            $ok = $stmt->execute([':status' => $data['payment_status'], ':event_id' => $data['event_id']]);
            if ($ok) {
                return json_encode(["status" => "success", "message" => "Venue payment status updated"]);
            }
            return json_encode(["status" => "error", "message" => "Failed to update venue payment status"]);
        } catch (Exception $e) {
            error_log("updateVenuePaymentStatus error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }
    public function updateEventBudget($eventId, $budgetChange) {
        try {
            // Get current budget
            $sql = "SELECT total_budget FROM tbl_events WHERE event_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$eventId]);
            $currentBudget = $stmt->fetch(PDO::FETCH_ASSOC)['total_budget'];

            // Calculate new budget and prevent negative values
            $newBudget = $currentBudget + $budgetChange;
            if ($newBudget < 0) {
                $newBudget = 0;
            }

            // Update event budget
            $updateSql = "UPDATE tbl_events SET total_budget = ? WHERE event_id = ?";
            $updateStmt = $this->pdo->prepare($updateSql);
            $updateStmt->execute([$newBudget, $eventId]);

            return json_encode([
                "status" => "success",
                "message" => "Event budget updated successfully",
                "old_budget" => $currentBudget,
                "new_budget" => $newBudget,
                "change" => $budgetChange
            ]);
        } catch (PDOException $e) {
            return json_encode([
                "status" => "error",
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
    }

    public function getEventPaymentStats($eventId) {
        try {
            $sql = "SELECT
                    COUNT(ec.component_id) as total_components,
                    SUM(CASE WHEN ec.is_included = 1 THEN 1 ELSE 0 END) as included_components,
                    SUM(CASE WHEN ec.payment_status = 'paid' AND ec.is_included = 1 THEN 1 ELSE 0 END) as paid_components,
                    SUM(CASE WHEN ec.supplier_status = 'delivered' AND ec.is_included = 1 THEN 1 ELSE 0 END) as finalized_inclusions,
                    SUM(CASE WHEN ec.is_included = 1 THEN ec.component_price ELSE 0 END) as total_value,
                    SUM(CASE WHEN ec.payment_status = 'paid' AND ec.is_included = 1 THEN ec.component_price ELSE 0 END) as paid_value
                    FROM tbl_event_components ec
                    WHERE ec.event_id = :event_id";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':event_id' => $eventId]);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);

            $paymentPercentage = $stats['included_components'] > 0
                ? round(($stats['paid_components'] / $stats['included_components']) * 100)
                : 0;

            $inclusionPercentage = $stats['included_components'] > 0
                ? round(($stats['finalized_inclusions'] / $stats['included_components']) * 100)
                : 0;

            return json_encode([
                "status" => "success",
                "stats" => [
                    "total_components" => (int)$stats['total_components'],
                    "included_components" => (int)$stats['included_components'],
                    "paid_components" => (int)$stats['paid_components'],
                    "finalized_inclusions" => (int)$stats['finalized_inclusions'],
                    "total_value" => (float)$stats['total_value'],
                    "paid_value" => (float)$stats['paid_value'],
                    "payment_percentage" => $paymentPercentage,
                    "inclusion_percentage" => $inclusionPercentage,
                    "can_finalize" => $inclusionPercentage === 100
                ]
            ]);
        } catch (Exception $e) {
            error_log("getEventPaymentStats error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function getPackageVenues($packageId) {
        try {
            $sql = "SELECT v.*, pv.package_id,
                           COALESCE(vp.venue_price_min, 0) as venue_price,
                           COALESCE(vp.venue_price_max, 0) as venue_price_max,
                           COALESCE(v.extra_pax_rate, 0) as extra_pax_rate
                    FROM tbl_venue v
                    INNER JOIN tbl_package_venues pv ON v.venue_id = pv.venue_id
                    LEFT JOIN tbl_venue_price vp ON v.venue_id = vp.venue_id AND vp.is_active = 1
                    WHERE pv.package_id = ? AND v.is_active = 1
                    ORDER BY v.venue_title ASC";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$packageId]);
            $venues = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "venues" => $venues
            ]);
        } catch (PDOException $e) {
            return json_encode([
                "status" => "error",
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
    }

    public function updateEventVenue($eventId, $venueId) {
        try {
            // First check if the venue is available for the event's package
            $checkSql = "SELECT e.package_id, pv.venue_id
                        FROM tbl_events e
                        INNER JOIN tbl_package_venues pv ON e.package_id = pv.package_id
                        WHERE e.event_id = ? AND pv.venue_id = ?";

            $checkStmt = $this->pdo->prepare($checkSql);
            $checkStmt->execute([$eventId, $venueId]);

            if (!$checkStmt->fetch(PDO::FETCH_ASSOC)) {
                return json_encode([
                    "status" => "error",
                    "message" => "Selected venue is not available for this package"
                ]);
            }

            // Update the event venue
            $updateSql = "UPDATE tbl_events SET venue_id = ? WHERE event_id = ?";
            $updateStmt = $this->pdo->prepare($updateSql);
            $updateStmt->execute([$venueId, $eventId]);

            // Get venue details for response
            $venueSql = "SELECT v.venue_id, v.venue_title, v.venue_location, COALESCE(vp.venue_price_min, 0) as venue_price
                         FROM tbl_venue v
                         LEFT JOIN tbl_venue_price vp ON v.venue_id = vp.venue_id
                         WHERE v.venue_id = ?";
            $venueStmt = $this->pdo->prepare($venueSql);
            $venueStmt->execute([$venueId]);
            $venue = $venueStmt->fetch(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "message" => "Event venue updated successfully",
                "venue" => $venue
            ]);
        } catch (PDOException $e) {
            return json_encode([
                "status" => "error",
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
    }

    public function updateEventOrganizer($eventId, $organizerId = null) {
        try {
            error_log("updateEventOrganizer called - eventId: $eventId, organizerId: " . ($organizerId ?? 'null'));

            // Start transaction to ensure both updates succeed or fail together
            $this->pdo->beginTransaction();

            // Update the event organizer (can be null for admin assignment)
            $updateSql = "UPDATE tbl_events SET organizer_id = ? WHERE event_id = ?";
            $updateStmt = $this->pdo->prepare($updateSql);
            $result = $updateStmt->execute([$organizerId, $eventId]);

            error_log("updateEventOrganizer - UPDATE result: " . ($result ? 'success' : 'failed'));
            error_log("updateEventOrganizer - Rows affected: " . $updateStmt->rowCount());

            if ($organizerId === null) {
                error_log("updateEventOrganizer - Admin assignment detected");

                // When assigning to admin, remove any existing organizer assignments
                $deleteAssignmentSql = "DELETE FROM tbl_event_organizer_assignments WHERE event_id = ?";
                $deleteAssignmentStmt = $this->pdo->prepare($deleteAssignmentSql);
                $deleteResult = $deleteAssignmentStmt->execute([$eventId]);

                error_log("updateEventOrganizer - DELETE assignments result: " . ($deleteResult ? 'success' : 'failed'));
                error_log("updateEventOrganizer - DELETE assignments rows affected: " . $deleteAssignmentStmt->rowCount());

                $this->pdo->commit();
                error_log("updateEventOrganizer - Transaction committed successfully");

                // Verify the update worked by checking the database
                $verifySql = "SELECT organizer_id FROM tbl_events WHERE event_id = ?";
                $verifyStmt = $this->pdo->prepare($verifySql);
                $verifyStmt->execute([$eventId]);
                $verifyResult = $verifyStmt->fetch(PDO::FETCH_ASSOC);
                error_log("updateEventOrganizer - Verification: organizer_id = " . ($verifyResult['organizer_id'] ?? 'NULL'));

                // Also check if there are any remaining assignment records
                $checkAssignmentsSql = "SELECT COUNT(*) as count FROM tbl_event_organizer_assignments WHERE event_id = ?";
                $checkAssignmentsStmt = $this->pdo->prepare($checkAssignmentsSql);
                $checkAssignmentsStmt->execute([$eventId]);
                $assignmentCount = $checkAssignmentsStmt->fetch(PDO::FETCH_ASSOC);
                error_log("updateEventOrganizer - Remaining assignment records: " . $assignmentCount['count']);

                return json_encode([
                    "status" => "success",
                    "message" => "Event assigned to admin successfully"
                ]);
            } else {
                // When assigning to an organizer, remove existing assignments and create new one
                $deleteAssignmentSql = "DELETE FROM tbl_event_organizer_assignments WHERE event_id = ?";
                $deleteAssignmentStmt = $this->pdo->prepare($deleteAssignmentSql);
                $deleteAssignmentStmt->execute([$eventId]);

                // Create new assignment record
                $insertAssignmentSql = "INSERT INTO tbl_event_organizer_assignments (event_id, organizer_id, assigned_by, status, notes) VALUES (?, ?, ?, 'assigned', 'Assigned by admin')";
                $insertAssignmentStmt = $this->pdo->prepare($insertAssignmentSql);
                $insertAssignmentStmt->execute([$eventId, $organizerId, $_SESSION['user_id'] ?? 1]); // Use session user_id or default to 1

                $this->pdo->commit();

                // Get organizer details for response
                $organizerSql = "SELECT o.organizer_id, u.user_firstName, u.user_lastName
                                FROM tbl_organizer o
                                INNER JOIN tbl_users u ON o.user_id = u.user_id
                                WHERE o.organizer_id = ?";
                $organizerStmt = $this->pdo->prepare($organizerSql);
                $organizerStmt->execute([$organizerId]);
                $organizer = $organizerStmt->fetch(PDO::FETCH_ASSOC);

                return json_encode([
                    "status" => "success",
                    "message" => "Event organizer updated successfully",
                    "organizer" => $organizer
                ]);
            }
        } catch (PDOException $e) {
            // Rollback transaction on error
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollback();
            }
            return json_encode([
                "status" => "error",
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
    }

    public function updateEventFinalization($eventId, $action) {
        try {
            // Get event details first
            $eventSql = "SELECT e.*, u.user_email as client_email, u.user_firstName, u.user_lastName
                        FROM tbl_events e
                        LEFT JOIN tbl_users u ON e.user_id = u.user_id
                        WHERE e.event_id = ?";
            $eventStmt = $this->pdo->prepare($eventSql);
            $eventStmt->execute([$eventId]);
            $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

            if (!$event) {
                return json_encode([
                    "status" => "error",
                    "message" => "Event not found"
                ]);
            }

            if ($action === "finalize") {
                // Check if all included components are fully paid
                $paymentCheckSql = "SELECT
                    COUNT(*) as total_included,
                    SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_inclusions
                    FROM tbl_event_components
                    WHERE event_id = ? AND is_included = 1";
                $checkStmt = $this->pdo->prepare($paymentCheckSql);
                $checkStmt->execute([$eventId]);
                $paymentStats = $checkStmt->fetch(PDO::FETCH_ASSOC);

                if ($paymentStats['total_included'] > 0 && $paymentStats['paid_inclusions'] < $paymentStats['total_included']) {
                    return json_encode([
                        "status" => "error",
                        "message" => "Cannot finalize event. All included components must be paid first.",
                        "pending_inclusions" => $paymentStats['total_included'] - $paymentStats['paid_inclusions']
                    ]);
                }

                // Finalize the event and mark as confirmed (upcoming)
                $updateSql = "UPDATE tbl_events SET
                             event_status = 'confirmed',
                             finalized_at = NOW(),
                             updated_at = NOW()
                             WHERE event_id = ?";
                $updateStmt = $this->pdo->prepare($updateSql);
                $updateStmt->execute([$eventId]);

                // Send notification to organizer about finalization
                $this->sendFinalizationNotification($event);

                return json_encode([
                    "status" => "success",
                    "message" => "Event has been finalized and marked as confirmed.",
                    "finalized_at" => date('Y-m-d H:i:s')
                ]);
            } else {
                // Unfinalize the event (set back to planning/draft) without password
                $updateSql = "UPDATE tbl_events SET
                             event_status = 'draft',
                             finalized_at = NULL,
                             updated_at = NOW()
                             WHERE event_id = ?";
                $updateStmt = $this->pdo->prepare($updateSql);
                $updateStmt->execute([$eventId]);

                return json_encode([
                    "status" => "success",
                    "message" => "Event has been set back to planning status"
                ]);
            }
        } catch (PDOException $e) {
            return json_encode([
                "status" => "error",
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
    }

    private function sendFinalizationNotification($event) {
        try {
            // Create notification for the organizer
            $notificationSql = "INSERT INTO tbl_notifications (
                user_id,
                event_id,
                notification_type,
                notification_title,
                notification_message,
                created_at
            ) VALUES (?, ?, ?, ?, ?, NOW())";

            $notificationStmt = $this->pdo->prepare($notificationSql);
            $notificationStmt->execute([
                $event['user_id'],
                $event['event_id'],
                'event_finalized',
                'Event Finalized',
                "Your event '{$event['event_title']}' has been finalized. Please check your payment schedule for upcoming payments."
            ]);

            // Log the finalization activity
            $logSql = "INSERT INTO tbl_payment_logs (
                event_id,
                client_id,
                action_type,
                notes,
                created_at
            ) VALUES (?, ?, ?, ?, NOW())";

            $logStmt = $this->pdo->prepare($logSql);
            $logStmt->execute([
                $event['event_id'],
                $event['user_id'],
                'event_finalized',
                'Event finalized by admin. Organizer notified about payment schedule.'
            ]);

        } catch (Exception $e) {
            error_log("Error sending finalization notification: " . $e->getMessage());
        }
    }

    /**
     * Calculate package budget breakdown including buffer/overage
     */
    public function getPackageBudgetBreakdown($packageId) {
        try {
            // Get package details
            $packageSql = "SELECT package_id, package_title, package_price, original_price, is_price_locked FROM tbl_packages WHERE package_id = :package_id";
            $packageStmt = $this->conn->prepare($packageSql);
            $packageStmt->execute([':package_id' => $packageId]);
            $package = $packageStmt->fetch(PDO::FETCH_ASSOC);

            if (!$package) {
                return json_encode(["status" => "error", "message" => "Package not found"]);
            }

            // Get components total
            $componentsSql = "SELECT COALESCE(SUM(inclusion_price), 0) as total_cost FROM tbl_package_inclusions WHERE package_id = :package_id";
            $componentsStmt = $this->conn->prepare($componentsSql);
            $componentsStmt->execute([':package_id' => $packageId]);
            $componentsTotal = floatval($componentsStmt->fetchColumn());

            $packagePrice = floatval($package['package_price']);
            $difference = $packagePrice - $componentsTotal;

            $budgetStatus = 'EXACT';
            if ($difference > 0) {
                $budgetStatus = 'BUFFER';
            } elseif ($difference < 0) {
                $budgetStatus = 'OVERAGE';
            }

            return json_encode([
                "status" => "success",
                "budget_breakdown" => [
                    "package_id" => $package['package_id'],
                    "package_title" => $package['package_title'],
                    "package_price" => $packagePrice,
                    "original_price" => floatval($package['original_price']),
                    "is_price_locked" => boolval($package['is_price_locked']),
                    "inclusions_total" => $componentsTotal,
                    "difference" => $difference,
                    "difference_absolute" => abs($difference),
                    "budget_status" => $budgetStatus,
                    "buffer_amount" => $difference > 0 ? $difference : 0,
                    "overage_amount" => $difference < 0 ? abs($difference) : 0,
                    "margin_percentage" => $packagePrice > 0 ? ($difference / $packagePrice) * 100 : 0
                ]
            ]);
        } catch (Exception $e) {
            error_log("getPackageBudgetBreakdown error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    /**
     * Validate package budget before saving
     */
    public function validatePackageBudget($packageId, $components) {
        try {
            // Get package price
            $packageSql = "SELECT package_price, is_price_locked FROM tbl_packages WHERE package_id = :package_id";
            $packageStmt = $this->conn->prepare($packageSql);
            $packageStmt->execute([':package_id' => $packageId]);
            $package = $packageStmt->fetch(PDO::FETCH_ASSOC);

            if (!$package) {
                return json_encode(["status" => "error", "message" => "Package not found"]);
            }

            // Calculate total component cost
            $totalComponentCost = 0;
            foreach ($components as $component) {
                $totalComponentCost += floatval($component['component_price'] ?? 0);
            }

            $packagePrice = floatval($package['package_price']);
            $difference = $packagePrice - $totalComponentCost;

            $validation = [
                "is_valid" => true,
                "package_price" => $packagePrice,
                "inclusions_total" => $totalComponentCost,
                "difference" => $difference,
                "warnings" => [],
                "errors" => []
            ];

            // Check for overage
            if ($difference < 0) {
                $validation["warnings"][] = [
                    "type" => "overage",
                    "message" => "Budget overage detected: Inclusions exceed package price by ₱" . number_format(abs($difference), 2),
                    "overage_amount" => abs($difference)
                ];
            }

            // Check if price is locked and cannot be reduced
            if (boolval($package['is_price_locked'])) {
                $validation["is_price_locked"] = true;
                $validation["price_lock_message"] = "Package price is locked and cannot be reduced";
            }

            return json_encode([
                "status" => "success",
                "validation" => $validation
            ]);
        } catch (Exception $e) {
            error_log("validatePackageBudget error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    // =============================================================================
    // ORGANIZER MANAGEMENT METHODS
    // =============================================================================

    public function createOrganizer($data) {
        try {
            $this->conn->beginTransaction();

            // Validate required fields
            $required = ['first_name', 'last_name', 'email', 'phone', 'username', 'password'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    throw new Exception("$field is required");
                }
            }

            // Validate email format
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                throw new Exception("Invalid email format");
            }

            // Check for duplicate email or username
            $checkStmt = $this->conn->prepare("SELECT user_id FROM tbl_users WHERE user_email = ? OR user_username = ?");
            $checkStmt->execute([$data['email'], $data['username']]);
            if ($checkStmt->fetch(PDO::FETCH_ASSOC)) {
                throw new Exception("An account with this email or username already exists");
            }

            // Hash password
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);

            // Handle profile picture - use the provided path or default
            $profilePicturePath = !empty($data['profile_picture']) ? $data['profile_picture'] : null;

            // Create user account
            $userSql = "INSERT INTO tbl_users (
                           user_firstName, user_lastName, user_suffix, user_birthdate,
                           user_email, user_contact, user_username, user_pwd,
                           user_role, user_pfp, account_status, created_at
                       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'organizer', ?, 'active', NOW())";

            $userStmt = $this->conn->prepare($userSql);
            $userStmt->execute([
                $data['first_name'],
                $data['last_name'],
                $data['suffix'] ?? null,
                $data['date_of_birth'] ?? null,
                $data['email'],
                $data['phone'],
                $data['username'],
                $hashedPassword,
                $profilePicturePath
            ]);

            $userId = $this->conn->lastInsertId();

            // Handle resume path - use the provided path
            $resumePath = !empty($data['resume_path']) ? $data['resume_path'] : null;

            // Handle certification files (JSON array)
            $certificationFilesJson = null;
            if (!empty($data['certification_files']) && is_array($data['certification_files'])) {
                $certificationFilesJson = json_encode($data['certification_files']);
            }

            // Create experience summary
            $experienceSummary = "Years of Experience: " . ($data['years_of_experience'] ?? 0);
            if (!empty($data['address'])) {
                $experienceSummary .= "\nAddress: " . $data['address'];
            }

            // Validate talent fee values (server-side)
            if ((isset($data['talent_fee_min']) && $data['talent_fee_min'] !== null && $data['talent_fee_min'] !== '' && floatval($data['talent_fee_min']) < 0)
                || (isset($data['talent_fee_max']) && $data['talent_fee_max'] !== null && $data['talent_fee_max'] !== '' && floatval($data['talent_fee_max']) < 0)) {
                throw new Exception("Talent fees cannot be negative");
            }
            if ((isset($data['talent_fee_min']) && $data['talent_fee_min'] !== '' && $data['talent_fee_min'] !== null)
                && (isset($data['talent_fee_max']) && $data['talent_fee_max'] !== '' && $data['talent_fee_max'] !== null)
                && floatval($data['talent_fee_min']) > floatval($data['talent_fee_max'])) {
                throw new Exception("Minimum talent fee cannot be greater than maximum talent fee");
            }

            // Create organizer record (using actual database column names)
            $organizerSql = "INSERT INTO tbl_organizer (
                                user_id, organizer_experience, organizer_certifications,
                                organizer_resume_path, organizer_portfolio_link,
                                talent_fee_min, talent_fee_max, talent_fee_currency, talent_fee_notes,
                                organizer_availability, remarks, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'flexible', ?, NOW())";

            try {
                $organizerStmt = $this->conn->prepare($organizerSql);
                $organizerStmt->execute([
                    $userId,
                    $experienceSummary,
                    $certificationFilesJson,
                    $resumePath,
                    $data['portfolio_link'] ?? null,
                    $data['talent_fee_min'] ?? null,
                    $data['talent_fee_max'] ?? null,
                    $data['talent_fee_currency'] ?? 'PHP',
                    $data['talent_fee_notes'] ?? null,
                    $data['admin_remarks'] ?? null
                ]);
            } catch (Exception $e) {
                // Fallback for databases that haven't run the talent fee migration
                $fallbackSql = "INSERT INTO tbl_organizer (
                                    user_id, organizer_experience, organizer_certifications,
                                    organizer_resume_path, organizer_portfolio_link,
                                    organizer_availability, remarks, created_at
                                ) VALUES (?, ?, ?, ?, ?, 'flexible', ?, NOW())";
                $fallbackStmt = $this->conn->prepare($fallbackSql);
                $fallbackStmt->execute([
                    $userId,
                    $experienceSummary,
                    $certificationFilesJson,
                    $resumePath,
                    $data['portfolio_link'] ?? null,
                    $data['admin_remarks'] ?? null
                ]);
            }

            $organizerId = $this->conn->lastInsertId();

            $this->conn->commit();

            // Send welcome email (outside transaction)
            try {
                $this->sendOrganizerWelcomeEmail($data['email'], $data['first_name'] . ' ' . $data['last_name'], $data['password'], $organizerId);
            } catch (Exception $emailError) {
                // Log email error but don't fail the organizer creation
                error_log("Failed to send welcome email: " . $emailError->getMessage());
            }

            // Log activity (outside transaction)
            try {
                $this->logOrganizerActivity($organizerId, 'created', 'Organizer account created', $userId);

                // Also log with comprehensive ActivityLogger
                if ($this->logger) {
                    $this->logger->logOrganizer(
                        $data['admin_id'] ?? 7, // Admin who created the organizer
                        $organizerId,
                        'created',
                        "Organizer account created for {$data['first_name']} {$data['last_name']} ({$data['email']})",
                        [
                            'user_id' => $userId,
                            'username' => $data['username'],
                            'years_of_experience' => $data['years_of_experience'] ?? 0,
                            'has_certifications' => !empty($certificationFilesJson),
                            'has_resume' => !empty($resumePath)
                        ]
                    );
                }
            } catch (Exception $logError) {
                // Log activity error but don't fail the organizer creation
                error_log("Failed to log activity: " . $logError->getMessage());
            }

            return json_encode([
                "status" => "success",
                "message" => "Organizer created successfully",
                "data" => [
                    "organizer_id" => $organizerId,
                    "user_id" => $userId,
                    "email" => $data['email'],
                    "username" => $data['username']
                ]
            ]);

        } catch (Exception $e) {
            // Check if transaction is active before rolling back
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            return json_encode(["status" => "error", "message" => "Error creating organizer: " . $e->getMessage()]);
        }
    }

    // =============================================================================
    // STAFF MANAGEMENT METHODS
    // =============================================================================

    public function createStaff($data) {
        try {
            $this->conn->beginTransaction();

            // Validate required fields
            $required = ['first_name', 'last_name', 'email', 'phone', 'username', 'password'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    throw new Exception("$field is required");
                }
            }

            // Validate email format
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                throw new Exception("Invalid email format");
            }

            // Check for duplicate email or username
            $checkStmt = $this->conn->prepare("SELECT user_id FROM tbl_users WHERE user_email = ? OR user_username = ?");
            $checkStmt->execute([$data['email'], $data['username']]);
            if ($checkStmt->fetch(PDO::FETCH_ASSOC)) {
                throw new Exception("An account with this email or username already exists");
            }

            // Hash password
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);

            // Profile picture path (optional)
            $profilePicturePath = !empty($data['profile_picture']) ? $data['profile_picture'] : null;

            // Create user account as staff
            $userSql = "INSERT INTO tbl_users (
                           user_firstName, user_lastName, user_suffix, user_birthdate,
                           user_email, user_contact, user_username, user_pwd,
                           user_role, user_pfp, account_status, created_at
                       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'staff', ?, 'active', NOW())";

            $userStmt = $this->conn->prepare($userSql);
            $userStmt->execute([
                $data['first_name'],
                $data['last_name'],
                $data['suffix'] ?? null,
                $data['date_of_birth'] ?? null,
                $data['email'],
                $data['phone'],
                $data['username'],
                $hashedPassword,
                $profilePicturePath
            ]);

            $userId = $this->conn->lastInsertId();

            // Insert staff profile
            $staffSql = "INSERT INTO tbl_staff (
                            user_id, role_title, branch_name, can_handle_bookings, remarks, created_at
                         ) VALUES (?, ?, ?, ?, ?, NOW())";
            $staffStmt = $this->conn->prepare($staffSql);
            $staffStmt->execute([
                $userId,
                $data['role_title'] ?? 'head_organizer',
                $data['branch_name'] ?? null,
                !empty($data['can_handle_bookings']) ? 1 : 0,
                $data['admin_remarks'] ?? null
            ]);

            $staffId = $this->conn->lastInsertId();

            $this->conn->commit();

            return json_encode([
                "status" => "success",
                "message" => "Staff created successfully",
                "data" => [
                    "staff_id" => $staffId,
                    "user_id" => $userId,
                    "email" => $data['email'],
                    "username" => $data['username']
                ]
            ]);
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            return json_encode(["status" => "error", "message" => "Error creating staff: " . $e->getMessage()]);
        }
    }

    public function getAllStaff($page = 1, $limit = 20, $filters = []) {
        try {
            $offset = ($page - 1) * $limit;
            $conditions = ["u.user_role = 'staff'"];
            $params = [];

            if (!empty($filters['search'])) {
                $conditions[] = "(u.user_firstName LIKE ? OR u.user_lastName LIKE ? OR u.user_email LIKE ? OR u.user_username LIKE ?)";
                $searchTerm = '%' . $filters['search'] . '%';
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }

            if (!empty($filters['status'])) {
                $conditions[] = "u.account_status = ?";
                $params[] = $filters['status'] === 'active' ? 'active' : 'inactive';
            }

            if (!empty($filters['role'])) {
                $conditions[] = "s.role_title = ?";
                $params[] = $filters['role'];
            }

            $where = implode(' AND ', $conditions);

            // Count
            $countSql = "SELECT COUNT(*)
                        FROM tbl_users u
                        LEFT JOIN tbl_staff s ON u.user_id = s.user_id
                        WHERE $where";
            $countStmt = $this->conn->prepare($countSql);
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();

            // Data
            $sql = "SELECT
                        u.user_id, u.user_firstName, u.user_lastName, u.user_email, u.user_contact,
                        u.user_username, u.user_pfp, u.account_status, u.created_at,
                        s.staff_id, s.role_title, s.branch_name, s.can_handle_bookings
                    FROM tbl_users u
                    LEFT JOIN tbl_staff s ON u.user_id = s.user_id
                    WHERE $where
                    ORDER BY u.created_at DESC
                    LIMIT ? OFFSET ?";
            $paramsData = array_merge($params, [$limit, $offset]);
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($paramsData);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $staff = array_map(function ($r) {
                return [
                    'staff_id' => $r['staff_id'],
                    'user_id' => $r['user_id'],
                    'first_name' => $r['user_firstName'],
                    'last_name' => $r['user_lastName'],
                    'email' => $r['user_email'],
                    'contact_number' => $r['user_contact'],
                    'username' => $r['user_username'],
                    'profile_picture' => $r['user_pfp'],
                    'branch_name' => $r['branch_name'],
                    'role_title' => $r['role_title'] ?? 'head_organizer',
                    'can_handle_bookings' => (bool)$r['can_handle_bookings'],
                    'is_active' => $r['account_status'] === 'active',
                    'created_at' => $r['created_at']
                ];
            }, $rows);

            return json_encode([
                'status' => 'success',
                'data' => [
                    'staff' => $staff,
                    'pagination' => [
                        'current_page' => $page,
                        'total_pages' => max(1, (int)ceil($total / $limit)),
                        'total_count' => $total,
                        'per_page' => $limit
                    ]
                ]
            ]);
        } catch (Exception $e) {
            return json_encode(['status' => 'error', 'message' => 'Error fetching staff: ' . $e->getMessage()]);
        }
    }

    public function updateStaff($staffId, $data) {
        try {
            $this->conn->beginTransaction();

            // Find user_id
            $q = $this->conn->prepare("SELECT user_id FROM tbl_staff WHERE staff_id = ?");
            $q->execute([$staffId]);
            $row = $q->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                throw new Exception('Staff not found');
            }
            $userId = (int)$row['user_id'];

            // Update user fields if provided
            $userFields = [];
            $userParams = [];
            if (isset($data['first_name'])) { $userFields[] = 'user_firstName = ?'; $userParams[] = $data['first_name']; }
            if (isset($data['last_name'])) { $userFields[] = 'user_lastName = ?'; $userParams[] = $data['last_name']; }
            if (isset($data['email'])) { $userFields[] = 'user_email = ?'; $userParams[] = $data['email']; }
            if (isset($data['contact_number'])) { $userFields[] = 'user_contact = ?'; $userParams[] = $data['contact_number']; }
            if (isset($data['username'])) { $userFields[] = 'user_username = ?'; $userParams[] = $data['username']; }
            if (!empty($data['profile_picture'])) { $userFields[] = 'user_pfp = ?'; $userParams[] = $data['profile_picture']; }

            if (!empty($userFields)) {
                $userParams[] = $userId;
                $sql = 'UPDATE tbl_users SET ' . implode(', ', $userFields) . ' WHERE user_id = ?';
                $stmt = $this->conn->prepare($sql);
                $stmt->execute($userParams);
            }

            // Update staff profile
            $staffFields = [];
            $staffParams = [];
            if (isset($data['role_title'])) { $staffFields[] = 'role_title = ?'; $staffParams[] = $data['role_title']; }
            if (array_key_exists('branch_name', $data)) { $staffFields[] = 'branch_name = ?'; $staffParams[] = $data['branch_name']; }
            if (isset($data['can_handle_bookings'])) { $staffFields[] = 'can_handle_bookings = ?'; $staffParams[] = !empty($data['can_handle_bookings']) ? 1 : 0; }
            if (array_key_exists('admin_remarks', $data)) { $staffFields[] = 'remarks = ?'; $staffParams[] = $data['admin_remarks']; }

            if (!empty($staffFields)) {
                $staffParams[] = $staffId;
                $sql = 'UPDATE tbl_staff SET ' . implode(', ', $staffFields) . ' WHERE staff_id = ?';
                $stmt = $this->conn->prepare($sql);
                $stmt->execute($staffParams);
            }

            $this->conn->commit();
            return json_encode(['status' => 'success', 'message' => 'Staff updated successfully']);
        } catch (Exception $e) {
            $this->conn->rollBack();
            return json_encode(['status' => 'error', 'message' => 'Error updating staff: ' . $e->getMessage()]);
        }
    }

    public function deleteStaff($staffId) {
        try {
            $this->conn->beginTransaction();
            $q = $this->conn->prepare('SELECT user_id FROM tbl_staff WHERE staff_id = ?');
            $q->execute([$staffId]);
            $row = $q->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                throw new Exception('Staff not found');
            }
            $userId = (int)$row['user_id'];

            // Soft deactivate user
            $u = $this->conn->prepare("UPDATE tbl_users SET account_status = 'inactive' WHERE user_id = ?");
            $u->execute([$userId]);

            $this->conn->commit();
            return json_encode(['status' => 'success', 'message' => 'Staff deactivated successfully']);
        } catch (Exception $e) {
            $this->conn->rollBack();
            return json_encode(['status' => 'error', 'message' => 'Error deactivating staff: ' . $e->getMessage()]);
        }
    }

    public function getAllOrganizers($page = 1, $limit = 20, $filters = []) {
        try {
            $offset = ($page - 1) * $limit;
            $conditions = ["u.user_role = 'organizer'"];
            $params = [];

            // Apply filters
            if (!empty($filters['search'])) {
                $conditions[] = "(u.user_firstName LIKE ? OR u.user_lastName LIKE ? OR u.user_email LIKE ?)";
                $searchTerm = '%' . $filters['search'] . '%';
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }

            if (!empty($filters['availability'])) {
                $conditions[] = "o.organizer_availability = ?";
                $params[] = $filters['availability'];
            }

            if (isset($filters['is_active']) && $filters['is_active'] !== '') {
                $conditions[] = "u.account_status = ?";
                $params[] = $filters['is_active'] === 'true' ? 'active' : 'inactive';
            }

            $whereClause = implode(' AND ', $conditions);

            // Get total count
            $countSql = "SELECT COUNT(*) FROM tbl_users u
                         LEFT JOIN tbl_organizer o ON u.user_id = o.user_id
                         WHERE $whereClause";
            $countStmt = $this->conn->prepare($countSql);
            $countStmt->execute($params);
            $totalCount = $countStmt->fetchColumn();

            // Get organizers
            $sql = "SELECT
                        u.user_id, u.user_firstName, u.user_lastName, u.user_suffix,
                        u.user_birthdate, u.user_email, u.user_contact, u.user_username,
                        u.user_pfp, u.account_status, u.created_at,
                        o.organizer_id, o.organizer_experience, o.organizer_certifications,
                        o.organizer_resume_path, o.organizer_portfolio_link,
                        o.talent_fee_min, o.talent_fee_max, o.talent_fee_currency, o.talent_fee_notes,
                        o.organizer_availability, o.remarks
                    FROM tbl_users u
                    LEFT JOIN tbl_organizer o ON u.user_id = o.user_id
                    WHERE $whereClause
                    ORDER BY u.created_at DESC
                    LIMIT ? OFFSET ?";

            $params[] = $limit;
            $params[] = $offset;

            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            $organizers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format data
            $formattedOrganizers = array_map(function($organizer) {
                return [
                    'organizer_id' => $organizer['organizer_id'],
                    'user_id' => $organizer['user_id'],
                    'first_name' => $organizer['user_firstName'],
                    'last_name' => $organizer['user_lastName'],
                    'suffix' => $organizer['user_suffix'],
                    'birthdate' => $organizer['user_birthdate'],
                    'email' => $organizer['user_email'],
                    'contact_number' => $organizer['user_contact'],
                    'username' => $organizer['user_username'],
                    'profile_picture' => $organizer['user_pfp'],
                    'is_active' => $organizer['account_status'] === 'active',
                    'experience_summary' => $organizer['organizer_experience'],
                    'certifications' => $organizer['organizer_certifications'],
                    'resume_path' => $organizer['organizer_resume_path'],
                    'portfolio_link' => $organizer['organizer_portfolio_link'],
                    'talent_fee_min' => isset($organizer['talent_fee_min']) ? (float)$organizer['talent_fee_min'] : null,
                    'talent_fee_max' => isset($organizer['talent_fee_max']) ? (float)$organizer['talent_fee_max'] : null,
                    'talent_fee_currency' => $organizer['talent_fee_currency'] ?? 'PHP',
                    'talent_fee_notes' => $organizer['talent_fee_notes'] ?? null,
                    'availability' => $organizer['organizer_availability'],
                    'remarks' => $organizer['remarks'],
                    'created_at' => $organizer['created_at']
                ];
            }, $organizers);

            return json_encode([
                "status" => "success",
                "data" => [
                    "organizers" => $formattedOrganizers,
                    "pagination" => [
                        "current_page" => $page,
                        "total_pages" => ceil($totalCount / $limit),
                        "total_count" => $totalCount,
                        "per_page" => $limit
                    ]
                ]
            ]);

        } catch (Exception $e) {
            return json_encode(["status" => "error", "message" => "Error fetching organizers: " . $e->getMessage()]);
        }
    }

    public function getOrganizerById($organizerId) {
        try {
            $sql = "SELECT
                        u.user_id, u.user_firstName, u.user_lastName, u.user_suffix,
                        u.user_birthdate, u.user_email, u.user_contact, u.user_username,
                        u.user_pfp, u.account_status, u.created_at,
                        o.organizer_id, o.organizer_experience, o.organizer_certifications,
                        o.organizer_resume_path, o.organizer_portfolio_link,
                        o.talent_fee_min, o.talent_fee_max, o.talent_fee_currency, o.talent_fee_notes,
                        o.organizer_availability, o.remarks
                    FROM tbl_users u
                    INNER JOIN tbl_organizer o ON u.user_id = o.user_id
                    WHERE o.organizer_id = ?";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$organizerId]);
            $organizer = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$organizer) {
                return json_encode(["status" => "error", "message" => "Organizer not found"]);
            }

            $formattedOrganizer = [
                'organizer_id' => $organizer['organizer_id'],
                'user_id' => $organizer['user_id'],
                'first_name' => $organizer['user_firstName'],
                'last_name' => $organizer['user_lastName'],
                'suffix' => $organizer['user_suffix'],
                'birthdate' => $organizer['user_birthdate'],
                'email' => $organizer['user_email'],
                'contact_number' => $organizer['user_contact'],
                'username' => $organizer['user_username'],
                'profile_picture' => $organizer['user_pfp'],
                'is_active' => $organizer['account_status'] === 'active',
                'experience_summary' => $organizer['organizer_experience'],
                'certifications' => $organizer['organizer_certifications'],
                'resume_path' => $organizer['organizer_resume_path'],
                'portfolio_link' => $organizer['organizer_portfolio_link'],
                'talent_fee_min' => isset($organizer['talent_fee_min']) ? (float)$organizer['talent_fee_min'] : null,
                'talent_fee_max' => isset($organizer['talent_fee_max']) ? (float)$organizer['talent_fee_max'] : null,
                'talent_fee_currency' => $organizer['talent_fee_currency'] ?? 'PHP',
                'talent_fee_notes' => $organizer['talent_fee_notes'] ?? null,
                'availability' => $organizer['organizer_availability'],
                'remarks' => $organizer['remarks'],
                'created_at' => $organizer['created_at']
            ];

            return json_encode([
                "status" => "success",
                "data" => $formattedOrganizer
            ]);

        } catch (Exception $e) {
            return json_encode(["status" => "error", "message" => "Error fetching organizer: " . $e->getMessage()]);
        }
    }

    /**
     * Syncs organizer assignments by updating the main events table with organizer IDs
     * from the organizer_event_assignments table
     */
    public function syncOrganizerAssignments() {
        try {
            // Get all assignments from the organizer_event_assignments table
            $query = "SELECT event_id, organizer_id FROM tbl_organizer_event_assignments
                    WHERE assignment_status = 'assigned' OR assignment_status = 'accepted'
                    ORDER BY event_id";

            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $updated = 0;
            $errors = 0;
            $messages = [];

            // Begin transaction for all updates
            $this->conn->beginTransaction();

            try {
                foreach ($assignments as $assignment) {
                    $eventId = $assignment['event_id'];
                    $organizerId = $assignment['organizer_id'];

                    // Only update if event exists and organizer_id is different or NULL
                    $checkQuery = "SELECT event_id, organizer_id FROM tbl_events WHERE event_id = ?";
                    $checkStmt = $this->conn->prepare($checkQuery);
                    $checkStmt->execute([$eventId]);
                    $event = $checkStmt->fetch(PDO::FETCH_ASSOC);

                    if (!$event) {
                        $messages[] = "Warning: Event ID $eventId not found in events table.";
                        continue;
                    }

                    // Skip if the event is currently assigned to admin (organizer_id is NULL)
                    // This prevents overriding admin assignments
                    if ($event['organizer_id'] === null) {
                        $messages[] = "Skipped event ID $eventId - currently assigned to admin";
                        continue;
                    }

                    if ($event['organizer_id'] != $organizerId) {
                        try {
                            $updateQuery = "UPDATE tbl_events SET organizer_id = ? WHERE event_id = ?";
                            $updateStmt = $this->conn->prepare($updateQuery);
                            $updateStmt->execute([$organizerId, $eventId]);

                            $messages[] = "Updated event ID $eventId with organizer ID $organizerId";
                            $updated++;
                        } catch (Exception $e) {
                            $messages[] = "Error updating event ID $eventId: " . $e->getMessage();
                            $errors++;
                        }
                    }
                }

                // If we get here, commit all changes
                $this->conn->commit();

                return json_encode([
                    "status" => "success",
                    "message" => "Organizer assignments synchronized successfully",
                    "stats" => [
                        "total" => count($assignments),
                        "updated" => $updated,
                        "errors" => $errors
                    ],
                    "details" => $messages
                ]);
            } catch (Exception $e) {
                $this->conn->rollBack();
                throw $e;
            }
        } catch (Exception $e) {
            error_log("syncOrganizerAssignments error: " . $e->getMessage());
            return json_encode([
                "status" => "error",
                "message" => "Failed to sync organizer assignments: " . $e->getMessage()
            ]);
        }
    }

    public function updateOrganizer($organizerId, $data) {
        try {
            $this->conn->beginTransaction();

            // Get existing organizer
            $existingStmt = $this->conn->prepare("SELECT user_id FROM tbl_organizer WHERE organizer_id = ?");
            $existingStmt->execute([$organizerId]);
            $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);

            if (!$existing) {
                throw new Exception("Organizer not found");
            }

            $userId = $existing['user_id'];

            // Update user data
            if (isset($data['first_name']) || isset($data['last_name']) || isset($data['email']) || isset($data['contact_number'])) {
                $userFields = [];
                $userParams = [];

                if (isset($data['first_name'])) {
                    $userFields[] = "user_firstName = ?";
                    $userParams[] = $data['first_name'];
                }
                if (isset($data['last_name'])) {
                    $userFields[] = "user_lastName = ?";
                    $userParams[] = $data['last_name'];
                }
                if (isset($data['suffix'])) {
                    $userFields[] = "user_suffix = ?";
                    $userParams[] = $data['suffix'];
                }
                if (isset($data['birthdate'])) {
                    $userFields[] = "user_birthdate = ?";
                    $userParams[] = $data['birthdate'];
                }
                if (isset($data['email'])) {
                    $userFields[] = "user_email = ?";
                    $userParams[] = $data['email'];
                }
                if (isset($data['contact_number'])) {
                    $userFields[] = "user_contact = ?";
                    $userParams[] = $data['contact_number'];
                }

                if (!empty($userFields)) {
                    $userParams[] = $userId;
                    $userSql = "UPDATE tbl_users SET " . implode(', ', $userFields) . " WHERE user_id = ?";
                    $userStmt = $this->conn->prepare($userSql);
                    $userStmt->execute($userParams);
                }
            }

            // Validate talent fee values (server-side)
            if ((isset($data['talent_fee_min']) && $data['talent_fee_min'] !== null && $data['talent_fee_min'] !== '' && floatval($data['talent_fee_min']) < 0)
                || (isset($data['talent_fee_max']) && $data['talent_fee_max'] !== null && $data['talent_fee_max'] !== '' && floatval($data['talent_fee_max']) < 0)) {
                throw new Exception("Talent fees cannot be negative");
            }
            if ((isset($data['talent_fee_min']) && $data['talent_fee_min'] !== '' && $data['talent_fee_min'] !== null)
                && (isset($data['talent_fee_max']) && $data['talent_fee_max'] !== '' && $data['talent_fee_max'] !== null)
                && floatval($data['talent_fee_min']) > floatval($data['talent_fee_max'])) {
                throw new Exception("Minimum talent fee cannot be greater than maximum talent fee");
            }

            // Update organizer data
            $organizerFields = [];
            $organizerParams = [];

            if (isset($data['experience_summary'])) {
                $organizerFields[] = "organizer_experience = ?";
                $organizerParams[] = $data['experience_summary'];
            }
            if (isset($data['certifications'])) {
                $organizerFields[] = "organizer_certifications = ?";
                $organizerParams[] = $data['certifications'];
            }
            if (isset($data['portfolio_link'])) {
                $organizerFields[] = "organizer_portfolio_link = ?";
                $organizerParams[] = $data['portfolio_link'];
            }
            if (array_key_exists('talent_fee_min', $data)) {
                $organizerFields[] = "talent_fee_min = ?";
                $organizerParams[] = $data['talent_fee_min'] !== '' ? $data['talent_fee_min'] : null;
            }
            if (array_key_exists('talent_fee_max', $data)) {
                $organizerFields[] = "talent_fee_max = ?";
                $organizerParams[] = $data['talent_fee_max'] !== '' ? $data['talent_fee_max'] : null;
            }
            if (isset($data['talent_fee_currency'])) {
                $organizerFields[] = "talent_fee_currency = ?";
                $organizerParams[] = $data['talent_fee_currency'] ?: 'PHP';
            }
            if (array_key_exists('talent_fee_notes', $data)) {
                $organizerFields[] = "talent_fee_notes = ?";
                $organizerParams[] = $data['talent_fee_notes'];
            }
            if (isset($data['availability'])) {
                $organizerFields[] = "organizer_availability = ?";
                $organizerParams[] = $data['availability'];
            }
            if (isset($data['remarks'])) {
                $organizerFields[] = "remarks = ?";
                $organizerParams[] = $data['remarks'];
            }

            // Handle resume upload
            if (isset($_FILES['resume']) && $_FILES['resume']['error'] === UPLOAD_ERR_OK) {
                $resumePath = $this->uploadOrganizerFile($_FILES['resume'], 'resume');
                $organizerFields[] = "organizer_resume_path = ?";
                $organizerParams[] = $resumePath;
            }

            if (!empty($organizerFields)) {
                $organizerParams[] = $organizerId;
                try {
                    $organizerSql = "UPDATE tbl_organizer SET " . implode(', ', $organizerFields) . " WHERE organizer_id = ?";
                    $organizerStmt = $this->conn->prepare($organizerSql);
                    $organizerStmt->execute($organizerParams);
                } catch (Exception $e) {
                    // Rebuild update excluding fee fields (for DBs without migration)
                    $fieldsNoFee = [];
                    $paramsNoFee = [];
                    if (isset($data['experience_summary'])) {
                        $fieldsNoFee[] = "organizer_experience = ?";
                        $paramsNoFee[] = $data['experience_summary'];
                    }
                    if (isset($data['certifications'])) {
                        $fieldsNoFee[] = "organizer_certifications = ?";
                        $paramsNoFee[] = $data['certifications'];
                    }
                    if (isset($data['portfolio_link'])) {
                        $fieldsNoFee[] = "organizer_portfolio_link = ?";
                        $paramsNoFee[] = $data['portfolio_link'];
                    }
                    if (isset($data['availability'])) {
                        $fieldsNoFee[] = "organizer_availability = ?";
                        $paramsNoFee[] = $data['availability'];
                    }
                    if (isset($data['remarks'])) {
                        $fieldsNoFee[] = "remarks = ?";
                        $paramsNoFee[] = $data['remarks'];
                    }
                    // Include resume path if it was uploaded this request
                    if (isset($resumePath)) {
                        $fieldsNoFee[] = "organizer_resume_path = ?";
                        $paramsNoFee[] = $resumePath;
                    }
                    if (!empty($fieldsNoFee)) {
                        $paramsNoFee[] = $organizerId;
                        $sqlNoFee = "UPDATE tbl_organizer SET " . implode(', ', $fieldsNoFee) . " WHERE organizer_id = ?";
                        $stmtNoFee = $this->conn->prepare($sqlNoFee);
                        $stmtNoFee->execute($paramsNoFee);
                    }
                }
            }

            // Log activity
            $this->logOrganizerActivity($organizerId, 'updated', 'Organizer profile updated', $userId);

            $this->conn->commit();

            return json_encode([
                "status" => "success",
                "message" => "Organizer updated successfully"
            ]);

        } catch (Exception $e) {
            $this->conn->rollBack();
            return json_encode(["status" => "error", "message" => "Error updating organizer: " . $e->getMessage()]);
        }
    }

    public function deleteOrganizer($organizerId) {
        try {
            $this->conn->beginTransaction();

            // Get organizer details
            $stmt = $this->conn->prepare("SELECT user_id FROM tbl_organizer WHERE organizer_id = ?");
            $stmt->execute([$organizerId]);
            $organizer = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$organizer) {
                throw new Exception("Organizer not found");
            }

            // Soft delete - update status instead of actual deletion
            $updateUserStmt = $this->conn->prepare("UPDATE tbl_users SET account_status = 'inactive' WHERE user_id = ?");
            $updateUserStmt->execute([$organizer['user_id']]);

            // Log activity
            $this->logOrganizerActivity($organizerId, 'deactivated', 'Organizer account deactivated', $organizer['user_id']);

            $this->conn->commit();

            return json_encode([
                "status" => "success",
                "message" => "Organizer deactivated successfully"
            ]);

        } catch (Exception $e) {
            $this->conn->rollBack();
            return json_encode(["status" => "error", "message" => "Error deactivating organizer: " . $e->getMessage()]);
        }
    }

    private function uploadOrganizerFile($file, $fileType) {
        $uploadDir = "uploads/organizer_documents/";
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        if ($fileType === 'profile') {
            $allowedTypes = ['jpg', 'jpeg', 'png', 'gif'];
            $maxSize = 5 * 1024 * 1024; // 5MB
        } else {
            $allowedTypes = ['pdf', 'doc', 'docx'];
            $maxSize = 10 * 1024 * 1024; // 10MB
        }

        $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        if (!in_array($fileExtension, $allowedTypes)) {
            throw new Exception("Invalid file type for $fileType.");
        }

        if ($file['size'] > $maxSize) {
            throw new Exception("File size exceeds limit for $fileType.");
        }

        $timestamp = time();
        $fileName = $timestamp . '_' . $fileType . '.' . $fileExtension;
        $filePath = $uploadDir . $fileName;

        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            throw new Exception("Failed to upload $fileType file.");
        }

        return $filePath;
    }

    private function sendOrganizerWelcomeEmail($email, $organizerName, $tempPassword, $organizerId) {
        try {
            $subject = "Welcome to Event Coordination System - Organizer Portal";
            $portalUrl = "https://noreen-events.online/auth/login"; // Production domain

            $htmlContent = $this->generateOrganizerWelcomeEmailTemplate($organizerName, $email, $tempPassword, $portalUrl);
            $textContent = $this->generateOrganizerWelcomeEmailText($organizerName, $email, $tempPassword, $portalUrl);

            // Use existing email sending functionality (PHPMailer)
            require_once 'vendor/phpmailer/phpmailer/src/PHPMailer.php';
            require_once 'vendor/phpmailer/phpmailer/src/SMTP.php';
            require_once 'vendor/phpmailer/phpmailer/src/Exception.php';

            $mail = new PHPMailer\PHPMailer\PHPMailer();
            $mail->isSMTP();
            $mail->Host = 'smtp.gmail.com'; // Update with your SMTP settings
            $mail->SMTPAuth = true;
            $mail->Username = 'your-email@gmail.com'; // Update with your email
            $mail->Password = 'your-app-password'; // Update with your app password
            $mail->SMTPSecure = 'tls';
            $mail->Port = 587;

            $mail->setFrom('your-email@gmail.com', 'Event Coordination System');
            $mail->addAddress($email, $organizerName);
            $mail->Subject = $subject;
            $mail->isHTML(true);
            $mail->Body = $htmlContent;
            $mail->AltBody = $textContent;

            if (!$mail->send()) {
                throw new Exception('Email sending failed: ' . $mail->ErrorInfo);
            }

            // Log email activity
            $this->logEmailActivity($email, $organizerName, 'organizer_welcome', $subject, 'sent', null, null, $organizerId);

        } catch (Exception $e) {
            // Log email failure
            $this->logEmailActivity($email, $organizerName, 'organizer_welcome', $subject, 'failed', $e->getMessage(), null, $organizerId);
            // Don't throw exception to prevent blocking organizer creation
            error_log("Failed to send welcome email: " . $e->getMessage());
        }
    }

    private function generateOrganizerWelcomeEmailTemplate($organizerName, $email, $tempPassword, $portalUrl) {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>Welcome to Event Coordination System</title>
        </head>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
            <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;'>
                <h1 style='color: white; margin: 0; font-size: 28px;'>Welcome to Our Team!</h1>
                <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Event Coordination System - Organizer Portal</p>
            </div>

            <div style='background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;'>
                <h2 style='color: #495057; margin-top: 0;'>Hello {$organizerName}!</h2>

                <p>We're excited to welcome you as an Event Organizer in our coordination system. Your account has been created and you're now ready to start managing events!</p>

                <div style='background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;'>
                    <h3 style='color: #495057; margin-top: 0;'>Your Account Details:</h3>
                    <p><strong>Email:</strong> {$email}</p>
                    <p><strong>Temporary Password:</strong> <code style='background: #f1f3f4; padding: 4px 8px; border-radius: 4px; font-family: monospace;'>{$tempPassword}</code></p>
                </div>

                <div style='background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;'>
                    <p style='margin: 0; color: #856404;'><strong>Important:</strong> Please change your password upon first login for security purposes.</p>
                </div>

                <div style='text-align: center; margin: 30px 0;'>
                    <a href='{$portalUrl}' style='background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;'>Access Organizer Portal</a>
                </div>

                <h3 style='color: #495057;'>What you can do as an Event Organizer:</h3>
                <ul style='color: #6c757d;'>
                    <li>Manage and coordinate events</li>
                    <li>Work with clients and suppliers</li>
                    <li>Track event progress and timelines</li>
                    <li>Generate reports and analytics</li>
                    <li>Collaborate with team members</li>
                </ul>

                <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

                <div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;'>
                    <p style='color: #6c757d; font-size: 14px; margin: 0;'>
                        Best regards,<br>
                        Event Coordination System Team
                    </p>
                </div>
            </div>
        </body>
        </html>";
    }

    private function generateOrganizerWelcomeEmailText($organizerName, $email, $tempPassword, $portalUrl) {
        return "
Welcome to Event Coordination System - Organizer Portal

Hello {$organizerName}!

We're excited to welcome you as an Event Organizer in our coordination system. Your account has been created and you're now ready to start managing events!

Your Account Details:
- Email: {$email}
- Temporary Password: {$tempPassword}

IMPORTANT: Please change your password upon first login for security purposes.

Access your organizer portal at: {$portalUrl}

What you can do as an Event Organizer:
- Manage and coordinate events
- Work with clients and suppliers
- Track event progress and timelines
- Generate reports and analytics
- Collaborate with team members

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
Event Coordination System Team
        ";
    }

    private function logOrganizerActivity($organizerId, $activityType, $description, $relatedId = null, $metadata = null) {
        try {
            // Check if activity log table exists, if not create it
            $sql = "CREATE TABLE IF NOT EXISTS tbl_organizer_activity_logs (
                        log_id INT AUTO_INCREMENT PRIMARY KEY,
                        organizer_id INT NOT NULL,
                        activity_type VARCHAR(100) NOT NULL,
                        description TEXT,
                        related_id INT,
                        metadata JSON,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )";
            $this->conn->exec($sql);

            $insertSql = "INSERT INTO tbl_organizer_activity_logs (
                            organizer_id, activity_type, description, related_id, metadata, created_at
                          ) VALUES (?, ?, ?, ?, ?, NOW())";

            $stmt = $this->conn->prepare($insertSql);
            $stmt->execute([
                $organizerId,
                $activityType,
                $description,
                $relatedId,
                json_encode($metadata)
            ]);
        } catch (Exception $e) {
            // Silently fail logging to not interrupt main operations
            error_log("Failed to log organizer activity: " . $e->getMessage());
        }
    }

    public function getActivityTimeline($adminId, $startDate = null, $endDate = null, $page = 1, $limit = 10) {
        try {
            // Debug: If no dates provided, get all data from the last 6 months
            // Use full datetimes and include next-day boundary to avoid timezone cutoffs
            if (!$startDate) $startDate = date('Y-m-d 00:00:00', strtotime('-6 months'));
            if (!$endDate) $endDate = date('Y-m-d H:i:s', strtotime('+1 day'));

            // Calculate offset for pagination
            $offset = ($page - 1) * $limit;

            // Use the comprehensive ActivityLogger if available, but gracefully fallback if it yields no data
            if ($this->logger) {
                try {
                    $filters = [
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'page' => $page,
                        'limit' => $limit
                    ];

                    $timeline = $this->logger->getActivityTimeline($filters);

                    // Determine total count (attempt a larger fetch for count)
                    $totalCount = 0;
                    if (!empty($timeline)) {
                        $countFilters = $filters;
                        unset($countFilters['page']);
                        unset($countFilters['limit']);
                        $countFilters['limit'] = 10000; // Large number to get all for counting
                        $countFilters['page'] = 1;
                        $allItems = $this->logger->getActivityTimeline($countFilters);
                        $totalCount = is_array($allItems) ? count($allItems) : 0;
                    }

                    // Only use the ActivityLogger path if it returns data
                    if (!empty($timeline) && $totalCount > 0) {
                        // Build a comprehensive dataset by merging unified view items with
                        // additional sources not covered by the view (supplier/organizer activities,
                        // package/venue creations, email events). This guarantees auth and all
                        // other transactions appear in reports.

                        // Start from the complete set from the unified view (not the paged slice)
                        $combined = is_array($allItems) ? $allItems : [];

                        try {
                            // Organizer Activities
                            $orgSql = "SELECT
                                            'organizer_activity' as action_type,
                                            oal.created_at as timestamp,
                                            CONCAT('Organizer ', u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci, ' - ', oal.activity_type COLLATE utf8mb4_general_ci, ': ', oal.description COLLATE utf8mb4_general_ci) as description,
                                            CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as user_name,
                                            'organizer' as user_type,
                                            oal.organizer_id as related_id,
                                            'organizer' as entity_type
                                        FROM tbl_organizer_activity_logs oal
                                        JOIN tbl_organizer o ON oal.organizer_id = o.organizer_id
                                        JOIN tbl_users u ON o.user_id = u.user_id
                                        WHERE oal.created_at BETWEEN ? AND ?";
                            $stmt = $this->conn->prepare($orgSql);
                            $stmt->execute([$startDate, $endDate]);
                            $combined = array_merge($combined, $stmt->fetchAll(PDO::FETCH_ASSOC));
                        } catch (Exception $e) { /* ignore */ }

                        try {
                            // Supplier Activities
                            $supSql = "SELECT
                                            'supplier_activity' as action_type,
                                            sa.created_at as timestamp,
                                            CONCAT('Supplier ',
                                  CONVERT(s.business_name USING utf8mb4) COLLATE utf8mb4_general_ci,
                                  ' - ',
                                  CONVERT(sa.activity_type USING utf8mb4) COLLATE utf8mb4_general_ci,
                                  ': ',
                                  CONVERT(sa.activity_description USING utf8mb4) COLLATE utf8mb4_general_ci
                              ) as description,
                                            s.business_name as user_name,
                                            'supplier' as user_type,
                                            sa.supplier_id as related_id,
                                            'supplier' as entity_type
                                        FROM tbl_supplier_activity sa
                                        JOIN tbl_suppliers s ON sa.supplier_id = s.supplier_id
                                        WHERE sa.created_at BETWEEN ? AND ?";
                            $stmt = $this->conn->prepare($supSql);
                            $stmt->execute([$startDate, $endDate]);
                            $combined = array_merge($combined, $stmt->fetchAll(PDO::FETCH_ASSOC));
                        } catch (Exception $e) { /* ignore */ }

                        try {
                            // Package Creations
                            $pkgSql = "SELECT
                                            'package_created' as action_type,
                                            p.created_at as timestamp,
                                            CONCAT('Package \"', p.package_title, '\" created with price ₱', FORMAT(p.package_price, 2)) as description,
                                            'Admin' as user_name,
                                            'admin' as user_type,
                                            p.package_id as related_id,
                                            'package' as entity_type
                                        FROM tbl_packages p
                                        WHERE p.created_at BETWEEN ? AND ?";
                            $stmt = $this->conn->prepare($pkgSql);
                            $stmt->execute([$startDate, $endDate]);
                            $combined = array_merge($combined, $stmt->fetchAll(PDO::FETCH_ASSOC));
                        } catch (Exception $e) { /* ignore */ }

                        try {
                            // Venue Creations
                            $venueSql = "SELECT
                                            'venue_created' as action_type,
                                            v.created_at as timestamp,
                                            CONCAT('Venue \"', v.venue_title, '\" created with capacity ', v.venue_capacity, ' and price ₱', FORMAT(COALESCE(vp.venue_price_min, 0), 2)) as description,
                                            'Admin' as user_name,
                                            'admin' as user_type,
                                            v.venue_id as related_id,
                                            'venue' as entity_type
                                        FROM tbl_venue v
                                        LEFT JOIN tbl_venue_price vp ON v.venue_id = vp.venue_id AND vp.is_active = 1
                                        WHERE v.created_at BETWEEN ? AND ?";
                            $stmt = $this->conn->prepare($venueSql);
                            $stmt->execute([$startDate, $endDate]);
                            $combined = array_merge($combined, $stmt->fetchAll(PDO::FETCH_ASSOC));
                        } catch (Exception $e) { /* ignore */ }

                        try {
                            // Supplier Creations
                            $supCreateSql = "SELECT
                                                'supplier_created' as action_type,
                                                s.created_at as timestamp,
                                                CONCAT('Supplier \"', s.business_name, '\" created in ', s.specialty_category, ' category') as description,
                                                'Admin' as user_name,
                                                'admin' as user_type,
                                                s.supplier_id as related_id,
                                                'supplier' as entity_type
                                            FROM tbl_suppliers s
                                            WHERE s.created_at BETWEEN ? AND ?";
                            $stmt = $this->conn->prepare($supCreateSql);
                            $stmt->execute([$startDate, $endDate]);
                            $combined = array_merge($combined, $stmt->fetchAll(PDO::FETCH_ASSOC));
                        } catch (Exception $e) { /* ignore */ }

                        try {
                            // Email Events
                            $emailSql = "SELECT
                                            'email_sent' as action_type,
                                            el.created_at as timestamp,
                                            CONCAT('Email sent to ', el.recipient_name, ' (', el.email_type, ')') as description,
                                            el.recipient_name as user_name,
                                            'system' as user_type,
                                            el.email_log_id as related_id,
                                            'email' as entity_type
                                        FROM tbl_email_logs el
                                        WHERE el.created_at BETWEEN ? AND ?
                                          AND el.sent_status = 'sent'";
                            $stmt = $this->conn->prepare($emailSql);
                            $stmt->execute([$startDate, $endDate]);
                            $combined = array_merge($combined, $stmt->fetchAll(PDO::FETCH_ASSOC));
                        } catch (Exception $e) { /* ignore */ }

                        // Normalize and sort combined data
                        usort($combined, function($a, $b) {
                            return strtotime(($b['timestamp'] ?? '1970-01-01')) - strtotime(($a['timestamp'] ?? '1970-01-01'));
                        });

                        // Recompute pagination on the combined dataset
                        $totalCountCombined = count($combined);
                        $pagedItems = array_slice($combined, $offset, $limit);

                        // Transform to expected format
                        $formattedTimeline = [];
                        foreach ($pagedItems as $item) {
                            $rawType = $item['action_type'] ?? '';
                            $normalizedType = in_array($rawType, ['login','user_login']) ? 'user_login'
                                : (in_array($rawType, ['logout','user_logout']) ? 'user_logout' : $rawType);
                            $formattedTimeline[] = [
                                'action_type' => $normalizedType,
                                'timestamp' => $item['timestamp'] ?? null,
                                'description' => $item['description'] ?? '',
                                'user_name' => $item['user_name'] ?? '',
                                'user_type' => $item['user_type'] ?? ($item['user_role'] ?? ''),
                                'related_id' => $item['related_id'] ?? ($item['related_entity_id'] ?? null),
                                'entity_type' => $item['entity_type'] ?? ($item['related_entity_type'] ?? ($item['action_category'] ?? 'system'))
                            ];
                        }

                        $totalPages = max(1, (int)ceil($totalCountCombined / $limit));
                        $hasNextPage = $page < $totalPages;
                        $hasPrevPage = $page > 1;

                        return json_encode([
                            "status" => "success",
                            "timeline" => $formattedTimeline,
                            "pagination" => [
                                "currentPage" => $page,
                                "totalPages" => $totalPages,
                                "totalItems" => $totalCountCombined,
                                "itemsPerPage" => $limit,
                                "hasNextPage" => $hasNextPage,
                                "hasPrevPage" => $hasPrevPage,
                                "showing" => count($formattedTimeline),
                                "showingText" => "Showing " . count($formattedTimeline) . " out of " . $totalCountCombined . " activities"
                            ],
                            "dateRange" => [
                                "startDate" => $startDate,
                                "endDate" => $endDate
                            ]
                        ]);
                    }
                } catch (Exception $e) {
                    // If the comprehensive path fails (e.g., view not present), fall through to the legacy aggregation below
                    error_log("ActivityLogger timeline path failed: " . $e->getMessage());
                }
            }

            // Fallback to old implementation if ActivityLogger is not available
            // Ensure user activity table exists first
            $this->ensureUserActivityTable();

            $timeline = [];
            $totalCount = 0;

            // 1. Get Events (Event Creation) with more details
            $eventsSql = "SELECT
                            'event_created' as action_type,
                            e.created_at as timestamp,
                            CONCAT('Event \"',
                                CONVERT(e.event_title USING utf8mb4) COLLATE utf8mb4_general_ci,
                                '\" created by client ',
                                CONVERT(u.user_firstName USING utf8mb4) COLLATE utf8mb4_general_ci,
                                ' ',
                                CONVERT(u.user_lastName USING utf8mb4) COLLATE utf8mb4_general_ci
                            ) as description,
                            CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as user_name,
                            'client' as user_type,
                            e.event_id as related_id,
                            'event' as entity_type,
                            e.event_title as event_title,
                            e.event_date as event_date,
                            e.start_time as start_time,
                            e.end_time as end_time,
                            u.user_email as user_email,
                            u.user_contact as user_contact
                         FROM tbl_events e
                         JOIN tbl_users u ON e.user_id = u.user_id
                         WHERE e.created_at BETWEEN ? AND ?";

            $stmt = $this->conn->prepare($eventsSql);
            $stmt->execute([$startDate, $endDate]);
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $timeline = array_merge($timeline, $events);

            // Debug logging
            error_log("Events found: " . count($events));
            error_log("Date range: $startDate to $endDate");
            error_log("Admin ID: $adminId");

            // 2. Get Payment Activities with more details
            $paymentsSql = "SELECT
                              'payment_received' as action_type,
                              pl.created_at as timestamp,
                              CONCAT('Payment of ₱', FORMAT(pl.amount, 2), ' received for event \"', e.event_title, '\"') as description,
                              CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as user_name,
                              'client' as user_type,
                              pl.event_id as related_id,
                              'payment' as entity_type,
                              e.event_title as event_title,
                              pl.amount as payment_amount,
                              p.payment_method as payment_method,
                              pl.reference_number as reference_number,
                              u.user_email as user_email,
                              u.user_contact as user_contact
                           FROM tbl_payment_logs pl
                           JOIN tbl_events e ON pl.event_id = e.event_id
                           JOIN tbl_users u ON pl.client_id = u.user_id
                           LEFT JOIN tbl_payments p ON pl.payment_id = p.payment_id
                           WHERE pl.created_at BETWEEN ? AND ?
                           AND pl.action_type = 'payment_received'";

            $stmt = $this->conn->prepare($paymentsSql);
            $stmt->execute([$startDate, $endDate]);
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $timeline = array_merge($timeline, $payments);

            // Debug logging
            error_log("Payments found: " . count($payments));

            // 3. Get Payment Confirmations with more details
            $confirmationsSql = "SELECT
                                  'payment_confirmed' as action_type,
                                  pl.created_at as timestamp,
                                  CONCAT('Payment of ₱', FORMAT(pl.amount, 2), ' confirmed for event \"', e.event_title, '\"') as description,
                                  CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as user_name,
                                  'client' as user_type,
                                  pl.event_id as related_id,
                                  'payment' as entity_type,
                                  e.event_title as event_title,
                                  pl.amount as payment_amount,
                                  p.payment_method as payment_method,
                                  pl.reference_number as reference_number,
                                  u.user_email as user_email,
                                  u.user_contact as user_contact
                               FROM tbl_payment_logs pl
                               JOIN tbl_events e ON pl.event_id = e.event_id
                               JOIN tbl_users u ON pl.client_id = u.user_id
                               LEFT JOIN tbl_payments p ON pl.payment_id = p.payment_id
                               WHERE pl.created_at BETWEEN ? AND ?
                               AND pl.action_type = 'payment_confirmed'";

            $stmt = $this->conn->prepare($confirmationsSql);
            $stmt->execute([$startDate, $endDate]);
            $confirmations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $timeline = array_merge($timeline, $confirmations);

            // 4. Get Booking Activities with more details
            $bookingSql = "SELECT
                            'booking_created' as action_type,
                            b.created_at as timestamp,
                            CONCAT('Booking #', b.booking_reference, ' created by ', u.user_firstName, ' ', u.user_lastName, ' for event \"', e.event_title, '\"') as description,
                            CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as user_name,
                            'client' as user_type,
                            b.booking_id as related_id,
                            'booking' as entity_type,
                            e.event_title as event_title,
                            b.booking_reference as booking_reference,
                            b.booking_status as booking_status,
                            e.total_budget as total_amount,
                            u.user_email as user_email,
                            u.user_contact as user_contact
                         FROM tbl_bookings b
                         JOIN tbl_users u ON b.user_id = u.user_id
                         LEFT JOIN tbl_events e ON b.booking_reference = e.original_booking_reference
                         WHERE b.created_at BETWEEN ? AND ?";

            $stmt = $this->conn->prepare($bookingSql);
            $stmt->execute([$startDate, $endDate]);
            $bookingActivities = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $timeline = array_merge($timeline, $bookingActivities);

            // 5. Get Organizer Activities
            $organizerSql = "SELECT
                               'organizer_activity' as action_type,
                               oal.created_at as timestamp,
                               CONCAT('Organizer ',
                                   CONVERT(u.user_firstName USING utf8mb4) COLLATE utf8mb4_general_ci,
                                   ' ',
                                   CONVERT(u.user_lastName USING utf8mb4) COLLATE utf8mb4_general_ci,
                                   ' - ',
                                   CONVERT(oal.activity_type USING utf8mb4) COLLATE utf8mb4_general_ci,
                                   ': ',
                                   CONVERT(oal.description USING utf8mb4) COLLATE utf8mb4_general_ci
                               ) as description,
                               CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as user_name,
                               'organizer' as user_type,
                               oal.organizer_id as related_id,
                               'organizer' as entity_type,
                               u.user_email as user_email,
                               u.user_contact as user_contact
                            FROM tbl_organizer_activity_logs oal
                            JOIN tbl_organizer o ON oal.organizer_id = o.organizer_id
                            JOIN tbl_users u ON o.user_id = u.user_id
                            WHERE oal.created_at BETWEEN ? AND ?";

            $stmt = $this->conn->prepare($organizerSql);
            $stmt->execute([$startDate, $endDate]);
            $organizerActivities = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $timeline = array_merge($timeline, $organizerActivities);

            // 6. Get Supplier Activities
            $supplierSql = "SELECT
                              'supplier_activity' as action_type,
                              sa.created_at as timestamp,
                              CONCAT('Supplier ',
                                  CONVERT(s.business_name USING utf8mb4) COLLATE utf8mb4_general_ci,
                                  ' - ',
                                  CONVERT(sa.activity_type USING utf8mb4) COLLATE utf8mb4_general_ci,
                                  ': ',
                                  CONVERT(sa.activity_description USING utf8mb4) COLLATE utf8mb4_general_ci
                              ) as description,
                              s.business_name as user_name,
                              'supplier' as user_type,
                              sa.supplier_id as related_id,
                              'supplier' as entity_type,
                              s.contact_email as user_email,
                              s.contact_number as user_contact
                           FROM tbl_supplier_activity sa
                           JOIN tbl_suppliers s ON sa.supplier_id = s.supplier_id
                           WHERE sa.created_at BETWEEN ? AND ?";

            $stmt = $this->conn->prepare($supplierSql);
            $stmt->execute([$startDate, $endDate]);
            $supplierActivities = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $timeline = array_merge($timeline, $supplierActivities);

            // 7. Get Package Creation Activities
            $packageSql = "SELECT
                             'package_created' as action_type,
                             p.created_at as timestamp,
                             CONCAT('Package \"', p.package_title, '\" created with price ₱', FORMAT(p.package_price, 2)) as description,
                             'Admin' as user_name,
                             'admin' as user_type,
                             p.package_id as related_id,
                             'package' as entity_type,
                             p.package_title as package_title,
                             p.package_price as package_price,
                             p.guest_capacity as guest_capacity
                          FROM tbl_packages p
                          WHERE p.created_at BETWEEN ? AND ?";

            $stmt = $this->conn->prepare($packageSql);
            $stmt->execute([$startDate, $endDate]);
            $packageActivities = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $timeline = array_merge($timeline, $packageActivities);

            // 8. Get Venue Creation Activities
            $venueSql = "SELECT
                           'venue_created' as action_type,
                           v.created_at as timestamp,
                           CONCAT('Venue \"', v.venue_title, '\" created with capacity ', v.venue_capacity, ' and price ₱', FORMAT(COALESCE(vp.venue_price_min, 0), 2)) as description,
                           'Admin' as user_name,
                           'admin' as user_type,
                           v.venue_id as related_id,
                           'venue' as entity_type,
                           v.venue_title as venue_title,
                           v.venue_capacity as venue_capacity,
                           COALESCE(vp.venue_price_min, 0) as venue_price,
                           v.venue_location as venue_location
                        FROM tbl_venue v
                        LEFT JOIN tbl_venue_price vp ON v.venue_id = vp.venue_id AND vp.is_active = 1
                        WHERE v.created_at BETWEEN ? AND ?";

            $stmt = $this->conn->prepare($venueSql);
            $stmt->execute([$startDate, $endDate]);
            $venueActivities = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $timeline = array_merge($timeline, $venueActivities);

            // 9. Get Supplier Creation Activities
            $supplierCreationSql = "SELECT
                                     'supplier_created' as action_type,
                                     s.created_at as timestamp,
                                     CONCAT('Supplier \"', s.business_name, '\" created in ', s.specialty_category, ' category') as description,
                                     'Admin' as user_name,
                                     'admin' as user_type,
                                     s.supplier_id as related_id,
                                     'supplier' as entity_type,
                                     s.business_name as business_name,
                                     s.specialty_category as specialty_category,
                                     s.contact_email as user_email,
                                     s.contact_number as user_contact
                                  FROM tbl_suppliers s
                                  WHERE s.created_at BETWEEN ? AND ?";

            $stmt = $this->conn->prepare($supplierCreationSql);
            $stmt->execute([$startDate, $endDate]);
            $supplierCreationActivities = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $timeline = array_merge($timeline, $supplierCreationActivities);

            // 10. Get Email Activities
            $emailSql = "SELECT
                           'email_sent' as action_type,
                           el.created_at as timestamp,
                           CONCAT('Email sent to ', el.recipient_name, ' (', el.email_type, ')') as description,
                           el.recipient_name as user_name,
                           'system' as user_type,
                           el.email_log_id as related_id,
                           'email' as entity_type,
                           el.recipient_email as user_email,
                           el.email_type as email_type
                        FROM tbl_email_logs el
                        WHERE el.created_at BETWEEN ? AND ?
                        AND el.sent_status = 'sent'";

            $stmt = $this->conn->prepare($emailSql);
            $stmt->execute([$startDate, $endDate]);
            $emailActivities = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $timeline = array_merge($timeline, $emailActivities);

            // 11. Get User Signups (from tbl_users)
            $signupSql = "SELECT
                             'user_signup' as action_type,
                             u.created_at as timestamp,
                             CONCAT('User ',
                                 CONVERT(u.user_firstName USING utf8mb4) COLLATE utf8mb4_general_ci,
                                 ' ',
                                 CONVERT(u.user_lastName USING utf8mb4) COLLATE utf8mb4_general_ci,
                                 ' signed up as ',
                                 CONVERT(u.user_role USING utf8mb4) COLLATE utf8mb4_general_ci
                             ) as description,
                             CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as user_name,
                             LOWER(u.user_role) as user_type,
                             u.user_id as related_id,
                             'user' as entity_type,
                             u.user_email as user_email,
                             u.user_contact as user_contact
                           FROM tbl_users u
                           WHERE u.created_at BETWEEN ? AND ?";

            $stmt = $this->conn->prepare($signupSql);
            $stmt->execute([$startDate, $endDate]);
            $signupActivities = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $timeline = array_merge($timeline, $signupActivities);

            // 12. Get User Logins (derived from last_login)
            $loginSql = "SELECT
                            'user_login' as action_type,
                            u.last_login as timestamp,
                            CONCAT('User ',
                                CONVERT(u.user_firstName USING utf8mb4) COLLATE utf8mb4_general_ci,
                                ' ',
                                CONVERT(u.user_lastName USING utf8mb4) COLLATE utf8mb4_general_ci,
                                ' logged in'
                            ) as description,
                            CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as user_name,
                            LOWER(u.user_role) as user_type,
                            u.user_id as related_id,
                            'user' as entity_type,
                            u.user_email as user_email,
                            u.user_contact as user_contact
                         FROM tbl_users u
                         WHERE u.last_login IS NOT NULL
                         AND u.last_login BETWEEN ? AND ?";

            $stmt = $this->conn->prepare($loginSql);
            $stmt->execute([$startDate, $endDate]);
            $loginActivities = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $timeline = array_merge($timeline, $loginActivities);

            // 13. Get User Activities from tbl_user_activity_logs (ALL activities)
            try {
                $userActivitySql = "SELECT
                                CASE
                                  WHEN l.action_type IN ('login','user_login') THEN 'user_login'
                                  WHEN l.action_type IN ('logout','user_logout') THEN 'user_logout'
                                  ELSE l.action_type
                                END as action_type,
                                l.created_at as timestamp,
                                l.description as description,
                                CONCAT(u.user_firstName COLLATE utf8mb4_general_ci, ' ', u.user_lastName COLLATE utf8mb4_general_ci) as user_name,
                                LOWER(l.user_role) as user_type,
                                l.user_id as related_id,
                                'user_activity' as entity_type,
                                u.user_email as user_email,
                                u.user_contact as user_contact
                              FROM tbl_user_activity_logs l
                              JOIN tbl_users u ON l.user_id = u.user_id
                              WHERE l.created_at BETWEEN ? AND ?";

                $stmt = $this->conn->prepare($userActivitySql);
                $stmt->execute([$startDate, $endDate]);
                $logoutActivities = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $timeline = array_merge($timeline, $logoutActivities);
            } catch (Exception $e) {
                // Table may not exist yet; skip gracefully
                error_log('Skipping logout aggregation: ' . $e->getMessage());
            }

            // Sort timeline by timestamp (newest first)
            usort($timeline, function($a, $b) {
                return strtotime($b['timestamp']) - strtotime($a['timestamp']);
            });

            // Get total count before pagination
            $totalCount = count($timeline);

            // Apply pagination
            $timeline = array_slice($timeline, $offset, $limit);

            // Calculate pagination info
            $totalPages = ceil($totalCount / $limit);
            $hasNextPage = $page < $totalPages;
            $hasPrevPage = $page > 1;

            // Debug logging for final result
            error_log("Total timeline items: " . count($timeline));
            error_log("Total count: " . $totalCount);
            error_log("Date range: $startDate to $endDate");
            error_log("Admin ID: $adminId");

            return json_encode([
                "status" => "success",
                "timeline" => $timeline,
                "pagination" => [
                    "currentPage" => $page,
                    "totalPages" => $totalPages,
                    "totalItems" => $totalCount,
                    "itemsPerPage" => $limit,
                    "hasNextPage" => $hasNextPage,
                    "hasPrevPage" => $hasPrevPage,
                    "showing" => count($timeline),
                    "showingText" => "Showing " . count($timeline) . " out of " . $totalCount . " transactions"
                ],
                "dateRange" => [
                    "startDate" => $startDate,
                    "endDate" => $endDate
                ],
                "summary" => [
                    "totalEvents" => count(array_filter($timeline, function($item) { return $item['entity_type'] === 'event'; })),
                    "totalPayments" => count(array_filter($timeline, function($item) { return $item['entity_type'] === 'payment'; })),
                    "totalBookings" => count(array_filter($timeline, function($item) { return $item['entity_type'] === 'booking'; })),
                    "totalOrganizers" => count(array_filter($timeline, function($item) { return $item['entity_type'] === 'organizer'; })),
                    "totalSuppliers" => count(array_filter($timeline, function($item) { return $item['entity_type'] === 'supplier'; })),
                    "totalPackages" => count(array_filter($timeline, function($item) { return $item['entity_type'] === 'package'; })),
                    "totalVenues" => count(array_filter($timeline, function($item) { return $item['entity_type'] === 'venue'; })),
                    "totalEmails" => count(array_filter($timeline, function($item) { return $item['entity_type'] === 'email'; }))
                ]
            ]);

        } catch (Exception $e) {
            error_log("getActivityTimeline error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

        // Simple session tracking and analytics methods
    public function getSessionAnalytics($adminId, $startDate = null, $endDate = null) {
        try {
            if (!$startDate) $startDate = date('Y-m-d 00:00:00', strtotime('-30 days'));
            if (!$endDate) $endDate = date('Y-m-d H:i:s', strtotime('+1 day'));

            // Get overall session statistics (simplified version)
            $sessionStatsSql = "SELECT
                u.user_role,
                COUNT(DISTINCT CASE WHEN ual.action_type = 'login' OR u.last_login BETWEEN ? AND ? THEN ual.user_id END) as unique_users_logged_in,
                COUNT(CASE WHEN ual.action_type = 'login' THEN 1 END) as total_logins,
                COUNT(CASE WHEN ual.action_type = 'logout' THEN 1 END) as total_logouts,
                COUNT(CASE WHEN ual.action_type = 'login' AND DATE(ual.created_at) = CURDATE() THEN 1 END) as logins_today,
                COUNT(CASE WHEN ual.action_type = 'logout' AND DATE(ual.created_at) = CURDATE() THEN 1 END) as logouts_today,
                COUNT(CASE WHEN ual.action_type = 'login' AND ual.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as logins_week,
                COUNT(CASE WHEN ual.action_type = 'logout' AND ual.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as logouts_week,
                0 as avg_session_duration_seconds,
                MAX(ual.created_at) as last_activity
            FROM tbl_user_activity_logs ual
            RIGHT JOIN tbl_users u ON ual.user_id = u.user_id
            WHERE (ual.created_at BETWEEN ? AND ? OR ual.created_at IS NULL)
            GROUP BY u.user_role
            ORDER BY u.user_role";

            $stmt = $this->conn->prepare($sessionStatsSql);
            $stmt->execute([$startDate, $endDate, $startDate, $endDate]);
            $roleStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get daily login/logout trends
            $trendSql = "SELECT
                DATE(ual.created_at) as activity_date,
                ual.action_type,
                COUNT(*) as count,
                u.user_role
            FROM tbl_user_activity_logs ual
            JOIN tbl_users u ON ual.user_id = u.user_id
            WHERE ual.created_at BETWEEN ? AND ?
            AND ual.action_type IN ('login', 'logout')
            GROUP BY DATE(ual.created_at), ual.action_type, u.user_role
            ORDER BY activity_date DESC, u.user_role";

            $stmt = $this->conn->prepare($trendSql);
            $stmt->execute([$startDate, $endDate]);
            $trends = $stmt->fetchAll(PDO::FETCH_ASSOC);

                        // Get active users (users who logged in recently)
            $activeUsersSql = "SELECT
                u.user_firstName,
                u.user_lastName,
                u.user_email,
                u.user_role,
                u.last_login as login_time,
                u.last_login as last_activity,
                '' as ip_address,
                TIMESTAMPDIFF(MINUTE, u.last_login, NOW()) as session_duration_minutes
            FROM tbl_users u
            WHERE u.last_login >= DATE_SUB(NOW(), INTERVAL 1 DAY)
            AND u.last_login IS NOT NULL
            ORDER BY u.last_login DESC
            LIMIT 20";

            $stmt = $this->conn->prepare($activeUsersSql);
            $stmt->execute();
            $activeSessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // No failed login tracking for now - keep it simple
            $failedLogins = [];

            // Calculate summary metrics
            $totalLogins = array_sum(array_column($roleStats, 'total_logins'));
            $totalLogouts = array_sum(array_column($roleStats, 'total_logouts'));
            $totalUniqueUsers = array_sum(array_column($roleStats, 'unique_users_logged_in'));
            $avgSessionDuration = 0;

            $sessionDurations = array_filter(array_column($roleStats, 'avg_session_duration_seconds'));
            if (!empty($sessionDurations)) {
                $avgSessionDuration = array_sum($sessionDurations) / count($sessionDurations);
            }

            return json_encode([
                "status" => "success",
                "data" => [
                    "roleStats" => $roleStats,
                    "trends" => $trends,
                    "activeSessions" => $activeSessions,
                    "failedLogins" => $failedLogins,
                    "summary" => [
                        "totalLogins" => $totalLogins,
                        "totalLogouts" => $totalLogouts,
                        "totalUniqueUsers" => $totalUniqueUsers,
                        "activeSessionsCount" => count($activeSessions),
                        "avgSessionDurationMinutes" => round($avgSessionDuration / 60, 2),
                        "failedLoginsCount" => count($failedLogins)
                    ]
                ],
                "dateRange" => [
                    "startDate" => $startDate,
                    "endDate" => $endDate
                ]
            ]);

        } catch (Exception $e) {
            error_log("getSessionAnalytics error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

        public function getDetailedSessionLogs($adminId, $startDate = null, $endDate = null, $userRole = null, $page = 1, $limit = 20) {
        try {
            if (!$startDate) $startDate = date('Y-m-d 00:00:00', strtotime('-30 days'));
            if (!$endDate) $endDate = date('Y-m-d H:i:s', strtotime('+1 day'));

            $offset = ($page - 1) * $limit;

            // Build the WHERE clause
            $whereClause = "WHERE ual.created_at BETWEEN ? AND ?";
            $params = [$startDate, $endDate];

            if ($userRole && $userRole !== 'all') {
                $whereClause .= " AND u.user_role = ?";
                $params[] = $userRole;
            }

            // Get total count for pagination
            $countSql = "SELECT COUNT(*) as total
                        FROM tbl_user_activity_logs ual
                        JOIN tbl_users u ON ual.user_id = u.user_id
                        $whereClause
                        AND ual.action_type IN ('login', 'logout')";

            $stmt = $this->conn->prepare($countSql);
            $stmt->execute($params);
            $totalCount = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Get the detailed session logs (simplified)
            $logsSql = "SELECT
                ual.id,
                ual.action_type,
                ual.created_at,
                ual.description,
                ual.ip_address,
                '' as login_method,
                TRUE as success,
                '' as failure_reason,
                u.user_id,
                u.user_firstName,
                u.user_lastName,
                u.user_email,
                u.user_role,
                u.user_contact,
                'N/A' as formatted_session_duration
            FROM tbl_user_activity_logs ual
            JOIN tbl_users u ON ual.user_id = u.user_id
            $whereClause
            AND ual.action_type IN ('login', 'logout')
            ORDER BY ual.created_at DESC
            LIMIT ? OFFSET ?";

            $params[] = $limit;
            $params[] = $offset;
            $stmt = $this->conn->prepare($logsSql);
            $stmt->execute($params);
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate pagination info
            $totalPages = ceil($totalCount / $limit);
            $hasNextPage = $page < $totalPages;
            $hasPrevPage = $page > 1;

            return json_encode([
                "status" => "success",
                "logs" => $logs,
                "pagination" => [
                    "currentPage" => $page,
                    "totalPages" => $totalPages,
                    "totalItems" => $totalCount,
                    "itemsPerPage" => $limit,
                    "hasNextPage" => $hasNextPage,
                    "hasPrevPage" => $hasPrevPage,
                    "showing" => count($logs),
                    "showingText" => "Showing " . count($logs) . " out of " . $totalCount . " session logs"
                ],
                "dateRange" => [
                    "startDate" => $startDate,
                    "endDate" => $endDate
                ],
                "filters" => [
                    "userRole" => $userRole
                ]
            ]);

        } catch (Exception $e) {
            error_log("getDetailedSessionLogs error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function terminateUserSession($adminId, $sessionId, $reason = 'admin_terminated') {
        try {
            // Verify admin permissions
            $adminStmt = $this->conn->prepare("SELECT user_role FROM tbl_users WHERE user_id = ? AND user_role = 'admin'");
            $adminStmt->execute([$adminId]);
            if (!$adminStmt->fetch()) {
                return json_encode(["status" => "error", "message" => "Insufficient permissions"]);
            }

            // For now, just log the termination action - simplified approach
            return json_encode([
                "status" => "success",
                "message" => "Session termination logged (feature simplified for current setup)",
                "session_id" => $sessionId
            ]);

        } catch (Exception $e) {
            error_log("terminateUserSession error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function getUserSessionHistory($adminId, $userId, $startDate = null, $endDate = null, $limit = 50) {
        try {
            if (!$startDate) $startDate = date('Y-m-d 00:00:00', strtotime('-90 days'));
            if (!$endDate) $endDate = date('Y-m-d H:i:s', strtotime('+1 day'));

                        // Get user session history (simplified)
            $historySql = "SELECT
                ual.action_type,
                ual.created_at,
                ual.description,
                ual.ip_address,
                '' as login_method,
                TRUE as success,
                '' as failure_reason,
                'N/A' as formatted_session_duration
            FROM tbl_user_activity_logs ual
            WHERE ual.user_id = ?
            AND ual.created_at BETWEEN ? AND ?
            AND ual.action_type IN ('login', 'logout')
            ORDER BY ual.created_at DESC
            LIMIT ?";

            $stmt = $this->conn->prepare($historySql);
            $stmt->execute([$userId, $startDate, $endDate, $limit]);
            $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get user details
            $userStmt = $this->conn->prepare("SELECT user_firstName, user_lastName, user_email, user_role FROM tbl_users WHERE user_id = ?");
            $userStmt->execute([$userId]);
            $user = $userStmt->fetch(PDO::FETCH_ASSOC);

            // Get session statistics for this user (simplified)
            $statsSql = "SELECT
                COUNT(CASE WHEN action_type = 'login' THEN 1 END) as successful_logins,
                0 as failed_logins,
                COUNT(CASE WHEN action_type = 'logout' THEN 1 END) as total_logouts,
                0 as avg_session_duration,
                COUNT(DISTINCT ip_address) as unique_ips,
                MAX(created_at) as last_activity
            FROM tbl_user_activity_logs
            WHERE user_id = ? AND created_at BETWEEN ? AND ?";

            $stmt = $this->conn->prepare($statsSql);
            $stmt->execute([$userId, $startDate, $endDate]);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "user" => $user,
                "history" => $history,
                "statistics" => $stats,
                "dateRange" => [
                    "startDate" => $startDate,
                    "endDate" => $endDate
                ]
            ]);

        } catch (Exception $e) {
            error_log("getUserSessionHistory error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    // Activity logging helper function for staff operations
    public function logActivity($actionType, $resourceType, $resourceId, $description) {
        try {
            if (!$this->logger) return;

            // Get current user from session or request
            $userId = $_SESSION['user_id'] ?? null;
            $userRole = $_SESSION['user_role'] ?? 'staff';
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

            if (!$userId) return;

            $this->logger->logActivity($userId, $actionType, $description, $userRole, $ipAddress);
        } catch (Exception $e) {
            error_log("Activity logging failed: " . $e->getMessage());
        }
    }

    // Simple activity logging helper function (legacy)
    public function logActivityLegacy($userId, $actionType, $description, $userRole = null, $ipAddress = null) {
        try {
            // Use the existing connection but with autocommit to avoid transaction conflicts
            $this->conn->setAttribute(PDO::ATTR_AUTOCOMMIT, true);

            // Get user role if not provided
            if (!$userRole) {
                $userStmt = $this->conn->prepare("SELECT user_role FROM tbl_users WHERE user_id = ?");
                $userStmt->execute([$userId]);
                $user = $userStmt->fetch(PDO::FETCH_ASSOC);
                $userRole = $user ? $user['user_role'] : 'unknown';
            }

            // Ensure user activity logs table exists
            $this->ensureUserActivityTable();

            // Log the activity
            $stmt = $this->conn->prepare("INSERT INTO tbl_user_activity_logs (user_id, action_type, description, user_role, ip_address, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
            $stmt->execute([$userId, $actionType, $description, $userRole, $ipAddress]);

            return true;
        } catch (Exception $e) {
            error_log("Activity logging error: " . $e->getMessage());
            return false;
        }
    }

    // Organizer Assignment Methods
    public function assignOrganizerToEvent($data) {
        try {
            $eventId = (int)($data['event_id'] ?? 0);
            $organizerId = (int)($data['organizer_id'] ?? 0);
            $assignedBy = (int)($data['assigned_by'] ?? 0);
            $notes = $data['notes'] ?? null;

            if ($eventId <= 0) {
                return json_encode(["status" => "error", "message" => "Valid event ID required"]);
            }

            if ($organizerId <= 0) {
                return json_encode(["status" => "error", "message" => "Valid organizer ID required"]);
            }

            if ($assignedBy <= 0) {
                return json_encode(["status" => "error", "message" => "Valid admin ID required"]);
            }

            // Validate that the organizer exists in tbl_organizer
            $organizerCheck = $this->conn->prepare("SELECT organizer_id FROM tbl_organizer WHERE organizer_id = ?");
            $organizerCheck->execute([$organizerId]);
            if (!$organizerCheck->fetch()) {
                return json_encode(["status" => "error", "message" => "Organizer not found in database"]);
            }

            // Call the stored procedure to assign organizer
            // Note: The stored procedure handles its own transaction management
            try {
                $stmt = $this->conn->prepare("CALL AssignOrganizerToEvent(?, ?, ?, ?)");
                $stmt->execute([$eventId, $organizerId, $assignedBy, $notes]);
            } catch (Exception $e) {
                error_log("AssignOrganizerToEvent stored procedure error: " . $e->getMessage());
                return json_encode(["status" => "error", "message" => "Failed to assign organizer: " . $e->getMessage()]);
            }

            // Log the activity
            $this->logActivity($assignedBy, 'organizer_assigned', "Assigned organizer ID $organizerId to event ID $eventId", 'admin');

            // Get the previous organizer (if any) to notify them of the change
            $prevOrganizerStmt = $this->conn->prepare("SELECT organizer_id FROM tbl_events WHERE event_id = ? AND organizer_id IS NOT NULL AND organizer_id != ?");
            $prevOrganizerStmt->execute([$eventId, $organizerId]);
            $prevOrganizer = $prevOrganizerStmt->fetch(PDO::FETCH_ASSOC);

            // Create notification for the organizer
            try {
                // Get event details for the notification
                $eventStmt = $this->conn->prepare("SELECT event_title, event_date FROM tbl_events WHERE event_id = ?");
                $eventStmt->execute([$eventId]);
                $eventData = $eventStmt->fetch(PDO::FETCH_ASSOC);

                if ($eventData) {
                    $notificationStmt = $this->conn->prepare("
                        INSERT INTO tbl_notifications (
                            user_id, notification_type, notification_title, notification_message,
                            notification_priority, notification_icon, notification_url,
                            event_id, expires_at
                        ) VALUES (
                            ?, 'organizer_assignment', 'New Event Assignment', ?,
                            'high', 'calendar-check', ?,
                            ?, DATE_ADD(NOW(), INTERVAL 7 DAY)
                        )
                    ");

                    $message = "You have been assigned to event \"{$eventData['event_title']}\" scheduled for {$eventData['event_date']}. Please review the event details and accept or reject the assignment.";
                    $url = "/organizer/events/{$eventId}";

                    $notificationStmt->execute([
                        $organizerId,
                        $message,
                        $url,
                        $eventId
                    ]);

                    // If there was a previous organizer, notify them of the change
                    if ($prevOrganizer && $prevOrganizer['organizer_id'] != $organizerId) {
                        $prevMessage = "Your assignment to event \"{$eventData['event_title']}\" has been reassigned to another organizer.";
                        $prevUrl = "/organizer/events";

                        $prevNotificationStmt = $this->conn->prepare("
                            INSERT INTO tbl_notifications (
                                user_id, notification_type, notification_title, notification_message,
                                notification_priority, notification_icon, notification_url,
                                event_id, expires_at
                            ) VALUES (
                                ?, 'assignment_removed', 'Assignment Reassigned', ?,
                                'medium', 'user-x', ?,
                                ?, DATE_ADD(NOW(), INTERVAL 3 DAY)
                            )
                        ");

                        $prevNotificationStmt->execute([
                            $prevOrganizer['organizer_id'],
                            $prevMessage,
                            $prevUrl,
                            $eventId
                        ]);
                    }
                }
            } catch (Exception $notifyError) {
                // Log notification error but don't fail the assignment
                error_log("Failed to create organizer notification: " . $notifyError->getMessage());
            }

            return json_encode([
                "status" => "success",
                "message" => "Organizer assigned successfully",
                "data" => [
                    "event_id" => $eventId,
                    "organizer_id" => $organizerId,
                    "assigned_by" => $assignedBy
                ]
            ]);

        } catch (Exception $e) {
            error_log("assignOrganizerToEvent error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Failed to assign organizer: " . $e->getMessage()]);
        }
    }

    public function getEventOrganizerDetails($eventId) {
        try {
            $eventId = (int)$eventId;
            if ($eventId <= 0) {
                return json_encode(["status" => "error", "message" => "Valid event ID required"]);
            }
            $result = null;
            try {
                // First try to get any assigned/accepted organizer
                $stmt = $this->conn->prepare("CALL GetEventOrganizerDetails(?)");
                $stmt->execute([$eventId]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);

                // If we got results, handle any missing profile picture
                if ($result) {
                    // Augment with profile picture if missing
                    if (!isset($result['profile_picture']) || empty($result['profile_picture'])) {
                        try {
                            $orgId = 0;
                            if (isset($result['organizer_id'])) {
                                $orgId = (int)$result['organizer_id'];
                            } elseif (isset($result['organizer_organizer_id'])) {
                                $orgId = (int)$result['organizer_organizer_id'];
                            }
                            if ($orgId > 0) {
                                $q = $this->conn->prepare("SELECT u.user_pfp AS profile_picture FROM tbl_organizer o JOIN tbl_users u ON o.user_id = u.user_id WHERE o.organizer_id = ? LIMIT 1");
                                $q->execute([$orgId]);
                                $row = $q->fetch(PDO::FETCH_ASSOC);
                                if ($row && isset($row['profile_picture'])) {
                                    $result['profile_picture'] = $row['profile_picture'];
                                }
                            }
                        } catch (Exception $ie) {
                            // no-op; optional enrichment
                        }
                    }
                } else {
                    // No assigned/accepted organizer found, look for pending assignments
                    error_log("No assigned/accepted organizer found, checking for pending assignments for event ID: $eventId");
                    throw new Exception('Procedure returned no rows');
                }
            } catch (Exception $e) {
                error_log("GetEventOrganizerDetails procedure failed, using direct query: " . $e->getMessage());

                // Try direct query to get ANY organizer status (including pending)
                $sql = "
                    SELECT
                        e.event_id,
                        e.event_title,
                        e.organizer_id,
                        o.organizer_id as organizer_organizer_id,
                        CONCAT(CONVERT(u.user_firstName USING utf8mb4) COLLATE utf8mb4_general_ci,
                              ' ',
                              CONVERT(u.user_lastName USING utf8mb4) COLLATE utf8mb4_general_ci
                        ) as organizer_name,
                        u.user_email as organizer_email,
                        u.user_contact as organizer_phone,
                        u.user_pfp as profile_picture,
                        o.organizer_experience,
                        o.organizer_certifications,
                        o.organizer_availability,
                        eoa.assignment_id AS organizer_assignment_id,
                        eoa.assigned_by,
                        CONCAT(CONVERT(admin.user_firstName USING utf8mb4) COLLATE utf8mb4_general_ci,
                              ' ',
                              CONVERT(admin.user_lastName USING utf8mb4) COLLATE utf8mb4_general_ci
                        ) as assigned_by_name,
                        eoa.assigned_at,
                        eoa.status as assignment_status,
                        eoa.notes as assignment_notes
                    FROM tbl_events e
                    LEFT JOIN tbl_event_organizer_assignments eoa ON e.event_id = eoa.event_id
                    LEFT JOIN tbl_organizer o ON eoa.organizer_id = o.organizer_id
                    LEFT JOIN tbl_users u ON o.user_id = u.user_id
                    LEFT JOIN tbl_users admin ON eoa.assigned_by = admin.user_id
                    WHERE e.event_id = ?
                    ORDER BY
                        FIELD(eoa.status, 'accepted', 'assigned', 'pending', 'rejected')
                    LIMIT 1
                ";
                $fallback = $this->conn->prepare($sql);
                $fallback->execute([$eventId]);
                $result = $fallback->fetch(PDO::FETCH_ASSOC);
            }

            if (!$result) {
                return json_encode([
                    "status" => "success",
                    "data" => null,
                    "message" => "No organizer assigned to this event"
                ]);
            }

            // Ensure consistent key name expected by frontend
            if (!isset($result['organizer_assignment_id']) && isset($result['assignment_id'])) {
                $result['organizer_assignment_id'] = $result['assignment_id'];
            }

            return json_encode([
                "status" => "success",
                "data" => $result
            ]);

        } catch (Exception $e) {
            error_log("getEventOrganizerDetails error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Failed to get organizer details: " . $e->getMessage()]);
        }
    }

    public function getOrganizerEvents($organizerId) {
        try {
            $organizerId = (int)$organizerId;
            if ($organizerId <= 0) {
                return json_encode(["status" => "error", "message" => "Valid organizer ID required"]);
            }

            $stmt = $this->conn->prepare("CALL GetOrganizerEvents(?)");
            $stmt->execute([$organizerId]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return json_encode([
                "status" => "success",
                "data" => $results
            ]);

        } catch (Exception $e) {
            error_log("getOrganizerEvents error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Failed to get organizer events: " . $e->getMessage()]);
        }
    }

    public function updateOrganizerAssignmentStatus($data) {
        try {
            $assignmentId = (int)($data['assignment_id'] ?? 0);
            $status = $data['status'] ?? '';
            $updatedBy = (int)($data['updated_by'] ?? 0);

            if ($assignmentId <= 0) {
                return json_encode(["status" => "error", "message" => "Valid assignment ID required"]);
            }

            if (!in_array($status, ['assigned', 'accepted', 'rejected', 'removed'])) {
                return json_encode(["status" => "error", "message" => "Invalid status"]);
            }

            if ($updatedBy <= 0) {
                return json_encode(["status" => "error", "message" => "Valid user ID required"]);
            }

            // Call the stored procedure to update status
            $stmt = $this->conn->prepare("CALL UpdateOrganizerAssignmentStatus(?, ?, ?)");
            $stmt->execute([$assignmentId, $status, $updatedBy]);

            // Log the activity
            $this->logActivity($updatedBy, 'organizer_assignment_updated', "Updated organizer assignment ID $assignmentId to status $status", 'admin');

            return json_encode([
                "status" => "success",
                "message" => "Organizer assignment status updated successfully",
                "data" => [
                    "assignment_id" => $assignmentId,
                    "status" => $status,
                    "updated_by" => $updatedBy
                ]
            ]);

        } catch (Exception $e) {
            error_log("updateOrganizerAssignmentStatus error: " . $e->getMessage());
            return json_encode(["status" => "error", "message" => "Failed to update assignment status: " . $e->getMessage()]);
        }
    }

    // Ensure user activity logs table exists
    private function ensureUserActivityTable() {
        try {
            $sql = "CREATE TABLE IF NOT EXISTS tbl_user_activity_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                action_type ENUM('login','logout','signup','event_created','booking_created','payment_received','admin_action','booking_accepted','booking_rejected','package_edited') NOT NULL,
                description TEXT NULL,
                user_role ENUM('admin','organizer','client','supplier','staff') NOT NULL,
                ip_address VARCHAR(64) NULL,
                user_agent TEXT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_activity_user (user_id),
                INDEX idx_user_activity_action (action_type),
                INDEX idx_user_activity_date (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
            $this->conn->exec($sql);
        } catch (Exception $e) {
            error_log("Failed ensuring tbl_user_activity_logs: " . $e->getMessage());
        }
    }
}

if (!$pdo) {
    echo json_encode(["status" => "error", "message" => "Database connection failed"]);
    exit();
}

// Read JSON input from frontend (for POST requests)
$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput, true);

// Debug logging for troubleshooting
error_log("Admin.php - Request method: " . $_SERVER['REQUEST_METHOD']);
error_log("Admin.php - Content type: " . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));
error_log("Admin.php - Raw input length: " . strlen($rawInput));
error_log("Admin.php - Raw input: " . $rawInput);
error_log("Admin.php - JSON decode error: " . json_last_error_msg());
error_log("Admin.php - Decoded data: " . json_encode($data));
error_log("Admin.php - POST data: " . json_encode($_POST));
error_log("Admin.php - GET data: " . json_encode($_GET));

// Additional debugging for updatePackage specifically
if (isset($data['operation']) && $data['operation'] === 'updatePackage') {
    error_log("Admin.php - updatePackage operation detected");
    error_log("Admin.php - updatePackage data keys: " . implode(', ', array_keys($data)));
    error_log("Admin.php - updatePackage package_id: " . ($data['package_id'] ?? 'not set'));
}

// Handle JSON parsing errors
if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
    error_log("Admin.php - JSON parsing failed: " . json_last_error_msg());
    echo json_encode([
        "status" => "error",
        "message" => "Invalid JSON data: " . json_last_error_msg(),
        "raw_input" => $rawInput
    ]);
    exit;
}

// Fallback: if JSON parsing failed but we have POST data, use that
if (empty($data) && !empty($_POST)) {
    error_log("Admin.php - Using POST data as fallback");
    $data = $_POST;
}

// Ensure $data is an array
if (!is_array($data)) {
    $data = [];
}

// Check if operation is provided via GET or POST
$operation = $_POST['operation'] ?? ($_GET['operation'] ?? ($data['operation'] ?? ''));

error_log("Staff.php - Operation: " . $operation);
error_log("Staff.php - Final data: " . json_encode($data));

// error_log("Staff.php - Operation: " . $operation);
// error_log("Staff.php - All data: " . json_encode($data));
// error_log("Staff.php - POST: " . json_encode($_POST));
// error_log("Staff.php - GET: " . json_encode($_GET));

$staff = new Staff($pdo);

// Function to send delivery status notifications
function sendDeliveryStatusNotification($eventId, $componentId, $status, $deliveryDate = null, $notes = null) {
    global $pdo;

    try {
        // Get event details
        $eventStmt = $pdo->prepare("
            SELECT e.event_title, e.event_date, e.user_id, e.admin_id, e.organizer_id,
                   c.user_email as client_email, c.user_firstName as client_first_name, c.user_lastName as client_last_name,
                   a.user_email as admin_email, a.user_firstName as admin_first_name, a.user_lastName as admin_last_name,
                   o.user_email as organizer_email, o.user_firstName as organizer_first_name, o.user_lastName as organizer_last_name
            FROM tbl_events e
            LEFT JOIN tbl_users c ON e.user_id = c.user_id
            LEFT JOIN tbl_users a ON e.admin_id = a.user_id
            LEFT JOIN tbl_organizer org ON e.organizer_id = org.organizer_id
            LEFT JOIN tbl_users o ON org.user_id = o.user_id
            WHERE e.event_id = ?
        ");
        $eventStmt->execute([$eventId]);
        $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

        if (!$event) return false;

        // Get component details
        $componentStmt = $pdo->prepare("SELECT component_name FROM tbl_event_components WHERE component_id = ?");
        $componentStmt->execute([$componentId]);
        $component = $componentStmt->fetch(PDO::FETCH_ASSOC);

        if (!$component) return false;

        // Create notification message
        $statusText = ucfirst($status);
        $message = "Delivery status updated for '{$component['component_name']}' to {$statusText}";
        if ($deliveryDate) {
            $message .= " on " . date('M d, Y', strtotime($deliveryDate));
        }
        if ($notes) {
            $message .= ". Notes: {$notes}";
        }

        // Insert notifications for client, admin, and organizer
        $notifications = [];

        if ($event['client_email']) {
            $notifications[] = [
                'user_id' => $event['user_id'],
                'type' => 'delivery_update',
                'title' => 'Component Delivery Update',
                'message' => $message,
                'related_id' => $eventId,
                'metadata' => json_encode(['component_id' => $componentId, 'status' => $status])
            ];
        }

        if ($event['admin_email']) {
            $notifications[] = [
                'user_id' => $event['admin_id'],
                'type' => 'delivery_update',
                'title' => 'Component Delivery Update',
                'message' => $message,
                'related_id' => $eventId,
                'metadata' => json_encode(['component_id' => $componentId, 'status' => $status])
            ];
        }

        if ($event['organizer_email']) {
            $notifications[] = [
                'user_id' => $event['organizer_id'],
                'type' => 'delivery_update',
                'title' => 'Component Delivery Update',
                'message' => $message,
                'related_id' => $eventId,
                'metadata' => json_encode(['component_id' => $componentId, 'status' => $status])
            ];
        }

        // Insert notifications
        $insertStmt = $pdo->prepare("
            INSERT INTO tbl_notifications (user_id, notification_type, notification_title, notification_message, event_id)
            VALUES (?, ?, ?, ?, ?)
        ");

        foreach ($notifications as $notification) {
            $insertStmt->execute([
                $notification['user_id'],
                $notification['type'],
                $notification['title'],
                $notification['message'],
                $notification['related_id']
            ]);
        }

        return true;
    } catch (Exception $e) {
        error_log("sendDeliveryStatusNotification error: " . $e->getMessage());
        return false;
    }
}

// Function to check staff permissions for operations
function checkStaffOperationPermission($operation) {
    // Define which operations are restricted for staff
    $restrictedOperations = [
        // Staff management operations - completely blocked
        'getAllStaff', 'createStaff', 'updateStaff', 'deleteStaff',

        // Event creation/deletion - blocked (only allow updates)
        'createEvent', 'deleteEvent',

        // Package management - blocked (only allow viewing)
        'createPackage', 'updatePackage', 'deletePackage',

        // Venue management - blocked (only allow viewing)
        'createVenue', 'updateVenue', 'deleteVenue',

        // Client deletion - blocked (allow create/edit)
        'deleteClient',

        // Organizer management - blocked (only allow viewing)
        'createOrganizer', 'updateOrganizer', 'deleteOrganizer',

        // Supplier management - blocked (only allow viewing)
        'createSupplier', 'updateSupplier', 'deleteSupplier',

        // Payment deletion - blocked (allow create/verify)
        'deletePayment',

        // Report operations - blocked
        'getReports', 'generateReport', 'exportReport',

        // System operations - blocked
        'getSystemSettings', 'updateSystemSettings'
    ];

    return !in_array($operation, $restrictedOperations);
}

// Wrap entire execution in try-catch to handle any uncaught exceptions
try {
    // Check staff permissions for restricted operations
    if (!checkStaffOperationPermission($operation)) {
        echo json_encode([
            "status" => "error",
            "message" => "Access denied - insufficient permissions for this operation"
        ]);
        exit;
    }

    // Handle API actions
    switch ($operation) {
    case "test":
        // Test database connection
        try {
            $testQuery = "SELECT 1 as test";
            $testStmt = $pdo->prepare($testQuery);
            $testStmt->execute();
            $testResult = $testStmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                "status" => "success",
                "message" => "API and database are working",
                "timestamp" => date('Y-m-d H:i:s'),
                "database_test" => $testResult,
                "received_data" => $data
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "status" => "error",
                "message" => "Database connection failed",
                "error" => $e->getMessage(),
                "timestamp" => date('Y-m-d H:i:s')
            ]);
        }
        break;
    case "debugUpdatePackage":
        error_log("Admin.php - debugUpdatePackage case reached");
        error_log("Admin.php - debugUpdatePackage data: " . json_encode($data));

        // Test if we can create a simple response
        $testResponse = [
            "status" => "success",
            "message" => "Debug updatePackage test",
            "received_data" => $data,
            "timestamp" => date('Y-m-d H:i:s')
        ];

        error_log("Admin.php - debugUpdatePackage test response: " . json_encode($testResponse));
        echo json_encode($testResponse);
        break;
    case "testUpdatePackage":
        // Test updatePackage method specifically
        try {
            $testData = [
                'package_id' => 1,
                'package_title' => 'Test Package',
                'package_description' => 'Test Description',
                'package_price' => 1000,
                'guest_capacity' => 50,
                'components' => [],
                'freebies' => [],
                'venues' => [],
                'event_types' => []
            ];
            echo $staff->updatePackage($testData);
        } catch (Exception $e) {
            echo json_encode([
                "status" => "error",
                "message" => "updatePackage test failed",
                "error" => $e->getMessage()
            ]);
        }
        break;
    case "createEvent":
        error_log("Admin.php - Starting createEvent operation");
        try {
            error_log("Admin.php - Starting createEvent with data: " . json_encode($data));
            $result = $staff->createEvent($data);
            error_log("Admin.php - createEvent result: " . $result);

            // Ensure we have a valid result
            if (empty($result)) {
                error_log("Admin.php - Empty result from createEvent function");
                throw new Exception("Empty result from createEvent function");
            }

            // Decode to verify it's valid JSON
            $decoded = json_decode($result, true);
            if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
                error_log("Admin.php - Invalid JSON response from createEvent: " . json_last_error_msg());
                throw new Exception("Invalid JSON response from createEvent: " . json_last_error_msg());
            }

            // Clear any previous output
            if (ob_get_length()) {
                ob_clean();
            }

            error_log("Admin.php - Sending response: " . $result);
            // Send the response
            echo $result;
        } catch (Exception $e) {
            error_log("Admin.php - createEvent exception: " . $e->getMessage());
            $errorResponse = json_encode([
                "status" => "error",
                "message" => "Failed to create event: " . $e->getMessage()
            ]);
            error_log("Admin.php - Sending error response: " . $errorResponse);
            echo $errorResponse;
        }
        break;
    case "getAllVendors":
        echo $staff->getAllVendors();
        break;
    case "createPackage":
        echo $staff->createPackage($data);
        break;
    case "getAllPackages":
        echo $staff->getAllPackages();
        break;
    case "getPackageById":
        $packageId = $_GET['package_id'] ?? ($data['package_id'] ?? 0);
        echo $staff->getPackageById($packageId);
        break;
    case "getPackageDetails":
        $packageId = $_GET['package_id'] ?? ($data['package_id'] ?? 0);
        error_log("Admin.php - getPackageDetails case called with packageId: " . $packageId);
        error_log("Admin.php - GET data: " . json_encode($_GET));
        error_log("Admin.php - POST data: " . json_encode($data));
        echo $staff->getPackageDetails($packageId);
        break;
    case "updatePackage":
        error_log("Admin.php - updatePackage case called");
        error_log("Admin.php - updatePackage data: " . json_encode($data));
        $result = $staff->updatePackage($data);
        error_log("Admin.php - updatePackage result: " . $result);
        echo $result;
        break;
    case "deletePackage":
        $packageId = $_GET['package_id'] ?? ($data['package_id'] ?? 0);
        echo $staff->deletePackage($packageId);
        break;
    case "getEventTypes":
        echo $staff->getEventTypes();
        break;
    case "updatePackageEventTypes":
        echo $staff->updatePackageEventTypes($data);
        break;
    case "getPackagesByEventType":
        $eventTypeId = $_GET['event_type_id'] ?? ($data['event_type_id'] ?? 0);
        echo $staff->getPackagesByEventType($eventTypeId);
        break;
    case "getClients":
        echo $staff->getClients();
        break;
    case "createClient":
        $clientData = [
            'firstName' => $data['firstName'] ?? '',
            'lastName' => $data['lastName'] ?? '',
            'email' => $data['email'] ?? '',
            'contact' => $data['contact'] ?? '',
            'address' => $data['address'] ?? '',
            'password' => $data['password'] ?? ''
        ];
        echo $staff->createClient($clientData);
        break;
    case "getAllEvents":
        echo $staff->getAllEvents();
        break;
    case "getClientEvents":
        $userId = $_GET['user_id'] ?? ($data['user_id'] ?? 0);
        echo $staff->getClientEvents($userId);
        break;
    case "checkEventConflicts":
        $eventDate = $_GET['event_date'] ?? ($data['event_date'] ?? '');
        $startTime = $_GET['start_time'] ?? ($data['start_time'] ?? '');
        $endTime = $_GET['end_time'] ?? ($data['end_time'] ?? '');
        $excludeEventId = $_GET['exclude_event_id'] ?? ($data['exclude_event_id'] ?? null);
        echo $staff->checkEventConflicts($eventDate, $startTime, $endTime, $excludeEventId);
        break;
    case "getCalendarConflictData":
        $startDate = $_GET['start_date'] ?? ($data['start_date'] ?? '');
        $endDate = $_GET['end_date'] ?? ($data['end_date'] ?? '');
        echo $staff->getCalendarConflictData($startDate, $endDate);
        break;
    case "getEventById":
        $eventId = $_GET['event_id'] ?? ($data['event_id'] ?? 0);
        echo $staff->getEventById($eventId);
        break;
    case "getEnhancedEventDetails":
        $eventId = $_GET['event_id'] ?? ($data['event_id'] ?? 0);
        echo $staff->getEnhancedEventDetails($eventId);
        break;
    case "getBookingByReference":
        $reference = $_GET['reference'] ?? ($data['reference'] ?? '');
        echo $staff->getBookingByReference($reference);
        break;
    case "updateBookingStatus":
        $bookingId = $_GET['booking_id'] ?? ($data['booking_id'] ?? 0);
        $status = $_GET['status'] ?? ($data['status'] ?? '');
        $result = $staff->updateBookingStatus($bookingId, $status);

        // Log activity if successful
        if ($result && json_decode($result, true)['status'] === 'success') {
            $staff->logActivity('update_booking_status', 'booking', $bookingId, "Updated booking status to: $status");
        }

        echo $result;
        break;
    case "acceptBooking":
        $bookingId = $_GET['booking_id'] ?? ($data['booking_id'] ?? 0);
        $userId = $_GET['user_id'] ?? ($data['user_id'] ?? 0);
        $userRole = $_GET['user_role'] ?? ($data['user_role'] ?? 'staff');
        $result = $staff->acceptBooking($bookingId, $userId, $userRole);

        // Log activity if successful
        if ($result && json_decode($result, true)['status'] === 'success') {
            $staff->logActivity('accept_booking', 'booking', $bookingId, "Accepted booking");
        }

        echo $result;
        break;
    case "confirmBooking":
        $bookingReference = $_GET['booking_reference'] ?? ($data['booking_reference'] ?? '');
        echo $staff->confirmBooking($bookingReference);
        break;
    case "getAllBookings":
        echo $staff->getAllBookings();
        break;
    case "getUserProfilePicture":
        $userId = $_GET['user_id'] ?? ($data['user_id'] ?? 0);
        echo $staff->getUserProfilePicture($userId);
        break;
    case "getAvailableBookings":
        echo $staff->getAvailableBookings();
        break;
    case "getConfirmedBookings":
        echo $staff->getConfirmedBookings();
        break;
    case "testBookings":
        echo $staff->testBookings();
        break;
    case "searchBookings":
        $search = $_GET['search'] ?? ($data['search'] ?? '');
        echo $staff->searchBookings($search);
        break;
    case "getEventByBookingReference":
        $bookingReference = $_GET['booking_reference'] ?? ($data['booking_reference'] ?? '');
        echo $staff->getEventByBookingReference($bookingReference);
        break;
    case "testBookingsTable":
        echo $staff->testBookingsTable();
        break;
    case "createVenue":
        echo $staff->createVenue();
        break;
    case "setVenuePaxRate":
        $venueId = $_GET['venue_id'] ?? ($data['venue_id'] ?? 0);
        $paxRate = $_GET['pax_rate'] ?? ($data['pax_rate'] ?? 0);
        echo $staff->setVenuePaxRate($venueId, $paxRate);
        break;
    case "checkAndFixVenuePaxRates":
        echo $staff->checkAndFixVenuePaxRates();
        break;
    case "testVenueData":
        echo $staff->testVenueData();
        break;
    case "getAllVenues":
        $includeInactive = $_GET['include_inactive'] ?? ($data['include_inactive'] ?? false);
        echo $staff->getAllVenues($includeInactive);
        break;
    case "getVenueById":
        $venueId = $_GET['venue_id'] ?? ($data['venue_id'] ?? 0);
        echo $staff->getVenueById($venueId);
        break;
    case "updateVenue":
        echo $staff->updateVenueWithPriceHistory();
        break;
    case "deleteVenueImage":
        echo $staff->deleteVenueImage($data);
        break;
    case "duplicateVenue":
        $venueId = $_GET['venue_id'] ?? ($data['venue_id'] ?? 0);
        echo $staff->duplicateVenue($venueId);
        break;
    case "deleteVenue":
        $venueId = $_GET['venue_id'] ?? ($data['venue_id'] ?? 0);
        echo $staff->deleteVenue($venueId);
        break;
    case "duplicatePackage":
        $packageId = $_GET['package_id'] ?? ($data['package_id'] ?? 0);
        echo $staff->duplicatePackage($packageId);
        break;
    case "getVenuesForPackage":
        echo $staff->getVenuesForPackage();
        break;
    case "getAllAvailableVenues":
        echo $staff->getAllAvailableVenues();
        break;
    case "calculateVenuePricing":
        $venueId = $_GET['venue_id'] ?? ($data['venue_id'] ?? 0);
        $guestCount = $_GET['guest_count'] ?? ($data['guest_count'] ?? 100);
        echo $staff->calculateVenuePricing($venueId, $guestCount);
        break;
    case "createPackageWithVenues":
        echo $staff->createPackageWithVenues($data);
        break;
    case "getPackageBudgetBreakdown":
        $packageId = $_GET['package_id'] ?? ($data['package_id'] ?? 0);
        echo $staff->getPackageBudgetBreakdown($packageId);
        break;
    case "validatePackageBudget":
        $packageId = $_GET['package_id'] ?? ($data['package_id'] ?? 0);
        $components = $_GET['components'] ?? ($data['components'] ?? []);
        echo $staff->validatePackageBudget($packageId, $components);
        break;
    case "getDashboardMetrics":
        $adminId = $_GET['admin_id'] ?? ($data['admin_id'] ?? 0);
        echo $staff->getDashboardMetrics($adminId);
        break;
    case "getUpcomingEvents":
        $adminId = $_GET['admin_id'] ?? ($data['admin_id'] ?? 0);
        $limit = $_GET['limit'] ?? ($data['limit'] ?? 5);
        echo $staff->getUpcomingEvents($adminId, $limit);
        break;
    case "getRecentPayments":
        $adminId = $_GET['admin_id'] ?? ($data['admin_id'] ?? 0);
        $limit = $_GET['limit'] ?? ($data['limit'] ?? 5);
        echo $staff->getRecentPayments($adminId, $limit);
        break;
    case "createPayment":
        $result = $staff->createPayment($data);

        // Log activity if successful
        if ($result && json_decode($result, true)['status'] === 'success') {
            $paymentData = json_decode($result, true);
            $eventId = $data['event_id'] ?? 'unknown';
            $amount = $data['amount'] ?? 'unknown';
            $staff->logActivity('create_payment', 'payment', $eventId, "Created payment of $amount for event $eventId");
        }

        echo $result;
        break;
    case "getEventPayments":
        $eventId = $_GET['event_id'] ?? ($data['event_id'] ?? 0);
        echo $staff->getEventPayments($eventId);
        break;
    case "getClientPayments":
        $clientId = $_GET['client_id'] ?? ($data['client_id'] ?? 0);
        echo $staff->getClientPayments($clientId);
        break;
    case "getAdminPayments":
        $adminId = $_GET['admin_id'] ?? ($data['admin_id'] ?? 0);
        echo $staff->getAdminPayments($adminId);
        break;
    case "updatePaymentStatus":
        $paymentId = $_GET['payment_id'] ?? ($data['payment_id'] ?? 0);
        $status = $_GET['status'] ?? ($data['status'] ?? '');
        $notes = $_GET['notes'] ?? ($data['notes'] ?? null);
        echo $staff->updatePaymentStatus($paymentId, $status, $notes);
        break;
    case "getPaymentSchedule":
        $eventId = $_GET['event_id'] ?? ($data['event_id'] ?? 0);
        echo $staff->getPaymentSchedule($eventId);
        break;
    case "getEventsWithPaymentStatus":
        $adminId = $_GET['admin_id'] ?? ($data['admin_id'] ?? 0);
        echo $staff->getEventsWithPaymentStatus($adminId);
        break;
    case "getPaymentAnalytics":
        $adminId = $_GET['admin_id'] ?? ($data['admin_id'] ?? 0);
        $startDate = $_GET['start_date'] ?? ($data['start_date'] ?? null);
        $endDate = $_GET['end_date'] ?? ($data['end_date'] ?? null);
        echo $staff->getPaymentAnalytics($adminId, $startDate, $endDate);
        break;
    case "createPaymentSchedule":
        echo $staff->createPaymentSchedule($data);
        break;
    case "getEventPaymentSchedule":
        $eventId = $_GET['event_id'] ?? ($data['event_id'] ?? 0);
        echo $staff->getEventPaymentSchedule($eventId);
        break;
    case "getPaymentScheduleTypes":
        echo $staff->getPaymentScheduleTypes();
        break;
    case "recordScheduledPayment":
        echo $staff->recordScheduledPayment($data);
        break;
    case "getPaymentLogs":
        $eventId = $_GET['event_id'] ?? ($data['event_id'] ?? 0);
        echo $staff->getPaymentLogs($eventId);
        break;
    case "getAdminPaymentLogs":
        $adminId = $_GET['admin_id'] ?? ($data['admin_id'] ?? 0);
        $limit = $_GET['limit'] ?? ($data['limit'] ?? 50);
        echo $staff->getAdminPaymentLogs($adminId, $limit);
        break;
    case "getEnhancedPaymentDashboard":
        $adminId = $_GET['admin_id'] ?? ($data['admin_id'] ?? 0);
        echo $staff->getEnhancedPaymentDashboard($adminId);
        break;
    case "getAnalyticsData":
        $adminId = $_GET['admin_id'] ?? ($data['admin_id'] ?? 0);
        $startDate = $_GET['start_date'] ?? ($data['start_date'] ?? null);
        $endDate = $_GET['end_date'] ?? ($data['end_date'] ?? null);
        echo $staff->getAnalyticsData($adminId, $startDate, $endDate);
        break;
    case "getReportsData":
        $adminId = $_GET['admin_id'] ?? ($data['admin_id'] ?? 0);
        $reportType = $_GET['report_type'] ?? ($data['report_type'] ?? 'summary');
        $startDate = $_GET['start_date'] ?? ($data['start_date'] ?? null);
        $endDate = $_GET['end_date'] ?? ($data['end_date'] ?? null);
        echo $staff->getReportsData($adminId, $reportType, $startDate, $endDate);
        break;
    case "getActivityTimeline":
        $adminId = $_GET['admin_id'] ?? ($data['admin_id'] ?? 0);
        $startDate = $_GET['start_date'] ?? ($data['start_date'] ?? null);
        $endDate = $_GET['end_date'] ?? ($data['end_date'] ?? null);
        $page = (int)($_GET['page'] ?? ($data['page'] ?? 1));
        $limit = (int)($_GET['limit'] ?? ($data['limit'] ?? 10));
        echo $staff->getActivityTimeline($adminId, $startDate, $endDate, $page, $limit);
        break;
    case "logTestActivity":
        $userId = $_GET['user_id'] ?? ($data['user_id'] ?? 7);
        $result = $staff->logActivity($userId, 'login', 'Admin logged in manually', 'admin', $_SERVER['REMOTE_ADDR'] ?? null);
        echo json_encode(["status" => $result ? "success" : "error", "message" => $result ? "Activity logged" : "Failed to log"]);
        break;
    case "getSessionAnalytics":
        $adminId = $_GET['admin_id'] ?? ($data['admin_id'] ?? 0);
        $startDate = $_GET['start_date'] ?? ($data['start_date'] ?? null);
        $endDate = $_GET['end_date'] ?? ($data['end_date'] ?? null);
        echo $staff->getSessionAnalytics($adminId, $startDate, $endDate);
        break;
    case "getDetailedSessionLogs":
        $adminId = $_GET['admin_id'] ?? ($data['admin_id'] ?? 0);
        $startDate = $_GET['start_date'] ?? ($data['start_date'] ?? null);
        $endDate = $_GET['end_date'] ?? ($data['end_date'] ?? null);
        $userRole = $_GET['user_role'] ?? ($data['user_role'] ?? null);
        $page = (int)($_GET['page'] ?? ($data['page'] ?? 1));
        $limit = (int)($_GET['limit'] ?? ($data['limit'] ?? 20));
        echo $staff->getDetailedSessionLogs($adminId, $startDate, $endDate, $userRole, $page, $limit);
        break;
    case "terminateUserSession":
        $adminId = $_GET['admin_id'] ?? ($data['admin_id'] ?? 0);
        $sessionId = $_GET['session_id'] ?? ($data['session_id'] ?? '');
        $reason = $_GET['reason'] ?? ($data['reason'] ?? 'admin_terminated');
        echo $staff->terminateUserSession($adminId, $sessionId, $reason);
        break;
    case "getUserSessionHistory":
        $adminId = $_GET['admin_id'] ?? ($data['admin_id'] ?? 0);
        $userId = $_GET['user_id'] ?? ($data['user_id'] ?? 0);
        $startDate = $_GET['start_date'] ?? ($data['start_date'] ?? null);
        $endDate = $_GET['end_date'] ?? ($data['end_date'] ?? null);
        $limit = (int)($_GET['limit'] ?? ($data['limit'] ?? 50));
        echo $staff->getUserSessionHistory($adminId, $userId, $startDate, $endDate, $limit);
        break;
    case "getUserProfile":
        $userId = $_GET['user_id'] ?? ($data['user_id'] ?? 0);
        echo $staff->getUserProfile($userId);
        break;
    case "updateUserProfile":
        echo $staff->updateUserProfile($data);
        break;
    case "changePassword":
        echo $staff->changePassword($data);
        break;
    case "getWebsiteSettings":
        echo $staff->getWebsiteSettings();
        break;
    case "updateWebsiteSettings":
        echo $staff->updateWebsiteSettings($data['settings']);
        break;
    case "getAllFeedbacks":
        echo $staff->getAllFeedbacks();
        break;
    case "deleteFeedback":
        $feedbackId = $_GET['feedback_id'] ?? ($data['feedback_id'] ?? 0);
        echo $staff->deleteFeedback($feedbackId);
        break;
    case "uploadFile":
        if (isset($_FILES['file'])) {
            $fileType = $_POST['fileType'] ?? 'misc';
            echo $staff->uploadFile($_FILES['file'], $fileType);
        } else {
            echo json_encode(["status" => "error", "message" => "No file uploaded"]);
        }
        break;
    case "uploadProfilePicture":
        if (isset($_FILES['file'])) {
            $userId = $_POST['user_id'] ?? 0;
            echo $staff->uploadProfilePicture($_FILES['file'], $userId);
        } else {
            echo json_encode(["status" => "error", "message" => "No file uploaded"]);
        }
        break;
    case "saveWeddingDetails":
        echo $staff->saveWeddingDetails($data);
        break;
    case "getWeddingDetails":
        $eventId = $_GET['event_id'] ?? ($data['event_id'] ?? 0);
        echo $staff->getWeddingDetails($eventId);
        break;
    case "runWeddingMigration":
        echo $staff->runWeddingMigration();
        break;
    case "describeWeddingTable":
        echo $staff->describeWeddingTable();
        break;
    case "testWeddingInsert":
        echo $staff->testWeddingInsert();
        break;
    case "uploadPaymentProof":
        if (isset($_FILES['file'])) {
            $eventId = $_POST['event_id'] ?? ($data['event_id'] ?? 0);
            $description = $_POST['description'] ?? ($data['description'] ?? '');
            $proofType = $_POST['proof_type'] ?? ($data['proof_type'] ?? 'receipt');
            echo $staff->uploadPaymentProof($eventId, $_FILES['file'], $description, $proofType);
        } else {
            echo json_encode(["status" => "error", "message" => "No file uploaded"]);
        }
        break;
    case "getPaymentProofs":
        $eventId = $_GET['event_id'] ?? ($data['event_id'] ?? 0);
        echo $staff->getPaymentProofs($eventId);
        break;
    case "attachPaymentProof":
        if (isset($_FILES['file'])) {
            $paymentId = $_POST['payment_id'] ?? ($data['payment_id'] ?? 0);
            $description = $_POST['description'] ?? ($data['description'] ?? '');
            $proofType = $_POST['proof_type'] ?? ($data['proof_type'] ?? 'receipt');
            echo $staff->attachPaymentProof($paymentId, $_FILES['file'], $description, $proofType);
        } else {
            echo json_encode(["status" => "error", "message" => "No file uploaded"]);
        }
        break;
    case "deletePaymentProof":
        $paymentId = $_POST['payment_id'] ?? ($data['payment_id'] ?? 0);
        $fileName = $_POST['file_name'] ?? ($data['file_name'] ?? '');
        echo $staff->deletePaymentProof($paymentId, $fileName);
        break;
    case "getEventsForPayments":
        $adminId = $_GET['admin_id'] ?? ($data['admin_id'] ?? 0);
        $searchTerm = $_GET['search_term'] ?? ($data['search_term'] ?? '');
        echo $staff->getEventsForPayments($adminId, $searchTerm);
        break;
    case "getEventPaymentDetails":
        $eventId = $_GET['event_id'] ?? ($data['event_id'] ?? 0);
        echo $staff->getEventPaymentDetails($eventId);
        break;
    case "uploadPaymentAttachment":
        if (isset($_FILES['file'])) {
            $eventId = $_POST['event_id'] ?? ($data['event_id'] ?? 0);
            $paymentId = $_POST['payment_id'] ?? ($data['payment_id'] ?? 0);
            $description = $_POST['description'] ?? ($data['description'] ?? '');
            echo $staff->uploadPaymentAttachment($eventId, $paymentId, $_FILES['file'], $description);
        } else {
            echo json_encode(["status" => "error", "message" => "No file uploaded"]);
        }
        break;
    case "addEventComponent":
        echo $staff->addEventComponent($data);
        break;
    case "updateEventComponent":
        echo $staff->updateEventComponent($data);
        break;
    case "deleteEventComponent":
        $componentId = $_GET['component_id'] ?? ($data['component_id'] ?? 0);
        echo $staff->deleteEventComponent($componentId);
        break;
    case "updateComponentPaymentStatus":
        try {
            $result = $staff->updateComponentPaymentStatus($data);
            // Validate JSON
            $decoded = json_decode($result, true);
            if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Invalid JSON response from updateComponentPaymentStatus: " . json_last_error_msg());
            }
            if (ob_get_length()) { ob_clean(); }
            http_response_code(200);
            echo $result;
        } catch (Exception $e) {
            if (ob_get_length()) { ob_clean(); }
            http_response_code(200);
            echo json_encode(["status" => "error", "message" => "Failed to update component payment status: " . $e->getMessage()]);
        }
        break;
    case "updateOrganizerPaymentStatus":
        try {
            $result = $staff->updateOrganizerPaymentStatus($data);
            $decoded = json_decode($result, true);
            if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Invalid JSON response from updateOrganizerPaymentStatus: " . json_last_error_msg());
            }
            if (ob_get_length()) { ob_clean(); }
            http_response_code(200);
            echo $result;
        } catch (Exception $e) {
            if (ob_get_length()) { ob_clean(); }
            http_response_code(200);
            echo json_encode(["status" => "error", "message" => "Failed to update organizer payment status: " . $e->getMessage()]);
        }
        break;
    case "updateVenuePaymentStatus":
        try {
            $result = $staff->updateVenuePaymentStatus($data);
            $decoded = json_decode($result, true);
            if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Invalid JSON response from updateVenuePaymentStatus: " . json_last_error_msg());
            }
            if (ob_get_length()) { ob_clean(); }
            http_response_code(200);
            echo $result;
        } catch (Exception $e) {
            if (ob_get_length()) { ob_clean(); }
            http_response_code(200);
            echo json_encode(["status" => "error", "message" => "Failed to update venue payment status: " . $e->getMessage()]);
        }
        break;
    case "getEventPaymentStats":
        $eventId = $_GET['event_id'] ?? ($data['event_id'] ?? 0);
        echo $staff->getEventPaymentStats($eventId);
        break;
    case "updateEventBudget":
        error_log("Admin.php - updateEventBudget case reached");
        $eventId = $_GET['event_id'] ?? ($data['event_id'] ?? 0);
        $budgetChange = $_GET['budget_change'] ?? ($data['budget_change'] ?? 0);
        error_log("Admin.php - updateEventBudget params: eventId=$eventId, budgetChange=$budgetChange");
        echo $staff->updateEventBudget($eventId, $budgetChange);
        break;
    case "getPackageVenues":
        $packageId = $_GET['package_id'] ?? ($data['package_id'] ?? 0);
        echo $staff->getPackageVenues($packageId);
        break;
    case "updateEventVenue":
        $eventId = $_GET['event_id'] ?? ($data['event_id'] ?? 0);
        $venueId = $_GET['venue_id'] ?? ($data['venue_id'] ?? 0);
        echo $staff->updateEventVenue($eventId, $venueId);
        break;
    case "updateEventOrganizer":
        $eventId = $_GET['event_id'] ?? ($data['event_id'] ?? 0);
        $organizerId = $_GET['organizer_id'] ?? ($data['organizer_id'] ?? null);
        echo $staff->updateEventOrganizer($eventId, $organizerId);
        break;
    case "updateEventFinalization":
        $eventId = $_GET['event_id'] ?? ($data['event_id'] ?? 0);
        $action = $_GET['action'] ?? ($data['action'] ?? 'finalize');
        echo $staff->updateEventFinalization($eventId, $action);
        break;
    case "createPackageWithVenues":
        echo $staff->createPackageWithVenues($data);
        break;
    case "createPackage":
        echo $staff->createPackage($data);
        break;
    case "getAllPackages":
        echo $staff->getAllPackages();
        break;
    case "getPackageById":
        $packageId = $_GET['package_id'] ?? ($data['package_id'] ?? 0);
        echo $staff->getPackageById($packageId);
        break;
    case "deletePackage":
        $packageId = $_GET['package_id'] ?? ($data['package_id'] ?? 0);
        echo $staff->deletePackage($packageId);
        break;
    case "getPackagesByEventType":
        $eventTypeId = $_GET['event_type_id'] ?? ($data['event_type_id'] ?? 0);
        echo $staff->getPackagesByEventType($eventTypeId);
        break;

        // Supplier management operations
    case "createSupplier":
        // Handle FormData for file uploads
        $supplierData = $_POST;

        // Convert string booleans to actual booleans
        if (isset($supplierData['agreement_signed'])) {
            $supplierData['agreement_signed'] = ($supplierData['agreement_signed'] === 'true' || $supplierData['agreement_signed'] === '1');
        }
        if (isset($supplierData['is_verified'])) {
            $supplierData['is_verified'] = ($supplierData['is_verified'] === 'true' || $supplierData['is_verified'] === '1');
        }
        if (isset($supplierData['send_email'])) {
            $supplierData['send_email'] = ($supplierData['send_email'] === 'true' || $supplierData['send_email'] === '1');
        }
        if (isset($supplierData['create_user_account'])) {
            $supplierData['create_user_account'] = ($supplierData['create_user_account'] === 'true' || $supplierData['create_user_account'] === '1');
        }

        // Handle file uploads - process files if they exist
        if (!empty($_FILES)) {
            $documents = [];
            foreach ($_FILES as $fieldName => $file) {
                if ($file['error'] === UPLOAD_ERR_OK) {
                    // Extract document type from field name (e.g., documents[dti] -> dti)
                    if (preg_match('/documents\[(.+)\]/', $fieldName, $matches)) {
                        $documentType = $matches[1];

                        // Create upload directory if it doesn't exist
                        $uploadDir = 'uploads/supplier_documents/' . $documentType . '/';
                        if (!file_exists($uploadDir)) {
                            mkdir($uploadDir, 0755, true);
                        }

                        // Generate unique filename
                        $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
                        $fileName = uniqid() . '_' . time() . '.' . $fileExtension;
                        $filePath = $uploadDir . $fileName;

                        // Move uploaded file
                        if (move_uploaded_file($file['tmp_name'], $filePath)) {
                            $documents[] = [
                                'document_type' => $documentType,
                                'document_title' => $file['name'],
                                'file_name' => $fileName,
                                'file_path' => $filePath,
                                'file_size' => $file['size'],
                                'file_type' => $file['type']
                            ];
                        }
                    }
                }
            }

            if (!empty($documents)) {
                $supplierData['documents'] = $documents;
            }
        }

        echo $staff->createSupplier($supplierData);
        break;
    case "getAllSuppliers":
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 20);
        $filters = [
            'supplier_type' => $_GET['supplier_type'] ?? '',
            'specialty_category' => $_GET['specialty_category'] ?? '',
            'is_verified' => $_GET['is_verified'] ?? '',
            'onboarding_status' => $_GET['onboarding_status'] ?? '',
            'search' => $_GET['search'] ?? ''
        ];
        echo $staff->getAllSuppliers($page, $limit, $filters);
        break;
    case "getSuppliersForEventBuilder":
        $page = (int)($_GET['page'] ?? ($data['page'] ?? 1));
        $limit = (int)($_GET['limit'] ?? ($data['limit'] ?? 100));
        $filters = [
            'specialty_category' => $_GET['specialty_category'] ?? ($data['specialty_category'] ?? ''),
            'search' => $_GET['search'] ?? ($data['search'] ?? '')
        ];
        echo $staff->getSuppliersForEventBuilder($page, $limit, $filters);
        break;
    case "getSuppliersForPackage":
        $page = (int)($_GET['page'] ?? ($data['page'] ?? 1));
        $limit = (int)($_GET['limit'] ?? ($data['limit'] ?? 100));
        $filters = [
            'specialty_category' => $_GET['specialty_category'] ?? ($data['specialty_category'] ?? ''),
            'search' => $_GET['search'] ?? ($data['search'] ?? '')
        ];
        echo $staff->getSuppliersForPackage($page, $limit, $filters);
        break;
    case "getSupplierById":
        $supplierId = (int)($_GET['supplier_id'] ?? 0);
        if ($supplierId <= 0) {
            echo json_encode(["status" => "error", "message" => "Valid supplier ID required"]);
        } else {
            echo $staff->getSupplierById($supplierId);
        }
        break;
    case "updateSupplier":
        $supplierId = (int)($_GET['supplier_id'] ?? 0);
        if ($supplierId <= 0) {
            echo json_encode(["status" => "error", "message" => "Valid supplier ID required"]);
        } else {
            // Handle FormData for file uploads
            $supplierData = $_POST;

            // Convert string booleans to actual booleans
            if (isset($supplierData['agreement_signed'])) {
                $supplierData['agreement_signed'] = ($supplierData['agreement_signed'] === 'true' || $supplierData['agreement_signed'] === '1');
            }
            if (isset($supplierData['is_verified'])) {
                $supplierData['is_verified'] = ($supplierData['is_verified'] === 'true' || $supplierData['is_verified'] === '1');
            }

            echo $staff->updateSupplier($supplierId, $supplierData);
        }
        break;
    case "deleteSupplier":
        $supplierId = (int)($_GET['supplier_id'] ?? 0);
        if ($supplierId <= 0) {
            echo json_encode(["status" => "error", "message" => "Valid supplier ID required"]);
        } else {
            echo $staff->deleteSupplier($supplierId);
        }
        break;
    case "getSupplierCategories":
        echo $staff->getSupplierCategories();
        break;
    case "getSupplierStats":
        echo $staff->getSupplierStats();
        break;
    case "getSupplierDocuments":
        $supplierId = (int)($_GET['supplier_id'] ?? 0);
        $documentType = $_GET['document_type'] ?? null;
        if ($supplierId <= 0) {
            echo json_encode(["status" => "error", "message" => "Valid supplier ID required"]);
        } else {
            echo $staff->getSupplierDocuments($supplierId, $documentType);
        }
        break;
    case "getDocumentTypes":
        echo $staff->getDocumentTypes();
        break;

    // Organizer Management
    case "createOrganizer":
        echo $staff->createOrganizer($data);
        break;
    case "getAllOrganizers":
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 20);
        $filters = [
            'search' => $_GET['search'] ?? '',
            'availability' => $_GET['availability'] ?? '',
            'is_active' => $_GET['is_active'] ?? ''
        ];
        echo $staff->getAllOrganizers($page, $limit, $filters);
        break;
    case "getOrganizerById":
        $organizerId = (int)($_GET['organizer_id'] ?? 0);
        if ($organizerId <= 0) {
            echo json_encode(["status" => "error", "message" => "Valid organizer ID required"]);
        } else {
            echo $staff->getOrganizerById($organizerId);
        }
        break;
    case "updateOrganizer":
        $organizerId = (int)($_GET['organizer_id'] ?? ($data['organizer_id'] ?? 0));
        if ($organizerId <= 0) {
            echo json_encode(["status" => "error", "message" => "Valid organizer ID required"]);
        } else {
            echo $staff->updateOrganizer($organizerId, $data);
        }
        break;
    case "deleteOrganizer":
        $organizerId = (int)($_GET['organizer_id'] ?? 0);
        if ($organizerId <= 0) {
            echo json_encode(["status" => "error", "message" => "Valid organizer ID required"]);
        } else {
            echo $staff->deleteOrganizer($organizerId);
        }
        break;

    // Organizer Assignment Operations
    case "assignOrganizerToEvent":
        echo $staff->assignOrganizerToEvent($data);
        break;
    case "getEventOrganizerDetails":
        $eventId = (int)($_GET['event_id'] ?? ($data['event_id'] ?? 0));
        if ($eventId <= 0) {
            echo json_encode(["status" => "error", "message" => "Valid event ID required"]);
        } else {
            echo $staff->getEventOrganizerDetails($eventId);
        }
        break;
    case "getOrganizerEvents":
        $organizerId = (int)($_GET['organizer_id'] ?? ($data['organizer_id'] ?? 0));
        if ($organizerId <= 0) {
            echo json_encode(["status" => "error", "message" => "Valid organizer ID required"]);
        } else {
            echo $staff->getOrganizerEvents($organizerId);
        }
        break;
    case "updateOrganizerAssignmentStatus":
        echo $staff->updateOrganizerAssignmentStatus($data);
        break;

    // Staff Management
    case "createStaff":
        echo $staff->createStaff($data);
        break;
    case "getAllStaff":
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 20);
        $filters = [
            'search' => $_GET['search'] ?? '',
            'status' => $_GET['status'] ?? '',
            'role' => $_GET['role'] ?? ''
        ];
        echo $staff->getAllStaff($page, $limit, $filters);
        break;
    case "updateStaff":
        $staffId = (int)($_GET['staff_id'] ?? ($data['staff_id'] ?? 0));
        if ($staffId <= 0) {
            echo json_encode(["status" => "error", "message" => "Valid staff ID required"]);
        } else {
            echo $staff->updateStaff($staffId, $data);
        }
        break;
    case "deleteStaff":
        $staffId = (int)($_GET['staff_id'] ?? ($data['staff_id'] ?? 0));
        if ($staffId <= 0) {
            echo json_encode(["status" => "error", "message" => "Valid staff ID required"]);
        } else {
            echo $staff->deleteStaff($staffId);
        }
        break;

    // Customized Package operations
    case "createCustomizedPackage":
        echo $staff->createCustomizedPackage($data);
        break;

    // File upload operations
    case "upload":
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            echo json_encode(["status" => "error", "message" => "No file uploaded or upload error"]);
        } else {
            $fileType = $_POST['type'] ?? 'misc';
            echo $staff->uploadFile($_FILES['file'], $fileType);
        }
        break;

    case "syncOrganizerAssignments":
        echo $staff->syncOrganizerAssignments();
        break;

    case "getEventDeliveryProgress":
        $eventId = (int)($data['event_id'] ?? 0);
        if ($eventId <= 0) {
            echo json_encode(["status" => "error", "message" => "Valid event ID required"]);
        } else {
            try {
                // Get delivery progress
                $sql = "SELECT
                            COUNT(*) as total_components,
                            SUM(CASE WHEN is_included = 1 THEN 1 ELSE 0 END) as included_components,
                            SUM(CASE WHEN supplier_status = 'delivered' AND is_included = 1 THEN 1 ELSE 0 END) as delivered_components,
                            SUM(CASE WHEN supplier_status = 'confirmed' AND is_included = 1 THEN 1 ELSE 0 END) as confirmed_components,
                            SUM(CASE WHEN supplier_status = 'pending' AND is_included = 1 THEN 1 ELSE 0 END) as pending_components,
                            SUM(CASE WHEN supplier_status = 'cancelled' AND is_included = 1 THEN 1 ELSE 0 END) as cancelled_components
                        FROM tbl_event_components
                        WHERE event_id = ?";

                $stmt = $pdo->prepare($sql);
                $stmt->execute([$eventId]);
                $progress = $stmt->fetch(PDO::FETCH_ASSOC);

                // Get component details
                $componentsSql = "SELECT
                                    component_id,
                                    component_name,
                                    component_price,
                                    supplier_status,
                                    delivery_date,
                                    supplier_notes,
                                    is_included
                                 FROM tbl_event_components
                                 WHERE event_id = ? AND is_included = 1
                                 ORDER BY display_order";

                $componentsStmt = $pdo->prepare($componentsSql);
                $componentsStmt->execute([$eventId]);
                $components = $componentsStmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    "status" => "success",
                    "data" => [
                        "progress" => $progress,
                        "components" => $components
                    ]
                ]);
            } catch (Exception $e) {
                error_log("getEventDeliveryProgress error: " . $e->getMessage());
                echo json_encode([
                    "status" => "error",
                    "message" => "Failed to fetch delivery progress"
                ]);
            }
        }
        break;

    case "deleteClient":
        $clientId = (int)($_GET['client_id'] ?? ($data['client_id'] ?? 0));
        if ($clientId <= 0) {
            echo json_encode(["status" => "error", "message" => "Valid client ID required"]);
        } else {
            echo $staff->deleteClient($clientId);
        }
        break;

    case "deleteClients":
        $clientIds = $data['client_ids'] ?? [];
        if (empty($clientIds) || !is_array($clientIds)) {
            echo json_encode(["status" => "error", "message" => "Valid client IDs array required"]);
        } else {
            echo $staff->deleteClients($clientIds);
        }
        break;

    // Staff-specific operations
    case "dashboard":
        echo $staff->getDashboardData();
        break;

    case "reports":
        $type = $_GET['type'] ?? $data['type'] ?? 'summary';
        echo $staff->getReports($type);
        break;

    case "events":
        // For staff, we don't need admin_id - staff can see all events
        echo $staff->getEvents();
        break;

    case "bookings":
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            echo $staff->getBookings();
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            echo $staff->createBooking($data);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            $bookingId = $_GET['id'] ?? $data['id'] ?? null;
            if (!$bookingId) {
                echo json_encode(["status" => "error", "message" => "Booking ID required"]);
                break;
            }
            echo $staff->updateBooking($bookingId, $data);
        }
        break;

    case "packages":
        echo $staff->getPackages();
        break;

    case "venues":
        echo $staff->getVenues();
        break;

    case "clients":
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            echo $staff->getClients();
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            echo $staff->createClient($data);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            $clientId = $_GET['id'] ?? $data['id'] ?? null;
            if (!$clientId) {
                echo json_encode(["status" => "error", "message" => "Client ID required"]);
                break;
            }
            echo $staff->updateClient($clientId, $data);
        }
        break;

    case "organizers":
        echo $staff->getOrganizers();
        break;

    case "suppliers":
        echo $staff->getSuppliers();
        break;

    case "payments":
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            echo $staff->getPayments();
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            echo $staff->recordPayment($data);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            $paymentId = $_GET['id'] ?? $data['id'] ?? null;
            if (!$paymentId) {
                echo json_encode(["status" => "error", "message" => "Payment ID required"]);
                break;
            }
            $status = $_GET['status'] ?? $data['status'] ?? null;
            echo $staff->verifyPayment($paymentId, $status);
        }
        break;

    case "profile":
        echo $staff->getOwnProfile();
        break;

    case "createReservationPayment":
        $bookingId = (int)($data['booking_id'] ?? 0);
        if ($bookingId <= 0) {
            echo json_encode(["status" => "error", "message" => "Valid booking ID required"]);
        } else {
            echo json_encode(createReservationPayment($bookingId, $data));
        }
        break;

    default:
        error_log("Staff.php - Unknown operation: " . $operation);
        error_log("Staff.php - Available data: " . json_encode($data));
        echo json_encode([
            "status" => "error",
            "message" => "Invalid or missing operation: '$operation'",
            "received_data" => $data
        ]);
        break;
    }
} catch (Exception $e) {
    error_log("Admin.php - Uncaught exception: " . $e->getMessage());
    error_log("Admin.php - Stack trace: " . $e->getTraceAsString());

    // Clear any buffered output
    if (ob_get_length()) {
        ob_clean();
    }

    echo json_encode([
        "status" => "error",
        "message" => "Server error occurred",
        "debug" => [
            "error" => $e->getMessage(),
            "file" => basename($e->getFile()),
            "line" => $e->getLine()
        ]
    ]);
}

// Function to create reservation payment for a booking
function createReservationPayment($bookingId, $paymentData) {
    global $pdo;

    try {
        $pdo->beginTransaction();

        // Validate booking exists
        $bookingStmt = $pdo->prepare("SELECT booking_id, user_id, booking_reference, booking_status FROM tbl_bookings WHERE booking_id = ?");
        $bookingStmt->execute([$bookingId]);
        $booking = $bookingStmt->fetch(PDO::FETCH_ASSOC);

        if (!$booking) {
            return ["status" => "error", "message" => "Booking not found"];
        }

        // Allow payments on both 'pending' and 'reserved' bookings
        if (!in_array($booking['booking_status'], ['pending', 'reserved'])) {
            return ["status" => "error", "message" => "Booking must be in 'pending' or 'reserved' status to accept payments"];
        }

        // Validate payment data
        $requiredFields = ['payment_method', 'payment_amount', 'payment_reference'];
        foreach ($requiredFields as $field) {
            if (!isset($paymentData[$field]) || $paymentData[$field] === '') {
                return ["status" => "error", "message" => "Missing required field: " . $field];
            }
        }

        // Create payment record
        $paymentSql = "INSERT INTO tbl_payments (
            booking_id, client_id, payment_date, payment_amount, payment_method,
            payment_status, payment_reference, payment_notes, payment_percentage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $paymentStmt = $pdo->prepare($paymentSql);
        $paymentDate = $paymentData['payment_date'] ?? date('Y-m-d');
        $paymentStatus = $paymentData['payment_status'] ?? 'completed';
        $paymentNotes = $paymentData['payment_notes'] ?? '';
        $paymentPercentage = null; // Will be calculated if needed

        $paymentResult = $paymentStmt->execute([
            $bookingId,
            $booking['user_id'],
            $paymentDate,
            $paymentData['payment_amount'],
            $paymentData['payment_method'],
            $paymentStatus,
            $paymentData['payment_reference'],
            $paymentNotes,
            $paymentPercentage
        ]);

        if (!$paymentResult) {
            throw new Exception("Failed to create payment record");
        }

        $paymentId = $pdo->lastInsertId();

        // Update booking status to 'reserved' only if currently 'pending'
        if ($booking['booking_status'] === 'pending') {
            $updateBookingSql = "UPDATE tbl_bookings SET booking_status = 'reserved' WHERE booking_id = ?";
            $updateStmt = $pdo->prepare($updateBookingSql);
            $updateStmt->execute([$bookingId]);
        }

        // Notify all admins and staff about payment made
        try {
            // Get admin IDs
            $adminStmt = $pdo->query("SELECT user_id FROM tbl_users WHERE user_role = 'admin'");
            $adminIds = $adminStmt->fetchAll(PDO::FETCH_COLUMN);

            // Get staff IDs
            $staffStmt = $pdo->query("SELECT user_id FROM tbl_users WHERE user_role = 'staff' AND user_status = 'active'");
            $staffIds = $staffStmt->fetchAll(PDO::FETCH_COLUMN);

            // Get client name
            $clientStmt = $pdo->prepare("SELECT user_firstName, user_lastName FROM tbl_users WHERE user_id = ?");
            $clientStmt->execute([$booking['user_id']]);
            $client = $clientStmt->fetch(PDO::FETCH_ASSOC);
            $clientName = trim(($client['user_firstName'] ?? 'User') . ' ' . ($client['user_lastName'] ?? ''));

            $allRecipients = array_merge($adminIds, $staffIds);

            foreach ($allRecipients as $recipientId) {
                $notifStmt = $pdo->prepare("INSERT INTO tbl_notifications (
                    user_id, notification_type, notification_title, notification_message,
                    notification_priority, notification_icon, notification_url,
                    event_id, booking_id, venue_id, store_id, budget_id, feedback_id, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

                $notifStmt->execute([
                    $recipientId,
                    'booking_payment_made',
                    'Reservation Payment Received',
                    "Client {$clientName} made a reservation payment of ₱{$paymentData['payment_amount']} for booking {$booking['booking_reference']}",
                    'high',
                    'credit-card',
                    '/admin/bookings',
                    null,
                    $bookingId,
                    null,
                    null,
                    null,
                    null,
                    date('Y-m-d H:i:s', strtotime('+72 hours'))
                ]);
            }
        } catch (Exception $e) {
            error_log('createReservationPayment: notification failed: ' . $e->getMessage());
        }

        $pdo->commit();

        $newStatus = ($booking['booking_status'] === 'pending') ? 'reserved' : $booking['booking_status'];

        return [
            "status" => "success",
            "payment_id" => $paymentId,
            "message" => "Reservation payment created successfully",
            "booking_status" => $newStatus
        ];

    } catch (Exception $e) {
        $pdo->rollBack();
        return ["status" => "error", "message" => "Database error: " . $e->getMessage()];
    }
}

// End output buffering and flush
ob_end_flush();
