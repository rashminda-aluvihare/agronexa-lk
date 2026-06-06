const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');

// Admin panel actions
router.get('/pending', authRequired, requireRole(['admin']), adminController.getPendingUsers);
router.get('/users', authRequired, requireRole(['admin']), adminController.getAllUsers);
router.post('/approve/:id', authRequired, requireRole(['admin']), adminController.approveUser);
router.post('/reject/:id', authRequired, requireRole(['admin']), adminController.rejectUser);

// Audit logs and CSV exports
router.get('/audit-logs', authRequired, requireRole(['admin']), adminController.getAuditLogs);
router.get('/export/:resource', authRequired, requireRole(['admin']), adminController.exportResource);

module.exports = router;
