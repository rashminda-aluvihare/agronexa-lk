const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const twilioService = require('../services/twilio.service');
const auditService = require('../services/audit.service');
const emailService = require('../services/email.service');
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
    const nic_front_path = req.files?.nic_front?.[0] ? 'uploads/nic/' + req.files.nic_front[0].filename : null;
    const nic_back_path = req.files?.nic_back?.[0] ? 'uploads/nic/' + req.files.nic_back[0].filename : null;

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

    // Emit real-time Socket.io notification to admin (room user_0)
    try {
      const { getIo } = require('../socket');
      const io = getIo();
      if (io) {
        io.to('user_0').emit('new_user_registered', {
          message: `${newUser.first_name} ${newUser.last_name} (${role === 'farmer' ? 'Farmer' : 'Buyer'})`
        });
      }
    } catch (err) {
      console.error('Failed to emit Socket.io alert to admin:', err.message);
    }

    // Send SMS alert to admin if ADMIN_PHONE is configured
    if (process.env.ADMIN_PHONE) {
      const smsText = `[AgroNexa Admin] New user registration: ${newUser.first_name} ${newUser.last_name} (${role === 'farmer' ? 'Farmer' : 'Buyer'}) awaits your approval.`;
      twilioService.sendSms(process.env.ADMIN_PHONE, smsText)
        .catch((err) => console.warn(`Admin SMS alert failed: ${err.message}`));
    }

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
      const token = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '24h' });

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

    // Check temporary account lock
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMs = new Date(user.locked_until) - new Date();
      const remainingMins = Math.ceil(remainingMs / 60000);
      return res.status(403).json({
        error: `Your account is temporarily locked due to too many failed login attempts. Try again in ${remainingMins} minute(s).`
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      if (newAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 30 * 60000); // 30 mins
        await db.query(
          'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
          [newAttempts, lockUntil, user.id]
        );
        return res.status(403).json({
          error: 'Invalid email or password. Your account has been temporarily locked for 30 minutes.'
        });
      } else {
        await db.query(
          'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
          [newAttempts, user.id]
        );
        const remaining = 5 - newAttempts;
        return res.status(401).json({
          error: `Invalid email or password. You have ${remaining} attempt(s) remaining before account lockout.`
        });
      }
    }

    // Reset attempts on successful match
    if (user.failed_login_attempts > 0 || user.locked_until) {
      await db.query(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
        [user.id]
      );
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
      { expiresIn: '24h' }
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
        profile_photo_path: user.profile_photo_path,
        district: user.district,
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
              address, nic_number, status, sms_notifications, profile_photo_path, created_at,
              bank_name, bank_branch, bank_account_name, bank_account_no
       FROM users WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Hide bank details if this is not the user's own profile
    if (req.auth.id !== parseInt(req.params.id, 10)) {
      delete user.bank_name;
      delete user.bank_branch;
      delete user.bank_account_name;
      delete user.bank_account_no;
    }

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
  if (req.auth.id !== parseInt(req.params.id, 10)) {
    return res.status(403).json({ error: 'Unauthorized to update this profile' });
  }

  let { first_name, last_name, district, address, phone, bank_name, bank_branch, bank_account_name, bank_account_no } = req.body;
  const profile_photo_path = req.file ? 'uploads/profile/' + req.file.filename : null;
  try {
    if (phone) {
      const e164 = twilioService.normalizePhoneToE164(phone);
      if (!e164) {
        return res.status(400).json({ success: false, error: 'Invalid phone format.' });
      }
      phone = e164;
    }
    const result = await db.query(
      `UPDATE users SET
         first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         district = COALESCE($3, district),
         address = COALESCE($4, address),
         phone = COALESCE($5, phone),
         profile_photo_path = COALESCE($6, profile_photo_path),
         bank_name = COALESCE($7, bank_name),
         bank_branch = COALESCE($8, bank_branch),
         bank_account_name = COALESCE($9, bank_account_name),
         bank_account_no = COALESCE($10, bank_account_no),
         updated_at = NOW()
       WHERE id = $11
       RETURNING id, role, first_name, last_name, email, phone, district, address, status, profile_photo_path, bank_name, bank_branch, bank_account_name, bank_account_no, created_at`,
      [first_name, last_name, district, address, phone, profile_photo_path, bank_name, bank_branch, bank_account_name, bank_account_no, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'This phone number is already registered by another user.' });
    }
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

    // Send password reset email
    const resetLink = `${req.protocol}://${req.get("host")}/index.html?reset_token=${token}`;
    await emailService.sendEmail({
      to: email,
      subject: 'AgroNexa LK - Password Reset Request',
      text: `Hello ${user.first_name || 'User'},\n\nYou requested a password reset for your AgroNexa LK account.\nPlease click the link below to reset your password (valid for 15 minutes):\n${resetLink}\n\nBest regards,\nAgroNexa LK Team`,
      html: `<p>Hello <strong>${user.first_name || 'User'}</strong>,</p><p>You requested a password reset for your AgroNexa LK account.</p><p><a href="${resetLink}">Click here to reset your password</a> (link valid for 15 minutes).</p>`
    });

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

/**
 * POST /api/auth/forgot-email
 */
async function forgotEmail(req, res, next) {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone number is required.' });
  }

  try {
    const e164 = twilioService.normalizePhoneToE164(phone);
    if (!e164) {
      return res.status(400).json({ success: false, error: 'Invalid phone format.' });
    }

    const userCheck = await db.query('SELECT id, first_name, email FROM users WHERE phone = $1', [e164]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User with this phone number not found.' });
    }

    const user = userCheck.rows[0];
    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 15 * 60000); // 15 minutes

    await db.query(
      "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3",
      [token, expires, user.id]
    );

    // Simulate sending recovery email
    const resetLink = `${req.protocol}://${req.get("host")}/index.html?reset_token=${token}`;
    console.log(`\n📧 [SIMULATED EMAIL TO ${user.email}]`);
    console.log(`Hello ${user.first_name},`);
    console.log(`You requested email and account recovery for your phone number ${phone}.`);
    console.log(`Your registered email address is: ${user.email}`);
    console.log(`Please click the link below if you need to reset your password (valid for 15 minutes):`);
    console.log(`${resetLink}\n`);

    const fs = require('fs');
    const path = require('path');
    const logPath = path.join(__dirname, '../../../sent_emails.log');
    try {
      fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] ACCOUNT RECOVERY EMAIL TO ${user.email}:\nRecovery Phone: ${phone}\nRegistered Email: ${user.email}\nReset Link: ${resetLink}\n`);
    } catch (err) {
      console.error('Failed to write to sent_emails.log:', err.message);
    }

    return res.json({
      success: true,
      message: 'A recovery email has been simulated/sent to your registered address.',
      email: user.email,
      resetLinkSimulated: resetLink
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/profile/:id/sms-preference
 */
async function updateSmsPreference(req, res, next) {
  const { enabled } = req.body;
  const { id } = req.params;

  try {
    const result = await db.query(
      'UPDATE users SET sms_notifications = $1 WHERE id = $2 RETURNING id, sms_notifications',
      [enabled === true, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ success: true, sms_notifications: result.rows[0].sms_notifications });
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
  forgotEmail,
  updateSmsPreference,
};
