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
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@agronexa.lk';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeThisToASecurePassword123!';


const fs = require('fs');

// ── TWILIO SMS NOTIFICATION HELPER ──
function getTwilio() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  return require('twilio')(accountSid, authToken);
}

function sendSMS(to, body) {
  const client = getTwilio();
  if (!client) {
    console.log(`ℹ️ [SMS Dev Mock] To: ${to} | Body: ${body}`);
    return Promise.resolve({ success: true, mocked: true });
  }
  return client.messages.create({
    body: body,
    from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
    to: to
  }).then(msg => {
    console.log(`✅ SMS sent to ${to}: ${msg.sid}`);
    return { success: true, sid: msg.sid };
  }).catch(err => {
    console.error(`❌ SMS failed to ${to}:`, err.message);
    return { success: false, error: err.message };
  });
}

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

  socket.on('send_message', (data) => {
    // Forward message to the receiver's private room
    io.to(`user_${data.receiver_id}`).emit('receive_message', data);
    console.log(`💬 Socket message from ${data.sender_id} to ${data.receiver_id} forwarded`);
  });

  socket.on('ping_latency', (data) => {
    socket.emit('pong_latency', data);
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
const sslConfig = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')
  ? { rejectUnauthorized: false }
  : false;

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig
});
app.set('db', pool);
app.set('sendSMS', sendSMS);
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

  await client.query(`
    CREATE TABLE IF NOT EXISTS direct_messages (
      id            SERIAL PRIMARY KEY,
      sender_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message       TEXT NOT NULL,
      is_read       BOOLEAN DEFAULT FALSE,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action        VARCHAR(100) NOT NULL,
      ip_address    VARCHAR(45),
      details       TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS transport_providers (
      id            SERIAL PRIMARY KEY,
      owner_name    VARCHAR(120) NOT NULL,
      vehicle_type  VARCHAR(60) NOT NULL,
      vehicle_no    VARCHAR(30) UNIQUE NOT NULL,
      capacity_kg   NUMERIC(10,2),
      district      VARCHAR(60) NOT NULL,
      phone         VARCHAR(30) NOT NULL,
      status        VARCHAR(20) DEFAULT 'available',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

pool.connect(async (err, client, release) => {
  if (err) { console.error('❌ DB connection failed:', err.message); return; }
  console.log('✅ Connected to PostgreSQL!');
  try {
    // Create users table if missing
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        role VARCHAR(20) NOT NULL,
        first_name VARCHAR(60) NOT NULL,
        last_name VARCHAR(60) NOT NULL,
        email VARCHAR(120) UNIQUE NOT NULL,
        phone VARCHAR(30) UNIQUE NOT NULL,
        district VARCHAR(60) NOT NULL,
        address TEXT,
        nic_number VARCHAR(30),
        password_hash VARCHAR(255) NOT NULL,
        nic_front_path TEXT,
        nic_back_path TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        rejection_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add columns if missing
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;");
    await client.query("UPDATE users SET status = 'approved' WHERE status IS NULL;");

    // Add security fields
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;");

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


// ── AUDIT LOG HELPER ──
async function logAuditEvent(userId, action, ipAddress, details = null) {
  try {
    const detailsStr = details && typeof details === 'object' ? JSON.stringify(details) : details;
    const dbUserId = userId === 0 ? null : userId;
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES ($1, $2, $3, $4)`,
      [dbUserId, action, ipAddress, detailsStr]
    );
  } catch (err) {
    console.error('❌ Audit logging failed:', err.message);
  }
}

