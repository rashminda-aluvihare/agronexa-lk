const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const twilioService = require('../services/twilio.service');
const auditService = require('../services/audit.service');
const { JWT_SECRET } = require('../middlewares/auth.middleware');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'rashminda@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'FGFGRTYRfhfh254588fgg';

/**
 * POST /api/auth/send-otp
 */
async function sendOtp(req, res, next) {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone number is required.' });
  }

  try {
    const result = await twilioService.sendOtp(phone);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/verify-otp
 */
async function verifyOtp(req, res, next) {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ success: false, error: 'Phone and code are required.' });
  }

  try {
    const result = await twilioService.verifyOtp(phone, code);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/register-with-otp
 */
async function registerWithOtp(req, res, next) {
  const {
    role,
    first_name,
    last_name,
    email,
    phone,
    district,
    address,
    nic_number,
    password,
    otpCode,
  } = req.body;

  if (!role || !first_name || !last_name || !email || !password || !phone || !district || !otpCode) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const e164 = twilioService.normalizePhoneToE164(phone);
  if (!e164) {
    return res.status(400).json({ success: false, error: 'Invalid phone format.' });
  }

  try {
    // 1. Verify OTP first
    const otpVerify = await twilioService.verifyOtp(e164, otpCode);
    if (!otpVerify.success) {
      return res.status(403).json({ success: false, error: otpVerify.error });
    }

    // 2. Hash password
    const password_hash = await bcrypt.hash(password, 12);
    
    // Multer files
    const nic_front_path = req.files?.nic_front?.[0]?.path || null;
    const nic_back_path = req.files?.nic_back?.[0]?.path || null;

    // 3. Insert user (status defaults to pending)
    const result = await db.query(
      `INSERT INTO users
        (role, first_name, last_name, email, phone, district,
         address, nic_number, password_hash, nic_front_path, nic_back_path, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, email, role, first_name`,
      [
        role,
        first_name,
        last_name,
        email,
        e164,
        district,
        address || null,
        nic_number || null,
        password_hash,
        nic_front_path,
        nic_back_path,
        'pending',
      ]
    );

    const newUser = result.rows[0];

    // Audit log
    await auditService.logAction(newUser.id, 'USER_REGISTRATION', req.ip, { role });

    return res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'This email or phone number is already registered' });
    }
    next(err);
  }
}

/**
 * POST /api/login
 */
async function login(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // 1. Check if admin credentials
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const adminUser = { id: 0, email: ADMIN_EMAIL, role: 'admin', name: 'Admin' };
      const token = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '30d' });

      await auditService.logAction(0, 'ADMIN_LOGIN', req.ip);

      return res.json({
        success: true,
        token,
        user: adminUser,
      });
    }

    // 2. Query normal user
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Check status approval
    if (user.status === 'pending') {
      return res.status(403).json({
        error: 'Your account is pending admin approval. You will be notified once verified.',
        status: 'pending',
      });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({
        error: 'Your account was rejected. Reason: ' + (user.rejection_reason || 'NIC verification failed.'),
        status: 'rejected',
      });
    }

    // 4. Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.first_name,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    await auditService.logAction(user.id, 'USER_LOGIN', req.ip);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.first_name,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/profile/:id
 */
async function getProfile(req, res, next) {
  try {
    const result = await db.query(
      `SELECT id, role, first_name, last_name, email, phone, district,
              address, nic_number, status, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 */
async function forgotPassword(req, res, next) {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone number is required.' });
  }

  try {
    const e164 = twilioService.normalizePhoneToE164(phone);
    const userCheck = await db.query('SELECT id FROM users WHERE phone = $1', [e164]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User with this phone number not found.' });
    }

    const result = await twilioService.sendOtp(e164);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 */
async function resetPassword(req, res, next) {
  const { phone, code, newPassword } = req.body;
  if (!phone || !code || !newPassword) {
    return res.status(400).json({ success: false, error: 'Phone, code, and newPassword are required.' });
  }

  try {
    const e164 = twilioService.normalizePhoneToE164(phone);
    
    // Verify OTP first
    const otpVerify = await twilioService.verifyOtp(e164, code);
    if (!otpVerify.success) {
      return res.status(403).json({ success: false, error: otpVerify.error });
    }

    const userQuery = await db.query('SELECT id FROM users WHERE phone = $1', [e164]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    const userId = userQuery.rows[0].id;

    // Hash and update
    const password_hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [password_hash, userId]);

    await auditService.logAction(userId, 'PASSWORD_RESET', req.ip);

    return res.json({ success: true, message: 'Password reset successful.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
  registerWithOtp,
  login,
  getProfile,
  forgotPassword,
  resetPassword,
};
