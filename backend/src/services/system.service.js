const db = require('../config/db');

let cache = {
  maintenanceMode: false,
  maintenanceMessage: 'AgroNexa LK is undergoing scheduled maintenance. Please check back later. / පද්ධතිය නඩත්තු කටයුත්තක් සඳහා තාවකාලිකව අක්‍රිය කර ඇත.'
};

/**
 * Initialize settings from database on startup
 */
async function initSystemSettings() {
  try {
    const result = await db.query('SELECT key, value FROM system_settings');
    result.rows.forEach(row => {
      if (row.key === 'maintenance_mode') {
        cache.maintenanceMode = (row.value === 'true');
      } else if (row.key === 'maintenance_message') {
        cache.maintenanceMessage = row.value;
      }
    });
    console.log(`⚙️ System Settings initialized: Maintenance Mode = ${cache.maintenanceMode}`);
  } catch (err) {
    console.error('⚠️ Failed to load system settings from DB:', err.message);
  }
}

function isMaintenanceActive() {
  return cache.maintenanceMode;
}

function getMaintenanceMessage() {
  return cache.maintenanceMessage;
}

/**
 * Set maintenance status, save to DB, and notify all sockets
 */
async function setMaintenanceMode(active, message) {
  const activeStr = active ? 'true' : 'false';
  const finalMessage = message !== undefined ? message : cache.maintenanceMessage;

  try {
    // Update DB
    await db.query(
      `INSERT INTO system_settings (key, value) 
       VALUES ('maintenance_mode', $1) 
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [activeStr]
    );

    if (message !== undefined) {
      await db.query(
        `INSERT INTO system_settings (key, value) 
         VALUES ('maintenance_message', $1) 
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [finalMessage]
      );
    }

    // Update Cache
    cache.maintenanceMode = !!active;
    cache.maintenanceMessage = finalMessage;

    console.log(`⚙️ System Settings updated: Maintenance Mode = ${cache.maintenanceMode}`);

    // Broadcast update via Socket.io
    try {
      const { getIo } = require('../socket');
      const io = getIo();
      if (io) {
        io.emit('maintenance_status', {
          active: cache.maintenanceMode,
          message: cache.maintenanceMessage
        });
        console.log('📡 Broadcasted maintenance status via Socket.io');
      }
    } catch (socketErr) {
      console.warn('⚠️ Socket broadcast failed during system setting update:', socketErr.message);
    }

    return { success: true, active: cache.maintenanceMode, message: cache.maintenanceMessage };
  } catch (err) {
    console.error('❌ Failed to update maintenance settings in database:', err.message);
    throw err;
  }
}

module.exports = {
  initSystemSettings,
  isMaintenanceActive,
  getMaintenanceMessage,
  setMaintenanceMode
};
