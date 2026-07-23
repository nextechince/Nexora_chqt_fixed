/**
 * Authentication Middleware
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const { supabase } = require('../config/supabase');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    
    // Verify JWT
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Check if session exists
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', decoded.id)
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (error || !session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Check if session expired
    if (new Date(session.expires_at) < new Date()) {
      await supabase
        .from('sessions')
        .update({ is_active: false })
        .eq('id', session.id);
      
      return res.status(401).json({ error: 'Session expired' });
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user and session to request
    req.user = user;
    req.session = session;
    req.token = token;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requirePremium(req, res, next) {
  if (!req.user || !req.user.is_premium) {
    return res.status(403).json({ error: 'Premium subscription required' });
  }
  next();
}

module.exports = {
  authenticate,
  requireAdmin,
  requirePremium
};
