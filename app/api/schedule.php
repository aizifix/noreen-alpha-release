<?php
// Event Scheduling System - schedule.php
// Handles all scheduling logic and CRUD operations for event schedules

// Check if this file is being included by another script
if (!defined('SCHEDULE_PHP_INCLUDED')) {
    // Start output buffering to prevent any accidental output
    ob_start();

    // Suppress all error output to prevent interference with JSON responses
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);

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
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    ini_set('error_log', 'php_errors.log');

    // Custom error handler to return JSON errors
    set_error_handler(function($errno, $errstr, $errfile, $errline) {
        error_log("Schedule.php Error [$errno]: $errstr in $errfile on line $errline");

        if ($errno === E_WARNING || $errno === E_NOTICE || $errno === E_USER_WARNING || $errno === E_USER_NOTICE) {
            return false;
        }

        echo json_encode([
            "status" => "error",
            "message" => "Schedule system error: " . $errstr,
            "file" => $errfile,
            "line" => $errline
        ]);
        exit;
    });
}

// Include database connection
try {
    require_once 'db_connect.php';
} catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => "Database connection failed: " . $e->getMessage()
    ]);
    exit;
}

// Get the subaction parameter
// Handle both direct calls and calls through admin.php
$subaction = $_POST['subaction'] ?? $_GET['subaction'] ?? 'get';

// If called through admin.php, the data might be in a different structure
if (isset($_POST['operation']) && $_POST['operation'] === 'schedules') {
    $subaction = $_POST['subaction'] ?? 'get';
}

// If we're included by admin.php, also check the $data array
if (isset($data) && is_array($data)) {
    $subaction = $data['subaction'] ?? $subaction;
}

// Debug logging for subaction
error_log("Schedule.php - Final subaction: " . $subaction);
error_log("Schedule.php - POST operation: " . ($_POST['operation'] ?? 'not_set'));
error_log("Schedule.php - POST subaction: " . ($_POST['subaction'] ?? 'not_set'));
error_log("Schedule.php - data array subaction: " . (isset($data) && is_array($data) ? ($data['subaction'] ?? 'not_set') : 'not_array'));

