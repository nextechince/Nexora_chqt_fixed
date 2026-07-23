/**
 * Privacy Policy Page
 */
export function PrivacyPolicyPage() {
  return `
    <div class="legal-page">
      <div class="legal-header">
        <button class="btn btn-icon" onclick="window.history.back()">
          ←
        </button>
        <h1>Privacy Policy</h1>
      </div>
      <div class="legal-content">
        <div class="legal-section">
          <h2>1. Information We Collect</h2>
          <p>NEXORA CHQT collects the following types of information:</p>
          <ul>
            <li><strong>Account Information:</strong> Phone number, email address, username, display name</li>
            <li><strong>Profile Information:</strong> Bio, profile picture, status updates</li>
            <li><strong>Content:</strong> Messages, media files, voice notes, calls</li>
            <li><strong>Usage Data:</strong> Login times, device information, IP addresses</li>
            <li><strong>Cookies:</strong> We use cookies to maintain your session and preferences</li>
          </ul>
        </div>

        <div class="legal-section">
          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>Provide and maintain our messaging service</li>
            <li>Process and deliver messages in real-time</li>
            <li>Personalize your experience</li>
            <li>Improve our services and features</li>
            <li>Send notifications and updates</li>
            <li>Ensure platform security and prevent fraud</li>
          </ul>
        </div>

        <div class="legal-section">
          <h2>3. Data Storage and Security</h2>
          <p>Your data is stored securely on our servers using industry-standard encryption. We implement:</p>
          <ul>
            <li>End-to-end encryption for messages</li>
            <li>Secure data centers</li>
            <li>Regular security audits</li>
            <li>Access controls and monitoring</li>
          </ul>
        </div>

        <div class="legal-section">
          <h2>4. Data Sharing</h2>
          <p>We do not sell or share your personal information with third parties except:</p>
          <ul>
            <li>When required by law</li>
            <li>To provide essential services (SMS, email, storage)</li>
            <li>With your explicit consent</li>
          </ul>
        </div>

        <div class="legal-section">
          <h2>5. Your Rights</h2>
          <ul>
            <li>Access your data at any time</li>
            <li>Request data deletion</li>
            <li>Opt-out of marketing communications</li>
            <li>Export your data</li>
          </ul>
        </div>

        <div class="legal-section">
          <h2>6. Contact</h2>
          <p>For privacy concerns or questions, contact us at:</p>
          <p><strong>Email:</strong> privacy@nexorachqt.com</p>
        </div>

        <div class="legal-footer">
          <p>Last Updated: ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  `;
}

// Styles
const legalStyles = `
.legal-page {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.legal-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.legal-header h1 {
  font-size: 28px;
  font-weight: 700;
}

.legal-content {
  background: var(--bg-glass);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  border: 1px solid var(--border-glass);
}

.legal-section {
  margin-bottom: var(--space-xl);
}

.legal-section:last-child {
  margin-bottom: 0;
}

.legal-section h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: var(--space-md);
  color: var(--text-primary);
}

.legal-section p {
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: var(--space-sm);
}

.legal-section ul {
  list-style: disc;
  padding-left: var(--space-xl);
  color: var(--text-secondary);
  line-height: 1.8;
}

.legal-section ul li {
  margin-bottom: var(--space-xs);
}

.legal-section ul li strong {
  color: var(--text-primary);
}

.legal-footer {
  margin-top: var(--space-xl);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-glass);
  color: var(--text-muted);
  font-size: 14px;
  text-align: center;
}

@media (max-width: 480px) {
  .legal-page {
    padding: var(--space-md);
  }
  
  .legal-content {
    padding: var(--space-md);
  }
  
  .legal-section h2 {
    font-size: 18px;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = legalStyles;
document.head.appendChild(styleTag);
