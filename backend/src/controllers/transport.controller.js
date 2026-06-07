const db = require('../config/db');

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
  const { owner_name, vehicle_type, vehicle_no, capacity_kg, district, phone } = req.body;
  if (!owner_name || !vehicle_type || !vehicle_no || !district || !phone) {
    return res.status(400).json({ error: 'Missing required transport listing fields' });
  }
  try {
    const result = await db.query(
      `INSERT INTO transport_providers (owner_name, vehicle_type, vehicle_no, capacity_kg, district, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (vehicle_no) DO UPDATE SET
         owner_name = EXCLUDED.owner_name,
         vehicle_type = EXCLUDED.vehicle_type,
         capacity_kg = EXCLUDED.capacity_kg,
         district = EXCLUDED.district,
         phone = EXCLUDED.phone,
         status = 'available'
       RETURNING *`,
      [owner_name, vehicle_type, vehicle_no, capacity_kg ? parseFloat(capacity_kg) : null, district, phone]
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
  try {
    const result = await db.query(
      "UPDATE transport_providers SET status = 'deactivated' WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transport listing not found' });
    }
    return res.json({ success: true, message: 'Transport listing deactivated' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProviders,
  createOrUpdateProvider,
  deactivateProvider,
};
