-- Enhanced Supplier System Migration (SAFE VERSION)
-- This migration safely adds necessary tables and columns, checking for existing structures

-- =====================================================
-- SAFE COLUMN ADDITION PROCEDURES
-- =====================================================

DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS AddColumnIfNotExists(
    IN table_name VARCHAR(255),
    IN column_name VARCHAR(255),
    IN column_definition TEXT
)
BEGIN
    DECLARE column_exists INT DEFAULT 0;

    SELECT COUNT(*) INTO column_exists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = table_name
    AND COLUMN_NAME = column_name;

    IF column_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', table_name, ' ADD COLUMN ', column_name, ' ', column_definition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

CREATE PROCEDURE IF NOT EXISTS ModifyEnumIfNotExists(
    IN table_name VARCHAR(255),
    IN column_name VARCHAR(255),
    IN new_enum_values TEXT
)
BEGIN
    DECLARE current_type TEXT;

    SELECT COLUMN_TYPE INTO current_type
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = table_name
    AND COLUMN_NAME = column_name;

    IF current_type IS NOT NULL AND current_type NOT LIKE CONCAT('%', 'supplier', '%') THEN
        SET @sql = CONCAT('ALTER TABLE ', table_name, ' MODIFY COLUMN ', column_name, ' ', new_enum_values);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- STEP 1: Safely update existing table structures
-- =====================================================

-- Modify tbl_users to support supplier role (only if supplier not already in enum)
CALL ModifyEnumIfNotExists('tbl_users', 'user_role', "ENUM('admin', 'organizer', 'client', 'supplier') NOT NULL");

-- Add new columns to tbl_users if they don't exist
CALL AddColumnIfNotExists('tbl_users', 'force_password_change', 'BOOLEAN DEFAULT FALSE AFTER user_pwd');
CALL AddColumnIfNotExists('tbl_users', 'last_login', 'DATETIME NULL AFTER force_password_change');
CALL AddColumnIfNotExists('tbl_users', 'account_status', "ENUM('active', 'inactive', 'suspended') DEFAULT 'active' AFTER last_login");

-- Check if updated_at column exists before adding
SET @check_updated_at = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_users'
    AND COLUMN_NAME = 'updated_at'
);

IF @check_updated_at = 0 THEN
    ALTER TABLE tbl_users
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
END IF;

-- Enhance tbl_suppliers with additional fields
CALL AddColumnIfNotExists('tbl_suppliers', 'onboarding_status', "ENUM('pending', 'documents_uploaded', 'verified', 'active', 'suspended') DEFAULT 'pending' AFTER is_verified");
CALL AddColumnIfNotExists('tbl_suppliers', 'onboarding_date', 'DATETIME NULL AFTER onboarding_status');
CALL AddColumnIfNotExists('tbl_suppliers', 'last_activity', 'DATETIME NULL AFTER onboarding_date');
CALL AddColumnIfNotExists('tbl_suppliers', 'password_set_at', 'DATETIME NULL AFTER last_activity');
CALL AddColumnIfNotExists('tbl_suppliers', 'terms_accepted_at', 'DATETIME NULL AFTER password_set_at');
CALL AddColumnIfNotExists('tbl_suppliers', 'agreement_file_path', 'VARCHAR(500) NULL AFTER terms_accepted_at');

-- =====================================================
-- STEP 2: Create new tables if they don't exist
-- =====================================================

-- Create tbl_supplier_documents for document management
CREATE TABLE IF NOT EXISTS tbl_supplier_documents (
    document_id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_id INT NOT NULL,
    document_type ENUM('dti', 'business_permit', 'contract', 'portfolio', 'certification', 'other') NOT NULL,
    document_title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT DEFAULT 0,
    file_type VARCHAR(100),
    uploaded_by INT NOT NULL,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by INT NULL,
    verified_at DATETIME NULL,
    verification_notes TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_supplier_documents_supplier (supplier_id),
    INDEX idx_supplier_documents_type (document_type),
    INDEX idx_supplier_documents_active (is_active)
);

-- Add foreign keys only if table was just created
SET @fk_check = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_supplier_documents'
    AND CONSTRAINT_NAME LIKE 'tbl_supplier_documents_ibfk_%'
);

