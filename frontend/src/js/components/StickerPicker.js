/**
 * Sticker Picker Component
 * Sticker pack selector with categories
 */
import API from '../utils/api.js';
import { Toast } from '../utils/toast.js';

export class StickerPicker {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onSelect = options.onSelect || (() => {});
    this.position = options.position || 'bottom';
    this.isOpen = false;
    this.element = null;
    this.packs = [];
    this.currentPack = null;
    this.stickers = [];
    this.loading = false;
  }

  async render() {
    this.element = document.createElement('div');
    this.element.className = 'sticker-picker glass';
    this.element.style.display = 'none';

    this.element.innerHTML = `
      <div class="sticker-header">
        <span class="sticker-title">🎭 Stickers</span>
        <button class="sticker-close">&times;</button>
      </div>
      <div class="sticker-packs" id="stickerPacks">
        <div class="loading-spinner"></div>
      </div>
      <div class="sticker-grid" id="stickerGrid">
        <div class="loading-spinner"></div>
      </div>
    `;

    this.container.appendChild(this.element);

    // Load sticker packs
    await this.loadPacks();

    // Close button
    this.element.querySelector('.sticker-close').addEventListener('click', () => this.close());

    // Close on outside click
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) this.close();
    });

    return this.element;
  }

  async loadPacks() {
    const packsContainer = this.element.querySelector('#stickerPacks');
    const gridContainer = this.element.querySelector('#stickerGrid');

    try {
      const response = await API.get('/stickers/packs');
      this.packs = response.packs || [];

      if (this.packs.length === 0) {
        packsContainer.innerHTML = `
          <div class="empty-state">
            <p>No sticker packs available</p>
          </div>
        `;
        gridContainer.innerHTML = '';
        return;
      }

      // Render packs
      packsContainer.innerHTML = this.packs.map(pack => `
        <button class="pack-item ${pack.id === this.currentPack?.id ? 'active' : ''}" data-pack-id="${pack.id}">
          ${pack.icon_url ? `<img src="${pack.icon_url}" alt="${pack.name}" />` : '📦'}
          <span class="pack-name">${pack.name}</span>
          ${pack.is_premium ? '<span class="premium-badge">⭐</span>' : ''}
        </button>
      `).join('');

      // Select first pack
      if (this.packs.length > 0 && !this.currentPack) {
        this.currentPack = this.packs[0];
        await this.loadStickers(this.currentPack.id);
      }

      // Pack click handlers
      packsContainer.querySelectorAll('.pack-item').forEach(btn => {
        btn.addEventListener('click', async () => {
          const packId = btn.dataset.packId;
          const pack = this.packs.find(p => p.id === packId);
          if (pack) {
            this.currentPack = pack;
            await this.loadStickers(packId);
            packsContainer.querySelectorAll('.pack-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
          }
        });
      });

    } catch (error) {
      console.error('Load sticker packs error:', error);
      packsContainer.innerHTML = `
        <div class="error-container">
          <p>Failed to load stickers</p>
          <button class="btn btn-sm btn-primary" onclick="this.closest('.sticker-picker').__loadPacks()">Retry</button>
        </div>
      `;
    }
  }

  async loadStickers(packId) {
    const gridContainer = this.element.querySelector('#stickerGrid');
    this.loading = true;
    gridContainer.innerHTML = '<div class="loading-spinner"></div>';

    try {
      const response = await API.get(`/stickers/packs/${packId}`);
      this.stickers = response.stickers || [];

      if (this.stickers.length === 0) {
        gridContainer.innerHTML = `
          <div class="empty-state">
            <p>No stickers in this pack</p>
          </div>
        `;
        return;
      }

      gridContainer.innerHTML = this.stickers.map(sticker => `
        <button class="sticker-item" data-sticker-id="${sticker.id}">
          <img src="${sticker.image_url}" alt="${sticker.name || 'Sticker'}" loading="lazy" />
          ${sticker.emoji ? `<span class="sticker-emoji">${sticker.emoji}</span>` : ''}
        </button>
      `).join('');

      gridContainer.querySelectorAll('.sticker-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const sticker = this.stickers.find(s => s.id === btn.dataset.stickerId);
          if (sticker) {
            this.onSelect(sticker);
            this.close();
          }
        });
      });

    } catch (error) {
      console.error('Load stickers error:', error);
      gridContainer.innerHTML = `
        <div class="error-container">
          <p>Failed to load stickers</p>
          <button class="btn btn-sm btn-primary" onclick="this.closest('.sticker-picker').__loadStickers('${packId}')">Retry</button>
        </div>
      `;
    } finally {
      this.loading = false;
    }
  }

  open(targetElement) {
    this.isOpen = true;
    this.element.style.display = 'flex';

    // Position the picker
    const rect = targetElement.getBoundingClientRect();
    const pickerRect = this.element.getBoundingClientRect();

    let top, left;
    if (this.position === 'bottom') {
      top = rect.bottom + 8;
      left = rect.left + (rect.width / 2) - (pickerRect.width / 2);
    } else {
      top = rect.top - pickerRect.height - 8;
      left = rect.left + (rect.width / 2) - (pickerRect.width / 2);
    }

    // Ensure it stays in viewport
    if (top + pickerRect.height > window.innerHeight) {
      top = window.innerHeight - pickerRect.height - 10;
    }
    if (top < 10) top = 10;
    if (left < 10) left = 10;
    if (left + pickerRect.width > window.innerWidth - 10) {
      left = window.innerWidth - pickerRect.width - 10;
    }

    this.element.style.top = top + 'px';
    this.element.style.left = left + 'px';
  }

  close() {
    this.isOpen = false;
    this.element.style.display = 'none';
  }

  toggle(targetElement) {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(targetElement);
    }
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  // Store reference for retry functions
  __loadPacks = this.loadPacks.bind(this);
  __loadStickers = this.loadStickers.bind(this);
}

// Styles
const stickerPickerStyles = `
.sticker-picker {
  position: fixed;
  width: 360px;
  max-height: 450px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  box-shadow: var(--shadow-card);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sticker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-xs) var(--space-sm);
  border-bottom: 1px solid var(--border-glass);
  flex-shrink: 0;
}

.sticker-title {
  font-weight: 600;
  font-size: 14px;
}

.sticker-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
}

.sticker-close:hover {
  color: var(--text-primary);
}

.sticker-packs {
  display: flex;
  gap: var(--space-xs);
  padding: var(--space-xs);
  overflow-x: auto;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-glass);
}

.pack-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-xs) var(--space-sm);
  background: none;
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 60px;
}

.pack-item:hover {
  background: var(--bg-glass);
}

.pack-item.active {
  border-color: var(--primary);
  background: var(--bg-glass);
}

.pack-item img {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.pack-item .pack-name {
  font-size: 10px;
  color: var(--text-secondary);
  white-space: nowrap;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pack-item .premium-badge {
  font-size: 10px;
}

.sticker-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-xs);
  padding: var(--space-sm);
  overflow-y: auto;
  flex: 1;
  align-content: start;
}

.sticker-item {
  position: relative;
  aspect-ratio: 1;
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sticker-item:hover {
  transform: scale(1.05);
  border-color: var(--primary);
  z-index: 1;
}

.sticker-item img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.sticker-item .sticker-emoji {
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: 12px;
  background: var(--bg-glass);
  border-radius: var(--radius-full);
  padding: 1px 3px;
}

@media (max-width: 480px) {
  .sticker-picker {
    width: 300px;
    max-height: 400px;
  }
  
  .sticker-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = stickerPickerStyles;
document.head.appendChild(styleTag);
