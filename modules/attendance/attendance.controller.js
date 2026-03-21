const empSvc = require('../employees/employees.service');
const svc = require('./attendance.service');

function flash(req, type, message) {
  req.session.flash = { type, message };
}

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

    const emp = await empSvc.getEmployeeById(employeeId);
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

// ── Admin: Attendance ───────────────────────────────────────────────────────

exports.showAdminAttendance = async (req, res) => {
  try {
    const { employee_id, from, to } = req.query;
    const sessions = await svc.getSessionsFiltered({
      employeeId: employee_id || null,
      from: from || null,
      to: to || null,
    });
    const employees = await empSvc.getActiveEmployees();
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
