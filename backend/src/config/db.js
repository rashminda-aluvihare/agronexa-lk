const { Pool } = require('pg');

const sslConfig = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')
  ? { rejectUnauthorized: false }
  : false;

const pool = new Pool({
  host: process.env.DB_HOST || process.env.DBHOST,
  database: process.env.DB_NAME || process.env.DBNAME,
  user: process.env.DB_USER || process.env.DBUSER,
  password: process.env.DB_PASSWORD || process.env.DBPASSWORD,
  port: process.env.DB_PORT || 5432,
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // Optional query logging for debugging
  // console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
}

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🔄 Running database migrations...');

    // 1. Users Table
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

    // 2. Crop Listings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS crop_listings (
        id SERIAL PRIMARY KEY,
        seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(120) NOT NULL,
        category VARCHAR(60),
        quantity_kg NUMERIC(10,2),
        price_per_kg NUMERIC(10,2),
        district VARCHAR(60),
        available_date DATE,
        description TEXT,
        photos TEXT[],
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. Equipment Listings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS equipment_listings (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(120) NOT NULL,
        type VARCHAR(60),
        description TEXT,
        rental_rate NUMERIC(10,2),
        district VARCHAR(60),
        condition VARCHAR(40),
        photos TEXT[],
        status VARCHAR(20) DEFAULT 'available',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Equipment Bookings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS equipment_bookings (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER NOT NULL REFERENCES equipment_listings(id) ON DELETE CASCADE,
        renter_id INTEGER NOT NULL REFERENCES users(id),
        owner_id INTEGER NOT NULL REFERENCES users(id),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_amount NUMERIC(10,2),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. Buyer Requests Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS buyer_requests (
        id SERIAL PRIMARY KEY,
        buyer_id INTEGER NOT NULL REFERENCES users(id),
        buyer_name VARCHAR(120),
        crop VARCHAR(120) NOT NULL,
        category VARCHAR(60),
        quantity VARCHAR(60) NOT NULL,
        unit VARCHAR(20),
        quality VARCHAR(60),
        urgency VARCHAR(60),
        budget VARCHAR(60),
        price_type VARCHAR(20),
        payment_method VARCHAR(60),
        payment_terms VARCHAR(60),
        delivery_type VARCHAR(60),
        district VARCHAR(60) NOT NULL,
        address TEXT,
        needed_by DATE,
        phone VARCHAR(30),
        whatsapp VARCHAR(30),
        email VARCHAR(120),
        notes TEXT,
        status VARCHAR(20) DEFAULT 'open',
        expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours'),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 6. Request Responses Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS request_responses (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL REFERENCES buyer_requests(id) ON DELETE CASCADE,
        seller_id INTEGER NOT NULL REFERENCES users(id),
        type VARCHAR(20) NOT NULL,
        price NUMERIC(10,2),
        quantity VARCHAR(60),
        message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 7. Rental Ledger Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rental_ledger (
        id SERIAL PRIMARY KEY,
        tx_id VARCHAR(64) UNIQUE NOT NULL,
        listing_id INTEGER,
        listing_type VARCHAR(20),
        renter_id INTEGER REFERENCES users(id),
        owner_id INTEGER REFERENCES users(id),
        amount NUMERIC(10,2),
        duration_days INTEGER,
        prev_hash VARCHAR(64) NOT NULL DEFAULT '0',
        block_hash VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 8. Notifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(40),
        title VARCHAR(200),
        body TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 9. Audit Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45),
        details TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Database migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Database migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  initDatabase,
};
