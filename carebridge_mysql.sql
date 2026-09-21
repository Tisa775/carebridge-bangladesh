-- ==============================================================================
-- CareBridge Bangladesh – MySQL Database Initialization & Seed Script
-- Database Name: carebridge
-- Target: MySQL 5.7+ / MySQL 8.0+ / MariaDB 10.3+
-- Encoding: UTF-8 Unicode (utf8mb4)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `carebridge` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `carebridge`;

-- ------------------------------------------------------------------------------
-- Table structure for `users`
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `volunteers`;
DROP TABLE IF EXISTS `cases`;
DROP TABLE IF EXISTS `ngos`;
DROP TABLE IF EXISTS `alerts`;
DROP TABLE IF EXISTS `activity_log`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(200) NOT NULL,
  `hashed_password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(100) DEFAULT 'Field Volunteer',
  `avatar` VARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  `phone` VARCHAR(30) DEFAULT NULL,
  `organization` VARCHAR(200) DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `ix_users_id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table structure for `ngos`
-- ------------------------------------------------------------------------------
CREATE TABLE `ngos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `bureau_id` VARCHAR(50) DEFAULT NULL,
  `coverage_area` VARCHAR(200) DEFAULT NULL,
  `capacity` VARCHAR(100) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `verified_status` VARCHAR(20) DEFAULT 'Pending',
  `rating` FLOAT DEFAULT 0.0,
  `active_cases` INT DEFAULT 0,
  `cases_handled` INT DEFAULT 0,
  `logo_color` VARCHAR(20) DEFAULT '#059669',
  `initials` VARCHAR(5) DEFAULT NULL,
  `is_trusted` TINYINT(1) DEFAULT 0,
  `contact_email` VARCHAR(200) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ngos_name` (`name`),
  KEY `ix_ngos_id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table structure for `cases`
-- ------------------------------------------------------------------------------
CREATE TABLE `cases` (
  `id` VARCHAR(20) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `icon` VARCHAR(50) DEFAULT 'fa-circle-dot',
  `location` VARCHAR(200) NOT NULL,
  `priority` VARCHAR(20) DEFAULT 'Medium',
  `priority_class` VARCHAR(30) DEFAULT 'urgency-med',
  `status` VARCHAR(30) DEFAULT 'Pending',
  `status_class` VARCHAR(30) DEFAULT 'status-pending',
  `confidence` VARCHAR(10) DEFAULT '85%',
  `description` TEXT DEFAULT NULL,
  `reporter` VARCHAR(150) DEFAULT NULL,
  `contact` VARCHAR(50) DEFAULT NULL,
  `assigned_ngo` VARCHAR(150) DEFAULT NULL,
  `lat` FLOAT DEFAULT NULL,
  `lng` FLOAT DEFAULT NULL,
  `distance` VARCHAR(30) DEFAULT NULL,
  `photo` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_cases_id` (`id`),
  KEY `ix_cases_status` (`status`),
  KEY `ix_cases_priority` (`priority`),
  KEY `ix_cases_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table structure for `volunteers`
-- ------------------------------------------------------------------------------
CREATE TABLE `volunteers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `skills` VARCHAR(500) DEFAULT NULL,
  `location` VARCHAR(150) DEFAULT NULL,
  `status` VARCHAR(30) DEFAULT 'Active',
  `completed_missions` INT DEFAULT 0,
  `ngo_id` INT DEFAULT NULL,
  `avatar` VARCHAR(500) DEFAULT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `lat` FLOAT DEFAULT NULL,
  `lng` FLOAT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_volunteers_id` (`id`),
  CONSTRAINT `fk_volunteers_ngo` FOREIGN KEY (`ngo_id`) REFERENCES `ngos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table structure for `alerts`