IF @fk_check = 0 THEN
    ALTER TABLE tbl_supplier_documents
    ADD CONSTRAINT fk_supplier_documents_supplier
        FOREIGN KEY (supplier_id) REFERENCES tbl_suppliers(supplier_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_supplier_documents_uploaded_by
        FOREIGN KEY (uploaded_by) REFERENCES tbl_users(user_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_supplier_documents_verified_by
        FOREIGN KEY (verified_by) REFERENCES tbl_users(user_id) ON DELETE SET NULL;
END IF;

-- Create tbl_supplier_activity for activity logging
CREATE TABLE IF NOT EXISTS tbl_supplier_activity (
    activity_id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_id INT NOT NULL,
    activity_type ENUM('created', 'updated', 'document_uploaded', 'document_verified', 'offer_created', 'offer_updated', 'component_delivered', 'profile_updated', 'login', 'password_changed') NOT NULL,
    activity_description TEXT,
    related_id INT NULL,
    metadata JSON NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_supplier_activity_supplier (supplier_id),
    INDEX idx_supplier_activity_type (activity_type),
    INDEX idx_supplier_activity_date (created_at)
);

-- Add foreign key for activity table
SET @fk_activity_check = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_supplier_activity'
    AND CONSTRAINT_NAME = 'fk_supplier_activity_supplier'
);

IF @fk_activity_check = 0 THEN
    ALTER TABLE tbl_supplier_activity
    ADD CONSTRAINT fk_supplier_activity_supplier
        FOREIGN KEY (supplier_id) REFERENCES tbl_suppliers(supplier_id) ON DELETE CASCADE;
END IF;

-- Create tbl_email_logs for tracking email notifications
CREATE TABLE IF NOT EXISTS tbl_email_logs (
    email_log_id INT PRIMARY KEY AUTO_INCREMENT,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    email_type ENUM('supplier_welcome', 'password_reset', 'document_verification', 'booking_notification', 'payment_notification', 'general') NOT NULL,
    subject VARCHAR(500) NOT NULL,
    email_content TEXT,
    sent_status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    sent_at DATETIME NULL,
    error_message TEXT NULL,
    related_user_id INT NULL,
    related_supplier_id INT NULL,
    metadata JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_email_logs_recipient (recipient_email),
    INDEX idx_email_logs_type (email_type),
    INDEX idx_email_logs_status (sent_status),
    INDEX idx_email_logs_date (created_at)
);

-- Add foreign keys for email logs
SET @fk_email_check = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_email_logs'
    AND CONSTRAINT_NAME LIKE 'fk_email_logs_%'
);

IF @fk_email_check = 0 THEN
    ALTER TABLE tbl_email_logs
    ADD CONSTRAINT fk_email_logs_user
        FOREIGN KEY (related_user_id) REFERENCES tbl_users(user_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_email_logs_supplier
        FOREIGN KEY (related_supplier_id) REFERENCES tbl_suppliers(supplier_id) ON DELETE SET NULL;
END IF;

-- Create tbl_supplier_verification_requests for document verification workflow
CREATE TABLE IF NOT EXISTS tbl_supplier_verification_requests (
    verification_id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_id INT NOT NULL,
    requested_by INT NOT NULL,
    verification_type ENUM('initial', 'document_update', 'renewal') DEFAULT 'initial',
    status ENUM('pending', 'in_review', 'approved', 'rejected', 'requires_action') DEFAULT 'pending',
    admin_notes TEXT,
    rejection_reason TEXT,
    reviewed_by INT NULL,
    reviewed_at DATETIME NULL,
    approved_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_supplier_verification_supplier (supplier_id),
    INDEX idx_supplier_verification_status (status),
    INDEX idx_supplier_verification_date (created_at)
);

-- Add foreign keys for verification requests
SET @fk_verification_check = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_supplier_verification_requests'
    AND CONSTRAINT_NAME LIKE 'fk_supplier_verification_%'
);

