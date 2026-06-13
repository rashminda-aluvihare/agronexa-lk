const db = require('../config/db');
const auditService = require('../services/audit.service');
const notificationService = require('../services/notification.service');
const ledgerService = require('../services/ledger.service');

// ═══════════════════════════════════════════════════════════════════════════════
//  EQUIPMENT LISTINGS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/seller/equipment
 */
async function getOwnerEquipment(req, res, next) {
  const owner_id = req.query.owner_id || req.auth.id;
  if (!owner_id) {
    return res.status(400).json({ error: 'owner_id is required' });
  }

  try {
    const result = await db.query(
      `SELECT el.*,
              COALESCE(
                json_agg(eb.*) FILTER (WHERE eb.id IS NOT NULL AND eb.status IN ('pending','confirmed')),
                '[]'
              ) AS active_bookings
       FROM equipment_listings el
       LEFT JOIN equipment_bookings eb ON eb.listing_id = el.id
       WHERE el.owner_id = $1
       GROUP BY el.id
       ORDER BY el.created_at DESC`,
      [owner_id]
    );
    return res.json({ success: true, listings: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/seller/equipment
 */
async function createEquipmentListing(req, res, next) {
  try {
    const owner_id = req.body.owner_id || req.auth.id;
    const { name, type, description, rental_rate, district, condition } = req.body;

    if (!owner_id || !name) {
      return res.status(400).json({ error: 'owner_id and name are required' });
    }

    const photos = (req.files || []).map((f) => f.path.replace(/\\/g, '/'));

    const result = await db.query(
      `INSERT INTO equipment_listings 
         (owner_id, name, type, description, rental_rate, district, condition, photos, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'available') 
       RETURNING *`,
      [
        owner_id,
        name,
        type || null,
        description || null,
        rental_rate ? parseFloat(rental_rate) : null,
        district || null,
        condition || null,
        photos,
      ]
    );

    const newListing = result.rows[0];

    // Audit log
    await auditService.logAction(owner_id, 'CREATE_EQUIPMENT', req.ip, { id: newListing.id, name });

    return res.status(201).json({ success: true, listing: newListing });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/seller/equipment/:id
 */
async function updateEquipmentListing(req, res, next) {
  const { id } = req.params;
  const owner_id = req.body.owner_id || req.auth.id;

  if (!owner_id) {
    return res.status(400).json({ error: 'owner_id is required' });
  }

  try {
    const existing = await db.query(
      'SELECT * FROM equipment_listings WHERE id = $1 AND owner_id = $2',
      [id, owner_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const current = existing.rows[0];
    const { name, type, description, rental_rate, district, condition, status } = req.body;
    const photos = req.files && req.files.length
      ? req.files.map((f) => f.path.replace(/\\/g, '/'))
      : current.photos;

    const result = await db.query(
      `UPDATE equipment_listings SET
         name = $1, type = $2, description = $3, rental_rate = $4, district = $5,
         condition = $6, photos = $7, status = COALESCE($8, status), updated_at = NOW()
       WHERE id = $9 AND owner_id = $10 
       RETURNING *`,
      [
        name || current.name,
        type || current.type,
        description !== undefined ? description : current.description,
        rental_rate !== undefined ? parseFloat(rental_rate) : current.rental_rate,
        district || current.district,
        condition || current.condition,
        photos,
        status || null,
        id,
        owner_id,
      ]
    );

    const updatedListing = result.rows[0];

    // Audit log
    await auditService.logAction(owner_id, 'UPDATE_EQUIPMENT', req.ip, { id });

    return res.json({ success: true, listing: updatedListing });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/seller/equipment/:id
 */
async function deleteEquipmentListing(req, res, next) {
  const { id } = req.params;
  const owner_id = req.body.owner_id || req.auth.id;

  if (!owner_id) {
    return res.status(400).json({ error: 'owner_id is required' });
  }

  try {
    const result = await db.query(
      `UPDATE equipment_listings SET status = 'deactivated', updated_at = NOW()
       WHERE id = $1 AND owner_id = $2 RETURNING id`,
      [id, owner_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    // Audit log
    await auditService.logAction(owner_id, 'DELETE_EQUIPMENT', req.ip, { id });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/buyer/marketplace/equipment
 */
async function browseMarketplaceEquipment(req, res, next) {
  const { search, district, type, max_rate, sort = 'newest', page = 1, limit = 24 } = req.query;

  try {
    const filters = [`el.status = 'available'`];
    const params = [];

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
      newest: 'el.created_at DESC',
      price_asc: 'el.rental_rate ASC NULLS LAST',
      price_desc: 'el.rental_rate DESC NULLS LAST',
    };
    const orderBy = sortMap[sort] || 'el.created_at DESC';
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    params.push(parseInt(limit, 10), offset);

    const result = await db.query(
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

    return res.json({ success: true, listings: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/buyer/marketplace/equipment/:id
 */
async function getEquipmentListingDetail(req, res, next) {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT el.*,
              u.first_name || ' ' || u.last_name AS owner_name,
              u.phone AS owner_phone, u.district AS owner_district,
              (SELECT json_agg(eb.*) FILTER (WHERE eb.status IN ('confirmed'))
               FROM equipment_bookings eb WHERE eb.listing_id = el.id) AS confirmed_bookings
       FROM equipment_listings el
       JOIN users u ON u.id = el.owner_id
       WHERE el.id = $1 AND el.status != 'deactivated'`,
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

// ═══════════════════════════════════════════════════════════════════════════════
//  EQUIPMENT BOOKINGS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/buyer/bookings (book equipment)
 */
async function bookEquipment(req, res, next) {
  const { buyer_id, listing_id, start_date, end_date } = req.body;
  const renter_id = buyer_id || req.auth.id;

  if (!renter_id || !listing_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'buyer_id, listing_id, start_date, and end_date are required' });
  }

  try {
    // 1. Check listing availability
    const listing = await db.query(
      `SELECT * FROM equipment_listings WHERE id = $1 AND status = 'available'`,
      [listing_id]
    );
    if (listing.rows.length === 0) {
      return res.status(409).json({ error: 'Equipment is not available for booking' });
    }

    // 2. Check overlap
    const overlap = await db.query(
      `SELECT id FROM equipment_bookings
       WHERE listing_id = $1 AND status = 'confirmed'
         AND NOT (end_date < $2 OR start_date > $3)`,
      [listing_id, start_date, end_date]
    );
    if (overlap.rows.length > 0) {
      return res.status(409).json({ error: 'Selected dates overlap with an existing booking' });
    }

    const el = listing.rows[0];
    const durationDays = Math.ceil((new Date(end_date) - new Date(start_date)) / 86400000) + 1;
    const totalAmount = (el.rental_rate || 0) * durationDays;

    // 3. Create booking
    const result = await db.query(
      `INSERT INTO equipment_bookings 
         (listing_id, renter_id, owner_id, start_date, end_date, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') 
       RETURNING *`,
      [listing_id, renter_id, el.owner_id, start_date, end_date, totalAmount]
    );

    const booking = result.rows[0];

    // 4. Resolve renter name and notify owner
    const buyerResult = await db.query('SELECT first_name FROM users WHERE id = $1', [renter_id]);
    const buyerName = buyerResult.rows[0]?.first_name || 'A buyer';

    await notificationService.pushNotification(
      el.owner_id,
      'booking',
      `New booking request for "${el.name}"`,
      `${buyerName} has requested to rent "${el.name}" from ${start_date} to ${end_date}. Total: Rs. ${totalAmount.toLocaleString()}.`
    );

    // Audit log
    await auditService.logAction(renter_id, 'BOOK_EQUIPMENT', req.ip, { id: booking.id, listing_id });

    return res.status(201).json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/buyer/bookings (buyer side history)
 */
async function getBuyerBookings(req, res, next) {
  const buyer_id = req.query.buyer_id || req.auth.id;
  const { status } = req.query;

  if (!buyer_id) {
    return res.status(400).json({ error: 'buyer_id is required' });
  }

  try {
    const statusFilter = status ? 'AND eb.status = $2' : '';
    const params = status ? [buyer_id, status] : [buyer_id];

    const result = await db.query(
      `SELECT eb.*, el.name AS listing_name, el.rental_rate, el.district,
              u.first_name || ' ' || u.last_name AS owner_name,
              u.phone AS owner_phone, u.email AS owner_email
       FROM equipment_bookings eb
       JOIN equipment_listings el ON el.id = eb.listing_id
       JOIN users u ON u.id = eb.owner_id
       WHERE eb.renter_id = $1 ${statusFilter}
       ORDER BY eb.created_at DESC`,
      params
    );
    return res.json({ success: true, bookings: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/buyer/bookings/:id (buyer cancels pending)
 */
async function cancelBooking(req, res, next) {
  const { id } = req.params;
  const buyer_id = req.body.buyer_id || req.auth.id;

  if (!buyer_id) {
    return res.status(400).json({ error: 'buyer_id is required' });
  }

  try {
    // Only cancel if booking is still pending
    const result = await db.query(
      `UPDATE equipment_bookings SET status = 'cancelled'
       WHERE id = $1 AND renter_id = $2 AND status = 'pending'
       RETURNING *, (SELECT name FROM equipment_listings WHERE id = listing_id) AS listing_name`,
      [id, buyer_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or cannot be cancelled' });
    }

    const cancelledBooking = result.rows[0];

    // Re-open listing
    await db.query(
      `UPDATE equipment_listings SET status = 'available', updated_at = NOW() 
       WHERE id = $1`,
      [cancelledBooking.listing_id]
    );

    // Notify owner
    await notificationService.pushNotification(
      cancelledBooking.owner_id,
      'booking',
      'Booking Cancelled',
      `A booking request for your equipment "${cancelledBooking.listing_name}" was cancelled by the renter.`
    );

    // Audit log
    await auditService.logAction(buyer_id, 'CANCEL_BOOKING', req.ip, { id });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/seller/bookings (owner side incoming)
 */
async function getSellerBookings(req, res, next) {
  const owner_id = req.query.owner_id || req.auth.id;
  const { status } = req.query;

  if (!owner_id) {
    return res.status(400).json({ error: 'owner_id is required' });
  }

  try {
    const statusFilter = status ? 'AND eb.status = $2' : '';
    const params = status ? [owner_id, status] : [owner_id];

    const result = await db.query(
      `SELECT eb.*, el.name AS listing_name, el.rental_rate,
              u.first_name || ' ' || u.last_name AS renter_name,
              u.phone AS renter_phone, u.email AS renter_email
       FROM equipment_bookings eb
       JOIN equipment_listings el ON el.id = eb.listing_id
       JOIN users u ON u.id = eb.renter_id
       WHERE eb.owner_id = $1 ${statusFilter}
       ORDER BY eb.created_at DESC`,
      params
    );
    return res.json({ success: true, bookings: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/seller/bookings/:id/confirm (owner approves)
 */
async function confirmBooking(req, res, next) {
  const { id } = req.params;
  const owner_id = req.body.owner_id || req.auth.id;

  if (!owner_id) {
    return res.status(400).json({ error: 'owner_id is required' });
  }

  try {
    const booking = await db.query(
      `UPDATE equipment_bookings SET status = 'confirmed'
       WHERE id = $1 AND owner_id = $2 AND status = 'pending'
       RETURNING *`,
      [id, owner_id]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or already actioned' });
    }

    const b = booking.rows[0];

    // Block the listing calendar (status -> booked)
    await db.query(
      `UPDATE equipment_listings SET status = 'booked', updated_at = NOW() WHERE id = $1`,
      [b.listing_id]
    );

    // Calculate days
    const durationDays = Math.ceil((new Date(b.end_date) - new Date(b.start_date)) / 86400000) + 1;

    // Write to blockchain-inspired rental ledger
    const ledgerEntry = await ledgerService.writeLedgerEntry(
      b.listing_id,
      'equipment',
      b.renter_id,
      b.owner_id,
      b.total_amount,
      durationDays
    );

    // Notify renter
    await notificationService.pushNotification(
      b.renter_id,
      'booking',
      'Booking Confirmed ✅',
      `Your equipment booking has been confirmed. Transaction TX: ${ledgerEntry.tx_id.slice(0, 12)}...`
    );

    // Audit log
    await auditService.logAction(owner_id, 'CONFIRM_BOOKING', req.ip, { id, ledger_tx: ledgerEntry.tx_id });

    return res.json({ success: true, booking: b, ledger_tx: ledgerEntry.tx_id });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/seller/bookings/:id/reject
 */
async function rejectBooking(req, res, next) {
  const { id } = req.params;
  const { reason } = req.body;
  const owner_id = req.body.owner_id || req.auth.id;

  if (!owner_id) {
    return res.status(400).json({ error: 'owner_id is required' });
  }

  try {
    const booking = await db.query(
      `UPDATE equipment_bookings SET status = 'rejected'
       WHERE id = $1 AND owner_id = $2 AND status = 'pending'
       RETURNING *`,
      [id, owner_id]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or already actioned' });
    }

    const b = booking.rows[0];

    // Notify renter
    await notificationService.pushNotification(
      b.renter_id,
      'booking',
      'Booking Rejected ❌',
      `Your equipment booking request was rejected. ${reason ? 'Reason: ' + reason : ''}`
    );

    // Audit log
    await auditService.logAction(owner_id, 'REJECT_BOOKING', req.ip, { id, reason });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/seller/bookings/:id/complete (owner marks returned)
 */
async function completeBooking(req, res, next) {
  const { id } = req.params;
  const { extra_charges, return_notes } = req.body;
  const owner_id = req.body.owner_id || req.auth.id;

  if (!owner_id) {
    return res.status(400).json({ error: 'owner_id is required' });
  }

  try {
    const booking = await db.query(
      `UPDATE equipment_bookings 
       SET status = 'completed', 
           extra_charges = $1, 
           return_notes = $2, 
           returned_at = NOW()
       WHERE id = $3 AND owner_id = $4 AND status = 'confirmed'
       RETURNING *`,
      [extra_charges ? parseFloat(extra_charges) : 0.0, return_notes || null, id, owner_id]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found, unauthorized, or not in confirmed status' });
    }

    const b = booking.rows[0];

    // Release the listing back to 'available'
    await db.query(
      `UPDATE equipment_listings 
       SET status = 'available', updated_at = NOW() 
       WHERE id = $1`,
      [b.listing_id]
    );

    // Notify renter
    await notificationService.pushNotification(
      b.renter_id,
      'booking',
      'Equipment Rental Completed 🚜',
      `Your rental booking has been marked as completed/returned by the owner. Final Receipt is now available.`
    );

    // Audit log
    await auditService.logAction(owner_id, 'COMPLETE_BOOKING', req.ip, { id, extra_charges });

    return res.json({ success: true, booking: b });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOwnerEquipment,
  createEquipmentListing,
  updateEquipmentListing,
  deleteEquipmentListing,
  browseMarketplaceEquipment,
  getEquipmentListingDetail,
  bookEquipment,
  getBuyerBookings,
  cancelBooking,
  getSellerBookings,
  confirmBooking,
  rejectBooking,
  completeBooking,
};
