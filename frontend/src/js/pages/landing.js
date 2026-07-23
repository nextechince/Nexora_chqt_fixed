/**
 * Landing Page
 * Hero, features, carousel, CTA buttons
 */
import { Router } from '../router.js';
import { Auth } from '../utils/auth.js';

export function LandingPage() {
  return `
    <div class="landing-page">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-background"></div>
        <div class="container">
          <nav class="landing-nav">
            <div class="nav-logo">
              <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="45" stroke="#5865F2" stroke-width="4"/>
                <path d="M35 50 L45 60 L65 40" stroke="#5865F2" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>NEXORA CHQT</span>
            </div>
            <div class="nav-links">
              <a href="#features">Features</a>
              <a href="#about">About</a>
              <a href="#contact">Contact</a>
            </div>
            <div class="nav-actions">
              <button class="btn btn-secondary" onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'login'}}))">
                Login
              </button>
              <button class="btn btn-primary" onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'register'}}))">
                Get Started
              </button>
            </div>
          </nav>

          <div class="hero-content">
            <div class="hero-text">
              <span class="hero-badge animate-pulse-neon">✨ New Era of Messaging</span>
              <h1 class="hero-title">
                Connect, Chat, and
                <span class="gradient-text">Collaborate</span>
                in Real-Time
              </h1>
              <p class="hero-description">
                NEXORA CHQT is a modern messaging platform designed for speed, 
                security, and seamless communication. Chat, call, and share 
                with anyone, anywhere.
              </p>
              <div class="hero-actions">
                <button class="btn btn-primary btn-lg" onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'register'}}))">
                  Start Messaging Free →
                </button>
                <button class="btn btn-secondary btn-lg" onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'features'}}))">
                  Explore Features
                </button>
              </div>
              <div class="hero-stats">
                <div class="stat-item">
                  <span class="stat-number">10M+</span>
                  <span class="stat-label">Active Users</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">1B+</span>
                  <span class="stat-label">Messages Daily</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">99.9%</span>
                  <span class="stat-label">Uptime</span>
                </div>
              </div>
            </div>
            <div class="hero-visual">
              <div class="hero-chat-preview glass">
                <div class="chat-preview-header">
                  <div class="chat-preview-avatar"></div>
                  <div class="chat-preview-info">
                    <span class="chat-preview-name">Team Chat</span>
                    <span class="chat-preview-status">● Online</span>
                  </div>
                </div>
                <div class="chat-preview-messages">
                  <div class="preview-message received">
                    <span>Hey everyone! Ready for the meeting?</span>
                  </div>
                  <div class="preview-message sent">
                    <span>Yes, I'm ready!</span>
                  </div>
                  <div class="preview-message received">
                    <span>Great! Let's start in 5 minutes.</span>
                  </div>
                  <div class="preview-message sent">
                    <span>🚀 Let's go!</span>
                  </div>
                </div>
                <div class="chat-preview-input">
                  <span>Type a message...</span>
                  <button class="btn btn-primary btn-sm">Send</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="features-section" id="features">
        <div class="container">
          <div class="section-header">
            <span class="section-badge">Features</span>
            <h2>Everything You Need to Communicate</h2>
            <p>Powerful features designed for modern communication</p>
          </div>
          <div class="features-grid">
            ${features.map(feature => `
              <div class="feature-card glass">
                <div class="feature-icon">${feature.icon}</div>
                <h3>${feature.title}</h3>
                <p>${feature.description}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section">
        <div class="container">
          <div class="cta-content glass">
            <h2>Ready to Get Started?</h2>
            <p>Join millions of users and experience the future of messaging.</p>
            <button class="btn btn-primary btn-lg" onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'register'}}))">
              Create Account Now
            </button>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="landing-footer">
        <div class="container">
          <div class="footer-content">
            <div class="footer-brand">
              <h3>NEXORA CHQT</h3>
              <p>Real-Time Messaging Platform</p>
            </div>
            <div class="footer-links">
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href="/about">About</a>
              <a href="/contact">Contact</a>
            </div>
            <div class="footer-social">
              <a href="#" aria-label="Twitter">🐦</a>
              <a href="#" aria-label="GitHub">🐙</a>
              <a href="#" aria-label="Discord">💬</a>
            </div>
          </div>
          <div class="footer-bottom">
            <span>© 2024 NEXORA CHQT. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  `;
}

const features = [
  {
    icon: '💬',
    title: 'Real-Time Chat',
    description: 'Send and receive messages instantly with read receipts and typing indicators.'
  },
  {
    icon: '📞',
    title: 'Voice & Video Calls',
    description: 'High-quality voice and video calls with screen sharing capabilities.'
  },
  {
    icon: '👥',
    title: 'Groups & Channels',
    description: 'Create groups for team collaboration and channels for broadcasting.'
  },
  {
    icon: '🔒',
    title: 'End-to-End Encryption',
    description: 'Your messages are secure with advanced encryption protocols.'
  },
  {
    icon: '🎨',
    title: 'Customizable',
    description: 'Personalize your experience with themes, wallpapers, and more.'
  },
  {
    icon: '⚡',
    title: 'Lightning Fast',
    description: 'Optimized for speed with real-time updates and smooth performance.'
  }
];

// Styles
const landingStyles = `
.landing-page {
  min-height: 100vh;
  background: var(--bg-primary);
}

.hero-section {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: var(--space-xl) 0;
}

