require('dotenv').config();
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ Error: DATABASE_URL not set in .env");
  process.exit(1);
}

console.log("🔄 Connecting to database...");
const client = new Client({
  connectionString,
  ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log("✅ Connected successfully!");

  const tables = [
    'direct_messages',
    'audit_logs',
    'notifications',
    'rental_ledger',
    'request_responses',
    'crop_orders',
    'buyer_requests',
    'equipment_bookings',
    'equipment_listings',
    'crop_listings',
    'transport_providers',
    'users'
  ];

  console.log("⚠️ WARNING: This will permanently delete all records.");
  for (const table of tables) {
    try {
      await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);
      console.log(`🧹 Table '${table}' cleared successfully.`);
    } catch (err) {
      console.warn(`⚠️ Could not truncate table '${table}':`, err.message);
    }
  }

  // Write a new initial audit log for reset
  try {
    await client.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES ($1, $2, $3, $4)`,
      [null, 'SYSTEM_RESET', '127.0.0.1', 'CLI Database factory reset.']
    );
  } catch(e) {}

  await client.end();
  console.log("\n🚀 Database factory reset complete! Fresh state ready.");
}

run().catch((err) => {
  console.error("❌ Reset failed:", err.message);
  process.exit(1);
});
