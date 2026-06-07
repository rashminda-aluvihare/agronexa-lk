const express = require('express');
const router = express.Router();

const cropController = require('../controllers/crop.controller');
const equipmentController = require('../controllers/equipment.controller');
const requestController = require('../controllers/request.controller');
const ledgerController = require('../controllers/ledger.controller');
const reputationController = require('../controllers/reputation.controller');
const chatController = require('../controllers/chat.controller');
const notificationController = require('../controllers/notification.controller');

const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const { uploadListings } = require('../middlewares/upload.middleware');

// Apply seller authorization to all routes by default
router.use(authRequired);
router.use(requireRole(['seller', 'farmer']));

// Crop Listings
router.get('/crops', cropController.getSellerCrops);
router.post('/crops', uploadListings.array('photos', 5), cropController.createCropListing);
router.put('/crops/:id', uploadListings.array('photos', 5), cropController.updateCropListing);
router.delete('/crops/:id', cropController.deleteCropListing);
router.post('/crops/:id/update-stock', cropController.updateCropStock);
router.put('/crops/:id/update-stock', cropController.updateCropStock); // Support both methods

// Equipment Listings
router.get('/equipment', equipmentController.getOwnerEquipment);
router.post('/equipment', uploadListings.array('photos', 5), equipmentController.createEquipmentListing);
router.put('/equipment/:id', uploadListings.array('photos', 5), equipmentController.updateEquipmentListing);
router.delete('/equipment/:id', equipmentController.deleteEquipmentListing);

// Bookings (owner side)
router.get('/bookings', equipmentController.getSellerBookings);
router.post('/bookings/:id/confirm', equipmentController.confirmBooking);
router.post('/bookings/:id/reject', equipmentController.rejectBooking);

// Buyer Requests
router.get('/requests', requestController.getSellerMatchingRequests);
router.post('/requests/:id/respond', requestController.respondToRequest);

// Ledger & Reputation
router.get('/ledger', ledgerController.getLedger);
router.get('/ledger/verify', ledgerController.verifyLedger);
router.get('/reputation/:seller_id', reputationController.getReputationScore);

// Chats & Messaging
router.get('/chats', chatController.getUserChats);
router.get('/messages', chatController.getChatMessages);
router.post('/messages/send', chatController.sendChatMessage);

// Notifications
router.get('/notifications', notificationController.getNotifications);
router.post('/notifications/read-all', notificationController.markAllAsRead);

// Analytics
router.get('/analytics', cropController.getSellerAnalytics);

module.exports = router;
