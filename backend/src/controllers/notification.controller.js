const db = require('../config/db');

/**
 * GET /api/notifications (retrieves notifications for a user)
 */
async function getNotifications(req, res, next) {
  const user_id = req.query.user_id || req.auth.id;
  const { unread_only } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    const filter = unread_only === 'true' ? 'AND is_read = FALSE' : '';
    const result = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 ${filter} 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [user_id]
    );

    const unreadCountResult = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [user_id]
    );
    
    return res.json({
      success: true,
      notifications: result.rows,
      unread_count: parseInt(unreadCountResult.rows[0].count, 10),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/notifications/read-all
 */
async function markAllAsRead(req, res, next) {
  const user_id = req.body.user_id || req.auth.id;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
      [user_id]
    );
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markAllAsRead,
};
