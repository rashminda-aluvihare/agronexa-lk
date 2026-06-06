require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./authRoutes');
const jwt = require('jsonwebtoken');
const sellerRoutes = require('./sellerRoutes');
const buyerRoutes = require('./buyerRoutes');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

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
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.set('io', io); // Share io with other routes

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`📡 User ${userId} connected via socket`);
  });
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ── TWILIO OTP ROUTES ──
app.use('/api/auth', authRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/buyer', buyerRoutes);

// Serve pages securely
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/buyer.html', (req, res) => res.sendFile(path.join(__dirname, 'buyer.html')));
app.get('/seller.html', (req, res) => res.sendFile(path.join(__dirname, 'seller.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/logo.png', (req, res) => res.sendFile(path.join(__dirname, 'logo.png')));

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
app.set('db', pool);
// Test DB connection + auto-migrate + seed admin
async function ensureTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS crop_listings (
      id            SERIAL PRIMARY KEY,
      seller_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name          VARCHAR(120) NOT NULL,
      category      VARCHAR(60),
      quantity_kg   NUMERIC(10,2),
      price_per_kg  NUMERIC(10,2),
      district      VARCHAR(60),
      available_date DATE,
      description   TEXT,
      photos        TEXT[],
      status        VARCHAR(20) DEFAULT 'active',
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS equipment_listings (
      id            SERIAL PRIMARY KEY,
      owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name          VARCHAR(120) NOT NULL,
      type          VARCHAR(60),
      description   TEXT,
      rental_rate   NUMERIC(10,2),
      district      VARCHAR(60),
      condition     VARCHAR(40),
      photos        TEXT[],
      status        VARCHAR(20) DEFAULT 'available',
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS equipment_bookings (
      id            SERIAL PRIMARY KEY,
      listing_id    INTEGER NOT NULL REFERENCES equipment_listings(id) ON DELETE CASCADE,
      renter_id     INTEGER NOT NULL REFERENCES users(id),
      owner_id      INTEGER NOT NULL REFERENCES users(id),
      start_date    DATE NOT NULL,
      end_date      DATE NOT NULL,
      total_amount  NUMERIC(10,2),
      status        VARCHAR(20) DEFAULT 'pending',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS buyer_requests (
      id            SERIAL PRIMARY KEY,
      buyer_id      INTEGER NOT NULL REFERENCES users(id),
      buyer_name    VARCHAR(120),
      crop          VARCHAR(120) NOT NULL,
      category      VARCHAR(60),
      quantity      VARCHAR(60),
      unit          VARCHAR(20),
      quality       VARCHAR(60),
      urgency       VARCHAR(60),
      budget        VARCHAR(60),
      price_type    VARCHAR(20),
      payment_method VARCHAR(60),
      payment_terms  VARCHAR(60),
      delivery_type  VARCHAR(60),
      district      VARCHAR(60),
      address       TEXT,
      needed_by     DATE,
      phone         VARCHAR(30),
      whatsapp      VARCHAR(30),
      email         VARCHAR(120),
      notes         TEXT,
      status        VARCHAR(20) DEFAULT 'open',
      expires_at    TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours'),
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS request_responses (
      id            SERIAL PRIMARY KEY,
      request_id    INTEGER NOT NULL REFERENCES buyer_requests(id) ON DELETE CASCADE,
      seller_id     INTEGER NOT NULL REFERENCES users(id),
      type          VARCHAR(20) NOT NULL,
      price         NUMERIC(10,2),
      quantity      VARCHAR(60),
      message       TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS rental_ledger (
      id            SERIAL PRIMARY KEY,
      tx_id         VARCHAR(64) UNIQUE NOT NULL,
      listing_id    INTEGER,
      listing_type  VARCHAR(20),
      renter_id     INTEGER REFERENCES users(id),
      owner_id      INTEGER REFERENCES users(id),
      amount        NUMERIC(10,2),
      duration_days INTEGER,
      prev_hash     VARCHAR(64) NOT NULL DEFAULT '0',
      block_hash    VARCHAR(64) NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type          VARCHAR(40),
      title         VARCHAR(200),
      body          TEXT,
      is_read       BOOLEAN DEFAULT FALSE,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

pool.connect(async (err, client, release) => {
  if (err) { console.error('❌ DB connection failed:', err.message); return; }
  console.log('✅ Connected to PostgreSQL!');
  try {
    // Add columns if missing
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;");
    await client.query("UPDATE users SET status = 'approved' WHERE status IS NULL;");

    // Migrate all app tables
    await ensureTables(client);
    console.log('✅ DB migration done');
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

// ── REGISTER (DISABLED) ──
// OTP-gated registration is mandatory. Use:
//   POST /api/auth/register-with-otp
app.post('/api/register', (req, res) => {
  return res.status(410).json({
    success: false,
    error: 'Registration endpoint requires OTP. Use POST /api/auth/register-with-otp instead.'
  });
});


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
        { id: 0, email: ADMIN_EMAIL, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '30d' }
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
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
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

// ── PROFILE: UPDATE USER DATA ──
app.put('/api/profile/:id', async (req, res) => {
  const { first_name, last_name, district, address, phone } = req.body;
  try {
    const result = await pool.query(
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
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 AgroNexa server running on port ${PORT}`);
});