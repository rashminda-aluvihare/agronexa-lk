const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'agronexa-secret-key-12345';

async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.auth = decoded;
      return next();
    }

    // Hybrid fallback for compatibility with existing HTML files
    const userId = req.query.seller_id || 
                   req.query.buyer_id || 
                   req.query.user_id || 
                   (req.body && req.body.seller_id) || 
                   (req.body && req.body.buyer_id) || 
                   (req.body && req.body.user_id);

    const adminEmailInput = req.query.admin_email || (req.body && req.body.admin_email);
    const adminPasswordInput = req.query.admin_password || (req.body && req.body.admin_password);
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@agronexa.lk';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeThisToASecurePassword123!';

    if (adminEmailInput === ADMIN_EMAIL && adminPasswordInput === ADMIN_PASSWORD) {
      req.auth = {
        id: 0,
        email: ADMIN_EMAIL,
        role: 'admin',
        name: 'Admin',
      };
      return next();
    }

    if (userId) {
      const result = await db.query('SELECT id, email, role, first_name, status FROM users WHERE id = $1', [userId]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        
        // Check approval status
        if (user.status === 'pending') {
          return res.status(403).json({ error: 'Your account is pending admin approval.' });
        }
        if (user.status === 'rejected') {
          return res.status(403).json({ error: 'Your account was rejected.' });
        }

        req.auth = {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.first_name,
        };
        return next();
      }
    }

    return res.status(401).json({ error: 'Authentication required. Missing token or user ID.' });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

function requireRole(roles = []) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  
  // Normalize allowed roles ('farmer' and 'seller' are treated as equivalent)
  const normalizedAllowed = allowed.map(r => r === 'farmer' ? 'seller' : r);

  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: 'Unauthorized' });

    const userRole = req.auth.role === 'farmer' ? 'seller' : req.auth.role;

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden. Access restricted.' });
    }
    return next();
  };
}

module.exports = {
  authRequired,
  requireRole,
  JWT_SECRET,
};
