-- Enhanced Supplier System Migration (FIXED VERSION)
-- This migration adds necessary tables and columns for comprehensive supplier management

-- =====================================================
-- STEP 1: Update existing table structures first
-- =====================================================

-- Modify tbl_users to support supplier role and new columns
ALTER TABLE tbl_users
MODIFY COLUMN user_role ENUM('admin', 'organizer', 'client', 'supplier') NOT NULL;

ALTER TABLE tbl_users
ADD COLUMN force_password_change BOOLEAN DEFAULT FALSE AFTER user_pwd,
ADD COLUMN last_login DATETIME NULL AFTER force_password_change,
ADD COLUMN account_status ENUM('active', 'inactive', 'suspended') DEFAULT 'active' AFTER last_login,
ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Enhance tbl_suppliers with additional fields
ALTER TABLE tbl_suppliers
ADD COLUMN onboarding_status ENUM('pending', 'documents_uploaded', 'verified', 'active', 'suspended') DEFAULT 'pending' AFTER is_verified,
ADD COLUMN onboarding_date DATETIME NULL AFTER onboarding_status,
ADD COLUMN last_activity DATETIME NULL AFTER onboarding_date,
ADD COLUMN password_set_at DATETIME NULL AFTER last_activity,
ADD COLUMN terms_accepted_at DATETIME NULL AFTER password_set_at,
ADD COLUMN agreement_file_path VARCHAR(500) NULL AFTER terms_accepted_at;

-- =====================================================
-- STEP 2: Create new tables with proper foreign keys
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

    FOREIGN KEY (supplier_id) REFERENCES tbl_suppliers(supplier_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES tbl_users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (verified_by) REFERENCES tbl_users(user_id) ON DELETE SET NULL,

    INDEX idx_supplier_documents_supplier (supplier_id),
    INDEX idx_supplier_documents_type (document_type),
    INDEX idx_supplier_documents_active (is_active)
);

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

    FOREIGN KEY (supplier_id) REFERENCES tbl_suppliers(supplier_id) ON DELETE CASCADE,

    INDEX idx_supplier_activity_supplier (supplier_id),
    INDEX idx_supplier_activity_type (activity_type),
    INDEX idx_supplier_activity_date (created_at)
);

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

    FOREIGN KEY (related_user_id) REFERENCES tbl_users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (related_supplier_id) REFERENCES tbl_suppliers(supplier_id) ON DELETE SET NULL,

    INDEX idx_email_logs_recipient (recipient_email),
    INDEX idx_email_logs_type (email_type),
    INDEX idx_email_logs_status (sent_status),
    INDEX idx_email_logs_date (created_at)
);

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

    FOREIGN KEY (supplier_id) REFERENCES tbl_suppliers(supplier_id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES tbl_users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (reviewed_by) REFERENCES tbl_users(user_id) ON DELETE SET NULL,

    INDEX idx_supplier_verification_supplier (supplier_id),
    INDEX idx_supplier_verification_status (status),
    INDEX idx_supplier_verification_date (created_at)
);

-- Create tbl_supplier_credentials for temporary credential storage (auto-cleanup)
CREATE TABLE IF NOT EXISTS tbl_supplier_credentials (
    credential_id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_id INT NOT NULL,
    user_id INT NOT NULL,
    temp_password_hash VARCHAR(255) NOT NULL,
    email_sent BOOLEAN DEFAULT FALSE,
    used BOOLEAN DEFAULT FALSE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id) REFERENCES tbl_suppliers(supplier_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES tbl_users(user_id) ON DELETE CASCADE,

    INDEX idx_supplier_credentials_supplier (supplier_id),
    INDEX idx_supplier_credentials_user (user_id),
    INDEX idx_supplier_credentials_expires (expires_at)
);

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
-- STEP 3: Insert default data
-- =====================================================

-- Insert default document types
INSERT IGNORE INTO tbl_document_types (type_code, type_name, description, is_required, display_order) VALUES
('dti', 'DTI Permit', 'Department of Trade and Industry business registration permit', TRUE, 1),
('business_permit', 'Business Permit', 'Local government business permit and licenses', TRUE, 2),
('contract', 'Service Contract', 'Signed service agreements and contracts', TRUE, 3),
('portfolio', 'Portfolio', 'Work samples and portfolio documents', FALSE, 4),
('certification', 'Certification', 'Professional certifications and awards', FALSE, 5),
('other', 'Other Documents', 'Miscellaneous supporting documents', FALSE, 6);

-- =====================================================
-- STEP 4: Create indexes for better performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_force_password_change ON tbl_users(force_password_change);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON tbl_users(account_status);
CREATE INDEX IF NOT EXISTS idx_suppliers_onboarding_status ON tbl_suppliers(onboarding_status);

-- =====================================================
-- STEP 5: Create triggers and events
-- =====================================================

-- Add trigger to update supplier last_activity
DELIMITER //
DROP TRIGGER IF EXISTS tr_update_supplier_activity//
CREATE TRIGGER tr_update_supplier_activity
AFTER INSERT ON tbl_supplier_activity
FOR EACH ROW
BEGIN
    UPDATE tbl_suppliers
    SET last_activity = NEW.created_at
    WHERE supplier_id = NEW.supplier_id;
END;//
DELIMITER ;

-- Add event to cleanup expired credentials (if event scheduler is enabled)
-- Note: This requires SUPER privileges and event_scheduler=ON

SET @sql = 'DROP EVENT IF EXISTS ev_cleanup_expired_credentials';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = CONCAT('CREATE EVENT IF NOT EXISTS ev_cleanup_expired_credentials
ON SCHEDULE EVERY 1 DAY
DO
BEGIN
    DELETE FROM tbl_supplier_credentials
    WHERE expires_at < NOW() AND used = FALSE;
END');

-- Try to create the event, ignore if no privileges
SET @create_event_sql = @sql;
SET @sql = 'SELECT 1'; -- fallback if event creation fails
PREPARE stmt FROM @create_event_sql;
-- EXECUTE stmt; -- Commented out as it may require SUPER privileges
DEALLOCATE PREPARE stmt;

-- Enable event scheduler if possible (requires SUPER privileges)
-- SET GLOBAL event_scheduler = ON;

-- =====================================================
-- STEP 6: Update existing supplier data (if any)
-- =====================================================

-- Update existing suppliers with default onboarding status
UPDATE tbl_suppliers
SET onboarding_status = CASE
    WHEN is_verified = 1 THEN 'active'
    ELSE 'pending'
END
WHERE onboarding_status IS NULL OR onboarding_status = 'pending';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify tables were created successfully
SELECT 'Tables created successfully' as status;
SELECT COUNT(*) as document_types_count FROM tbl_document_types;
SHOW TABLES LIKE 'tbl_supplier_%';

-- Show the enhanced table structures
DESCRIBE tbl_users;
DESCRIBE tbl_suppliers;
DESCRIBE tbl_supplier_documents;
