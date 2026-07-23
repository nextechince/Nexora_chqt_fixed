/**
 * SMS Service (Twilio)
 */
const twilio = require('twilio');
const config = require('../config');

let client = null;

try {
  if (config.twilio.accountSid && config.twilio.authToken) {
    client = twilio(
      config.twilio.accountSid,
      config.twilio.authToken
    );
  }
} catch (error) {
  console.warn('⚠️ Twilio not configured:', error.message);
}

const smsService = {
  /**
   * Send OTP via SMS
   */
  async sendOTP(phoneNumber, otp) {
    if (!client) {
      console.log(`📱 [SMS] OTP ${otp} would be sent to ${phoneNumber}`);
      return { success: true, mock: true };
    }

    try {
      const message = await client.messages.create({
        body: `Your NEXORA CHQT verification code is: ${otp}\nThis code expires in 5 minutes.`,
        from: config.twilio.phoneNumber,
        to: phoneNumber
      });

      console.log(`📱 SMS sent to ${phoneNumber}: ${message.sid}`);
      return { success: true, sid: message.sid };
    } catch (error) {
      console.error('SMS send error:', error);
      throw new Error('Failed to send SMS');
    }
  },

  /**
   * Send password reset via SMS
   */
  async sendPasswordReset(phoneNumber, resetLink) {
    if (!client) {
      console.log(`📱 [SMS] Reset link would be sent to ${phoneNumber}`);
      return { success: true, mock: true };
    }

    try {
      const message = await client.messages.create({
        body: `Reset your NEXORA CHQT password: ${resetLink}\nThis link expires in 1 hour.`,
        from: config.twilio.phoneNumber,
        to: phoneNumber
      });

      console.log(`📱 Reset SMS sent to ${phoneNumber}: ${message.sid}`);
      return { success: true, sid: message.sid };
    } catch (error) {
      console.error('SMS reset send error:', error);
      throw new Error('Failed to send reset SMS');
    }
  },

  /**
   * Send notification via SMS
   */
  async sendNotification(phoneNumber, message) {
    if (!client) {
      console.log(`📱 [SMS] Notification would be sent to ${phoneNumber}`);
      return { success: true, mock: true };
    }

    try {
      const msg = await client.messages.create({
        body: message,
        from: config.twilio.phoneNumber,
        to: phoneNumber
      });

      console.log(`📱 SMS notification sent to ${phoneNumber}: ${msg.sid}`);
      return { success: true, sid: msg.sid };
    } catch (error) {
      console.error('SMS notification error:', error);
      throw new Error('Failed to send notification');
    }
  },

  /**
   * Send bulk SMS
   */
  async sendBulk(phoneNumbers, message) {
    if (!client) {
      console.log(`📱 [SMS] Bulk SMS would be sent to ${phoneNumbers.length} recipients`);
      return { success: true, mock: true };
    }

    try {
      const promises = phoneNumbers.map(phone => {
        return client.messages.create({
          body: message,
          from: config.twilio.phoneNumber,
          to: phone
        });
      });

      const results = await Promise.all(promises);
      console.log(`📱 Bulk SMS sent to ${results.length} recipients`);
      return { success: true, count: results.length };
    } catch (error) {
      console.error('Bulk SMS error:', error);
      throw new Error('Failed to send bulk SMS');
    }
  }
};

module.exports = smsService;
