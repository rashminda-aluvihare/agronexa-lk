const db = require('../config/db');
const auditService = require('../services/audit.service');

// ── ADMIN CREDENTIALS FOR COMPATIBILITY ──
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@agronexa.lk';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeThisToASecurePassword123!';

/**
 * Middleware compatibility check for admin operations.
 * Allows requests if admin credentials match via body/query, or if req.auth is 'admin'.
 */
function verifyAdminAccess(req) {
  const email = req.query.admin_email || req.body.admin_email;
  const password = req.query.admin_password || req.body.admin_password;

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return true;
  }
  if (req.auth && req.auth.role === 'admin') {
    return true;
  }
  return false;
}

/**
 * GET /api/admin/pending
 */
async function getPendingUsers(req, res, next) {
  if (!verifyAdminAccess(req)) {
    return res.status(401).json({ error: 'Unauthorized admin access.' });
  }

  try {
    const result = await db.query(
      `SELECT id, role, first_name, last_name, email, phone, district, address,
              nic_number, nic_front_path, nic_back_path, status, created_at
       FROM users
       WHERE status = 'pending'
       ORDER BY created_at ASC`
    );
    return res.json({ success: true, users: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/users
 */
async function getAllUsers(req, res, next) {
  if (!verifyAdminAccess(req)) {
    return res.status(401).json({ error: 'Unauthorized admin access.' });
  }

  try {
    const result = await db.query(
      `SELECT id, role, first_name, last_name, email, phone, district,
              nic_number, nic_front_path, nic_back_path, status, rejection_reason, created_at
       FROM users ORDER BY created_at DESC`
    );
    return res.json({ success: true, users: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/approve/:id
 */
async function approveUser(req, res, next) {
  if (!verifyAdminAccess(req)) {
    return res.status(401).json({ error: 'Unauthorized admin access.' });
  }

  const { id } = req.params;

  try {
    const result = await db.query(
      `UPDATE users SET status = 'approved', rejection_reason = NULL 
       WHERE id = $1 RETURNING id, email, first_name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const approvedUser = result.rows[0];

    // Audit log
    await auditService.logAction(0, 'ADMIN_APPROVE_USER', req.ip, { user_id: id, email: approvedUser.email });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/reject/:id
 */
async function rejectUser(req, res, next) {
  if (!verifyAdminAccess(req)) {
    return res.status(401).json({ error: 'Unauthorized admin access.' });
  }

  const { id } = req.params;
  const { reason } = req.body;

  try {
    const result = await db.query(
      `UPDATE users SET status = 'rejected', rejection_reason = $1 
       WHERE id = $2 RETURNING id, email`,
      [reason || 'NIC verification failed', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const rejectedUser = result.rows[0];

    // Audit log
    await auditService.logAction(0, 'ADMIN_REJECT_USER', req.ip, { user_id: id, email: rejectedUser.email, reason });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/audit-logs
 */
async function getAuditLogs(req, res, next) {
  if (!verifyAdminAccess(req)) {
    return res.status(401).json({ error: 'Unauthorized admin access.' });
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search ? `%${req.query.search}%` : null;

  try {
    let queryText = `
      SELECT al.*, 
             CASE WHEN al.user_id = 0 THEN 'Admin' ELSE u.first_name || ' ' || u.last_name END AS user_name,
             u.email AS user_email
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
    `;
    
    let countText = `
      SELECT COUNT(*) 
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
    `;

    const whereClauses = [];
    const queryParams = [];
    let paramIndex = 1;

    if (search) {
      whereClauses.push(`(
        u.email ILIKE $${paramIndex} OR 
        al.action ILIKE $${paramIndex} OR 
        al.details ILIKE $${paramIndex} OR
        u.first_name ILIKE $${paramIndex} OR
        u.last_name ILIKE $${paramIndex}
      )`);
      queryParams.push(search);
      paramIndex++;
    }

    if (whereClauses.length > 0) {
      const whereStr = ' WHERE ' + whereClauses.join(' AND ');
      queryText += whereStr;
      countText += whereStr;
    }

    queryText += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

    const logsResult = await db.query(queryText, [...queryParams, limit, offset]);
    const countResult = await db.query(countText, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    return res.json({
      success: true,
      logs: logsResult.rows,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Helper to escape CSV values
 */
function escapeCSVValue(val) {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * GET /api/admin/export/:resource
 */
async function exportResource(req, res, next) {
  if (!verifyAdminAccess(req)) {
    return res.status(401).json({ error: 'Unauthorized admin access.' });
  }

  const { resource } = req.params;

  try {
    let headers = [];
    let rows = [];
    let filename = `${resource}-export.csv`;

    if (resource === 'users') {
      const result = await db.query(
        'SELECT id, role, first_name, last_name, email, phone, district, status, created_at FROM users ORDER BY id ASC'
      );
      headers = ['ID', 'Role', 'First Name', 'Last Name', 'Email', 'Phone', 'District', 'Status', 'Registered At'];
      rows = result.rows.map((u) => [
        u.id,
        u.role,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.district,
        u.status,
        u.created_at,
      ]);
    } else if (resource === 'ledger') {
      const result = await db.query(
        `SELECT id, tx_id, listing_id, listing_type, renter_id, owner_id, amount, duration_days, created_at 
         FROM rental_ledger ORDER BY id ASC`
      );
      headers = ['ID', 'TX ID', 'Listing ID', 'Listing Type', 'Renter ID', 'Owner ID', 'Amount', 'Duration (Days)', 'Created At'];
      rows = result.rows.map((l) => [
        l.id,
        l.tx_id,
        l.listing_id,
        l.listing_type,
        l.renter_id,
        l.owner_id,
        l.amount,
        l.duration_days,
        l.created_at,
      ]);
    } else if (resource === 'audit-logs') {
      const result = await db.query(
        `SELECT id, user_id, action, ip_address, details, created_at FROM audit_logs ORDER BY id DESC`
      );
      headers = ['ID', 'User ID', 'Action', 'IP Address', 'Details', 'Timestamp'];
      rows = result.rows.map((a) => [
        a.id,
        a.user_id,
        a.action,
        a.ip_address,
        a.details,
        a.created_at,
      ]);
    } else {
      return res.status(400).json({ error: 'Invalid resource. Allowed resources are users, ledger, audit-logs.' });
    }

    if (req.query.format === 'json') {
      return res.json({ success: true, headers, rows });
    }

    // Generate CSV string
    const csvContent = [
      headers.map(escapeCSVValue).join(','),
      ...rows.map((row) => row.map(escapeCSVValue).join(',')),
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/user/:id/role
 */
async function changeUserRole(req, res, next) {
  if (!verifyAdminAccess(req)) {
    return res.status(401).json({ error: 'Unauthorized admin access.' });
  }

  const { id } = req.params;
  const { role } = req.body;

  try {
    const result = await db.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id', [role, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    await auditService.logAction(0, 'USER_ROLE_CHANGE', req.ip, { target_user_id: id, new_role: role });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/user/:id/status
 */
async function changeUserStatus(req, res, next) {
  if (!verifyAdminAccess(req)) {
    return res.status(401).json({ error: 'Unauthorized admin access.' });
  }

  const { id } = req.params;
  const { status } = req.body;

  try {
    const result = await db.query('UPDATE users SET status = $1 WHERE id = $2 RETURNING id', [status, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    await auditService.logAction(0, 'USER_STATUS_CHANGE', req.ip, { target_user_id: id, new_status: status });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/stats
 */
async function getDashboardStats(req, res, next) {
  if (!verifyAdminAccess(req)) {
    return res.status(401).json({ error: 'Unauthorized admin access.' });
  }

  try {
    const farmersResult = await db.query("SELECT COUNT(*) FROM users WHERE role = 'farmer' OR role = 'seller'");
    const buyersResult = await db.query("SELECT COUNT(*) FROM users WHERE role = 'buyer'");
    const cropsResult = await db.query("SELECT COUNT(*) FROM crop_listings WHERE status = 'active'");
    const equipmentResult = await db.query("SELECT COUNT(*) FROM equipment_listings WHERE status = 'available'");
    const transactionsResult = await db.query("SELECT COUNT(*), COALESCE(SUM(amount), 0) AS total_val FROM rental_ledger");

    return res.json({
      success: true,
      stats: {
        total_farmers: parseInt(farmersResult.rows[0].count, 10),
        total_buyers: parseInt(buyersResult.rows[0].count, 10),
        active_crops: parseInt(cropsResult.rows[0].count, 10),
        active_equipment: parseInt(equipmentResult.rows[0].count, 10),
        total_transactions: parseInt(transactionsResult.rows[0].count, 10),
        total_volume: parseFloat(transactionsResult.rows[0].total_val),
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/system/reset
 */
async function resetSystemDatabase(req, res, next) {
  if (!verifyAdminAccess(req)) {
    return res.status(401).json({ error: 'Unauthorized admin access.' });
  }

  try {
    const tables = [
      'direct_messages',
      'audit_logs',
      'notifications',
      'rental_ledger',
      'request_responses',
      'crop_orders',
      'buyer_requests',
      'equipment_bookings',
      'equipment_listings',
      'crop_listings',
      'transport_providers',
      'users'
    ];

    for (const table of tables) {
      await db.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);
    }

    // Write audit log for system reset
    await db.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES ($1, $2, $3, $4)`,
      [0, 'SYSTEM_RESET', req.ip, 'System database factory reset by admin.']
    );

    return res.json({ success: true, message: 'System database cleared successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPendingUsers,
  getAllUsers,
  approveUser,
  rejectUser,
  getAuditLogs,
  exportResource,
  changeUserRole,
  changeUserStatus,
  getDashboardStats,
  resetSystemDatabase,
};
