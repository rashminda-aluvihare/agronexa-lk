const db = require('../config/db');

/**
 * GET /api/reputation/:seller_id
 * Computes user reputation score and history indicators from verified ledger records.
 */
async function getReputationScore(req, res, next) {
  const { seller_id } = req.params;

  try {
    const result = await db.query(
      `SELECT COUNT(*) AS completed_rentals, COALESCE(SUM(amount), 0) AS total_value
       FROM rental_ledger WHERE owner_id = $1`,
      [seller_id]
    );

    const { completed_rentals, total_value } = result.rows[0];
    
    // Scale: min(5.0, (rentals / 10) * 5.0)
    const score = Math.min(5.0, (parseInt(completed_rentals, 10) / 10.0) * 5.0).toFixed(1);

    return res.json({
      success: true,
      score: parseFloat(score),
      completed_rentals: parseInt(completed_rentals, 10),
      total_value: parseFloat(total_value),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getReputationScore,
};
