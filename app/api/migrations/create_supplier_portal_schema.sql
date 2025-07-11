-- Enhanced Supplier Portal Schema Migration
-- This migration adds tiered offers system with sub-components and improves integration

-- Update tbl_users to include supplier role
ALTER TABLE `tbl_users`
MODIFY COLUMN `user_role` ENUM('admin','organizer','client','supplier') NOT NULL;

-- Create table for offer sub-components (items included in each tier)
CREATE TABLE `tbl_offer_subcomponents` (
  `subcomponent_id` int(11) NOT NULL AUTO_INCREMENT,
  `offer_id` int(11) NOT NULL,
  `component_title` varchar(255) NOT NULL,
  `component_description` text DEFAULT NULL,
  `is_customizable` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether client can customize this component',
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`subcomponent_id`),
  KEY `fk_subcomponent_offer` (`offer_id`),
  CONSTRAINT `fk_subcomponent_offer` FOREIGN KEY (`offer_id`) REFERENCES `tbl_supplier_offers` (`offer_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create table for package components (links packages to supplier offers)
CREATE TABLE `tbl_package_components` (
  `component_id` int(11) NOT NULL AUTO_INCREMENT,
  `package_id` int(11) NOT NULL,
  `supplier_id` int(11) DEFAULT NULL COMMENT 'NULL for venue inclusions or manual entries',
  `offer_id` int(11) DEFAULT NULL COMMENT 'NULL for venue inclusions or manual entries',
  `venue_inclusion_id` int(11) DEFAULT NULL COMMENT 'FK to tbl_venue_inclusions for locked items',
  `component_title` varchar(255) NOT NULL,
  `component_description` text DEFAULT NULL,
  `component_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_locked` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Locked venue inclusions cannot be edited',
  `is_manual` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Manually added components not linked to suppliers',
  `tier_level` varchar(50) DEFAULT NULL COMMENT 'Tier name (Premium, Standard, Basic, etc.)',
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`component_id`),
  KEY `fk_package_component_package` (`package_id`),
  KEY `fk_package_component_supplier` (`supplier_id`),
  KEY `fk_package_component_offer` (`offer_id`),
  KEY `idx_component_locked` (`is_locked`),
  KEY `idx_component_manual` (`is_manual`),
  CONSTRAINT `fk_package_component_package` FOREIGN KEY (`package_id`) REFERENCES `tbl_packages` (`package_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_package_component_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `tbl_suppliers` (`supplier_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_package_component_offer` FOREIGN KEY (`offer_id`) REFERENCES `tbl_supplier_offers` (`offer_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create table for event components (copied from package when event is created)
CREATE TABLE `tbl_event_components` (
  `event_component_id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `package_component_id` int(11) DEFAULT NULL COMMENT 'Reference to original package component',
  `supplier_id` int(11) DEFAULT NULL,
  `offer_id` int(11) DEFAULT NULL,
  `component_title` varchar(255) NOT NULL,
  `component_description` text DEFAULT NULL,
  `component_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `actual_cost` decimal(10,2) DEFAULT NULL COMMENT 'Actual cost paid (may differ from quoted price)',
  `is_locked` tinyint(1) NOT NULL DEFAULT 0,
  `is_manual` tinyint(1) NOT NULL DEFAULT 0,
  `tier_level` varchar(50) DEFAULT NULL,
  `supplier_status` enum('pending','confirmed','delivered','cancelled') DEFAULT 'pending',
  `supplier_notes` text DEFAULT NULL,
  `admin_notes` text DEFAULT NULL,
  `delivery_date` date DEFAULT NULL,
  `is_rated` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether this component has been rated post-event',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`event_component_id`),
  KEY `fk_event_component_event` (`event_id`),
  KEY `fk_event_component_package` (`package_component_id`),
  KEY `fk_event_component_supplier` (`supplier_id`),
  KEY `fk_event_component_offer` (`offer_id`),
  KEY `idx_event_component_status` (`supplier_status`),
  KEY `idx_event_component_rated` (`is_rated`),
  CONSTRAINT `fk_event_component_event` FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_event_component_package` FOREIGN KEY (`package_component_id`) REFERENCES `tbl_package_components` (`component_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_event_component_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `tbl_suppliers` (`supplier_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_event_component_offer` FOREIGN KEY (`offer_id`) REFERENCES `tbl_supplier_offers` (`offer_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create table for supplier documents (separate from registration docs)
CREATE TABLE `tbl_supplier_documents` (
  `document_id` int(11) NOT NULL AUTO_INCREMENT,
  `supplier_id` int(11) NOT NULL,
  `document_type` enum('dti','business_permit','contract','portfolio','certification','other') NOT NULL,
  `document_title` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `uploaded_by` int(11) DEFAULT NULL COMMENT 'User ID who uploaded (admin or supplier)',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Admin verification status',
  `verification_notes` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`document_id`),
  KEY `fk_supplier_doc_supplier` (`supplier_id`),
  KEY `fk_supplier_doc_uploader` (`uploaded_by`),
  KEY `idx_supplier_doc_type` (`document_type`),
  KEY `idx_supplier_doc_verified` (`is_verified`),
  CONSTRAINT `fk_supplier_doc_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `tbl_suppliers` (`supplier_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_supplier_doc_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Enhance tbl_supplier_offers with tier information
ALTER TABLE `tbl_supplier_offers`
ADD COLUMN `tier_name` varchar(100) DEFAULT NULL COMMENT 'Tier name (Premium, Standard, Basic)' AFTER `offer_title`,
ADD COLUMN `tier_level` int(11) DEFAULT 1 COMMENT 'Tier priority (1=highest, 3=lowest)' AFTER `tier_name`,
ADD COLUMN `is_featured` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Featured/recommended tier' AFTER `tier_level`,
ADD COLUMN `max_guests` int(11) DEFAULT NULL COMMENT 'Maximum guests this tier can accommodate' AFTER `package_size`,
ADD COLUMN `setup_fee` decimal(10,2) DEFAULT 0.00 COMMENT 'One-time setup cost' AFTER `price_max`,
ADD COLUMN `cancellation_policy` text DEFAULT NULL COMMENT 'Cancellation terms' AFTER `terms_conditions`,
ADD INDEX `idx_offer_tier_level` (`tier_level`),
ADD INDEX `idx_offer_featured` (`is_featured`);

-- Enhance tbl_supplier_ratings to link to specific components
ALTER TABLE `tbl_supplier_ratings`
ADD COLUMN `event_component_id` int(11) DEFAULT NULL COMMENT 'Specific component being rated' AFTER `event_id`,
ADD COLUMN `component_satisfaction` tinyint(1) DEFAULT NULL COMMENT 'Satisfaction with specific component (1-5)' AFTER `value_for_money`,
ADD KEY `fk_rating_event_component` (`event_component_id`),
ADD CONSTRAINT `fk_rating_event_component` FOREIGN KEY (`event_component_id`) REFERENCES `tbl_event_components` (`event_component_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Create supplier portal activity log
CREATE TABLE `tbl_supplier_activity` (
  `activity_id` int(11) NOT NULL AUTO_INCREMENT,
  `supplier_id` int(11) NOT NULL,
  `activity_type` enum('offer_created','offer_updated','offer_deleted','document_uploaded','profile_updated','component_delivered') NOT NULL,
  `activity_description` text NOT NULL,
  `related_id` int(11) DEFAULT NULL COMMENT 'ID of related entity (offer_id, document_id, etc.)',
  `metadata` json DEFAULT NULL COMMENT 'Additional activity data',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`activity_id`),
  KEY `fk_supplier_activity_supplier` (`supplier_id`),
  KEY `idx_supplier_activity_type` (`activity_type`),
  KEY `idx_supplier_activity_date` (`created_at`),
  CONSTRAINT `fk_supplier_activity_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `tbl_suppliers` (`supplier_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert sample data for tier-based offers
INSERT INTO `tbl_offer_subcomponents` (`offer_id`, `component_title`, `component_description`, `is_customizable`, `display_order`) VALUES
-- Premium Wedding Catering Package subcomponents
(1, 'Welcome cocktail service', 'Pre-ceremony cocktail reception with signature drinks', 1, 1),
(1, 'Five-course plated dinner', 'Chef-curated menu with premium ingredients', 1, 2),
(1, 'Champagne toast service', 'Premium champagne for wedding toasts', 0, 3),
(1, 'Late-night snack station', 'Comfort food station for evening reception', 1, 4),
(1, 'Professional service staff', 'Dedicated waitstaff and event coordinator', 0, 5),

-- Corporate Event Catering subcomponents
(2, 'Coffee & pastry breakfast', 'Morning refreshments for meetings', 1, 1),
(2, 'Buffet lunch service', 'Business lunch with dietary accommodations', 1, 2),
(2, 'Beverage service', 'Coffee, tea, and soft drinks throughout event', 0, 3),
(2, 'Setup and cleanup', 'Complete service including venue preparation', 0, 4),

-- Wedding Photography Full Day subcomponents
(3, 'Getting ready coverage', 'Bridal preparation and pre-ceremony photos', 0, 1),
(3, 'Ceremony documentation', 'Complete ceremony coverage with multiple angles', 0, 2),
(3, 'Cocktail hour photos', 'Candid guest interaction photography', 0, 3),
(3, 'Reception coverage', 'First dance, speeches, and party moments', 0, 4),
(3, 'Professional editing', '500+ professionally edited high-resolution images', 0, 5),
(3, 'Highlight video', 'Cinematic wedding day highlight reel', 1, 6);

-- Update existing offers with tier information
UPDATE `tbl_supplier_offers` SET
  `tier_name` = 'Premium Package',
  `tier_level` = 1,
  `is_featured` = 1,
  `max_guests` = 200,
  `setup_fee` = 5000.00
WHERE `offer_id` = 1;

UPDATE `tbl_supplier_offers` SET
  `tier_name` = 'Corporate Standard',
  `tier_level` = 2,
  `is_featured` = 0,
  `max_guests` = 50,
  `setup_fee` = 2000.00
WHERE `offer_id` = 2;

UPDATE `tbl_supplier_offers` SET
  `tier_name` = 'Full Day Coverage',
  `tier_level` = 1,
  `is_featured` = 1,
  `max_guests` = 300,
  `setup_fee` = 0.00
WHERE `offer_id` = 3;

UPDATE `tbl_supplier_offers` SET
  `tier_name` = 'Half Day Package',
  `tier_level` = 2,
  `is_featured` = 0,
  `max_guests` = 150,
  `setup_fee` = 0.00
WHERE `offer_id` = 4;

UPDATE `tbl_supplier_offers` SET
  `tier_name` = 'Complete Bridal Florals',
  `tier_level` = 1,
  `is_featured` = 1,
  `max_guests` = 200,
  `setup_fee` = 1500.00
WHERE `offer_id` = 5;

UPDATE `tbl_supplier_offers` SET
  `tier_name` = 'Reception Centerpieces',
  `tier_level` = 2,
  `is_featured` = 0,
  `max_guests` = 100,
  `setup_fee` = 500.00
WHERE `offer_id` = 6;

UPDATE `tbl_supplier_offers` SET
  `tier_name` = 'Complete AV Solution',
  `tier_level` = 1,
  `is_featured` = 1,
  `max_guests` = 300,
  `setup_fee` = 3000.00
WHERE `offer_id` = 7;

UPDATE `tbl_supplier_offers` SET
  `tier_name` = 'Basic Sound Package',
  `tier_level` = 2,
  `is_featured` = 0,
  `max_guests` = 100,
  `setup_fee` = 1000.00
WHERE `offer_id` = 8;
