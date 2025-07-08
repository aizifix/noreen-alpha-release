-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 08, 2025 at 06:04 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `es_v1`
--

-- --------------------------------------------------------

--
-- Table structure for table `tbl_2fa`
--

CREATE TABLE `tbl_2fa` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `otp_code` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_bookings`
--

CREATE TABLE `tbl_bookings` (
  `booking_id` int(11) NOT NULL,
  `booking_reference` varchar(50) NOT NULL,
  `user_id` int(11) NOT NULL,
  `event_type_id` int(11) DEFAULT NULL,
  `event_name` varchar(255) DEFAULT NULL,
  `event_date` date DEFAULT NULL,
  `event_time` time DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `guest_count` int(11) NOT NULL DEFAULT 0,
  `venue_id` int(11) DEFAULT NULL,
  `package_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `booking_status` enum('pending','confirmed','converted','cancelled','completed') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_bookings`
--

INSERT INTO `tbl_bookings` (`booking_id`, `booking_reference`, `user_id`, `event_type_id`, `event_name`, `event_date`, `event_time`, `start_time`, `end_time`, `guest_count`, `venue_id`, `package_id`, `notes`, `booking_status`, `created_at`, `updated_at`) VALUES
(7, 'BK-20250625-1100', 15, 5, 'ad', '2025-06-26', '10:00:00', '10:00:00', '18:00:00', 100, 30, 15, 'ad', 'converted', '2025-06-25 06:02:06', '2025-06-25 08:26:36'),
(8, 'BK-20250625-4040', 15, 5, 'Other Event ', '2025-06-26', '10:00:00', '10:00:00', '18:00:00', 100, 29, 15, 'Other Event ', 'converted', '2025-06-25 08:29:08', '2025-06-25 09:10:39'),
(9, 'BK-20250626-5133', 15, 1, 'hb', '2025-06-29', '10:00:00', '10:00:00', '18:00:00', 50, 29, 15, 'hb', 'converted', '2025-06-26 10:36:30', '2025-06-26 10:40:27');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_budget`
--

