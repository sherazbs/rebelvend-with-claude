const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const svc = require('./attendance.service');

// ── Helpers ─────────────────────────────────────────────────────────────────

function flash(req, type, message) {
  req.session.flash = { type, message };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function sendInviteEmail(toEmail, token, hostUrl) {
  const apiKey = process.env.SMTP2GO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL;
  if (!apiKey || !senderEmail) throw new Error('SMTP2GO not configured');

  const link = `${hostUrl}/staff/set-password?token=${token}`;
  const html = `
    <h2>You've been invited to the Rebelvend Staff Portal</h2>
    <p>Click the link below to set your password. This link expires in 48 hours.</p>
    <p><a href="${link}">${link}</a></p>
  `;

  const response = await fetch('https://api.smtp2go.com/v3/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      to: [`<${toEmail}>`],
      sender: senderEmail,
      subject: 'Rebelvend Staff Portal – Set Your Password',
      html_body: html,
      text_body: `Set your password: ${link}\nThis link expires in 48 hours.`,
    }),
  });
  const data = await response.json();
  if (!data.data || data.data.succeeded < 1) {
    console.error('SMTP2GO invite error:', data);
    throw new Error('Failed to send invite email');
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────

exports.showLogin = (req, res) => {
  res.render('staff/login', { error: null });
};

exports.handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.render('staff/login', { error: 'Email and password are required.' });
    }

    const user = await svc.findUserByEmail(email);
    if (!user || !user.password_hash) {
      return res.render('staff/login', { error: 'Invalid credentials.' });
    }
    if (!user.is_enabled || !user.is_active) {
      return res.render('staff/login', { error: 'Account is disabled.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.render('staff/login', { error: 'Invalid credentials.' });
    }

    await svc.updateLastLogin(user.id);

    req.session.user = {
      id: user.id,
      employeeId: user.employee_id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    };

    if (user.role === 'ADMIN') return res.redirect('/staff/admin/employees');
    return res.redirect('/staff/attendance');
  } catch (err) {
    console.error('Login error:', err);
    return res.render('staff/login', { error: 'Something went wrong.' });
  }
};

exports.handleLogout = (req, res) => {
  req.session.destroy(() => res.redirect('/staff/login'));
};

// ── Set Password (invite flow) ──────────────────────────────────────────────

exports.showSetPassword = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('Missing token.');
    const invite = await svc.findValidInvite(hashToken(token));
    if (!invite) return res.render('staff/set-password', { error: 'Invalid or expired link.', token: null });
    return res.render('staff/set-password', { error: null, token });
  } catch (err) {
    console.error('Set-password page error:', err);
    return res.status(500).send('Server error');
  }
};

exports.handleSetPassword = async (req, res) => {
  try {
    const { token, password, confirm_password } = req.body;
    if (!token) return res.status(400).send('Missing token.');
    if (!password || password.length < 8) {
      return res.render('staff/set-password', { error: 'Password must be at least 8 characters.', token });
    }
    if (password !== confirm_password) {
      return res.render('staff/set-password', { error: 'Passwords do not match.', token });
    }

    const invite = await svc.findValidInvite(hashToken(token));
    if (!invite) return res.render('staff/set-password', { error: 'Invalid or expired link.', token: null });

    const hash = await bcrypt.hash(password, 12);
    await svc.updatePassword(invite.user_id, hash);
    await svc.markInviteUsed(invite.id);

    return res.redirect('/staff/login');
  } catch (err) {
    console.error('Set-password error:', err);
    return res.status(500).send('Server error');
  }
};

// ── Employee Attendance ─────────────────────────────────────────────────────

exports.showAttendance = async (req, res) => {
  try {
    const { employeeId } = req.session.user;
    const today = await svc.getTodayAttendance(employeeId);
    const recent = await svc.getRecentAttendance(employeeId, 30);
    res.render('staff/attendance', { today, recent });
  } catch (err) {
    console.error('Attendance page error:', err);
    flash(req, 'error', 'Failed to load attendance.');
    res.render('staff/attendance', { today: null, recent: [] });
  }
};