// Handle different schedule operations
try {
// Check if this is a client request and restrict operations
$is_client_request = isset($_POST['user_id']) || (isset($data) && isset($data['user_id']));
$user_id = $_POST['user_id'] ?? ($data['user_id'] ?? null);

// For client requests, only allow 'get' operation
if ($is_client_request && $subaction !== 'get') {
    echo json_encode([
        "status" => "error",
        "message" => "Only read access allowed for clients"
    ]);
    exit;
}

switch ($subaction) {

    case 'seed':
        // Parse inclusion_description from tbl_event and insert into tbl_event_schedule
        try {
            $event_id = $_GET['event_id'] ?? $_POST['event_id'];

            // If we're included by admin.php, also check the $data array
            if (!$event_id && isset($data) && is_array($data)) {
                $event_id = $data['event_id'] ?? null;
            }

            if (!$event_id) {
                echo json_encode(["status" => "error", "message" => "Event ID is required"]);
                exit;
            }

            // Get event details
            $eventQuery = "SELECT event_id, event_title, event_date, end_time
                          FROM tbl_events
                          WHERE event_id = ?";
            $eventStmt = $pdo->prepare($eventQuery);
            $eventStmt->execute([$event_id]);
            $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

            if (!$event) {
                echo json_encode(["status" => "error", "message" => "Event not found"]);
                exit;
            }

            // No need to check package_id since we're using event components directly

            // Get event components for this event (these have comma-separated component descriptions)
            $componentsQuery = "SELECT component_name, component_description
                               FROM tbl_event_components
                               WHERE event_id = ? AND component_description IS NOT NULL AND component_description != ''";
            $componentsStmt = $pdo->prepare($componentsQuery);
            $componentsStmt->execute([$event_id]);
            $components = $componentsStmt->fetchAll(PDO::FETCH_ASSOC);

            error_log("Schedule seed - Found " . count($components) . " components with descriptions for event_id: " . $event_id);

            $seededCount = 0;

            if (count($components) == 0) {
                echo json_encode([
                    "status" => "warning",
                    "message" => "No event components found with component descriptions to seed from.",
                    "seeded_count" => 0,
                    "suggestion" => "Use 'Add Schedule Item' to manually create schedule items, or add component descriptions to event components first."
                ]);
                exit;
            }

            foreach ($components as $component) {
                $component_name = $component['component_name'];
                $component_description = $component['component_description'];

                // Parse comma-separated components from the description
                $component_items = explode(',', $component_description);

                foreach ($component_items as $component_item) {
                    $component_item = trim($component_item);
                    if ($component_item != '') {
                        // Check if component already exists
                        $checkQuery = "SELECT schedule_id FROM tbl_event_schedule
                                      WHERE event_id = ? AND component_name = ?";
                        $checkStmt = $pdo->prepare($checkQuery);
                        $checkStmt->execute([$event_id, $component_item]);

                        if ($checkStmt->rowCount() == 0) {
                            // Insert new schedule item
                            $insertQuery = "INSERT INTO tbl_event_schedule
                                           (event_id, inclusion_name, component_name, scheduled_date, scheduled_time, status, is_custom)
                                           VALUES (?, ?, ?, ?, ?, 'Pending', 0)";
                            $insertStmt = $pdo->prepare($insertQuery);
                            $insertStmt->execute([
                                $event_id,
                                $component_name, // Use the main component name as inclusion_name
                                $component_item, // Use the individual component item
                                $event['event_date'],
                                '00:00:00'
                            ]);
                            $seededCount++;
                        }
                    }
                }
            }

            echo json_encode([
                "status" => "success",
                "message" => "Schedule seeded successfully. Added $seededCount components.",
                "seeded_count" => $seededCount
            ]);

        } catch (Exception $e) {
            echo json_encode(["status" => "error", "message" => "Error seeding schedule: " . $e->getMessage()]);
        }
        break;

    case 'create_empty_date':
        // Add new empty date to schedule
        try {
            $event_id = $_POST['event_id'] ?? ($data['event_id'] ?? null);
            $scheduled_date = $_POST['scheduled_date'] ?? ($data['scheduled_date'] ?? '');

            if (!$event_id || !$scheduled_date) {
                echo json_encode(["status" => "error", "message" => "Event ID and date are required"]);
                exit;
            }

            // Validate date (within range)
            $eventQuery = "SELECT event_date, end_time FROM tbl_events WHERE event_id = ?";
            $eventStmt = $pdo->prepare($eventQuery);
            $eventStmt->execute([$event_id]);
            $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

            if (!$event) {
                echo json_encode(["status" => "error", "message" => "Event not found"]);
                exit;
            }

            $today = date('Y-m-d');
            $event_date = $event['event_date'];

            if ($scheduled_date < $today || $scheduled_date > $event_date) {
                echo json_encode(["status" => "error", "message" => "Invalid date range. Must be between today and event date."]);
                exit;
            }

            // Check if date already exists
            $checkQuery = "SELECT schedule_id FROM tbl_event_schedule WHERE event_id = ? AND scheduled_date = ?";
            $checkStmt = $pdo->prepare($checkQuery);
            $checkStmt->execute([$event_id, $scheduled_date]);

            if ($checkStmt->rowCount() > 0) {
                echo json_encode(["status" => "warning", "message" => "Date already exists in schedule"]);
                exit;
            }

            // Insert placeholder schedule item for the date
            $insertQuery = "INSERT INTO tbl_event_schedule
                           (event_id, inclusion_name, component_name, scheduled_date, scheduled_time, status, is_custom)
                           VALUES (?, '', '', ?, '00:00:00', 'Pending', 0)";
            $insertStmt = $pdo->prepare($insertQuery);
            $insertStmt->execute([
                $event_id,
                $scheduled_date
            ]);

            echo json_encode(["status" => "success", "message" => "New date added successfully"]);

        } catch (Exception $e) {
            echo json_encode(["status" => "error", "message" => "Error creating empty date: " . $e->getMessage()]);
        }
        break;

    case 'create':
        // Add new schedule item (admin only)
        try {
            $event_id = $_POST['event_id'] ?? ($data['event_id'] ?? null);
            $component_name = trim($_POST['component_name'] ?? ($data['component_name'] ?? ''));
            $scheduled_date = $_POST['scheduled_date'] ?? ($data['scheduled_date'] ?? '');
            $scheduled_time = $_POST['scheduled_time'] ?? ($data['scheduled_time'] ?? '');
            $remarks = $_POST['remarks'] ?? ($data['remarks'] ?? '');
            $is_custom = $_POST['is_custom'] ?? ($data['is_custom'] ?? 1);
            $inclusion_name = $_POST['inclusion_name'] ?? ($data['inclusion_name'] ?? '');

            if (!$event_id || !$component_name || !$scheduled_date || !$scheduled_time) {
                echo json_encode(["status" => "error", "message" => "Missing required fields"]);
                exit;
            }

            // Validate date (within range)
            $eventQuery = "SELECT event_date, end_time FROM tbl_events WHERE event_id = ?";
            $eventStmt = $pdo->prepare($eventQuery);
            $eventStmt->execute([$event_id]);
            $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

            if (!$event) {
                echo json_encode(["status" => "error", "message" => "Event not found"]);
                exit;
            }

            $today = date('Y-m-d');
            $event_date = $event['event_date'];

            if ($scheduled_date < $today || $scheduled_date > $event_date) {
                echo json_encode(["status" => "error", "message" => "Invalid date range. Must be between today and event date."]);
                exit;
            }

            // Insert new schedule item
            $insertQuery = "INSERT INTO tbl_event_schedule
                           (event_id, inclusion_name, component_name, scheduled_date, scheduled_time, remarks, is_custom)
                           VALUES (?, ?, ?, ?, ?, ?, ?)";
            $insertStmt = $pdo->prepare($insertQuery);
            $insertStmt->execute([
                $event_id,
                $inclusion_name,
                $component_name,
                $scheduled_date,
                $scheduled_time,
                $remarks,
                $is_custom
            ]);

            echo json_encode(["status" => "success", "message" => "New schedule added successfully"]);

        } catch (Exception $e) {
            echo json_encode(["status" => "error", "message" => "Error creating schedule: " . $e->getMessage()]);
        }
        break;

    case 'update':
        // Update schedule details
        try {
            $schedule_id = $_POST['schedule_id'] ?? ($data['schedule_id'] ?? null);
            $component_name = trim($_POST['component_name'] ?? ($data['component_name'] ?? ''));
            $scheduled_date = $_POST['scheduled_date'] ?? ($data['scheduled_date'] ?? '');
            $scheduled_time = $_POST['scheduled_time'] ?? ($data['scheduled_time'] ?? '');
            $status = $_POST['status'] ?? ($data['status'] ?? '');
            $remarks = $_POST['remarks'] ?? ($data['remarks'] ?? '');
            $inclusion_name = $_POST['inclusion_name'] ?? ($data['inclusion_name'] ?? '');

            if (!$schedule_id || !$component_name || !$scheduled_date || !$scheduled_time || !$status) {
                echo json_encode(["status" => "error", "message" => "Missing required fields"]);
                exit;
            }

            // Get event details for date validation
            $eventQuery = "SELECT e.event_date FROM tbl_events e
                          JOIN tbl_event_schedule es ON e.event_id = es.event_id
                          WHERE es.schedule_id = ?";
            $eventStmt = $pdo->prepare($eventQuery);
            $eventStmt->execute([$schedule_id]);
            $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

            if (!$event) {
                echo json_encode(["status" => "error", "message" => "Schedule item not found"]);
                exit;
            }

            $today = date('Y-m-d');
            $event_date = $event['event_date'];

            if ($scheduled_date < $today || $scheduled_date > $event_date) {
                echo json_encode(["status" => "error", "message" => "Invalid date range. Must be between today and event date."]);
                exit;
            }

            // Update schedule item
            $updateQuery = "UPDATE tbl_event_schedule
                           SET component_name = ?, scheduled_date = ?, scheduled_time = ?,
                               status = ?, remarks = ?, inclusion_name = ?, updated_at = CURRENT_TIMESTAMP
                           WHERE schedule_id = ?";
            $updateStmt = $pdo->prepare($updateQuery);
            $updateStmt->execute([
                $component_name,
                $scheduled_date,
                $scheduled_time,
                $status,
                $remarks,
                $inclusion_name,
                $schedule_id
            ]);

            echo json_encode(["status" => "success", "message" => "Schedule updated successfully"]);

        } catch (Exception $e) {
            echo json_encode(["status" => "error", "message" => "Error updating schedule: " . $e->getMessage()]);
        }
        break;

    case 'toggle_status':
        // Organizer toggles status (restricted to Pending/Done only)
        try {
            $schedule_id = $_POST['schedule_id'] ?? ($data['schedule_id'] ?? null);
            $status = $_POST['status'] ?? ($data['status'] ?? '');
            $user_role = $_POST['user_role'] ?? ($data['user_role'] ?? 'admin'); // Default to admin

            if (!$schedule_id || !$status) {
                echo json_encode(["status" => "error", "message" => "Missing required fields"]);
                exit;
            }

            // Validate status
            $validStatuses = ['Pending', 'Done', 'Delivered', 'Cancelled'];
            if (!in_array($status, $validStatuses)) {
                echo json_encode(["status" => "error", "message" => "Invalid status"]);
                exit;
            }

            // Restrict organizer permissions
            if ($user_role === 'organizer') {
                // Get current status to validate transition
                $currentStatusQuery = "SELECT status FROM tbl_event_schedule WHERE schedule_id = ?";
                $currentStatusStmt = $pdo->prepare($currentStatusQuery);
                $currentStatusStmt->execute([$schedule_id]);
                $currentStatus = $currentStatusStmt->fetchColumn();

                if (!$currentStatus) {
                    echo json_encode(["status" => "error", "message" => "Schedule item not found"]);
                    exit;
                }

                // Only allow Pending -> Done and Done -> Pending transitions
                if (!(($currentStatus === 'Pending' && $status === 'Done') ||
                      ($currentStatus === 'Done' && $status === 'Pending'))) {
                    echo json_encode([
                        "status" => "error",
                        "message" => "Organizers can only toggle between Pending and Done status"
                    ]);
                    exit;
                }
            }

            $updateQuery = "UPDATE tbl_event_schedule SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE schedule_id = ?";
            $updateStmt = $pdo->prepare($updateQuery);
            $updateStmt->execute([$status, $schedule_id]);

            echo json_encode(["status" => "success", "message" => "Status updated successfully"]);

        } catch (Exception $e) {
            echo json_encode(["status" => "error", "message" => "Error updating status: " . $e->getMessage()]);
        }
        break;

    case 'move':
        // Move schedule item to different date
        try {
            $schedule_id = $_POST['schedule_id'] ?? ($data['schedule_id'] ?? null);
            $scheduled_date = $_POST['scheduled_date'] ?? ($data['scheduled_date'] ?? null);

            if (!$schedule_id || !$scheduled_date) {
                echo json_encode(["status" => "error", "message" => "Schedule ID and date are required"]);
                exit;
            }

            // Get event details for date validation
            $eventQuery = "SELECT e.event_date FROM tbl_events e
                          JOIN tbl_event_schedule es ON e.event_id = es.event_id
                          WHERE es.schedule_id = ?";
            $eventStmt = $pdo->prepare($eventQuery);
            $eventStmt->execute([$schedule_id]);
            $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

            if (!$event) {
                echo json_encode(["status" => "error", "message" => "Schedule item not found"]);
                exit;
            }

            $today = date('Y-m-d');
            $event_date = $event['event_date'];

            if ($scheduled_date < $today || $scheduled_date > $event_date) {
                echo json_encode(["status" => "error", "message" => "Invalid date range. Must be between today and event date."]);
                exit;
            }

            // Update schedule item date
            $updateQuery = "UPDATE tbl_event_schedule
                           SET scheduled_date = ?, updated_at = CURRENT_TIMESTAMP
                           WHERE schedule_id = ?";
            $updateStmt = $pdo->prepare($updateQuery);
            $updateStmt->execute([$scheduled_date, $schedule_id]);

            echo json_encode(["status" => "success", "message" => "Schedule item moved successfully"]);

        } catch (Exception $e) {
            echo json_encode(["status" => "error", "message" => "Error moving schedule: " . $e->getMessage()]);
        }
        break;

    case 'delete':
        // Delete a schedule entry
        try {
            $schedule_id = $_POST['schedule_id'] ?? ($data['schedule_id'] ?? null);

            if (!$schedule_id) {
                echo json_encode(["status" => "error", "message" => "Schedule ID is required"]);
                exit;
            }

            $deleteQuery = "DELETE FROM tbl_event_schedule WHERE schedule_id = ?";
            $deleteStmt = $pdo->prepare($deleteQuery);
            $deleteStmt->execute([$schedule_id]);

            echo json_encode(["status" => "success", "message" => "Schedule deleted successfully"]);

        } catch (Exception $e) {
            echo json_encode(["status" => "error", "message" => "Error deleting schedule: " . $e->getMessage()]);
        }
        break;

    case 'get':
    default:
        // Fetch all schedules for a specific event
        try {
            // Get event_id from POST data (since we're making POST requests)
            $event_id = $_POST['event_id'] ?? null;

            // If we're included by admin.php or client.php, also check the $data array
            if (!$event_id && isset($data) && is_array($data)) {
                $event_id = $data['event_id'] ?? null;
            }

            // Check if this is a client request (has user_id)
            $is_client_request = isset($_POST['user_id']) || (isset($data) && isset($data['user_id']));
            $user_id = $_POST['user_id'] ?? ($data['user_id'] ?? null);

            // Debug logging
            error_log("Schedule get - POST data: " . json_encode($_POST));
            error_log("Schedule get - GET data: " . json_encode($_GET));
            error_log("Schedule get - data array: " . json_encode($data ?? []));
            error_log("Schedule get - event_id: " . $event_id);
            error_log("Schedule get - subaction: " . $subaction);
            error_log("Schedule get - is_client_request: " . ($is_client_request ? 'yes' : 'no'));
            error_log("Schedule get - user_id: " . $user_id);

            if (!$event_id) {
                echo json_encode([
                    "status" => "error",
                    "message" => "Event ID is required",
                    "debug" => [
                        "post_data" => $_POST,
                        "get_data" => $_GET,
                        "data_array" => $data ?? [],
                        "operation" => $_POST['operation'] ?? ($data['operation'] ?? 'not_set')
                    ]
                ]);
                exit;
            }

            // For client requests, verify the event belongs to the user
            if ($is_client_request && $user_id) {
                $verifySql = "SELECT COUNT(*) FROM tbl_events WHERE event_id = :event_id AND user_id = :user_id";
                $verifyStmt = $pdo->prepare($verifySql);
                $verifyStmt->bindParam(':event_id', $event_id, PDO::PARAM_INT);
                $verifyStmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
                $verifyStmt->execute();

                if ($verifyStmt->fetchColumn() == 0) {
                    echo json_encode([
                        "status" => "error",
                        "message" => "Event not found or access denied"
                    ]);
                    exit;
                }
            }

            $query = "SELECT es.*, e.event_title, e.event_date, e.end_time,
                             CONCAT(u.user_firstName, ' ', u.user_lastName) as organizer_name,
                             u.user_contact as organizer_contact
                      FROM tbl_event_schedule es
                      LEFT JOIN tbl_events e ON es.event_id = e.event_id
                      LEFT JOIN tbl_organizer o ON es.assigned_organizer_id = o.organizer_id
                      LEFT JOIN tbl_users u ON o.user_id = u.user_id
                      WHERE es.event_id = ?
                      ORDER BY es.scheduled_date ASC, es.scheduled_time ASC";

            error_log("Schedule get - Executing query: " . $query);
            error_log("Schedule get - With event_id: " . $event_id);

            $stmt = $pdo->prepare($query);
            $stmt->execute([$event_id]);
            $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);

            error_log("Schedule get - Found " . count($schedules) . " schedules");

            // Group schedules by date for better organization
            $groupedSchedules = [];
            $filteredSchedules = [];
            $emptyDates = [];

            foreach ($schedules as $schedule) {
                $date = $schedule['scheduled_date'];

                // Always ensure the date exists in groupedSchedules
                if (!isset($groupedSchedules[$date])) {
                    $groupedSchedules[$date] = [];
                }

                // Only include schedules with actual components (not empty placeholders)
                if (!empty($schedule['component_name'])) {
                    $groupedSchedules[$date][] = $schedule;
                    $filteredSchedules[] = $schedule;
                } else {
                    // Track empty dates separately
                    $emptyDates[] = $date;
                }
            }

            // Add empty dates to groupedSchedules to ensure they show up
            foreach ($emptyDates as $emptyDate) {
                if (!isset($groupedSchedules[$emptyDate])) {
                    $groupedSchedules[$emptyDate] = [];
                }
            }

            echo json_encode([
                "status" => "success",
                "data" => $filteredSchedules,
                "grouped_data" => $groupedSchedules,
                "empty_dates" => array_unique($emptyDates),
                "total_count" => count($filteredSchedules)
            ]);

        } catch (Exception $e) {
            error_log("Schedule get - Exception: " . $e->getMessage());
            error_log("Schedule get - Stack trace: " . $e->getTraceAsString());
            echo json_encode([
                "status" => "error",
                "message" => "Error fetching schedules: " . $e->getMessage(),
                "debug" => [
                    "file" => $e->getFile(),
                    "line" => $e->getLine(),
                    "post_data" => $_POST,
                    "get_data" => $_GET
                ]
            ]);
        }
        break;
}

} catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => "Schedule system error: " . $e->getMessage(),
        "debug" => [
            "file" => $e->getFile(),
            "line" => $e->getLine(),
            "post_data" => $_POST,
            "get_data" => $_GET,
            "subaction" => $subaction
        ]
    ]);
    exit;
}

// Only execute if this file is being accessed directly (not included)
if (!defined('SCHEDULE_PHP_INCLUDED')) {
    // Clean output buffer
    ob_end_clean();
}
?>
