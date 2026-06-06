const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authRequired } = require('../middlewares/auth.middleware');

router.get('/', authRequired, notificationController.getNotifications);
router.post('/read-all', authRequired, notificationController.markAllAsRead);

module.exports = router;
