-- Initial Database Schema for NEXORA CHQT

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    username VARCHAR(30) UNIQUE NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    status TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_premium BOOLEAN DEFAULT false,
    premium_until TIMESTAMP,
    phone_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    online_status BOOLEAN DEFAULT false,
    last_seen TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_method VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    birth_date DATE,
    country VARCHAR(100),
    city VARCHAR(100),
    bio TEXT,
    website VARCHAR(255),
    occupation VARCHAR(100),
    company VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    refresh_token VARCHAR(500),
    socket_id VARCHAR(100),
    device_name VARCHAR(100),
    device_type VARCHAR(50),
    ip_address INET,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- OTP Verifications table
CREATE TABLE otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    identifier VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    type VARCHAR(20) NOT NULL,
    used BOOLEAN DEFAULT false,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password Resets table
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    used BOOLEAN DEFAULT false,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chats table
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) CHECK (type IN ('private', 'group', 'channel')) NOT NULL,
    name VARCHAR(100),
    avatar_url TEXT,
    description TEXT,
    created_by UUID REFERENCES users(id),
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat Members table
CREATE TABLE chat_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) CHECK (role IN ('owner', 'admin', 'moderator', 'member')) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP,
    is_pinned BOOLEAN DEFAULT false,
    pinned_at TIMESTAMP,
    is_archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMP,
    mute_until TIMESTAMP,
    UNIQUE(chat_id, user_id)
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT,
    message_type VARCHAR(30) CHECK (message_type IN (
        'text', 'image', 'video', 'audio', 'file', 'voice', 'sticker', 'gif',
        'poll', 'event', 'announcement', 'reply'
    )) DEFAULT 'text',
    media_url TEXT,
    media_thumbnail TEXT,
    media_type VARCHAR(50),
    file_name VARCHAR(255),
    file_size BIGINT,
    reply_to_id UUID REFERENCES messages(id),
    forwarded_from_id UUID REFERENCES messages(id),
    is_pinned BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    deleted_for_everyone BOOLEAN DEFAULT false,
    scheduled_for TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message Status table
CREATE TABLE message_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('sent', 'delivered', 'read')) DEFAULT 'sent',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id)
);

-- Message Reactions table
CREATE TABLE message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, reaction)
);

-- Groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
    join_type VARCHAR(20) CHECK (join_type IN ('public', 'private', 'invite_only')) DEFAULT 'invite_only',
    invite_link VARCHAR(255),
    invite_link_expires TIMESTAMP,
    max_members INT DEFAULT 100000,
    is_announcement BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Channels table
CREATE TABLE channels (
    id UUID PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
    category VARCHAR(50),
    subscriber_count INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    cover_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Calls table
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    callee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('voice', 'video')) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('initiated', 'ringing', 'ongoing', 'ended', 'missed')) DEFAULT 'initiated',
    started_at TIMESTAMP,
    answered_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INT,
    recording_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) CHECK (type IN ('message', 'call', 'group', 'channel', 'system', 'verification')) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    reported_chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Blocked Users table
CREATE TABLE blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blocker_id, blocked_id)
);

-- Settings table
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    theme VARCHAR(20) DEFAULT 'dark',
    accent_color VARCHAR(7) DEFAULT '#5865F2',
    chat_wallpaper TEXT,
    font_size INT DEFAULT 16,
    notification_sound BOOLEAN DEFAULT true,
    message_preview BOOLEAN DEFAULT true,
    read_receipts BOOLEAN DEFAULT true,
    online_status_visible BOOLEAN DEFAULT true,
    last_seen_visible BOOLEAN DEFAULT true,
    auto_download_media VARCHAR(20) DEFAULT 'wifi',
    data_saver BOOLEAN DEFAULT false,
    language VARCHAR(10) DEFAULT 'en',
    privacy_profile_photo VARCHAR(20) DEFAULT 'all',
    privacy_status VARCHAR(20) DEFAULT 'all',
    privacy_last_seen VARCHAR(20) DEFAULT 'all',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verification Requests table
CREATE TABLE verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    documents JSONB,
    reason TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Premium Subscriptions table
CREATE TABLE premium_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan VARCHAR(20) CHECK (plan IN ('monthly', 'yearly', 'lifetime')) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
    started_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sticker Packs table
CREATE TABLE sticker_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    icon_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_official BOOLEAN DEFAULT false,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stickers table
CREATE TABLE stickers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    pack_id UUID REFERENCES sticker_packs(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    emoji VARCHAR(50),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_socket_id ON sessions(socket_id);
CREATE INDEX idx_chat_members_chat_id ON chat_members(chat_id);
CREATE INDEX idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_message_status_message_id ON message_status(message_id);
CREATE INDEX idx_message_status_user_id ON message_status(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_calls_caller_id ON calls(caller_id);
CREATE INDEX idx_calls_callee_id ON calls(callee_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Create views for common queries
CREATE VIEW user_stats AS
SELECT 
    u.id,
    u.username,
    u.display_name,
    u.online_status,
    COUNT(DISTINCT m.id) as message_count,
    COUNT(DISTINCT cm.chat_id) as chat_count,
    COUNT(DISTINCT c.id) as call_count
FROM users u
LEFT JOIN messages m ON m.sender_id = u.id
LEFT JOIN chat_members cm ON cm.user_id = u.id
LEFT JOIN calls c ON c.caller_id = u.id OR c.callee_id = u.id
GROUP BY u.id;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert default admin user
INSERT INTO users (id, phone, email, username, display_name, password_hash, is_verified, is_premium, phone_verified, email_verified)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '+1234567890',
    'admin@nexorachqt.com',
    'admin',
    'NEXORA Admin',
    '$2b$12$YourHashedPasswordHere', -- Replace with actual hashed password
    true,
    true,
    true,
    true
);