.hero-background {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(circle at 20% 50%, rgba(88,101,242,0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 50%, rgba(0,212,255,0.1) 0%, transparent 50%);
  pointer-events: none;
}

.landing-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) 0;
  position: relative;
  z-index: 1;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: 700;
  font-size: 20px;
}

.nav-logo span {
  background: linear-gradient(135deg, #5865F2, #00D4FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-links {
  display: flex;
  gap: var(--space-lg);
}

.nav-links a {
  color: var(--text-secondary);
  transition: color var(--transition-fast);
}

.nav-links a:hover {
  color: var(--text-primary);
}

.nav-actions {
  display: flex;
  gap: var(--space-sm);
}

.hero-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2xl);
  align-items: center;
  padding: var(--space-xl) 0;
  position: relative;
  z-index: 1;
}

.hero-badge {
  display: inline-block;
  padding: 4px 16px;
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-full);
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
}

.hero-title {
  font-size: 52px;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: var(--space-md);
}

.gradient-text {
  background: linear-gradient(135deg, #5865F2, #00D4FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-description {
  font-size: 18px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: var(--space-lg);
  max-width: 480px;
}

.hero-actions {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
  margin-bottom: var(--space-xl);
}

.hero-stats {
  display: flex;
  gap: var(--space-xl);
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.hero-chat-preview {
  padding: var(--space-lg);
  max-width: 420px;
  margin-left: auto;
}

.chat-preview-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--border-glass);
}

.chat-preview-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #5865F2, #00D4FF);
}

.chat-preview-info {
  flex: 1;
}

.chat-preview-name {
  display: block;
  font-weight: 600;
}

.chat-preview-status {
  font-size: 12px;
  color: #22C55E;
}

.chat-preview-messages {
  margin-bottom: var(--space-md);
  min-height: 160px;
}

.preview-message {
  padding: 8px 14px;
  border-radius: var(--radius-md);
  margin-bottom: var(--space-xs);
  max-width: 80%;
  font-size: 14px;
}

.preview-message.received {
  background: var(--bg-glass);
  margin-right: auto;
}

.preview-message.sent {
  background: var(--primary);
  margin-left: auto;
}

.chat-preview-input {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--bg-glass);
  border-radius: var(--radius-md);
}

.chat-preview-input span {
  flex: 1;
  color: var(--text-secondary);
  font-size: 14px;
  padding: 0 var(--space-sm);
}

.features-section {
  padding: var(--space-2xl) 0;
}

.section-header {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.section-badge {
  display: inline-block;
  padding: 4px 16px;
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-full);
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
}

.section-header h2 {
  font-size: 40px;
  font-weight: 700;
  margin-bottom: var(--space-sm);
}

.section-header p {
  color: var(--text-secondary);
  font-size: 18px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-lg);
}

.feature-card {
  padding: var(--space-xl);
  text-align: center;
  transition: all var(--transition-base);
  cursor: default;
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: var(--primary);
}

.feature-icon {
  font-size: 40px;
  margin-bottom: var(--space-md);
}

.feature-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: var(--space-sm);
}

.feature-card p {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.cta-section {
  padding: var(--space-2xl) 0;
}

.cta-content {
  padding: var(--space-2xl);
  text-align: center;
  background: linear-gradient(135deg, rgba(88,101,242,0.1), rgba(0,212,255,0.1));
}

.cta-content h2 {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: var(--space-md);
}

.cta-content p {
  color: var(--text-secondary);
  font-size: 18px;
  margin-bottom: var(--space-lg);
}

.landing-footer {
  padding: var(--space-xl) 0;
  border-top: 1px solid var(--border-glass);
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-lg);
  margin-bottom: var(--space-lg);
}

.footer-brand h3 {
  font-weight: 700;
  font-size: 20px;
  background: linear-gradient(135deg, #5865F2, #00D4FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.footer-brand p {
  color: var(--text-secondary);
  font-size: 14px;
}

.footer-links {
  display: flex;
  gap: var(--space-lg);
}

.footer-links a {
  color: var(--text-secondary);
  transition: color var(--transition-fast);
}

.footer-links a:hover {
  color: var(--text-primary);
}

.footer-social {
  display: flex;
  gap: var(--space-md);
}

.footer-social a {
  font-size: 24px;
  opacity: 0.6;
  transition: opacity var(--transition-fast);
}

.footer-social a:hover {
  opacity: 1;
}

.footer-bottom {
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-glass);
}

@media (max-width: 1024px) {
  .hero-content {
    grid-template-columns: 1fr;
    text-align: center;
  }
  
  .hero-description {
    margin-left: auto;
    margin-right: auto;
  }
  
  .hero-stats {
    justify-content: center;
  }
  
  .hero-chat-preview {
    margin: 0 auto;
  }
  
  .hero-actions {
    justify-content: center;
  }
  
  .hero-title {
    font-size: 40px;
  }
}

@media (max-width: 768px) {
  .landing-nav {
    flex-direction: column;
    gap: var(--space-md);
  }
  
  .nav-links {
    display: none;
  }
  
  .hero-title {
    font-size: 32px;
  }
  
  .section-header h2 {
    font-size: 28px;
  }
  
  .cta-content h2 {
    font-size: 28px;
  }
  
  .footer-content {
    flex-direction: column;
    text-align: center;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = landingStyles;
document.head.appendChild(styleTag);
