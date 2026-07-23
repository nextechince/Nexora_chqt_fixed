/**
 * Server Entry Point
 */
require('dotenv').config();
const app = require('./app');
const http = require('http');
const socketIO = require('socket.io');
const { setupSocket } = require('./config/socket');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Setup socket handlers
setupSocket(io);

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🚀 NEXORA CHQT Server running on http://${HOST}:${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
