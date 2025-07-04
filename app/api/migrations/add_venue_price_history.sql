-- Create table for venue price history
CREATE TABLE IF NOT EXISTS `tbl_venue_price_history` (
  `history_id` int(11) NOT NULL AUTO_INCREMENT,
  `venue_id` int(11) NOT NULL,
  `old_price` decimal(10,2) NOT NULL,
  `new_price` decimal(10,2) NOT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `effective_from` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`history_id`),
  KEY `venue_id` (`venue_id`),
  CONSTRAINT `fk_venue_price_history_venue` FOREIGN KEY (`venue_id`) REFERENCES `tbl_venue` (`venue_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create table to track which events are using which venue price version
CREATE TABLE IF NOT EXISTS `tbl_event_venue_price_lock` (
  `lock_id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `venue_id` int(11) NOT NULL,
  `locked_price` decimal(10,2) NOT NULL,
  `locked_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`lock_id`),
  UNIQUE KEY `unique_event_venue` (`event_id`, `venue_id`),
  KEY `venue_id` (`venue_id`),
  CONSTRAINT `fk_event_venue_price_lock_event` FOREIGN KEY (`event_id`) REFERENCES `tbl_events` (`event_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_event_venue_price_lock_venue` FOREIGN KEY (`venue_id`) REFERENCES `tbl_venue` (`venue_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
