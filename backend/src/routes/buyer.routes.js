const express = require('express');
const router = express.Router();

const cropController = require('../controllers/crop.controller');
const equipmentController = require('../controllers/equipment.controller');
const requestController = require('../controllers/request.controller');
const chatController = require('../controllers/chat.controller');
const notificationController = require('../controllers/notification.controller');

const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const { uploadPaymentSlip } = require('../middlewares/upload.middleware');

// Public endpoints (no token/role verification if called publicly, but authRequired middleware has a hybrid fallback to query/body IDs)
// Wait! Let's check if authRequired is needed here. The frontend uses a fallback to query parameters (?buyer_id=) for buyer marketplace routes. Let's make sure authRequired is applied where appropriate.
// In root buyerRoutes, authRequired is NOT globally applied to all routes, but most require renter_id or buyer_id. 
// Applying authRequired (which supports hybrid queries) to all buyer routes is extremely safe because it falls back to req.query.buyer_id/seller_id if no Bearer token exists!
router.use(authRequired);
router.use(requireRole(['buyer']));

// Public / Buyer Marketplace
router.get('/marketplace/crops', cropController.browseMarketplaceCrops);
router.get('/marketplace/crops/:id', cropController.getCropListingDetail);
router.post('/marketplace/crops/:id/interest', cropController.expressInterest);
router.get('/marketplace/equipment', equipmentController.browseMarketplaceEquipment);
router.get('/marketplace/equipment/:id', equipmentController.getEquipmentListingDetail);

// Bookings (renter/buyer side)
router.post('/bookings', equipmentController.bookEquipment);
router.get('/bookings', equipmentController.getBuyerBookings);
router.delete('/bookings/:id', equipmentController.cancelBooking);

// Crop Orders (buyer side)
router.post('/crop-orders', cropController.placeCropOrder);
router.get('/crop-orders', cropController.getBuyerCropOrders);
router.put('/crop-orders/:id/pay', uploadPaymentSlip.single('payment_slip'), cropController.payCropOrder);

// Buyer Broadcast Requests
router.post('/broadcasts', requestController.createBroadcastRequest);
router.get('/broadcasts', requestController.getBuyerBroadcasts);
router.get('/broadcasts/:id', requestController.getBroadcastDetail);
router.put('/broadcasts/:id', requestController.updateBroadcastRequest);
router.delete('/broadcasts/:id', requestController.closeBroadcastRequest);
router.post('/broadcasts/:id/accept-response', requestController.acceptSellerResponse);

// Chats & Messaging
router.get('/chats', chatController.getUserChats);
router.get('/messages', chatController.getChatMessages);
router.post('/messages/send', chatController.sendChatMessage);

// Notifications
router.get('/notifications', notificationController.getNotifications);
router.post('/notifications/read-all', notificationController.markAllAsRead);

// Dashboard
router.get('/dashboard', requestController.getBuyerDashboard);

module.exports = router;
