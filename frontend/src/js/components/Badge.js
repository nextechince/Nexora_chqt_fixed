/**
 * Badge Component
 * Badge for verification, premium, roles, and status
 */
export class Badge {
  constructor(options = {}) {
    this.type = options.type || 'verified'; // verified, premium, owner, admin, moderator, developer, online, offline
    this.size = options.size || 'medium'; // small, medium, large
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
      ${config.icon || this.icon ? `<span class="badge-icon">${config.icon || this.icon}</span>` : ''}
      ${this.showLabel ? `<span class="badge-label">${config.label || this.label || this.type}</span>` : ''}
    `;

    return this.element;
  }

  getBadgeConfig() {
    const configs = {
      verified: {
        icon: '✓',
        label: 'Verified',
        color: '#3B82F6'
      },
      premium: {
        icon: '⭐',
        label: 'Premium',
        color: '#F59E0B'
      },
      owner: {
        icon: '👑',
        label: 'Owner',
        color: '#8B5CF6'
      },
      admin: {
        icon: '🛡️',
        label: 'Admin',
        color: '#EC4899'
      },
      moderator: {
        icon: '⚔️',
        label: 'Moderator',
        color: '#14B8A6'
      },
      developer: {
        icon: '💻',
        label: 'Developer',
        color: '#6366F1'
      },
      online: {
        icon: '●',
        label: 'Online',
        color: '#22C55E'
      },
      offline: {
        icon: '○',
        label: 'Offline',
        color: '#94A3B8'
      },
      busy: {
        icon: '●',
        label: 'Busy',
        color: '#EF4444'
      },
      away: {
        icon: '●',
        label: 'Away',
        color: '#F59E0B'
      }
    };

    return configs[this.type] || configs.verified;
  }

  setType(type) {
    this.type = type;
    if (this.element) {
      this.element.className = `badge badge-${this.type} badge-${this.size}`;
      const config = this.getBadgeConfig();
      const icon = this.element.querySelector('.badge-icon');
      const label = this.element.querySelector('.badge-label');
      if (icon) icon.textContent = config.icon;
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

  setLabel(label) {
    this.label = label;
    const labelEl = this.element?.querySelector('.badge-label');
    if (labelEl) {
      labelEl.textContent = label;
    }
    return this;
  }

  // Static helpers
  static verified(options = {}) {
    return new Badge({ ...options, type: 'verified' });
  }

  static premium(options = {}) {
    return new Badge({ ...options, type: 'premium' });
  }

  static owner(options = {}) {
    return new Badge({ ...options, type: 'owner' });
  }

  static admin(options = {}) {
    return new Badge({ ...options, type: 'admin' });
  }

  static moderator(options = {}) {
    return new Badge({ ...options, type: 'moderator' });
  }

  static developer(options = {}) {
    return new Badge({ ...options, type: 'developer' });
  }

  static online(options = {}) {
    return new Badge({ ...options, type: 'online' });
  }

  static offline(options = {}) {
    return new Badge({ ...options, type: 'offline' });
  }
}

// Styles
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

.badge.small {
  padding: 1px 8px;
  font-size: 10px;
  gap: 2px;
}

.badge.medium {
  padding: 2px 12px;
  font-size: 12px;
}

.badge.large {
  padding: 4px 16px;
  font-size: 14px;
}

.badge-icon {
  font-size: 1.1em;
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

.badge-admin {
  background: rgba(236, 72, 153, 0.15);
  color: #EC4899;
  border: 1px solid rgba(236, 72, 153, 0.3);
}

.badge-moderator {
  background: rgba(20, 184, 166, 0.15);
  color: #14B8A6;
  border: 1px solid rgba(20, 184, 166, 0.3);
}

.badge-developer {
  background: rgba(99, 102, 241, 0.15);
  color: #6366F1;
  border: 1px solid rgba(99, 102, 241, 0.3);
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

.badge-busy {
  background: rgba(239, 68, 68, 0.15);
  color: #EF4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.badge-away {
  background: rgba(245, 158, 11, 0.15);
  color: #F59E0B;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

/* Badge group */
.badge-group {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

/* Badge with glow animation */
.badge-glow {
  animation: pulse-neon 2s ease-in-out infinite;
}

/* Badge clickable */
.badge-clickable {
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.badge-clickable:hover {
  transform: scale(1.05);
}

/* Badge with tooltip */
.badge-tooltip {
  position: relative;
}

.badge-tooltip:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 11px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
  border: 1px solid var(--border-glass);
  margin-bottom: 4px;
  z-index: 10;
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = badgeStyles;
document.head.appendChild(styleTag);
