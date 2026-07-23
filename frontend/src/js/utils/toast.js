/**
 * Toast Notification System
 * No alerts, only elegant toast notifications
 */
class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.defaultDuration = 3000;
    this.maxToasts = 5;
    this.position = 'bottom-right';
    this.init();
  }

  init() {
    this.container = document.createElement('div');
    this.container.className = `toast-container toast-container-${this.position}`;
    document.body.appendChild(this.container);
  }

  /**
   * Show a toast notification
   * @param {Object} options
   * @param {string} options.type - 'success' | 'error' | 'warning' | 'info'
   * @param {string} options.message - Toast message
   * @param {number} options.duration - Duration in ms (0 for no auto-close)
   * @param {boolean} options.icon - Show icon
   * @param {boolean} options.closeable - Show close button
   */
  show(options = {}) {
    const {
      type = 'info',
      message = '',
      duration = this.defaultDuration,
      icon = true,
      closeable = true
    } = options;

    // Remove oldest if max reached
    if (this.toasts.length >= this.maxToasts) {
      this.dismiss(this.toasts[0]);
    }

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    toast.innerHTML = `
      ${icon ? `<span class="toast-icon">${icons[type]}</span>` : ''}
      <span class="toast-message">${message}</span>
      ${closeable ? '<button class="toast-close" aria-label="Close notification">×</button>' : ''}
      <div class="toast-progress"></div>
    `;

    this.container.appendChild(toast);
    this.toasts.push(toast);

    // Trigger show animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Handle close button
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.dismiss(toast);
      });
    }

    // Auto dismiss
    let timeoutId = null;
    if (duration > 0) {
      timeoutId = setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }

    // Store timeout ID for cleanup
    toast._timeoutId = timeoutId;

    // Pause on hover
    toast.addEventListener('mouseenter', () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        const progress = toast.querySelector('.toast-progress');
        if (progress) {
          progress.style.animationPlayState = 'paused';
        }
      }
    });

    toast.addEventListener('mouseleave', () => {
      if (duration > 0 && timeoutId) {
        const remaining = duration;
        timeoutId = setTimeout(() => {
          this.dismiss(toast);
        }, remaining);
        const progress = toast.querySelector('.toast-progress');
        if (progress) {
          progress.style.animationPlayState = 'running';
        }
      }
    });

    return toast;
  }

  /**
   * Dismiss a toast
   * @param {HTMLElement} toast - Toast element to dismiss
   */
  dismiss(toast) {
    if (!toast || !toast.parentNode) return;

    toast.classList.remove('show');
    
    // Clear timeout
    if (toast._timeoutId) {
      clearTimeout(toast._timeoutId);
    }

    // Remove after animation
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
        this.toasts = this.toasts.filter(t => t !== toast);
      }
    }, 400);
  }

  /**
   * Dismiss all toasts
   */
  dismissAll() {
    this.toasts.forEach(toast => this.dismiss(toast));
  }

  /**
   * Set position
   * @param {string} position - 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
   */
  setPosition(position) {
    this.position = position;
    this.container.className = `toast-container toast-container-${position}`;
  }

  /**
   * Convenience methods
   */
  success(message, duration) {
    return this.show({ type: 'success', message, duration });
  }

  error(message, duration) {
    return this.show({ type: 'error', message, duration });
  }

  warning(message, duration) {
    return this.show({ type: 'warning', message, duration });
  }

  info(message, duration) {
    return this.show({ type: 'info', message, duration });
  }
}

// Export singleton
export const Toast = new ToastManager();
export default Toast;
