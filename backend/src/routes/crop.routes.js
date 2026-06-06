const express = require('express');
const router = express.Router();
const cropController = require('../controllers/crop.controller');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const { uploadListings } = require('../middlewares/upload.middleware');

// Marketplace browsing (Public / Buyer)
router.get('/marketplace', cropController.browseMarketplaceCrops);
router.get('/marketplace/:id', cropController.getCropListingDetail);
router.post('/marketplace/:id/interest', authRequired, cropController.expressInterest);

// Seller listings management (Protected)
router.get('/', authRequired, requireRole(['seller', 'farmer']), cropController.getSellerCrops);
router.post(
  '/',
  authRequired,
  requireRole(['seller', 'farmer']),
  uploadListings.array('photos', 5),
  cropController.createCropListing
);
router.put(
  '/:id',
  authRequired,
  requireRole(['seller', 'farmer']),
  uploadListings.array('photos', 5),
  cropController.updateCropListing
);
router.delete('/:id', authRequired, requireRole(['seller', 'farmer']), cropController.deleteCropListing);

module.exports = router;
