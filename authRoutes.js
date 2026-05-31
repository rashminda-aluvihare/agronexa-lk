const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");

// Multer file upload setup for NIC images
const storage = multer.diskStorage({
  destination: "uploads/nic/",
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });


// Twilio client — initialised lazily so the server still boots
// even if TWILIO_* env vars are not yet set (will error at call-time).
function getTwilio() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN missing).");
  }
  return require("twilio")(accountSid, authToken);
}

// ── POST /api/auth/send-otp ──────────────────────────────────────────────────
// Body: { phone: "+94771234567" }   ← E.164 format
router.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, error: "Phone number is required." });
  }

  try {
    const client = getTwilio();
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verifications.create({ to: phone, channel: "sms" });

    res.json({ success: true, message: "OTP sent successfully." });
  } catch (err) {
    console.error("send-otp error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/auth/verify-otp ────────────────────────────────────────────────
// Body: { phone: "+94771234567", code: "123456" }
router.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ success: false, error: "Phone and code are required." });
  }

  try {
    const client = getTwilio();
    const check  = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({ to: phone, code });

    if (check.status === "approved") {
      res.json({ success: true,  message: "Phone verified." });
    } else {
      res.json({ success: false, error: "Invalid or expired OTP." });
    }
  } catch (err) {
    console.error("verify-otp error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/auth/register-with-otp ──
// Creates user only after phone OTP is approved.
// Body is the same as /api/register PLUS: { phone, otpCode }
router.post('/register-with-otp',
  upload.fields([{ name: 'nic_front' }, { name: 'nic_back' }]),
  async (req, res) => {
  const {
    role, first_name, last_name, email,
    phone, district, address, nic_number, password,
    otpCode
  } = req.body;

  if (!role || !first_name || !last_name || !email || !password || !phone || !district || !otpCode) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  // verify OTP
  try {
    const client = getTwilio();
    const check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({
        to: phone,
        code: otpCode
      });

    if (check.status !== 'approved') {
      return res.status(403).json({ success: false, error: 'Invalid or expired OTP.' });
    }
  } catch (err) {
    console.error('register-with-otp verify error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }

  // Create account after OTP success
  try {
    const pool = req.app.get('db');
    if (!pool) {
      return res.status(500).json({ success: false, error: 'DB pool not available. Update server.js to set app.set("db", pool).' });
    }

    const bcrypt = require('bcryptjs');

    const password_hash = await bcrypt.hash(password, 12);
    const nic_front_path = req.files?.nic_front?.[0]?.path || null;
    const nic_back_path  = req.files?.nic_back?.[0]?.path  || null;

    const result = await pool.query(
      `INSERT INTO users
        (role, first_name, last_name, email, phone, district,
         address, nic_number, password_hash, nic_front_path, nic_back_path, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, email, role, first_name`,
      [
        role, first_name, last_name, email, phone, district,
        address || null, nic_number || null, password_hash,
        nic_front_path, nic_back_path, 'pending'
      ]
    );

    return res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'This email is already registered' });
    }
    console.error('register-with-otp create error:', err.message);
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

module.exports = router;
