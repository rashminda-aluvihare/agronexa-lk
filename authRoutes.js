const express = require("express");
const router  = express.Router();

// Twilio client — initialised lazily so the server still boots
// even if TWILIO_* env vars are not yet set (will error at call-time).
function getTwilio() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN missing).");
  }
  return require("twilio")(accountSid, authToken);
}

// ── POST /api/auth/send-otp ──────────────────────────────────────────────────
// Body: { phone: "+94771234567" }   ← E.164 format
router.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, error: "Phone number is required." });
  }

  try {
    const client = getTwilio();
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verifications.create({ to: phone, channel: "sms" });

    res.json({ success: true, message: "OTP sent successfully." });
  } catch (err) {
    console.error("send-otp error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/auth/verify-otp ────────────────────────────────────────────────
// Body: { phone: "+94771234567", code: "123456" }
router.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ success: false, error: "Phone and code are required." });
  }

  try {
    const client = getTwilio();
    const check  = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({ to: phone, code });

    if (check.status === "approved") {
      res.json({ success: true,  message: "Phone verified." });
    } else {
      res.json({ success: false, error: "Invalid or expired OTP." });
    }
  } catch (err) {
    console.error("verify-otp error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;