const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '../../../sent_emails.log');

/**
 * Configure Nodemailer transport dynamically based on environment variables.
 */
function getTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  if (process.env.SMTP_SERVICE === 'gmail' || process.env.SMTP_USER) {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }
  return null;
}

/**
 * Logs sent emails to sent_emails.log for tracking and local development.
 */
function logEmailToFile(to, subject, bodyText) {
  const timestamp = new Date().toISOString();
  const logEntry = `\n[${timestamp}] EMAIL TO: ${to}\nSUBJECT: ${subject}\nBODY:\n${bodyText}\n----------------------------------------\n`;
  try {
    fs.appendFileSync(logPath, logEntry);
  } catch (err) {
    console.error('⚠️ Failed to append email log to sent_emails.log:', err.message);
  }
}

/**
 * Generic email sending service function.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} [options.html] - HTML content
 */
async function sendEmail({ to, subject, text, html }) {
  console.log(`\n📧 [EMAIL DISPATCH TO ${to}]`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${text}\n`);

  // Log to local sent_emails.log file
  logEmailToFile(to, subject, text);

  // If SMTP is configured, attempt sending real email via Nodemailer
  const activeTransporter = getTransporter();
  if (activeTransporter) {
    try {
      const info = await activeTransporter.sendMail({
        from: process.env.EMAIL_FROM || (process.env.SMTP_USER ? `"AgroNexa LK" <${process.env.SMTP_USER}>` : '"AgroNexa LK Support" <no-reply@agronexa.lk>'),
        to,
        subject,
        text,
        html: html || text,
      });
      console.log(`✅ Real Email dispatched via SMTP: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ SMTP Email dispatch failed for ${to}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  return { success: true, simulated: true };
}

/**
 * Sends Account Approval Email notification to user.
 * @param {Object} params
 * @param {string} params.email - User email
 * @param {string} params.name - User first name
 */
async function sendAccountApprovalEmail({ email, name }) {
  const userName = name || 'User';
  const subject = '🎉 AgroNexa LK - Account Approved | ඔබේ ගිණුම අනුමත විය';
  const text = `Hello ${userName},

Great news! Your AgroNexa LK account registration has been reviewed and APPROVED by our administration team.

You can now log in to your account to access all platform features including crop listings, equipment rentals, transport services, and direct messaging.

Log in here: http://localhost:3000/index.html

Thank you for joining AgroNexa LK!

Best regards,
AgroNexa LK Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #166534;">🎉 AgroNexa LK Account Approved!</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>Great news! Your AgroNexa LK account registration has been reviewed and <strong style="color: #166534;">APPROVED</strong> by our administration team.</p>
      <p>You can now log in to access all platform features including crop listings, equipment rentals, transport services, and marketplace direct messaging.</p>
      <div style="margin: 24px 0;">
        <a href="http://localhost:3000/index.html" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Log In to AgroNexa LK</a>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      <p style="font-size: 12px; color: #64748b;">AgroNexa LK - Empowering Sri Lankan Agriculture</p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
}

/**
 * Sends Account Rejection Email notification to user.
 * @param {Object} params
 * @param {string} params.email - User email
 * @param {string} params.name - User first name
 * @param {string} params.reason - Reason for rejection
 */
async function sendAccountRejectionEmail({ email, name, reason }) {
  const userName = name || 'User';
  const rejectReason = reason || 'NIC verification details did not match system requirements.';
  const subject = '⚠️ AgroNexa LK - Account Registration Status | ගිණුම් තත්ත්වය';
  const text = `Hello ${userName},

We have reviewed your AgroNexa LK account registration application.

Unfortunately, your registration could NOT be approved at this time.

Reason: ${rejectReason}

If you believe this was an error or if you wish to resubmit your valid credentials, please contact our support team or register again with accurate information.

Contact Support: admin@agronexa.lk

Best regards,
AgroNexa LK Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #991b1b;">⚠️ AgroNexa LK Account Status Update</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>We have reviewed your AgroNexa LK account registration application.</p>
      <p>Unfortunately, your account registration could <strong>NOT</strong> be approved at this time.</p>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0; border-radius: 4px;">
        <strong>Reason:</strong> ${rejectReason}
      </div>
      <p>If you believe this was an error or wish to re-register with updated documents, please contact our support team.</p>
      <p><strong>Support Email:</strong> <a href="mailto:admin@agronexa.lk">admin@agronexa.lk</a></p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      <p style="font-size: 12px; color: #64748b;">AgroNexa LK - Empowering Sri Lankan Agriculture</p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
}

module.exports = {
  sendEmail,
  sendAccountApprovalEmail,
  sendAccountRejectionEmail,
};
