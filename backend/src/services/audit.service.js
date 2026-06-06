const db = require('../config/db');

/**
 * Logs a system or user action to the audit_logs table.
 * @param {number|null} userId - ID of the user performing the action, or null if system/unauthenticated
 * @param {string} action - The action name (e.g. 'USER_LOGIN', 'CREATE_CROP_LISTING')
 * @param {string} ipAddress - Client IP address
 * @param {object|string|null} details - Additional information about the action
 */
async function logAction(userId, action, ipAddress, details = null) {
  try {
    const detailsStr = details && typeof details === 'object'
      ? JSON.stringify(details)
      : details;

    await db.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, details)
       VALUES ($1, $2, $3, $4)`,
      [userId, action, ipAddress, detailsStr]
    );
  } catch (err) {
    console.error('❌ Audit logging failed:', err.message);
  }
}

module.exports = {
  logAction,
};
