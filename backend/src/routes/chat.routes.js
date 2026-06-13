const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { authRequired } = require('../middlewares/auth.middleware');
const { uploadChat } = require('../middlewares/upload.middleware');

router.use(authRequired);

router.post('/upload', uploadChat.single('attachment'), chatController.uploadAttachment);

module.exports = router;

