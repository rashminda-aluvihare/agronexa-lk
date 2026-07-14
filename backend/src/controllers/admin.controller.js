const db = require('../config/db');
const auditService = require('../services/audit.service');
const notificationService = require('../services/notification.service');
const emailService = require('../services/email.service');
const systemService = require('../services/system.service');

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

    // Send In-App / Socket notification
    await notificationService.pushNotification(
      approvedUser.id,
      'system',
      'Account Approved | ගිණුම අනුමත විය',
      'Your AgroNexa LK account has been approved by the administrator. You can now log in and access all platform services.'
    );

    // Send Email notification to user's registered email
    emailService.sendAccountApprovalEmail({
      email: approvedUser.email,
      name: approvedUser.first_name,
    }).catch(err => console.error('Error sending approval email:', err.message));

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
  const rejectionReason = reason || 'NIC verification details did not match system requirements';

  try {
    const result = await db.query(
      `UPDATE users SET status = 'rejected', rejection_reason = $1 
       WHERE id = $2 RETURNING id, email, first_name`,
      [rejectionReason, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const rejectedUser = result.rows[0];

    // Audit log
    await auditService.logAction(0, 'ADMIN_REJECT_USER', req.ip, { user_id: id, email: rejectedUser.email, reason: rejectionReason });

    // Send In-App / Socket notification
    await notificationService.pushNotification(
      rejectedUser.id,
      'system',
      'Account Rejected | ගිණුම ප්‍රතික්ෂේප විය',
      `Your AgroNexa LK account registration was rejected. Reason: ${rejectionReason}`
    );

    // Send Email notification to user's registered email
    emailService.sendAccountRejectionEmail({
      email: rejectedUser.email,
      name: rejectedUser.first_name,
      reason: rejectionReason,
    }).catch(err => console.error('Error sending rejection email:', err.message));

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
  const { status, reason } = req.body;
  const rejectionReason = reason || 'NIC verification details did not match system requirements';

  try {
    const result = await db.query(
      `UPDATE users SET status = $1, rejection_reason = $2 WHERE id = $3 RETURNING id, email, first_name`,
      [status, status === 'rejected' ? rejectionReason : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updatedUser = result.rows[0];

    await auditService.logAction(0, 'USER_STATUS_CHANGE', req.ip, { target_user_id: id, new_status: status });

    if (status === 'approved') {
      await notificationService.pushNotification(
        updatedUser.id,
        'system',
        'Account Approved | ගිණුම අනුමත විය',
        'Your AgroNexa LK account status has been updated to approved.'
      );
      emailService.sendAccountApprovalEmail({
        email: updatedUser.email,
        name: updatedUser.first_name,
      }).catch(err => console.error('Error sending approval email:', err.message));
    } else if (status === 'rejected') {
      await notificationService.pushNotification(
        updatedUser.id,
        'system',
        'Account Rejected | ගිණුම ප්‍රතික්ෂේප විය',
        `Your AgroNexa LK account registration status was set to rejected. Reason: ${rejectionReason}`
      );
      emailService.sendAccountRejectionEmail({
        email: updatedUser.email,
        name: updatedUser.first_name,
        reason: rejectionReason,
      }).catch(err => console.error('Error sending rejection email:', err.message));
    }

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

    // 1. Crop Distribution by District
    const cropDistResult = await db.query(
      `SELECT district, COUNT(*) AS count 
       FROM crop_listings 
       WHERE status = 'active' AND district IS NOT NULL AND district <> ''
       GROUP BY district 
       ORDER BY count DESC 
       LIMIT 8`
    );

    // 2. User Growth Trend (monthly registrations)
    const userGrowthResult = await db.query(
      `SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, role, COUNT(*) AS count 
       FROM users 
       WHERE role IN ('farmer', 'seller', 'buyer')
       GROUP BY month, role 
       ORDER BY month ASC`
    );

    // 3. Transaction Volume Trend (daily sum for last 30 days)
    const txTrendResult = await db.query(
      `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date, COALESCE(SUM(amount), 0) AS total_val 
       FROM rental_ledger 
       GROUP BY date 
       ORDER BY date ASC 
       LIMIT 30`
    );

    return res.json({
      success: true,
      stats: {
        total_farmers: parseInt(farmersResult.rows[0].count, 10),
        total_buyers: parseInt(buyersResult.rows[0].count, 10),
        active_crops: parseInt(cropsResult.rows[0].count, 10),
        active_equipment: parseInt(equipmentResult.rows[0].count, 10),
        total_transactions: parseInt(transactionsResult.rows[0].count, 10),
        total_volume: parseFloat(transactionsResult.rows[0].total_val),
      },
      charts: {
        crop_distribution: cropDistResult.rows.map(r => ({
          district: r.district,
          count: parseInt(r.count, 10)
        })),
        user_growth: userGrowthResult.rows.map(r => ({
          month: r.month,
          role: r.role === 'farmer' || r.role === 'seller' ? 'seller' : r.role,
          count: parseInt(r.count, 10)
        })),
        transaction_trend: txTrendResult.rows.map(r => ({
          date: r.date,
          volume: parseFloat(r.total_val)
        }))
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

/**
 * GET /api/admin/announcements
 */
async function getAllAnnouncements(req, res, next) {
  if (!verifyAdminAccess(req)) {
    return res.status(401).json({ error: 'Unauthorized admin access.' });
  }

  try {
    const result = await db.query('SELECT * FROM announcements ORDER BY created_at DESC');
    return res.json({ success: true, announcements: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/announcements
 */
async function createAnnouncement(req, res, next) {
  if (!verifyAdminAccess(req)) {
    return res.status(401).json({ error: 'Unauthorized admin access.' });
  }

  const { title, message, alert_type, starts_at, expires_at, target_audience, target_district } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO announcements (title, message, alert_type, starts_at, expires_at, target_audience, target_district)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        title,
        message,
        alert_type || 'info',
        starts_at ? new Date(starts_at) : new Date(),
        expires_at ? new Date(expires_at) : null,
        target_audience || 'all',
        target_district || 'all'
      ]
    );

    await auditService.logAction(0, 'ANNOUNCEMENT_CREATE', req.ip, { announcement_id: result.rows[0].id });

    return res.json({ success: true, announcement: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/announcements/:id
 */
async function updateAnnouncement(req, res, next) {
  if (!verifyAdminAccess(req)) {
    return res.status(401).json({ error: 'Unauthorized admin access.' });
  }

  const { id } = req.params;
  const { title, message, alert_type, starts_at, expires_at, target_audience, target_district } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required.' });
  }

  try {
    const result = await db.query(
      `UPDATE announcements 
       SET title = $1, message = $2, alert_type = $3, starts_at = $4, expires_at = $5, 
           target_audience = $6, target_district = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        title,
        message,
        alert_type || 'info',
        starts_at ? new Date(starts_at) : new Date(),
        expires_at ? new Date(expires_at) : null,
        target_audience || 'all',
        target_district || 'all',
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    await auditService.logAction(0, 'ANNOUNCEMENT_UPDATE', req.ip, { announcement_id: id });

    return res.json({ success: true, announcement: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/announcements/:id
 */
async function deleteAnnouncement(req, res, next) {
  if (!verifyAdminAccess(req)) {
    return res.status(401).json({ error: 'Unauthorized admin access.' });
  }

  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    await auditService.logAction(0, 'ANNOUNCEMENT_DELETE', req.ip, { announcement_id: id });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/system/maintenance
 */
async function setMaintenanceMode(req, res, next) {
  if (!verifyAdminAccess(req)) {
    return res.status(401).json({ error: 'Unauthorized admin access.' });
  }

  const { active, message } = req.body;
  if (active === undefined) {
    return res.status(400).json({ error: 'Field "active" (boolean) is required.' });
  }

  try {
    const result = await systemService.setMaintenanceMode(active, message);
    
    // Log audit action
    await auditService.logAction(0, 'ADMIN_SET_MAINTENANCE', req.ip, { active, message });

    return res.json({ success: true, ...result });
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
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  setMaintenanceMode,
};
