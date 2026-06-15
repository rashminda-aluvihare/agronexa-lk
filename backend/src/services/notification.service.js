const db = require('../config/db');
const { getIo } = require('../socket');
const twilioService = require('./twilio.service');

/**
 * Pushes an in-app notification, dispatches it via Socket.io, and optionally sends an SMS.
 * @param {number} userId - Recipient user ID
 * @param {string} type - Notification category ('request'|'booking'|'response'|'system')
 * @param {string} title - Alert header
 * @param {string} body - Detail text
 */
async function pushNotification(userId, type, title, body) {
  try {
    // 1. Insert into database
    const result = await db.query(
      `INSERT INTO notifications (user_id, type, title, body) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userId, type, title, body]
    );
    const notif = result.rows[0];

    // 2. Dispatch via Socket.io
    const io = getIo();
    if (io) {
      io.to(`user_${userId}`).emit('new_notification', notif);
      io.to(`user_${userId}`).emit('dashboard_update', { type });
    }

    // 3. Dispatch SMS asynchronously (non-blocking)
    db.query('SELECT phone, role, sms_notifications FROM users WHERE id = $1', [userId])
      .then((userRes) => {
        if (userRes.rows.length > 0) {
          const user = userRes.rows[0];
          if (user.phone && user.sms_notifications !== false) {
            // Send SMS notification
            const smsText = `[AgroNexa] ${title} - ${body}`;
            twilioService.sendSms(user.phone, smsText)
              .catch((err) => console.warn(`SMS dispatch failed: ${err.message}`));
          }
        }
      })
      .catch((err) => console.warn(`Failed to resolve user phone for SMS: ${err.message}`));

    return notif;
  } catch (err) {
    console.error('❌ Failed to push notification:', err.message);
    return null;
  }
}

module.exports = {
  pushNotification,
};
