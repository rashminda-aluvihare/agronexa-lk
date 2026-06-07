const express = require('express');
const router = express.Router();

const miscController = require('../controllers/misc.controller');

router.get('/market-prices', miscController.getMarketPrices);

module.exports = router;
