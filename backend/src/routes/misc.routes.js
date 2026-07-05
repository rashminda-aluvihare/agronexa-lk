const express = require('express');
const router = express.Router();

const miscController = require('../controllers/misc.controller');

router.get('/market-prices', miscController.getMarketPrices);
router.get('/weather-advisory', miscController.getWeatherAdvisoryHandler);

module.exports = router;
