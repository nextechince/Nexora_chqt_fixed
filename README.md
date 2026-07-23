# NEXORA CHQT

A modern, real-time messaging platform built with vanilla JavaScript, Node.js, and Supabase.

## Features

### 💬 Messaging
- Real-time messaging with Socket.IO
- Private chats, groups, and channels
- Message reactions, replies, and forwarding
- Read receipts and typing indicators
- Voice notes, images, videos, and file sharing

### 📞 Calls
- Voice and video calls with WebRTC
- Screen sharing
- Call history
- Mute/unmute, video toggle

### 👥 Groups
- Group creation and management
- Role-based permissions (Owner, Admin, Moderator, Member)
- Invite links with expiration
- Group announcements and polls

### 📢 Channels
- Public and private channels
- Channel posts and comments
- Subscribe/Unsubscribe
- Channel verification

### 🔐 Security
- JWT authentication
- Phone/email OTP verification
- Two-factor authentication (coming soon)
- End-to-end encryption
- Session management

### 🎨 UI/UX
- Dark theme with glassmorphism
- Responsive design
- Premium animations
- Toast notifications (no alerts)
- Customizable themes

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JS (ES6)
- **Backend**: Node.js, Express.js
- **Real-time**: Socket.IO
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Auth**: JWT, Twilio SMS, SendGrid Email
- **Deployment**: Docker, Nginx

## Quick Start

### Prerequisites
- Node.js v18+
- Docker (optional)
- Supabase account
- Twilio account (SMS)
- SendGrid account (Email)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/nexora-chqt.git
cd nexora-chqt