// ── LOGIN ──
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // ── Check if admin credentials ──
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      console.log('✅ Admin logged in:', email);
      const token = jwt.sign(
        { id: 0, email: ADMIN_EMAIL, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      await logAuditEvent(0, 'ADMIN_LOGIN', ip);
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
      await logAuditEvent(null, 'FAILED_LOGIN_ATTEMPT', ip, { email, reason: 'user not found' });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check lock status
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      await logAuditEvent(user.id, 'BLOCKED_LOGIN_ATTEMPT', ip, { reason: 'account locked' });
      return res.status(403).json({
        error: `Account is temporarily locked due to 5 failed login attempts. Try again in ${minutesLeft} minutes.`,
        locked: true
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      if (attempts >= 5) {
        const lockUntil = new Date(Date.now() + 30 * 60000); // 30 minutes
        await pool.query(
          'UPDATE users SET failed_login_attempts = 0, locked_until = $1 WHERE id = $2',
          [lockUntil, user.id]
        );
        await logAuditEvent(user.id, 'ACCOUNT_LOCKED', ip, { attempts });
        return res.status(403).json({
          error: 'Too many failed login attempts. Your account has been locked for 30 minutes.'
        });
      } else {
        await pool.query(
          'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
          [attempts, user.id]
        );
        await logAuditEvent(user.id, 'FAILED_LOGIN_ATTEMPT', ip, { attempts });
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    // Reset failed attempts upon successful login
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
      [user.id]
    );

    // Check account approval status
    if (user.status === 'pending') {
      await logAuditEvent(user.id, 'FAILED_LOGIN_PENDING', ip);
      return res.status(403).json({
        error: 'Your account is pending admin approval. You will be notified once verified.',
        status: 'pending'
      });
    }
    if (user.status === 'rejected') {
      await logAuditEvent(user.id, 'FAILED_LOGIN_REJECTED', ip);
      return res.status(403).json({
        error: 'Your account was rejected. Reason: ' + (user.rejection_reason || 'NIC verification failed.'),
        status: 'rejected'
      });
    }

    console.log('✅ User logged in:', user.email);
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logAuditEvent(user.id, 'USER_LOGIN', ip);

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
    await logAuditEvent(0, 'USER_APPROVE', req.ip, { approved_user_id: req.params.id });
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
    await logAuditEvent(0, 'USER_REJECT', req.ip, { rejected_user_id: req.params.id, reason });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: CHANGE USER ROLE ──
app.post('/api/admin/user/:id/role', async (req, res) => {
  const { admin_email, admin_password, role } = req.body;
  if (admin_email !== ADMIN_EMAIL || admin_password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.id]);
    await logAuditEvent(0, 'USER_ROLE_CHANGE', req.ip, { target_user_id: req.params.id, new_role: role });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: CHANGE USER STATUS (activate/deactivate) ──
app.post('/api/admin/user/:id/status', async (req, res) => {
  const { admin_email, admin_password, status } = req.body;
  if (admin_email !== ADMIN_EMAIL || admin_password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, req.params.id]);
    await logAuditEvent(0, 'USER_STATUS_CHANGE', req.ip, { target_user_id: req.params.id, new_status: status });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: GET AUDIT LOGS ──
app.get('/api/admin/audit-logs', async (req, res) => {
  const { admin_email, admin_password } = req.query;
  if (admin_email !== ADMIN_EMAIL || admin_password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await pool.query(
      `SELECT al.*, u.email AS user_email, u.role AS user_role
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC LIMIT 200`
    );
    res.json({ success: true, logs: result.rows });
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

// ── CROP PRICE INDEX API ──
app.get('/api/market-prices', (req, res) => {
  const cropPrices = [
    { name: 'Tomatoes (තක්කාලි)', category: 'Vegetables', avgPrice: 180, change: -2.4 },
    { name: 'Carrots (කැරට්)', category: 'Vegetables', avgPrice: 240, change: 4.8 },
    { name: 'Potatoes (අල)', category: 'Grains/Tubers', avgPrice: 155, change: 1.2 },
    { name: 'Green Chilies (අමු මිරිස්)', category: 'Spices', avgPrice: 320, change: -1.5 },
    { name: 'Leeks (ලීක්ස්)', category: 'Vegetables', avgPrice: 140, change: 0.5 },
    { name: 'Red Onion (රතු ළූණු)', category: 'Spices', avgPrice: 280, change: 2.1 },
    { name: 'Beans (බෝංචි)', category: 'Vegetables', avgPrice: 210, change: -0.8 }
  ];
  res.json({ success: true, prices: cropPrices });
});

// ── TRANSPORT / LOGISTICS API ──
app.get('/api/transport', async (req, res) => {
  const { district } = req.query;
  try {
    let result;
    if (district) {
      result = await pool.query(
        'SELECT * FROM transport_providers WHERE district = $1 AND status = \'available\' ORDER BY created_at DESC',
        [district]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM transport_providers WHERE status = \'available\' ORDER BY created_at DESC'
      );
    }
    res.json({ success: true, providers: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transport', async (req, res) => {
  const { owner_name, vehicle_type, vehicle_no, capacity_kg, district, phone } = req.body;
  if (!owner_name || !vehicle_type || !vehicle_no || !district || !phone) {
    return res.status(400).json({ error: 'Missing required transport listing fields' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO transport_providers (owner_name, vehicle_type, vehicle_no, capacity_kg, district, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (vehicle_no) DO UPDATE SET
         owner_name = EXCLUDED.owner_name,
         vehicle_type = EXCLUDED.vehicle_type,
         capacity_kg = EXCLUDED.capacity_kg,
         district = EXCLUDED.district,
         phone = EXCLUDED.phone,
         status = 'available'
       RETURNING *`,
      [owner_name, vehicle_type, vehicle_no, capacity_kg || null, district, phone]
    );
    res.status(201).json({ success: true, provider: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transport/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE transport_providers SET status = \'deactivated\' WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transport listing not found' });
    }
    res.json({ success: true, message: 'Transport listing deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 AgroNexa server running on port ${PORT}`);
});