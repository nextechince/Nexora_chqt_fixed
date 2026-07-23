/**
 * Authentication Utilities
 */
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * Generate OTP
 * @param {number} length - Length of OTP
 * @returns {string} OTP
 */
function generateOTP(length = 6) {
  return crypto
    .randomInt(10 ** (length - 1), 10 ** length)
    .toString()
    .padStart(length, '0');
}

/**
 * Hash password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if match
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate random token
 * @param {number} length - Token length
 * @returns {string} Random token
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate refresh token
 * @param {string} userId - User ID
 * @param {string} secret - Secret key
 * @returns {string} Refresh token
 */
function generateRefreshToken(userId, secret) {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: userId }, secret, { expiresIn: '30d' });
}

/**
 * Validate phone number
 * @param {string} phone - Phone number
 * @returns {boolean} True if valid
 */
function validatePhone(phone) {
  // Basic phone validation
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate email
 * @param {string} email - Email address
 * @returns {boolean} True if valid
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username
 * @param {string} username - Username
 * @returns {boolean} True if valid
 */
function validateUsername(username) {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
}

/**
 * Sanitize input
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Truncate string
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add
 * @returns {string} Truncated string
 */
function truncateString(str, length = 100, suffix = '...') {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + suffix;
}

/**
 * Format phone number
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
function formatPhone(phone) {
  if (!phone) return '';
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  // Format as (XXX) XXX-XXXX for US numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Format date
 * @param {Date|string} date - Date to format
 * @param {string} format - Format string
 * @returns {string} Formatted date
 */
function formatDate(date, format = 'default') {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'long':
      return d.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    case 'time':
      return d.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    case 'datetime':
      return d.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    default:
      return d.toISOString();
  }
}

/**
 * Get time ago
 * @param {Date|string} date - Date
 * @returns {string} Time ago string
 */
function timeAgo(date) {
  const now = new Date();
  const past = new Date(date);
  const diff = now - past;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

module.exports = {
  generateOTP,
  hashPassword,
  comparePassword,
  generateToken,
  generateRefreshToken,
  validatePhone,
  validateEmail,
  validateUsername,
  sanitizeInput,
  truncateString,
  formatPhone,
  formatDate,
  timeAgo
};
