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
    try {
      await client.query("SET client_encoding TO 'UTF8'");
    } catch (encErr) {
      console.warn('⚠️ Warning: Failed to set client_encoding to UTF8 (possibly pgBouncer/transaction pooling):', encErr.message);
    }
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
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMPTZ,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMPTZ,
        sms_notifications BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Ensure columns exist on legacy tables
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT TRUE;");

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
        extra_charges NUMERIC(10,2) DEFAULT 0.0,
        return_notes TEXT,
        returned_at TIMESTAMPTZ,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Ensure columns exist on equipment_bookings table for migration
    await client.query("ALTER TABLE equipment_bookings ADD COLUMN IF NOT EXISTS extra_charges NUMERIC(10,2) DEFAULT 0.0;");
    await client.query("ALTER TABLE equipment_bookings ADD COLUMN IF NOT EXISTS return_notes TEXT;");
    await client.query("ALTER TABLE equipment_bookings ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;");

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

    // 5.5 Crop Orders Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS crop_orders (
        id SERIAL PRIMARY KEY,
        crop_listing_id INTEGER NOT NULL REFERENCES crop_listings(id) ON DELETE CASCADE,
        buyer_id INTEGER NOT NULL REFERENCES users(id),
        seller_id INTEGER NOT NULL REFERENCES users(id),
        quantity_kg NUMERIC(10,2) NOT NULL,
        price_per_kg NUMERIC(10,2) NOT NULL,
        total_amount NUMERIC(10,2) NOT NULL,
        delivery_date DATE,
        status VARCHAR(20) DEFAULT 'pending',
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

    // 10. Direct Messages Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS direct_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT,
        attachment_url TEXT,
        attachment_type VARCHAR(50),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Ensure columns exist on legacy direct_messages table
    await client.query("ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;");
    await client.query("ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50);");
    await client.query("ALTER TABLE direct_messages ALTER COLUMN message DROP NOT NULL;");

    // 11. Transport Providers Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transport_providers (
        id SERIAL PRIMARY KEY,
        owner_name VARCHAR(120) NOT NULL,
        vehicle_type VARCHAR(60) NOT NULL,
        vehicle_no VARCHAR(30) UNIQUE NOT NULL,
        capacity_kg NUMERIC(10,2),
        district VARCHAR(60) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        status VARCHAR(20) DEFAULT 'available',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Ensure owner_id column exists on transport_providers table
    await client.query("ALTER TABLE transport_providers ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id);");
    await client.query("ALTER TABLE transport_providers ADD COLUMN IF NOT EXISTS rate_per_km NUMERIC(10,2) DEFAULT 150.00;");
    await client.query("ALTER TABLE transport_bookings ADD COLUMN IF NOT EXISTS distance NUMERIC(10,2);");

    // 12. Transport Bookings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transport_bookings (
        id SERIAL PRIMARY KEY,
        provider_id INTEGER NOT NULL REFERENCES transport_providers(id) ON DELETE CASCADE,
        requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        requester_name VARCHAR(120),
        commodity_name VARCHAR(120) NOT NULL,
        quantity_kg NUMERIC(10,2) NOT NULL,
        pickup_address TEXT NOT NULL,
        delivery_address TEXT NOT NULL,
        price NUMERIC(10,2),
        distance NUMERIC(10,2),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 13. Market Prices Table (daily crop price index)
    await client.query(`
      CREATE TABLE IF NOT EXISTS market_prices (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) UNIQUE NOT NULL,
        category VARCHAR(60),
        avg_price NUMERIC(10,2) NOT NULL,
        change NUMERIC(5,2) DEFAULT 0.0,
        history NUMERIC(10,2)[] DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed initial crop prices if empty or count is less than 30
    const checkPrices = await client.query('SELECT COUNT(*) FROM market_prices');
    if (parseInt(checkPrices.rows[0].count, 10) < 30) {
      await client.query('DELETE FROM market_prices');
      await client.query(`
        INSERT INTO market_prices (name, category, avg_price, change, history) VALUES
        ('Tomatoes', 'Vegetables', 180, -2.4, '{192, 188, 185, 181, 184, 182, 180}'),
        ('Carrots', 'Vegetables', 240, 4.8, '{225, 228, 230, 235, 232, 238, 240}'),
        ('Potatoes', 'Grains/Tubers', 155, 1.2, '{151, 153, 152, 155, 154, 153, 155}'),
        ('Green Chilies', 'Spices', 320, -1.5, '{335, 330, 328, 322, 325, 324, 320}'),
        ('Leeks', 'Vegetables', 140, 0.5, '{138, 142, 139, 141, 140, 139, 140}'),
        ('Red Onion', 'Spices', 280, 2.1, '{272, 275, 274, 278, 275, 279, 280}'),
        ('Beans', 'Vegetables', 210, -0.8, '{218, 215, 212, 214, 210, 212, 210}'),
        ('Cabbage', 'Vegetables', 120, 1.5, '{115, 118, 117, 122, 119, 118, 120}'),
        ('Pumpkin', 'Vegetables', 90, -3.1, '{98, 95, 93, 91, 94, 92, 90}'),
        ('Brinjal', 'Vegetables', 160, 0.0, '{165, 162, 160, 158, 161, 160, 160}'),
        ('Ladies Finger', 'Vegetables', 110, 2.3, '{105, 108, 107, 109, 112, 108, 110}'),
        ('Bitter Gourd', 'Vegetables', 180, -1.2, '{185, 188, 184, 182, 183, 181, 180}'),
        ('Snake Gourd', 'Vegetables', 130, 0.8, '{128, 132, 129, 131, 130, 129, 130}'),
        ('Luffa', 'Vegetables', 140, -2.1, '{148, 145, 142, 144, 141, 143, 140}'),
        ('Cucumber', 'Vegetables', 85, 4.2, '{80, 82, 81, 85, 83, 84, 85}'),
        ('Beetroot', 'Vegetables', 220, -0.5, '{225, 228, 222, 224, 221, 222, 220}'),
        ('Radish', 'Vegetables', 95, 1.1, '{92, 94, 93, 96, 95, 94, 95}'),
        ('Knolkhol', 'Vegetables', 115, -1.3, '{120, 118, 116, 119, 117, 116, 115}'),
        ('Capsicum', 'Spices', 290, 3.4, '{275, 280, 282, 288, 285, 289, 290}'),
        ('Samba Rice', 'Grains/Tubers', 230, 0.0, '{230, 230, 230, 230, 230, 230, 230}'),
        ('Nadu Rice', 'Grains/Tubers', 220, 0.0, '{220, 220, 220, 220, 220, 220, 220}'),
        ('Red Rice', 'Grains/Tubers', 210, 0.5, '{208, 210, 210, 209, 211, 210, 210}'),
        ('Coconut', 'Grains/Tubers', 110, -0.9, '{112, 115, 113, 111, 114, 112, 110}'),
        ('Sweet Potato', 'Grains/Tubers', 145, 1.8, '{138, 142, 140, 143, 141, 144, 145}'),
        ('Manioc', 'Grains/Tubers', 120, -1.0, '{125, 122, 121, 124, 120, 122, 120}'),
        ('Garlic', 'Spices', 480, 0.8, '{472, 475, 478, 482, 480, 479, 480}'),
        ('Ginger', 'Spices', 650, -2.5, '{680, 675, 668, 662, 658, 655, 650}'),
        ('Lime', 'Spices', 350, 5.4, '{320, 328, 335, 342, 338, 345, 350}'),
        ('Dried Chilies', 'Spices', 980, 0.0, '{980, 980, 980, 980, 980, 980, 980}'),
        ('Banana', 'Grains/Tubers', 190, 2.1, '{182, 185, 188, 184, 189, 186, 190}')
      `);
    }

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
