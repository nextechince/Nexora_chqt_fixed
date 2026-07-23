/**
 * Badge Component
 * Updated to use PNG images for badges
 */
export class Badge {
  constructor(options = {}) {
    this.type = options.type || 'verified';
    this.size = options.size || 'medium';
    this.showLabel = options.showLabel !== false;
    this.label = options.label || '';
    this.icon = options.icon || '';
    this.element = null;
  }

  render() {
    this.element = document.createElement('span');
    this.element.className = `badge badge-${this.type} badge-${this.size}`;
    
    const config = this.getBadgeConfig();
    
    this.element.innerHTML = `
      <img src="${config.image}" alt="${config.label}" class="badge-image" />
      ${this.showLabel ? `<span class="badge-label">${config.label || this.label || this.type}</span>` : ''}
    `;

    return this.element;
  }

  getBadgeConfig() {
    const configs = {
      verified: {
        image: '/assets/images/verified-badge.png',
        label: 'Verified',
        color: '#3B82F6'
      },
      premium: {
        image: '/assets/images/premium-badge.png',
        label: 'Premium',
        color: '#F59E0B'
      },
      owner: {
        image: '/assets/images/owner-badge.png',
        label: 'Owner',
        color: '#8B5CF6'
      },
      developer: {
        image: '/assets/images/developer-badge.png',
        label: 'Developer',
        color: '#6366F1'
      },
      admin: {
        image: '🛡️',
        label: 'Admin',
        color: '#EC4899'
      },
      moderator: {
        image: '/assets/images/moderator-badge.svg',
        label: 'Moderator',
        color: '#14B8A6'
      },
      online: {
        image: '●',
        label: 'Online',
        color: '#22C55E'
      },
      offline: {
        image: '○',
        label: 'Offline',
        color: '#94A3B8'
      }
    };

    return configs[this.type] || configs.verified;
  }

  setType(type) {
    this.type = type;
    if (this.element) {
      this.element.className = `badge badge-${this.type} badge-${this.size}`;
      const config = this.getBadgeConfig();
      const image = this.element.querySelector('.badge-image');
      const label = this.element.querySelector('.badge-label');
      if (image) image.src = config.image;
      if (label) label.textContent = config.label;
    }
    return this;
  }

  setSize(size) {
    this.size = size;
    if (this.element) {
      this.element.className = `badge badge-${this.type} badge-${this.size}`;
    }
    return this;
  }

  // ... rest of the component
}

// Styles update
const badgeStyles = `
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: var(--radius-full);
  font-weight: 600;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.badge-image {
  width: 20px;
  height: 20px;
  object-fit: contain;
  border-radius: 50%;
}

.badge.small .badge-image {
  width: 14px;
  height: 14px;
}

.badge.large .badge-image {
  width: 28px;
  height: 28px;
}

/* Badge with glow animation for premium */
.badge-premium .badge-image {
  animation: pulse-neon 2s ease-in-out infinite;
}

.badge-label {
  font-size: 0.9em;
}

.badge-verified {
  background: rgba(59, 130, 246, 0.15);
  color: #3B82F6;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.badge-premium {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(251, 191, 36, 0.1));
  color: #F59E0B;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.badge-owner {
  background: rgba(139, 92, 246, 0.15);
  color: #8B5CF6;
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.badge-developer {
  background: rgba(99, 102, 241, 0.15);
  color: #6366F1;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.badge-moderator {
  background: rgba(20, 184, 166, 0.15);
  color: #14B8A6;
  border: 1px solid rgba(20, 184, 166, 0.3);
}

.badge-online {
  background: rgba(34, 197, 94, 0.15);
  color: #22C55E;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.badge-offline {
  background: rgba(148, 163, 184, 0.15);
  color: #94A3B8;
  border: 1px solid rgba(148, 163, 184, 0.3);
}
`;
