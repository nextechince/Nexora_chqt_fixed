/**
 * Terms of Service Page
 */
export function TermsPage() {
  return `
    <div class="legal-page">
      <div class="legal-header">
        <button class="btn btn-icon" onclick="window.history.back()">
          ←
        </button>
        <h1>Terms of Service</h1>
      </div>
      <div class="legal-content">
        <div class="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>By using NEXORA CHQT, you agree to these Terms of Service. If you disagree with any part, please do not use our service.</p>
        </div>

        <div class="legal-section">
          <h2>2. User Accounts</h2>
          <ul>
            <li>You must be 13 years or older to use this service</li>
            <li>You are responsible for maintaining account security</li>
            <li>You must provide accurate information</li>
            <li>You are responsible for all activity under your account</li>
          </ul>
        </div>

        <div class="legal-section">
          <h2>3. User Content</h2>
          <ul>
            <li>You retain ownership of your content</li>
            <li>You grant us license to transmit and store your content</li>
            <li>You are responsible for your content</li>
            <li>We may remove content that violates these terms</li>
          </ul>
        </div>

        <div class="legal-section">
          <h2>4. Prohibited Activities</h2>
          <ul>
            <li>Harassment, bullying, or abuse</li>
            <li>Illegal activities</li>
            <li>Spam or unsolicited messages</li>
            <li>Hacking or security breaches</li>
            <li>Impersonation of others</li>
          </ul>
        </div>

        <div class="legal-section">
          <h2>5. Intellectual Property</h2>
          <p>NEXORA CHQT, its logo, and associated trademarks are our property. You may not use them without permission.</p>
        </div>

        <div class="legal-section">
          <h2>6. Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these terms or for any other reason at our discretion.</p>
        </div>

        <div class="legal-section">
          <h2>7. Disclaimer</h2>
          <p>The service is provided "as is" without warranties of any kind. We are not liable for any damages arising from use of the service.</p>
        </div>

        <div class="legal-section">
          <h2>8. Changes to Terms</h2>
          <p>We may update these terms at any time. Continued use constitutes acceptance of updated terms.</p>
        </div>

        <div class="legal-section">
          <h2>9. Contact</h2>
          <p>For questions about these terms, contact us at:</p>
          <p><strong>Email:</strong> legal@nexorachqt.com</p>
        </div>

        <div class="legal-footer">
          <p>Last Updated: ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  `;
}

// Styles (reuse from privacy-policy)
