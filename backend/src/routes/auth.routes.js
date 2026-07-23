/**
 * Authentication Routes
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

// Register
router.post('/register',
  [
    body('phone').isMobilePhone().withMessage('Valid phone number required'),
    body('username').isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
    body('displayName').isLength({ min: 2, max: 50 }),
    body('password').isLength({ min: 8 }),
    body('email').optional().isEmail()
  ],
  validate,
  authController.register
);

// Login
router.post('/login',
  [
    body('identifier').notEmpty().withMessage('Phone or email required'),
    body('password').notEmpty().withMessage('Password required')
  ],
  validate,
  authController.login
);

// Verify OTP
router.post('/verify-otp',
  [
    body('identifier').notEmpty().withMessage('Identifier required'),
    body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Valid 6-digit code required')
  ],
  validate,
  authController.verifyOTP
);

// Resend OTP
router.post('/resend-otp',
  [
    body('identifier').notEmpty().withMessage('Identifier required')
  ],
  validate,
  authController.resendOTP
);

// Refresh token
router.post('/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token required')
  ],
  validate,
  authController.refreshToken
);

// Logout
router.post('/logout',
  authenticate,
  authController.logout
);

// Forgot password
router.post('/forgot-password',
  [
    body('identifier').notEmpty().withMessage('Phone or email required')
  ],
  validate,
  authController.forgotPassword
);

// Reset password
router.post('/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  validate,
  authController.resetPassword
);

// Change password (authenticated)
router.post('/change-password',
  authenticate,
  [
    body('oldPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
  ],
  validate,
  authController.changePassword
);

// Get active sessions
router.get('/sessions',
  authenticate,
  authController.getSessions
);

// Revoke session
router.delete('/sessions/:id',
  authenticate,
  authController.revokeSession
);

module.exports = router;