exports.handleMarkPresent = async (req, res) => {
  try {
    const { employeeId, id: userId } = req.session.user;

    const emp = await svc.getEmployeeById(employeeId);
    if (!emp || !emp.is_active) {
      flash(req, 'error', 'Account is not active.');
      return res.redirect('/staff/attendance');
    }

    const workDate = new Date().toISOString().slice(0, 10);
    const sessionId = await svc.markAttendance(employeeId, workDate, 'PRESENT', null, userId);
    await svc.logEvent(sessionId, employeeId, 'MARK_PRESENT', null, userId);

    flash(req, 'success', 'Marked present for today.');
    return res.redirect('/staff/attendance');
  } catch (err) {
    console.error('Mark present error:', err);
    flash(req, 'error', 'Failed to mark attendance.');
    return res.redirect('/staff/attendance');
  }
};

// ── Admin: Employees ────────────────────────────────────────────────────────

exports.showAdminEmployees = async (req, res) => {
  try {
    const employees = await svc.getAllEmployees();
    res.render('staff/admin/employees', { employees });
  } catch (err) {
    console.error('Admin employees error:', err);
    flash(req, 'error', 'Failed to load employees.');
    res.render('staff/admin/employees', { employees: [] });
  }
};

exports.handleCreateEmployee = async (req, res) => {
  try {
    const b = req.body;
    await svc.createEmployee(
      {
        full_name: b.full_name,
        date_of_birth: b.date_of_birth,
        email: b.email,
        phone: b.phone,
        address_line1: b.address_line1,
        address_line2: b.address_line2,
        city: b.city,
        postcode: b.postcode,
        job_title: b.job_title,
        start_date: b.start_date,
        employment_type: b.employment_type,
        contracted_hours_per_week: b.contracted_hours_per_week,
        emergency_contact_name: b.emergency_contact_name,
        emergency_contact_phone: b.emergency_contact_phone,
      },
      {
        national_insurance_number: b.national_insurance_number,
        tax_code: b.tax_code,
        payroll_id: b.payroll_id,
        pay_type: b.pay_type,
        pay_rate: b.pay_rate,
        pay_frequency: b.pay_frequency,
      },
      {
        checked_date: b.rtw_checked_date,
        check_method: b.check_method,
        rt_work_type: b.rt_work_type,
        visa_expiry_date: b.visa_expiry_date,
      },
      b.role,
    );
    flash(req, 'success', 'Employee created.');
    return res.redirect('/staff/admin/employees');
  } catch (err) {
    console.error('Create employee error:', err);
    flash(req, 'error', err.code === 'ER_DUP_ENTRY' ? 'Email already exists.' : 'Failed to create employee.');
    return res.redirect('/staff/admin/employees');
  }
};

exports.handleEditEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body;
    await svc.updateEmployee(
      id,
      {
        full_name: b.full_name,
        date_of_birth: b.date_of_birth,
        email: b.email,
        phone: b.phone,
        address_line1: b.address_line1,
        address_line2: b.address_line2,
        city: b.city,
        postcode: b.postcode,
        job_title: b.job_title,
        start_date: b.start_date,
        employment_type: b.employment_type,
        contracted_hours_per_week: b.contracted_hours_per_week,
        emergency_contact_name: b.emergency_contact_name,
        emergency_contact_phone: b.emergency_contact_phone,
      },
      {
        national_insurance_number: b.national_insurance_number,
        tax_code: b.tax_code,
        payroll_id: b.payroll_id,
        pay_type: b.pay_type,
        pay_rate: b.pay_rate,
        pay_frequency: b.pay_frequency,
      },
      {
        checked_date: b.rtw_checked_date,
        check_method: b.check_method,
        rt_work_type: b.rt_work_type,
        visa_expiry_date: b.visa_expiry_date,
      },
    );
    flash(req, 'success', 'Employee updated.');
    return res.redirect('/staff/admin/employees');
  } catch (err) {
    console.error('Edit employee error:', err);
    flash(req, 'error', 'Failed to update employee.');
    return res.redirect('/staff/admin/employees');
  }
};

