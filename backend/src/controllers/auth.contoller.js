/**
 * Authentication Controller
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');
const config = require('../config');
const smsService = require('../services/sms.service');
const emailService = require('../services/email.service');
const { generateOTP, hashPassword, comparePassword } = require('../utils/auth');

const authController = {
  /**
   * Register new user
   */
  async register(req, res) {
    try {
      const { phone, email, username, displayName, password } = req.body;

      // Check if user exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .or(`phone.eq.${phone},email.eq.${email},username.eq.${username}`)
        .single();

      if (existingUser) {
        return res.status(400).json({ 
          error: 'User already exists with this phone, email, or username' 
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const { data: user, error: createError } = await supabase
        .from('users')
        .insert({
          id: uuidv4(),
          phone,
          email: email || null,
          username,
          display_name: displayName,
          password_hash: hashedPassword,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Create user error:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      // Generate OTP
      const otp = generateOTP();
      
      // Store OTP in database
      await supabase
        .from('otp_verifications')
        .insert({
          user_id: user.id,
          identifier: phone,
          code: otp,
          type: 'phone',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        });

      // Send OTP via SMS
      await smsService.sendOTP(phone, otp);

      // Generate tokens
      const token = jwt.sign(
        { id: user.id, phone: user.phone },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      const refreshToken = jwt.sign(
        { id: user.id },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn }
      );

      // Store session
      await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          token,
          refresh_token: refreshToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

      return res.status(201).json({
        message: 'User registered successfully. Please verify your phone number.',
        requiresOTP: true,
        identifier: phone,
        user: {
          id: user.id,
          phone: user.phone,
          username: user.username,
          display_name: user.display_name
        },
        token,
        refreshToken
      });

    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({ error: 'Registration failed' });
    }
  },

  /**
   * Login user
   */
  async login(req, res) {
    try {
      const { identifier, password, remember } = req.body;

      // Find user by phone or email
      const { data: user, error: findError } = await supabase
        .from('users')
        .select('*')
        .or(`phone.eq.${identifier},email.eq.${identifier}`)
        .single();

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isValid = await comparePassword(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if 2FA is enabled
      if (user.two_factor_enabled) {
        const otp = generateOTP();
        
        await supabase
          .from('otp_verifications')
          .insert({
            user_id: user.id,
            identifier: user.phone || user.email,
            code: otp,
            type: user.two_factor_method || 'sms',
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
          });

        // Send OTP
        if (user.two_factor_method === 'sms') {
          await smsService.sendOTP(user.phone, otp);
        } else {
          await emailService.sendOTP(user.email, otp);
        }

        return res.status(200).json({
          requiresOTP: true,
          identifier: user.phone || user.email,
          twoFactor: true
        });
      }

      // Generate tokens
      const token = jwt.sign(
        { id: user.id, phone: user.phone },
        config.jwt.secret,
        { expiresIn: remember ? '30d' : config.jwt.expiresIn }
      );

      const refreshToken = jwt.sign(
        { id: user.id },
        config.jwt.refreshSecret,
        { expiresIn: remember ? '60d' : config.jwt.refreshExpiresIn }
      );

      // Store session
      await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          token,
          refresh_token: refreshToken,
          device_name: req.headers['user-agent'] || 'Unknown Device',
          ip_address: req.ip,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      // Update user online status
      await supabase
        .from('users')
        .update({ online_status: true, last_seen: new Date().toISOString() })
        .eq('id', user.id);

      // Remove sensitive data
      delete user.password_hash;

      return res.status(200).json({
        message: 'Login successful',
        user,
        token,
        refreshToken
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  },

  /**
   * Verify OTP
   */
  async verifyOTP(req, res) {
    try {
      const { identifier, code } = req.body;

      // Find OTP record
      const { data: otpRecord, error: otpError } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('identifier', identifier)
        .eq('code', code)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (otpError || !otpRecord) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }

      // Check expiration
      if (new Date(otpRecord.expires_at) < new Date()) {
        return res.status(400).json({ error: 'OTP has expired' });
      }

      // Mark OTP as used
      await supabase
        .from('otp_verifications')
        .update({ used: true })
        .eq('id', otpRecord.id);

      // Get user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', otpRecord.user_id)
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate tokens
      const token = jwt.sign(
        { id: user.id, phone: user.phone },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      const refreshToken = jwt.sign(
        { id: user.id },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn }
      );

      // Store session
      await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          token,
          refresh_token: refreshToken,
          device_name: req.headers['user-agent'] || 'Unknown Device',
          ip_address: req.ip,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      // Update user
      if (!user.phone_verified) {
        await supabase
          .from('users')
          .update({ phone_verified: true, online_status: true })
          .eq('id', user.id);
      } else {
        await supabase
          .from('users')
          .update({ online_status: true, last_seen: new Date().toISOString() })
          .eq('id', user.id);
      }

      delete user.password_hash;

      return res.status(200).json({
        message: 'OTP verified successfully',
        user,
        token,
        refreshToken
      });

    } catch (error) {
      console.error('Verify OTP error:', error);
      return res.status(500).json({ error: 'OTP verification failed' });
    }
  },

  /**
   * Resend OTP
   */
  async resendOTP(req, res) {
    try {
      const { identifier } = req.body;

      // Get user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .or(`phone.eq.${identifier},email.eq.${identifier}`)
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate new OTP
      const otp = generateOTP();

      // Store OTP
      await supabase
        .from('otp_verifications')
        .insert({
          user_id: user.id,
          identifier,
          code: otp,
          type: identifier.includes('@') ? 'email' : 'sms',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        });

      // Send OTP
      if (identifier.includes('@')) {
        await emailService.sendOTP(identifier, otp);
      } else {
        await smsService.sendOTP(identifier, otp);
      }

      return res.status(200).json({
        message: 'OTP resent successfully'
      });

    } catch (error) {
      console.error('Resend OTP error:', error);
      return res.status(500).json({ error: 'Failed to resend OTP' });
    }
  },

  /**
   * Refresh token
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

      // Check session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('refresh_token', refreshToken)
        .eq('is_active', true)
        .single();

      if (sessionError || !session) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      // Generate new tokens
      const newToken = jwt.sign(
        { id: decoded.id },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      const newRefreshToken = jwt.sign(
        { id: decoded.id },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn }
      );

      // Update session
      await supabase
        .from('sessions')
        .update({
          token: newToken,
          refresh_token: newRefreshToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', session.id);

      return res.status(200).json({
        token: newToken,
        refreshToken: newRefreshToken
      });

    } catch (error) {
      console.error('Refresh token error:', error);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  },

  /**
   * Logout
   */
  async logout(req, res) {
    try {
      const userId = req.user.id;
      const token = req.token;

      // Update session
      await supabase
        .from('sessions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('token', token);

      // Update user status
      await supabase
        .from('users')
        .update({ online_status: false, last_seen: new Date().toISOString() })
        .eq('id', userId);

      return res.status(200).json({
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ error: 'Logout failed' });
    }
  },

  /**
   * Forgot password
   */
  async forgotPassword(req, res) {
    try {
      const { identifier } = req.body;

      // Find user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, phone, email')
        .or(`phone.eq.${identifier},email.eq.${identifier}`)
        .single();

      if (userError || !user) {
        // Don't reveal if user exists
        return res.status(200).json({
          message: 'If an account exists, a reset link has been sent'
        });
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { id: user.id },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      // Store reset token
      await supabase
        .from('password_resets')
        .insert({
          user_id: user.id,
          token: resetToken,
          expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
        });

      // Send reset link
      const resetLink = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
      
      if (user.email) {
        await emailService.sendPasswordReset(user.email, resetLink);
      } else if (user.phone) {
        await smsService.sendPasswordReset(user.phone, resetLink);
      }

      return res.status(200).json({
        message: 'If an account exists, a reset link has been sent'
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({ error: 'Failed to process request' });
    }
  },

  /**
   * Reset password
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);

      // Check reset record
      const { data: reset, error: resetError } = await supabase
        .from('password_resets')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .single();

      if (resetError || !reset) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Check expiration
      if (new Date(reset.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Reset token has expired' });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password
      await supabase
        .from('users')
        .update({ password_hash: hashedPassword })
        .eq('id', reset.user_id);

      // Mark reset as used
      await supabase
        .from('password_resets')
        .update({ used: true })
        .eq('id', reset.id);

      // Revoke all sessions
      await supabase
        .from('sessions')
        .update({ is_active: false })
        .eq('user_id', reset.user_id);

      return res.status(200).json({
        message: 'Password reset successfully'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({ error: 'Failed to reset password' });
    }
  },

  /**
   * Change password (authenticated)
   */
  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Get user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify old password
      const isValid = await comparePassword(oldPassword, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      await supabase
        .from('users')
        .update({ password_hash: hashedPassword })
        .eq('id', userId);

      return res.status(200).json({
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({ error: 'Failed to change password' });
    }
  },

  /**
   * Get active sessions
   */
  async getSessions(req, res) {
    try {
      const userId = req.user.id;

      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('id, device_name, ip_address, created_at, expires_at, is_active')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: 'Failed to get sessions' });
      }

      return res.status(200).json({ sessions });

    } catch (error) {
      console.error('Get sessions error:', error);
      return res.status(500).json({ error: 'Failed to get sessions' });
    }
  },

  /**
   * Revoke session
   */
  async revokeSession(req, res) {
    try {
      const userId = req.user.id;
      const sessionId = req.params.id;

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      await supabase
        .from('sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      return res.status(200).json({
        message: 'Session revoked successfully'
      });

    } catch (error) {
      console.error('Revoke session error:', error);
      return res.status(500).json({ error: 'Failed to revoke session' });
    }
  }
};

module.exports = authController;
