const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledger.controller');
const { authRequired } = require('../middlewares/auth.middleware');

router.get('/', authRequired, ledgerController.getLedger);
router.get('/verify', authRequired, ledgerController.verifyLedger);

module.exports = router;