exports.handleDeactivateEmployee = async (req, res) => {
  try {
    await svc.deactivateEmployee(req.params.id);
    flash(req, 'success', 'Employee deactivated.');
    return res.redirect('/staff/admin/employees');
  } catch (err) {
    console.error('Deactivate error:', err);
    flash(req, 'error', 'Failed to deactivate employee.');
    return res.redirect('/staff/admin/employees');
  }
};

exports.handleSendInvite = async (req, res) => {
  try {
    const emp = await svc.getEmployeeById(req.params.id);
    if (!emp || !emp.user_id) {
      flash(req, 'error', 'Employee or user account not found.');
      return res.redirect('/staff/admin/employees');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await svc.createInvite(emp.user_id, hashToken(token), expiresAt);

    const hostUrl = `${req.protocol}://${req.get('host')}`;
    await sendInviteEmail(emp.email, token, hostUrl);

    flash(req, 'success', `Invite sent to ${emp.email}.`);
    return res.redirect('/staff/admin/employees');
  } catch (err) {
    console.error('Send invite error:', err);
    flash(req, 'error', 'Failed to send invite.');
    return res.redirect('/staff/admin/employees');
  }
};

// ── Admin: Attendance ───────────────────────────────────────────────────────

exports.showAdminAttendance = async (req, res) => {
  try {
    const { employee_id, from, to } = req.query;
    const sessions = await svc.getSessionsFiltered({
      employeeId: employee_id || null,
      from: from || null,
      to: to || null,
    });
    const employees = await svc.getActiveEmployees();
    res.render('staff/admin/attendance', {
      sessions,
      employees,
      filters: { employee_id: employee_id || '', from: from || '', to: to || '' },
    });
  } catch (err) {
    console.error('Admin attendance error:', err);
    flash(req, 'error', 'Failed to load attendance.');
    res.render('staff/admin/attendance', { sessions: [], employees: [], filters: {} });
  }
};

exports.handleAdminMarkAttendance = async (req, res) => {
  try {
    const { employee_id, work_date, status, note } = req.body;
    const userId = req.session.user.id;

    if (!employee_id || !work_date || !status) {
      flash(req, 'error', 'Employee, date, and status are required.');
      return res.redirect('/staff/admin/attendance');
    }

    const sessionId = await svc.markAttendance(employee_id, work_date, status, note, userId);
    const eventType = status === 'PRESENT' ? 'MARK_PRESENT' : 'MARK_ABSENT';
    await svc.logEvent(sessionId, employee_id, eventType, note || 'Admin', userId);

    flash(req, 'success', 'Attendance recorded.');
    return res.redirect('/staff/admin/attendance');
  } catch (err) {
    console.error('Admin mark attendance error:', err);
    flash(req, 'error', 'Failed to record attendance.');
    return res.redirect('/staff/admin/attendance');
  }
};

exports.handleEditSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const userId = req.session.user.id;

    const session = await svc.getSessionById(id);
    if (!session) {
      flash(req, 'error', 'Record not found.');
      return res.redirect('/staff/admin/attendance');
    }

    await svc.updateAttendance(id, status, note);
    await svc.logEvent(id, session.employee_id, 'EDIT', req.body.reason || 'Admin edit', userId);

    flash(req, 'success', 'Record updated.');
    return res.redirect('/staff/admin/attendance');
  } catch (err) {
    console.error('Edit session error:', err);
    flash(req, 'error', 'Failed to update record.');
    return res.redirect('/staff/admin/attendance');
  }
};

exports.handleExportCSV = async (req, res) => {
  try {
    const { employee_id, from, to } = req.query;
    const sessions = await svc.getSessionsFiltered({
      employeeId: employee_id || null,
      from: from || null,
      to: to || null,
    });

    const header = 'Employee,Date,Status,Note';
    const rows = sessions.map((s) => {
      const note = (s.note || '').replace(/"/g, '""');
      return `"${s.full_name}",${s.work_date ? new Date(s.work_date).toISOString().slice(0, 10) : ''},${s.status},"${note}"`;
    });

    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance.csv');
    return res.send(csv);
  } catch (err) {
    console.error('CSV export error:', err);
    flash(req, 'error', 'Export failed.');
    return res.redirect('/staff/admin/attendance');
  }
};
