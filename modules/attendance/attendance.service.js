const { getPool } = require('../shared/db');

// ── Attendance ──────────────────────────────────────────────────────────────

async function markAttendance(employeeId, workDate, status, note, markedBy) {
  const [existing] = await getPool().execute(
    'SELECT id FROM work_sessions WHERE employee_id=? AND work_date=?',
    [employeeId, workDate],
  );

  if (existing.length > 0) {
    await getPool().execute(
      'UPDATE work_sessions SET status=?, note=?, marked_by=? WHERE id=?',
      [status, note || null, markedBy, existing[0].id],
    );
    return existing[0].id;
  }

  const [result] = await getPool().execute(
    'INSERT INTO work_sessions (employee_id, work_date, status, note, marked_by) VALUES (?,?,?,?,?)',
    [employeeId, workDate, status, note || null, markedBy],
  );
  return result.insertId;
}

async function getTodayAttendance(employeeId) {
  const [rows] = await getPool().execute(
    'SELECT * FROM work_sessions WHERE employee_id=? AND work_date=CURDATE()',
    [employeeId],
  );
  return rows[0] || null;
}

async function getRecentAttendance(employeeId, days = 30) {
  const [rows] = await getPool().execute(
    `SELECT * FROM work_sessions WHERE employee_id=?
     ORDER BY work_date DESC LIMIT ?`,
    [employeeId, days],
  );
  return rows;
}

async function getSessionsFiltered({ employeeId, from, to }) {
  let sql = `SELECT ws.*, e.full_name
             FROM work_sessions ws
             JOIN employees e ON ws.employee_id = e.id
             WHERE 1=1`;
  const params = [];

  if (employeeId) {
    sql += ` AND ws.employee_id = ?`;
    params.push(employeeId);
  }
  if (from) {
    sql += ` AND ws.work_date >= ?`;
    params.push(from);
  }
  if (to) {
    sql += ` AND ws.work_date <= ?`;
    params.push(to);
  }

  sql += ` ORDER BY ws.work_date DESC`;

  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function getSessionById(id) {
  const [rows] = await getPool().execute(
    `SELECT ws.*, e.full_name FROM work_sessions ws
     JOIN employees e ON ws.employee_id = e.id
     WHERE ws.id=?`,
    [id],
  );
  return rows[0] || null;
}

async function updateAttendance(id, status, note) {
  await getPool().execute(
    'UPDATE work_sessions SET status=?, note=? WHERE id=?',
    [status, note || null, id],
  );
}

async function logEvent(sessionId, employeeId, eventType, reason, performedBy) {
  await getPool().execute(
    `INSERT INTO work_session_events
       (work_session_id, employee_id, event_type, event_time, reason, performed_by)
     VALUES (?, ?, ?, NOW(), ?, ?)`,
    [sessionId, employeeId, eventType, reason || null, performedBy || null],
  );
}

module.exports = {
  markAttendance,
  getTodayAttendance,
  getRecentAttendance,
  getSessionsFiltered,
  getSessionById,
  updateAttendance,
  logEvent,
};
