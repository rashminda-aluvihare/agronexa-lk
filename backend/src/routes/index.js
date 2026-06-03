const express = require('express');

const authRoutes = require('./auth.routes');
const cropRoutes = require('./crop.routes');
const equipmentRoutes = require('./equipment.routes');
const transportRoutes = require('./transport.routes');
const requestRoutes = require('./request.routes');
const bookingRoutes = require('./booking.routes');
const chatRoutes = require('./chat.routes');
const ledgerRoutes = require('./ledger.routes');
const adminRoutes = require('./admin.routes');
const reputationRoutes = require('./reputation.routes');

const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/crops', cropRoutes);
apiRouter.use('/equipment', equipmentRoutes);
apiRouter.use('/transport', transportRoutes);
apiRouter.use('/requests', requestRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/chat', chatRoutes);
apiRouter.use('/ledger', ledgerRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/reputation', reputationRoutes);

module.exports = { apiRouter };

