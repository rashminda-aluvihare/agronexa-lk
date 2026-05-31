require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { authRequired, requireRole } = require('./authMiddleware');

// ── JWT AUTH HELPERS ──
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// authRequired + requireRole live in ./authMiddleware.js


// ── ADMIN CONFIG ──

// Change these before deploying!
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'rashminda@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'FGFGRTYRfhfh254588fgg';


const fs = require('fs');

// create upload folders if not exist
const uploadDir = 'uploads/nic/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Expose pool for route modules that need DB access (e.g., authRoutes)
app.set('db', pool);
// Test DB connection + auto-migrate + seed admin
pool.connect(async (err, client, release) => {
  if (err) { console.error('❌ DB connection failed:', err.message); return; }
  console.log('✅ Connected to PostgreSQL!');
  try {
    // Add columns if missing
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;");
    await client.query("UPDATE users SET status = 'approved' WHERE status IS NULL;");
    console.log('✅ DB migration done');

    // Admin is verified via env credentials only — no DB entry needed
  } catch (e) {
    console.error('Migration/seed warning:', e.message);
  }
  release();
});
// Multer file upload setup
const storage = multer.diskStorage({
  destination: 'uploads/nic/',
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── REGISTER (deprecated: OTP-gated flow only)
// Account creation must go through POST /api/auth/register-with-otp
app.post('/api/register',
  upload.fields([{ name: 'nic_front' }, { name: 'nic_back' }]),
  async (req, res) => {
    return res.status(403).json({
      success: false,
      error: 'OTP-gated registration required. Use POST /api/auth/register-with-otp after verifying phone OTP.'
    });
  }
);

// ── LOGIN ──
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // ── Check if admin credentials ──
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      console.log('✅ Admin logged in:', email);
      const token = jwt.sign(
        { id: 0, role: 'admin', email: ADMIN_EMAIL },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({
        success: true,
        token,
        user: { id: 0, email: ADMIN_EMAIL, role: 'admin', name: 'Admin' }
      });
    }


    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check account approval status
    if (user.status === 'pending') {
      return res.status(403).json({
        error: 'Your account is pending admin approval. You will be notified once verified.',
        status: 'pending'
      });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({
        error: 'Your account was rejected. Reason: ' + (user.rejection_reason || 'NIC verification failed.'),
        status: 'rejected'
      });
    }

    console.log('✅ User logged in:', user.email);
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.first_name
      }
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Admin login is handled via /api/login (role: 'admin' returned)

// ── ADMIN: GET PENDING USERS ──
app.get('/api/admin/pending', async (req, res) => {
  const { admin_email, admin_password } = req.query;
  if (admin_email !== ADMIN_EMAIL || admin_password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await pool.query(
      `SELECT id, role, first_name, last_name, email, phone, district, address,
              nic_number, nic_front_path, nic_back_path, status, created_at
       FROM users
       WHERE status = 'pending'
       ORDER BY created_at ASC`
    );
    res.json({ success: true, users: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: GET ALL USERS (for history) ──
app.get('/api/admin/users', async (req, res) => {
  const { admin_email, admin_password } = req.query;
  if (admin_email !== ADMIN_EMAIL || admin_password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await pool.query(
      `SELECT id, role, first_name, last_name, email, phone, district,
              nic_number, nic_front_path, nic_back_path, status, rejection_reason, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json({ success: true, users: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: APPROVE USER ──
app.post('/api/admin/approve/:id', async (req, res) => {
  const { admin_email, admin_password } = req.body;
  if (admin_email !== ADMIN_EMAIL || admin_password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    await pool.query(
      `UPDATE users SET status = 'approved', rejection_reason = NULL WHERE id = $1`,
      [req.params.id]
    );
    console.log('✅ Admin approved user ID:', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: REJECT USER ──
app.post('/api/admin/reject/:id', async (req, res) => {
  const { admin_email, admin_password, reason } = req.body;
  if (admin_email !== ADMIN_EMAIL || admin_password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    await pool.query(
      `UPDATE users SET status = 'rejected', rejection_reason = $1 WHERE id = $2`,
      [reason || 'NIC verification failed', req.params.id]
    );
    console.log('✅ Admin rejected user ID:', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PROFILE: GET FULL USER DATA ──
app.get('/api/profile/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, role, first_name, last_name, email, phone, district,
              address, nic_number, status, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
module.exports = { authRequired, requireRole };

app.listen(PORT, () => {
  console.log(`🚀 AgroNexa server running on port ${PORT}`);
});
