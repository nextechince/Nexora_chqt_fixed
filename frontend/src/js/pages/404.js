/**
 * 404 Error Page
 */
import { Router } from '../router.js';

export function NotFoundPage() {
  return `
    <div class="error-page">
      <div class="error-content">
        <div class="error-animation">
          <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
            <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" 
                  font-size="80" font-weight="800" fill="none" stroke="#5865F2" stroke-width="3">
              404
            </text>
            <text x="50%" y="65%" dominant-baseline="central" text-anchor="middle"
                  font-size="16" fill="#94A3B8">
              Page Not Found
            </text>
          </svg>
        </div>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div class="error-actions">
          <button class="btn btn-primary" onclick="window.history.back()">
            ← Go Back
          </button>
          <button class="btn btn-secondary" onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'dashboard'}}))">
            🏠 Dashboard
          </button>
        </div>
      </div>
    </div>
  `;
}

// Styles
const errorPageStyles = `
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  padding: var(--space-xl);
}

.error-content {
  text-align: center;
  max-width: 500px;
}

.error-animation {
  margin-bottom: var(--space-xl);
}

.error-animation svg {
  width: 100%;
  max-width: 400px;
  height: auto;
}

.error-content h1 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: var(--space-sm);
}

.error-content p {
  color: var(--text-secondary);
  font-size: 16px;
  margin-bottom: var(--space-xl);
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
  flex-wrap: wrap;
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = errorPageStyles;
document.head.appendChild(styleTag);
