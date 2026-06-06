const express = require('express');
const router = express.Router();
const requestController = require('../controllers/request.controller');
const { authRequired } = require('../middlewares/auth.middleware');

router.post('/', authRequired, requestController.createBroadcastRequest);

router.get('/', authRequired, (req, res, next) => {
  if (req.query.buyer_id) {
    return requestController.getBuyerBroadcasts(req, res, next);
  }
  return requestController.getSellerMatchingRequests(req, res, next);
});

router.get('/:id', authRequired, requestController.getBroadcastDetail);
router.delete('/:id', authRequired, requestController.closeBroadcastRequest);

router.post('/:id/respond', authRequired, requestController.respondToRequest);
router.post('/:id/accept-response', authRequired, requestController.acceptSellerResponse);

module.exports = router;
