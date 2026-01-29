// Utility/email.service.js
const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection (only if credentials are provided)
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter.verify((error, success) => {
    if (error) {
      console.log('⚠️  Email service configuration issue:', error.message);
      console.log('📧 Email notifications will be logged to console');
    } else {
      console.log('✅ Email service ready');
    }
  });
} else {
  console.log('ℹ️  Email service not configured (optional). Set EMAIL_USER and EMAIL_PASS in .env to enable email notifications');
}

/**
 * Send email
 */
async function sendEmail(to, subject, html, text) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    // Email service is optional - silently log or skip
    // Uncomment next line if you want to see email logs
    // console.log('📧 [Email] Would send to:', to, '| Subject:', subject);
    return { success: true, message: 'Email logged (service not configured)' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"OrderMitra" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: text || html,
      html,
    });
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email, resetToken, resetUrl) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ff6b35; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 30px; background: #ff6b35; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🍔 OrderMitra</h1>
        </div>
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} OrderMitra. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, 'Reset Your OrderMitra Password', html);
}

/**
 * Send order confirmation email
 */
async function sendOrderConfirmationEmail(email, orderNumber, orderDetails) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ff6b35; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .order-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🍔 OrderMitra</h1>
        </div>
        <div class="content">
          <h2>Order Confirmed!</h2>
          <p>Your order has been placed successfully.</p>
          <div class="order-info">
            <p><strong>Order Number:</strong> ${orderNumber}</p>
            <p><strong>Total Amount:</strong> ₹${orderDetails.totalPrice}</p>
            <p><strong>Status:</strong> ${orderDetails.status}</p>
          </div>
          <p>Track your order in real-time from your dashboard.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} OrderMitra. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, `Order Confirmed - ${orderNumber}`, html);
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail(email, name) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ff6b35; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🍔 OrderMitra</h1>
        </div>
        <div class="content">
          <h2>Welcome to OrderMitra, ${name || 'there'}!</h2>
          <p>Thank you for joining us. Start ordering delicious food from your favorite restaurants.</p>
          <p>Happy ordering! 🎉</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} OrderMitra. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, 'Welcome to OrderMitra!', html);
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendWelcomeEmail,
};

