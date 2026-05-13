/**
 * AgroNexa LK — Buyer Routes
 * Prefix: /api/buyer
 *
 * Tables used (shared with seller, auto-created by sellerRoutes.js migration):
 *   crop_listings, equipment_listings, equipment_bookings,
 *   buyer_requests, request_responses, notifications
 */

const express = require('express');
const router  = express.Router();

// ── DB pool injected from server.js ───────────────────────────────────────────
let pool;
router.use((req, _res, next) => {
  if (!pool) pool = req.app.get('db');
  next();
});

// ── Helper: push in-app notification ──────────────────────────────────────────
async function pushNotification(userId, type, title, body) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body) VALUES ($1,$2,$3,$4)`,
      [userId, type, title, body]
    );
  } catch (e) {
    console.warn('Notification insert error:', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC MARKETPLACE — browse crops & equipment (FR4, FR5, FR11)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/buyer/marketplace/crops
 * Query: search, district, category, min_price, max_price, sort, page, limit
 */
router.get('/marketplace/crops', async (req, res) => {
  const {
    search, district, category,
    min_price, max_price,
    sort = 'newest',
    page = 1, limit = 24
  } = req.query;

  try {
    const filters = [`cl.status = 'active'`];
    const params  = [];

    if (search) {
      params.push(`%${search}%`);
      filters.push(
        `(cl.name ILIKE $${params.length} OR cl.description ILIKE $${params.length} OR u.first_name ILIKE $${params.length})`
      );
    }
    if (district) {
      params.push(district);
      filters.push(`cl.district ILIKE $${params.length}`);
    }
    if (category) {
      params.push(category);
      filters.push(`cl.category ILIKE $${params.length}`);
    }
    if (min_price) {
      params.push(parseFloat(min_price));
      filters.push(`cl.price_per_kg >= $${params.length}`);
    }
    if (max_price) {
      params.push(parseFloat(max_price));
      filters.push(`cl.price_per_kg <= $${params.length}`);
    }

    const sortMap = {
      newest:        'cl.created_at DESC',
      price_asc:     'cl.price_per_kg ASC NULLS LAST',
      price_desc:    'cl.price_per_kg DESC NULLS LAST',
      district:      'cl.district ASC',
    };
    const orderBy = sortMap[sort] || 'cl.created_at DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const query = `
      SELECT cl.*,
             u.first_name || ' ' || u.last_name AS seller_name,
             u.district AS seller_district,
             (SELECT COUNT(*) FROM rental_ledger rl WHERE rl.owner_id = cl.seller_id) AS seller_rep
      FROM crop_listings cl
      JOIN users u ON u.id = cl.seller_id AND u.status = 'approved'
      WHERE ${filters.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const [data, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(
        `SELECT COUNT(*) FROM crop_listings cl JOIN users u ON u.id = cl.seller_id AND u.status='approved'
         WHERE ${filters.join(' AND ')}`,
        params.slice(0, -2)   // exclude limit/offset
      )
    ]);

    res.json({
      success: true,
      listings: data.rows,
      total:    parseInt(countResult.rows[0].count),
      page:     parseInt(page),
      pages:    Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/buyer/marketplace/equipment
 * Query: search, district, type, max_rate, sort, page, limit
 */
router.get('/marketplace/equipment', async (req, res) => {
  const {
    search, district, type, max_rate,
    sort = 'newest', page = 1, limit = 24
  } = req.query;

  try {
    const filters = [`el.status = 'available'`];
    const params  = [];

    if (search) {
      params.push(`%${search}%`);
      filters.push(`(el.name ILIKE $${params.length} OR el.description ILIKE $${params.length})`);
    }
    if (district) {
      params.push(district);
      filters.push(`el.district ILIKE $${params.length}`);
    }
    if (type) {
      params.push(type);
      filters.push(`el.type ILIKE $${params.length}`);
    }
    if (max_rate) {
      params.push(parseFloat(max_rate));
      filters.push(`el.rental_rate <= $${params.length}`);
    }

    const sortMap = {
      newest:     'el.created_at DESC',
      price_asc:  'el.rental_rate ASC NULLS LAST',
      price_desc: 'el.rental_rate DESC NULLS LAST',
    };
    const orderBy = sortMap[sort] || 'el.created_at DESC';
    const offset  = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const result = await pool.query(
      `SELECT el.*,
              u.first_name || ' ' || u.last_name AS owner_name,
              u.phone AS owner_phone
       FROM equipment_listings el
       JOIN users u ON u.id = el.owner_id AND u.status = 'approved'
       WHERE ${filters.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ success: true, listings: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/buyer/marketplace/crops/:id — single listing detail
router.get('/marketplace/crops/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cl.*,
              u.first_name || ' ' || u.last_name AS seller_name,
              u.phone AS seller_phone, u.district AS seller_district,
              u.email AS seller_email,
              (SELECT COUNT(*) FROM rental_ledger rl WHERE rl.owner_id=cl.seller_id) AS seller_rep
       FROM crop_listings cl
       JOIN users u ON u.id = cl.seller_id
       WHERE cl.id=$1 AND cl.status='active'`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Listing not found' });
    res.json({ success: true, listing: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/buyer/marketplace/equipment/:id
router.get('/marketplace/equipment/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT el.*,
              u.first_name || ' ' || u.last_name AS owner_name,
              u.phone AS owner_phone, u.district AS owner_district,
              (SELECT json_agg(eb.*) FILTER (WHERE eb.status IN ('confirmed'))
               FROM equipment_bookings eb WHERE eb.listing_id=el.id) AS confirmed_bookings
       FROM equipment_listings el
       JOIN users u ON u.id = el.owner_id
       WHERE el.id=$1 AND el.status != 'deactivated'`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Listing not found' });
    res.json({ success: true, listing: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Express interest in a crop listing ────────────────────────────────────────
// POST /api/buyer/marketplace/crops/:id/interest
router.post('/marketplace/crops/:id/interest', async (req, res) => {
  const { buyer_id } = req.body;
  if (!buyer_id) return res.status(400).json({ error: 'buyer_id is required' });
  try {
    const listing = await pool.query(
      `SELECT cl.seller_id, cl.name,
              u.first_name AS buyer_first
       FROM crop_listings cl
       CROSS JOIN users u
       WHERE cl.id=$1 AND cl.status='active' AND u.id=$2`,
      [req.params.id, buyer_id]
    );
    if (!listing.rows.length) return res.status(404).json({ error: 'Listing not found' });
    const { seller_id, name, buyer_first } = listing.rows[0];

    await pushNotification(
      seller_id, 'request',
      `New interest in "${name}"`,
      `${buyer_first} expressed interest in your "${name}" listing.`
    );

    res.json({ success: true, message: 'Interest registered. Seller notified.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  EQUIPMENT BOOKINGS (buyer side) (FR5)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/buyer/bookings
 * Body: { buyer_id, listing_id, start_date, end_date }
 */
router.post('/bookings', async (req, res) => {
  const { buyer_id, listing_id, start_date, end_date } = req.body;
  if (!buyer_id || !listing_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'buyer_id, listing_id, start_date, end_date are required' });
  }
  try {
    // Check listing exists and is available
    const listing = await pool.query(
      `SELECT * FROM equipment_listings WHERE id=$1 AND status='available'`, [listing_id]
    );
    if (!listing.rows.length) {
      return res.status(409).json({ error: 'Equipment is not available for booking' });
    }

    // Check no overlapping confirmed bookings
    const overlap = await pool.query(
      `SELECT id FROM equipment_bookings
       WHERE listing_id=$1 AND status='confirmed'
         AND NOT (end_date < $2 OR start_date > $3)`,
      [listing_id, start_date, end_date]
    );
    if (overlap.rows.length) {
      return res.status(409).json({ error: 'Selected dates overlap with an existing booking' });
    }

    const el   = listing.rows[0];
    const days = Math.ceil((new Date(end_date) - new Date(start_date)) / 86400000) + 1;
    const total = (el.rental_rate || 0) * days;

    const result = await pool.query(
      `INSERT INTO equipment_bookings (listing_id, renter_id, owner_id, start_date, end_date, total_amount)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [listing_id, buyer_id, el.owner_id, start_date, end_date, total]
    );

    // Notify the equipment owner
    const buyer = await pool.query(
      `SELECT first_name FROM users WHERE id=$1`, [buyer_id]
    );
    await pushNotification(
      el.owner_id, 'booking',
      `New booking request for "${el.name}"`,
      `${buyer.rows[0]?.first_name || 'A buyer'} has requested to rent "${el.name}" from ${start_date} to ${end_date}. Total: Rs. ${total.toLocaleString()}.`
    );

    res.status(201).json({ success: true, booking: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/buyer/bookings?buyer_id=&status=
router.get('/bookings', async (req, res) => {
  const { buyer_id, status } = req.query;
  if (!buyer_id) return res.status(400).json({ error: 'buyer_id is required' });
  try {
    const statusFilter = status ? 'AND eb.status = $2' : '';
    const params = status ? [buyer_id, status] : [buyer_id];
    const result = await pool.query(
      `SELECT eb.*, el.name AS listing_name, el.rental_rate, el.district,
              u.first_name || ' ' || u.last_name AS owner_name,
              u.phone AS owner_phone
       FROM equipment_bookings eb
       JOIN equipment_listings el ON el.id = eb.listing_id
       JOIN users u ON u.id = eb.owner_id
       WHERE eb.renter_id = $1 ${statusFilter}
       ORDER BY eb.created_at DESC`,
      params
    );
    res.json({ success: true, bookings: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/buyer/bookings/:id — buyer cancels
router.delete('/bookings/:id', async (req, res) => {
  const { buyer_id } = req.body;
  if (!buyer_id) return res.status(400).json({ error: 'buyer_id is required' });
  try {
    const result = await pool.query(
      `UPDATE equipment_bookings SET status='cancelled'
       WHERE id=$1 AND renter_id=$2 AND status='pending'
       RETURNING *, (SELECT name FROM equipment_listings WHERE id=listing_id) AS listing_name`,
      [req.params.id, buyer_id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Booking not found or cannot be cancelled' });
    }
    // Re-open the listing
    await pool.query(
      `UPDATE equipment_listings SET status='available', updated_at=NOW() WHERE id=$1`,
      [result.rows[0].listing_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  BUYER BROADCAST REQUESTS (FR6)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/buyer/broadcasts
 * Creates a request and broadcasts it to relevant sellers (in-app notification).
 * Body: { buyer_id, crop, qty, district, ... all optional fields }
 */
router.post('/broadcasts', async (req, res) => {
  const {
    buyer_id, crop, quantity, unit, category,
    quality, urgency, budget, price_type,
    payment_method, payment_terms, delivery_type,
    district, address, needed_by,
    phone, whatsapp, email, notes,
    buyer_name
  } = req.body;

  if (!buyer_id || !crop || !quantity || !district) {
    return res.status(400).json({ error: 'buyer_id, crop, quantity, and district are required' });
  }

  try {
    // Resolve buyer name if not provided
    let resolvedName = buyer_name;
    if (!resolvedName) {
      const u = await pool.query(`SELECT first_name FROM users WHERE id=$1`, [buyer_id]);
      resolvedName = u.rows[0]?.first_name || 'Buyer';
    }

    const result = await pool.query(
      `INSERT INTO buyer_requests
         (buyer_id, buyer_name, crop, category, quantity, unit, quality, urgency,
          budget, price_type, payment_method, payment_terms, delivery_type,
          district, address, needed_by, phone, whatsapp, email, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [buyer_id, resolvedName, crop, category||null, quantity, unit||null, quality||null,
       urgency||null, budget||null, price_type||null, payment_method||null,
       payment_terms||null, delivery_type||null, district, address||null,
       needed_by||null, phone||null, whatsapp||null, email||null, notes||null]
    );

    const broadcast = result.rows[0];

    // Notify all approved sellers in the same district who list this crop
    const sellers = await pool.query(
      `SELECT DISTINCT u.id FROM users u
       JOIN crop_listings cl ON cl.seller_id = u.id AND cl.status='active'
       WHERE u.status='approved' AND u.role IN ('seller','farmer')
         AND (u.district ILIKE $1 OR cl.district ILIKE $1)
         AND cl.name ILIKE $2`,
      [district, `%${crop}%`]
    );

    const notifyAll = sellers.rows.map(s =>
      pushNotification(
        s.id, 'request',
        `📢 New Buyer Request: ${crop}`,
        `${resolvedName} from ${district} needs ${quantity} of ${crop}.${budget ? ' Budget: Rs. ' + budget : ''} Respond now!`
      )
    );
    await Promise.allSettled(notifyAll);

    res.status(201).json({
      success: true,
      broadcast,
      notified_sellers: sellers.rows.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/buyer/broadcasts?buyer_id=&status=open
router.get('/broadcasts', async (req, res) => {
  const { buyer_id, status } = req.query;
  if (!buyer_id) return res.status(400).json({ error: 'buyer_id is required' });
  try {
    const statusFilter = status ? 'AND br.status = $2' : '';
    const params = status ? [buyer_id, status] : [buyer_id];
    const result = await pool.query(
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
    res.json({ success: true, broadcasts: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/buyer/broadcasts/:id  — single broadcast with full response thread
router.get('/broadcasts/:id', async (req, res) => {
  const { buyer_id } = req.query;
  try {
    const result = await pool.query(
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
      buyer_id ? [req.params.id, buyer_id] : [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Broadcast not found' });
    res.json({ success: true, broadcast: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/buyer/broadcasts/:id — buyer withdraws request
router.delete('/broadcasts/:id', async (req, res) => {
  const { buyer_id } = req.body;
  if (!buyer_id) return res.status(400).json({ error: 'buyer_id is required' });
  try {
    const result = await pool.query(
      `UPDATE buyer_requests SET status='closed' WHERE id=$1 AND buyer_id=$2 AND status='open' RETURNING id`,
      [req.params.id, buyer_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Request not found or already closed' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/buyer/broadcasts/:id/accept-response  — buyer accepts a seller's counter/response
router.post('/broadcasts/:id/accept-response', async (req, res) => {
  const { buyer_id, response_id } = req.body;
  if (!buyer_id || !response_id) return res.status(400).json({ error: 'buyer_id and response_id are required' });
  try {
    const br = await pool.query(
      `SELECT * FROM buyer_requests WHERE id=$1 AND buyer_id=$2`, [req.params.id, buyer_id]
    );
    if (!br.rows.length) return res.status(404).json({ error: 'Broadcast not found' });

    // Close the request
    await pool.query(`UPDATE buyer_requests SET status='closed' WHERE id=$1`, [req.params.id]);

    // Get the response to notify seller
    const rr = await pool.query(`SELECT * FROM request_responses WHERE id=$1`, [response_id]);
    if (rr.rows.length) {
      await pushNotification(
        rr.rows[0].seller_id, 'response',
        '🎉 Your offer was accepted!',
        `The buyer accepted your ${rr.rows[0].type} for "${br.rows[0].crop}". Contact them to arrange delivery.`
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  NOTIFICATIONS (buyer)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/buyer/notifications?user_id=&unread_only=true
router.get('/notifications', async (req, res) => {
  const { user_id, unread_only } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  try {
    const filter = unread_only === 'true' ? 'AND is_read = FALSE' : '';
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id=$1 ${filter} ORDER BY created_at DESC LIMIT 50`,
      [user_id]
    );
    const unread = result.rows.filter(n => !n.is_read).length;
    res.json({ success: true, notifications: result.rows, unread_count: unread });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/buyer/notifications/read-all
router.post('/notifications/read-all', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  try {
    await pool.query(`UPDATE notifications SET is_read=TRUE WHERE user_id=$1`, [user_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  BUYER DASHBOARD SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/buyer/dashboard?buyer_id=
router.get('/dashboard', async (req, res) => {
  const { buyer_id } = req.query;
  if (!buyer_id) return res.status(400).json({ error: 'buyer_id is required' });
  try {
    const [broadcasts, bookings, notifications] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status='open') AS open,
           COUNT(*) FILTER (WHERE status='closed') AS closed
         FROM buyer_requests WHERE buyer_id=$1`,
        [buyer_id]
      ),
      pool.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status='confirmed') AS confirmed,
           COUNT(*) FILTER (WHERE status='pending') AS pending
         FROM equipment_bookings WHERE renter_id=$1`,
        [buyer_id]
      ),
      pool.query(
        `SELECT COUNT(*) AS unread FROM notifications WHERE user_id=$1 AND is_read=FALSE`,
        [buyer_id]
      ),
    ]);

    // Recent broadcasts with response count
    const recent = await pool.query(
      `SELECT br.id, br.crop, br.quantity, br.district, br.status, br.created_at,
              (SELECT COUNT(*) FROM request_responses rr WHERE rr.request_id=br.id) AS response_count
       FROM buyer_requests br
       WHERE br.buyer_id=$1
       ORDER BY br.created_at DESC LIMIT 5`,
      [buyer_id]
    );

    res.json({
      success: true,
      dashboard: {
        broadcasts:    broadcasts.rows[0],
        bookings:      bookings.rows[0],
        notifications: notifications.rows[0],
        recent_broadcasts: recent.rows
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;