-- ------------------------------------------------------------------------------
CREATE TABLE `alerts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(300) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `severity` VARCHAR(20) DEFAULT 'Medium',
  `source` VARCHAR(150) DEFAULT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `related_case_id` VARCHAR(20) DEFAULT NULL,
  `alert_type` VARCHAR(30) DEFAULT 'general',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_alerts_id` (`id`),
  KEY `ix_alerts_is_read` (`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table structure for `messages`
-- ------------------------------------------------------------------------------
CREATE TABLE `messages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `sender_id` INT NOT NULL,
  `receiver_id` INT NOT NULL,
  `content` TEXT NOT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_messages_id` (`id`),
  KEY `ix_messages_sender` (`sender_id`),
  KEY `ix_messages_receiver` (`receiver_id`),
  CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_messages_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table structure for `activity_log`
-- ------------------------------------------------------------------------------
CREATE TABLE `activity_log` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `type` VARCHAR(30) NOT NULL,
  `icon` VARCHAR(30) DEFAULT 'plus',
  `color` VARCHAR(20) DEFAULT 'green',
  `title` VARCHAR(300) NOT NULL,
  `subtitle` VARCHAR(300) DEFAULT NULL,
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_activity_log_id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- SEED DATA INSERTION
-- ==============================================================================

-- 1. Users
INSERT INTO `users` (`id`, `name`, `email`, `hashed_password`, `role`, `avatar`, `phone`, `organization`, `is_active`) VALUES
(1, 'Argho Saha', 'argho@carebridge.org', '$2b$12$e8iVw6wWbO1nS0x4wZ9tReCq3U2k1L8m7p6o5n4m3l2k1j0i9h8g7', 'Super Admin / Emergency Coordinator', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', '+880-1712-000001', 'CareBridge HQ Dhaka', 1),
(2, 'Dr. Farzana Rahman', 'farzana@carebridge.org', '$2b$12$e8iVw6wWbO1nS0x4wZ9tReCq3U2k1L8m7p6o5n4m3l2k1j0i9h8g7', 'Medical Dispatch Lead', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', '+880-1819-987654', 'Emergency Triage', 1),
(3, 'Rahim Khan', 'rahim@carebridge.org', '$2b$12$e8iVw6wWbO1nS0x4wZ9tReCq3U2k1L8m7p6o5n4m3l2k1j0i9h8g7', 'Field Volunteer Unit Lead', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', '+880-1712-345678', 'Volunteer Unit 1', 1),
(4, 'Nusrat Jahan', 'nusrat@carebridge.org', '$2b$12$e8iVw6wWbO1nS0x4wZ9tReCq3U2k1L8m7p6o5n4m3l2k1j0i9h8g7', 'Child Welfare Coordinator', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', '+880-1911-223344', 'Dhanmondi Child Unit', 1);

-- 2. NGOs
INSERT INTO `ngos` (`id`, `name`, `bureau_id`, `coverage_area`, `capacity`, `description`, `verified_status`, `rating`, `active_cases`, `cases_handled`, `logo_color`, `initials`, `is_trusted`, `contact_email`) VALUES
(1, 'Asha Foundation', 'NGOAB-7701', 'Mirpur, Dhanmondi, Dhaka North', '80 bed capacity, 4 shelters', 'Operating 4 emergency shelters in Mirpur and Dhanmondi with 80 bed capacity.', 'Verified', 4.8, 14, 342, '#059669', 'AF', 1, 'info@ashafoundation.org'),
(2, 'BRAC Humanitarian', 'NGOAB-0021', 'Nationwide', 'Nationwide rapid response', 'Rapid response crisis teams, maternal health aid, and urban food distribution.', 'Verified', 4.7, 38, 298, '#ec4899', 'BR', 1, 'emergency@brac.net'),
(3, 'Proshika Aid', 'NGOAB-3345', 'Dhaka, Rajshahi, Khulna', 'Disability rehab & flood relief', 'Specialized in disability rehabilitation, mobility gear assistance, and flood relief.', 'Verified', 4.6, 9, 186, '#8b5cf6', 'PR', 1, 'info@proshika.org'),
(4, 'Friendship NGO', 'NGOAB-8812', 'Riverine & Coastal Bangladesh', '45 rescue boats, mobile hospitals', 'Riverine and coastal rescue operations with mobile hospital boat network.', 'Verified', 4.5, 12, 164, '#3b82f6', 'FR', 1, 'rescue@friendship.ngo'),
(5, 'Dhaka Relief Squad', 'NGOAB-9921', 'Dhaka North', '120 Volunteers', 'Urban emergency response and temporary shelter management.', 'Pending', 0.0, 0, 0, '#f59e0b', 'DR', 0, 'contact@dhakarelief.org'),
(6, 'Chittagong Flood Rescue', 'NGOAB-8412', 'Chittagong Hill Tracts', '45 Rescue Boats', 'Specialized riverine flood rescue and evacuation in Chittagong region.', 'Pending', 0.0, 0, 0, '#06b6d4', 'CF', 0, 'ops@chittagongflood.org');

-- 3. Cases
INSERT INTO `cases` (`id`, `category`, `icon`, `location`, `priority`, `priority_class`, `status`, `status_class`, `confidence`, `description`, `reporter`, `contact`, `assigned_ngo`, `lat`, `lng`, `distance`, `photo`) VALUES
('CB-12482', 'Child', 'fa-child', 'Mirpur-10, Dhaka', 'High', 'urgency-high', 'In Progress', 'status-in-progress', '92%', 'Unaccompanied minor found near Mirpur-10 roundabout looking for parents. Immediate protective shelter needed.', 'Tariqul Islam (Local Volunteer)', '+880 1712-345678', 'Asha Foundation', 23.8067, 90.3687, '1.8 km away', 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150&auto=format&fit=crop&q=80'),
('CB-12481', 'Elderly', 'fa-person-cane', 'Kathalbagan, Dhaka', 'Medium', 'urgency-med', 'Assigned', 'status-assigned', '87%', 'Elderly man suffering from mild dehydration without shelter near Green Road intersection.', 'Dr. Farzana Rahman', '+880 1819-987654', 'BRAC Humanitarian', 23.7510, 90.3900, '3.2 km away', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80'),
('CB-12480', 'Disability', 'fa-wheelchair', 'Mohammadpur, Dhaka', 'Low', 'urgency-low', 'In Progress', 'status-in-progress', '76%', 'Wheelchair breakdown and mobility support needed on Ring Road. Requires assistance getting to safe clinic.', 'Kamal Hossain', '+880 1911-223344', 'Proshika Aid', 23.7658, 90.3584, '4.5 km away', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'),
('CB-12479', 'Homeless', 'fa-house-chimney-crack', 'Motijheel, Dhaka', 'Medium', 'urgency-med', 'Pending', 'status-pending', '81%', 'Family of 4 evicted and needs emergency shelter. Children involved.', 'Community Watch', '+880 1600-000000', NULL, 23.7330, 90.4172, '6.1 km away', NULL),
('CB-12478', 'Child', 'fa-child', 'Uttara, Dhaka', 'High', 'urgency-high', 'Assigned', 'status-assigned', '90%', 'Two children (ages 5 and 8) found wandering near Uttara Sector 7 park without guardians.', 'Uttara Volunteer Unit', '+880 1777-445566', 'Asha Foundation', 23.8759, 90.3795, '8.4 km away', NULL),
('CB-12477', 'Elderly', 'fa-person-cane', 'Badda, Dhaka', 'High', 'urgency-high', 'In Progress', 'status-in-progress', '94%', '75-year-old woman with cardiac condition needs immediate transport to Dhaka Medical College.', 'Badda Health Post', '+880 1733-667788', 'BRAC Humanitarian', 23.7806, 90.4267, '5.2 km away', NULL),
('CB-12476', 'Medical', 'fa-heart-pulse', 'Old Dhaka, Lalbagh', 'High', 'urgency-high', 'Resolved', 'status-resolved', '96%', 'Mass heat exhaustion incident at Lalbagh Fort area. 8 persons treated on site.', 'Civil Defense Unit 4', '+880 1800-000000', 'BRAC Humanitarian', 23.7193, 90.3880, '11.2 km away', NULL);

-- 4. Volunteers
INSERT INTO `volunteers` (`id`, `name`, `skills`, `location`, `status`, `completed_missions`, `ngo_id`, `avatar`, `phone`, `lat`, `lng`) VALUES
(1, 'Mr. Rahim Khan', 'First Aid, EMT, Bengali/English, Vehicle Operation', 'Mirpur-10', 'Active', 47, 1, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', '+880 1712-345678', 23.7950, 90.3550),
(2, 'Nusrat Jahan', 'Child Counseling, Child Welfare, Bengali/English', 'Dhanmondi', 'Active', 31, 1, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', '+880 1911-223344', 23.7465, 90.3760),
(3, 'Tanvir Ahmed', 'Search & Rescue, Vehicle Dispatch, Heavy Lifting', 'Uttara', 'In Transit', 59, 2, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', '+880 1777-445566', 23.8759, 90.3795),
(4, 'Farhana Yasmin', 'Nursing, Elderly Care, First Aid', 'Uttara Hub', 'Active', 24, 3, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', '+880 1600-112233', 23.8650, 90.3950);

-- 5. Alerts
INSERT INTO `alerts` (`id`, `title`, `description`, `severity`, `source`, `is_read`, `related_case_id`, `alert_type`) VALUES
(1, '🚨 Critical Flood Evacuation Alert - Dhanmondi', '12 senior citizens stranded near lakeside ground floor residence due to sudden water level rise.', 'Critical', 'Civil Defense & BRAC', 0, 'CB-12481', 'sos'),
(2, '👶 Unaccompanied Minor - Mirpur-10 Roundabout', 'Volunteer Rahim Khan on scene. Safe escort and guardian identification in progress.', 'High', 'Volunteer Unit 1', 0, 'CB-12482', 'general'),
(3, '🏢 Partner NGO Onboarded - Dhaka Relief Squad', 'Registration verified by NGO Affairs Bureau. 120 volunteer capacity added to north sector.', 'Low', 'NGO Verification Portal', 0, NULL, 'verified'),
(4, '🏥 Volunteer Dispatch - CB-12482', 'Rahim Khan accepted case CB-12482 at Mirpur-10. En route.', 'Medium', 'Command HQ', 1, 'CB-12482', 'general'),
(5, '📊 Weekly AI Report Ready', 'AI generated week 35 crisis response summary. Download PDF available.', 'Low', 'CareBridge AI Engine', 1, NULL, 'general');

-- 6. Messages
INSERT INTO `messages` (`id`, `sender_id`, `receiver_id`, `content`, `is_read`, `timestamp`) VALUES
(1, 3, 1, 'Arrived at Mirpur-10 intersection. Found the child, contacting Asha Shelter team now.', 1, NOW() - INTERVAL 78 MINUTE),
(2, 1, 3, 'Great job Rahim. Asha Shelter van is 3 minutes away from your location. Stay with the minor.', 1, NOW() - INTERVAL 76 MINUTE),
(3, 3, 1, 'Child is safe and secure. Shelter van has arrived. Transferring now.', 1, NOW() - INTERVAL 70 MINUTE),
(4, 2, 1, 'Dehydration IV fluids prepped for elderly at Kathalbagan. Need transport confirmation.', 0, NOW() - INTERVAL 14 MINUTE),
(5, 1, 2, 'Transport confirmed. BRAC van ETA 8 minutes to your location.', 1, NOW() - INTERVAL 12 MINUTE);

-- 7. Activity Log
INSERT INTO `activity_log` (`id`, `type`, `icon`, `color`, `title`, `subtitle`, `timestamp`) VALUES
(1, 'report', 'plus', 'red', 'New case reported', 'Mirpur-10, Dhaka', NOW() - INTERVAL 2 MINUTE),
(2, 'ngo', 'check', 'green', 'NGO accepted the case', 'Asha Foundation', NOW() - INTERVAL 4 MINUTE),
(3, 'volunteer', 'user', 'blue', 'Volunteer assigned', 'Mr. Rahim Khan', NOW() - INTERVAL 6 MINUTE),
(4, 'rescue', 'crosshair', 'orange', 'Rescue in progress', 'Dhanmondi, Dhaka', NOW() - INTERVAL 12 MINUTE),
(5, 'resolved', 'check', 'green', 'Case resolved', 'Mohammadpur, Dhaka', NOW() - INTERVAL 25 MINUTE),
(6, 'ngo', 'check', 'green', 'New NGO partner onboarded', 'Dhaka Relief Squad verified', NOW() - INTERVAL 15 MINUTE),
(7, 'volunteer', 'user', 'blue', 'Food ration delivered', 'Mohammadpur Relief Post', NOW() - INTERVAL 30 MINUTE);
