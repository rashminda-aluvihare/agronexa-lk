const express = require('express');
const router = express.Router();
router.get('/_ping', (_req, res) => res.json({ ok: true }));
module.exports = router;

