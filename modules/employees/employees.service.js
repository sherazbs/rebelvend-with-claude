const { getPool } = require('../shared/db');

// ── Employees ───────────────────────────────────────────────────────────────

async function createEmployee(empData, payrollData, rtwData, role) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    const [empResult] = await conn.execute(
      `INSERT INTO employees
         (full_name, date_of_birth, email, phone,
          address_line1, address_line2, city, postcode,
          job_title, start_date, employment_type, contracted_hours_per_week,
          emergency_contact_name, emergency_contact_phone)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        empData.full_name,
        empData.date_of_birth || null,
        empData.email,
        empData.phone || null,
        empData.address_line1 || null,
        empData.address_line2 || null,
        empData.city || null,
        empData.postcode || null,
        empData.job_title || null,
        empData.start_date || null,
        empData.employment_type || 'FULL_TIME',
        empData.contracted_hours_per_week || null,
        empData.emergency_contact_name || null,
        empData.emergency_contact_phone || null,
      ],
    );
    const employeeId = empResult.insertId;

    await conn.execute(
      `INSERT INTO employee_payroll
         (employee_id, national_insurance_number, tax_code, payroll_id,
          pay_type, pay_rate, pay_frequency)
       VALUES (?,?,?,?,?,?,?)`,
      [
        employeeId,
        payrollData.national_insurance_number || null,
        payrollData.tax_code || null,
        payrollData.payroll_id || null,
        payrollData.pay_type || 'HOURLY',
        payrollData.pay_rate || null,
        payrollData.pay_frequency || 'MONTHLY',
      ],
    );

    await conn.execute(
      `INSERT INTO employee_right_to_work
         (employee_id, checked_date, check_method, rt_work_type, visa_expiry_date)
       VALUES (?,?,?,?,?)`,
      [
        employeeId,
        rtwData.checked_date || null,
        rtwData.check_method || null,
        rtwData.rt_work_type || null,
        rtwData.visa_expiry_date || null,
      ],
    );

    const [userResult] = await conn.execute(
      `INSERT INTO users (employee_id, email, password_hash, role, is_enabled)
       VALUES (?, ?, NULL, ?, TRUE)`,
      [employeeId, empData.email, role || 'EMPLOYEE'],
    );

    await conn.commit();
    return { employeeId, userId: userResult.insertId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getAllEmployees() {
  const [rows] = await getPool().execute(
    `SELECT e.*,
            p.national_insurance_number, p.tax_code, p.payroll_id,
            p.pay_type, p.pay_rate, p.pay_frequency,
            r.checked_date AS rtw_checked_date, r.check_method,
            r.rt_work_type, r.visa_expiry_date,
            u.id AS user_id, u.role, u.is_enabled,
            u.password_hash IS NOT NULL AS has_password
     FROM employees e
     LEFT JOIN employee_payroll p ON e.id = p.employee_id
     LEFT JOIN employee_right_to_work r ON e.id = r.employee_id
     LEFT JOIN users u ON e.id = u.employee_id
     ORDER BY e.full_name`,
  );
  return rows;
}

async function getEmployeeById(id) {
  const [rows] = await getPool().execute(
    `SELECT e.*,
            p.national_insurance_number, p.tax_code, p.payroll_id,
            p.pay_type, p.pay_rate, p.pay_frequency,
            r.checked_date AS rtw_checked_date, r.check_method,
            r.rt_work_type, r.visa_expiry_date,
            u.id AS user_id, u.role, u.is_enabled
     FROM employees e
     LEFT JOIN employee_payroll p ON e.id = p.employee_id
     LEFT JOIN employee_right_to_work r ON e.id = r.employee_id
     LEFT JOIN users u ON e.id = u.employee_id
     WHERE e.id = ?`,
    [id],
  );
  return rows[0] || null;
}

async function updateEmployee(id, empData, payrollData, rtwData) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE employees SET
         full_name=?, date_of_birth=?, email=?, phone=?,
         address_line1=?, address_line2=?, city=?, postcode=?,
         job_title=?, start_date=?, employment_type=?, contracted_hours_per_week=?,
         emergency_contact_name=?, emergency_contact_phone=?
       WHERE id=?`,
      [
        empData.full_name,
        empData.date_of_birth || null,
        empData.email,
        empData.phone || null,
        empData.address_line1 || null,
        empData.address_line2 || null,
        empData.city || null,
        empData.postcode || null,
        empData.job_title || null,
        empData.start_date || null,
        empData.employment_type || 'FULL_TIME',
        empData.contracted_hours_per_week || null,
        empData.emergency_contact_name || null,
        empData.emergency_contact_phone || null,
        id,
      ],
    );

    await conn.execute(
      `UPDATE employee_payroll SET
         national_insurance_number=?, tax_code=?, payroll_id=?,
         pay_type=?, pay_rate=?, pay_frequency=?
       WHERE employee_id=?`,
      [
        payrollData.national_insurance_number || null,
        payrollData.tax_code || null,
        payrollData.payroll_id || null,
        payrollData.pay_type || 'HOURLY',
        payrollData.pay_rate || null,
        payrollData.pay_frequency || 'MONTHLY',
        id,
      ],
    );

    await conn.execute(
      `UPDATE employee_right_to_work SET
         checked_date=?, check_method=?, rt_work_type=?, visa_expiry_date=?
       WHERE employee_id=?`,
      [
        rtwData.checked_date || null,
        rtwData.check_method || null,
        rtwData.rt_work_type || null,
        rtwData.visa_expiry_date || null,
        id,
      ],
    );

    await conn.execute(`UPDATE users SET email=? WHERE employee_id=?`, [
      empData.email,
      id,
    ]);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deactivateEmployee(id) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(`UPDATE employees SET is_active=FALSE WHERE id=?`, [id]);
    await conn.execute(`UPDATE users SET is_enabled=FALSE WHERE employee_id=?`, [id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getActiveEmployees() {
  const [rows] = await getPool().execute(
    `SELECT id, full_name FROM employees WHERE is_active=TRUE ORDER BY full_name`,
  );
  return rows;
}

// ── Users ───────────────────────────────────────────────────────────────────

async function findUserByEmail(email) {
  const [rows] = await getPool().execute(
    `SELECT u.*, e.full_name, e.is_active
     FROM users u
     JOIN employees e ON u.employee_id = e.id
     WHERE u.email = ?`,
    [email],
  );
  return rows[0] || null;
}

async function findUserById(id) {
  const [rows] = await getPool().execute(
    `SELECT u.*, e.full_name, e.is_active
     FROM users u
     JOIN employees e ON u.employee_id = e.id
     WHERE u.id = ?`,
    [id],
  );
  return rows[0] || null;
}

async function updatePassword(userId, hash) {
  await getPool().execute(`UPDATE users SET password_hash=? WHERE id=?`, [hash, userId]);
}

async function updateLastLogin(userId) {
  await getPool().execute(`UPDATE users SET last_login_at=NOW() WHERE id=?`, [userId]);
}

// ── Invites ─────────────────────────────────────────────────────────────────

async function createInvite(userId, tokenHash, expiresAt) {
  const [result] = await getPool().execute(
    `INSERT INTO user_invites (user_id, token_hash, expires_at) VALUES (?,?,?)`,
    [userId, tokenHash, expiresAt],
  );
  return result.insertId;
}

async function findValidInvite(tokenHash) {
  const [rows] = await getPool().execute(
    `SELECT i.*, u.email, u.employee_id
     FROM user_invites i
     JOIN users u ON i.user_id = u.id
     WHERE i.token_hash = ? AND i.used_at IS NULL AND i.expires_at > NOW()`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function markInviteUsed(inviteId) {
  await getPool().execute(`UPDATE user_invites SET used_at=NOW() WHERE id=?`, [inviteId]);
}

module.exports = {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deactivateEmployee,
  getActiveEmployees,
  findUserByEmail,
  findUserById,
  updatePassword,
  updateLastLogin,
  createInvite,
  findValidInvite,
  markInviteUsed,
};
