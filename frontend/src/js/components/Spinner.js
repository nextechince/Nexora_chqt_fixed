/**
 * Spinner Component
 * Loading spinners with gradient animation
 */
export class Spinner {
  constructor(options = {}) {
    this.size = options.size || 'medium'; // small, medium, large
    this.type = options.type || 'gradient'; // gradient, pulse, dots
    this.color = options.color || 'var(--primary)';
    this.text = options.text || '';
    this.container = options.container || document.body;
    this.element = null;
  }

  render() {
    this.element = document.createElement('div');
    this.element.className = `spinner-container ${this.type}`;
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-label', 'Loading');

    const spinnerHtml = this.getSpinnerHtml();
    
    this.element.innerHTML = `
      <div class="spinner ${this.size}">
        ${spinnerHtml}
      </div>
      ${this.text ? `<span class="spinner-text">${this.text}</span>` : ''}
    `;

    return this.element;
  }

  getSpinnerHtml() {
    switch (this.type) {
      case 'gradient':
        return `
          <svg class="spinner-svg" viewBox="0 0 50 50">
            <circle class="spinner-circle" cx="25" cy="25" r="20" fill="none" />
          </svg>
        `;
      
      case 'pulse':
        return `
          <div class="pulse-dot"></div>
          <div class="pulse-dot" style="animation-delay: 0.2s"></div>
          <div class="pulse-dot" style="animation-delay: 0.4s"></div>
        `;
      
      case 'dots':
        return `
          <div class="dots-dot"></div>
          <div class="dots-dot" style="animation-delay: 0.2s"></div>
          <div class="dots-dot" style="animation-delay: 0.4s"></div>
          <div class="dots-dot" style="animation-delay: 0.6s"></div>
          <div class="dots-dot" style="animation-delay: 0.8s"></div>
        `;
      
      default:
        return `
          <svg class="spinner-svg" viewBox="0 0 50 50">
            <circle class="spinner-circle" cx="25" cy="25" r="20" fill="none" />
          </svg>
        `;
    }
  }

  show() {
    if (this.element) {
      this.container.appendChild(this.element);
      this.element.style.display = 'flex';
    } else {
      this.render();
      this.container.appendChild(this.element);
    }
    return this;
  }

  hide() {
    if (this.element && this.element.parentNode) {
      this.element.style.display = 'none';
    }
    return this;
  }

  remove() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    return this;
  }

  setText(text) {
    this.text = text;
    const textEl = this.element?.querySelector('.spinner-text');
    if (textEl) {
      textEl.textContent = text;
    }
    return this;
  }

  // Static helpers
  static show(options = {}) {
    const spinner = new Spinner(options);
    spinner.render().show();
    return spinner;
  }
}

// Styles
const spinnerStyles = `
.spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-xl);
}

.spinner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner.small {
  width: 24px;
  height: 24px;
}

.spinner.medium {
  width: 40px;
  height: 40px;
}

.spinner.large {
  width: 64px;
  height: 64px;
}

/* Gradient Spinner */
.spinner-svg {
  width: 100%;
  height: 100%;
  animation: spin 1s linear infinite;
}

.spinner-circle {
  cx: 50%;
  cy: 50%;
  r: 40%;
  stroke: var(--primary);
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: 200;
  stroke-dashoffset: 50;
  fill: none;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Pulse Spinner */
.pulse-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--primary);
  margin: 0 4px;
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Dots Spinner */
.dots-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  margin: 0 3px;
  animation: dots-spin 1.4s ease-in-out infinite;
}

@keyframes dots-spin {
  0%, 80%, 100% {
    transform: scale(0.4);
    opacity: 0.3;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.spinner-text {
  font-size: 14px;
  color: var(--text-secondary);
  animation: fade-in 0.3s ease;
}

/* Full page overlay */
.spinner-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

/* Inline spinner */
.spinner-inline {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.spinner-inline .spinner.small {
  width: 16px;
  height: 16px;
}

/* Loading state for buttons */
.btn-loading .spinner.small {
  width: 20px;
  height: 20px;
}

.btn-loading .spinner {
  margin-right: var(--space-sm);
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = spinnerStyles;
document.head.appendChild(styleTag);
