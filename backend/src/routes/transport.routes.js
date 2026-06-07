const express = require('express');
const router = express.Router();

const transportController = require('../controllers/transport.controller');
const { authRequired } = require('../middlewares/auth.middleware');

router.get('/', transportController.getProviders);
router.post('/', authRequired, transportController.createOrUpdateProvider);
router.delete('/:id', authRequired, transportController.deactivateProvider);

// Bookings endpoints
router.post('/bookings', authRequired, transportController.createBooking);
router.get('/bookings', authRequired, transportController.getBookings);
router.put('/bookings/:id/status', authRequired, transportController.updateBookingStatus);

module.exports = router;
