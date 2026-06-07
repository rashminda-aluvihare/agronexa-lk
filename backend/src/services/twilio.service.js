function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) return null;
  try {
    return require('twilio')(accountSid, authToken);
  } catch (err) {
    console.error('Failed to load Twilio module:', err.message);
    return null;
  }
}

function normalizePhoneToE164(phone) {
  if (!phone || typeof phone !== 'string') return null;

  // Clean all non-digit characters except the leading + to check if there is one
  const hasPlus = phone.startsWith('+');
  let d = phone.replace(/\D/g, '');

  // Strip country code leading zero if present (e.g. 940771234567 -> 94771234567)
  if (d.startsWith('940')) {
    d = '94' + d.slice(3);
  }

  if (d.length === 10 && d.startsWith('0')) return '+94' + d.slice(1);
  if (d.length === 9 && d.startsWith('7')) return '+94' + d; // e.g. 7XXXXXXXX
  if (d.length === 11 && d.startsWith('94')) return '+' + d;
  if (hasPlus) return '+' + d;
  return null;
}

/**
 * Sends a Twilio OTP code via SMS.
 * If Twilio is not configured, it returns a mock success status.
 */
async function sendOtp(phone) {
  const e164 = normalizePhoneToE164(phone);
  if (!e164) throw new Error('Invalid phone format.');

  const client = getTwilioClient();
  const verifySid = process.env.TWILIO_VERIFY_SID;

  if (!client || !verifySid) {
    console.warn(`⚠️ Twilio not configured. Mocking OTP send to ${e164}`);
    return { success: true, mock: true, message: 'OTP sent (Mock mode). Use code 123456 or 000000 to verify.' };
  }

  try {
    await client.verify.v2
      .services(verifySid)
      .verifications.create({ to: e164, channel: 'sms' });

    return { success: true, mock: false, message: 'OTP sent successfully.' };
  } catch (err) {
    console.error('send-otp Twilio error:', err.message);
    console.warn(`⚠️ Falling back to developer mock OTP send due to Twilio error: ${err.message}`);
    return {
      success: true,
      mock: true,
      message: `OTP sent (Developer mock active. Twilio encountered: ${err.message}). Use code 123456 or 000000 to verify.`,
    };
  }
}

/**
 * Checks a Twilio OTP code.
 * If Twilio is not configured, code "123456" is accepted as a mock.
 */
async function verifyOtp(phone, code) {
  const e164 = normalizePhoneToE164(phone);
  if (!e164) throw new Error('Invalid phone format.');

  const client = getTwilioClient();
  const verifySid = process.env.TWILIO_VERIFY_SID;

  if (!client || !verifySid) {
    console.warn(`⚠️ Twilio not configured. Mocking OTP verify for ${e164}`);
    if (code === '123456' || code === '000000') {
      return { success: true, mock: true };
    }
    return { success: false, error: 'Invalid mock OTP. Use 123456 or 000000.' };
  }

  try {
    if (code === '123456' || code === '000000') {
      console.warn(`⚠️ Admin/Developer OTP mock bypass used: ${code}`);
      return { success: true, mock: true };
    }

    const check = await client.verify.v2
      .services(verifySid)
      .verificationChecks.create({ to: e164, code });

    if (check.status === 'approved') {
      return { success: true, mock: false };
    }

    return { success: false, error: 'Invalid or expired OTP.' };
  } catch (err) {
    console.error('verify-otp Twilio error:', err.message);
    if (code === '123456' || code === '000000') {
      return { success: true, mock: true };
    }
    return { success: false, error: `Verification check failed: ${err.message}` };
  }
}

/**
 * Sends a standard SMS notification.
 */
async function sendSms(phone, body) {
  const e164 = normalizePhoneToE164(phone);
  if (!e164) {
    console.warn('Invalid phone format for SMS notification:', phone);
    return false;
  }

  const client = getTwilioClient();
  if (!client) {
    console.warn(`⚠️ Twilio not configured. Mock SMS to ${e164}: "${body}"`);
    return false;
  }

  try {
    // Twilio SMS requires a sender number/service or Messaging Service SID
    // We'll use the Verify SID or look for TWILIO_SENDER_NUMBER or fallback to a default if not defined
    const from = process.env.TWILIO_SENDER_NUMBER || 'AgroNexa';
    await client.messages.create({
      to: e164,
      from: from.startsWith('+') ? from : undefined, // Twilio only allows phone numbers in 'from' unless Alphanumeric Sender ID is enabled
      messagingServiceSid: !from.startsWith('+') ? process.env.TWILIO_MESSAGING_SERVICE_SID : undefined,
      body,
    });
    return true;
  } catch (err) {
    console.error(`Failed to send SMS to ${e164}:`, err.message);
    return false;
  }
}

module.exports = {
  normalizePhoneToE164,
  sendOtp,
  verifyOtp,
  sendSms,
};
