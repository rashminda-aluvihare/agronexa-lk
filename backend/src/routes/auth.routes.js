const express = require('express');
const router = express.Router();

// Placeholder route to validate boot.
// Full auth implementation will be added in later phases.
router.get('/_ping', (_req, res) => res.json({ ok: true }));

module.exports = router;

