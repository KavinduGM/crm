-- AI-Integrated CRM - Phase 1 Database Schema
-- Run this file to initialize the database

CREATE DATABASE IF NOT EXISTS crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE crm_db;

-- =============================================
-- ADMINS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS admins (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- BUSINESSES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS businesses (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  admin_id INT UNSIGNED NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(500),
  industry VARCHAR(100),
  num_employees VARCHAR(50),
  annual_revenue VARCHAR(50),
  -- JSON fields for flexible data
  social_links JSON COMMENT 'Object: {facebook, linkedin, instagram, twitter, youtube, discord, tiktok}',
  paid_platforms JSON COMMENT 'Array: selected ad platforms',
  messaging_apps JSON COMMENT 'Object: {whatsapp, telegram, signal, wechat}',
  notes TEXT,
  logo_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  INDEX idx_admin_id (admin_id),
  INDEX idx_slug (slug)
);

-- =============================================
-- CONTACT FORMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS contact_forms (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  business_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL DEFAULT 'contact-us',
  form_type ENUM('standard', 'ai') NOT NULL DEFAULT 'standard',
  -- Standard form configuration
  fields JSON COMMENT 'Array of field objects for standard forms',
  -- Branding
  branding JSON COMMENT '{primary_color, font, logo_url, description}',
  -- Right panel contact info
  contact_info JSON COMMENT '{email, messaging_apps: {}, social_links: {}}',
  -- AI form configuration
  ai_config JSON COMMENT '{industry, category, services, goal, target_customer, generated_questions}',
  -- Thank you page
  thank_you_message TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_business_slug (business_id, slug),
  INDEX idx_business_id (business_id)
);

-- =============================================
-- LEADS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS leads (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  business_id INT UNSIGNED NOT NULL,
  form_id INT UNSIGNED NOT NULL,
  -- Contact info
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  -- All form answers as JSON
  answers JSON COMMENT 'Array of {question, answer} objects',
  -- Metadata
  submission_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source_url VARCHAR(1000),
  ip_address VARCHAR(50),
  -- For future AI phases
  lead_score INT DEFAULT NULL,
  is_spam BOOLEAN DEFAULT FALSE,
  notes TEXT,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (form_id) REFERENCES contact_forms(id) ON DELETE CASCADE,
  INDEX idx_business_id (business_id),
  INDEX idx_form_id (form_id),
  INDEX idx_submission_time (submission_time),
  INDEX idx_email (email)
);

-- =============================================
-- AI CONVERSATION SESSIONS TABLE
-- For AI-powered forms, store conversation state
-- =============================================
CREATE TABLE IF NOT EXISTS ai_sessions (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  form_id INT UNSIGNED NOT NULL,
  business_id INT UNSIGNED NOT NULL,
  conversation_history JSON COMMENT 'Array of {role, content} messages',
  collected_data JSON COMMENT 'Structured data collected so far',
  status ENUM('active', 'completed', 'abandoned') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (form_id) REFERENCES contact_forms(id) ON DELETE CASCADE,
  INDEX idx_session_token (session_token),
  INDEX idx_form_id (form_id)
);
