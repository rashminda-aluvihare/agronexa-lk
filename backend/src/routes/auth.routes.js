const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { uploadNic } = require('../middlewares/upload.middleware');

router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);

router.post(
  '/register-with-otp',
  uploadNic.fields([
    { name: 'nic_front', maxCount: 1 },
    { name: 'nic_back', maxCount: 1 },
  ]),
  authController.registerWithOtp
);

router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/forgot-password-link', authController.forgotPasswordLink);
router.post('/reset-password-link', authController.resetPasswordLink);

module.exports = router;
