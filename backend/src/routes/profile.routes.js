const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { authRequired } = require('../middlewares/auth.middleware');

router.use(authRequired);

router.get('/:id', authController.getProfile);
router.put('/:id', authController.updateProfile);
router.put('/:id/sms-preference', authController.updateSmsPreference);

module.exports = router;
