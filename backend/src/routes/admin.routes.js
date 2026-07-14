const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const ledgerController = require('../controllers/ledger.controller');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');

// Admin panel actions
router.get('/stats', authRequired, requireRole(['admin']), adminController.getDashboardStats);
router.get('/ledger/verify', authRequired, requireRole(['admin']), ledgerController.verifyLedger);
router.post('/system/reset', authRequired, requireRole(['admin']), adminController.resetSystemDatabase);
router.post('/system/maintenance', authRequired, requireRole(['admin']), adminController.setMaintenanceMode);
router.get('/pending', authRequired, requireRole(['admin']), adminController.getPendingUsers);
router.get('/users', authRequired, requireRole(['admin']), adminController.getAllUsers);
router.post('/approve/:id', authRequired, requireRole(['admin']), adminController.approveUser);
router.post('/reject/:id', authRequired, requireRole(['admin']), adminController.rejectUser);
router.post('/user/:id/role', authRequired, requireRole(['admin']), adminController.changeUserRole);
router.post('/user/:id/status', authRequired, requireRole(['admin']), adminController.changeUserStatus);

// Audit logs and CSV exports
router.get('/audit-logs', authRequired, requireRole(['admin']), adminController.getAuditLogs);
router.get('/export/:resource', authRequired, requireRole(['admin']), adminController.exportResource);

// Announcements Management
router.get('/announcements', authRequired, requireRole(['admin']), adminController.getAllAnnouncements);
router.post('/announcements', authRequired, requireRole(['admin']), adminController.createAnnouncement);
router.put('/announcements/:id', authRequired, requireRole(['admin']), adminController.updateAnnouncement);
router.delete('/announcements/:id', authRequired, requireRole(['admin']), adminController.deleteAnnouncement);

module.exports = router;
