/**
 * Routes Index
 */
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const chatRoutes = require('./chat.routes');
const messageRoutes = require('./message.routes');
const groupRoutes = require('./group.routes');
const channelRoutes = require('./channel.routes');
const callRoutes = require('./call.routes');
const mediaRoutes = require('./media.routes');
const notificationRoutes = require('./notification.routes');
const adminRoutes = require('./admin.routes');
const premiumRoutes = require('./premium.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/chats', chatRoutes);
router.use('/messages', messageRoutes);
router.use('/groups', groupRoutes);
router.use('/channels', channelRoutes);
router.use('/calls', callRoutes);
router.use('/media', mediaRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/premium', premiumRoutes);

module.exports = router;
