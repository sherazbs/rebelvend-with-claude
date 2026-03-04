-- Rebelvend Staff Attendance Schema
-- Run against your MySQL database to create all required tables.

CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    postcode VARCHAR(20),
    job_title VARCHAR(100),
    start_date DATE,
    employment_type ENUM('FULL_TIME','PART_TIME','CONTRACTOR') NOT NULL DEFAULT 'FULL_TIME',
    contracted_hours_per_week DECIMAL(5,2),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_payroll (
    employee_id INT PRIMARY KEY,
    national_insurance_number VARCHAR(20),
    tax_code VARCHAR(20),
    payroll_id VARCHAR(50),
    pay_type ENUM('SALARY','HOURLY') NOT NULL DEFAULT 'HOURLY',
    pay_rate DECIMAL(10,2),
    pay_frequency ENUM('WEEKLY','MONTHLY','FOUR_WEEKLY') NOT NULL DEFAULT 'MONTHLY',
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_right_to_work (
    employee_id INT PRIMARY KEY,
    checked_date DATE,
    check_method ENUM('ONLINE_SHARE_CODE','MANUAL_DOCS'),
    rt_work_type VARCHAR(100),
    visa_expiry_date DATE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    role ENUM('ADMIN','EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_invites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS work_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    work_date DATE NOT NULL,
    clock_in TIMESTAMP NOT NULL,
    clock_out TIMESTAMP NULL,
    break_minutes INT NOT NULL DEFAULT 0,
    worked_minutes INT NULL,
    status ENUM('OPEN','CLOSED','VOID') NOT NULL DEFAULT 'OPEN',
    note TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS work_session_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_session_id INT NOT NULL,
    employee_id INT NOT NULL,
    event_type ENUM('CLOCK_IN','CLOCK_OUT','EDIT','VOID') NOT NULL,
    event_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    performed_by INT,
    FOREIGN KEY (work_session_id) REFERENCES work_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Seed: create the first admin manually after running the schema.
-- Replace the values below with real data and a bcrypt hash of the password.
--
-- INSERT INTO employees (full_name, email, job_title, employment_type)
--   VALUES ('Admin User', 'admin@rebelvend.net', 'Administrator', 'FULL_TIME');
--
-- INSERT INTO employee_payroll (employee_id) VALUES (LAST_INSERT_ID());
-- INSERT INTO employee_right_to_work (employee_id) VALUES (LAST_INSERT_ID());
--
-- INSERT INTO users (employee_id, email, password_hash, role, is_enabled)
--   VALUES (LAST_INSERT_ID(), 'admin@rebelvend.net',
--           '$2a$12$...hash...', 'ADMIN', TRUE);
