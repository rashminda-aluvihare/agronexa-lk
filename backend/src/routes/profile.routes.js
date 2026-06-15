const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { authRequired } = require('../middlewares/auth.middleware');
const { uploadProfilePhoto } = require('../middlewares/upload.middleware');

router.use(authRequired);

router.get('/:id', authController.getProfile);
router.put('/:id', uploadProfilePhoto.single('profile_photo'), authController.updateProfile);
router.put('/:id/sms-preference', authController.updateSmsPreference);

module.exports = router;
