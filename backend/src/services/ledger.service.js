const crypto = require('crypto');
const db = require('../config/db');

/**
 * Computes the SHA-256 hash of a ledger block.
 * @param {object} record - Data fields of the transaction
 * @param {string} prevHash - Hash of the previous block
 * @returns {string} - Computed hex hash
 */
function hashRecord(record, prevHash) {
  const data = JSON.stringify(record) + prevHash;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Inserts a transaction into the immutable ledger after hashing it.
 */
async function writeLedgerEntry(listingId, listingType, renterId, ownerId, amount, durationDays) {
  // 1. Get previous block's hash
  const lastEntry = await db.query(
    `SELECT block_hash FROM rental_ledger ORDER BY id DESC LIMIT 1`
  );
  const prevHash = lastEntry.rows.length ? lastEntry.rows[0].block_hash : '0';

  // 2. Setup transaction details
  const txId = crypto.randomUUID().replace(/-/g, '');
  const recordData = {
    txId,
    listingId,
    renterId,
    ownerId,
    amount: parseFloat(amount),
    days: parseInt(durationDays, 10),
  };

  // 3. Compute block hash and agreement hash
  const blockHash = hashRecord(recordData, prevHash);
  const agreementText = `AGREEMENT: TX_ID=${txId} LISTING_ID=${listingId} RENTER_ID=${renterId} OWNER_ID=${ownerId} AMOUNT=${parseFloat(amount).toFixed(2)} DURATION=${parseInt(durationDays, 10)}`;
  const agreementHash = crypto.createHash('sha256').update(agreementText).digest('hex');

  // 4. Write to DB
  const result = await db.query(
    `INSERT INTO rental_ledger 
       (tx_id, listing_id, listing_type, renter_id, owner_id, amount, duration_days, prev_hash, block_hash, agreement_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      txId,
      listingId,
      listingType,
      renterId,
      ownerId,
      amount,
      durationDays,
      prevHash,
      blockHash,
      agreementHash,
    ]
  );

  return result.rows[0];
}

/**
 * Recalculates and verifies the cryptographic chain integrity of the ledger.
 */
async function verifyLedgerChain() {
  const result = await db.query(`SELECT * FROM rental_ledger ORDER BY id ASC`);
  const entries = result.rows;
  let prevHash = '0';

  for (const entry of entries) {
    const recordData = {
      txId: entry.tx_id,
      listingId: entry.listing_id,
      renterId: entry.renter_id,
      ownerId: entry.owner_id,
      amount: parseFloat(entry.amount),
      days: parseInt(entry.duration_days, 10),
    };

    const expectedHash = hashRecord(recordData, entry.prev_hash);

    const agreementText = `AGREEMENT: TX_ID=${entry.tx_id} LISTING_ID=${entry.listing_id} RENTER_ID=${entry.renter_id} OWNER_ID=${entry.owner_id} AMOUNT=${parseFloat(entry.amount).toFixed(2)} DURATION=${parseInt(entry.duration_days, 10)}`;
    const expectedAgreementHash = crypto.createHash('sha256').update(agreementText).digest('hex');

    if (
      expectedHash !== entry.block_hash ||
      entry.prev_hash !== prevHash ||
      expectedAgreementHash !== entry.agreement_hash
    ) {
      return {
        valid: false,
        total_records: entries.length,
        broken_at: entry.tx_id,
      };
    }
    prevHash = entry.block_hash;
  }

  return {
    valid: true,
    total_records: entries.length,
    broken_at: null,
  };
}

module.exports = {
  hashRecord,
  writeLedgerEntry,
  verifyLedgerChain,
};
