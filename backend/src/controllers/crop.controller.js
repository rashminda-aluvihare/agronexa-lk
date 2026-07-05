const db = require('../config/db');
const auditService = require('../services/audit.service');
const notificationService = require('../services/notification.service');
const ledgerService = require('../services/ledger.service');

/**
 * GET /api/seller/crops (under seller crops)
 */
async function getSellerCrops(req, res, next) {
  const seller_id = req.query.seller_id || req.auth.id;
  const { status } = req.query;

  if (!seller_id) {
    return res.status(400).json({ error: 'seller_id is required' });
  }

  try {
    const statusFilter = status ? 'AND status = $2' : '';
    const params = status ? [seller_id, status] : [seller_id];
    
    const result = await db.query(
      `SELECT * FROM crop_listings 
       WHERE seller_id = $1 ${statusFilter} 
       ORDER BY created_at DESC`,
      params
    );
    return res.json({ success: true, listings: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/seller/crops
 */
async function createCropListing(req, res, next) {
  try {
    const seller_id = req.body.seller_id || req.auth.id;
    const {
      name,
      category,
      quantity_kg,
      price_per_kg,
      district,
      available_date,
      description,
    } = req.body;

    if (!seller_id || !name) {
      return res.status(400).json({ error: 'seller_id and name are required' });
    }

    const photos = (req.files || []).map((f) => 'uploads/listings/' + f.filename);

    const result = await db.query(
      `INSERT INTO crop_listings
         (seller_id, name, category, quantity_kg, price_per_kg, district, available_date, description, photos, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
       RETURNING *`,
      [
        seller_id,
        name,
        category || null,
        quantity_kg ? parseFloat(quantity_kg) : null,
        price_per_kg ? parseFloat(price_per_kg) : null,
        district || null,
        available_date || null,
        description || null,
        photos,
      ]
    );

    const newListing = result.rows[0];

    // Audit log
    await auditService.logAction(seller_id, 'CREATE_CROP_LISTING', req.ip, { id: newListing.id, name });

    return res.status(201).json({ success: true, listing: newListing });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/seller/crops/:id
 */
async function updateCropListing(req, res, next) {
  const { id } = req.params;
  const seller_id = req.body.seller_id || req.auth.id;

  if (!seller_id) {
    return res.status(400).json({ error: 'seller_id is required' });
  }

  try {
    const existing = await db.query(
      'SELECT * FROM crop_listings WHERE id = $1 AND seller_id = $2',
      [id, seller_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const current = existing.rows[0];
    const {
      name,
      category,
      quantity_kg,
      price_per_kg,
      district,
      available_date,
      description,
      status,
    } = req.body;

    const photos = req.files && req.files.length
      ? req.files.map((f) => 'uploads/listings/' + f.filename)
      : current.photos;

    const result = await db.query(
      `UPDATE crop_listings SET
         name = $1, category = $2, quantity_kg = $3, price_per_kg = $4,
         district = $5, available_date = $6, description = $7, photos = $8,
         status = COALESCE($9, status), updated_at = NOW()
       WHERE id = $10 AND seller_id = $11
       RETURNING *`,
      [
        name || current.name,
        category !== undefined ? category : current.category,
        quantity_kg !== undefined ? parseFloat(quantity_kg) : current.quantity_kg,
        price_per_kg !== undefined ? parseFloat(price_per_kg) : current.price_per_kg,
        district || current.district,
        available_date || current.available_date,
        description !== undefined ? description : current.description,
        photos,
        status || null,
        id,
        seller_id,
      ]
    );

    const updatedListing = result.rows[0];

    // Audit log
    await auditService.logAction(seller_id, 'UPDATE_CROP_LISTING', req.ip, { id });

    return res.json({ success: true, listing: updatedListing });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/seller/crops/:id (soft-delete: status -> deactivated)
 */
async function deleteCropListing(req, res, next) {
  const { id } = req.params;
  const seller_id = req.body.seller_id || req.auth.id;

  if (!seller_id) {
    return res.status(400).json({ error: 'seller_id is required' });
  }

  try {
    const result = await db.query(
      `UPDATE crop_listings SET status = 'deactivated', updated_at = NOW()
       WHERE id = $1 AND seller_id = $2 RETURNING id`,
      [id, seller_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    // Audit log
    await auditService.logAction(seller_id, 'DELETE_CROP_LISTING', req.ip, { id });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/buyer/marketplace/crops
 */
async function browseMarketplaceCrops(req, res, next) {
  const {
    search,
    district,
    category,
    min_price,
    max_price,
    sort = 'newest',
    page = 1,
    limit = 24,
  } = req.query;

  try {
    const filters = [`cl.status = 'active'`];
    const params = [];

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
      newest: 'cl.created_at DESC',
      price_asc: 'cl.price_per_kg ASC NULLS LAST',
      price_desc: 'cl.price_per_kg DESC NULLS LAST',
      district: 'cl.district ASC',
    };
    const orderBy = sortMap[sort] || 'cl.created_at DESC';

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    params.push(parseInt(limit, 10), offset);

    const queryStr = `
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
      db.query(queryStr, params),
      db.query(
        `SELECT COUNT(*) FROM crop_listings cl JOIN users u ON u.id = cl.seller_id AND u.status='approved'
         WHERE ${filters.join(' AND ')}`,
        params.slice(0, -2) // exclude limit/offset
      ),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    return res.json({
      success: true,
      listings: data.rows,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/buyer/marketplace/crops/:id
 */
async function getCropListingDetail(req, res, next) {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT cl.*,
              u.first_name || ' ' || u.last_name AS seller_name,
              u.phone AS seller_phone, u.district AS seller_district,
              u.email AS seller_email,
              (SELECT COUNT(*) FROM rental_ledger rl WHERE rl.owner_id = cl.seller_id) AS seller_rep
       FROM crop_listings cl
       JOIN users u ON u.id = cl.seller_id
       WHERE cl.id = $1 AND cl.status = 'active'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    return res.json({ success: true, listing: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/buyer/marketplace/crops/:id/interest
 */
async function expressInterest(req, res, next) {
  const { id } = req.params;
  const buyer_id = req.body.buyer_id || req.auth.id;

  if (!buyer_id) {
    return res.status(400).json({ error: 'buyer_id is required' });
  }

  try {
    const listing = await db.query(
      `SELECT cl.seller_id, cl.name,
              u.first_name AS buyer_first
       FROM crop_listings cl
       CROSS JOIN users u
       WHERE cl.id = $1 AND cl.status = 'active' AND u.id = $2`,
      [id, buyer_id]
    );

    if (listing.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const { seller_id, name, buyer_first } = listing.rows[0];

    // Notification
    await notificationService.pushNotification(
      seller_id,
      'request',
      `New interest in "${name}"`,
      `${buyer_first} expressed interest in your "${name}" listing. Contact them soon!`
    );

    // Audit log
    await auditService.logAction(buyer_id, 'EXPRESS_CROP_INTEREST', req.ip, { listing_id: id });

    return res.json({ success: true, message: 'Interest registered. Seller notified.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST/PUT /api/seller/crops/:id/update-stock
 */
async function updateCropStock(req, res, next) {
  const { id } = req.params;
  const seller_id = req.body.seller_id || req.auth.id;
  const { quantity_kg } = req.body;

  if (!seller_id) {
    return res.status(400).json({ error: 'seller_id is required' });
  }

  try {
    const result = await db.query(
      `UPDATE crop_listings SET quantity_kg = $1, updated_at = NOW()
       WHERE id = $2 AND seller_id = $3 RETURNING *`,
      [quantity_kg, id, seller_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    return res.json({ success: true, listing: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/seller/analytics
 */
async function getSellerAnalytics(req, res, next) {
  const seller_id = req.query.seller_id || (req.auth && req.auth.id);

  if (!seller_id) {
    return res.status(400).json({ error: 'seller_id is required' });
  }

  try {
    const [crops, equipment, bookings, ledger] = await Promise.all([
      db.query(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='active') AS active
         FROM crop_listings WHERE seller_id = $1`, [seller_id]
      ),
      db.query(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='available') AS available
         FROM equipment_listings WHERE owner_id = $1`, [seller_id]
      ),
      db.query(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='confirmed') AS confirmed
         FROM equipment_bookings WHERE owner_id = $1`, [seller_id]
      ),
      db.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_revenue, COUNT(*) AS tx_count
         FROM rental_ledger WHERE owner_id = $1`, [seller_id]
      ),
    ]);

    return res.json({
      success: true,
      analytics: {
        crop_listings: crops.rows[0],
        equipment_listings: equipment.rows[0],
        bookings: bookings.rows[0],
        ledger: ledger.rows[0],
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/buyer/crop-orders (place crop order)
 */
async function placeCropOrder(req, res, next) {
  const buyer_id = req.body.buyer_id || req.auth.id;
  const { crop_listing_id, quantity_kg, delivery_date } = req.body;

  if (!buyer_id || !crop_listing_id || !quantity_kg) {
    return res.status(400).json({ error: 'buyer_id, crop_listing_id, and quantity_kg are required' });
  }

  try {
    // 1. Get the crop listing
    const listingRes = await db.query(
      `SELECT * FROM crop_listings WHERE id = $1 AND status = 'active'`,
      [crop_listing_id]
    );
    if (listingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Crop listing not found or inactive' });
    }
    const listing = listingRes.rows[0];

    // 2. Validate quantity
    const qtyRequested = parseFloat(quantity_kg);
    const qtyAvailable = parseFloat(listing.quantity_kg);
    if (qtyRequested <= 0 || qtyRequested > qtyAvailable) {
      return res.status(400).json({ error: `Invalid quantity requested. Available stock: ${qtyAvailable} kg` });
    }

    // 3. Compute amount
    const pricePerKg = parseFloat(listing.price_per_kg);
    const totalAmount = qtyRequested * pricePerKg;

    // 4. Insert order
    const result = await db.query(
      `INSERT INTO crop_orders 
         (crop_listing_id, buyer_id, seller_id, quantity_kg, price_per_kg, total_amount, delivery_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [crop_listing_id, buyer_id, listing.seller_id, qtyRequested, pricePerKg, totalAmount, delivery_date || null]
    );

    const order = result.rows[0];

    // 5. Notify seller
    const buyerRes = await db.query('SELECT first_name FROM users WHERE id = $1', [buyer_id]);
    const buyerName = buyerRes.rows[0]?.first_name || 'A buyer';

    await notificationService.pushNotification(
      listing.seller_id,
      'booking',
      `New Crop Order: ${listing.name}`,
      `${buyerName} requested to buy ${qtyRequested} kg of your ${listing.name} for Rs. ${totalAmount.toLocaleString()}.`
    );

    // Audit log
    await auditService.logAction(buyer_id, 'PLACE_CROP_ORDER', req.ip, { id: order.id, crop_listing_id });

    return res.status(201).json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/buyer/crop-orders (buyer history)
 */
async function getBuyerCropOrders(req, res, next) {
  const buyer_id = req.query.buyer_id || req.auth.id;
  if (!buyer_id) {
    return res.status(400).json({ error: 'buyer_id is required' });
  }
  try {
    const result = await db.query(
      `SELECT co.*, cl.name AS crop_name, cl.district,
              u.first_name || ' ' || u.last_name AS seller_name,
              u.phone AS seller_phone
       FROM crop_orders co
       JOIN crop_listings cl ON cl.id = co.crop_listing_id
       JOIN users u ON u.id = co.seller_id
       WHERE co.buyer_id = $1
       ORDER BY co.created_at DESC`,
      [buyer_id]
    );
    return res.json({ success: true, orders: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/seller/crop-orders (seller incoming)
 */
async function getSellerCropOrders(req, res, next) {
  const seller_id = req.query.seller_id || req.auth.id;
  if (!seller_id) {
    return res.status(400).json({ error: 'seller_id is required' });
  }
  try {
    const result = await db.query(
      `SELECT co.*, cl.name AS crop_name,
              u.first_name || ' ' || u.last_name AS buyer_name,
              u.phone AS buyer_phone, u.email AS buyer_email
       FROM crop_orders co
       JOIN crop_listings cl ON cl.id = co.crop_listing_id
       JOIN users u ON u.id = co.buyer_id
       WHERE co.seller_id = $1
       ORDER BY co.created_at DESC`,
      [seller_id]
    );
    return res.json({ success: true, orders: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/seller/crop-orders/:id/confirm (farmer confirms order)
 */
async function confirmCropOrder(req, res, next) {
  const { id } = req.params;
  const seller_id = req.body.seller_id || req.auth.id;

  if (!seller_id) {
    return res.status(400).json({ error: 'seller_id is required' });
  }

  try {
    // 1. Get and update order status
    const orderRes = await db.query(
      `UPDATE crop_orders SET status = 'confirmed'
       WHERE id = $1 AND seller_id = $2 AND status = 'pending'
       RETURNING *`,
      [id, seller_id]
    );
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Crop order not found or already processed' });
    }
    const order = orderRes.rows[0];

    // 2. Fetch current crop listing to check stock
    const listingRes = await db.query(
      `SELECT * FROM crop_listings WHERE id = $1`,
      [order.crop_listing_id]
    );
    if (listingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Crop listing not found' });
    }
    const listing = listingRes.rows[0];

    // 3. Deduct stock quantity
    const newQty = Math.max(0, parseFloat(listing.quantity_kg) - parseFloat(order.quantity_kg));
    const newStatus = newQty <= 0 ? 'deactivated' : 'active';

    await db.query(
      `UPDATE crop_listings SET quantity_kg = $1, status = $2, updated_at = NOW() WHERE id = $3`,
      [newQty, newStatus, order.crop_listing_id]
    );

    // 4. Write to blockchain ledger
    const ledgerEntry = await ledgerService.writeLedgerEntry(
      order.crop_listing_id,
      'crop',
      order.buyer_id,
      order.seller_id,
      order.total_amount,
      1
    );

    // 5. Notify buyer
    await notificationService.pushNotification(
      order.buyer_id,
      'booking',
      `Crop Order Confirmed`,
      `Your order of ${order.quantity_kg} kg of ${listing.name} was confirmed by the seller. Ledger TX: ${ledgerEntry.tx_id.slice(0, 12)}...`
    );

    // Audit log
    await auditService.logAction(seller_id, 'CONFIRM_CROP_ORDER', req.ip, { id, ledger_tx: ledgerEntry.tx_id });

    return res.json({ success: true, order, ledger_tx: ledgerEntry.tx_id });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/seller/crop-orders/:id/reject
 */
async function rejectCropOrder(req, res, next) {
  const { id } = req.params;
  const seller_id = req.body.seller_id || req.auth.id;

  if (!seller_id) {
    return res.status(400).json({ error: 'seller_id is required' });
  }

  try {
    const orderRes = await db.query(
      `UPDATE crop_orders SET status = 'rejected'
       WHERE id = $1 AND seller_id = $2 AND status = 'pending'
       RETURNING *`,
      [id, seller_id]
    );
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Crop order not found or already processed' });
    }
    const order = orderRes.rows[0];

    // Notify buyer
    await notificationService.pushNotification(
      order.buyer_id,
      'booking',
      `Crop Order Rejected`,
      `Your crop purchase request for listing #${order.crop_listing_id} was rejected by the seller.`
    );

    // Audit log
    await auditService.logAction(seller_id, 'REJECT_CROP_ORDER', req.ip, { id });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSellerCrops,
  createCropListing,
  updateCropListing,
  deleteCropListing,
  browseMarketplaceCrops,
  getCropListingDetail,
  expressInterest,
  updateCropStock,
  getSellerAnalytics,
  placeCropOrder,
  getBuyerCropOrders,
  getSellerCropOrders,
  confirmCropOrder,
  rejectCropOrder,
};
