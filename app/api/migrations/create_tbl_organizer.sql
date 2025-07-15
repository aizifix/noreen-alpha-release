-- Migration: Create tbl_organizer table
-- Description: Creates the organizer table to store organizer-specific information linked to tbl_users
-- Date: 2024-01-XX

CREATE TABLE IF NOT EXISTS `tbl_organizer` (
  `organizer_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `organizer_experience` text DEFAULT NULL COMMENT 'Experience summary of the organizer',
  `organizer_certifications` text DEFAULT NULL COMMENT 'Certifications and qualifications',
  `organizer_resume_path` varchar(500) DEFAULT NULL COMMENT 'Path to uploaded resume file',
  `organizer_portfolio_link` varchar(255) DEFAULT NULL COMMENT 'Optional portfolio website URL',
  `organizer_availability` enum('flexible','weekdays','weekends','limited') DEFAULT 'flexible' COMMENT 'Availability schedule',
  `remarks` text DEFAULT NULL COMMENT 'Admin notes and remarks',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`organizer_id`),
  UNIQUE KEY `unique_user_organizer` (`user_id`),
  KEY `idx_organizer_availability` (`organizer_availability`),
  KEY `idx_organizer_created` (`created_at`),
  CONSTRAINT `fk_organizer_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Organizer profile information linked to user accounts';

-- Create activity logs table for organizers
CREATE TABLE IF NOT EXISTS `tbl_organizer_activity_logs` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `organizer_id` int(11) NOT NULL,
  `activity_type` varchar(100) NOT NULL COMMENT 'Type of activity (created, updated, etc.)',
  `description` text DEFAULT NULL COMMENT 'Description of the activity',
  `related_id` int(11) DEFAULT NULL COMMENT 'Related entity ID if applicable',
  `metadata` json DEFAULT NULL COMMENT 'Additional activity metadata',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`),
  KEY `idx_organizer_activity` (`organizer_id`),
  KEY `idx_activity_type` (`activity_type`),
  KEY `idx_activity_date` (`created_at`),
  CONSTRAINT `fk_activity_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `tbl_organizer` (`organizer_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Activity logs for organizer actions';

-- Insert some sample data for testing (optional)
-- INSERT INTO `tbl_users` (
--   `user_firstName`, `user_lastName`, `user_email`, `user_contact`,
--   `user_username`, `user_pwd`, `user_role`, `account_status`, `created_at`
-- ) VALUES (
--   'John', 'Smith', 'john.smith@example.com', '+1234567890',
--   'johnsmith', '$2y$10$example_hashed_password', 'organizer', 'active', NOW()
-- );

-- INSERT INTO `tbl_organizer` (
--   `user_id`, `organizer_experience`, `organizer_certifications`,
--   `organizer_availability`, `remarks`, `created_at`
-- ) VALUES (
--   LAST_INSERT_ID(),
--   'Event management professional with 5+ years experience in corporate and social events.',
--   'Certified Event Planner (CEP), Project Management Professional (PMP)',
--   'flexible',
--   'Excellent track record with high-profile clients.',
--   NOW()
-- );
