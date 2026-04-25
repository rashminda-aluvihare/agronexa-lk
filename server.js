require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const multer = require('multer');
const cors = require('cors');
const path = require('path');


const fs = require('fs');

// create upload folders if not exist
const uploadDir = 'uploads/nic/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const app = express();
app.use(cors({
  origin: '*'
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

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
// Test DB connection
pool.connect((err) => {
  if (err) console.error('❌ DB connection failed:', err.message);
  else console.log('✅ Connected to PostgreSQL!');
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

// ── REGISTER ──
app.post('/api/register',
  upload.fields([{ name: 'nic_front' }, { name: 'nic_back' }]),
  async (req, res) => {
    try {
      const {
        role, first_name, last_name, email,
        phone, district, address, nic_number, password
      } = req.body;

      if (!email || !password || !role || !first_name || !last_name) {
        return res.status(400).json({ error: 'Please fill all required fields' });
      }

      const password_hash = await bcrypt.hash(password, 12);
      const nic_front_path = req.files?.nic_front?.[0]?.path || null;
      const nic_back_path  = req.files?.nic_back?.[0]?.path  || null;

      const result = await pool.query(
        `INSERT INTO users
          (role, first_name, last_name, email, phone, district,
           address, nic_number, password_hash, nic_front_path, nic_back_path)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id, email, role, first_name`,
        [role, first_name, last_name, email, phone, district,
         address, nic_number, password_hash, nic_front_path, nic_back_path]
      );

      console.log('✅ New user registered:', result.rows[0].email);
      res.status(201).json({ success: true, user: result.rows[0] });

    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'This email is already registered' });
      }
      console.error('Registration error:', err.message);
      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  }
);

// ── LOGIN ──
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 AgroNexa server running on port ${PORT}`);
});