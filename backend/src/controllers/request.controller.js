const db = require('../config/db');
const auditService = require('../services/audit.service');
const notificationService = require('../services/notification.service');

/**
 * POST /api/buyer/broadcasts (Create buy request broadcast)
 */
async function createBroadcastRequest(req, res, next) {
  const {
    buyer_id,
    crop,
    quantity,
    unit,
    category,
    quality,
    urgency,
    budget,
    price_type,
    payment_method,
    payment_terms,
    delivery_type,
    district,
    address,
    needed_by,
    phone,
    whatsapp,
    email,
    notes,
    buyer_name,
  } = req.body;

  const b_id = buyer_id || req.auth.id;

  if (!b_id || !crop || !quantity || !district) {
    return res.status(400).json({ error: 'buyer_id, crop, quantity, and district are required' });
  }

  try {
    // 1. Resolve buyer name if not provided
    let resolvedName = buyer_name;
    if (!resolvedName) {
      const u = await db.query('SELECT first_name FROM users WHERE id = $1', [b_id]);
      resolvedName = u.rows[0]?.first_name || 'Buyer';
    }

    // 2. Insert request
    const result = await db.query(
      `INSERT INTO buyer_requests
         (buyer_id, buyer_name, crop, category, quantity, unit, quality, urgency,
          budget, price_type, payment_method, payment_terms, delivery_type,
          district, address, needed_by, phone, whatsapp, email, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'open')
       RETURNING *`,
      [
        b_id,
        resolvedName,
        crop,
        category || null,
        quantity,
        unit || null,
        quality || null,
        urgency || null,
        budget || null,
        price_type || null,
        payment_method || null,
        payment_terms || null,
        delivery_type || null,
        district,
        address || null,
        needed_by || null,
        phone || null,
        whatsapp || null,
        email || null,
        notes || null,
      ]
    );

    const broadcast = result.rows[0];

    // 3. Find matching approved sellers in the same district listing that crop
    const sellers = await db.query(
      `SELECT DISTINCT u.id FROM users u
       JOIN crop_listings cl ON cl.seller_id = u.id AND cl.status = 'active'
       WHERE u.status = 'approved' AND u.role IN ('seller', 'farmer')
         AND (u.district ILIKE $1 OR cl.district ILIKE $1)
         AND cl.name ILIKE $2`,
      [district, `%${crop}%`]
    );

    // 4. Send notifications
    const notificationPromises = sellers.rows.map((s) =>
      notificationService.pushNotification(
        s.id,
        'request',
        `New Buyer Request: ${crop}`,
        `${resolvedName} from ${district} needs ${quantity} of ${crop}.${budget ? ' Budget: Rs. ' + budget : ''} Respond now!`
      )
    );
    await Promise.allSettled(notificationPromises);

    // Audit log
    await auditService.logAction(b_id, 'CREATE_BROADCAST', req.ip, { id: broadcast.id, crop });

    return res.status(201).json({
      success: true,
      broadcast,
      notified_sellers: sellers.rows.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/buyer/broadcasts (Get buyer's own broadcasts)
 */
async function getBuyerBroadcasts(req, res, next) {
  const buyer_id = req.query.buyer_id || req.auth.id;
  const { status } = req.query;

  if (!buyer_id) {
    return res.status(400).json({ error: 'buyer_id is required' });
  }

  try {
    const statusFilter = status ? 'AND br.status = $2' : '';
    const params = status ? [buyer_id, status] : [buyer_id];

    const result = await db.query(
      `SELECT br.*,
              (SELECT COUNT(*) FROM request_responses rr WHERE rr.request_id = br.id) AS response_count,
              (SELECT json_agg(
                 json_build_object(
                   'id', rr.id, 'type', rr.type, 'price', rr.price,
                   'quantity', rr.quantity, 'message', rr.message,
                   'seller_name', u.first_name || ' ' || u.last_name,
                   'seller_phone', u.phone, 'created_at', rr.created_at
                 ) ORDER BY rr.created_at DESC
               )
               FROM request_responses rr
               JOIN users u ON u.id = rr.seller_id
               WHERE rr.request_id = br.id
              ) AS responses
       FROM buyer_requests br
       WHERE br.buyer_id = $1 ${statusFilter}
       ORDER BY br.created_at DESC`,
      params
    );

    return res.json({ success: true, broadcasts: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/buyer/broadcasts/:id (Single broadcast with responses)
 */
async function getBroadcastDetail(req, res, next) {
  const { id } = req.params;
  const buyer_id = req.query.buyer_id || req.auth.id;

  try {
    const result = await db.query(
      `SELECT br.*,
              (SELECT json_agg(
                 json_build_object(
                   'id', rr.id, 'type', rr.type, 'price', rr.price,
                   'quantity', rr.quantity, 'message', rr.message,
                   'seller_id', rr.seller_id,
                   'seller_name', u.first_name || ' ' || u.last_name,
                   'seller_phone', u.phone, 'seller_district', u.district,
                   'created_at', rr.created_at
                 ) ORDER BY rr.created_at ASC
               )
               FROM request_responses rr
               JOIN users u ON u.id = rr.seller_id
               WHERE rr.request_id = br.id
              ) AS responses
       FROM buyer_requests br
       WHERE br.id = $1 ${buyer_id ? 'AND br.buyer_id = $2' : ''}`,
      buyer_id ? [id, buyer_id] : [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Broadcast not found' });
    }
    return res.json({ success: true, broadcast: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/buyer/broadcasts/:id (Close/Withdraw request)
 */
async function closeBroadcastRequest(req, res, next) {
  const { id } = req.params;
  const buyer_id = req.body.buyer_id || req.auth.id;

  if (!buyer_id) {
    return res.status(400).json({ error: 'buyer_id is required' });
  }

  try {
    const result = await db.query(
      `UPDATE buyer_requests SET status = 'closed' 
       WHERE id = $1 AND buyer_id = $2 AND status = 'open' 
       RETURNING id`,
      [id, buyer_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found or already closed' });
    }

    // Audit log
    await auditService.logAction(buyer_id, 'CLOSE_BROADCAST', req.ip, { id });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/seller/requests (Sellers view matching open requests)
 */
async function getSellerMatchingRequests(req, res, next) {
  const { district, crop, limit = 50 } = req.query;
  try {
    const filters = [`status = 'open'`, `expires_at > NOW()`];
    const params = [];

    if (district) {
      params.push(district);
      filters.push(`district ILIKE $${params.length}`);
    }
    if (crop) {
      params.push(`%${crop}%`);
      filters.push(`crop ILIKE $${params.length}`);
    }
    params.push(parseInt(limit, 10));

    const result = await db.query(
      `SELECT br.*,
              (SELECT json_agg(rr.*) FROM request_responses rr WHERE rr.request_id = br.id) AS responses
       FROM buyer_requests br
       WHERE ${filters.join(' AND ')}
       ORDER BY br.created_at DESC
       LIMIT $${params.length}`,
      params
    );

    return res.json({ success: true, requests: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/seller/requests/:id/respond (Seller replies to request)
 */
async function respondToRequest(req, res, next) {
  const { id } = req.params;
  const { seller_id, type, price, quantity, message } = req.body;
  const s_id = seller_id || req.auth.id;

  if (!s_id || !type) {
    return res.status(400).json({ error: 'seller_id and type are required' });
  }
  if (!['accept', 'reject', 'counter'].includes(type)) {
    return res.status(400).json({ error: 'type must be accept, reject, or counter' });
  }

  try {
    // Check request exists and is open
    const reqQuery = await db.query(
      `SELECT * FROM buyer_requests WHERE id = $1 AND status = 'open' AND expires_at > NOW()`,
      [id]
    );
    if (reqQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found or already closed' });
    }

    const br = reqQuery.rows[0];

    // Insert response
    const responseResult = await db.query(
      `INSERT INTO request_responses (request_id, seller_id, type, price, quantity, message)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, s_id, type, price ? parseFloat(price) : null, quantity || null, message || null]
    );

    const response = responseResult.rows[0];

    // Close request if seller accepts buyer's original price
    if (type === 'accept') {
      await db.query(`UPDATE buyer_requests SET status = 'closed' WHERE id = $1`, [id]);
    }

    // Notify buyer
    const typeLabel = { accept: 'accepted', reject: 'declined', counter: 'sent a counter-offer' };
    await notificationService.pushNotification(
      br.buyer_id,
      'response',
      `Seller responded to your request`,
      `A seller has ${typeLabel[type]} for your "${br.crop}" request.${price ? ' Offered: Rs. ' + price : ''}`
    );

    // Audit log
    await auditService.logAction(s_id, 'RESPOND_TO_BROADCAST', req.ip, { request_id: id, type });

    return res.status(201).json({ success: true, response });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/buyer/broadcasts/:id/accept-response (Buyer accepts seller counter-offer)
 */
async function acceptSellerResponse(req, res, next) {
  const { id } = req.params;
  const { buyer_id, response_id } = req.body;
  const b_id = buyer_id || req.auth.id;

  if (!b_id || !response_id) {
    return res.status(400).json({ error: 'buyer_id and response_id are required' });
  }

  try {
    const brQuery = await db.query(
      `SELECT * FROM buyer_requests WHERE id = $1 AND buyer_id = $2`,
      [id, b_id]
    );
    if (brQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Broadcast not found' });
    }

    // Close the request
    await db.query(`UPDATE buyer_requests SET status = 'closed' WHERE id = $1`, [id]);

    // Get the response and notify seller
    const responseQuery = await db.query(`SELECT * FROM request_responses WHERE id = $1`, [response_id]);
    if (responseQuery.rows.length > 0) {
      const resp = responseQuery.rows[0];
      await notificationService.pushNotification(
        resp.seller_id,
        'response',
        'Your offer was accepted!',
        `The buyer accepted your ${resp.type} for "${brQuery.rows[0].crop}". Contact them to arrange delivery.`
      );
    }

    // Audit log
    await auditService.logAction(b_id, 'ACCEPT_BROADCAST_RESPONSE', req.ip, { request_id: id, response_id });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/buyer/dashboard
 */
async function getBuyerDashboard(req, res, next) {
  const buyer_id = req.query.buyer_id || req.auth.id;

  if (!buyer_id) {
    return res.status(400).json({ error: 'buyer_id is required' });
  }

  try {
    const [broadcasts, bookings, notifications] = await Promise.all([
      db.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status='open') AS open,
           COUNT(*) FILTER (WHERE status='closed') AS closed
         FROM buyer_requests WHERE buyer_id = $1`,
        [buyer_id]
      ),
      db.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status='confirmed') AS confirmed,
           COUNT(*) FILTER (WHERE status='pending') AS pending
         FROM equipment_bookings WHERE renter_id = $1`,
        [buyer_id]
      ),
      db.query(
        `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
        [buyer_id]
      ),
    ]);

    const recent = await db.query(
      `SELECT br.id, br.crop, br.quantity, br.district, br.status, br.created_at,
              (SELECT COUNT(*) FROM request_responses rr WHERE rr.request_id = br.id) AS response_count
       FROM buyer_requests br
       WHERE br.buyer_id = $1
       ORDER BY br.created_at DESC LIMIT 5`,
      [buyer_id]
    );

    return res.json({
      success: true,
      dashboard: {
        broadcasts: broadcasts.rows[0],
        bookings: bookings.rows[0],
        notifications: notifications.rows[0],
        recent_broadcasts: recent.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/buyer/broadcasts/:id (Edit broadcast request)
 */
async function updateBroadcastRequest(req, res, next) {
  const { id } = req.params;
  const buyer_id = req.body.buyer_id || req.auth.id;
  const { crop, quantity, district, needed_by, budget } = req.body;

  if (!buyer_id) {
    return res.status(400).json({ error: 'buyer_id is required' });
  }

  try {
    const result = await db.query(
      `UPDATE buyer_requests SET
         crop = COALESCE($1, crop),
         quantity = COALESCE($2, quantity),
         district = COALESCE($3, district),
         needed_by = COALESCE($4, needed_by),
         budget = COALESCE($5, budget),
         expires_at = NOW() + INTERVAL '72 hours'
       WHERE id = $6 AND buyer_id = $7 AND status = 'open'
       RETURNING *`,
      [crop, quantity, district, needed_by || null, budget || null, id, buyer_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found, already closed, or unauthorized' });
    }

    const updatedRequest = result.rows[0];

    // Notify matching sellers again if updated
    const sellers = await db.query(
      `SELECT DISTINCT u.id FROM users u
       JOIN crop_listings cl ON cl.seller_id = u.id AND cl.status = 'active'
       WHERE u.status = 'approved' AND u.role IN ('seller', 'farmer')
         AND (u.district ILIKE $1 OR cl.district ILIKE $1)
         AND cl.name ILIKE $2`,
      [
        district || updatedRequest.district,
        `%${crop || updatedRequest.crop}%`,
      ]
    );

    const notificationPromises = sellers.rows.map((s) =>
      notificationService.pushNotification(
        s.id,
        'request',
        `Updated Buyer Request: ${crop || updatedRequest.crop}`,
        `${updatedRequest.buyer_name || 'Buyer'} updated their request in ${district || updatedRequest.district}. Respond now!`
      )
    );
    await Promise.allSettled(notificationPromises);

    // Audit log
    await auditService.logAction(buyer_id, 'UPDATE_BROADCAST', req.ip, { id });

    return res.json({ success: true, broadcast: updatedRequest });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBroadcastRequest,
  getBuyerBroadcasts,
  getBroadcastDetail,
  closeBroadcastRequest,
  getSellerMatchingRequests,
  respondToRequest,
  acceptSellerResponse,
  getBuyerDashboard,
  updateBroadcastRequest,
};
