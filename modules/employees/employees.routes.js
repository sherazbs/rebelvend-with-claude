const router = require('express').Router();
const ctrl = require('./employees.controller');
const { requireAuth, requireAdmin, staffLocals } = require('./employees.middleware');

router.use(staffLocals);

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/login', ctrl.showLogin);
router.post('/login', ctrl.handleLogin);
router.get('/logout', ctrl.handleLogout);
router.get('/set-password', ctrl.showSetPassword);
router.post('/set-password', ctrl.handleSetPassword);

// ── Admin: Employees ────────────────────────────────────────────────────────
router.get('/admin/employees', requireAuth, requireAdmin, ctrl.showAdminEmployees);
router.post('/admin/employees', requireAuth, requireAdmin, ctrl.handleCreateEmployee);
router.post('/admin/employees/:id/edit', requireAuth, requireAdmin, ctrl.handleEditEmployee);
router.post('/admin/employees/:id/deactivate', requireAuth, requireAdmin, ctrl.handleDeactivateEmployee);
router.post('/admin/employees/:id/invite', requireAuth, requireAdmin, ctrl.handleSendInvite);

module.exports = router;
