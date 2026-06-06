const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipment.controller');
const { authRequired } = require('../middlewares/auth.middleware');

router.post('/', authRequired, equipmentController.bookEquipment);

router.get('/', authRequired, (req, res, next) => {
  if (req.query.owner_id) {
    return equipmentController.getSellerBookings(req, res, next);
  }
  return equipmentController.getBuyerBookings(req, res, next);
});

router.delete('/:id', authRequired, equipmentController.cancelBooking);
router.post('/:id/confirm', authRequired, equipmentController.confirmBooking);
router.post('/:id/reject', authRequired, equipmentController.rejectBooking);

module.exports = router;
