/**
 * About Page
 */
export function AboutPage() {
  return `
    <div class="about-page">
      <div class="about-header">
        <button class="btn btn-icon" onclick="window.history.back()">
          ←
        </button>
        <h1>About NEXORA CHQT</h1>
      </div>

      <div class="about-content">
        <div class="about-hero glass">
          <div class="about-logo">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="45" stroke="#5865F2" stroke-width="4"/>
              <path d="M35 50 L45 60 L65 40" stroke="#5865F2" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h2>NEXORA CHQT</h2>
          <p class="about-tagline">Real-Time Messaging Platform</p>
          <p class="about-description">
            NEXORA CHQT is a modern, secure, and feature-rich messaging platform designed 
            for seamless communication. Connect with friends, collaborate with teams, 
            and share content in real-time.
          </p>
        </div>

        <div class="about-grid">
          <div class="about-card glass">
            <h3>🚀 Our Mission</h3>
            <p>To provide a secure, fast, and intuitive messaging experience that connects people across the globe.</p>
          </div>
          <div class="about-card glass">
            <h3>🔒 Security</h3>
            <p>End-to-end encryption, secure authentication, and privacy-first design to protect your conversations.</p>
          </div>
          <div class="about-card glass">
            <h3>💡 Innovation</h3>
            <p>Pushing boundaries with real-time communication, AI-powered features, and seamless cross-platform experience.</p>
          </div>
          <div class="about-card glass">
            <h3>🌍 Community</h3>
            <p>Building a global community where everyone can connect, share, and grow together.</p>
          </div>
        </div>

        <div class="about-team glass">
          <h3>🛠️ Technology Stack</h3>
          <div class="tech-stack">
            <span class="tech-tag">HTML5</span>
            <span class="tech-tag">CSS3</span>
            <span class="tech-tag">JavaScript (ES6+)</span>
            <span class="tech-tag">Node.js</span>
            <span class="tech-tag">Express.js</span>
            <span class="tech-tag">Socket.IO</span>
            <span class="tech-tag">Supabase</span>
            <span class="tech-tag">PostgreSQL</span>
            <span class="tech-tag">WebRTC</span>
            <span class="tech-tag">Docker</span>
            <span class="tech-tag">Nginx</span>
          </div>
        </div>

        <div class="about-stats glass">
          <h3>📊 Platform Stats</h3>
          <div class="stats-grid" id="aboutStats">
            <div class="stat-item">
              <span class="stat-number" id="statUsers">Loading...</span>
              <span class="stat-label">Active Users</span>
            </div>
            <div class="stat-item">
              <span class="stat-number" id="statMessages">Loading...</span>
              <span class="stat-label">Messages Sent</span>
            </div>
            <div class="stat-item">
              <span class="stat-number" id="statGroups">Loading...</span>
              <span class="stat-label">Groups Created</span>
            </div>
            <div class="stat-item">
              <span class="stat-number" id="statChannels">Loading...</span>
              <span class="stat-label">Channels</span>
            </div>
          </div>
        </div>

        <div class="about-footer">
          <p>© ${new Date().getFullYear()} NEXORA CHQT. All rights reserved.</p>
          <div class="about-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/contact">Contact</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initAbout() {
  // Load stats
  loadStats();
}

async function loadStats() {
  try {
    const response = await API.get('/stats');
    const stats = response.stats || {};
    
    document.getElementById('statUsers').textContent = formatNumber(stats.totalUsers || 0);
    document.getElementById('statMessages').textContent = formatNumber(stats.totalMessages || 0);
    document.getElementById('statGroups').textContent = formatNumber(stats.totalGroups || 0);
    document.getElementById('statChannels').textContent = formatNumber(stats.totalChannels || 0);
  } catch (error) {
    console.error('Load stats error:', error);
    document.querySelectorAll('.stat-number').forEach(el => {
      el.textContent = '—';
    });
  }
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Styles
const aboutStyles = `
.about-page {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.about-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.about-header h1 {
  font-size: 28px;
  font-weight: 700;
}

.about-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.about-hero {
  text-align: center;
  padding: var(--space-2xl);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
}

.about-logo {
  display: inline-block;
  margin-bottom: var(--space-md);
  animation: pulse-neon 2s ease-in-out infinite;
}

.about-hero h2 {
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #5865F2, #00D4FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.about-tagline {
  color: var(--text-secondary);
  font-size: 18px;
  margin-bottom: var(--space-md);
}

.about-description {
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1.8;
  max-width: 600px;
  margin: 0 auto;
}

.about-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

.about-card {
  padding: var(--space-lg);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  text-align: center;
}

.about-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: var(--space-sm);
}

.about-card p {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.about-team {
  padding: var(--space-xl);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
  text-align: center;
}

.about-team h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: var(--space-lg);
}

.tech-stack {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  justify-content: center;
}

.tech-tag {
  padding: var(--space-xs) var(--space-md);
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-full);
  font-size: 13px;
  color: var(--text-secondary);
}

.about-stats {
  padding: var(--space-xl);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
}

.about-stats h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: var(--space-lg);
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  background: linear-gradient(135deg, #5865F2, #00D4FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.about-footer {
  text-align: center;
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-glass);
  color: var(--text-muted);
  font-size: 14px;
}

.about-links {
  display: flex;
  gap: var(--space-lg);
  justify-content: center;
  margin-top: var(--space-sm);
}

.about-links a {
  color: var(--text-secondary);
  transition: color var(--transition-fast);
}

.about-links a:hover {
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .about-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .about-page {
    padding: var(--space-md);
  }
  
  .about-hero {
    padding: var(--space-lg);
  }
  
  .about-hero h2 {
    font-size: 24px;
  }
  
  .stat-number {
    font-size: 24px;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = aboutStyles;
document.head.appendChild(styleTag);
