/**
 * Email Service (SendGrid)
 */
const sendgrid = require('@sendgrid/mail');
const config = require('../config');

let isConfigured = false;

try {
  if (config.sendgrid.apiKey) {
    sendgrid.setApiKey(config.sendgrid.apiKey);
    isConfigured = true;
  }
} catch (error) {
  console.warn('⚠️ SendGrid not configured:', error.message);
}

const emailService = {
  /**
   * Send OTP via Email
   */
  async sendOTP(email, otp) {
    if (!isConfigured) {
      console.log(`📧 [Email] OTP ${otp} would be sent to ${email}`);
      return { success: true, mock: true };
    }

    try {
      const msg = {
        to: email,
        from: config.sendgrid.from,
        subject: 'Your NEXORA CHQT Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #5865F2;">NEXORA CHQT</h1>
            <h2>Verification Code</h2>
            <p>Your verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; padding: 20px; background: #f4f4f4; border-radius: 8px; text-align: center; letter-spacing: 8px;">
              ${otp}
            </div>
            <p style="color: #666; font-size: 14px;">This code expires in 5 minutes.</p>
            <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
        text: `Your NEXORA CHQT verification code is: ${otp}\nThis code expires in 5 minutes.`
      };

      await sendgrid.send(msg);
      console.log(`📧 Email OTP sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error('Failed to send email');
    }
  },

  /**
   * Send password reset email
   */
  async sendPasswordReset(email, resetLink) {
    if (!isConfigured) {
      console.log(`📧 [Email] Reset link would be sent to ${email}`);
      return { success: true, mock: true };
    }

    try {
      const msg = {
        to: email,
        from: config.sendgrid.from,
        subject: 'Reset Your NEXORA CHQT Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #5865F2;">NEXORA CHQT</h1>
            <h2>Password Reset</h2>
            <p>We received a request to reset your password. Click the button below to set a new password:</p>
            <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #5865F2; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Reset Password
            </a>
            <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
            <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
        text: `Reset your NEXORA CHQT password: ${resetLink}\nThis link expires in 1 hour.`
      };

      await sendgrid.send(msg);
      console.log(`📧 Password reset email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Email reset send error:', error);
      throw new Error('Failed to send reset email');
    }
  },

  /**
   * Send welcome email
   */
  async sendWelcome(email, username) {
    if (!isConfigured) {
      console.log(`📧 [Email] Welcome email would be sent to ${email}`);
      return { success: true, mock: true };
    }

    try {
      const msg = {
        to: email,
        from: config.sendgrid.from,
        subject: 'Welcome to NEXORA CHQT!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #5865F2;">Welcome to NEXORA CHQT!</h1>
            <p>Hi ${username},</p>
            <p>Thanks for joining NEXORA CHQT - the next generation messaging platform.</p>
            <p>Here are some things you can do:</p>
            <ul>
              <li>💬 Start chatting with friends</li>
              <li>👥 Create groups and channels</li>
              <li>📞 Make voice and video calls</li>
              <li>🎨 Customize your profile</li>
            </ul>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p style="color: #666;">The NEXORA CHQT Team</p>
          </div>
        `,
        text: `Welcome to NEXORA CHQT!\nHi ${username},\nThanks for joining NEXORA CHQT - the next generation messaging platform.\n\nYou can now start chatting, create groups, make calls, and more!`
      };

      await sendgrid.send(msg);
      console.log(`📧 Welcome email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Welcome email error:', error);
      // Don't throw, welcome email is not critical
      return { success: false, error: error.message };
    }
  },

  /**
   * Send notification email
   */
  async sendNotification(email, subject, message) {
    if (!isConfigured) {
      console.log(`📧 [Email] Notification would be sent to ${email}`);
      return { success: true, mock: true };
    }

    try {
      const msg = {
        to: email,
        from: config.sendgrid.from,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #5865F2;">NEXORA CHQT</h1>
            <p>${message}</p>
          </div>
        `,
        text: message
      };

      await sendgrid.send(msg);
      console.log(`📧 Notification email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Notification email error:', error);
      throw new Error('Failed to send notification');
    }
  },

  /**
   * Send bulk email
   */
  async sendBulk(emails, subject, message) {
    if (!isConfigured) {
      console.log(`📧 [Email] Bulk email would be sent to ${emails.length} recipients`);
      return { success: true, mock: true };
    }

    try {
      const promises = emails.map(email => {
        return sendgrid.send({
          to: email,
          from: config.sendgrid.from,
          subject: subject,
          html: message,
          text: message.replace(/<[^>]+>/g, '')
        });
      });

      await Promise.all(promises);
      console.log(`📧 Bulk email sent to ${emails.length} recipients`);
      return { success: true, count: emails.length };
    } catch (error) {
      console.error('Bulk email error:', error);
      throw new Error('Failed to send bulk email');
    }
  }
};

module.exports = emailService;
