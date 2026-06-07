const express = require('express');
const router = express.Router();

const transportController = require('../controllers/transport.controller');

router.get('/', transportController.getProviders);
router.post('/', transportController.createOrUpdateProvider);
router.delete('/:id', transportController.deactivateProvider);

module.exports = router;
