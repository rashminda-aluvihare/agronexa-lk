const express = require('express');

const authController = require('../controllers/auth.controller');
const miscController = require('../controllers/misc.controller');

const authRoutes = require('./auth.routes');
const sellerRoutes = require('./seller.routes');
const buyerRoutes = require('./buyer.routes');
const adminRoutes = require('./admin.routes');
const profileRoutes = require('./profile.routes');
const transportRoutes = require('./transport.routes');

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

// Misc routes
apiRouter.get('/market-prices', miscController.getMarketPrices);

module.exports = { apiRouter };
