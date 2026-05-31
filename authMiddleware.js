const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
    if (!token) return res.status(401).json({ error: 'Missing Authorization Bearer token' });

    const decoded = jwt.verify(token, JWT_SECRET);
    req.auth = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(roles = []) {
  const set = new Set(Array.isArray(roles) ? roles : [roles]);
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: 'Unauthorized' });
    if (!set.has(req.auth.role)) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}

module.exports = { authRequired, requireRole };