CREATE TABLE `tbl_budget` (
  `budget_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `total_budget` decimal(10,2) NOT NULL,
  `allocated_budget` decimal(10,2) NOT NULL,
  `remaining_budget` decimal(10,2) NOT NULL,
  `downpayment_amount` decimal(10,2) NOT NULL,
  `payment_status` enum('pending','partial','paid') NOT NULL DEFAULT 'pending',
  `payment_date` date DEFAULT NULL,
  `budget_file` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_events`
--

CREATE TABLE `tbl_events` (
  `event_id` int(11) NOT NULL,
  `original_booking_reference` varchar(50) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `organizer_id` int(11) DEFAULT NULL,
  `event_title` varchar(255) NOT NULL,
  `event_theme` varchar(255) DEFAULT NULL,
  `event_description` text DEFAULT NULL,
  `event_type_id` int(11) NOT NULL,
  `guest_count` int(11) NOT NULL DEFAULT 0,
  `event_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `payment_status` enum('unpaid','partial','paid','refunded') DEFAULT 'unpaid',
  `package_id` int(11) DEFAULT NULL,
  `venue_id` int(11) DEFAULT NULL,
  `total_budget` decimal(12,2) NOT NULL DEFAULT 0.00,
  `down_payment` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_schedule_type_id` int(11) DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `additional_notes` text DEFAULT NULL,
  `event_status` enum('draft','confirmed','on_going','done','cancelled') DEFAULT 'draft',
  `booking_date` date DEFAULT NULL,
  `booking_time` time DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `event_attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'File attachments for the event' CHECK (json_valid(`event_attachments`)),
  `event_feedback_id` int(11) DEFAULT NULL COMMENT 'Link to feedback if available',
  `event_wedding_form_id` int(11) DEFAULT NULL COMMENT 'Link to wedding details if wedding event',
  `is_recurring` tinyint(1) DEFAULT 0 COMMENT 'Flag for recurring events',
  `recurrence_rule` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Recurrence configuration (iCal-style or custom)' CHECK (json_valid(`recurrence_rule`)),
  `cancellation_reason` text DEFAULT NULL COMMENT 'Reason for cancellation if applicable',
  `finalized_at` datetime DEFAULT NULL COMMENT 'When event details were finalized',
  `client_signature` text DEFAULT NULL COMMENT 'Digital signature reference or file path'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_events`
--

INSERT INTO `tbl_events` (`event_id`, `original_booking_reference`, `user_id`, `admin_id`, `organizer_id`, `event_title`, `event_theme`, `event_description`, `event_type_id`, `guest_count`, `event_date`, `start_time`, `end_time`, `payment_status`, `package_id`, `venue_id`, `total_budget`, `down_payment`, `payment_method`, `payment_schedule_type_id`, `reference_number`, `additional_notes`, `event_status`, `booking_date`, `booking_time`, `created_by`, `updated_by`, `created_at`, `updated_at`, `event_attachments`, `event_feedback_id`, `event_wedding_form_id`, `is_recurring`, `recurrence_rule`, `cancellation_reason`, `finalized_at`, `client_signature`) VALUES
(28, 'BK-20250625-1100', 15, 7, NULL, 'ad', NULL, NULL, 5, 100, '2025-06-26', '10:00:00', '18:00:00', 'partial', 15, 30, 260000.00, 149000.00, 'gcash', 2, '12312312312', 'ad', 'draft', NULL, NULL, NULL, NULL, '2025-06-25 08:26:36', '2025-07-07 13:56:00', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(29, 'BK-20250625-4040', 15, 7, NULL, 'Other Event ', NULL, NULL, 5, 100, '2025-06-26', '10:00:00', '18:00:00', 'partial', 15, 29, 294000.00, 147000.00, 'bank-transfer', 2, '123234', 'Other Event ', 'draft', NULL, NULL, NULL, NULL, '2025-06-25 09:10:39', '2025-06-25 09:10:39', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(30, NULL, 15, 7, NULL, 'Wedding with Wedding Form', NULL, NULL, 1, 100, '2025-06-28', '06:00:00', '08:00:00', 'partial', 15, NULL, 250000.00, 125000.00, 'gcash', 2, '13123123', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-06-26 07:17:02', '2025-06-26 07:17:02', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(31, NULL, 15, 7, NULL, 'Test', NULL, NULL, 1, 100, '2025-06-27', '11:30:00', '18:00:00', 'partial', 15, 29, 164000.00, 82000.00, 'gcash', 2, '12312', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-06-26 08:36:53', '2025-06-26 08:36:53', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(32, NULL, 15, 7, NULL, 'sdf', NULL, NULL, 1, 100, '2025-06-29', '11:00:00', '11:30:00', 'partial', 15, 30, 298000.00, 149000.00, 'gcash', 2, 'sdfsdf', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-06-26 08:39:30', '2025-06-26 08:39:30', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(33, NULL, 15, 7, NULL, 'TTTTTTT', NULL, NULL, 1, 100, '2025-06-30', '11:30:00', '12:00:00', 'partial', 15, 30, 298000.00, 149000.00, 'gcash', 2, 'sdfsdf', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-06-26 08:50:59', '2025-06-26 08:50:59', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(34, 'BK-20250626-5133', 15, 7, NULL, 'hb', NULL, NULL, 1, 100, '2025-06-29', '10:00:00', '18:00:00', 'partial', 15, 29, 294000.00, 147000.00, 'gcash', 2, '567567', 'hb', 'draft', NULL, NULL, NULL, NULL, '2025-06-26 10:40:27', '2025-06-26 10:40:27', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(35, NULL, 5, 7, NULL, 'Other Event Test', NULL, NULL, 5, 100, '2025-07-03', '11:00:00', '12:00:00', 'unpaid', 15, 30, 298000.00, 0.00, 'gcash', 2, 'AAAAA', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-07-01 09:00:58', '2025-07-01 09:00:58', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(36, NULL, 5, 7, NULL, 'Other Event Test', NULL, NULL, 5, 100, '2025-07-03', '11:00:00', '12:00:00', 'unpaid', 15, 30, 298000.00, 0.00, 'gcash', 2, '12312312312', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-07-01 09:08:59', '2025-07-01 09:08:59', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(37, NULL, 5, 7, NULL, 'Event with Payment Proof', NULL, NULL, 5, 100, '2025-07-10', '12:00:00', '16:30:00', 'unpaid', 15, 30, 298000.00, 0.00, 'gcash', 2, '12345', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-07-01 09:38:10', '2025-07-01 09:38:10', NULL, NULL, NULL, 0, NULL, NULL, '2025-07-01 09:38:10', NULL),
(38, NULL, 15, 7, NULL, 'Fix Payment Logic and Attachments', NULL, NULL, 1, 100, '2025-07-11', '10:30:00', '11:30:00', 'unpaid', 15, 30, 298000.00, 0.00, 'gcash', 2, '312312312123', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-07-01 09:56:19', '2025-07-01 09:56:19', NULL, NULL, NULL, 0, NULL, NULL, '2025-07-01 09:56:19', NULL),
(39, NULL, 5, 7, NULL, 'Another Fix v2', NULL, NULL, 5, 100, '2025-07-12', '10:30:00', '18:00:00', 'unpaid', 15, 30, 298000.00, 0.00, 'gcash', 2, '3322112312', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-07-01 10:23:42', '2025-07-01 10:23:42', NULL, NULL, NULL, 0, NULL, NULL, '2025-07-01 10:23:42', NULL),
(40, NULL, 5, 7, NULL, 'V3 - Payment Method Attempt', 'Sample', 'This is just a test for the attachment', 5, 100, '2025-07-13', '12:00:00', '12:30:00', 'partial', 15, 30, 298000.00, 149000.00, 'gcash', 2, '12333212123', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-07-01 10:40:11', '2025-07-01 10:40:11', '[{\"original_name\":\"slZvL8ENq49hJ2iYPMNBXqyoJNa.webp\",\"file_name\":\"1751366355_6863bad32a443.webp\",\"file_path\":\"uploads/event_attachments/1751366355_6863bad32a443.webp\",\"file_size\":18188,\"file_type\":\"image/webp\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-01T10:39:15.174Z\"}]', NULL, NULL, 0, NULL, NULL, '2025-07-01 10:40:11', 'Yes'),
(41, NULL, 5, 7, NULL, 'Event Name', 'Sample Theme', NULL, 5, 100, '2025-07-31', '10:00:00', '11:30:00', 'paid', 15, 30, 298000.00, 253300.00, 'bank-transfer', 2, '8234908149082390823', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-07-01 10:45:50', '2025-07-02 15:13:26', '[{\"original_name\":\"slZvL8ENq49hJ2iYPMNBXqyoJNa.webp\",\"file_name\":\"1751366711_6863bc3724ee8.webp\",\"file_path\":\"uploads/event_attachments/1751366711_6863bc3724ee8.webp\",\"file_size\":18188,\"file_type\":\"image/webp\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-01T10:45:11.164Z\"}]', NULL, NULL, 0, NULL, NULL, '2025-07-01 10:45:50', 'Sample Signature'),
(42, NULL, 15, 7, NULL, 'Montreal Wedding', 'Theme', NULL, 5, 100, '2025-07-23', '11:00:00', '11:30:00', 'paid', 15, 30, 298000.00, 208600.00, 'cash', 2, NULL, NULL, 'draft', NULL, NULL, NULL, NULL, '2025-07-02 00:10:56', '2025-07-03 01:00:36', '[{\"original_name\":\"Happy Dance GIF.gif\",\"file_name\":\"1751415019_686478eb8865c.gif\",\"file_path\":\"uploads/event_attachments/1751415019_686478eb8865c.gif\",\"file_size\":131101,\"file_type\":\"image/gif\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-02T00:10:19.561Z\"},{\"original_name\":\"Clap Applause GIF(1).gif\",\"file_name\":\"1751415019_686478eb8cc66.gif\",\"file_path\":\"uploads/event_attachments/1751415019_686478eb8cc66.gif\",\"file_size\":70666,\"file_type\":\"image/gif\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-02T00:10:19.578Z\"},{\"original_name\":\"Fight Mma GIF.gif\",\"file_name\":\"1751415019_686478eb92053.gif\",\"file_path\":\"uploads/event_attachments/1751415019_686478eb92053.gif\",\"file_size\":968206,\"file_type\":\"image/gif\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-02T00:10:19.599Z\"},{\"original_name\":\"Clap Applause GIF.gif\",\"file_name\":\"1751415019_686478eb9515b.gif\",\"file_path\":\"uploads/event_attachments/1751415019_686478eb9515b.gif\",\"file_size\":36254,\"file_type\":\"image/gif\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-02T00:10:19.612Z\"},{\"original_name\":\"Angry Hamster GIF(1).gif\",\"file_name\":\"1751415019_686478eb98fbf.gif\",\"file_path\":\"uploads/event_attachments/1751415019_686478eb98fbf.gif\",\"file_size\":284734,\"file_type\":\"image/gif\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-02T00:10:19.628Z\"}]', NULL, NULL, 0, NULL, NULL, '2025-07-02 00:10:56', 'Approveev'),
(43, NULL, 15, 7, NULL, 'Montreal Wedding', 'modern-minimalist', NULL, 1, 100, '2025-07-11', '12:00:00', '14:00:00', 'partial', 15, 30, 250000.00, 212500.00, 'gcash', 2, '123123123123', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-07-02 06:29:36', '2025-07-02 06:29:36', '[{\"original_name\":\"User_Involvement_Case_Study_Summary.pdf\",\"file_name\":\"1751436726_6864cdb6df266.pdf\",\"file_path\":\"uploads/event_attachments/1751436726_6864cdb6df266.pdf\",\"file_size\":2340,\"file_type\":\"application/pdf\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-02T06:12:06.915Z\"}]', NULL, NULL, 0, NULL, NULL, '2025-07-02 06:29:36', NULL),
(44, NULL, 15, 7, NULL, 'Test Event', 'custom', NULL, 5, 100, '2025-07-18', '07:30:00', '13:00:00', 'partial', 15, 30, 250000.00, 62500.00, 'gcash', 2, '1231231231231231231231', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-07-02 06:55:23', '2025-07-02 06:55:23', '[{\"original_name\":\"User_Involvement_Case_Study_Summary.pdf\",\"file_name\":\"1751439219_6864d773cddca.pdf\",\"file_path\":\"uploads/event_attachments/1751439219_6864d773cddca.pdf\",\"file_size\":2340,\"file_type\":\"application/pdf\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-02T06:53:39.845Z\"}]', NULL, NULL, 0, NULL, NULL, '2025-07-02 06:55:23', NULL),
(45, NULL, 15, 7, NULL, 'Proper Event V5', 'color-coordinated', NULL, 5, 100, '2025-07-03', '10:00:00', '18:00:00', 'partial', 15, 30, 250000.00, 212500.00, 'gcash', 2, '1231231231231231231231', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-07-02 13:20:50', '2025-07-02 13:20:50', '[{\"original_name\":\"image_2025-07-02_212037501.png\",\"file_name\":\"1751462437_68653225860a8.png\",\"file_path\":\"uploads/event_attachments/1751462437_68653225860a8.png\",\"file_size\":43446,\"file_type\":\"image/png\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-02T13:20:37.550Z\"}]', NULL, NULL, 0, NULL, NULL, '2025-07-02 13:20:50', NULL),
(46, NULL, 15, 7, NULL, 'Annivesary', 'cultural-traditional', NULL, 2, 100, '2025-07-08', '10:00:00', '18:00:00', 'partial', 18, 30, 249999.99, 187499.99, 'gcash', 2, '31212131233123123', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-07-07 20:04:55', '2025-07-07 20:04:55', '[{\"original_name\":\"a14c24f2-7492-4651-829b-d25f0e1cabd6.jpg\",\"file_name\":\"1751918669_686c284d61bb7.jpg\",\"file_path\":\"uploads/event_attachments/1751918669_686c284d61bb7.jpg\",\"file_size\":95092,\"file_type\":\"image/jpeg\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-07T20:04:29.402Z\"},{\"original_name\":\"User_Stories_Event_Planning_System.docx\",\"file_name\":\"1751918671_686c284f2c616.docx\",\"file_path\":\"uploads/event_attachments/1751918671_686c284f2c616.docx\",\"file_size\":42584,\"file_type\":\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-07T20:04:31.184Z\"},{\"original_name\":\"a14c24f2-7492-4651-829b-d25f0e1cabd6.jpg\",\"file_name\":\"1751918672_686c28505cb3f.jpg\",\"file_path\":\"uploads/event_attachments/1751918672_686c28505cb3f.jpg\",\"file_size\":95092,\"file_type\":\"image/jpeg\",\"description\":\"\",\"attachment_type\":\"event_attachment\",\"uploaded_at\":\"2025-07-07T20:04:32.381Z\"}]', NULL, NULL, 0, NULL, NULL, '2025-07-07 20:04:55', 'Agree');

--
-- Triggers `tbl_events`
--
DELIMITER $$
CREATE TRIGGER `tr_events_update_tracking` BEFORE UPDATE ON `tbl_events` FOR EACH ROW BEGIN
    -- Auto-update timestamp
    SET NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- If updated_by is not explicitly set, try to maintain it
    IF NEW.updated_by IS NULL AND OLD.updated_by IS NOT NULL THEN
        SET NEW.updated_by = OLD.updated_by;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_events_backup`
--

CREATE TABLE `tbl_events_backup` (
  `event_id` int(11) NOT NULL DEFAULT 0,
  `original_booking_reference` varchar(50) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `organizer_id` int(11) DEFAULT NULL,
  `event_title` varchar(255) NOT NULL,
  `event_theme` varchar(255) DEFAULT NULL,
  `event_description` text DEFAULT NULL,
  `event_type_id` int(11) NOT NULL,
  `guest_count` int(11) NOT NULL DEFAULT 0,
  `event_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `payment_status` enum('pending','partial','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
  `package_id` int(11) DEFAULT NULL,
  `venue_id` int(11) DEFAULT NULL,
  `total_budget` decimal(12,2) NOT NULL DEFAULT 0.00,
  `down_payment` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_schedule_type_id` int(11) DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `additional_notes` text DEFAULT NULL,
  `event_status` enum('draft','confirmed','in-progress','completed','cancelled') NOT NULL DEFAULT 'draft',
  `booking_date` date DEFAULT NULL,
  `booking_time` time DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `event_attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'File attachments for the event' CHECK (json_valid(`event_attachments`)),
  `event_feedback_id` int(11) DEFAULT NULL COMMENT 'Link to feedback if available',
  `event_wedding_form_id` int(11) DEFAULT NULL COMMENT 'Link to wedding details if wedding event',
  `is_recurring` tinyint(1) DEFAULT 0 COMMENT 'Flag for recurring events',
  `recurrence_rule` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Recurrence configuration (iCal-style or custom)' CHECK (json_valid(`recurrence_rule`)),
  `cancellation_reason` text DEFAULT NULL COMMENT 'Reason for cancellation if applicable',
  `finalized_at` datetime DEFAULT NULL COMMENT 'When event details were finalized',
  `client_signature` text DEFAULT NULL COMMENT 'Digital signature reference or file path'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_events_backup`
--

INSERT INTO `tbl_events_backup` (`event_id`, `original_booking_reference`, `user_id`, `admin_id`, `organizer_id`, `event_title`, `event_theme`, `event_description`, `event_type_id`, `guest_count`, `event_date`, `start_time`, `end_time`, `payment_status`, `package_id`, `venue_id`, `total_budget`, `down_payment`, `payment_method`, `payment_schedule_type_id`, `reference_number`, `additional_notes`, `event_status`, `booking_date`, `booking_time`, `created_by`, `updated_by`, `created_at`, `updated_at`, `event_attachments`, `event_feedback_id`, `event_wedding_form_id`, `is_recurring`, `recurrence_rule`, `cancellation_reason`, `finalized_at`, `client_signature`) VALUES
(28, 'BK-20250625-1100', 15, 7, NULL, 'ad', NULL, NULL, 5, 100, '2025-06-26', '10:00:00', '18:00:00', 'partial', 15, 30, 298000.00, 149000.00, 'gcash', 2, '12312312312', 'ad', 'draft', NULL, NULL, NULL, NULL, '2025-06-25 08:26:36', '2025-06-25 08:26:36', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(29, 'BK-20250625-4040', 15, 7, NULL, 'Other Event ', NULL, NULL, 5, 100, '2025-06-26', '10:00:00', '18:00:00', 'partial', 15, 29, 294000.00, 147000.00, 'bank-transfer', 2, '123234', 'Other Event ', 'draft', NULL, NULL, NULL, NULL, '2025-06-25 09:10:39', '2025-06-25 09:10:39', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(30, NULL, 15, 7, NULL, 'Wedding with Wedding Form', NULL, NULL, 1, 100, '2025-06-28', '06:00:00', '08:00:00', 'partial', 15, NULL, 250000.00, 125000.00, 'gcash', 2, '13123123', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-06-26 07:17:02', '2025-06-26 07:17:02', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(31, NULL, 15, 7, NULL, 'Test', NULL, NULL, 1, 100, '2025-06-27', '11:30:00', '18:00:00', 'partial', 15, 29, 164000.00, 82000.00, 'gcash', 2, '12312', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-06-26 08:36:53', '2025-06-26 08:36:53', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(32, NULL, 15, 7, NULL, 'sdf', NULL, NULL, 1, 100, '2025-06-29', '11:00:00', '11:30:00', 'partial', 15, 30, 298000.00, 149000.00, 'gcash', 2, 'sdfsdf', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-06-26 08:39:30', '2025-06-26 08:39:30', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(33, NULL, 15, 7, NULL, 'TTTTTTT', NULL, NULL, 1, 100, '2025-06-30', '11:30:00', '12:00:00', 'partial', 15, 30, 298000.00, 149000.00, 'gcash', 2, 'sdfsdf', NULL, 'draft', NULL, NULL, NULL, NULL, '2025-06-26 08:50:59', '2025-06-26 08:50:59', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
(34, 'BK-20250626-5133', 15, 7, NULL, 'hb', NULL, NULL, 1, 100, '2025-06-29', '10:00:00', '18:00:00', 'partial', 15, 29, 294000.00, 147000.00, 'gcash', 2, '567567', 'hb', 'draft', NULL, NULL, NULL, NULL, '2025-06-26 10:40:27', '2025-06-26 10:40:27', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_event_components`
--

CREATE TABLE `tbl_event_components` (
  `component_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `component_name` varchar(255) NOT NULL,
  `component_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `component_description` text DEFAULT NULL,
  `is_custom` tinyint(1) NOT NULL DEFAULT 0,
  `is_included` tinyint(1) NOT NULL DEFAULT 1,
  `original_package_component_id` int(11) DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_event_components`
--

INSERT INTO `tbl_event_components` (`component_id`, `event_id`, `component_name`, `component_price`, `component_description`, `is_custom`, `is_included`, `original_package_component_id`, `display_order`) VALUES
(7, 28, 'Transport & Floral Decor ', 7000.00, '', 0, 1, 193, 4),
(8, 28, 'Emcee & Program Flow', 4000.00, '', 0, 1, 194, 5),
(9, 28, 'Photography & Videography', 35000.00, '', 0, 1, 195, 6),
(10, 28, 'Remaining Buffer ', 7000.00, '', 0, 1, 196, 7),
(11, 28, 'Inclusions', 0.00, NULL, 0, 0, 205, 8),
(12, 29, 'Full Wedding Coordination', 15000.00, '', 0, 1, 189, 0),
(13, 29, 'Attire ', 25000.00, '', 0, 1, 190, 1),
(14, 29, 'Hair and Makeup', 8000.00, '', 0, 1, 191, 2),
(15, 29, 'Wedding Cake', 5000.00, '', 0, 1, 192, 3),
(16, 29, 'Transport & Floral Decor ', 7000.00, '', 0, 1, 193, 4),
(17, 29, 'Emcee & Program Flow', 4000.00, '', 0, 1, 194, 5),
(18, 29, 'Photography & Videography', 35000.00, '', 0, 1, 195, 6),
(19, 29, 'Remaining Buffer ', 7000.00, '', 0, 1, 196, 7),
(20, 29, 'Inclusions', 0.00, '', 0, 1, 205, 8),
(21, 30, 'Full Wedding Coordination', 15000.00, '', 0, 1, 189, 0),
(22, 30, 'Attire ', 25000.00, '', 0, 1, 190, 1),
(23, 30, 'Hair and Makeup', 8000.00, '', 0, 1, 191, 2),
(24, 30, 'Wedding Cake', 5000.00, '', 0, 1, 192, 3),
(25, 30, 'Transport & Floral Decor ', 7000.00, '', 0, 1, 193, 4),
(26, 30, 'Emcee & Program Flow', 4000.00, '', 0, 1, 194, 5),
(27, 30, 'Photography & Videography', 35000.00, '', 0, 1, 195, 6),
(28, 30, 'Remaining Buffer ', 7000.00, '', 0, 1, 196, 7),
(29, 30, 'Inclusions', 0.00, '', 0, 1, 205, 8),
(30, 31, 'Inclusions', 0.00, '', 0, 1, 188, 0),
(31, 31, 'Inclusions', 0.00, '', 0, 1, NULL, 1),
(32, 32, 'Full Wedding Coordination', 15000.00, '', 0, 1, 189, 0),
(33, 32, 'Attire ', 25000.00, '', 0, 1, 190, 1),
(34, 32, 'Hair and Makeup', 8000.00, '', 0, 1, 191, 2),
(35, 32, 'Wedding Cake', 5000.00, '', 0, 1, 192, 3),
(36, 32, 'Transport & Floral Decor ', 7000.00, '', 0, 1, 193, 4),
(37, 32, 'Emcee & Program Flow', 4000.00, '', 0, 1, 194, 5),
(38, 32, 'Photography & Videography', 35000.00, '', 0, 1, 195, 6),
(39, 32, 'Remaining Buffer ', 7000.00, '', 0, 1, 196, 7),
(40, 32, 'Inclusions', 0.00, '', 0, 1, 205, 8),
(41, 33, 'Full Wedding Coordination', 15000.00, '', 0, 1, 189, 0),
(42, 33, 'Attire ', 25000.00, '', 0, 1, 190, 1),
(43, 33, 'Hair and Makeup', 8000.00, '', 0, 1, 191, 2),
(44, 33, 'Wedding Cake', 5000.00, '', 0, 1, 192, 3),
(45, 33, 'Transport & Floral Decor ', 7000.00, '', 0, 1, 193, 4),
(46, 33, 'Emcee & Program Flow', 4000.00, '', 0, 1, 194, 5),
(47, 33, 'Photography & Videography', 35000.00, '', 0, 1, 195, 6),
(48, 33, 'Remaining Buffer ', 7000.00, '', 0, 1, 196, 7),
(49, 33, 'Inclusions', 0.00, '', 0, 1, 205, 8),
(50, 34, 'Full Wedding Coordination', 15000.00, '', 0, 1, 189, 0),
(51, 34, 'Attire ', 25000.00, '', 0, 1, 190, 1),
(52, 34, 'Hair and Makeup', 8000.00, '', 0, 1, 191, 2),
(53, 34, 'Wedding Cake', 5000.00, '', 0, 1, 192, 3),
(54, 34, 'Transport & Floral Decor ', 7000.00, '', 0, 1, 193, 4),
(55, 34, 'Emcee & Program Flow', 4000.00, '', 0, 1, 194, 5),
(56, 34, 'Photography & Videography', 35000.00, '', 0, 1, 195, 6),
(57, 34, 'Remaining Buffer ', 7000.00, '', 0, 1, 196, 7),
(58, 34, 'Inclusions', 0.00, '', 0, 1, 205, 8),
(59, 35, 'Full Wedding Coordination', 15000.00, '', 0, 1, 189, 0),
(60, 35, 'Attire ', 25000.00, '', 0, 1, 190, 1),
(61, 35, 'Hair and Makeup', 8000.00, '', 0, 1, 191, 2),
(62, 35, 'Wedding Cake', 5000.00, '', 0, 1, 192, 3),
(63, 35, 'Transport & Floral Decor ', 7000.00, '', 0, 1, 193, 4),
(64, 35, 'Emcee & Program Flow', 4000.00, '', 0, 1, 194, 5),
(65, 35, 'Photography & Videography', 35000.00, '', 0, 1, 195, 6),
(66, 35, 'Remaining Buffer ', 7000.00, '', 0, 1, 196, 7),
(67, 35, 'Inclusions', 0.00, '', 0, 1, 205, 8),
(68, 36, 'Full Wedding Coordination', 15000.00, '', 0, 1, 189, 0),
(69, 36, 'Attire ', 25000.00, '', 0, 1, 190, 1),
(70, 36, 'Hair and Makeup', 8000.00, '', 0, 1, 191, 2),
(71, 36, 'Wedding Cake', 5000.00, '', 0, 1, 192, 3),
(72, 36, 'Transport & Floral Decor ', 7000.00, '', 0, 1, 193, 4),
(73, 36, 'Emcee & Program Flow', 4000.00, '', 0, 1, 194, 5),
(74, 36, 'Photography & Videography', 35000.00, '', 0, 1, 195, 6),
(75, 36, 'Remaining Buffer ', 7000.00, '', 0, 1, 196, 7),
(76, 36, 'Inclusions', 0.00, '', 0, 1, 205, 8),
(77, 37, 'Full Wedding Coordination', 15000.00, '', 0, 1, 189, 0),
(78, 37, 'Attire ', 25000.00, '', 0, 1, 190, 1),
(79, 37, 'Hair and Makeup', 8000.00, '', 0, 1, 191, 2),
(80, 37, 'Wedding Cake', 5000.00, '', 0, 1, 192, 3),
(81, 37, 'Transport & Floral Decor ', 7000.00, '', 0, 1, 193, 4),
(82, 37, 'Emcee & Program Flow', 4000.00, '', 0, 1, 194, 5),
(83, 37, 'Photography & Videography', 35000.00, '', 0, 1, 195, 6),
(84, 37, 'Remaining Buffer ', 7000.00, '', 0, 1, 196, 7),
(85, 37, 'Inclusions', 0.00, '', 0, 1, 205, 8),
(86, 38, 'Full Wedding Coordination', 15000.00, '', 0, 1, 189, 0),
(87, 38, 'Attire ', 25000.00, '', 0, 1, 190, 1),
(88, 38, 'Hair and Makeup', 8000.00, '', 0, 1, 191, 2),
(89, 38, 'Wedding Cake', 5000.00, '', 0, 1, 192, 3),
(90, 38, 'Transport & Floral Decor ', 7000.00, '', 0, 1, 193, 4),
(91, 38, 'Emcee & Program Flow', 4000.00, '', 0, 1, 194, 5),
(92, 38, 'Photography & Videography', 35000.00, '', 0, 1, 195, 6),
(93, 38, 'Remaining Buffer ', 7000.00, '', 0, 1, 196, 7),
(94, 38, 'Inclusions', 0.00, '', 0, 1, 205, 8),
(95, 39, 'Full Wedding Coordination', 15000.00, '', 0, 1, 189, 0),
(96, 39, 'Attire ', 25000.00, '', 0, 1, 190, 1),
(97, 39, 'Hair and Makeup', 8000.00, '', 0, 1, 191, 2),
(98, 39, 'Wedding Cake', 5000.00, '', 0, 1, 192, 3),
(99, 39, 'Transport & Floral Decor ', 7000.00, '', 0, 1, 193, 4),
(100, 39, 'Emcee & Program Flow', 4000.00, '', 0, 1, 194, 5),
(101, 39, 'Photography & Videography', 35000.00, '', 0, 1, 195, 6),
(102, 39, 'Remaining Buffer ', 7000.00, '', 0, 1, 196, 7),
(103, 39, 'Inclusions', 0.00, '', 0, 1, 205, 8),
(104, 40, 'Full Wedding Coordination', 15000.00, '', 0, 1, 189, 0),
(105, 40, 'Attire ', 25000.00, '', 0, 1, 190, 1),
(106, 40, 'Hair and Makeup', 8000.00, '', 0, 1, 191, 2),
(107, 40, 'Wedding Cake', 5000.00, '', 0, 1, 192, 3),
(108, 40, 'Transport & Floral Decor ', 7000.00, '', 0, 1, 193, 4),
(109, 40, 'Emcee & Program Flow', 4000.00, '', 0, 1, 194, 5),
(110, 40, 'Photography & Videography', 35000.00, '', 0, 1, 195, 6),
(111, 40, 'Remaining Buffer ', 7000.00, '', 0, 1, 196, 7),
(112, 40, 'Inclusions', 0.00, '', 0, 1, 205, 8),
(113, 41, 'Full Wedding Coordination', 15000.00, '', 0, 1, 189, 0),
(114, 41, 'Attire ', 25000.00, '', 0, 1, 190, 1),
(115, 41, 'Hair and Makeup', 8000.00, '', 0, 1, 191, 2),
(116, 41, 'Wedding Cake', 5000.00, '', 0, 1, 192, 3),
(117, 41, 'Transport & Floral Decor ', 7000.00, '', 0, 1, 193, 4),
(118, 41, 'Emcee & Program Flow', 4000.00, '', 0, 1, 194, 5),
(119, 41, 'Photography & Videography', 35000.00, '', 0, 1, 195, 6),
(120, 41, 'Remaining Buffer ', 7000.00, '', 0, 1, 196, 7),
(121, 41, 'Inclusions', 0.00, '', 0, 1, 205, 8),
(122, 42, 'Full Wedding Coordination', 15000.00, '', 0, 1, 189, 0),
(123, 42, 'Attire ', 25000.00, '', 0, 1, 190, 1),
(124, 42, 'Hair and Makeup', 8000.00, '', 0, 1, 191, 2),
(125, 42, 'Wedding Cake', 5000.00, '', 0, 1, 192, 3),
(126, 42, 'Transport & Floral Decor ', 7000.00, '', 0, 1, 193, 4),
(127, 42, 'Emcee & Program Flow', 4000.00, '', 0, 1, 194, 5),
(128, 42, 'Photography & Videography', 35000.00, '', 0, 1, 195, 6),
(129, 42, 'Remaining Buffer ', 7000.00, '', 0, 1, 196, 7),
(130, 42, 'Inclusions', 0.00, '', 0, 1, 205, 8),
(131, 43, 'Full Wedding Coordination', 15000.00, '', 0, 1, 189, 0),
(132, 43, 'Attire ', 25000.00, '', 0, 1, 190, 1),
(133, 43, 'Hair and Makeup', 8000.00, '', 0, 1, 191, 2),
(134, 43, 'Wedding Cake', 5000.00, '', 0, 1, 192, 3),
(135, 43, 'Transport & Floral Decor ', 7000.00, '', 0, 1, 193, 4),
(136, 43, 'Emcee & Program Flow', 4000.00, '', 0, 1, 194, 5),
(137, 43, 'Photography & Videography', 35000.00, '', 0, 1, 195, 6),
(138, 43, 'Remaining Buffer ', 7000.00, '', 0, 1, 196, 7),
(139, 43, 'Inclusions', 0.00, '', 0, 1, 205, 8),
(140, 44, 'Full Wedding Coordination', 15000.00, '', 0, 1, 189, 0),
(141, 44, 'Attire ', 25000.00, '', 0, 1, 190, 1),
(142, 44, 'Hair and Makeup', 8000.00, '', 0, 1, 191, 2),
(143, 44, 'Wedding Cake', 5000.00, '', 0, 1, 192, 3),
(144, 44, 'Transport & Floral Decor ', 7000.00, '', 0, 1, 193, 4),
(145, 44, 'Emcee & Program Flow', 4000.00, '', 0, 1, 194, 5),
(146, 44, 'Photography & Videography', 35000.00, '', 0, 1, 195, 6),
(147, 44, 'Remaining Buffer ', 7000.00, '', 0, 1, 196, 7),
(148, 44, 'Inclusions', 0.00, '', 0, 1, 205, 8),
(149, 45, 'Full Wedding Coordination', 15000.00, '', 0, 1, 189, 0),
(150, 45, 'Attire ', 25000.00, '', 0, 1, 190, 1),
(151, 45, 'Hair and Makeup', 8000.00, '', 0, 1, 191, 2),
(152, 45, 'Wedding Cake', 5000.00, '', 0, 1, 192, 3),
(153, 45, 'Transport & Floral Decor ', 7000.00, '', 0, 1, 193, 4),
(154, 45, 'Emcee & Program Flow', 4000.00, '', 0, 1, 194, 5),
(155, 45, 'Photography & Videography', 35000.00, '', 0, 1, 195, 6),
(156, 45, 'Remaining Buffer ', 7000.00, '', 0, 1, 196, 7),
(157, 45, 'Inclusions', 0.00, '', 0, 1, 205, 8),
(160, 46, 'Venue Rental', 40000.00, '', 0, 1, 261, 0),
(161, 46, 'Catering Service', 75000.00, '', 0, 1, 262, 1),
(162, 46, 'Event Styling & Floral Design', 34999.98, '', 0, 1, 263, 2),
(163, 46, 'Photo & Video Coverage', 20000.00, '', 0, 1, 264, 3),
(164, 46, 'Host / Emcee', 10000.00, '', 0, 1, 265, 4),
(165, 46, 'Acoustic Live Band', 15000.00, '', 0, 1, 266, 5),
(166, 46, 'Led Wall', 12000.00, '', 0, 1, 267, 6),
(167, 46, 'Customized Cake', 7000.00, '', 0, 1, 268, 7),
(168, 46, 'Anniversary Tokens', 8000.00, '', 0, 1, 269, 8),
(169, 46, 'Event Coordinator & Staff', 18000.00, '', 0, 1, 270, 9);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_event_package`
--

CREATE TABLE `tbl_event_package` (
  `event_package_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `venue_id` int(11) NOT NULL,
  `store_id` int(11) NOT NULL,
  `budget_id` int(11) NOT NULL,
  `event_type_id` int(11) NOT NULL,
  `event_package_notes` text DEFAULT NULL,
  `event_package_services` text DEFAULT NULL,
  `event_package_description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_event_payment_schedules`
--

CREATE TABLE `tbl_event_payment_schedules` (
  `schedule_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `schedule_type_id` int(11) NOT NULL,
  `installment_number` int(11) NOT NULL DEFAULT 1,
  `due_date` date NOT NULL,
  `amount_due` decimal(12,2) NOT NULL,
  `amount_paid` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_status` enum('pending','partial','paid','overdue') NOT NULL DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_event_timeline`
--

CREATE TABLE `tbl_event_timeline` (
  `timeline_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `component_id` int(11) DEFAULT NULL,
  `activity_title` varchar(255) NOT NULL,
  `activity_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `status` enum('pending','in-progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  `display_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_event_timeline`
--

INSERT INTO `tbl_event_timeline` (`timeline_id`, `event_id`, `component_id`, `activity_title`, `activity_date`, `start_time`, `end_time`, `location`, `notes`, `assigned_to`, `status`, `display_order`) VALUES
(229, 28, NULL, 'Inclusions', '2025-06-26', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(230, 28, NULL, 'Full Wedding Coordination', '2025-06-26', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(231, 28, NULL, 'Attire ', '2025-06-26', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(232, 28, NULL, 'Hair and Makeup', '2025-06-26', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(233, 28, NULL, 'Wedding Cake', '2025-06-26', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(234, 28, NULL, 'Transport & Floral Decor ', '2025-06-26', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(235, 28, NULL, 'Emcee & Program Flow', '2025-06-26', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(236, 28, NULL, 'Photography & Videography', '2025-06-26', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(237, 28, NULL, 'Remaining Buffer ', '2025-06-26', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(238, 29, NULL, 'Inclusions', '2025-06-26', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(239, 29, NULL, 'Full Wedding Coordination', '2025-06-26', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(240, 29, NULL, 'Attire ', '2025-06-26', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(241, 29, NULL, 'Hair and Makeup', '2025-06-26', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(242, 29, NULL, 'Wedding Cake', '2025-06-26', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(243, 29, NULL, 'Transport & Floral Decor ', '2025-06-26', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(244, 29, NULL, 'Emcee & Program Flow', '2025-06-26', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(245, 29, NULL, 'Photography & Videography', '2025-06-26', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(246, 29, NULL, 'Remaining Buffer ', '2025-06-26', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(247, 30, NULL, 'Inclusions', '2025-06-28', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(248, 30, NULL, 'Full Wedding Coordination', '2025-06-28', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(249, 30, NULL, 'Attire ', '2025-06-28', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(250, 30, NULL, 'Hair and Makeup', '2025-06-28', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(251, 30, NULL, 'Wedding Cake', '2025-06-28', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(252, 30, NULL, 'Transport & Floral Decor ', '2025-06-28', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(253, 30, NULL, 'Emcee & Program Flow', '2025-06-28', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(254, 30, NULL, 'Photography & Videography', '2025-06-28', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(255, 30, NULL, 'Remaining Buffer ', '2025-06-28', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(256, 31, NULL, 'Inclusions', '2025-06-27', '08:00:00', '09:00:00', '', '', NULL, 'pending', 0),
(257, 31, NULL, 'Inclusions', '2025-06-27', '10:00:00', '11:00:00', '', '', NULL, 'pending', 1),
(258, 32, NULL, 'Inclusions', '2025-06-29', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(259, 32, NULL, 'Full Wedding Coordination', '2025-06-29', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(260, 32, NULL, 'Attire ', '2025-06-29', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(261, 32, NULL, 'Hair and Makeup', '2025-06-29', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(262, 32, NULL, 'Wedding Cake', '2025-06-29', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(263, 32, NULL, 'Transport & Floral Decor ', '2025-06-29', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(264, 32, NULL, 'Emcee & Program Flow', '2025-06-29', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(265, 32, NULL, 'Photography & Videography', '2025-06-29', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(266, 32, NULL, 'Remaining Buffer ', '2025-06-29', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(267, 33, NULL, 'Inclusions', '2025-06-30', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(268, 33, NULL, 'Full Wedding Coordination', '2025-06-30', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(269, 33, NULL, 'Attire ', '2025-06-30', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(270, 33, NULL, 'Hair and Makeup', '2025-06-30', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(271, 33, NULL, 'Wedding Cake', '2025-06-30', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(272, 33, NULL, 'Transport & Floral Decor ', '2025-06-30', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(273, 33, NULL, 'Emcee & Program Flow', '2025-06-30', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(274, 33, NULL, 'Photography & Videography', '2025-06-30', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(275, 33, NULL, 'Remaining Buffer ', '2025-06-30', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(276, 34, NULL, 'Inclusions', '2025-06-29', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(277, 34, NULL, 'Full Wedding Coordination', '2025-06-29', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(278, 34, NULL, 'Attire ', '2025-06-29', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(279, 34, NULL, 'Hair and Makeup', '2025-06-29', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(280, 34, NULL, 'Wedding Cake', '2025-06-29', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(281, 34, NULL, 'Transport & Floral Decor ', '2025-06-29', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(282, 34, NULL, 'Emcee & Program Flow', '2025-06-29', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(283, 34, NULL, 'Photography & Videography', '2025-06-29', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(284, 34, NULL, 'Remaining Buffer ', '2025-06-29', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(285, 35, NULL, 'Inclusions', '2025-07-03', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(286, 35, NULL, 'Full Wedding Coordination', '2025-07-03', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(287, 35, NULL, 'Attire ', '2025-07-03', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(288, 35, NULL, 'Hair and Makeup', '2025-07-03', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(289, 35, NULL, 'Wedding Cake', '2025-07-03', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(290, 35, NULL, 'Transport & Floral Decor ', '2025-07-03', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(291, 35, NULL, 'Emcee & Program Flow', '2025-07-03', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(292, 35, NULL, 'Photography & Videography', '2025-07-03', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(293, 35, NULL, 'Remaining Buffer ', '2025-07-03', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(294, 36, NULL, 'Inclusions', '2025-07-03', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(295, 36, NULL, 'Full Wedding Coordination', '2025-07-03', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(296, 36, NULL, 'Attire ', '2025-07-03', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(297, 36, NULL, 'Hair and Makeup', '2025-07-03', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(298, 36, NULL, 'Wedding Cake', '2025-07-03', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(299, 36, NULL, 'Transport & Floral Decor ', '2025-07-03', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(300, 36, NULL, 'Emcee & Program Flow', '2025-07-03', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(301, 36, NULL, 'Photography & Videography', '2025-07-03', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(302, 36, NULL, 'Remaining Buffer ', '2025-07-03', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(303, 37, NULL, 'Inclusions', '2025-07-10', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(304, 37, NULL, 'Full Wedding Coordination', '2025-07-10', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(305, 37, NULL, 'Attire ', '2025-07-10', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(306, 37, NULL, 'Hair and Makeup', '2025-07-10', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(307, 37, NULL, 'Wedding Cake', '2025-07-10', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(308, 37, NULL, 'Transport & Floral Decor ', '2025-07-10', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(309, 37, NULL, 'Emcee & Program Flow', '2025-07-10', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(310, 37, NULL, 'Photography & Videography', '2025-07-10', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(311, 37, NULL, 'Remaining Buffer ', '2025-07-10', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(312, 38, NULL, 'Inclusions', '2025-07-11', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(313, 38, NULL, 'Full Wedding Coordination', '2025-07-11', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(314, 38, NULL, 'Attire ', '2025-07-11', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(315, 38, NULL, 'Hair and Makeup', '2025-07-11', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(316, 38, NULL, 'Wedding Cake', '2025-07-11', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(317, 38, NULL, 'Transport & Floral Decor ', '2025-07-11', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(318, 38, NULL, 'Emcee & Program Flow', '2025-07-11', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(319, 38, NULL, 'Photography & Videography', '2025-07-11', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(320, 38, NULL, 'Remaining Buffer ', '2025-07-11', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(321, 39, NULL, 'Inclusions', '2025-07-12', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(322, 39, NULL, 'Full Wedding Coordination', '2025-07-12', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(323, 39, NULL, 'Attire ', '2025-07-12', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(324, 39, NULL, 'Hair and Makeup', '2025-07-12', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(325, 39, NULL, 'Wedding Cake', '2025-07-12', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(326, 39, NULL, 'Transport & Floral Decor ', '2025-07-12', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(327, 39, NULL, 'Emcee & Program Flow', '2025-07-12', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(328, 39, NULL, 'Photography & Videography', '2025-07-12', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(329, 39, NULL, 'Remaining Buffer ', '2025-07-12', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(330, 40, NULL, 'Inclusions', '2025-07-13', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(331, 40, NULL, 'Full Wedding Coordination', '2025-07-13', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(332, 40, NULL, 'Attire ', '2025-07-13', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(333, 40, NULL, 'Hair and Makeup', '2025-07-13', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(334, 40, NULL, 'Wedding Cake', '2025-07-13', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(335, 40, NULL, 'Transport & Floral Decor ', '2025-07-13', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(336, 40, NULL, 'Emcee & Program Flow', '2025-07-13', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(337, 40, NULL, 'Photography & Videography', '2025-07-13', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(338, 40, NULL, 'Remaining Buffer ', '2025-07-13', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(339, 41, NULL, 'Inclusions', '2025-07-31', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(340, 41, NULL, 'Full Wedding Coordination', '2025-07-31', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(341, 41, NULL, 'Attire ', '2025-07-31', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(342, 41, NULL, 'Hair and Makeup', '2025-07-31', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(343, 41, NULL, 'Wedding Cake', '2025-07-31', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(344, 41, NULL, 'Transport & Floral Decor ', '2025-07-31', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(345, 41, NULL, 'Emcee & Program Flow', '2025-07-31', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(346, 41, NULL, 'Photography & Videography', '2025-07-31', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(347, 41, NULL, 'Remaining Buffer ', '2025-07-31', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(348, 42, NULL, 'Inclusions', '2025-07-23', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(349, 42, NULL, 'Full Wedding Coordination', '2025-07-23', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(350, 42, NULL, 'Attire ', '2025-07-23', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(351, 42, NULL, 'Hair and Makeup', '2025-07-23', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(352, 42, NULL, 'Wedding Cake', '2025-07-23', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(353, 42, NULL, 'Transport & Floral Decor ', '2025-07-23', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(354, 42, NULL, 'Emcee & Program Flow', '2025-07-23', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(355, 42, NULL, 'Photography & Videography', '2025-07-23', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(356, 42, NULL, 'Remaining Buffer ', '2025-07-23', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(357, 43, NULL, 'Inclusions', '2025-07-11', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(358, 43, NULL, 'Full Wedding Coordination', '2025-07-11', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(359, 43, NULL, 'Attire ', '2025-07-11', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(360, 43, NULL, 'Hair and Makeup', '2025-07-11', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(361, 43, NULL, 'Wedding Cake', '2025-07-11', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(362, 43, NULL, 'Transport & Floral Decor ', '2025-07-11', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(363, 43, NULL, 'Emcee & Program Flow', '2025-07-11', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(364, 43, NULL, 'Photography & Videography', '2025-07-11', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(365, 43, NULL, 'Remaining Buffer ', '2025-07-11', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(366, 44, NULL, 'Inclusions', '2025-07-18', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(367, 44, NULL, 'Full Wedding Coordination', '2025-07-18', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(368, 44, NULL, 'Attire ', '2025-07-18', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(369, 44, NULL, 'Hair and Makeup', '2025-07-18', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(370, 44, NULL, 'Wedding Cake', '2025-07-18', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(371, 44, NULL, 'Transport & Floral Decor ', '2025-07-18', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(372, 44, NULL, 'Emcee & Program Flow', '2025-07-18', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(373, 44, NULL, 'Photography & Videography', '2025-07-18', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(374, 44, NULL, 'Remaining Buffer ', '2025-07-18', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(375, 45, NULL, 'Inclusions', '2025-07-03', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(376, 45, NULL, 'Full Wedding Coordination', '2025-07-03', '08:00:00', '09:00:00', '', '', NULL, 'pending', 1),
(377, 45, NULL, 'Attire ', '2025-07-03', '10:00:00', '11:00:00', '', '', NULL, 'pending', 2),
(378, 45, NULL, 'Hair and Makeup', '2025-07-03', '12:00:00', '13:00:00', '', '', NULL, 'pending', 3),
(379, 45, NULL, 'Wedding Cake', '2025-07-03', '14:00:00', '15:00:00', '', '', NULL, 'pending', 4),
(380, 45, NULL, 'Transport & Floral Decor ', '2025-07-03', '16:00:00', '17:00:00', '', '', NULL, 'pending', 5),
(381, 45, NULL, 'Emcee & Program Flow', '2025-07-03', '18:00:00', '19:00:00', '', '', NULL, 'pending', 6),
(382, 45, NULL, 'Photography & Videography', '2025-07-03', '20:00:00', '21:00:00', '', '', NULL, 'pending', 7),
(383, 45, NULL, 'Remaining Buffer ', '2025-07-03', '22:00:00', '23:00:00', '', '', NULL, 'pending', 8),
(384, 46, NULL, 'Anniversary Tokens', '2025-07-08', '00:00:00', '01:00:00', '', '', NULL, 'pending', 0),
(385, 46, NULL, 'Event Coordinator & Staff', '2025-07-08', '02:00:00', '03:00:00', '', '', NULL, 'pending', 1),
(386, 46, NULL, 'Venue Rental', '2025-07-08', '08:00:00', '09:00:00', '', '', NULL, 'pending', 2),
(387, 46, NULL, 'Catering Service', '2025-07-08', '10:00:00', '11:00:00', '', '', NULL, 'pending', 3),
(388, 46, NULL, 'Event Styling & Floral Design', '2025-07-08', '12:00:00', '13:00:00', '', '', NULL, 'pending', 4),
(389, 46, NULL, 'Photo & Video Coverage', '2025-07-08', '14:00:00', '15:00:00', '', '', NULL, 'pending', 5),
(390, 46, NULL, 'Host / Emcee', '2025-07-08', '16:00:00', '17:00:00', '', '', NULL, 'pending', 6),
(391, 46, NULL, 'Acoustic Live Band', '2025-07-08', '18:00:00', '19:00:00', '', '', NULL, 'pending', 7),
(392, 46, NULL, 'Led Wall', '2025-07-08', '20:00:00', '21:00:00', '', '', NULL, 'pending', 8),
(393, 46, NULL, 'Customized Cake', '2025-07-08', '22:00:00', '23:00:00', '', '', NULL, 'pending', 9);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_event_type`
--

CREATE TABLE `tbl_event_type` (
  `event_type_id` int(11) NOT NULL,
  `event_name` varchar(100) NOT NULL,
  `event_description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_event_type`
--

INSERT INTO `tbl_event_type` (`event_type_id`, `event_name`, `event_description`) VALUES
(1, 'Wedding', 'A wedding event with full venue and catering options.'),
(2, 'Anniversary', 'Celebration of marriage or other yearly milestones.'),
(3, 'Birthday', 'Annual celebration of a person’s birth or special birthday occasion.'),
(4, 'Corporate Event', 'Business meetings, seminars, or corporate gatherings.'),
(5, 'Others', 'Any other type of special event.'),
(10, 'Baptism', 'Religious ceremony symbolizing purification and admission to the church'),
(11, 'Baby Shower', 'Celebration held before a baby is born to give gifts and support to the parents'),
(12, 'Reunion', 'Gathering of family members, classmates, or other groups after a long time'),
(13, 'Festival', 'Public celebration of culture, religion, or season'),
(14, 'Engagement Party', 'Celebration of a couple’s engagement before marriage'),
(15, 'Christmas Party', 'Seasonal celebration held during the Christmas holidays'),
(16, 'New Year’s Party', 'Celebration marking the beginning of the new year');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_feedback`
--

CREATE TABLE `tbl_feedback` (
  `feedback_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `store_id` int(11) DEFAULT NULL,
  `venue_id` int(11) DEFAULT NULL,
  `feedback_rating` tinyint(4) NOT NULL CHECK (`feedback_rating` between 1 and 5),
  `feedback_text` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_notifications`
--

CREATE TABLE `tbl_notifications` (
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `event_id` int(11) DEFAULT NULL,
  `venue_id` int(11) DEFAULT NULL,
  `store_id` int(11) DEFAULT NULL,
  `budget_id` int(11) DEFAULT NULL,
  `booking_id` int(11) DEFAULT NULL,
  `feedback_id` int(11) DEFAULT NULL,
  `notification_message` text NOT NULL,
  `notification_status` enum('unread','read') NOT NULL DEFAULT 'unread',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_notifications`
--

INSERT INTO `tbl_notifications` (`notification_id`, `user_id`, `event_id`, `venue_id`, `store_id`, `budget_id`, `booking_id`, `feedback_id`, `notification_message`, `notification_status`, `created_at`) VALUES
(8, 7, NULL, NULL, NULL, NULL, 7, NULL, 'New booking created: BK-20250625-1100', 'unread', '2025-06-25 06:02:06'),
(9, 15, NULL, NULL, NULL, NULL, 7, NULL, 'Your booking BK-20250625-1100 for \'ad\' has been accepted! You can now proceed with event planning.', 'unread', '2025-06-25 06:05:07'),
(10, 7, NULL, NULL, NULL, NULL, 8, NULL, 'New booking created: BK-20250625-4040', 'unread', '2025-06-25 08:29:08'),
(11, 15, NULL, NULL, NULL, NULL, 8, NULL, 'Your booking BK-20250625-4040 has been accepted! You can now proceed with event planning.', 'unread', '2025-06-25 08:50:18'),
(12, 7, NULL, NULL, NULL, NULL, 9, NULL, 'New booking created: BK-20250626-5133', 'unread', '2025-06-26 10:36:30'),
(13, 15, NULL, NULL, NULL, NULL, 9, NULL, 'Your booking BK-20250626-5133 has been accepted! You can now proceed with event planning.', 'unread', '2025-06-26 10:37:05');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_packages`
--

CREATE TABLE `tbl_packages` (
  `package_id` int(11) NOT NULL,
  `package_title` varchar(255) NOT NULL,
  `package_description` text DEFAULT NULL,
  `package_price` decimal(10,2) NOT NULL,
  `guest_capacity` int(11) NOT NULL DEFAULT 0,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `original_price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Original package price when first created - never changes',
  `is_price_locked` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether the price is locked (1) or can still be modified (0)',
  `price_lock_date` timestamp NULL DEFAULT NULL COMMENT 'When the price was locked',
  `price_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'History of price changes for audit trail' CHECK (json_valid(`price_history`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_packages`
--

INSERT INTO `tbl_packages` (`package_id`, `package_title`, `package_description`, `package_price`, `guest_capacity`, `created_by`, `created_at`, `updated_at`, `is_active`, `original_price`, `is_price_locked`, `price_lock_date`, `price_history`) VALUES
(14, 'Wedding Package 1', 'All in wedding package 1', 120000.00, 100, 7, '2025-06-14 12:04:28', '2025-07-08 03:56:43', 1, 120000.00, 1, '2025-06-14 12:04:28', NULL),
(15, 'Wedding Package 2', 'All in for wedding package 2', 250000.00, 100, 7, '2025-06-14 12:15:37', '2025-07-08 03:56:43', 1, 250000.00, 1, '2025-06-14 12:15:37', NULL),
(18, 'Anniversary Package', 'All-in-package for anniversary', 249999.99, 100, 7, '2025-07-07 20:03:29', '2025-07-08 03:56:43', 1, 249999.99, 1, '2025-07-07 20:03:29', NULL);

--
-- Triggers `tbl_packages`
--
DELIMITER $$
CREATE TRIGGER `prevent_package_price_reduction` BEFORE UPDATE ON `tbl_packages` FOR EACH ROW BEGIN
    -- If price is locked and someone tries to reduce it, prevent the update
    IF OLD.is_price_locked = 1 AND NEW.package_price < OLD.package_price THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Cannot reduce package price once locked. Package prices can only increase or remain the same.';
    END IF;
    
    -- If price is being increased, log it in price history
    IF NEW.package_price > OLD.package_price THEN
        INSERT INTO `tbl_package_price_history` (package_id, old_price, new_price, changed_by, change_reason)
        VALUES (NEW.package_id, OLD.package_price, NEW.package_price, NEW.created_by, 'Price increase');
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_package_bookings`
--

CREATE TABLE `tbl_package_bookings` (
  `id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `booking_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `package_price_at_booking` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_package_components`
--

CREATE TABLE `tbl_package_components` (
  `component_id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `component_name` varchar(255) NOT NULL,
  `component_description` text DEFAULT NULL,
  `component_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `display_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_package_components`
--

INSERT INTO `tbl_package_components` (`component_id`, `package_id`, `component_name`, `component_description`, `component_price`, `display_order`) VALUES
(188, 14, 'Inclusions', '', 0.00, 0),
(189, 15, 'Full Wedding Coordination', '', 15000.00, 0),
(190, 15, 'Attire ', '', 25000.00, 1),
(191, 15, 'Hair and Makeup', '', 8000.00, 2),
(192, 15, 'Wedding Cake', '', 5000.00, 3),
(193, 15, 'Transport & Floral Decor ', '', 7000.00, 4),
(194, 15, 'Emcee & Program Flow', '', 4000.00, 5),
(195, 15, 'Photography & Videography', '', 35000.00, 6),
(196, 15, 'Remaining Buffer ', '', 7000.00, 7),
(205, 15, 'Inclusions', '', 0.00, 8),
(261, 18, 'Venue Rental', '', 40000.00, 0),
(262, 18, 'Catering Service', '', 75000.00, 1),
(263, 18, 'Event Styling & Floral Design', '', 34999.98, 2),
(264, 18, 'Photo & Video Coverage', '', 20000.00, 3),
(265, 18, 'Host / Emcee', '', 10000.00, 4),
(266, 18, 'Acoustic Live Band', '', 15000.00, 5),
(267, 18, 'Led Wall', '', 12000.00, 6),
(268, 18, 'Customized Cake', '', 7000.00, 7),
(269, 18, 'Anniversary Tokens', '', 8000.00, 8),
(270, 18, 'Event Coordinator & Staff', '', 18000.00, 9);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_package_event_types`
--

CREATE TABLE `tbl_package_event_types` (
  `id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `event_type_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_package_event_types`
--

INSERT INTO `tbl_package_event_types` (`id`, `package_id`, `event_type_id`) VALUES
(21, 14, 1),
(20, 14, 5),
(22, 15, 1),
(23, 15, 5),
(28, 18, 2),
(29, 18, 5);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_package_freebies`
--

CREATE TABLE `tbl_package_freebies` (
  `freebie_id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `freebie_name` varchar(255) NOT NULL,
  `freebie_description` text DEFAULT NULL,
  `freebie_value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `display_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_package_freebies`
--

INSERT INTO `tbl_package_freebies` (`freebie_id`, `package_id`, `freebie_name`, `freebie_description`, `freebie_value`, `display_order`) VALUES
(22, 14, 'Robe for Bride', '', 0.00, 0),
(23, 14, 'Manikin', '', 0.00, 1),
(24, 14, 'Loose Petals', '', 0.00, 2),
(25, 14, 'Cord, Veil, Cushion', '', 0.00, 3),
(26, 14, '2 Prenup Attire', '', 0.00, 4),
(27, 14, 'Kakanin Station', '', 0.00, 5),
(28, 15, 'Robe for Bride', '', 0.00, 0),
(29, 15, 'Robe for Female Entourage', '', 0.00, 1),
(30, 15, 'Manikin', '', 0.00, 2),
(31, 15, 'Loose Petals', '', 0.00, 3),
(32, 15, 'Cord, Veil and Cushion', '', 0.00, 4),
(33, 15, 'Prenup Hair and Make up', '', 0.00, 5),
(34, 15, '2 Sets of Prenup Attire', '', 0.00, 6),
(35, 15, 'Wine for Toasting', '', 0.00, 7),
(36, 15, 'Kakanin Station', '', 0.00, 8),
(37, 15, 'Party Poppers', '', 0.00, 9),
(41, 18, 'Anniversary Cake', '', 0.00, 0),
(42, 18, 'Giveaways', '', 0.00, 1),
(43, 18, 'Toys', '', 0.00, 2),
(44, 18, 'Picture frames', '', 0.00, 3);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_package_price_history`
--

CREATE TABLE `tbl_package_price_history` (
  `history_id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `old_price` decimal(10,2) NOT NULL,
  `new_price` decimal(10,2) NOT NULL,
  `changed_by` int(11) NOT NULL,
  `change_reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_package_venues`
--

CREATE TABLE `tbl_package_venues` (
  `id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `venue_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_package_venues`
--

INSERT INTO `tbl_package_venues` (`id`, `package_id`, `venue_id`, `created_at`) VALUES
(13, 14, 29, '2025-06-14 12:04:28'),
(14, 14, 30, '2025-06-14 12:04:28'),
(15, 15, 29, '2025-06-14 12:15:37'),
(16, 15, 30, '2025-06-14 12:15:37'),
(21, 18, 30, '2025-07-07 20:03:29'),
(22, 18, 29, '2025-07-07 20:03:29');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_payments`
--

CREATE TABLE `tbl_payments` (
  `payment_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `schedule_id` int(11) DEFAULT NULL,
  `client_id` int(11) NOT NULL,
  `payment_method` enum('cash','gcash','bank-transfer','credit-card','check','online-banking') NOT NULL,
  `payment_amount` decimal(12,2) NOT NULL,
  `payment_notes` text DEFAULT NULL,
  `payment_percentage` decimal(5,2) DEFAULT NULL COMMENT 'Percentage of total if this is a partial payment',
  `payment_status` enum('pending','processing','completed','failed','cancelled','refunded') NOT NULL DEFAULT 'pending',
  `payment_date` date NOT NULL,
  `payment_reference` varchar(255) DEFAULT NULL COMMENT 'Reference number for bank transfers, GCash, etc.',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `payment_attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'JSON array of payment proof files (receipts, screenshots, etc.)' CHECK (json_valid(`payment_attachments`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_payments`
--

INSERT INTO `tbl_payments` (`payment_id`, `event_id`, `schedule_id`, `client_id`, `payment_method`, `payment_amount`, `payment_notes`, `payment_percentage`, `payment_status`, `payment_date`, `payment_reference`, `created_at`, `updated_at`, `payment_attachments`) VALUES
(1, 28, NULL, 15, 'gcash', 149000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-06-25', '12312312312', '2025-06-25 08:26:36', '2025-06-25 08:26:36', NULL),
(2, 29, NULL, 15, 'bank-transfer', 147000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-06-25', '123234', '2025-06-25 09:10:39', '2025-06-25 09:10:39', NULL),
(3, 30, NULL, 15, 'gcash', 125000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-06-26', '13123123', '2025-06-26 07:17:02', '2025-06-26 07:17:02', NULL),
(4, 31, NULL, 15, 'gcash', 82000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-06-26', '12312', '2025-06-26 08:36:53', '2025-06-26 08:36:53', NULL),
(5, 32, NULL, 15, 'gcash', 149000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-06-26', 'sdfsdf', '2025-06-26 08:39:30', '2025-06-26 08:39:30', NULL),
(6, 33, NULL, 15, 'gcash', 149000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-06-26', 'sdfsdf', '2025-06-26 08:50:59', '2025-06-26 08:50:59', NULL),
(7, 34, NULL, 15, 'gcash', 147000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-06-26', '567567', '2025-06-26 10:40:27', '2025-06-26 10:40:27', NULL),
(8, 40, NULL, 5, 'gcash', 149000.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-01', '12333212123', '2025-07-01 10:40:11', '2025-07-01 10:40:11', '[{\"file_name\":\"1751366367_6863badfcb9f2.pdf\",\"original_name\":\"Case 1.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1751366367_6863badfcb9f2.pdf\",\"file_size\":883804,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for gcash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-01 12:40:11\"}]'),
(9, 41, NULL, 5, 'bank-transfer', 253300.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-01', '8234908149082390823', '2025-07-01 10:45:50', '2025-07-01 10:45:50', '[{\"file_name\":\"1751366730_6863bc4a46a8b.pdf\",\"original_name\":\"User_Involvement_Case_Study_Summary.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1751366730_6863bc4a46a8b.pdf\",\"file_size\":2340,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for bank-transfer payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-01 12:45:50\"}]'),
(10, 42, NULL, 15, 'cash', 208600.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-02', NULL, '2025-07-02 00:10:56', '2025-07-02 00:10:56', '[{\"file_name\":\"1751415039_686478ff50a1d.webp\",\"original_name\":\"1_vRf6wpV1rRbRLGOcJqnU1A.webp\",\"file_path\":\"uploads\\/payment_proofs\\/1751415039_686478ff50a1d.webp\",\"file_size\":8458,\"file_type\":\"image\\/webp\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-07-02 02:10:56\"},{\"file_name\":\"1751415040_68647900d8b76.pdf\",\"original_name\":\"User_Involvement_Case_Study_Summary.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1751415040_68647900d8b76.pdf\",\"file_size\":2340,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for cash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-02 02:10:56\"}]'),
(11, 43, NULL, 15, 'gcash', 212500.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-02', '123123123123', '2025-07-02 06:29:36', '2025-07-02 06:29:36', '[{\"file_name\":\"1751437773_6864d1cdc4655.pdf\",\"original_name\":\"User_Involvement_Case_Study_Summary.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1751437773_6864d1cdc4655.pdf\",\"file_size\":2340,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for gcash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-02 08:29:36\"}]'),
(12, 44, NULL, 15, 'gcash', 62500.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-02', '1231231231231231231231', '2025-07-02 06:55:23', '2025-07-02 06:55:23', '[{\"file_name\":\"1751439316_6864d7d4aad48.pdf\",\"original_name\":\"User_Involvement_Case_Study_Summary.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1751439316_6864d7d4aad48.pdf\",\"file_size\":2340,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for gcash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-02 08:55:23\"}]'),
(13, 45, NULL, 15, 'gcash', 212500.00, 'Initial down payment for event creation', NULL, 'completed', '2025-07-02', '1231231231231231231231', '2025-07-02 13:20:50', '2025-07-02 13:20:50', '[{\"file_name\":\"1751462449_686532316c7d1.png\",\"original_name\":\"image_2025-07-02_212049403.png\",\"file_path\":\"uploads\\/payment_proofs\\/1751462449_686532316c7d1.png\",\"file_size\":43446,\"file_type\":\"image\\/png\",\"description\":\"Payment proof for gcash payment\",\"proof_type\":\"screenshot\",\"uploaded_at\":\"2025-07-02 15:20:50\"}]'),
(14, 41, NULL, 5, 'cash', 44700.00, '', NULL, 'completed', '2025-07-02', '', '2025-07-02 15:13:26', '2025-07-02 15:13:26', NULL),
(15, 42, NULL, 15, 'cash', 89400.00, '', NULL, 'completed', '2025-07-02', '', '2025-07-02 15:19:54', '2025-07-03 01:00:36', NULL),
(16, 46, NULL, 15, 'gcash', 187499.99, 'Initial down payment for event creation', NULL, 'completed', '2025-07-07', '31212131233123123', '2025-07-07 20:04:55', '2025-07-07 20:04:55', '[{\"file_name\":\"1751918693_686c286577d9d.pdf\",\"original_name\":\"analysis gamon.pdf\",\"file_path\":\"uploads\\/payment_proofs\\/1751918693_686c286577d9d.pdf\",\"file_size\":61531,\"file_type\":\"application\\/pdf\",\"description\":\"Payment proof for gcash payment\",\"proof_type\":\"receipt\",\"uploaded_at\":\"2025-07-07 22:04:55\"}]');

--
-- Triggers `tbl_payments`
--
DELIMITER $$
CREATE TRIGGER `update_payment_schedule_on_payment` AFTER INSERT ON `tbl_payments` FOR EACH ROW BEGIN
  DECLARE schedule_amount_due DECIMAL(12,2);
  DECLARE schedule_amount_paid DECIMAL(12,2);
  DECLARE total_event_paid DECIMAL(12,2);
  DECLARE event_total DECIMAL(12,2);
  
  -- If payment is linked to a schedule, update the schedule
  IF NEW.schedule_id IS NOT NULL AND NEW.payment_status = 'completed' THEN
    -- Update the payment schedule
    UPDATE tbl_event_payment_schedules 
    SET amount_paid = amount_paid + NEW.payment_amount,
        payment_status = CASE 
          WHEN amount_paid + NEW.payment_amount >= amount_due THEN 'paid'
          WHEN amount_paid + NEW.payment_amount > 0 THEN 'partial'
          ELSE 'pending'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE schedule_id = NEW.schedule_id;
  END IF;
  
  -- Update overall event payment status
  SELECT COALESCE(SUM(payment_amount), 0) 
  INTO total_event_paid 
  FROM tbl_payments 
  WHERE event_id = NEW.event_id AND payment_status = 'completed';
  
  SELECT total_budget 
  INTO event_total 
  FROM tbl_events 
  WHERE event_id = NEW.event_id;
  
  -- Update event payment status
  UPDATE tbl_events 
  SET payment_status = CASE 
    WHEN total_event_paid >= event_total THEN 'paid'
    WHEN total_event_paid > 0 THEN 'partial'
    ELSE 'pending'
  END
  WHERE event_id = NEW.event_id;
  
  -- Log the payment activity
  INSERT INTO tbl_payment_logs (event_id, schedule_id, payment_id, client_id, action_type, amount, reference_number, notes)
  VALUES (NEW.event_id, NEW.schedule_id, NEW.payment_id, NEW.client_id, 'payment_received', NEW.payment_amount, NEW.payment_reference, NEW.payment_notes);
  
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_payment_schedule_on_payment_update` AFTER UPDATE ON `tbl_payments` FOR EACH ROW BEGIN
  DECLARE total_event_paid DECIMAL(12,2);
  DECLARE event_total DECIMAL(12,2);
  
  -- If payment status changed and is linked to a schedule
  IF NEW.schedule_id IS NOT NULL AND (OLD.payment_status != NEW.payment_status OR OLD.payment_amount != NEW.payment_amount) THEN
    -- Recalculate schedule payment status
    UPDATE tbl_event_payment_schedules eps
    SET amount_paid = (
      SELECT COALESCE(SUM(p.payment_amount), 0)
      FROM tbl_payments p
      WHERE p.schedule_id = eps.schedule_id AND p.payment_status = 'completed'
    ),
    payment_status = CASE 
      WHEN (SELECT COALESCE(SUM(p.payment_amount), 0) FROM tbl_payments p WHERE p.schedule_id = eps.schedule_id AND p.payment_status = 'completed') >= eps.amount_due THEN 'paid'
      WHEN (SELECT COALESCE(SUM(p.payment_amount), 0) FROM tbl_payments p WHERE p.schedule_id = eps.schedule_id AND p.payment_status = 'completed') > 0 THEN 'partial'
      ELSE 'pending'
    END,
    updated_at = CURRENT_TIMESTAMP
    WHERE schedule_id = NEW.schedule_id;
  END IF;
  
  -- Update overall event payment status
  SELECT COALESCE(SUM(payment_amount), 0) 
  INTO total_event_paid 
  FROM tbl_payments 
  WHERE event_id = NEW.event_id AND payment_status = 'completed';
  
  SELECT total_budget 
  INTO event_total 
  FROM tbl_events 
  WHERE event_id = NEW.event_id;
  
  UPDATE tbl_events 
  SET payment_status = CASE 
    WHEN total_event_paid >= event_total THEN 'paid'
    WHEN total_event_paid > 0 THEN 'partial'
    ELSE 'pending'
  END
  WHERE event_id = NEW.event_id;
  
  -- Log the payment status change
  IF OLD.payment_status != NEW.payment_status THEN
    INSERT INTO tbl_payment_logs (event_id, schedule_id, payment_id, client_id, action_type, amount, reference_number, notes)
    VALUES (NEW.event_id, NEW.schedule_id, NEW.payment_id, NEW.client_id, 'payment_confirmed', NEW.payment_amount, NEW.payment_reference, CONCAT('Status changed from ', OLD.payment_status, ' to ', NEW.payment_status));
  END IF;
  
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_payment_logs`
--

CREATE TABLE `tbl_payment_logs` (
  `log_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `schedule_id` int(11) DEFAULT NULL,
  `payment_id` int(11) DEFAULT NULL,
  `client_id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `action_type` enum('payment_received','payment_confirmed','payment_rejected','schedule_created','schedule_updated','reminder_sent') NOT NULL,
  `amount` decimal(12,2) DEFAULT NULL,
  `reference_number` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_payment_logs`
--

INSERT INTO `tbl_payment_logs` (`log_id`, `event_id`, `schedule_id`, `payment_id`, `client_id`, `admin_id`, `action_type`, `amount`, `reference_number`, `notes`, `created_at`) VALUES
(1, 28, NULL, 1, 15, NULL, 'payment_received', 149000.00, '12312312312', 'Initial down payment for event creation', '2025-06-25 08:26:36'),
(2, 29, NULL, 2, 15, NULL, 'payment_received', 147000.00, '123234', 'Initial down payment for event creation', '2025-06-25 09:10:39'),
(3, 30, NULL, 3, 15, NULL, 'payment_received', 125000.00, '13123123', 'Initial down payment for event creation', '2025-06-26 07:17:02'),
(4, 31, NULL, 4, 15, NULL, 'payment_received', 82000.00, '12312', 'Initial down payment for event creation', '2025-06-26 08:36:53'),
(5, 32, NULL, 5, 15, NULL, 'payment_received', 149000.00, 'sdfsdf', 'Initial down payment for event creation', '2025-06-26 08:39:30'),
(6, 33, NULL, 6, 15, NULL, 'payment_received', 149000.00, 'sdfsdf', 'Initial down payment for event creation', '2025-06-26 08:50:59'),
(7, 34, NULL, 7, 15, NULL, 'payment_received', 147000.00, '567567', 'Initial down payment for event creation', '2025-06-26 10:40:27'),
(8, 40, NULL, 8, 5, NULL, 'payment_received', 149000.00, '12333212123', 'Initial down payment for event creation', '2025-07-01 10:40:11'),
(9, 41, NULL, 9, 5, NULL, 'payment_received', 253300.00, '8234908149082390823', 'Initial down payment for event creation', '2025-07-01 10:45:50'),
(10, 42, NULL, 10, 15, NULL, 'payment_received', 208600.00, NULL, 'Initial down payment for event creation', '2025-07-02 00:10:56'),
(11, 43, NULL, 11, 15, NULL, 'payment_received', 212500.00, '123123123123', 'Initial down payment for event creation', '2025-07-02 06:29:36'),
(12, 44, NULL, 12, 15, NULL, 'payment_received', 62500.00, '1231231231231231231231', 'Initial down payment for event creation', '2025-07-02 06:55:23'),
(13, 45, NULL, 13, 15, NULL, 'payment_received', 212500.00, '1231231231231231231231', 'Initial down payment for event creation', '2025-07-02 13:20:50'),
(14, 41, NULL, 14, 5, NULL, 'payment_received', 44700.00, '', '', '2025-07-02 15:13:26'),
(15, 42, NULL, 15, 15, NULL, 'payment_received', 89400.00, '', '', '2025-07-02 15:19:54'),
(16, 42, NULL, 15, 15, NULL, 'payment_confirmed', 89400.00, '', 'Status changed from pending to completed', '2025-07-03 01:00:36'),
(17, 42, NULL, 15, 15, NULL, 'payment_confirmed', 89400.00, '', 'Status updated to completed by admin', '2025-07-03 01:00:36'),
(18, 46, NULL, 16, 15, NULL, 'payment_received', 187499.99, '31212131233123123', 'Initial down payment for event creation', '2025-07-07 20:04:55');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_payment_schedule_types`
--

CREATE TABLE `tbl_payment_schedule_types` (
  `schedule_type_id` int(11) NOT NULL,
  `schedule_name` varchar(100) NOT NULL,
  `schedule_description` text DEFAULT NULL,
  `installment_count` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_payment_schedule_types`
--

INSERT INTO `tbl_payment_schedule_types` (`schedule_type_id`, `schedule_name`, `schedule_description`, `installment_count`, `is_active`, `created_at`) VALUES
(1, 'Full Payment', 'Pay the entire amount at once', 1, 1, '2025-06-25 03:47:14'),
(2, '50-50 Payment', '50% down payment, 50% before event', 2, 1, '2025-06-25 03:47:14'),
(3, 'Monthly Installments', 'Pay in monthly installments', 3, 1, '2025-06-25 03:47:14'),
(4, 'Quarterly Installments', 'Pay in quarterly installments', 4, 1, '2025-06-25 03:47:14'),
(5, 'Custom Schedule', 'Custom payment schedule as agreed', 0, 1, '2025-06-25 03:47:14');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_store`
--

CREATE TABLE `tbl_store` (
  `store_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `store_category_id` int(11) NOT NULL,
  `feedback_id` int(11) DEFAULT NULL,
  `store_name` varchar(255) NOT NULL,
  `store_owner` varchar(255) NOT NULL,
  `store_details` text DEFAULT NULL,
  `store_status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `store_media` varchar(255) DEFAULT NULL,
  `store_profile_picture` varchar(255) DEFAULT NULL,
  `store_coverphoto` varchar(255) DEFAULT NULL,
  `store_createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `store_type` enum('internal','external') NOT NULL DEFAULT 'internal',
  `store_contact` varchar(20) NOT NULL,
  `store_email` varchar(100) NOT NULL,
  `store_description` text NOT NULL,
  `store_location` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_store`
--

INSERT INTO `tbl_store` (`store_id`, `user_id`, `store_category_id`, `feedback_id`, `store_name`, `store_owner`, `store_details`, `store_status`, `store_media`, `store_profile_picture`, `store_coverphoto`, `store_createdAt`, `store_type`, `store_contact`, `store_email`, `store_description`, `store_location`) VALUES
(4, 5, 1, NULL, 'Test', '', 'tetsdt', 'active', NULL, 'uploads/profile_pictures/1740508911_3131c198-29b4-47ea-a7be-4b9011482a0c.jpg', 'uploads/cover_photos/1740508911_Maisen Margiela poster.jpg', '2025-02-25 18:41:51', '', '0909090909', 'suan@gmail.com', '', 'sdf'),
(8, 5, 10, NULL, 'Camera Ant Films', '', 'We create good films for your events, we also provide good quality film services.', 'active', NULL, 'uploads/profile_pictures/1740708230_Void Poster Design.jpg', 'uploads/cover_photos/1740708230_outside_studio.jpg', '2025-02-28 02:03:50', '', '09095905909', 'cameraants@gmail.com', '', 'Cagayan de Oro City'),
(10, 15, 4, NULL, 'Project Likha Crafts', '', 'We create good crafts for your needs, please visit us and collaborate with us with your events', 'active', NULL, 'uploads/profile_pictures/1741150684_head.png', 'uploads/cover_photos/1741150684_Anches - Parol.jpg', '2025-03-05 04:58:04', '', '0909090950909509', 'projectlikha@gmail.com', '', 'Cagayan de Oro City'),
(11, 15, 3, NULL, 'Serot Flower Shops', '', 'We cater different types of serot flower shops for your needs. Please visit us and be the amazing guess for you!', 'active', NULL, 'uploads/profile_pictures/1741150926_golden-flower-black-background-floral-logo-187684955.webp', 'uploads/cover_photos/1741150926_Screenshot 2025-02-01 093216.png', '2025-03-05 05:02:06', '', '090909090909', 'serotflowshops@gmail.com', '', 'Cagayan de Oro City'),
(12, 15, 15, NULL, 'Light Works & Films', '', 'Your beauty our passion', 'active', NULL, 'uploads/profile_pictures/1741151119_1000_F_135432421_yNN5je47KAmpcfdZDhosQIcCps4ok0QY.jpg', 'uploads/cover_photos/1741151119_a-banner-with-copy-space-featuring-a-professional-video-camera-against-a-background-of-a-lake-photo.jpg', '2025-03-05 05:05:19', '', '0909090909', 'lightworks@gmail.com', '', 'Capistrano St.'),
(13, 15, 1, NULL, 'Food Hub', '', '', 'active', NULL, 'uploads/profile_pictures/1741230623_sample.jpg', 'uploads/cover_photos/1741230623_years-old-birthday-cake-to-old-woman-royalty-free-image-1718042584.avif', '2025-03-06 03:10:23', '', '', '', '', '');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_store_category`
--

CREATE TABLE `tbl_store_category` (
  `store_category_id` int(11) NOT NULL,
  `store_category_type` varchar(100) NOT NULL,
  `store_category_description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_store_category`
--

INSERT INTO `tbl_store_category` (`store_category_id`, `store_category_type`, `store_category_description`) VALUES
(1, 'Catering', 'Food and beverage catering services for events.'),
(2, 'Photography', 'Event photography and videography services.'),
(3, 'Decoration', 'Event decoration and styling services.'),
(4, 'Entertainment', 'Live bands, DJs, and performers for events.'),
(5, 'Event Planning', 'Professional event planning and coordination services.'),
(6, 'Florists', 'Flower arrangement and bouquet services for events.'),
(7, 'Catering Equipment Rental', 'Rental services for catering equipment and tableware.'),
(8, 'Lighting & Sound', 'Professional lighting and sound system services for events.'),
(9, 'Venue Rental', 'Event spaces available for rent.'),
(10, 'Printing Services', 'Invitation cards, banners, and other event print materials.'),
(11, 'Gifts & Souvenirs', 'Personalized giveaways and event souvenirs.'),
(12, 'Costume & Attire Rental', 'Formal wear and costume rental services for themed events.'),
(13, 'Transportation Services', 'Shuttle and vehicle rental for event guests and participants.'),
(14, 'Security Services', 'Professional security personnel for event safety.'),
(15, 'Event Staffing', 'Ushers, waitstaff, and manpower services for events.'),
(16, 'Tech & AV Equipment Rental', 'Projectors, screens, and other audiovisual equipment for events.');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_store_price`
--

CREATE TABLE `tbl_store_price` (
  `tbl_store_price_id` int(11) NOT NULL,
  `store_id` int(11) NOT NULL,
  `store_price_title` varchar(255) NOT NULL,
  `store_price_min` decimal(10,2) NOT NULL,
  `store_price_max` decimal(10,2) NOT NULL,
  `store_price_description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_store_price`
--

INSERT INTO `tbl_store_price` (`tbl_store_price_id`, `store_id`, `store_price_title`, `store_price_min`, `store_price_max`, `store_price_description`) VALUES
(1, 10, '', 0.00, 0.00, ''),
(2, 11, '', 0.00, 0.00, ''),
(3, 12, '', 0.00, 0.00, ''),
(4, 13, '', 0.00, 0.00, '');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_users`
--

CREATE TABLE `tbl_users` (
  `user_id` int(11) NOT NULL,
  `user_firstName` varchar(50) NOT NULL,
  `user_lastName` varchar(50) NOT NULL,
  `user_suffix` varchar(10) DEFAULT NULL,
  `user_birthdate` date DEFAULT NULL,
  `user_email` varchar(100) NOT NULL,
  `user_contact` varchar(20) NOT NULL,
  `user_username` varchar(50) NOT NULL,
  `user_pwd` varchar(255) NOT NULL,
  `user_pfp` varchar(255) DEFAULT 'uploads/user_profile/default_pfp.png',
  `user_role` enum('admin','organizer','client') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_users`
--

INSERT INTO `tbl_users` (`user_id`, `user_firstName`, `user_lastName`, `user_suffix`, `user_birthdate`, `user_email`, `user_contact`, `user_username`, `user_pwd`, `user_pfp`, `user_role`, `created_at`) VALUES
(5, 'test', 'test', 'III', '1995-10-20', 'test@gmail.com', '0909090990', 'test', '$2y$10$kINW0dn.gMncgts2MHlwAeuJluo1eotovACTt.z5TUhZ5rf2Ewhhm', 'uploads/user_profile/sample.jpg', 'client', '2025-02-25 12:43:54'),
(7, 'Mayette', 'Lagdamin', '', '1995-12-12', 'aizsingidas@gmail.com', '099909009', 'admin', '$2y$10$/kqcsB6g/loADYG7FIi09ufxRzrU7xF19ap7MpF0DibA77vmVhPAS', 'uploads/user_profile/default_pfp.png', 'admin', '2025-02-25 16:41:22'),
(15, 'Laurenz', 'Anches', '', '2000-10-31', 'lasi.anches.coc@phinmaed.com', '09054135590', 'laurenz', '$2y$10$IIUK.GHlqUPudNpZoBCw0e8z8OeIpoKH.BSdcHuQdGCiSqjK8prdS', 'uploads/user_profile/sakamoto.jpg', 'client', '2025-03-04 07:26:38');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_venue`
--

CREATE TABLE `tbl_venue` (
  `venue_id` int(11) NOT NULL,
  `venue_title` varchar(255) NOT NULL,
  `user_id` int(11) NOT NULL,
  `feedback_id` int(11) DEFAULT NULL,
  `venue_owner` varchar(255) NOT NULL,
  `venue_location` text NOT NULL,
  `venue_contact` varchar(20) NOT NULL,
  `venue_details` text DEFAULT NULL,
  `venue_status` enum('available','booked','unavailable','maintenance') DEFAULT 'available',
  `is_active` tinyint(1) DEFAULT 1,
  `venue_capacity` int(11) NOT NULL,
  `venue_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `venue_type` enum('indoor','outdoor','hybrid','garden','hall','pavilion') DEFAULT 'indoor',
  `venue_profile_picture` varchar(255) DEFAULT NULL,
  `venue_cover_photo` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_venue`
--

INSERT INTO `tbl_venue` (`venue_id`, `venue_title`, `user_id`, `feedback_id`, `venue_owner`, `venue_location`, `venue_contact`, `venue_details`, `venue_status`, `is_active`, `venue_capacity`, `venue_price`, `venue_type`, `venue_profile_picture`, `venue_cover_photo`, `created_at`, `updated_at`) VALUES
(29, 'Pearlmont Hotel', 7, NULL, 'Admin', 'Limketkai Drive, Cagayan de Oro City', '09176273275', 'Wedding Package 1', 'available', 1, 100, 44000.00, '', 'uploads/venue_profile_pictures/1749899533_684d590da78aa.jpg', 'uploads/venue_cover_photos/1749899533_684d590da7bbd.jpg', '2025-06-14 11:12:13', '2025-06-14 11:12:13'),
(30, 'Pearlmont Hotel - Package 2', 7, NULL, 'Admin', 'Limketkai Drive, Cagayan de Oro City', '09176273275', 'Package 2', 'available', 1, 100, 48000.00, '', 'uploads/venue_profile_pictures/1749900114_684d5b5252fe9.jpg', 'uploads/venue_cover_photos/1749900114_684d5b5253360.jpg', '2025-06-14 11:21:54', '2025-06-14 11:21:54');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_venue_components`
--

CREATE TABLE `tbl_venue_components` (
  `component_id` int(11) NOT NULL,
  `inclusion_id` int(11) NOT NULL,
  `component_name` varchar(255) NOT NULL,
  `component_description` text DEFAULT NULL,
  `component_quantity` int(11) DEFAULT 1,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_venue_components`
--

INSERT INTO `tbl_venue_components` (`component_id`, `inclusion_id`, `component_name`, `component_description`, `component_quantity`, `is_active`, `created_at`) VALUES
(28, 20, '1 room for overnight stay for two', '', 1, 1, '2025-06-14 11:12:13'),
(29, 20, 'Gift Tables', '', 1, 1, '2025-06-14 11:12:13'),
(30, 20, 'White seat cover with motif', '', 1, 1, '2025-06-14 11:12:13'),
(31, 20, 'Debutant\'s Chair', '', 1, 1, '2025-06-14 11:12:13'),
(32, 20, 'Buffet Serving', '', 1, 1, '2025-06-14 11:12:13'),
(33, 20, 'Sound System', '', 1, 1, '2025-06-14 11:12:13'),
(34, 20, 'Standby Waiters', '', 1, 1, '2025-06-14 11:12:13'),
(35, 20, 'Free Corkage on 2 Lechon only', '', 1, 1, '2025-06-14 11:12:13'),
(36, 21, '1 room for overnight stay for two', '', 1, 1, '2025-06-14 11:21:54'),
(37, 21, 'Gift Tables', '', 1, 1, '2025-06-14 11:21:54'),
(38, 21, 'Debutant\'s Chair', '', 1, 1, '2025-06-14 11:21:54'),
(39, 21, 'Buffet Serving', '', 1, 1, '2025-06-14 11:21:54'),
(40, 21, 'Sound System and Disco Lights', '', 1, 1, '2025-06-14 11:21:54'),
(41, 21, 'Standby Waiters', '', 1, 1, '2025-06-14 11:21:54'),
(42, 21, 'Free Corkage on 2 Lechon only', '', 1, 1, '2025-06-14 11:21:54');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_venue_inclusions`
--

CREATE TABLE `tbl_venue_inclusions` (
  `inclusion_id` int(11) NOT NULL,
  `venue_id` int(11) NOT NULL,
  `inclusion_name` varchar(255) NOT NULL,
  `inclusion_price` decimal(10,2) NOT NULL,
  `inclusion_description` text DEFAULT NULL,
  `is_required` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_venue_inclusions`
--

INSERT INTO `tbl_venue_inclusions` (`inclusion_id`, `venue_id`, `inclusion_name`, `inclusion_price`, `inclusion_description`, `is_required`, `is_active`, `created_at`, `updated_at`) VALUES
(20, 29, 'Inclusions', 0.00, '', 0, 1, '2025-06-14 11:12:13', '2025-06-14 11:12:13'),
(21, 30, 'Inclusions', 0.00, '', 0, 1, '2025-06-14 11:21:54', '2025-06-14 11:21:54');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_venue_price`
--

CREATE TABLE `tbl_venue_price` (
  `tbl_venue_price_id` int(11) NOT NULL,
  `venue_id` int(11) NOT NULL,
  `venue_price_title` varchar(255) NOT NULL,
  `venue_price_min` decimal(10,2) NOT NULL DEFAULT 0.00,
  `venue_price_max` decimal(10,2) NOT NULL DEFAULT 0.00,
  `venue_price_description` text DEFAULT NULL,
  `tbl_capacity` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `price_type` enum('per_hour','per_day','fixed','per_guest') DEFAULT 'fixed'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_website_settings`
--

CREATE TABLE `tbl_website_settings` (
  `setting_id` int(11) NOT NULL,
  `company_name` varchar(255) DEFAULT 'Event Coordination System',
  `company_logo` text DEFAULT NULL,
  `hero_image` text DEFAULT NULL,
  `primary_color` varchar(7) DEFAULT '#16a34a',
  `secondary_color` varchar(7) DEFAULT '#059669',
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `about_text` text DEFAULT NULL,
  `social_facebook` varchar(255) DEFAULT NULL,
  `social_instagram` varchar(255) DEFAULT NULL,
  `social_twitter` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_website_settings`
--

INSERT INTO `tbl_website_settings` (`setting_id`, `company_name`, `company_logo`, `hero_image`, `primary_color`, `secondary_color`, `contact_email`, `contact_phone`, `address`, `about_text`, `social_facebook`, `social_instagram`, `social_twitter`, `created_at`, `updated_at`) VALUES
(1, 'Event Coordination System', NULL, NULL, '#16a34a', '#059669', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-06-26 05:19:02', '2025-06-26 05:19:02');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_wedding_details`
--

CREATE TABLE `tbl_wedding_details` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `nuptial` varchar(255) DEFAULT NULL,
  `motif` varchar(255) DEFAULT NULL,
  `bride_name` varchar(255) DEFAULT NULL,
  `bride_size` varchar(50) DEFAULT NULL,
  `groom_name` varchar(255) DEFAULT NULL,
  `groom_size` varchar(50) DEFAULT NULL,
  `mother_bride_name` varchar(255) DEFAULT NULL,
  `mother_bride_size` varchar(50) DEFAULT NULL,
  `father_bride_name` varchar(255) DEFAULT NULL,
  `father_bride_size` varchar(50) DEFAULT NULL,
  `mother_groom_name` varchar(255) DEFAULT NULL,
  `mother_groom_size` varchar(50) DEFAULT NULL,
  `father_groom_name` varchar(255) DEFAULT NULL,
  `father_groom_size` varchar(50) DEFAULT NULL,
  `maid_of_honor_name` varchar(255) DEFAULT NULL,
  `maid_of_honor_size` varchar(50) DEFAULT NULL,
  `best_man_name` varchar(255) DEFAULT NULL,
  `best_man_size` varchar(50) DEFAULT NULL,
  `little_bride_name` varchar(255) DEFAULT NULL,
  `little_bride_size` varchar(50) DEFAULT NULL,
  `little_groom_name` varchar(255) DEFAULT NULL,
  `little_groom_size` varchar(50) DEFAULT NULL,
  `bridesmaids_qty` int(11) DEFAULT 0,
  `groomsmen_qty` int(11) DEFAULT 0,
  `junior_groomsmen_qty` int(11) DEFAULT 0,
  `flower_girls_qty` int(11) DEFAULT 0,
  `ring_bearer_qty` int(11) DEFAULT 0,
  `bible_bearer_qty` int(11) DEFAULT 0,
  `coin_bearer_qty` int(11) DEFAULT 0,
  `bridesmaids_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`bridesmaids_names`)),
  `groomsmen_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`groomsmen_names`)),
  `junior_groomsmen_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`junior_groomsmen_names`)),
  `flower_girls_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`flower_girls_names`)),
  `ring_bearer_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ring_bearer_names`)),
  `bible_bearer_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`bible_bearer_names`)),
  `coin_bearer_names` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`coin_bearer_names`)),
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
  `prepared_by` varchar(255) DEFAULT NULL,
  `received_by` varchar(255) DEFAULT NULL,
  `pickup_date` date DEFAULT NULL,
  `return_date` date DEFAULT NULL,
  `customer_signature` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_client_payment_summary`
-- (See below for the actual view)
--
CREATE TABLE `view_client_payment_summary` (
`event_id` int(11)
,`event_title` varchar(255)
,`event_date` date
,`client_id` int(11)
,`client_name` varchar(101)
,`total_budget` decimal(12,2)
,`down_payment` decimal(12,2)
,`schedule_name` varchar(100)
,`total_paid` decimal(34,2)
,`remaining_balance` decimal(35,2)
,`payment_progress_percent` decimal(40,2)
,`total_installments` bigint(21)
,`paid_installments` decimal(22,0)
,`overdue_installments` decimal(22,0)
,`next_payment_due` date
,`next_payment_amount` decimal(12,2)
,`overall_status` enum('unpaid','partial','paid','refunded')
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_events_detailed`
-- (See below for the actual view)
--
CREATE TABLE `view_events_detailed` (
`event_id` int(11)
,`original_booking_reference` varchar(50)
,`user_id` int(11)
,`admin_id` int(11)
,`organizer_id` int(11)
,`event_title` varchar(255)
,`event_theme` varchar(255)
,`event_description` text
,`event_type_id` int(11)
,`guest_count` int(11)
,`event_date` date
,`start_time` time
,`end_time` time
,`payment_status` enum('unpaid','partial','paid','refunded')
,`package_id` int(11)
,`venue_id` int(11)
,`total_budget` decimal(12,2)
,`down_payment` decimal(12,2)
,`payment_method` varchar(50)
,`payment_schedule_type_id` int(11)
,`reference_number` varchar(100)
,`additional_notes` text
,`event_status` enum('draft','confirmed','on_going','done','cancelled')
,`booking_date` date
,`booking_time` time
,`created_by` int(11)
,`updated_by` int(11)
,`created_at` timestamp
,`updated_at` timestamp
,`event_attachments` longtext
,`event_feedback_id` int(11)
,`event_wedding_form_id` int(11)
,`is_recurring` tinyint(1)
,`recurrence_rule` longtext
,`cancellation_reason` text
,`finalized_at` datetime
,`client_signature` text
,`client_name` varchar(101)
,`admin_name` varchar(101)
,`organizer_name` varchar(101)
,`created_by_name` varchar(101)
,`updated_by_name` varchar(101)
,`event_type_name` varchar(100)
,`package_title` varchar(255)
,`venue_title` varchar(255)
,`payment_schedule_name` varchar(100)
,`bride_name` varchar(255)
,`groom_name` varchar(255)
,`feedback_rating` tinyint(4)
,`feedback_text` text
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_event_payments`
-- (See below for the actual view)
--
CREATE TABLE `view_event_payments` (
`event_id` int(11)
,`event_title` varchar(255)
,`event_date` date
,`event_payment_status` enum('unpaid','partial','paid','refunded')
,`total_budget` decimal(12,2)
,`down_payment` decimal(12,2)
,`payment_schedule_type_id` int(11)
,`payment_schedule_name` varchar(100)
,`user_firstName` varchar(50)
,`user_lastName` varchar(50)
,`user_email` varchar(100)
,`admin_firstName` varchar(50)
,`admin_lastName` varchar(50)
,`schedule_id` int(11)
,`installment_number` int(11)
,`due_date` date
,`schedule_amount_due` decimal(12,2)
,`schedule_amount_paid` decimal(12,2)
,`schedule_payment_status` enum('pending','partial','paid','overdue')
,`payment_id` int(11)
,`payment_amount` decimal(12,2)
,`payment_method` enum('cash','gcash','bank-transfer','credit-card','check','online-banking')
,`payment_status` enum('pending','processing','completed','failed','cancelled','refunded')
,`payment_date` date
,`payment_reference` varchar(255)
,`payment_percentage` decimal(5,2)
,`remaining_balance` decimal(35,2)
,`total_paid` decimal(34,2)
,`payment_urgency` varchar(9)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_package_budget_status`
-- (See below for the actual view)
--
CREATE TABLE `v_package_budget_status` (
`package_id` int(11)
,`package_title` varchar(255)
,`package_price` decimal(10,2)
,`original_price` decimal(10,2)
,`is_price_locked` tinyint(1)
,`inclusions_total` decimal(32,2)
,`difference` decimal(33,2)
,`budget_status` varchar(7)
,`margin_percentage` decimal(42,6)
);

-- --------------------------------------------------------

--
-- Structure for view `view_client_payment_summary`
--
DROP TABLE IF EXISTS `view_client_payment_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_client_payment_summary`  AS SELECT `e`.`event_id` AS `event_id`, `e`.`event_title` AS `event_title`, `e`.`event_date` AS `event_date`, `e`.`user_id` AS `client_id`, concat(`c`.`user_firstName`,' ',`c`.`user_lastName`) AS `client_name`, `e`.`total_budget` AS `total_budget`, `e`.`down_payment` AS `down_payment`, `pst`.`schedule_name` AS `schedule_name`, coalesce(sum(`p`.`payment_amount`),0) AS `total_paid`, `e`.`total_budget`- coalesce(sum(`p`.`payment_amount`),0) AS `remaining_balance`, round(coalesce(sum(`p`.`payment_amount`),0) / `e`.`total_budget` * 100,2) AS `payment_progress_percent`, count(`eps`.`schedule_id`) AS `total_installments`, sum(case when `eps`.`payment_status` = 'paid' then 1 else 0 end) AS `paid_installments`, sum(case when `eps`.`payment_status` = 'overdue' or `eps`.`due_date` < curdate() and `eps`.`payment_status` <> 'paid' then 1 else 0 end) AS `overdue_installments`, (select min(`tbl_event_payment_schedules`.`due_date`) from `tbl_event_payment_schedules` where `tbl_event_payment_schedules`.`event_id` = `e`.`event_id` and `tbl_event_payment_schedules`.`payment_status` <> 'paid') AS `next_payment_due`, (select `tbl_event_payment_schedules`.`amount_due` from `tbl_event_payment_schedules` where `tbl_event_payment_schedules`.`event_id` = `e`.`event_id` and `tbl_event_payment_schedules`.`payment_status` <> 'paid' order by `tbl_event_payment_schedules`.`due_date` limit 1) AS `next_payment_amount`, `e`.`payment_status` AS `overall_status` FROM ((((`tbl_events` `e` left join `tbl_users` `c` on(`e`.`user_id` = `c`.`user_id`)) left join `tbl_payment_schedule_types` `pst` on(`e`.`payment_schedule_type_id` = `pst`.`schedule_type_id`)) left join `tbl_event_payment_schedules` `eps` on(`e`.`event_id` = `eps`.`event_id`)) left join `tbl_payments` `p` on(`eps`.`schedule_id` = `p`.`schedule_id` and `p`.`payment_status` = 'completed')) GROUP BY `e`.`event_id` ;

-- --------------------------------------------------------

--
-- Structure for view `view_events_detailed`
--
DROP TABLE IF EXISTS `view_events_detailed`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_events_detailed`  AS SELECT `e`.`event_id` AS `event_id`, `e`.`original_booking_reference` AS `original_booking_reference`, `e`.`user_id` AS `user_id`, `e`.`admin_id` AS `admin_id`, `e`.`organizer_id` AS `organizer_id`, `e`.`event_title` AS `event_title`, `e`.`event_theme` AS `event_theme`, `e`.`event_description` AS `event_description`, `e`.`event_type_id` AS `event_type_id`, `e`.`guest_count` AS `guest_count`, `e`.`event_date` AS `event_date`, `e`.`start_time` AS `start_time`, `e`.`end_time` AS `end_time`, `e`.`payment_status` AS `payment_status`, `e`.`package_id` AS `package_id`, `e`.`venue_id` AS `venue_id`, `e`.`total_budget` AS `total_budget`, `e`.`down_payment` AS `down_payment`, `e`.`payment_method` AS `payment_method`, `e`.`payment_schedule_type_id` AS `payment_schedule_type_id`, `e`.`reference_number` AS `reference_number`, `e`.`additional_notes` AS `additional_notes`, `e`.`event_status` AS `event_status`, `e`.`booking_date` AS `booking_date`, `e`.`booking_time` AS `booking_time`, `e`.`created_by` AS `created_by`, `e`.`updated_by` AS `updated_by`, `e`.`created_at` AS `created_at`, `e`.`updated_at` AS `updated_at`, `e`.`event_attachments` AS `event_attachments`, `e`.`event_feedback_id` AS `event_feedback_id`, `e`.`event_wedding_form_id` AS `event_wedding_form_id`, `e`.`is_recurring` AS `is_recurring`, `e`.`recurrence_rule` AS `recurrence_rule`, `e`.`cancellation_reason` AS `cancellation_reason`, `e`.`finalized_at` AS `finalized_at`, `e`.`client_signature` AS `client_signature`, concat(`c`.`user_firstName`,' ',`c`.`user_lastName`) AS `client_name`, concat(`a`.`user_firstName`,' ',`a`.`user_lastName`) AS `admin_name`, concat(`o`.`user_firstName`,' ',`o`.`user_lastName`) AS `organizer_name`, concat(`cb`.`user_firstName`,' ',`cb`.`user_lastName`) AS `created_by_name`, concat(`ub`.`user_firstName`,' ',`ub`.`user_lastName`) AS `updated_by_name`, `et`.`event_name` AS `event_type_name`, `p`.`package_title` AS `package_title`, `v`.`venue_title` AS `venue_title`, `pst`.`schedule_name` AS `payment_schedule_name`, `wd`.`bride_name` AS `bride_name`, `wd`.`groom_name` AS `groom_name`, `f`.`feedback_rating` AS `feedback_rating`, `f`.`feedback_text` AS `feedback_text` FROM (((((((((((`tbl_events` `e` left join `tbl_users` `c` on(`e`.`user_id` = `c`.`user_id`)) left join `tbl_users` `a` on(`e`.`admin_id` = `a`.`user_id`)) left join `tbl_users` `o` on(`e`.`organizer_id` = `o`.`user_id`)) left join `tbl_users` `cb` on(`e`.`created_by` = `cb`.`user_id`)) left join `tbl_users` `ub` on(`e`.`updated_by` = `ub`.`user_id`)) left join `tbl_event_type` `et` on(`e`.`event_type_id` = `et`.`event_type_id`)) left join `tbl_packages` `p` on(`e`.`package_id` = `p`.`package_id`)) left join `tbl_venue` `v` on(`e`.`venue_id` = `v`.`venue_id`)) left join `tbl_payment_schedule_types` `pst` on(`e`.`payment_schedule_type_id` = `pst`.`schedule_type_id`)) left join `tbl_wedding_details` `wd` on(`e`.`event_wedding_form_id` = `wd`.`id`)) left join `tbl_feedback` `f` on(`e`.`event_feedback_id` = `f`.`feedback_id`)) ;

-- --------------------------------------------------------

--
-- Structure for view `view_event_payments`
--
DROP TABLE IF EXISTS `view_event_payments`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_event_payments`  AS SELECT `e`.`event_id` AS `event_id`, `e`.`event_title` AS `event_title`, `e`.`event_date` AS `event_date`, `e`.`payment_status` AS `event_payment_status`, `e`.`total_budget` AS `total_budget`, `e`.`down_payment` AS `down_payment`, `e`.`payment_schedule_type_id` AS `payment_schedule_type_id`, `pst`.`schedule_name` AS `payment_schedule_name`, `c`.`user_firstName` AS `user_firstName`, `c`.`user_lastName` AS `user_lastName`, `c`.`user_email` AS `user_email`, `a`.`user_firstName` AS `admin_firstName`, `a`.`user_lastName` AS `admin_lastName`, `eps`.`schedule_id` AS `schedule_id`, `eps`.`installment_number` AS `installment_number`, `eps`.`due_date` AS `due_date`, `eps`.`amount_due` AS `schedule_amount_due`, `eps`.`amount_paid` AS `schedule_amount_paid`, `eps`.`payment_status` AS `schedule_payment_status`, `p`.`payment_id` AS `payment_id`, `p`.`payment_amount` AS `payment_amount`, `p`.`payment_method` AS `payment_method`, `p`.`payment_status` AS `payment_status`, `p`.`payment_date` AS `payment_date`, `p`.`payment_reference` AS `payment_reference`, `p`.`payment_percentage` AS `payment_percentage`, `e`.`total_budget`- coalesce((select sum(`tbl_payments`.`payment_amount`) from `tbl_payments` where `tbl_payments`.`event_id` = `e`.`event_id` and `tbl_payments`.`payment_status` = 'completed'),0) AS `remaining_balance`, coalesce((select sum(`tbl_payments`.`payment_amount`) from `tbl_payments` where `tbl_payments`.`event_id` = `e`.`event_id` and `tbl_payments`.`payment_status` = 'completed'),0) AS `total_paid`, CASE WHEN `eps`.`due_date` < curdate() AND `eps`.`payment_status` <> 'paid' THEN 'overdue' WHEN `eps`.`due_date` = curdate() AND `eps`.`payment_status` <> 'paid' THEN 'due_today' ELSE 'current' END AS `payment_urgency` FROM (((((`tbl_events` `e` left join `tbl_users` `c` on(`e`.`user_id` = `c`.`user_id`)) left join `tbl_users` `a` on(`e`.`admin_id` = `a`.`user_id`)) left join `tbl_payment_schedule_types` `pst` on(`e`.`payment_schedule_type_id` = `pst`.`schedule_type_id`)) left join `tbl_event_payment_schedules` `eps` on(`e`.`event_id` = `eps`.`event_id`)) left join `tbl_payments` `p` on(`eps`.`schedule_id` = `p`.`schedule_id` and `p`.`payment_status` = 'completed')) ORDER BY `e`.`event_id` ASC, `eps`.`installment_number` ASC, `p`.`payment_date` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `v_package_budget_status`
--
DROP TABLE IF EXISTS `v_package_budget_status`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_package_budget_status`  AS SELECT `p`.`package_id` AS `package_id`, `p`.`package_title` AS `package_title`, `p`.`package_price` AS `package_price`, `p`.`original_price` AS `original_price`, `p`.`is_price_locked` AS `is_price_locked`, coalesce(sum(`pc`.`component_price`),0) AS `inclusions_total`, `p`.`package_price`- coalesce(sum(`pc`.`component_price`),0) AS `difference`, CASE WHEN `p`.`package_price` - coalesce(sum(`pc`.`component_price`),0) > 0 THEN 'BUFFER' WHEN `p`.`package_price` - coalesce(sum(`pc`.`component_price`),0) < 0 THEN 'OVERAGE' ELSE 'EXACT' END AS `budget_status`, CASE WHEN `p`.`package_price` > 0 THEN (`p`.`package_price` - coalesce(sum(`pc`.`component_price`),0)) / `p`.`package_price` * 100 ELSE 0 END AS `margin_percentage` FROM (`tbl_packages` `p` left join `tbl_package_components` `pc` on(`p`.`package_id` = `pc`.`package_id`)) GROUP BY `p`.`package_id`, `p`.`package_title`, `p`.`package_price`, `p`.`original_price`, `p`.`is_price_locked` ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tbl_2fa`
--
ALTER TABLE `tbl_2fa`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `tbl_bookings`
--
ALTER TABLE `tbl_bookings`
  ADD PRIMARY KEY (`booking_id`),
  ADD UNIQUE KEY `booking_reference` (`booking_reference`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `event_type_id` (`event_type_id`),
  ADD KEY `venue_id` (`venue_id`),
  ADD KEY `package_id` (`package_id`),
  ADD KEY `idx_booking_status` (`booking_status`),
  ADD KEY `idx_booking_reference` (`booking_reference`),
  ADD KEY `idx_venue_id` (`venue_id`);

--
-- Indexes for table `tbl_budget`
--
ALTER TABLE `tbl_budget`
  ADD PRIMARY KEY (`budget_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `tbl_events`
--
ALTER TABLE `tbl_events`
  ADD PRIMARY KEY (`event_id`),
  ADD KEY `fk_event_client` (`user_id`),
  ADD KEY `fk_event_admin` (`admin_id`),
  ADD KEY `fk_event_organizer` (`organizer_id`),
  ADD KEY `fk_event_type` (`event_type_id`),
  ADD KEY `fk_event_package` (`package_id`),
  ADD KEY `fk_event_venue` (`venue_id`),
  ADD KEY `idx_events_date_time` (`event_date`,`start_time`,`end_time`),
  ADD KEY `idx_event_booking_ref` (`original_booking_reference`),
  ADD KEY `idx_payment_status` (`payment_status`),
  ADD KEY `idx_booking_date` (`booking_date`),
  ADD KEY `idx_event_theme` (`event_theme`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `fk_event_schedule_type` (`payment_schedule_type_id`),
  ADD KEY `idx_events_updated_by` (`updated_by`),
  ADD KEY `idx_events_is_recurring` (`is_recurring`),
  ADD KEY `idx_events_finalized_at` (`finalized_at`),
  ADD KEY `idx_events_feedback` (`event_feedback_id`),
  ADD KEY `idx_events_wedding_form` (`event_wedding_form_id`);

--
-- Indexes for table `tbl_event_components`
--
ALTER TABLE `tbl_event_components`
  ADD PRIMARY KEY (`component_id`),
  ADD KEY `fk_event_component_event` (`event_id`),
  ADD KEY `fk_event_component_original` (`original_package_component_id`);

--
-- Indexes for table `tbl_event_package`
--
ALTER TABLE `tbl_event_package`
  ADD PRIMARY KEY (`event_package_id`),
  ADD KEY `venue_id` (`venue_id`),
  ADD KEY `store_id` (`store_id`),
  ADD KEY `budget_id` (`budget_id`),
  ADD KEY `event_type_id` (`event_type_id`),
  ADD KEY `fk_event_package_creator` (`user_id`);

--
-- Indexes for table `tbl_event_payment_schedules`
--
ALTER TABLE `tbl_event_payment_schedules`
  ADD PRIMARY KEY (`schedule_id`),
  ADD KEY `fk_schedule_event` (`event_id`),
  ADD KEY `fk_schedule_type` (`schedule_type_id`),
  ADD KEY `idx_due_date` (`due_date`),
  ADD KEY `idx_payment_status` (`payment_status`);

--
-- Indexes for table `tbl_event_timeline`
--
ALTER TABLE `tbl_event_timeline`
  ADD PRIMARY KEY (`timeline_id`),
  ADD KEY `fk_timeline_event` (`event_id`),
  ADD KEY `fk_timeline_component` (`component_id`),
  ADD KEY `fk_timeline_assigned` (`assigned_to`);

--
-- Indexes for table `tbl_event_type`
--
ALTER TABLE `tbl_event_type`
  ADD PRIMARY KEY (`event_type_id`);

--
-- Indexes for table `tbl_feedback`
--
ALTER TABLE `tbl_feedback`
  ADD PRIMARY KEY (`feedback_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `store_id` (`store_id`),
  ADD KEY `venue_id` (`venue_id`);

--
-- Indexes for table `tbl_notifications`
--
ALTER TABLE `tbl_notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `event_id` (`event_id`),
  ADD KEY `venue_id` (`venue_id`),
  ADD KEY `store_id` (`store_id`),
  ADD KEY `budget_id` (`budget_id`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `feedback_id` (`feedback_id`);

--
-- Indexes for table `tbl_packages`
--
ALTER TABLE `tbl_packages`
  ADD PRIMARY KEY (`package_id`),
  ADD KEY `fk_package_creator` (`created_by`);

--
-- Indexes for table `tbl_package_bookings`
--
ALTER TABLE `tbl_package_bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_package_booking_package` (`package_id`),
  ADD KEY `fk_package_booking_booking` (`booking_id`);

--
-- Indexes for table `tbl_package_components`
--
ALTER TABLE `tbl_package_components`
  ADD PRIMARY KEY (`component_id`),
  ADD KEY `fk_component_package` (`package_id`);

--
-- Indexes for table `tbl_package_event_types`
--
ALTER TABLE `tbl_package_event_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_package_event_type` (`package_id`,`event_type_id`),
  ADD KEY `fk_package_event_type` (`event_type_id`);

--
-- Indexes for table `tbl_package_freebies`
--
ALTER TABLE `tbl_package_freebies`
  ADD PRIMARY KEY (`freebie_id`),
  ADD KEY `fk_freebie_package` (`package_id`);

--
-- Indexes for table `tbl_package_price_history`
--
ALTER TABLE `tbl_package_price_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `idx_package_id` (`package_id`),
  ADD KEY `idx_changed_by` (`changed_by`);

--
-- Indexes for table `tbl_package_venues`
--
ALTER TABLE `tbl_package_venues`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_package_venue` (`package_id`,`venue_id`),
  ADD KEY `fk_package_venue_venue` (`venue_id`);

--
-- Indexes for table `tbl_payments`
--
ALTER TABLE `tbl_payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `idx_payment_event` (`event_id`),
  ADD KEY `idx_payment_client` (`client_id`),
  ADD KEY `idx_payment_status` (`payment_status`),
  ADD KEY `idx_payment_date` (`payment_date`),
  ADD KEY `idx_payment_method` (`payment_method`),
  ADD KEY `fk_payment_schedule` (`schedule_id`),
  ADD KEY `idx_payment_attachments` (`payment_attachments`(255));

--
-- Indexes for table `tbl_payment_logs`
--
ALTER TABLE `tbl_payment_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `fk_log_event` (`event_id`),
  ADD KEY `fk_log_schedule` (`schedule_id`),
  ADD KEY `fk_log_payment` (`payment_id`),
  ADD KEY `fk_log_client` (`client_id`),
  ADD KEY `fk_log_admin` (`admin_id`),
  ADD KEY `idx_action_type` (`action_type`);

--
-- Indexes for table `tbl_payment_schedule_types`
--
ALTER TABLE `tbl_payment_schedule_types`
  ADD PRIMARY KEY (`schedule_type_id`);

--
-- Indexes for table `tbl_store`
--
ALTER TABLE `tbl_store`
  ADD PRIMARY KEY (`store_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `store_category_id` (`store_category_id`),
  ADD KEY `fk_store_feedback` (`feedback_id`);

--
-- Indexes for table `tbl_store_category`
--
ALTER TABLE `tbl_store_category`
  ADD PRIMARY KEY (`store_category_id`);

--
-- Indexes for table `tbl_store_price`
--
ALTER TABLE `tbl_store_price`
  ADD PRIMARY KEY (`tbl_store_price_id`),
  ADD KEY `fk_store_price` (`store_id`);

--
-- Indexes for table `tbl_users`
--
ALTER TABLE `tbl_users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `user_email` (`user_email`),
  ADD UNIQUE KEY `user_username` (`user_username`);

--
-- Indexes for table `tbl_venue`
--
ALTER TABLE `tbl_venue`
  ADD PRIMARY KEY (`venue_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `fk_venue_feedback` (`feedback_id`),
  ADD KEY `idx_venue_status` (`venue_status`),
  ADD KEY `idx_venue_type` (`venue_type`),
  ADD KEY `idx_venue_capacity` (`venue_capacity`),
  ADD KEY `idx_venue_price` (`venue_price`);

--
-- Indexes for table `tbl_venue_components`
--
ALTER TABLE `tbl_venue_components`
  ADD PRIMARY KEY (`component_id`),
  ADD KEY `inclusion_id` (`inclusion_id`);

--
-- Indexes for table `tbl_venue_inclusions`
--
ALTER TABLE `tbl_venue_inclusions`
  ADD PRIMARY KEY (`inclusion_id`),
  ADD KEY `venue_id` (`venue_id`),
  ADD KEY `idx_inclusion_required` (`is_required`),
  ADD KEY `idx_inclusion_active` (`is_active`);

--
-- Indexes for table `tbl_venue_price`
--
ALTER TABLE `tbl_venue_price`
  ADD PRIMARY KEY (`tbl_venue_price_id`),
  ADD KEY `fk_venue_price_venue` (`venue_id`),
  ADD KEY `idx_venue_price_capacity` (`tbl_capacity`),
  ADD KEY `idx_venue_price_range` (`venue_price_min`,`venue_price_max`),
  ADD KEY `idx_venue_price_active` (`is_active`),
  ADD KEY `idx_venue_price_type` (`price_type`);

--
-- Indexes for table `tbl_website_settings`
--
ALTER TABLE `tbl_website_settings`
  ADD PRIMARY KEY (`setting_id`);

--
-- Indexes for table `tbl_wedding_details`
--
ALTER TABLE `tbl_wedding_details`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_event_wedding` (`event_id`),
  ADD KEY `idx_wedding_event_id` (`event_id`),
  ADD KEY `idx_wedding_bride_groom` (`bride_name`,`groom_name`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tbl_2fa`
--
ALTER TABLE `tbl_2fa`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=152;

--
-- AUTO_INCREMENT for table `tbl_bookings`
--
ALTER TABLE `tbl_bookings`
  MODIFY `booking_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `tbl_budget`
--
ALTER TABLE `tbl_budget`
  MODIFY `budget_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_events`
--
ALTER TABLE `tbl_events`
  MODIFY `event_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `tbl_event_components`
--
ALTER TABLE `tbl_event_components`
  MODIFY `component_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=170;

--
-- AUTO_INCREMENT for table `tbl_event_package`
--
ALTER TABLE `tbl_event_package`
  MODIFY `event_package_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_event_payment_schedules`
--
ALTER TABLE `tbl_event_payment_schedules`
  MODIFY `schedule_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `tbl_event_timeline`
--
ALTER TABLE `tbl_event_timeline`
  MODIFY `timeline_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=394;

--
-- AUTO_INCREMENT for table `tbl_event_type`
--
ALTER TABLE `tbl_event_type`
  MODIFY `event_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `tbl_feedback`
--
ALTER TABLE `tbl_feedback`
  MODIFY `feedback_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_notifications`
--
ALTER TABLE `tbl_notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `tbl_packages`
--
ALTER TABLE `tbl_packages`
  MODIFY `package_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `tbl_package_bookings`
--
ALTER TABLE `tbl_package_bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_package_components`
--
ALTER TABLE `tbl_package_components`
  MODIFY `component_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=271;

--
-- AUTO_INCREMENT for table `tbl_package_event_types`
--
ALTER TABLE `tbl_package_event_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `tbl_package_freebies`
--
ALTER TABLE `tbl_package_freebies`
  MODIFY `freebie_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `tbl_package_price_history`
--
ALTER TABLE `tbl_package_price_history`
  MODIFY `history_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_package_venues`
--
ALTER TABLE `tbl_package_venues`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `tbl_payments`
--
ALTER TABLE `tbl_payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `tbl_payment_logs`
--
ALTER TABLE `tbl_payment_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `tbl_payment_schedule_types`
--
ALTER TABLE `tbl_payment_schedule_types`
  MODIFY `schedule_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_store`
--
ALTER TABLE `tbl_store`
  MODIFY `store_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `tbl_store_category`
--
ALTER TABLE `tbl_store_category`
  MODIFY `store_category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `tbl_store_price`
--
ALTER TABLE `tbl_store_price`
  MODIFY `tbl_store_price_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `tbl_users`
--
ALTER TABLE `tbl_users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `tbl_venue`
--
ALTER TABLE `tbl_venue`
  MODIFY `venue_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `tbl_venue_components`
--
ALTER TABLE `tbl_venue_components`
  MODIFY `component_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `tbl_venue_inclusions`
--
ALTER TABLE `tbl_venue_inclusions`
  MODIFY `inclusion_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `tbl_venue_price`
--
ALTER TABLE `tbl_venue_price`
  MODIFY `tbl_venue_price_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_website_settings`
--
ALTER TABLE `tbl_website_settings`
  MODIFY `setting_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_wedding_details`
--
ALTER TABLE `tbl_wedding_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tbl_2fa`
--
ALTER TABLE `tbl_2fa`
  ADD CONSTRAINT `tbl_2fa_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_bookings`
--
ALTER TABLE `tbl_bookings`
  ADD CONSTRAINT `tbl_bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_bookings_ibfk_2` FOREIGN KEY (`event_type_id`) REFERENCES `tbl_event_type` (`event_type_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tbl_bookings_ibfk_3` FOREIGN KEY (`venue_id`) REFERENCES `tbl_venue` (`venue_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tbl_bookings_ibfk_4` FOREIGN KEY (`package_id`) REFERENCES `tbl_packages` (`package_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_budget`
--
ALTER TABLE `tbl_budget`
  ADD CONSTRAINT `tbl_budget_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_events`
--
ALTER TABLE `tbl_events`
  ADD CONSTRAINT `fk_event_admin` FOREIGN KEY (`admin_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_event_client` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_event_created_by` FOREIGN KEY (`created_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_event_feedback` FOREIGN KEY (`event_feedback_id`) REFERENCES `tbl_feedback` (`feedback_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_event_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_event_package` FOREIGN KEY (`package_id`) REFERENCES `tbl_packages` (`package_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_event_schedule_type` FOREIGN KEY (`payment_schedule_type_id`) REFERENCES `tbl_payment_schedule_types` (`schedule_type_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_event_type` FOREIGN KEY (`event_type_id`) REFERENCES `tbl_event_type` (`event_type_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_event_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_event_venue` FOREIGN KEY (`venue_id`) REFERENCES `tbl_venue` (`venue_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_event_wedding_form` FOREIGN KEY (`event_wedding_form_id`) REFERENCES `tbl_wedding_details` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_event_components`
--
ALTER TABLE `tbl_event_components`
  ADD CONSTRAINT `fk_event_component_event` FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_event_component_original` FOREIGN KEY (`original_package_component_id`) REFERENCES `tbl_package_components` (`component_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_event_package`
--
ALTER TABLE `tbl_event_package`
  ADD CONSTRAINT `fk_event_package_creator` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_event_package_ibfk_2` FOREIGN KEY (`venue_id`) REFERENCES `tbl_venue` (`venue_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_event_package_ibfk_3` FOREIGN KEY (`store_id`) REFERENCES `tbl_store` (`store_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_event_package_ibfk_4` FOREIGN KEY (`budget_id`) REFERENCES `tbl_budget` (`budget_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_event_package_ibfk_5` FOREIGN KEY (`event_type_id`) REFERENCES `tbl_event_type` (`event_type_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_event_payment_schedules`
--
ALTER TABLE `tbl_event_payment_schedules`
  ADD CONSTRAINT `fk_schedule_event` FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_schedule_type` FOREIGN KEY (`schedule_type_id`) REFERENCES `tbl_payment_schedule_types` (`schedule_type_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_event_timeline`
--
ALTER TABLE `tbl_event_timeline`
  ADD CONSTRAINT `fk_timeline_assigned` FOREIGN KEY (`assigned_to`) REFERENCES `tbl_users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_timeline_component` FOREIGN KEY (`component_id`) REFERENCES `tbl_event_components` (`component_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_timeline_event` FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_feedback`
--
ALTER TABLE `tbl_feedback`
  ADD CONSTRAINT `tbl_feedback_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_feedback_ibfk_2` FOREIGN KEY (`store_id`) REFERENCES `tbl_store` (`store_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_feedback_ibfk_3` FOREIGN KEY (`venue_id`) REFERENCES `tbl_venue` (`venue_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_notifications`
--
ALTER TABLE `tbl_notifications`
  ADD CONSTRAINT `tbl_notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_notifications_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `tbl_event` (`event_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_notifications_ibfk_3` FOREIGN KEY (`venue_id`) REFERENCES `tbl_venue` (`venue_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_notifications_ibfk_4` FOREIGN KEY (`store_id`) REFERENCES `tbl_store` (`store_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_notifications_ibfk_5` FOREIGN KEY (`budget_id`) REFERENCES `tbl_budget` (`budget_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_notifications_ibfk_6` FOREIGN KEY (`booking_id`) REFERENCES `tbl_bookings` (`booking_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_notifications_ibfk_7` FOREIGN KEY (`feedback_id`) REFERENCES `tbl_feedback` (`feedback_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_packages`
--
ALTER TABLE `tbl_packages`
  ADD CONSTRAINT `fk_package_creator` FOREIGN KEY (`created_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_package_bookings`
--
ALTER TABLE `tbl_package_bookings`
  ADD CONSTRAINT `fk_package_booking_booking` FOREIGN KEY (`booking_id`) REFERENCES `tbl_bookings` (`booking_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_package_booking_package` FOREIGN KEY (`package_id`) REFERENCES `tbl_packages` (`package_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_package_components`
--
ALTER TABLE `tbl_package_components`
  ADD CONSTRAINT `fk_component_package` FOREIGN KEY (`package_id`) REFERENCES `tbl_packages` (`package_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_package_event_types`
--
ALTER TABLE `tbl_package_event_types`
  ADD CONSTRAINT `fk_package_event_type` FOREIGN KEY (`event_type_id`) REFERENCES `tbl_event_type` (`event_type_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_package_event_type_package` FOREIGN KEY (`package_id`) REFERENCES `tbl_packages` (`package_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_package_freebies`
--
ALTER TABLE `tbl_package_freebies`
  ADD CONSTRAINT `fk_freebie_package` FOREIGN KEY (`package_id`) REFERENCES `tbl_packages` (`package_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_package_price_history`
--
ALTER TABLE `tbl_package_price_history`
  ADD CONSTRAINT `fk_price_history_package` FOREIGN KEY (`package_id`) REFERENCES `tbl_packages` (`package_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_price_history_user` FOREIGN KEY (`changed_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_package_venues`
--
ALTER TABLE `tbl_package_venues`
  ADD CONSTRAINT `fk_package_venue_package` FOREIGN KEY (`package_id`) REFERENCES `tbl_packages` (`package_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_package_venue_venue` FOREIGN KEY (`venue_id`) REFERENCES `tbl_venue` (`venue_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_payments`
--
ALTER TABLE `tbl_payments`
  ADD CONSTRAINT `fk_payment_client` FOREIGN KEY (`client_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_payment_event` FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_payment_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `tbl_event_payment_schedules` (`schedule_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_payment_logs`
--
ALTER TABLE `tbl_payment_logs`
  ADD CONSTRAINT `fk_log_admin` FOREIGN KEY (`admin_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_log_client` FOREIGN KEY (`client_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_log_event` FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_log_payment` FOREIGN KEY (`payment_id`) REFERENCES `tbl_payments` (`payment_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_log_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `tbl_event_payment_schedules` (`schedule_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_store`
--
ALTER TABLE `tbl_store`
  ADD CONSTRAINT `fk_store_feedback` FOREIGN KEY (`feedback_id`) REFERENCES `tbl_feedback` (`feedback_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tbl_store_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_store_ibfk_2` FOREIGN KEY (`store_category_id`) REFERENCES `tbl_store_category` (`store_category_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_store_ibfk_3` FOREIGN KEY (`feedback_id`) REFERENCES `tbl_feedback` (`feedback_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_store_price`
--
ALTER TABLE `tbl_store_price`
  ADD CONSTRAINT `fk_store_price` FOREIGN KEY (`store_id`) REFERENCES `tbl_store` (`store_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_venue`
--
ALTER TABLE `tbl_venue`
  ADD CONSTRAINT `fk_venue_feedback` FOREIGN KEY (`feedback_id`) REFERENCES `tbl_feedback` (`feedback_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tbl_venue_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_venue_ibfk_2` FOREIGN KEY (`feedback_id`) REFERENCES `tbl_feedback` (`feedback_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_venue_components`
--
ALTER TABLE `tbl_venue_components`
  ADD CONSTRAINT `tbl_venue_components_ibfk_1` FOREIGN KEY (`inclusion_id`) REFERENCES `tbl_venue_inclusions` (`inclusion_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_venue_inclusions`
--
ALTER TABLE `tbl_venue_inclusions`
  ADD CONSTRAINT `tbl_venue_inclusions_ibfk_1` FOREIGN KEY (`venue_id`) REFERENCES `tbl_venue` (`venue_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_venue_price`
--
ALTER TABLE `tbl_venue_price`
  ADD CONSTRAINT `fk_venue_price_venue` FOREIGN KEY (`venue_id`) REFERENCES `tbl_venue` (`venue_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_wedding_details`
--
ALTER TABLE `tbl_wedding_details`
  ADD CONSTRAINT `fk_wedding_details_event` FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
