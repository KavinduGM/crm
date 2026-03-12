-- Phase 2 Migration: Spam Protection + Lead Scoring + AI Analysis
USE crm_db;

-- =============================================
-- ALTER LEADS TABLE — add Phase 2 columns
-- =============================================
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS status ENUM('pending', 'qualified', 'sales_pitch', 'spam') DEFAULT 'qualified',
  ADD COLUMN IF NOT EXISTS priority ENUM('high', 'medium', 'low') DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS ai_analysis JSON COMMENT '{intent, service, urgency, budget_signal, location, summary, conversion_probability, estimated_value}',
  ADD COLUMN IF NOT EXISTS pipeline_log JSON COMMENT 'Array of {layer, result, reason, score} objects',
  ADD COLUMN IF NOT EXISTS spam_score INT DEFAULT 0;

-- Add indexes for the new columns
ALTER TABLE leads
  ADD INDEX IF NOT EXISTS idx_status (status),
  ADD INDEX IF NOT EXISTS idx_priority (priority);

-- =============================================
-- SPAM LEADS TABLE — completely separate from CRM leads
-- =============================================
CREATE TABLE IF NOT EXISTS spam_leads (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  business_id INT UNSIGNED NOT NULL,
  form_id INT UNSIGNED,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  message TEXT,
  answers JSON,
  spam_score INT DEFAULT 0,
  spam_reasons JSON COMMENT 'Array of reason strings',
  submission_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source_url VARCHAR(1000),
  ip_address VARCHAR(50),
  is_reviewed BOOLEAN DEFAULT FALSE,
  marked_not_spam BOOLEAN DEFAULT FALSE,
  raw_payload JSON COMMENT 'Full original submission payload',
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_business_id (business_id),
  INDEX idx_submission_time (submission_time),
  INDEX idx_email (email)
);

-- =============================================
-- SPAM LOGS TABLE — bot/bot-protection attempt logs
-- =============================================
CREATE TABLE IF NOT EXISTS spam_logs (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  ip_address VARCHAR(50),
  form_id INT UNSIGNED,
  business_id INT UNSIGNED,
  reason ENUM('honeypot', 'captcha_fail', 'rate_limit', 'bot_behavior', 'session_expired', 'timeout') NOT NULL,
  payload JSON,
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip (ip_address),
  INDEX idx_created_at (created_at)
);

-- =============================================
-- DOMAIN WHITELIST TABLE — for "mark not spam" learning
-- =============================================
CREATE TABLE IF NOT EXISTS domain_whitelist (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  business_id INT UNSIGNED NOT NULL,
  domain VARCHAR(255) NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_business_domain (business_id, domain)
);

-- =============================================
-- CAPTCHA SESSIONS TABLE — server-side captcha storage
-- =============================================
CREATE TABLE IF NOT EXISTS captcha_sessions (
  id VARCHAR(64) PRIMARY KEY,
  question_id INT NOT NULL,
  correct_answer VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE
);
