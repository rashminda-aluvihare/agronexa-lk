const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const twilioService = require('../services/twilio.service');
const auditService = require('../services/audit.service');
const { JWT_SECRET } = require('../middlewares/auth.middleware');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@agronexa.lk';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeThisToASecurePassword123!';

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

    const user = result.rows[0];

    // Compute ledger stats
    const ledgerStats = await db.query(
      `SELECT COUNT(*) AS completed_rentals, COALESCE(SUM(amount), 0) AS total_value
       FROM rental_ledger 
       WHERE owner_id = $1 OR renter_id = $1`,
      [user.id]
    );
    
    const { completed_rentals, total_value } = ledgerStats.rows[0];
    const rentalsCount = parseInt(completed_rentals, 10);
    const score = Math.min(5.0, (rentalsCount / 10.0) * 5.0).toFixed(1);

    user.completed_rentals = rentalsCount;
    user.trust_score = parseFloat(score);
    user.total_value = parseFloat(total_value);

    return res.json({ success: true, user });
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

/**
 * PUT /api/profile/:id
 */
async function updateProfile(req, res, next) {
  const { first_name, last_name, district, address, phone } = req.body;
  try {
    const result = await db.query(
      `UPDATE users SET
         first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         district = COALESCE($3, district),
         address = COALESCE($4, address),
         phone = COALESCE($5, phone),
         updated_at = NOW()
       WHERE id = $6
       RETURNING id, role, first_name, last_name, email, phone, district, address, status, created_at`,
      [first_name, last_name, district, address, phone, req.params.id]
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
 * POST /api/auth/forgot-password-link
 */
async function forgotPasswordLink(req, res, next) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: "Email is required." });
  }

  try {
    const result = await db.query("SELECT id, first_name FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      console.log(`ℹ️ Password reset requested for non-existent email: ${email}`);
      return res.json({ success: true, message: "If this email is registered, a password reset link has been sent." });
    }

    const user = result.rows[0];
    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 15 * 60000); // 15 minutes

    await db.query(
      "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3",
      [token, expires, user.id]
    );

    // Simulate sending email
    const resetLink = `${req.protocol}://${req.get("host")}/index.html?reset_token=${token}`;
    console.log(`\n📧 [SIMULATED EMAIL TO ${email}]`);
    console.log(`Hello ${user.first_name},`);
    console.log(`You requested a password reset for your AgroNexa LK account.`);
    console.log(`Please click the link below to reset your password (valid for 15 minutes):`);
    console.log(`${resetLink}\n`);

    return res.json({
      success: true,
      message: "A password reset link has been sent to your email.",
      resetLinkSimulated: resetLink
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password-link
 */
async function resetPasswordLink(req, res, next) {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ success: false, error: "Token and new password are required." });
  }

  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
    return res.status(400).json({ success: false, error: "Password must be at least 8 characters, and contain at least one uppercase letter, one number, and one special character." });
  }

  try {
    const result = await db.query(
      "SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()",
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: "Invalid or expired reset token." });
    }

    const user = result.rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.query(
      "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, failed_login_attempts = 0, locked_until = NULL WHERE id = $2",
      [passwordHash, user.id]
    );

    // Write audit log
    await auditService.logAction(user.id, 'PASSWORD_RESET', req.ip);

    return res.json({ success: true, message: "Your password has been reset successfully." });
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
  updateProfile,
  forgotPassword,
  resetPassword,
  forgotPasswordLink,
  resetPasswordLink,
};
