/**
 * AgroNexa LK — Seller / Farmer Routes
 * Prefix: /api/seller
 *
 * All protected routes require ?seller_id=<id> (or body.seller_id)
 * until JWT middleware is added (FR2).
 *
 * Tables used (auto-created on first use):
 *   crop_listings, equipment_listings,
 *   buyer_requests, request_responses,
 *   rental_ledger, notifications
 */

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const crypto  = require('crypto');
const fs      = require('fs');
const router  = express.Router();

// ── DB pool injected from server.js ───────────────────────────────────────────
let pool;
router.use((req, _res, next) => {
  if (!pool) pool = req.app.get('db');
  next();
});

// ── Multer for listing images ──────────────────────────────────────────────────
const listingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/listings/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  }
});
const uploadListingImages = multer({
  storage: listingStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 }
});

// ── Auto-migrate: create tables if missing ─────────────────────────────────────
async function ensureTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS crop_listings (
      id            SERIAL PRIMARY KEY,
      seller_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name          VARCHAR(120) NOT NULL,
      category      VARCHAR(60),
      quantity_kg   NUMERIC(10,2),
      price_per_kg  NUMERIC(10,2),
      district      VARCHAR(60),
      available_date DATE,
      description   TEXT,
      photos        TEXT[],          -- array of relative paths
      status        VARCHAR(20) DEFAULT 'active',  -- active | sold | deactivated
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS equipment_listings (
      id            SERIAL PRIMARY KEY,
      owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name          VARCHAR(120) NOT NULL,
      type          VARCHAR(60),          -- tractor | pump | harvester | transport | other
      description   TEXT,
      rental_rate   NUMERIC(10,2),        -- per day
      district      VARCHAR(60),
      condition     VARCHAR(40),
      photos        TEXT[],
      status        VARCHAR(20) DEFAULT 'available',  -- available | booked | deactivated
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS equipment_bookings (
      id            SERIAL PRIMARY KEY,
      listing_id    INTEGER NOT NULL REFERENCES equipment_listings(id) ON DELETE CASCADE,
      renter_id     INTEGER NOT NULL REFERENCES users(id),
      owner_id      INTEGER NOT NULL REFERENCES users(id),
      start_date    DATE NOT NULL,
      end_date      DATE NOT NULL,
      total_amount  NUMERIC(10,2),
      status        VARCHAR(20) DEFAULT 'pending',  -- pending | confirmed | rejected | cancelled
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS buyer_requests (
      id            SERIAL PRIMARY KEY,
      buyer_id      INTEGER NOT NULL REFERENCES users(id),
      buyer_name    VARCHAR(120),
      crop          VARCHAR(120) NOT NULL,
      category      VARCHAR(60),
      quantity      VARCHAR(60),
      unit          VARCHAR(20),
      quality       VARCHAR(60),
      urgency       VARCHAR(60),
      budget        VARCHAR(60),
      price_type    VARCHAR(20),
      payment_method VARCHAR(60),
      payment_terms  VARCHAR(60),
      delivery_type  VARCHAR(60),
      district      VARCHAR(60),
      address       TEXT,
      needed_by     DATE,
      phone         VARCHAR(30),
      whatsapp      VARCHAR(30),
      email         VARCHAR(120),
      notes         TEXT,
      status        VARCHAR(20) DEFAULT 'open',  -- open | closed | expired
      expires_at    TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours'),
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS request_responses (
      id            SERIAL PRIMARY KEY,
      request_id    INTEGER NOT NULL REFERENCES buyer_requests(id) ON DELETE CASCADE,
      seller_id     INTEGER NOT NULL REFERENCES users(id),
      type          VARCHAR(20) NOT NULL,  -- accept | reject | counter
      price         NUMERIC(10,2),
      quantity      VARCHAR(60),
      message       TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Blockchain-inspired immutable rental ledger (FR7)
  await client.query(`
    CREATE TABLE IF NOT EXISTS rental_ledger (
      id            SERIAL PRIMARY KEY,
      tx_id         VARCHAR(64) UNIQUE NOT NULL,
      listing_id    INTEGER,
      listing_type  VARCHAR(20),   -- equipment | crop
      renter_id     INTEGER REFERENCES users(id),
      owner_id      INTEGER REFERENCES users(id),
      amount        NUMERIC(10,2),
      duration_days INTEGER,
      prev_hash     VARCHAR(64) NOT NULL DEFAULT '0',
      block_hash    VARCHAR(64) NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type          VARCHAR(40),   -- request | booking | response | system
      title         VARCHAR(200),
      body          TEXT,
      is_read       BOOLEAN DEFAULT FALSE,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

// Run migration once at startup
let _migrated = false;
router.use(async (_req, _res, next) => {
  if (_migrated) return next();
  try {
    const client = await pool.connect();
    await ensureTables(client);
    client.release();
    _migrated = true;
  } catch (e) {
    console.warn('Seller table migration warning:', e.message);
  }
  next();
});

// ── Helper: hash a ledger record (SHA-256) ─────────────────────────────────────
function hashRecord(record, prevHash) {
  const data = JSON.stringify(record) + prevHash;
  return crypto.createHash('sha256').update(data).digest('hex');
}

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
//  CROP LISTINGS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/seller/crops?seller_id=&status=active
router.get('/crops', async (req, res) => {
  const { seller_id, status } = req.query;
  if (!seller_id) return res.status(400).json({ error: 'seller_id is required' });
  try {
    const statusFilter = status ? `AND status = $2` : '';
    const params = status ? [seller_id, status] : [seller_id];
    const result = await pool.query(
      `SELECT * FROM crop_listings WHERE seller_id = $1 ${statusFilter} ORDER BY created_at DESC`,
      params
    );
    res.json({ success: true, listings: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/seller/crops  — create a crop listing
router.post('/crops', uploadListingImages.array('photos', 5), async (req, res) => {
  try {
    const {
      seller_id, name, category, quantity_kg, price_per_kg,
      district, available_date, description
    } = req.body;

    if (!seller_id || !name) {
      return res.status(400).json({ error: 'seller_id and name are required' });
    }

    const photos = (req.files || []).map(f => f.path);

    const result = await pool.query(
      `INSERT INTO crop_listings
         (seller_id, name, category, quantity_kg, price_per_kg, district, available_date, description, photos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [seller_id, name, category || null, quantity_kg || null, price_per_kg || null,
       district || null, available_date || null, description || null, photos]
    );
    res.status(201).json({ success: true, listing: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/seller/crops/:id  — update
router.put('/crops/:id', uploadListingImages.array('photos', 5), async (req, res) => {
  try {
    const { seller_id, name, category, quantity_kg, price_per_kg,
            district, available_date, description, status } = req.body;
    if (!seller_id) return res.status(400).json({ error: 'seller_id is required' });

    const existing = await pool.query(
      'SELECT * FROM crop_listings WHERE id=$1 AND seller_id=$2', [req.params.id, seller_id]
    );
    if (!existing.rows.length) return res.status(404).json({ error: 'Listing not found' });

    const photos = req.files && req.files.length
      ? req.files.map(f => f.path)
      : existing.rows[0].photos;

    const result = await pool.query(
      `UPDATE crop_listings SET
         name=$1, category=$2, quantity_kg=$3, price_per_kg=$4,
         district=$5, available_date=$6, description=$7, photos=$8,
         status=COALESCE($9, status), updated_at=NOW()
       WHERE id=$10 AND seller_id=$11 RETURNING *`,
      [name || existing.rows[0].name, category || existing.rows[0].category,
       quantity_kg || existing.rows[0].quantity_kg, price_per_kg || existing.rows[0].price_per_kg,
       district || existing.rows[0].district, available_date || existing.rows[0].available_date,
       description || existing.rows[0].description, photos,
       status || null, req.params.id, seller_id]
    );
    res.json({ success: true, listing: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/seller/crops/:id  (soft-delete: status → deactivated)
router.delete('/crops/:id', async (req, res) => {
  const { seller_id } = req.body;
  if (!seller_id) return res.status(400).json({ error: 'seller_id is required' });
  try {
    const result = await pool.query(
      `UPDATE crop_listings SET status='deactivated', updated_at=NOW()
       WHERE id=$1 AND seller_id=$2 RETURNING id`,
      [req.params.id, seller_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Listing not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  EQUIPMENT LISTINGS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/seller/equipment?owner_id=
router.get('/equipment', async (req, res) => {
  const { owner_id } = req.query;
  if (!owner_id) return res.status(400).json({ error: 'owner_id is required' });
  try {
    const result = await pool.query(
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
    res.json({ success: true, listings: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/seller/equipment
router.post('/equipment', uploadListingImages.array('photos', 5), async (req, res) => {
  try {
    const { owner_id, name, type, description, rental_rate, district, condition } = req.body;
    if (!owner_id || !name) return res.status(400).json({ error: 'owner_id and name are required' });
    const photos = (req.files || []).map(f => f.path);
    const result = await pool.query(
      `INSERT INTO equipment_listings (owner_id, name, type, description, rental_rate, district, condition, photos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [owner_id, name, type || null, description || null, rental_rate || null,
       district || null, condition || null, photos]
    );
    res.status(201).json({ success: true, listing: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/seller/equipment/:id
router.put('/equipment/:id', uploadListingImages.array('photos', 5), async (req, res) => {
  try {
    const { owner_id, name, type, description, rental_rate, district, condition, status } = req.body;
    if (!owner_id) return res.status(400).json({ error: 'owner_id is required' });
    const existing = await pool.query(
      'SELECT * FROM equipment_listings WHERE id=$1 AND owner_id=$2', [req.params.id, owner_id]
    );
    if (!existing.rows.length) return res.status(404).json({ error: 'Listing not found' });
    const photos = req.files && req.files.length
      ? req.files.map(f => f.path)
      : existing.rows[0].photos;
    const e = existing.rows[0];
    const result = await pool.query(
      `UPDATE equipment_listings SET
         name=$1, type=$2, description=$3, rental_rate=$4, district=$5,
         condition=$6, photos=$7, status=COALESCE($8,status), updated_at=NOW()
       WHERE id=$9 AND owner_id=$10 RETURNING *`,
      [name||e.name, type||e.type, description||e.description, rental_rate||e.rental_rate,
       district||e.district, condition||e.condition, photos, status||null,
       req.params.id, owner_id]
    );
    res.json({ success: true, listing: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/seller/equipment/:id
router.delete('/equipment/:id', async (req, res) => {
  const { owner_id } = req.body;
  if (!owner_id) return res.status(400).json({ error: 'owner_id is required' });
  try {
    const result = await pool.query(
      `UPDATE equipment_listings SET status='deactivated', updated_at=NOW()
       WHERE id=$1 AND owner_id=$2 RETURNING id`,
      [req.params.id, owner_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Listing not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  EQUIPMENT BOOKINGS (owner side)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/seller/bookings?owner_id=&status=pending
router.get('/bookings', async (req, res) => {
  const { owner_id, status } = req.query;
  if (!owner_id) return res.status(400).json({ error: 'owner_id is required' });
  try {
    const statusFilter = status ? 'AND eb.status = $2' : '';
    const params = status ? [owner_id, status] : [owner_id];
    const result = await pool.query(
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
    res.json({ success: true, bookings: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/seller/bookings/:id/confirm  — owner confirms booking
router.post('/bookings/:id/confirm', async (req, res) => {
  const { owner_id } = req.body;
  if (!owner_id) return res.status(400).json({ error: 'owner_id is required' });
  try {
    const booking = await pool.query(
      `UPDATE equipment_bookings SET status='confirmed'
       WHERE id=$1 AND owner_id=$2 AND status='pending'
       RETURNING *`,
      [req.params.id, owner_id]
    );
    if (!booking.rows.length) return res.status(404).json({ error: 'Booking not found or already actioned' });

    const b = booking.rows[0];

    // Block the listing calendar (status → booked)
    await pool.query(
      `UPDATE equipment_listings SET status='booked', updated_at=NOW() WHERE id=$1`,
      [b.listing_id]
    );

    // Write to blockchain-inspired ledger
    const lastEntry = await pool.query(
      `SELECT block_hash FROM rental_ledger ORDER BY id DESC LIMIT 1`
    );
    const prevHash = lastEntry.rows.length ? lastEntry.rows[0].block_hash : '0';
    const txId     = crypto.randomUUID().replace(/-/g, '');
    const days     = Math.ceil((new Date(b.end_date) - new Date(b.start_date)) / 86400000) + 1;
    const amount   = b.total_amount || 0;
    const blockHash = hashRecord(
      { txId, listingId: b.listing_id, renterId: b.renter_id, ownerId: b.owner_id, amount, days },
      prevHash
    );
    await pool.query(
      `INSERT INTO rental_ledger (tx_id, listing_id, listing_type, renter_id, owner_id, amount, duration_days, prev_hash, block_hash)
       VALUES ($1,$2,'equipment',$3,$4,$5,$6,$7,$8)`,
      [txId, b.listing_id, b.renter_id, b.owner_id, amount, days, prevHash, blockHash]
    );

    // Notify renter
    await pushNotification(
      b.renter_id, 'booking',
      'Booking Confirmed ✅',
      `Your equipment booking has been confirmed. TX: ${txId.slice(0,12)}…`
    );

    res.json({ success: true, booking: b, ledger_tx: txId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/seller/bookings/:id/reject
router.post('/bookings/:id/reject', async (req, res) => {
  const { owner_id, reason } = req.body;
  if (!owner_id) return res.status(400).json({ error: 'owner_id is required' });
  try {
    const booking = await pool.query(
      `UPDATE equipment_bookings SET status='rejected'
       WHERE id=$1 AND owner_id=$2 AND status='pending'
       RETURNING *`,
      [req.params.id, owner_id]
    );
    if (!booking.rows.length) return res.status(404).json({ error: 'Booking not found' });

    await pushNotification(
      booking.rows[0].renter_id, 'booking',
      'Booking Rejected',
      `Your equipment booking was rejected. ${reason ? 'Reason: ' + reason : ''}`
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  BUYER REQUESTS — Seller views & responds (FR6)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/seller/requests?district=Kandy  — open requests relevant to seller
router.get('/requests', async (req, res) => {
  const { district, crop, limit = 50 } = req.query;
  try {
    const filters = [`status = 'open'`, `expires_at > NOW()`];
    const params  = [];
    if (district) { params.push(district); filters.push(`district ILIKE $${params.length}`); }
    if (crop)     { params.push(`%${crop}%`); filters.push(`crop ILIKE $${params.length}`); }
    params.push(parseInt(limit));

    const result = await pool.query(
      `SELECT br.*,
              (SELECT json_agg(rr.*) FROM request_responses rr WHERE rr.request_id = br.id) AS responses
       FROM buyer_requests br
       WHERE ${filters.join(' AND ')}
       ORDER BY br.created_at DESC
       LIMIT $${params.length}`,
      params
    );
    res.json({ success: true, requests: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/seller/requests/:id/respond  — accept | reject | counter
router.post('/requests/:id/respond', async (req, res) => {
  const { seller_id, type, price, quantity, message } = req.body;
  if (!seller_id || !type) return res.status(400).json({ error: 'seller_id and type are required' });
  if (!['accept', 'reject', 'counter'].includes(type)) {
    return res.status(400).json({ error: 'type must be accept, reject, or counter' });
  }
  try {
    // Check request exists and is open
    const req_ = await pool.query(
      `SELECT * FROM buyer_requests WHERE id=$1 AND status='open' AND expires_at > NOW()`,
      [req.params.id]
    );
    if (!req_.rows.length) return res.status(404).json({ error: 'Request not found or already closed' });

    const response = await pool.query(
      `INSERT INTO request_responses (request_id, seller_id, type, price, quantity, message)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, seller_id, type, price || null, quantity || null, message || null]
    );

    // Close request if accepted
    if (type === 'accept') {
      await pool.query(`UPDATE buyer_requests SET status='closed' WHERE id=$1`, [req.params.id]);
    }

    // Notify the buyer
    const br = req_.rows[0];
    const typeLabel = { accept: 'accepted ✅', reject: 'declined', counter: 'sent a counter-offer ↩️' };
    await pushNotification(
      br.buyer_id, 'response',
      `Seller responded to your request`,
      `A seller has ${typeLabel[type]} for your "${br.crop}" request.${price ? ' Offered: Rs. ' + price : ''}`
    );

    res.status(201).json({ success: true, response: response.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  BLOCKCHAIN LEDGER — seller history & verification (FR7)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/seller/ledger?owner_id=
router.get('/ledger', async (req, res) => {
  const { owner_id, renter_id } = req.query;
  if (!owner_id && !renter_id) return res.status(400).json({ error: 'owner_id or renter_id is required' });
  try {
    const col    = owner_id ? 'owner_id' : 'renter_id';
    const val    = owner_id || renter_id;
    const result = await pool.query(
      `SELECT rl.*,
              o.first_name || ' ' || o.last_name AS owner_name,
              r.first_name || ' ' || r.last_name AS renter_name,
              el.name AS listing_name
       FROM rental_ledger rl
       LEFT JOIN users o  ON o.id = rl.owner_id
       LEFT JOIN users r  ON r.id = rl.renter_id
       LEFT JOIN equipment_listings el ON el.id = rl.listing_id AND rl.listing_type = 'equipment'
       WHERE rl.${col} = $1
       ORDER BY rl.id DESC`,
      [val]
    );
    res.json({ success: true, ledger: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/seller/ledger/verify — recompute all hashes and check chain integrity
router.get('/ledger/verify', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM rental_ledger ORDER BY id ASC`);
    const entries = result.rows;
    let valid   = true;
    let broken  = null;
    let prevHash = '0';

    for (const entry of entries) {
      const expected = hashRecord(
        {
          txId: entry.tx_id, listingId: entry.listing_id,
          renterId: entry.renter_id, ownerId: entry.owner_id,
          amount: entry.amount, days: entry.duration_days
        },
        entry.prev_hash
      );
      if (expected !== entry.block_hash || entry.prev_hash !== prevHash) {
        valid  = false;
        broken = entry.tx_id;
        break;
      }
      prevHash = entry.block_hash;
    }

    res.json({ success: true, valid, total_records: entries.length, broken_at: broken || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/seller/notifications?user_id=&unread_only=true
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

// POST /api/seller/notifications/read-all
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
//  SELLER ANALYTICS SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/seller/analytics?seller_id=
router.get('/analytics', async (req, res) => {
  const { seller_id } = req.query;
  if (!seller_id) return res.status(400).json({ error: 'seller_id is required' });
  try {
    const [crops, equipment, bookings, ledger] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='active') AS active
         FROM crop_listings WHERE seller_id=$1`, [seller_id]
      ),
      pool.query(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='available') AS available
         FROM equipment_listings WHERE owner_id=$1`, [seller_id]
      ),
      pool.query(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='confirmed') AS confirmed
         FROM equipment_bookings WHERE owner_id=$1`, [seller_id]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount),0) AS total_revenue, COUNT(*) AS tx_count
         FROM rental_ledger WHERE owner_id=$1`, [seller_id]
      ),
    ]);

    res.json({
      success: true,
      analytics: {
        crop_listings:     crops.rows[0],
        equipment_listings: equipment.rows[0],
        bookings:          bookings.rows[0],
        ledger:            ledger.rows[0],
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  REPUTATION SCORE (derived from ledger, FR7)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/seller/reputation/:seller_id
router.get('/reputation/:seller_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) AS completed_rentals, COALESCE(SUM(amount),0) AS total_value
       FROM rental_ledger WHERE owner_id=$1`,
      [req.params.seller_id]
    );
    const { completed_rentals, total_value } = result.rows[0];
    // Simple score: min(5, rentals / 10 * 5) scaled to 5.0
    const score = Math.min(5, (parseInt(completed_rentals) / 10) * 5).toFixed(1);
    res.json({ success: true, score: parseFloat(score), completed_rentals, total_value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;