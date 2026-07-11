const db = require('../config/db');
const ledgerService = require('../services/ledger.service');
const auditService = require('../services/audit.service');

/**
 * GET /api/ledger
 * Queries ledger logs for an owner or renter.
 */
async function getLedger(req, res, next) {
  const { owner_id, renter_id } = req.query;
  const user_id = owner_id || renter_id || req.auth.id;

  if (!user_id) {
    return res.status(400).json({ error: 'owner_id or renter_id is required' });
  }

  try {
    // If owner_id was passed, filter by owner. If renter_id, by renter.
    // Otherwise check req.auth role to determine column or filter by both.
    let col = 'owner_id';
    if (renter_id) {
      col = 'renter_id';
    } else if (req.auth && req.auth.role === 'buyer') {
      col = 'renter_id';
    }

    const result = await db.query(
      `SELECT rl.*,
              o.first_name || ' ' || o.last_name AS owner_name,
              r.first_name || ' ' || r.last_name AS renter_name,
              el.name AS listing_name
       FROM rental_ledger rl
       LEFT JOIN users o ON o.id = rl.owner_id
       LEFT JOIN users r ON r.id = rl.renter_id
       LEFT JOIN equipment_listings el ON el.id = rl.listing_id AND rl.listing_type = 'equipment'
       WHERE rl.${col} = $1
       ORDER BY rl.id DESC`,
      [user_id]
    );

    return res.json({ success: true, ledger: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/ledger/verify
 * Recalculates block hashes and validates chain integrity.
 */
async function verifyLedger(req, res, next) {
  try {
    const verification = await ledgerService.verifyLedgerChain();
    
    // Log verification status to audit logs
    if (!verification.valid) {
      await auditService.logAction(0, 'LEDGER_TAMPERED', req.ip, { broken_at: verification.broken_at });
    } else {
      await auditService.logAction(0, 'LEDGER_VERIFIED', req.ip, { total_records: verification.total_records });
    }

    return res.json({
      success: true,
      valid: verification.valid,
      total_records: verification.total_records,
      broken_at: verification.broken_at,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/ledger/verify-chain-data
 * Returns the raw block headers ordered by ID ascending for client-side chain validation.
 */
async function getLedgerChainData(req, res, next) {
  try {
    const result = await db.query(
      `SELECT tx_id, listing_id, renter_id, owner_id, amount, duration_days, prev_hash, block_hash, agreement_hash
       FROM rental_ledger
       ORDER BY id ASC`
    );
    return res.json({ success: true, ledger: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLedger,
  verifyLedger,
  getLedgerChainData,
};
