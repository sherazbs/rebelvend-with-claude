-- Rebelvend Attendance Schema
-- Depends on employees.sql (employees and users tables)

CREATE TABLE IF NOT EXISTS work_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    work_date DATE NOT NULL,
    status ENUM('PRESENT','ABSENT') NOT NULL DEFAULT 'PRESENT',
    note TEXT,
    marked_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_emp_date (employee_id, work_date),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS work_session_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_session_id INT NOT NULL,
    employee_id INT NOT NULL,
    event_type ENUM('MARK_PRESENT','MARK_ABSENT','EDIT') NOT NULL,
    event_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    performed_by INT,
    FOREIGN KEY (work_session_id) REFERENCES work_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);
