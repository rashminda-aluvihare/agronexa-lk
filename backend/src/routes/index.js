const express = require('express');

const authController = require('../controllers/auth.controller');
const miscController = require('../controllers/misc.controller');
const { authRequired } = require('../middlewares/auth.middleware');

const authRoutes = require('./auth.routes');
const sellerRoutes = require('./seller.routes');
const buyerRoutes = require('./buyer.routes');
const adminRoutes = require('./admin.routes');
const profileRoutes = require('./profile.routes');
const transportRoutes = require('./transport.routes');
const chatRoutes = require('./chat.routes');
const ledgerRoutes = require('./ledger.routes');

const apiRouter = express.Router();

// Direct login route
apiRouter.post('/login', authController.login);

// Grouped sub-routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/seller', sellerRoutes);
apiRouter.use('/buyer', buyerRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/profile', profileRoutes);
apiRouter.use('/transport', transportRoutes);
apiRouter.use('/chat', chatRoutes);
apiRouter.use('/ledger', ledgerRoutes);

// Misc routes
apiRouter.get('/market-prices', miscController.getMarketPrices);
apiRouter.get('/public-stats', miscController.getPublicStats);
apiRouter.get('/announcements', authRequired, miscController.getActiveAnnouncements);

module.exports = { apiRouter };

