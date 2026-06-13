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

// Apply authentication to all routes
router.use(authRequired);

// Shared read routes accessible by seller, farmer, and buyer roles
router.get('/crops', requireRole(['seller', 'farmer', 'buyer']), cropController.getSellerCrops);
router.get('/equipment', requireRole(['seller', 'farmer', 'buyer']), equipmentController.getOwnerEquipment);
router.get('/ledger', requireRole(['seller', 'farmer', 'buyer']), ledgerController.getLedger);
router.get('/ledger/verify', requireRole(['seller', 'farmer', 'buyer']), ledgerController.verifyLedger);
router.get('/reputation/:seller_id', requireRole(['seller', 'farmer', 'buyer']), reputationController.getReputationScore);

// Modify/action routes require seller/farmer role
const sellerRoleCheck = requireRole(['seller', 'farmer']);

// Crop Listings
router.post('/crops', sellerRoleCheck, uploadListings.array('photos', 5), cropController.createCropListing);
router.put('/crops/:id', sellerRoleCheck, uploadListings.array('photos', 5), cropController.updateCropListing);
router.delete('/crops/:id', sellerRoleCheck, cropController.deleteCropListing);
router.post('/crops/:id/update-stock', sellerRoleCheck, cropController.updateCropStock);
router.put('/crops/:id/update-stock', sellerRoleCheck, cropController.updateCropStock); // Support both methods

// Crop Orders (seller side)
router.get('/crop-orders', sellerRoleCheck, cropController.getSellerCropOrders);
router.post('/crop-orders/:id/confirm', sellerRoleCheck, cropController.confirmCropOrder);
router.post('/crop-orders/:id/reject', sellerRoleCheck, cropController.rejectCropOrder);

// Equipment Listings
router.post('/equipment', sellerRoleCheck, uploadListings.array('photos', 5), equipmentController.createEquipmentListing);
router.put('/equipment/:id', sellerRoleCheck, uploadListings.array('photos', 5), equipmentController.updateEquipmentListing);
router.delete('/equipment/:id', sellerRoleCheck, equipmentController.deleteEquipmentListing);

// Bookings (owner side)
router.get('/bookings', sellerRoleCheck, equipmentController.getSellerBookings);
router.post('/bookings/:id/confirm', sellerRoleCheck, equipmentController.confirmBooking);
router.post('/bookings/:id/reject', sellerRoleCheck, equipmentController.rejectBooking);
router.post('/bookings/:id/complete', sellerRoleCheck, equipmentController.completeBooking);

// Buyer Requests
router.get('/requests', sellerRoleCheck, requestController.getSellerMatchingRequests);
router.post('/requests/:id/respond', sellerRoleCheck, requestController.respondToRequest);

// Chats & Messaging
router.get('/chats', sellerRoleCheck, chatController.getUserChats);
router.get('/messages', sellerRoleCheck, chatController.getChatMessages);
router.post('/messages/send', sellerRoleCheck, chatController.sendChatMessage);

// Notifications
router.get('/notifications', sellerRoleCheck, notificationController.getNotifications);
router.post('/notifications/read-all', sellerRoleCheck, notificationController.markAllAsRead);

// Analytics
router.get('/analytics', sellerRoleCheck, cropController.getSellerAnalytics);

module.exports = router;
