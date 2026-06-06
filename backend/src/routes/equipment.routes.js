const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipment.controller');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const { uploadListings } = require('../middlewares/upload.middleware');

// Marketplace browsing (Public / Buyer)
router.get('/marketplace', equipmentController.browseMarketplaceEquipment);
router.get('/marketplace/:id', equipmentController.getEquipmentListingDetail);

// Seller/Owner listings management (Protected)
router.get('/', authRequired, requireRole(['seller', 'farmer']), equipmentController.getOwnerEquipment);
router.post(
  '/',
  authRequired,
  requireRole(['seller', 'farmer']),
  uploadListings.array('photos', 5),
  equipmentController.createEquipmentListing
);
router.put(
  '/:id',
  authRequired,
  requireRole(['seller', 'farmer']),
  uploadListings.array('photos', 5),
  equipmentController.updateEquipmentListing
);
router.delete('/:id', authRequired, requireRole(['seller', 'farmer']), equipmentController.deleteEquipmentListing);

module.exports = router;
