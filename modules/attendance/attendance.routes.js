const router = require('express').Router();
const ctrl = require('./attendance.controller');
const { requireAuth, requireAdmin } = require('../employees/employees.middleware');

// ── Employee ────────────────────────────────────────────────────────────────
router.get('/attendance', requireAuth, ctrl.showAttendance);
router.post('/attendance/mark-present', requireAuth, ctrl.handleMarkPresent);

// ── Admin ───────────────────────────────────────────────────────────────────
router.get('/admin/attendance', requireAuth, requireAdmin, ctrl.showAdminAttendance);
router.post('/admin/attendance', requireAuth, requireAdmin, ctrl.handleAdminMarkAttendance);
router.post('/admin/attendance/:id/edit', requireAuth, requireAdmin, ctrl.handleEditSession);
router.get('/admin/attendance/export', requireAuth, requireAdmin, ctrl.handleExportCSV);

module.exports = router;
