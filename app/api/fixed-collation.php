<?php
// This fix adds proper collation handling for concatenated fields in queries
// It should be included in admin.php at the appropriate location

/**
 * Function to enforce consistent collation for concatenated strings
 * This should be used when constructing SQL queries with CONCAT operations
 *
 * @param string $field The database field or string to convert
 * @return string The SQL fragment with explicit collation
 */
function enforceConcatCollation($field) {
    return "CONVERT($field USING utf8mb4) COLLATE utf8mb4_general_ci";
}

/**
 * Wraps a string field in CONVERT to ensure consistent collation
 * Example: convertField("user_firstName") => "CONVERT(user_firstName USING utf8mb4) COLLATE utf8mb4_general_ci"
 *
 * @param string $fieldName The name of the database field
 * @return string SQL fragment with explicit collation
 */
function convertField($fieldName) {
    return "CONVERT($fieldName USING utf8mb4) COLLATE utf8mb4_general_ci";
}

/**
 * Creates a safe concat expression with proper collation
 * Example: safeConcat(["u.user_firstName", "' '", "u.user_lastName"]) => "CONCAT(CONVERT(u.user_firstName USING utf8mb4) COLLATE utf8mb4_general_ci, ' ', CONVERT(u.user_lastName USING utf8mb4) COLLATE utf8mb4_general_ci)"
 *
 * @param array $parts Array of strings or field names to concatenate
 * @return string SQL CONCAT statement with proper collation handling
 */
function safeConcat(array $parts) {
    $convertedParts = [];

    foreach ($parts as $part) {
        // Check if this part is a literal string (in quotes) or a field name
        if (substr($part, 0, 1) === "'" && substr($part, -1) === "'") {
            // It's a string literal, no need to convert
            $convertedParts[] = $part . " COLLATE utf8mb4_general_ci";
        } else {
            // It's likely a field name, so convert it
            $convertedParts[] = "CONVERT($part USING utf8mb4) COLLATE utf8mb4_general_ci";
        }
    }

    return "CONCAT(" . implode(", ", $convertedParts) . ")";
}

/**
 * Fix potentially problematic SQL that may cause collation issues
 * This is a utility function to wrap around SQL strings before execution
 *
 * @param string $sql The SQL query that might have collation issues
 * @return string Fixed SQL with proper collation handling
 */
function fixCollationInSql($sql) {
    // Replace simple CONCAT pattern with safe CONCAT
    $pattern = '/CONCAT\(([^)]+)\)/';
    return preg_replace_callback($pattern, function($matches) {
        $innerParts = explode(',', $matches[1]);
        $convertedParts = [];

        foreach ($innerParts as $part) {
            $part = trim($part);
            // Check if this is a literal string or field
            if (substr($part, 0, 1) === "'" && substr($part, -1) === "'") {
                $convertedParts[] = $part . " COLLATE utf8mb4_general_ci";
            } else {
                $convertedParts[] = "CONVERT($part USING utf8mb4) COLLATE utf8mb4_general_ci";
            }
        }

        return "CONCAT(" . implode(", ", $convertedParts) . ")";
    }, $sql);
}

/**
 * Enhanced MySQL session setup with proper collation
 * This should be called at the beginning of any script or function
 * that interacts with the database
 *
 * @param PDO $pdo The PDO connection object
 * @return void
 */
function setupMySQLSession(PDO $pdo) {
    try {
        $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_general_ci");
        $pdo->exec("SET SESSION collation_connection = 'utf8mb4_general_ci'");
        $pdo->exec("SET SESSION collation_database = 'utf8mb4_general_ci'");
        $pdo->exec("SET SESSION collation_server = 'utf8mb4_general_ci'");
        $pdo->exec("SET SESSION character_set_connection = 'utf8mb4'");
        $pdo->exec("SET SESSION character_set_database = 'utf8mb4'");
        $pdo->exec("SET SESSION character_set_server = 'utf8mb4'");
        $pdo->exec("SET SESSION sql_mode = ''");
    } catch (Exception $e) {
        error_log("MySQL session setup failed: " . $e->getMessage());
    }
}

/**
 * Handle fields that could be null
 * Ensures that null values are properly converted to empty strings before concatenation
 *
 * @param string $field The field or value to process
 * @return string SQL expression that handles NULL values
 */
function nullSafeField($field) {
    return "IFNULL(CONVERT($field USING utf8mb4), '') COLLATE utf8mb4_general_ci";
}
