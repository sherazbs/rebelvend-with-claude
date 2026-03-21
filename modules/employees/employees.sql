-- Rebelvend Employees & Users Schema

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
