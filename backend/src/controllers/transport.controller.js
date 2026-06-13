const db = require('../config/db');
const notificationService = require('../services/notification.service');

/**
 * GET /api/transport
 */
async function getProviders(req, res, next) {
  const { district } = req.query;
  try {
    let result;
    if (district) {
      result = await db.query(
        "SELECT * FROM transport_providers WHERE district = $1 AND status = 'available' ORDER BY created_at DESC",
        [district]
      );
    } else {
      result = await db.query(
        "SELECT * FROM transport_providers WHERE status = 'available' ORDER BY created_at DESC"
      );
    }
    return res.json({ success: true, providers: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/transport
 */
async function createOrUpdateProvider(req, res, next) {
  const { owner_name, vehicle_type, vehicle_no, capacity_kg, district, phone, rate_per_km } = req.body;
  if (!owner_name || !vehicle_type || !vehicle_no || !district || !phone) {
    return res.status(400).json({ error: 'Missing required transport listing fields' });
  }
  const owner_id = req.auth ? req.auth.id : null;
  const rate = rate_per_km ? parseFloat(rate_per_km) : 150.00;
  try {
    const result = await db.query(
      `INSERT INTO transport_providers (owner_name, vehicle_type, vehicle_no, capacity_kg, district, phone, owner_id, rate_per_km)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (vehicle_no) DO UPDATE SET
         owner_name = EXCLUDED.owner_name,
         vehicle_type = EXCLUDED.vehicle_type,
         capacity_kg = EXCLUDED.capacity_kg,
         district = EXCLUDED.district,
         phone = EXCLUDED.phone,
         owner_id = EXCLUDED.owner_id,
         rate_per_km = EXCLUDED.rate_per_km,
         status = 'available'
       RETURNING *`,
      [owner_name, vehicle_type, vehicle_no, capacity_kg ? parseFloat(capacity_kg) : null, district, phone, owner_id, rate]
    );
    return res.status(201).json({ success: true, provider: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/transport/:id
 */
async function deactivateProvider(req, res, next) {
  const { id } = req.params;
  const userId = req.auth.id;
  const userRole = req.auth.role;
  try {
    let result;
    if (userRole === 'admin') {
      result = await db.query(
        "UPDATE transport_providers SET status = 'deactivated' WHERE id = $1 RETURNING *",
        [id]
      );
    } else {
      result = await db.query(
        "UPDATE transport_providers SET status = 'deactivated' WHERE id = $1 AND owner_id = $2 RETURNING *",
        [id, userId]
      );
    }
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transport listing not found or unauthorized' });
    }
    return res.json({ success: true, message: 'Transport listing deactivated' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/transport/bookings
 */
async function createBooking(req, res, next) {
  const { provider_id, commodity_name, quantity_kg, pickup_address, delivery_address, price, distance } = req.body;
  if (!provider_id || !commodity_name || !quantity_kg || !pickup_address || !delivery_address) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }
  const requester_id = req.auth.id;
  try {
    // 1. Fetch provider details
    const providerRes = await db.query('SELECT owner_id, owner_name FROM transport_providers WHERE id = $1', [provider_id]);
    if (providerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Transport provider not found' });
    }
    const provider = providerRes.rows[0];

    // 2. Fetch requester name
    const userRes = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [requester_id]);
    const requester_name = userRes.rows[0] ? `${userRes.rows[0].first_name} ${userRes.rows[0].last_name}` : (req.auth.name || 'User');

    // 3. Create the booking
    const result = await db.query(
      `INSERT INTO transport_bookings (provider_id, requester_id, requester_name, commodity_name, quantity_kg, pickup_address, delivery_address, price, distance, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING *`,
      [
        provider_id,
        requester_id,
        requester_name,
        commodity_name,
        parseFloat(quantity_kg),
        pickup_address,
        delivery_address,
        price ? parseFloat(price) : null,
        distance ? parseFloat(distance) : null
      ]
    );

    const booking = result.rows[0];

    // 4. Send notification to the provider owner
    if (provider.owner_id) {
      await notificationService.pushNotification(
        provider.owner_id,
        'booking',
        'New Transport Booking Request',
        `You have received a new transport booking request from ${requester_name} for ${quantity_kg}kg of ${commodity_name}.`
      );
    }

    return res.status(201).json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/transport/bookings
 */
async function getBookings(req, res, next) {
  const userId = req.auth.id;
  try {
    const result = await db.query(
      `SELECT tb.*, tp.owner_name as provider_owner_name, tp.vehicle_type, tp.vehicle_no, tp.phone as provider_phone, tp.owner_id as provider_owner_id, tp.rate_per_km
       FROM transport_bookings tb
       JOIN transport_providers tp ON tb.provider_id = tp.id
       WHERE tb.requester_id = $1 OR tp.owner_id = $1
       ORDER BY tb.created_at DESC`,
      [userId]
    );
    return res.json({ success: true, bookings: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/transport/bookings/:id/status
 */
async function updateBookingStatus(req, res, next) {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.auth.id;

  if (!['confirmed', 'in-transit', 'delivered', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid booking status' });
  }

  try {
    const bookingRes = await db.query(
      `SELECT tb.*, tp.owner_id, tp.owner_name FROM transport_bookings tb
       JOIN transport_providers tp ON tb.provider_id = tp.id
       WHERE tb.id = $1`,
      [id]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingRes.rows[0];

    const isRequester = booking.requester_id === userId;
    const isProviderOwner = booking.owner_id === userId;

    if (!isRequester && !isProviderOwner) {
      return res.status(403).json({ error: 'Unauthorized to update this booking' });
    }

    if (status === 'cancelled') {
      if (isRequester && booking.status !== 'pending') {
        return res.status(400).json({ error: 'Can only cancel pending bookings' });
      }
    } else {
      if (!isProviderOwner) {
        return res.status(403).json({ error: 'Only transport providers can update status to ' + status });
      }
    }

    const result = await db.query(
      `UPDATE transport_bookings
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    const updatedBooking = result.rows[0];

    // Send notifications
    if (isProviderOwner) {
      await notificationService.pushNotification(
        booking.requester_id,
        'booking',
        'Transport Booking Update',
        `Your transport booking status has been updated to "${status.toUpperCase()}" by ${booking.owner_name || 'the driver'}.`
      );
    }

    if (isRequester && booking.owner_id) {
      await notificationService.pushNotification(
        booking.owner_id,
        'booking',
        'Transport Booking Cancelled',
        `The transport booking request for ${booking.commodity_name} has been cancelled by the requester.`
      );
    }

    return res.json({ success: true, booking: updatedBooking });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProviders,
  createOrUpdateProvider,
  deactivateProvider,
  createBooking,
  getBookings,
  updateBookingStatus,
};
