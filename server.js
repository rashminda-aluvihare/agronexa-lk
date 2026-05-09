require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const twilio = require('twilio');

const app = express();


function normPhone(raw) {
  let p = String(raw).replace(/\D/g, '');

  if (p.startsWith('0')) {
    return '+94' + p.slice(1);
  }

  if (p.length === 9) {
    return '+94' + p;
  }

  if (!raw.startsWith('+')) {
    return '+' + p;
  }

  return raw;
}



app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || 'rashminda@gmail.com';

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || 'FGFGRTYRfhfh254588fgg';

const TWILIO_SID =
  process.env.TWILIO_ACCOUNT_SID;

const TWILIO_TOKEN =
  process.env.TWILIO_AUTH_TOKEN;

const TWILIO_FROM =
  process.env.TWILIO_PHONE_NUMBER;

const twilioClient = twilio(
  TWILIO_SID,
  TWILIO_TOKEN
);

const uploadDir = 'uploads/nic/';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect(async (err, client, release) => {

  if (err) {
    console.error(
      'DB connection failed:',
      err.message
    );
    return;
  }

  console.log('Connected to PostgreSQL!');

  try {

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS status
      VARCHAR(20) DEFAULT 'pending';
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone_verified
      BOOLEAN DEFAULT FALSE;
    `);

    console.log('DB migration completed');

  } catch (e) {

    console.error(
      'Migration warning:',
      e.message
    );

  }

  release();

});

const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, 'uploads/nic/');
  },

  filename: (req, file, cb) => {

    cb(
      null,
      Date.now() +
      '-' +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname)
    );

  }

});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const otpStore = new Map();

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_TRIES = 5;

setInterval(() => {

  const now = Date.now();

  for (const [phone, data] of otpStore) {

    if (data.expiresAt < now) {
      otpStore.delete(phone);
    }

  }

}, 600000);

function normPhone(raw) {

  let p = String(raw).replace(/\D/g, '');

  if (p.length === 10 && p.startsWith('0')) {
    return '+94' + p.slice(1);
  }

  if (p.length === 9) {
    return '+94' + p;
  }

  if (!String(raw).startsWith('+')) {
    return '+' + p;
  }

  return String(raw);

}

app.get('/', (req, res) => {
  res.send('AgroNexa Backend Running');
});

app.get('/admin', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'admin.html')
  );
});

app.post('/api/otp/send', async (req, res) => {

  try {

    const { phone } = req.body;

    if (!phone) {

      return res.status(400).json({
        error: 'Phone number is required.'
      });

    }

    const e164 = normPhone(phone);

    const existing = otpStore.get(e164);

    if (
      existing &&
      Date.now() <
      existing.expiresAt -
      OTP_TTL_MS +
      60000
    ) {

      return res.status(429).json({
        error:
          'Please wait 60 seconds before requesting a new OTP.'
      });

    }

    const otp =
      crypto.randomInt(100000, 999999).toString();

    otpStore.set(e164, {
      otp,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0
    });

    await twilioClient.messages.create({

      body:
        `Your AgroNexa LK verification code is: ${otp}\n` +
        `Valid for 5 minutes.`,

      from: TWILIO_FROM,
      to: e164

    });

    console.log('OTP sent to', e164);

    res.json({
      success: true,
      message: 'OTP sent successfully.'
    });

  } catch (err) {

    console.error(
      'OTP send error:',
      err.message
    );

    res.status(500).json({
      error:
        'Failed to send OTP. Please try again.'
    });

  }

});

app.post('/api/otp/verify', (req, res) => {

  try {

    const { phone, otp } = req.body;

    if (!phone || !otp) {

      return res.status(400).json({
        error: 'Phone and OTP are required.'
      });

    }

    const e164 = normPhone(phone);

    const record = otpStore.get(e164);

    if (!record) {

      return res.status(400).json({
        error:
          'No OTP found. Please request a new one.'
      });

    }

    if (Date.now() > record.expiresAt) {

      otpStore.delete(e164);

      return res.status(400).json({
        error:
          'OTP has expired. Please request again.'
      });

    }

    record.attempts++;

    if (record.attempts > OTP_MAX_TRIES) {

      otpStore.delete(e164);

      return res.status(429).json({
        error:
          'Too many wrong attempts.'
      });

    }

    if (record.otp !== otp.trim()) {

      return res.status(400).json({
        error: 'Invalid OTP.'
      });

    }

    otpStore.delete(e164);

    console.log('OTP verified for', e164);

    res.json({
      success: true,
      message: 'Phone verified successfully.'
    });

  } catch (err) {

    console.error(
      'OTP verify error:',
      err.message
    );

    res.status(500).json({
      error: 'Verification failed.'
    });

  }

});

app.post(
  '/api/register',
  upload.fields([
    { name: 'nic_front' },
    { name: 'nic_back' }
  ]),
  async (req, res) => {

    try {

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
        phone_verified
      } = req.body;

      if (
        !email ||
        !password ||
        !role ||
        !first_name ||
        !last_name
      ) {

        return res.status(400).json({
          error:
            'Please fill all required fields.'
        });

      }

      if (phone_verified !== 'true') {

        return res.status(400).json({
          error:
            'Phone number must be verified.'
        });

      }

      const password_hash =
        await bcrypt.hash(password, 12);

      const nic_front_path =
        req.files?.nic_front?.[0]?.path || null;

      const nic_back_path =
        req.files?.nic_back?.[0]?.path || null;

      const result = await pool.query(

        `INSERT INTO users
        (
          role,
          first_name,
          last_name,
          email,
          phone,
          district,
          address,
          nic_number,
          password_hash,
          nic_front_path,
          nic_back_path,
          status,
          phone_verified
        )

        VALUES
        (
          $1,$2,$3,$4,$5,$6,$7,
          $8,$9,$10,$11,$12,$13
        )

        RETURNING
        id,email,role,first_name`,

        [
          role,
          first_name,
          last_name,
          email,
          phone,
          district,
          address,
          nic_number,
          password_hash,
          nic_front_path,
          nic_back_path,
          'pending',
          true
        ]

      );

      console.log(
        'New user registered:',
        result.rows[0].email
      );

      res.status(201).json({
        success: true,
        user: result.rows[0]
      });

    } catch (err) {

      if (err.code === '23505') {

        return res.status(409).json({
          error:
            'This email is already registered.'
        });

      }

      console.error(
        'Registration error:',
        err.message
      );

      res.status(500).json({
        error:
          'Registration failed.'
      });

    }

  }
);

app.post('/api/login', async (req, res) => {

  try {

    const { email, password } = req.body;

    if (!email || !password) {

      return res.status(400).json({
        error:
          'Email and password are required.'
      });

    }

    if (
      email === ADMIN_EMAIL &&
      password === ADMIN_PASSWORD
    ) {

      return res.json({
        success: true,
        user: {
          id: 0,
          email: ADMIN_EMAIL,
          role: 'admin',
          name: 'Admin'
        }
      });

    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (!result.rows.length) {

      return res.status(401).json({
        error:
          'Invalid email or password.'
      });

    }

    const user = result.rows[0];

    const valid =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!valid) {

      return res.status(401).json({
        error:
          'Invalid email or password.'
      });

    }

    if (user.status === 'pending') {

      return res.status(403).json({
        error:
          'Your account is pending admin approval.'
      });

    }

    if (user.status === 'rejected') {

      return res.status(403).json({
        error:
          'Account rejected.'
      });

    }

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

    console.error(
      'Login error:',
      err.message
    );

    res.status(500).json({
      error: 'Login failed.'
    });

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `AgroNexa server running on port ${PORT}`
  );
});