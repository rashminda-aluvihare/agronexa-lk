/**
 * ====================================================================================
 * VIVA EXPLANATION - TAMPER-EVIDENT SHA-256 TRANSACTION LEDGER SERVICE
 * ====================================================================================
 * Key Examiner Questions & Answers:
 * 
 * 1. Why do we need a cryptographic ledger in an agricultural platform?
 *    - To prevent fraud and unauthorized modification of machinery lease contracts/financials.
 *    - Guarantees transaction history immutability without requiring expensive blockchain gas fees.
 * 
 * 2. How are the blocks chained together?
 *    - Each block calculates: block_hash = SHA256(JSON(record_data) + prev_hash)
 *    - The genesis (first) block uses prev_hash = '0'. Subsequent blocks link to the previous record's `block_hash`.
 * 
 * 3. How does verification detect database tampering?
 *    - `verifyLedgerChain()` re-executes SHA-256 hashing for every row in chronological order.
 *    - If an attacker manually modifies `amount` or `duration` in PostgreSQL, the computed hash will mismatch `block_hash`, immediately identifying the broken transaction ID.
 * ====================================================================================
 */

const crypto = require('crypto');
const db = require('../config/db');

/**
 * Helper Function: Computes SHA-256 hash of a single ledger block.
 * @param {object} record - Transaction data payload (txId, listingId, renterId, ownerId, amount, days)
 * @param {string} prevHash - SHA-256 hash string of the preceding block
 * @returns {string} - Computed 64-character hexadecimal hash
 */
function hashRecord(record, prevHash) {
  const data = JSON.stringify(record) + prevHash;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Writes an immutable block entry into `rental_ledger` PostgreSQL table.
 */
async function writeLedgerEntry(listingId, listingType, renterId, ownerId, amount, durationDays) {
  // Step 1: Fetch the hash of the latest block in the chain (or '0' if first block)
  const lastEntry = await db.query(
    `SELECT block_hash FROM rental_ledger ORDER BY id DESC LIMIT 1`
  );
  const prevHash = lastEntry.rows.length ? lastEntry.rows[0].block_hash : '0';

  // Step 2: Construct transaction payload
  const txId = crypto.randomUUID().replace(/-/g, ''); // Generate unique transaction ID
  const recordData = {
    txId,
    listingId,
    renterId,
    ownerId,
    amount: parseFloat(amount),
    days: parseInt(durationDays, 10),
  };

  // Step 3: Calculate SHA-256 block hash & legal contract agreement text hash
  const blockHash = hashRecord(recordData, prevHash);
  const agreementText = `AGREEMENT: TX_ID=${txId} LISTING_ID=${listingId} RENTER_ID=${renterId} OWNER_ID=${ownerId} AMOUNT=${parseFloat(amount).toFixed(2)} DURATION=${parseInt(durationDays, 10)}`;
  const agreementHash = crypto.createHash('sha256').update(agreementText).digest('hex');

  // Step 4: Persist block into PostgreSQL database
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
 * System Audit Function: Recalculates and verifies cryptographic chain integrity from start to end.
 */
async function verifyLedgerChain() {
  const result = await db.query(`SELECT * FROM rental_ledger ORDER BY id ASC`);
  const entries = result.rows;
  let prevHash = '0';

  // Iterate over every historical transaction block in chronological order
  for (const entry of entries) {
    const recordData = {
      txId: entry.tx_id,
      listingId: entry.listing_id,
      renterId: entry.renter_id,
      ownerId: entry.owner_id,
      amount: parseFloat(entry.amount),
      days: parseInt(entry.duration_days, 10),
    };

    // Recompute expected block hash and agreement hash
    const expectedHash = hashRecord(recordData, entry.prev_hash);

    const agreementText = `AGREEMENT: TX_ID=${entry.tx_id} LISTING_ID=${entry.listing_id} RENTER_ID=${entry.renter_id} OWNER_ID=${entry.owner_id} AMOUNT=${parseFloat(entry.amount).toFixed(2)} DURATION=${parseInt(entry.duration_days, 10)}`;
    const expectedAgreementHash = crypto.createHash('sha256').update(agreementText).digest('hex');

    // Check if stored values match recomputed values
    if (
      expectedHash !== entry.block_hash ||
      entry.prev_hash !== prevHash ||
      expectedAgreementHash !== entry.agreement_hash
    ) {
      // Tampering detected! Return location of corrupted block.
      return {
        valid: false,
        total_records: entries.length,
        broken_at: entry.tx_id,
      };
    }
    prevHash = entry.block_hash;
  }

  // Chain is intact and untampered
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

