/**
 * Modal Component
 * Reusable modal system with animations
 */
export class Modal {
  constructor(options = {}) {
    this.title = options.title || '';
    this.content = options.content || '';
    this.size = options.size || 'medium'; // small, medium, large, full
    this.closeOnOverlay = options.closeOnOverlay !== false;
    this.closeOnEscape = options.closeOnEscape !== false;
    this.buttons = options.buttons || [];
    this.onOpen = options.onOpen || (() => {});
    this.onClose = options.onClose || (() => {});
    this.onSubmit = options.onSubmit || (() => {});
    this.element = null;
    this.isOpen = false;
  }

  render() {
    this.element = document.createElement('div');
    this.element.className = `modal-overlay ${this.size}`;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');

    this.element.innerHTML = `
      <div class="modal-container glass">
        <div class="modal-header">
          <h3 class="modal-title">${this.title}</h3>
          <button class="modal-close-btn" aria-label="Close modal">✕</button>
        </div>
        <div class="modal-body">
          ${this.content}
        </div>
        <div class="modal-footer">
          ${this.buttons.map(btn => `
            <button 
              class="btn ${btn.class || 'btn-secondary'}" 
              data-action="${btn.action || 'close'}"
              ${btn.disabled ? 'disabled' : ''}
            >
              ${btn.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    this.setupEventListeners();
    return this.element;
  }

  setupEventListeners() {
    // Close button
    const closeBtn = this.element.querySelector('.modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Overlay click
    if (this.closeOnOverlay) {
      this.element.addEventListener('click', (e) => {
        if (e.target === this.element) {
          this.close();
        }
      });
    }

    // Escape key
    if (this.closeOnEscape) {
      document.addEventListener('keydown', this._handleEscape);
    }

    // Button actions
    this.element.querySelectorAll('.modal-footer .btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'close') {
          this.close();
        } else if (action === 'submit') {
          this.onSubmit();
        } else if (this[action]) {
          this[action]();
        }
      });
    });

    // Form submission
    const form = this.element.querySelector('form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.onSubmit();
      });
    }
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    document.body.appendChild(this.element);
    document.body.style.overflow = 'hidden';
    
    // Trigger animation
    requestAnimationFrame(() => {
      this.element.classList.add('open');
      this.element.querySelector('.modal-container').classList.add('open');
    });

    this.onOpen();
    return this;
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    
    this.element.classList.remove('open');
    this.element.querySelector('.modal-container').classList.remove('open');
    
    document.removeEventListener('keydown', this._handleEscape);
    
    setTimeout(() => {
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      document.body.style.overflow = '';
      this.onClose();
    }, 300);
  }

  _handleEscape = (e) => {
    if (e.key === 'Escape') {
      this.close();
    }
  };

  setContent(content) {
    const body = this.element?.querySelector('.modal-body');
    if (body) {
      body.innerHTML = content;
    }
    return this;
  }

  setTitle(title) {
    const titleEl = this.element?.querySelector('.modal-title');
    if (titleEl) {
      titleEl.textContent = title;
    }
    return this;
  }

  setButtons(buttons) {
    const footer = this.element?.querySelector('.modal-footer');
    if (footer) {
      footer.innerHTML = buttons.map(btn => `
        <button 
          class="btn ${btn.class || 'btn-secondary'}" 
          data-action="${btn.action || 'close'}"
          ${btn.disabled ? 'disabled' : ''}
        >
          ${btn.label}
        </button>
      `).join('');
      this.setupEventListeners();
    }
    return this;
  }

  destroy() {
    this.close();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  // Static helper methods
  static alert(message, title = 'Alert') {
    return new Promise((resolve) => {
      const modal = new Modal({
        title,
        content: `<p>${message}</p>`,
        buttons: [{ label: 'OK', action: 'close', class: 'btn-primary' }],
        onClose: resolve
      });
      modal.render().open();
    });
  }

  static confirm(message, title = 'Confirm') {
    return new Promise((resolve) => {
      const modal = new Modal({
        title,
        content: `<p>${message}</p>`,
        buttons: [
          { label: 'Cancel', action: 'close', class: 'btn-secondary' },
          { label: 'Confirm', action: 'submit', class: 'btn-primary' }
        ],
        onSubmit: () => {
          resolve(true);
          modal.close();
        },
        onClose: () => resolve(false)
      });
      modal.render().open();
    });
  }

  static prompt(message, title = 'Input', defaultValue = '') {
    return new Promise((resolve) => {
      let value = defaultValue;
      const modal = new Modal({
        title,
        content: `
          <p>${message}</p>
          <input type="text" id="promptInput" value="${defaultValue}" class="modal-input" />
        `,
        buttons: [
          { label: 'Cancel', action: 'close', class: 'btn-secondary' },
          { label: 'OK', action: 'submit', class: 'btn-primary' }
        ],
        onSubmit: () => {
          const input = document.getElementById('promptInput');
          resolve(input ? input.value : value);
          modal.close();
        },
        onClose: () => resolve(null)
      });
      modal.render().open();
      
      setTimeout(() => {
        const input = document.getElementById('promptInput');
        if (input) {
          input.focus();
          input.select();
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              modal.onSubmit();
            }
          });
        }
      }, 100);
    });
  }
}

// Styles
const modalStyles = `
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.3s ease;
  padding: var(--space-lg);
}

.modal-overlay.open {
  opacity: 1;
}

.modal-container {
  max-width: 90%;
  width: 100%;
  max-height: 90vh;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-glass);
  display: flex;
  flex-direction: column;
  transform: scale(0.9) translateY(20px);
  transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  overflow: hidden;
}

.modal-container.open {
  transform: scale(1) translateY(0);
}

.modal-overlay.small .modal-container {
  max-width: 400px;
}

.modal-overlay.medium .modal-container {
  max-width: 600px;
}

.modal-overlay.large .modal-container {
  max-width: 800px;
}

.modal-overlay.full .modal-container {
  max-width: 100%;
  max-height: 100vh;
  border-radius: 0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--border-glass);
  flex-shrink: 0;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

.modal-close-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close-btn:hover {
  background: var(--bg-glass);
  color: var(--text-primary);
}

.modal-body {
  padding: var(--space-lg);
  overflow-y: auto;
  flex: 1;
}

.modal-body p {
  color: var(--text-secondary);
  line-height: 1.6;
}

.modal-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  margin-top: var(--space-sm);
  transition: border-color var(--transition-fast);
}

.modal-input:focus {
  border-color: var(--primary);
  box-shadow: var(--shadow-glow);
  outline: none;
}

.modal-footer {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--border-glass);
  flex-shrink: 0;
  justify-content: flex-end;
}

@media (max-width: 480px) {
  .modal-overlay {
    padding: var(--space-sm);
  }
  
  .modal-container {
    max-width: 100%;
    max-height: 100vh;
    border-radius: var(--radius-md);
  }
  
  .modal-header {
    padding: var(--space-sm) var(--space-md);
  }
  
  .modal-body {
    padding: var(--space-md);
  }
  
  .modal-footer {
    padding: var(--space-sm) var(--space-md);
    flex-wrap: wrap;
  }
  
  .modal-footer .btn {
    flex: 1;
    min-width: 80px;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = modalStyles;
document.head.appendChild(styleTag);
