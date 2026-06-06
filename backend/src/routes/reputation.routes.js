const express = require('express');
const router = express.Router();
const reputationController = require('../controllers/reputation.controller');

router.get('/:seller_id', reputationController.getReputationScore);

module.exports = router;
