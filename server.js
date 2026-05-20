require('dotenv').config();
const express    = require('express');
const { Pool }   = require('pg');
const bcrypt     = require('bcrypt');
const multer     = require('multer');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const crypto     = require('crypto');
const jwt        = require('jsonwebtoken');
const authRoutes   = require('./authRoutes');
const sellerRoutes = require('./sellerRoutes');
const buyerRoutes  = require('./buyerRoutes');

// ── STARTUP VALIDATION ────────────────────────────────────────────────────────
// Fail fast rather than running with missing config
const REQUIRED_ENV = ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
  console.error('   Add them to your .env file and restart.');
  process.exit(1);
}

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET     = process.env.JWT_SECRET;

// ── CREATE UPLOAD FOLDERS ─────────────────────────────────────────────────────
['uploads/nic/', 'uploads/listings/'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── EXPRESS APP ───────────────────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ── POSTGRESQL POOL ───────────────────────────────────────────────────────────
const pool = new Pool({
  host:             process.env.DB_HOST,
  database:         process.env.DB_NAME,
  user:             process.env.DB_USER,
  password:         process.env.DB_PASSWORD,
  port:             parseInt(process.env.DB_PORT) || 5432,
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Expose pool to route files via req.app.get('db')
app.set('db', pool);

// ── DB BOOTSTRAP ──────────────────────────────────────────────────────────────
pool.connect(async (err, client, release) => {
  if (err) {
    console.error('❌ DB connection failed:', err.message);
    return;
  }
  console.log('✅ Connected to PostgreSQL!');
  try {
    // Create users table if it does not exist yet (fresh database)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id               SERIAL PRIMARY KEY,
        role             VARCHAR(30)  NOT NULL,
        first_name       VARCHAR(80)  NOT NULL,
        last_name        VARCHAR(80)  NOT NULL,
        email            VARCHAR(120) UNIQUE NOT NULL,
        phone            VARCHAR(30),
        district         VARCHAR(60),
        address          TEXT,
        nic_number       VARCHAR(30),
        password_hash    TEXT NOT NULL,
        nic_front_path   TEXT,
        nic_back_path    TEXT,
        status           VARCHAR(20)  DEFAULT 'pending',
        rejection_reason TEXT,
        created_at       TIMESTAMPTZ  DEFAULT NOW()
      );
    `);

    // Idempotent migrations — safe to run every time
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;");
    await client.query("UPDATE users SET status = 'approved' WHERE status IS NULL;");

    console.log('✅ DB migration done');
  } catch (e) {
    console.error('Migration warning:', e.message);
  }
  release();
});

// ── MULTER: NIC FILE UPLOAD ───────────────────────────────────────────────────
const nicStorage = multer.diskStorage({
  destination: 'uploads/nic/',
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const uploadNic = multer({
  storage: nicStorage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ── JWT HELPERS ───────────────────────────────────────────────────────────────
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// Require a valid JWT — used on protected routes (FR2)
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

// ── PASSWORD VALIDATION (FR1) ─────────────────────────────────────────────────
function validatePassword(password) {
  if (!password || password.length < 8)  return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password))           return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(password))           return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(password))   return 'Password must contain at least one special character.';
  return null;
}

// ── ADMIN AUTH MIDDLEWARE ─────────────────────────────────────────────────────
// Accepts either a Bearer JWT token (preferred) or legacy query-string params
// so that admin.html continues to work without changes.
function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.split(' ')[1], JWT_SECRET);
      if (payload.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
      }
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
  }

  // Legacy fallback: admin_email + admin_password in query or body
  const { admin_email, admin_password } = { ...req.query, ...req.body };
  if (admin_email === ADMIN_EMAIL && admin_password === ADMIN_PASSWORD) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized.' });
}

// ── SERVE FRONTEND PAGES ──────────────────────────────────────────────────────
app.get('/',       (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/buyer',  (_req, res) => res.sendFile(path.join(__dirname, 'buyer.html')));
app.get('/seller', (_req, res) => res.sendFile(path.join(__dirname, 'seller.html')));
app.get('/admin',  (_req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// ── MOUNT ROUTE FILES ─────────────────────────────────────────────────────────
app.use('/api/auth',   authRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/buyer',  buyerRoutes);

// ═══════════════════════════════════════════════════════════════════════════════
//  REGISTER  (FR1)
// ═══════════════════════════════════════════════════════════════════════════════
app.post(
  '/api/register',
  uploadNic.fields([{ name: 'nic_front' }, { name: 'nic_back' }]),
  async (req, res) => {
    try {
      const {
        role, first_name, last_name, email,
        phone, district, address, nic_number, password
      } = req.body;

      if (!email || !password || !role || !first_name || !last_name) {
        return res.status(400).json({ error: 'Please fill all required fields.' });
      }

      // Server-side password policy (FR1)
      const pwError = validatePassword(password);
      if (pwError) return res.status(400).json({ error: pwError });

      const password_hash  = await bcrypt.hash(password, 12);
      const nic_front_path = req.files?.nic_front?.[0]?.path || null;
      const nic_back_path  = req.files?.nic_back?.[0]?.path  || null;

      const result = await pool.query(
        `INSERT INTO users
           (role, first_name, last_name, email, phone, district,
            address, nic_number, password_hash, nic_front_path, nic_back_path, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id, email, role, first_name`,
        [role, first_name, last_name, email,
         phone || null, district || null, address || null, nic_number || null,
         password_hash, nic_front_path, nic_back_path, 'pending']
      );

      console.log('✅ New user registered:', result.rows[0].email);
      res.status(201).json({ success: true, user: result.rows[0] });

    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'This email is already registered.' });
      }
      console.error('Registration error:', err.message);
      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
//  LOGIN  — issues JWT (FR2)
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Admin credentials (no DB lookup needed)
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = signToken({ id: 0, email: ADMIN_EMAIL, role: 'admin' });
      console.log('✅ Admin logged in:', email);
      return res.json({
        success: true,
        token,
        user: { id: 0, email: ADMIN_EMAIL, role: 'admin', name: 'Admin' }
      });
    }

    // Regular user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user  = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

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

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    console.log('✅ User logged in:', user.email);
    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, role: user.role, name: user.first_name }
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me  — verify session and return user info
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN ROUTES  (FR10)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/admin/pending
app.get('/api/admin/pending', requireAdmin, async (req, res) => {
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

// GET /api/admin/users  — all users
app.get('/api/admin/users', requireAdmin, async (req, res) => {
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

// GET /api/admin/stats  — dashboard summary numbers
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [users, listings, equipment, txns] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status='pending')  AS pending,
               COUNT(*) FILTER (WHERE status='approved') AS approved,
               COUNT(*) FILTER (WHERE status='rejected') AS rejected
        FROM users
      `),
      pool.query(`SELECT COUNT(*) AS total FROM crop_listings      WHERE status='active'`),
      pool.query(`SELECT COUNT(*) AS total FROM equipment_listings WHERE status='available'`),
      pool.query(`SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS revenue FROM rental_ledger`),
    ]);
    res.json({
      success: true,
      stats: {
        users:        users.rows[0],
        listings:     listings.rows[0],
        equipment:    equipment.rows[0],
        transactions: txns.rows[0]
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/approve/:id
app.post('/api/admin/approve/:id', requireAdmin, async (req, res) => {
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

// POST /api/admin/reject/:id
app.post('/api/admin/reject/:id', requireAdmin, async (req, res) => {
  const { reason } = req.body;
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

// DELETE /api/admin/users/:id  — remove a user account
app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/ledger  — full blockchain ledger (read-only, FR10)
app.get('/api/admin/ledger', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rl.*,
              o.first_name || ' ' || o.last_name AS owner_name,
              r.first_name || ' ' || r.last_name AS renter_name,
              el.name AS listing_name
       FROM rental_ledger rl
       LEFT JOIN users o  ON o.id = rl.owner_id
       LEFT JOIN users r  ON r.id = rl.renter_id
       LEFT JOIN equipment_listings el
              ON el.id = rl.listing_id AND rl.listing_type = 'equipment'
       ORDER BY rl.id DESC`
    );
    res.json({ success: true, ledger: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/ledger/verify  — hash chain integrity check (FR7)
app.get('/api/admin/ledger/verify', requireAdmin, async (req, res) => {
  try {
    const result  = await pool.query('SELECT * FROM rental_ledger ORDER BY id ASC');
    const entries = result.rows;
    let valid    = true;
    let broken   = null;
    let prevHash = '0';

    for (const entry of entries) {
      const expected = crypto.createHash('sha256')
        .update(JSON.stringify({
          txId:      entry.tx_id,
          listingId: entry.listing_id,
          renterId:  entry.renter_id,
          ownerId:   entry.owner_id,
          amount:    entry.amount,
          days:      entry.duration_days
        }) + entry.prev_hash)
        .digest('hex');

      if (expected !== entry.block_hash || entry.prev_hash !== prevHash) {
        valid  = false;
        broken = entry.tx_id;
        break;
      }
      prevHash = entry.block_hash;
    }

    res.json({
      success: true,
      valid,
      total_records: entries.length,
      broken_at: broken || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/profile/:id  — fetch user profile (public, used by marketplace)
app.get('/api/profile/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, role, first_name, last_name, email, phone, district,
              address, nic_number, status, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/profile/:id  — update own profile (requires auth)
app.put('/api/profile/:id', requireAuth, async (req, res) => {
  if (parseInt(req.params.id) !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only update your own profile.' });
  }
  try {
    const { first_name, last_name, phone, district, address } = req.body;
    const result = await pool.query(
      `UPDATE users SET
         first_name = COALESCE($1, first_name),
         last_name  = COALESCE($2, last_name),
         phone      = COALESCE($3, phone),
         district   = COALESCE($4, district),
         address    = COALESCE($5, address)
       WHERE id = $6
       RETURNING id, email, role, first_name, last_name, phone, district, address`,
      [first_name || null, last_name || null, phone || null,
       district || null, address || null, req.params.id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 404 HANDLER ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 AgroNexa LK server running on port ${PORT}`);
});