const db = require('../config/db');
const { getIo } = require('../socket');

/**
 * GET /api/seller/chats or /api/buyer/chats
 */
async function getUserChats(req, res, next) {
  const userId = req.query.seller_id || req.query.buyer_id || req.query.user_id || (req.auth && req.auth.id);
  if (!userId) {
    return res.status(400).json({ error: 'user_id, seller_id or buyer_id is required' });
  }

  try {
    const result = await db.query(
      `SELECT u.id, u.first_name || ' ' || u.last_name AS name, u.role, u.district,
              (SELECT message FROM direct_messages 
               WHERE (sender_id = $1 AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = $1)
               ORDER BY created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM direct_messages 
               WHERE (sender_id = $1 AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = $1)
               ORDER BY created_at DESC LIMIT 1) AS last_time,
              (SELECT COUNT(*) FROM direct_messages 
               WHERE sender_id = u.id AND receiver_id = $1 AND is_read = FALSE) AS unread_count
       FROM users u
       WHERE u.id IN (
         SELECT DISTINCT CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END
         FROM direct_messages
         WHERE sender_id = $1 OR receiver_id = $1
       )
       ORDER BY last_time DESC NULLS LAST`,
      [userId]
    );
    return res.json({ success: true, chats: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/seller/messages or /api/buyer/messages
 */
async function getChatMessages(req, res, next) {
  const userId = req.query.seller_id || req.query.buyer_id || req.query.user_id || (req.auth && req.auth.id);
  const chatUserId = req.query.chat_user_id;

  if (!userId || !chatUserId) {
    return res.status(400).json({ error: 'Both user identity and chat_user_id are required' });
  }

  try {
    // Mark messages from other user to current user as read
    await db.query(
      `UPDATE direct_messages SET is_read = TRUE 
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
      [chatUserId, userId]
    );

    // Fetch conversation
    const result = await db.query(
      `SELECT dm.*, 
              s.first_name || ' ' || s.last_name AS sender_name,
              r.first_name || ' ' || r.last_name AS receiver_name
       FROM direct_messages dm
       JOIN users s ON s.id = dm.sender_id
       JOIN users r ON r.id = dm.receiver_id
       WHERE (dm.sender_id = $1 AND dm.receiver_id = $2)
          OR (dm.sender_id = $2 AND dm.receiver_id = $1)
       ORDER BY dm.created_at ASC`,
      [userId, chatUserId]
    );

    return res.json({ success: true, messages: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/seller/messages/send or /api/buyer/messages/send
 */
async function sendChatMessage(req, res, next) {
  const senderId = req.body.seller_id || req.body.buyer_id || req.body.user_id || (req.auth && req.auth.id);
  const { receiver_id, message, attachment_url, attachment_type } = req.body;

  if (!senderId || !receiver_id) {
    return res.status(400).json({ error: 'sender identity and receiver_id are required' });
  }

  if (!message && !attachment_url) {
    return res.status(400).json({ error: 'Either message or attachment_url must be provided' });
  }

  try {
    const result = await db.query(
      `INSERT INTO direct_messages (sender_id, receiver_id, message, attachment_url, attachment_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [senderId, receiver_id, message || null, attachment_url || null, attachment_type || null]
    );
    const row = result.rows[0];

    // Real-time socket emission
    const io = getIo();
    if (io) {
      io.to(`user_${receiver_id}`).emit('receive_message', row);
    }

    return res.status(201).json({ success: true, message: row });
  } catch (err) {
    next(err);
  }
}

async function uploadAttachment(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const fileUrl = `/uploads/chat/${req.file.filename}`;
    let attachmentType = 'file';

    const originalName = req.file.originalname || '';
    const isImage = req.file.mimetype.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(originalName);
    const isAudio = req.file.mimetype.startsWith('audio/') || 
                    req.file.mimetype === 'video/webm' || 
                    /\.(mp3|wav|ogg|webm|m4a|aac|amr|opus)$/i.test(originalName);

    if (isImage) {
      attachmentType = 'image';
    } else if (isAudio) {
      attachmentType = 'audio';
    }

    return res.json({
      success: true,
      url: fileUrl,
      type: attachmentType,
      originalName: req.file.originalname
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUserChats,
  getChatMessages,
  sendChatMessage,
  uploadAttachment,
};
