const router = require('express').Router();
const ctrl = require('./attendance.controller');
const { requireAuth, requireAdmin, staffLocals } = require('./attendance.middleware');

// Attach helpers and flash to every /staff/* request
router.use(staffLocals);

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/login', ctrl.showLogin);
router.post('/login', ctrl.handleLogin);
router.get('/logout', ctrl.handleLogout);
router.get('/set-password', ctrl.showSetPassword);
router.post('/set-password', ctrl.handleSetPassword);

// ── Employee ────────────────────────────────────────────────────────────────
router.get('/attendance', requireAuth, ctrl.showAttendance);
router.post('/attendance/clock-in', requireAuth, ctrl.handleClockIn);
router.post('/attendance/clock-out', requireAuth, ctrl.handleClockOut);

// ── Admin ───────────────────────────────────────────────────────────────────
router.get('/admin/employees', requireAuth, requireAdmin, ctrl.showAdminEmployees);
router.post('/admin/employees', requireAuth, requireAdmin, ctrl.handleCreateEmployee);
router.post('/admin/employees/:id/edit', requireAuth, requireAdmin, ctrl.handleEditEmployee);
router.post('/admin/employees/:id/deactivate', requireAuth, requireAdmin, ctrl.handleDeactivateEmployee);
router.post('/admin/employees/:id/invite', requireAuth, requireAdmin, ctrl.handleSendInvite);

router.get('/admin/attendance', requireAuth, requireAdmin, ctrl.showAdminAttendance);
router.post('/admin/attendance/:id/edit', requireAuth, requireAdmin, ctrl.handleEditSession);
router.get('/admin/attendance/export', requireAuth, requireAdmin, ctrl.handleExportCSV);

module.exports = router;
