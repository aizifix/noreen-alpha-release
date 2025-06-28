<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'db_connect.php';

// Create default uploads directory if it doesn't exist
$defaultDir = 'uploads/user_profile';
if (!is_dir($defaultDir)) {
    mkdir($defaultDir, 0777, true);
}

// Define the default profile picture path
$defaultPfpPath = 'uploads/user_profile/default_pfp.png';

// Check if default profile picture exists, if not create it
// You can replace this with your actual default profile picture
if (!file_exists($defaultPfpPath)) {
    // Copy a placeholder image or create a simple one
    // For this example, we'll assume you have a default image to copy
    // If not, you might want to generate one or download one
    copy('path/to/your/default_pfp.png', $defaultPfpPath);
}

class User {
    private $conn;
    private $defaultPfpPath;

    public function __construct($pdo, $defaultPfpPath) {
        $this->conn = $pdo;
        $this->defaultPfpPath = $defaultPfpPath;
    }

    public function getUserInfo($userId) {
        try {
            $sql = "SELECT user_id, user_firstName, user_lastName, user_email, user_role,
                    COALESCE(user_pfp, :defaultPfp) as user_pfp
                    FROM tbl_users WHERE user_id = :userId";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':userId' => $userId,
                ':defaultPfp' => $this->defaultPfpPath
            ]);

            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                echo json_encode(["status" => "success", "user" => $user]);
            } else {
                echo json_encode(["status" => "error", "message" => "User not found"]);
            }
        } catch (PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function updateUserPfp($userId, $file) {
        try {
            $profilePicture = $this->uploadFile($file, 'uploads/profile_pictures/');

            if (!$profilePicture) {
                echo json_encode(["status" => "error", "message" => "Failed to upload profile picture"]);
                return;
            }

            $sql = "UPDATE tbl_users SET user_pfp = :profilePicture WHERE user_id = :userId";

            $stmt = $this->conn->prepare($sql);
            $result = $stmt->execute([
                ':userId' => $userId,
                ':profilePicture' => $profilePicture
            ]);

            if ($result) {
                echo json_encode([
                    "status" => "success",
                    "message" => "Profile picture updated successfully",
                    "pfp_path" => $profilePicture
                ]);
            } else {
                echo json_encode(["status" => "error", "message" => "Failed to update profile picture"]);
            }
        } catch (PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    private function uploadFile($file, $uploadDir) {
        if ($file && isset($file['tmp_name']) && $file['tmp_name']) {
            $filename = time() . "_" . basename($file['name']);
            $targetPath = $uploadDir . $filename;

            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                return $targetPath;
            }
        }
        return null;
    }
}

class Store {
    private $conn;
    private $defaultPfpPath;

    public function __construct($pdo, $defaultPfpPath = null) {
        $this->conn = $pdo;
        $this->defaultPfpPath = $defaultPfpPath;
    }

    public function createStore($data, $files) {
        try {
            if (!isset($data['user_id']) || empty($data['user_id'])) {
                echo json_encode(["status" => "error", "message" => "User ID is missing"]);
                return;
            }

            $userId = $data['user_id'];
            $storeName = $data['storeName'] ?? '';
            $storeDetails = $data['storeDetails'] ?? '';
            $contactNumber = $data['contactNumber'] ?? '';
            $email = $data['email'] ?? '';
            $storeType = $data['storeType'] ?? '';
            $storeDescription = $data['storeDescription'] ?? '';
            $location = $data['location'] ?? '';
            $storeCategoryId = $data['store_category_id'] ?? null;

            // Price data
            $storeMinPrice = $data['store_price_min'] ?? 0;
            $storeMaxPrice = $data['store_price_max'] ?? 0;
            $storePriceDescription = $data['store_price_description'] ?? '';

            if (!$storeCategoryId) {
                echo json_encode(["status" => "error", "message" => "Store category ID is required"]);
                return;
            }

            // File uploads
            $coverPhoto = $this->uploadFile($files['coverPhoto'] ?? null, 'uploads/cover_photos/');
            $profilePicture = $this->uploadFile($files['profilePicture'] ?? null, 'uploads/profile_pictures/');

            if (!$profilePicture && $this->defaultPfpPath) {
                $profilePicture = $this->defaultPfpPath;
            }

            $this->conn->beginTransaction();

            try {
                $sql = "INSERT INTO tbl_store (
                    user_id, store_name, store_details, store_contact, store_email,
                    store_type, store_description, store_location, store_coverphoto, store_profile_picture, store_category_id
                ) VALUES (
                    :userId, :storeName, :storeDetails, :contactNumber, :email,
                    :storeType, :storeDescription, :location, :coverPhoto, :profilePicture, :storeCategoryId
                )";

                $stmt = $this->conn->prepare($sql);
                $stmt->execute([
                    ':userId' => $userId,
                    ':storeName' => $storeName,
                    ':storeDetails' => $storeDetails,
                    ':contactNumber' => $contactNumber,
                    ':email' => $email,
                    ':storeType' => $storeType,
                    ':storeDescription' => $storeDescription,
                    ':location' => $location,
                    ':coverPhoto' => $coverPhoto,
                    ':profilePicture' => $profilePicture,
                    ':storeCategoryId' => $storeCategoryId
                ]);

                $storeId = $this->conn->lastInsertId();

                // Insert store pricing
                $sqlPrice = "INSERT INTO tbl_store_price (store_id, store_price_min, store_price_max, store_price_description)
                            VALUES (:storeId, :storeMinPrice, :storeMaxPrice, :storePriceDescription)";

                $stmtPrice = $this->conn->prepare($sqlPrice);
                $stmtPrice->execute([
                    ':storeId' => $storeId,
                    ':storeMinPrice' => $storeMinPrice,
                    ':storeMaxPrice' => $storeMaxPrice,
                    ':storePriceDescription' => $storePriceDescription
                ]);

                $this->conn->commit();
                echo json_encode(["status" => "success", "message" => "Store created successfully!"]);
            } catch (Exception $e) {
                $this->conn->rollBack();
                throw $e;
            }
        } catch (PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function getStores($userId) {
        try {
            $sql = "SELECT s.store_id AS id, s.store_name AS storeName,
                           sc.store_category_type AS storeCategory,
                           s.store_coverphoto AS coverPhoto,
                           COALESCE(s.store_profile_picture, :defaultPfp) AS profilePicture,
                           s.store_type, s.store_status, s.store_location, s.store_contact,
                           s.store_createdAt, s.store_email, s.store_description, s.store_details,
                           CONCAT(u.user_firstName, ' ', u.user_lastName) as vendor_name,
                           GROUP_CONCAT(
                               JSON_OBJECT(
                                   'title', sp.store_price_title,
                                   'min', sp.store_price_min,
                                   'max', sp.store_price_max,
                                   'description', sp.store_price_description
                               )
                           ) as prices
                    FROM tbl_store s
                    JOIN tbl_store_category sc ON s.store_category_id = sc.store_category_id
                    JOIN tbl_users u ON s.user_id = u.user_id
                    LEFT JOIN tbl_store_price sp ON s.store_id = sp.store_id
                    WHERE s.user_id = :userId
                    GROUP BY s.store_id";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':userId' => $userId,
                ':defaultPfp' => $this->defaultPfpPath
            ]);
            $stores = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($stores as &$store) {
                $store['coverPhoto'] = $store['coverPhoto'] ? "uploads/cover_photos/" . basename($store['coverPhoto']) : null;
                $store['profilePicture'] = $store['profilePicture'] ?
                    (strpos($store['profilePicture'], 'default') !== false ?
                        $store['profilePicture'] :
                        "uploads/profile_pictures/" . basename($store['profilePicture'])) :
                    $this->defaultPfpPath;

                if (isset($store['store_createdAt'])) {
                    $store['store_createdAt'] = date('Y-m-d', strtotime($store['store_createdAt']));
                }

                $store['prices'] = $store['prices'] ? json_decode('[' . $store['prices'] . ']', true) : [];
            }

            echo json_encode(["status" => "success", "stores" => $stores]);
        } catch (PDOException $e) {
            error_log("Database error in getStores: " . $e->getMessage());
            echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function getStoreCategories() {
        try {
            $sql = "SELECT store_category_id AS id, store_category_type AS type FROM tbl_store_category";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Debugging: Log fetched categories
            error_log(json_encode($categories));

            echo json_encode(["status" => "success", "categories" => $categories]);
        } catch (PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    private function uploadFile($file, $uploadDir) {
        if ($file && isset($file['tmp_name']) && $file['tmp_name']) {
            $filename = time() . "_" . basename($file['name']);
            $targetPath = $uploadDir . $filename;

            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                return $targetPath;
            }
        }
        return null;
    }
}

class Venue {
    private $conn;
    private $defaultPfpPath;

    public function __construct($pdo, $defaultPfpPath = null) {
        $this->conn = $pdo;
        $this->defaultPfpPath = $defaultPfpPath;
    }

    public function createVenue($data, $files) {
        try {
            if (!isset($data['user_id']) || empty($data['user_id'])) {
                echo json_encode(["status" => "error", "message" => "User ID is missing"]);
                return;
            }

            $userId = $data['user_id'];
            $venueTitle = $data['venue_title'] ?? '';
            $venueLocation = $data['venue_location'] ?? '';
            $venueContact = $data['venue_contact'] ?? '';
            $venueDetails = $data['venue_details'] ?? '';
            $venueStatus = $data['venue_status'] ?? 'available';
            $venueType = $data['venue_type'] ?? 'internal';

            // Get vendor name from users table
            $sqlUser = "SELECT CONCAT(user_firstName, ' ', user_lastName) as vendor_name FROM tbl_users WHERE user_id = :userId";
            $stmtUser = $this->conn->prepare($sqlUser);
            $stmtUser->execute([':userId' => $userId]);
            $venueOwner = $stmtUser->fetch(PDO::FETCH_ASSOC)['vendor_name'] ?? '';

            // File uploads
            $venueProfilePicture = $this->uploadFile($files['venue_profile_picture'] ?? null, 'uploads/venue_profile_pictures/');
            $venueCoverPhoto = $this->uploadFile($files['venue_cover_photo'] ?? null, 'uploads/venue_cover_photos/');

            if (!$venueProfilePicture && $this->defaultPfpPath) {
                $venueProfilePicture = $this->defaultPfpPath;
            }

            $this->conn->beginTransaction();

            try {
                if (isset($data['pricing']) && is_array($data['pricing'])) {
                    $firstTier = $data['pricing'][0]; // Use first tier for main capacity

                    // Create the venue record first
                    $sql = "INSERT INTO tbl_venue (
                        user_id,
                        venue_title,
                        venue_owner,
                        venue_location,
                        venue_contact,
                        venue_details,
                        venue_status,
                        venue_capacity,
                        venue_price,
                        venue_type,
                        venue_profile_picture,
                        venue_cover_photo
                    ) VALUES (
                        :userId,
                        :venueTitle,
                        :venueOwner,
                        :venueLocation,
                        :venueContact,
                        :venueDetails,
                        :venueStatus,
                        :venueCapacity,
                        :venuePrice,
                        :venueType,
                        :venueProfilePicture,
                        :venueCoverPhoto
                    )";

                    $stmt = $this->conn->prepare($sql);
                    $stmt->execute([
                        ':userId' => $userId,
                        ':venueTitle' => $venueTitle,
                        ':venueOwner' => $venueOwner,
                        ':venueLocation' => $venueLocation,
                        ':venueContact' => $venueContact,
                        ':venueDetails' => $venueDetails,
                        ':venueStatus' => $venueStatus,
                        ':venueCapacity' => $firstTier['capacity'] ?? 0,
                        ':venuePrice' => floatval($data['venue_price'] ?? 0),
                        ':venueType' => $venueType,
                        ':venueProfilePicture' => $venueProfilePicture,
                        ':venueCoverPhoto' => $venueCoverPhoto
                    ]);

                    $venueId = $this->conn->lastInsertId();

                    // Create all pricing tiers with reference to the venue
                    foreach ($data['pricing'] as $tier) {
                        $sqlPrice = "INSERT INTO tbl_venue_price (
                            venue_id,
                            venue_price_title,
                            venue_price_min,
                            venue_price_max,
                            venue_price_description,
                            tbl_capacity
                        ) VALUES (
                            :venueId,
                            :title,
                            :priceMin,
                            :priceMax,
                            :description,
                            :capacity
                        )";

                        $stmtPrice = $this->conn->prepare($sqlPrice);
                        $stmtPrice->execute([
                            ':venueId' => $venueId,
                            ':title' => $tier['name'] ?? '',
                            ':priceMin' => $tier['price'] ?? 0,
                            ':priceMax' => $tier['price'] ?? 0,
                            ':description' => $tier['description'] ?? '',
                            ':capacity' => $tier['capacity'] ?? 0
                        ]);
                    }

                    $this->conn->commit();
                    echo json_encode(["status" => "success", "message" => "Venue created successfully!"]);
                } else {
                    throw new Exception("Pricing information is required");
                }
            } catch (Exception $e) {
                $this->conn->rollBack();
                throw $e;
            }
        } catch (PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    public function getVenues($userId) {
        try {
            $sql = "SELECT
                       v.venue_id,
                       v.venue_title,
                       v.venue_owner,
                       v.venue_location,
                       v.venue_contact,
                       v.venue_status,
                       v.venue_type,
                       v.venue_details,
                       COALESCE(v.venue_profile_picture, :defaultPfp) as venue_profile_picture,
                       v.venue_cover_photo,
                       CONCAT(u.user_firstName, ' ', u.user_lastName) as vendor_name,
                       vp.tbl_venue_price_id,
                       vp.venue_price_title,
                       vp.venue_price_min,
                       vp.venue_price_max,
                       vp.venue_price_description,
                       vp.tbl_capacity
                    FROM tbl_venue v
                    JOIN tbl_users u ON v.user_id = u.user_id
                    LEFT JOIN tbl_venue_price vp ON v.venue_id = vp.venue_id
                    WHERE v.user_id = :userId
                    ORDER BY v.venue_id DESC";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':userId' => $userId,
                ':defaultPfp' => $this->defaultPfpPath
            ]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Group the results by venue
            $venues = [];
            foreach ($rows as $row) {
                $venueId = $row['venue_id'];

                if (!isset($venues[$venueId])) {
                    $venues[$venueId] = [
                        'venue_id' => $row['venue_id'],
                        'venue_title' => $row['venue_title'],
                        'venue_owner' => $row['venue_owner'],
                        'venue_location' => $row['venue_location'],
                        'venue_contact' => $row['venue_contact'],
                        'venue_status' => $row['venue_status'],
                        'venue_type' => $row['venue_type'],
                        'venue_details' => $row['venue_details'],
                        'venue_profile_picture' => $row['venue_profile_picture'],
                        'venue_cover_photo' => $row['venue_cover_photo'],
                        'vendor_name' => $row['vendor_name'],
                        'prices' => []
                    ];
                }

                if ($row['tbl_venue_price_id']) {
                    $venues[$venueId]['prices'][] = [
                        'id' => $row['tbl_venue_price_id'],
                        'title' => $row['venue_price_title'],
                        'min' => $row['venue_price_min'],
                        'max' => $row['venue_price_max'],
                        'capacity' => $row['tbl_capacity'],
                        'description' => $row['venue_price_description']
                    ];
                }
            }

            $venues = array_values($venues);

            foreach ($venues as &$venue) {
                // Handle profile picture path
                if ($venue['venue_profile_picture']) {
                    if (strpos($venue['venue_profile_picture'], 'default') !== false) {
                        $venue['venue_profile_picture'] = $venue['venue_profile_picture'];
                    } else {
                        $venue['venue_profile_picture'] = "uploads/venue_profile_pictures/" . basename($venue['venue_profile_picture']);
                    }
                } else {
                    $venue['venue_profile_picture'] = $this->defaultPfpPath;
                }

                // Handle cover photo path
                if ($venue['venue_cover_photo']) {
                    $venue['venue_cover_photo'] = "uploads/venue_cover_photos/" . basename($venue['venue_cover_photo']);
                }
            }

            echo json_encode(["status" => "success", "venues" => $venues]);
        } catch (PDOException $e) {
            error_log("Database error in getVenues: " . $e->getMessage());
            echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }

    private function uploadFile($file, $uploadDir) {
        if ($file && isset($file['tmp_name']) && $file['tmp_name']) {
            $filename = time() . "_" . basename($file['name']);
            $targetPath = $uploadDir . $filename;

            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                return $targetPath;
            }
        }
        return null;
    }
}

// Read data from `$_POST`
$operation = $_POST['operation'] ?? ($_GET['operation'] ?? '');

// Define the default profile picture path
$defaultPfpPath = 'uploads/user_profile/default_pfp.png';

// Initialize classes with default profile picture path
$user = new User($pdo, $defaultPfpPath);
$store = new Store($pdo, $defaultPfpPath);
$venue = new Venue($pdo, $defaultPfpPath);

// Handle API actions
switch ($operation) {
    case "getUserInfo":
        $userId = $_GET['user_id'] ?? null;
        if ($userId) {
            echo $user->getUserInfo($userId);
        } else {
            echo json_encode(["status" => "error", "message" => "User ID is required."]);
        }
        break;
    case "updateUserPfp":
        $userId = $_POST['user_id'] ?? null;
        if ($userId && isset($_FILES['profile_picture'])) {
            echo $user->updateUserPfp($userId, $_FILES['profile_picture']);
        } else {
            echo json_encode(["status" => "error", "message" => "User ID and profile picture are required."]);
        }
        break;
    case "getStoreCategories":
        echo $store->getStoreCategories();
        break;
    case "createStore":
        echo $store->createStore($_POST, $_FILES);
        break;
    case "getStores":
        $userId = $_GET['user_id'] ?? null;
        if ($userId) {
            echo $store->getStores($userId);
        } else {
            echo json_encode(["status" => "error", "message" => "User ID is required."]);
        }
        break;
    case "createVenue":
        echo $venue->createVenue($_POST, $_FILES);
        break;
    case "getVenues":
        $userId = $_GET['user_id'] ?? null;
        if ($userId) {
            echo $venue->getVenues($userId);
        } else {
            echo json_encode(["status" => "error", "message" => "User ID is required."]);
        }
        break;
    default:
        echo json_encode(["status" => "error", "message" => "Invalid action."]);
        break;
}
?>