IF @fk_verification_check = 0 THEN
    ALTER TABLE tbl_supplier_verification_requests
    ADD CONSTRAINT fk_supplier_verification_supplier
        FOREIGN KEY (supplier_id) REFERENCES tbl_suppliers(supplier_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_supplier_verification_requested_by
        FOREIGN KEY (requested_by) REFERENCES tbl_users(user_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_supplier_verification_reviewed_by
        FOREIGN KEY (reviewed_by) REFERENCES tbl_users(user_id) ON DELETE SET NULL;
END IF;

-- Create tbl_supplier_credentials for temporary credential storage
CREATE TABLE IF NOT EXISTS tbl_supplier_credentials (
    credential_id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_id INT NOT NULL,
    user_id INT NOT NULL,
    temp_password_hash VARCHAR(255) NOT NULL,
    email_sent BOOLEAN DEFAULT FALSE,
    used BOOLEAN DEFAULT FALSE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_supplier_credentials_supplier (supplier_id),
    INDEX idx_supplier_credentials_user (user_id),
    INDEX idx_supplier_credentials_expires (expires_at)
);

-- Add foreign keys for credentials
SET @fk_credentials_check = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_supplier_credentials'
    AND CONSTRAINT_NAME LIKE 'fk_supplier_credentials_%'
);

IF @fk_credentials_check = 0 THEN
    ALTER TABLE tbl_supplier_credentials
    ADD CONSTRAINT fk_supplier_credentials_supplier
        FOREIGN KEY (supplier_id) REFERENCES tbl_suppliers(supplier_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_supplier_credentials_user
        FOREIGN KEY (user_id) REFERENCES tbl_users(user_id) ON DELETE CASCADE;
END IF;

-- Create tbl_document_types for reference
CREATE TABLE IF NOT EXISTS tbl_document_types (
    type_id INT PRIMARY KEY AUTO_INCREMENT,
    type_code VARCHAR(50) UNIQUE NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT FALSE,
    max_file_size_mb INT DEFAULT 10,
    allowed_extensions JSON DEFAULT ('["pdf", "jpg", "jpeg", "png", "doc", "docx"]'),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- STEP 3: Insert default data (with duplicate checking)
-- =====================================================

-- Insert default document types (only if they don't exist)
INSERT IGNORE INTO tbl_document_types (type_code, type_name, description, is_required, display_order) VALUES
('dti', 'DTI Permit', 'Department of Trade and Industry business registration permit', TRUE, 1),
('business_permit', 'Business Permit', 'Local government business permit and licenses', TRUE, 2),
('contract', 'Service Contract', 'Signed service agreements and contracts', TRUE, 3),
('portfolio', 'Portfolio', 'Work samples and portfolio documents', FALSE, 4),
('certification', 'Certification', 'Professional certifications and awards', FALSE, 5),
('other', 'Other Documents', 'Miscellaneous supporting documents', FALSE, 6);

-- =====================================================
-- STEP 4: Create indexes safely
-- =====================================================

-- Create indexes only if they don't exist
SET @index_check = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_users'
    AND INDEX_NAME = 'idx_users_force_password_change'
);

IF @index_check = 0 THEN
    CREATE INDEX idx_users_force_password_change ON tbl_users(force_password_change);
END IF;

SET @index_check2 = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_users'
    AND INDEX_NAME = 'idx_users_account_status'
);

IF @index_check2 = 0 THEN
    CREATE INDEX idx_users_account_status ON tbl_users(account_status);
END IF;

SET @index_check3 = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_suppliers'
    AND INDEX_NAME = 'idx_suppliers_onboarding_status'
);

IF @index_check3 = 0 THEN
    CREATE INDEX idx_suppliers_onboarding_status ON tbl_suppliers(onboarding_status);
END IF;

-- =====================================================
-- STEP 5: Create triggers safely
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS tr_update_supplier_activity;

-- Create trigger to update supplier last_activity
DELIMITER $$
CREATE TRIGGER tr_update_supplier_activity
AFTER INSERT ON tbl_supplier_activity
FOR EACH ROW
BEGIN
    UPDATE tbl_suppliers
    SET last_activity = NEW.created_at
    WHERE supplier_id = NEW.supplier_id;
END$$
DELIMITER ;

-- =====================================================
-- STEP 6: Update existing data safely
-- =====================================================

-- Update existing suppliers with default onboarding status (only if column exists and is null)
SET @onboarding_column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_suppliers'
    AND COLUMN_NAME = 'onboarding_status'
);

IF @onboarding_column_exists > 0 THEN
    UPDATE tbl_suppliers
    SET onboarding_status = CASE
        WHEN is_verified = 1 THEN 'active'
        ELSE 'pending'
    END
    WHERE onboarding_status IS NULL;
END IF;

-- =====================================================
-- CLEANUP: Drop temporary procedures
-- =====================================================

DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DROP PROCEDURE IF EXISTS ModifyEnumIfNotExists;

-- =====================================================
-- VERIFICATION AND COMPLETION
-- =====================================================

SELECT 'Enhanced supplier system migration completed successfully!' as message;

-- Show created tables
SELECT TABLE_NAME, TABLE_COMMENT
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME LIKE 'tbl_supplier%'
OR TABLE_NAME LIKE 'tbl_document_types'
ORDER BY TABLE_NAME;

-- Show document types count
SELECT COUNT(*) as document_types_inserted FROM tbl_document_types;

-- Show enhanced columns in tbl_users
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'tbl_users'
AND COLUMN_NAME IN ('force_password_change', 'last_login', 'account_status', 'updated_at')
ORDER BY ORDINAL_POSITION;
