require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// ── ADMIN CONFIG ──
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'rashminda@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'FGFGRTYRfhfh254588fgg';

// Create upload folders if not exist
['uploads/nic/', 'uploads/listings/'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ── Serve HTML pages ──
const htmlDir = path.join(__dirname, 'public');
['admin', 'buyer', 'seller'].forEach(page => {
  app.get(`/${page}`, (_req, res) => res.sendFile(path.join(htmlDir, `${page}.html`)));
});
app.get('/', (_req, res) => res.sendFile(path.join(htmlDir, 'index.html')));

// ── PostgreSQL pool ──
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port:     parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Expose pool to route modules
app.set('db', pool);

// ── Auto-migrate users table ──
pool.connect(async (err, client, release) => {
  if (err) { console.error('❌ DB connection failed:', err.message); return; }
  console.log('✅ Connected to PostgreSQL');
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id              SERIAL PRIMARY KEY,
        role            VARCHAR(20) NOT NULL,
        first_name      VARCHAR(80) NOT NULL,
        last_name       VARCHAR(80) NOT NULL,
        email           VARCHAR(120) UNIQUE NOT NULL,
        phone           VARCHAR(30),
        district        VARCHAR(60),
        address         TEXT,
        nic_number      VARCHAR(30),
        password_hash   TEXT NOT NULL,
        nic_front_path  TEXT,
        nic_back_path   TEXT,
        status          VARCHAR(20) DEFAULT 'pending',
        rejection_reason TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;");
    await client.query("UPDATE users SET status = 'approved' WHERE status IS NULL;");
    console.log('✅ DB migration done');
  } catch (e) {
    console.error('Migration warning:', e.message);
  }
  release();
});

// ── Multer (for /api/register) ──
const storage = multer.diskStorage({
  destination: 'uploads/nic/',
  filename: (_req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── REGISTER ──
app.post('/api/register',
  upload.fields([{ name: 'nic_front' }, { name: 'nic_back' }]),
  async (req, res) => {
    try {
      const { role, first_name, last_name, email, phone, district, address, nic_number, password } = req.body;
      if (!email || !password || !role || !first_name || !last_name) {
        return res.status(400).json({ error: 'Please fill all required fields' });
      }
      const password_hash   = await bcrypt.hash(password, 12);
      const nic_front_path  = req.files?.nic_front?.[0]?.path || null;
      const nic_back_path   = req.files?.nic_back?.[0]?.path  || null;

      const result = await pool.query(
        `INSERT INTO users
           (role, first_name, last_name, email, phone, district,
            address, nic_number, password_hash, nic_front_path, nic_back_path, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id, email, role, first_name`,
        [role, first_name, last_name, email, phone, district,
         address, nic_number, password_hash, nic_front_path, nic_back_path, 'pending']
      );
      console.log('✅ New user registered:', result.rows[0].email);
      res.status(201).json({ success: true, user: result.rows[0] });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'This email is already registered' });
      console.error('Registration error:', err.message);
      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  }
);

// ── LOGIN ──
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    // Admin shortcut
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      return res.json({ success: true, user: { id: 0, email: ADMIN_EMAIL, role: 'admin', name: 'Admin' } });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid email or password' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    if (user.status === 'pending')  return res.status(403).json({ error: 'Your account is pending admin approval.', status: 'pending' });
    if (user.status === 'rejected') return res.status(403).json({ error: 'Your account was rejected. Reason: ' + (user.rejection_reason || 'NIC verification failed.'), status: 'rejected' });

    res.json({ success: true, user: { id: user.id, email: user.email, role: user.role, name: user.first_name } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── ADMIN ROUTES ──
const adminCheck = (req, res, next) => {
  const ae = req.query.admin_email || req.body.admin_email;
  const ap = req.query.admin_password || req.body.admin_password;
  if (ae !== ADMIN_EMAIL || ap !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

app.get('/api/admin/pending', adminCheck, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, role, first_name, last_name, email, phone, district, address,
              nic_number, nic_front_path, nic_back_path, status, created_at
       FROM users WHERE status='pending' ORDER BY created_at ASC`
    );
    res.json({ success: true, users: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users', adminCheck, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, role, first_name, last_name, email, phone, district,
              nic_number, nic_front_path, nic_back_path, status, rejection_reason, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json({ success: true, users: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/approve/:id', adminCheck, async (req, res) => {
  try {
    await pool.query(`UPDATE users SET status='approved', rejection_reason=NULL WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/reject/:id', adminCheck, async (req, res) => {
  try {
    await pool.query(
      `UPDATE users SET status='rejected', rejection_reason=$1 WHERE id=$2`,
      [req.body.reason || 'NIC verification failed', req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PROFILE ──
app.get('/api/profile/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, role, first_name, last_name, email, phone, district, address, nic_number, status, created_at
       FROM users WHERE id=$1`, [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── ROUTE MODULES ──
app.use('/api/auth',   require('./routes/authRoutes'));
app.use('/api/seller', require('./routes/sellerRoutes'));
app.use('/api/buyer',  require('./routes/buyerRoutes'));

// ── Health check ──
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 AgroNexa server running on port ${PORT}`));
