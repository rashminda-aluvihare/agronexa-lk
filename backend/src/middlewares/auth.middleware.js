/**
 * ====================================================================================
 * VIVA EXPLANATION - AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC) MIDDLEWARE
 * ====================================================================================
 * Key Examiner Questions & Answers:
 * 
 * 1. How is security handled in AgroNexa LK?
 *    - Stateless authentication using JSON Web Tokens (JWT).
 *    - Authorization header is checked for 'Bearer <token>'.
 *    - If valid, decoded user payload (id, role, email) is attached to `req.auth`.
 * 
 * 2. What is the fallback mechanism?
 *    - For backward compatibility with legacy client interfaces, a user_id query/body check 
 *      verifies user account approval status ('approved', 'pending', 'rejected') directly from PostgreSQL.
 * 
 * 3. How is Role-Based Access Control (RBAC) enforced?
 *    - `requireRole(['seller', 'admin'])` checks `req.auth.role`.
 *    - Normalizes 'farmer' and 'seller' synonyms to prevent unauthorized endpoint access.
 * ====================================================================================
 */

const jwt = require('jsonwebtoken');
const db = require('../config/db');

// JWT Secret Key loaded from environment variables (defaults to fallback for dev)
const JWT_SECRET = process.env.JWT_SECRET || 'agronexa-secret-key-12345';

/**
 * Express Middleware: Verifies JWT token or fallback User ID authentication.
 */
async function authRequired(req, res, next) {
  try {
    // 1. Extract Authorization header (Format: "Bearer <JWT_TOKEN>")
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

    // 2. Validate JWT token if provided
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.auth = decoded; // Attach user claims to request object
      
      // Check if system maintenance mode is active
      const systemService = require('../services/system.service');
      if (systemService.isMaintenanceActive() && req.auth.role !== 'admin') {
        return res.status(503).json({
          error: 'MAINTENANCE_LOCKOUT',
          message: systemService.getMaintenanceMessage()
        });
      }

      return next();     // Proceed to target route handler
    }

    // 3. Fallback check for legacy HTML client requests
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

    // 4. Emergency / Dev Admin Login Bypass Check
    if (adminEmailInput === ADMIN_EMAIL && adminPasswordInput === ADMIN_PASSWORD) {
      req.auth = {
        id: 0,
        email: ADMIN_EMAIL,
        role: 'admin',
        name: 'Admin',
      };
      return next();
    }

    // 5. Database verification for User ID fallback requests
    if (userId) {
      const result = await db.query('SELECT id, email, role, first_name, status FROM users WHERE id = $1', [userId]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        
        // Block unapproved or rejected user accounts (KYC Validation rule)
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

        // Check if system maintenance mode is active
        const systemService = require('../services/system.service');
        if (systemService.isMaintenanceActive() && req.auth.role !== 'admin') {
          return res.status(503).json({
            error: 'MAINTENANCE_LOCKOUT',
            message: systemService.getMaintenanceMessage()
          });
        }

        return next();
      }
    }

    // 6. Deny access if neither JWT nor valid user authentication is found
    return res.status(401).json({ error: 'Authentication required. Missing token or user ID.' });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

/**
 * Higher-Order Middleware: Restricts route access to specific user roles (e.g. ['admin', 'seller']).
 */
function requireRole(roles = []) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  
  // Normalize role synonyms ('farmer' == 'seller')
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
