/**
 * 500 Error Page
 */
import { Router } from '../router.js';

export function ServerErrorPage() {
  return `
    <div class="error-page server-error">
      <div class="error-content">
        <div class="error-animation">
          <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
            <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" 
                  font-size="80" font-weight="800" fill="none" stroke="#EF4444" stroke-width="3">
              500
            </text>
            <text x="50%" y="65%" dominant-baseline="central" text-anchor="middle"
                  font-size="16" fill="#94A3B8">
              Server Error
            </text>
          </svg>
        </div>
        <h1>Something Went Wrong</h1>
        <p>We're sorry, but something went wrong on our end. Please try again later.</p>
        <div class="error-actions">
          <button class="btn btn-primary" onclick="location.reload()">
            🔄 Try Again
          </button>
          <button class="btn btn-secondary" onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'dashboard'}}))">
            🏠 Dashboard
          </button>
        </div>
        <div class="error-tips">
          <p>If the problem persists, please contact support.</p>
          <button class="btn btn-sm btn-secondary" onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'contact'}}))">
            📧 Contact Support
          </button>
        </div>
      </div>
    </div>
  `;
}

// Styles (reuse 404 styles)
const serverErrorStyles = `
.server-error .error-content h1 {
  color: #EF4444;
}

.server-error .error-tips {
  margin-top: var(--space-xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-glass);
}

.server-error .error-tips p {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: var(--space-md);
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = serverErrorStyles;
document.head.appendChild(styleTag);
