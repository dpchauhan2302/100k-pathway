-- 100K PATHWAY DATABASE SCHEMA
-- PostgreSQL/MySQL Compatible

-- ==================== AUDIT & OBSERVABILITY TABLES ====================
-- These MUST be created first for system integrity

-- Audit log for all critical operations
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100),
    user_id INT,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    metadata JSON,
    request_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_transaction (transaction_id),
    INDEX idx_audit_timestamp (timestamp),
    INDEX idx_audit_request (request_id)
);

-- Idempotency key storage
CREATE TABLE idempotency_keys (
    id SERIAL PRIMARY KEY,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    request_path VARCHAR(500) NOT NULL,
    request_method VARCHAR(10) NOT NULL,
    response_status INT,
    response_body JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 24 HOUR),
    INDEX idx_idem_key (idempotency_key),
    INDEX idx_idem_expires (expires_at)
);

-- Request metrics for monitoring
CREATE TABLE request_metrics (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(100) NOT NULL,
    endpoint VARCHAR(500),
    method VARCHAR(10),
    status_code INT,
    duration_ms INT,
    user_id INT,
    ip_address VARCHAR(45),
    error_code VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_metrics_endpoint (endpoint),
    INDEX idx_metrics_timestamp (timestamp),
    INDEX idx_metrics_status (status_code)
);

-- Job queue for async processing
CREATE TABLE job_queue (
    id VARCHAR(100) PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL,
    payload JSON NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    priority INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    retry_count INT DEFAULT 0,
    scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    last_error TEXT,
    last_error_at TIMESTAMP,
    result JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_job_status (status),
    INDEX idx_job_scheduled (scheduled_for),
    INDEX idx_job_type (job_type),
    INDEX idx_job_priority (priority)
);

-- Dead letter queue for failed jobs
CREATE TABLE dead_letter_queue (
    id SERIAL PRIMARY KEY,
    original_job_id VARCHAR(100),
    job_type VARCHAR(50),
    payload JSON,
    reason TEXT,
    retry_count INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dlq_job_id (original_job_id),
    INDEX idx_dlq_type (job_type)
);

-- ==================== CORE BUSINESS TABLES ====================

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    plan_type VARCHAR(50),
    program_start_date DATE,
    program_day INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    stripe_customer_id VARCHAR(255),
    referral_code VARCHAR(50) UNIQUE,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_verification_token (email_verification_token),
    INDEX idx_reset_token (password_reset_token)
);

-- Applications Table
CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    current_status VARCHAR(100),
    target_role VARCHAR(100),
    motivation TEXT,
    preferred_plan VARCHAR(50),
    application_status VARCHAR(50) DEFAULT 'pending',
    reviewed_by INT REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (application_status)
);

-- Transactions Table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- 'program_fee', 'success_fee'
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    stripe_payment_intent_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_type (type)
);

-- Program Progress Table
CREATE TABLE program_progress (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    phase INT NOT NULL, -- 1-5
    phase_status VARCHAR(50) DEFAULT 'not_started',
    progress_percentage INT DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    deliverables JSONB,
    INDEX idx_user_phase (user_id, phase)
);

-- Projects Table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    tech_stack TEXT[],
    github_url VARCHAR(500),
    demo_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'in_progress',
    mentor_review_score INT,
    mentor_feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    INDEX idx_user (user_id)
);

-- Interviews Table
CREATE TABLE interviews (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    company_name VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    interview_date TIMESTAMP,
    interview_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'scheduled',
    outcome VARCHAR(50),
    salary_offered DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_status (status)
);

-- Mentorship Sessions Table
CREATE TABLE mentorship_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    mentor_id INT REFERENCES users(id),
    session_date TIMESTAMP NOT NULL,
    duration_minutes INT DEFAULT 60,
    session_type VARCHAR(100),
    notes TEXT,
    recording_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_mentor (mentor_id)
);

-- Tasks Table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(50) DEFAULT 'normal',
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    phase INT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_status (user_id, status)
);

-- Success Placements Table
CREATE TABLE success_placements (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    company_name VARCHAR(255) NOT NULL,
    position_title VARCHAR(255) NOT NULL,
    base_salary DECIMAL(10, 2) NOT NULL,
    total_compensation DECIMAL(10, 2),
    start_date DATE,
    success_fee_percentage DECIMAL(5, 2),
    success_fee_amount DECIMAL(10, 2),
    success_fee_paid BOOLEAN DEFAULT FALSE,
    success_fee_paid_date DATE,
    employment_verified BOOLEAN DEFAULT FALSE,
    verification_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id)
);

-- Analytics Events Table
CREATE TABLE analytics_events (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
);

-- Email Logs Table
CREATE TABLE email_logs (
    id SERIAL PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    subject VARCHAR(500),
    status VARCHAR(50) DEFAULT 'sent',
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_recipient (recipient_email)
);

-- System Settings Table
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Settings
INSERT INTO system_settings (key, value, description) VALUES
('cohort_intake_open', 'true', 'Whether new applications are being accepted'),
('max_cohort_size', '50', 'Maximum users per cohort'),
('program_duration_days', '100', 'Standard program duration'),
('success_fee_accelerator', '15.0', 'Success fee percentage for Accelerator plan'),
('success_fee_professional', '12.0', 'Success fee percentage for Professional plan'),
('success_fee_elite', '10.0', 'Success fee percentage for Elite plan');

-- ==================== PARTICIPATION TRACKING TABLES ====================

-- Mentorship sessions tracking (for refund participation requirements)
CREATE TABLE mentorship_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    session_type VARCHAR(50) NOT NULL,
    scheduled_date TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled',
    duration_minutes INT,
    mentor_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sessions_user ON mentorship_sessions(user_id);
CREATE INDEX idx_sessions_status ON mentorship_sessions(status);

-- Interview opportunities tracking
CREATE TABLE interview_opportunities (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    interview_type VARCHAR(50),
    scheduled_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'scheduled',
    user_declined BOOLEAN DEFAULT FALSE,
    decline_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_interviews_user ON interview_opportunities(user_id);
CREATE INDEX idx_interviews_declined ON interview_opportunities(user_declined);

-- Success fee agreements
CREATE TABLE success_fee_agreements (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    plan_type VARCHAR(20) NOT NULL,
    fee_percentage DECIMAL(5,4) NOT NULL,
    agreement_sent_date TIMESTAMP,
    agreement_signed_date TIMESTAMP,
    agreement_status VARCHAR(20) DEFAULT 'pending',
    signature_ip VARCHAR(45),
    agreement_pdf_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_success_agreements_user ON success_fee_agreements(user_id);

-- Success fee invoices
CREATE TABLE success_fee_invoices (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    agreement_id INT NOT NULL,
    offer_amount DECIMAL(10,2) NOT NULL,
    fee_amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_date TIMESTAMP,
    stripe_invoice_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_success_invoices_user ON success_fee_invoices(user_id);
CREATE INDEX idx_success_invoices_status ON success_fee_invoices(payment_status);

-- Email confirmation tracking (for contract flow)
CREATE TABLE email_confirmations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    email_type VARCHAR(50) NOT NULL,
    sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmation_required BOOLEAN DEFAULT FALSE,
    confirmed_date TIMESTAMP,
    confirmation_token VARCHAR(255) UNIQUE,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_email_conf_user ON email_confirmations(user_id);
CREATE INDEX idx_email_conf_token ON email_confirmations(confirmation_token);
