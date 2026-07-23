/**
 * GIF Picker Component
 * GIF integration with Tenor/GIPHY
 */
import { Toast } from '../utils/toast.js';

export class GifPicker {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onSelect = options.onSelect || (() => {});
    this.apiKey = options.apiKey || '';
    this.apiType = options.apiType || 'tenor'; // tenor or giphy
    this.position = options.position || 'bottom';
    this.isOpen = false;
    this.element = null;
    this.searchQuery = '';
    this.results = [];
    this.trending = [];
    this.loading = false;
  }

  async render() {
    this.element = document.createElement('div');
    this.element.className = 'gif-picker glass';
    this.element.style.display = 'none';

    this.element.innerHTML = `
      <div class="gif-header">
        <span class="gif-title">🎬 GIFs</span>
        <button class="gif-close">&times;</button>
      </div>
      <div class="gif-search">
        <input type="text" class="gif-search-input" placeholder="Search for GIFs..." />
        <button class="gif-search-btn">🔍</button>
      </div>
      <div class="gif-tabs">
        <button class="gif-tab active" data-tab="trending">🔥 Trending</button>
        <button class="gif-tab" data-tab="search">🔍 Search</button>
      </div>
      <div class="gif-grid" id="gifGrid">
        <div class="loading-spinner"></div>
      </div>
    `;

    this.container.appendChild(this.element);

    // Load trending GIFs
    await this.loadTrending();

    // Setup event listeners
    this.setupEventListeners();

    return this.element;
  }

  setupEventListeners() {
    // Close button
    this.element.querySelector('.gif-close').addEventListener('click', () => this.close());

    // Close on outside click
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) this.close();
    });

    // Search
    const searchInput = this.element.querySelector('.gif-search-input');
    const searchBtn = this.element.querySelector('.gif-search-btn');

    searchBtn.addEventListener('click', () => {
      this.searchQuery = searchInput.value.trim();
      if (this.searchQuery) {
        this.loadSearch(this.searchQuery);
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.searchQuery = searchInput.value.trim();
        if (this.searchQuery) {
          this.loadSearch(this.searchQuery);
        }
      }
    });

    // Tabs
    this.element.querySelectorAll('.gif-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.element.querySelectorAll('.gif-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        if (tab.dataset.tab === 'trending') {
          this.loadTrending();
        } else if (tab.dataset.tab === 'search' && this.searchQuery) {
          this.loadSearch(this.searchQuery);
        } else {
          this.showEmptyState('Search for GIFs');
        }
      });
    });
  }

  async loadTrending() {
    const grid = this.element.querySelector('#gifGrid');
    this.loading = true;
    grid.innerHTML = '<div class="loading-spinner"></div>';

    try {
      let response;
      if (this.apiType === 'tenor') {
        response = await fetch(
          `https://tenor.googleapis.com/v2/trending?key=${this.apiKey}&limit=20`
        );
      } else {
        response = await fetch(
          `https://api.giphy.com/v1/gifs/trending?api_key=${this.apiKey}&limit=20`
        );
      }

      const data = await response.json();
      this.results = this.parseGifs(data);
      this.renderGrid(this.results);

    } catch (error) {
      console.error('Load trending GIFs error:', error);
      // Fallback to mock data
      this.renderGrid(this.getMockGifs());
    } finally {
      this.loading = false;
    }
  }

  async loadSearch(query) {
    const grid = this.element.querySelector('#gifGrid');
    this.loading = true;
    grid.innerHTML = '<div class="loading-spinner"></div>';

    try {
      let response;
      if (this.apiType === 'tenor') {
        response = await fetch(
          `https://tenor.googleapis.com/v2/search?key=${this.apiKey}&q=${encodeURIComponent(query)}&limit=20`
        );
      } else {
        response = await fetch(
          `https://api.giphy.com/v1/gifs/search?api_key=${this.apiKey}&q=${encodeURIComponent(query)}&limit=20`
        );
      }

      const data = await response.json();
      this.results = this.parseGifs(data);
      this.renderGrid(this.results);

    } catch (error) {
      console.error('Search GIFs error:', error);
      Toast.error('Failed to search GIFs');
    } finally {
      this.loading = false;
    }
  }

  parseGifs(data) {
    if (this.apiType === 'tenor') {
      return data.results?.map(gif => ({
        id: gif.id,
        url: gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url || '',
        preview: gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url || '',
        title: gif.title || 'GIF'
      })) || [];
    } else {
      return data.data?.map(gif => ({
        id: gif.id,
        url: gif.images?.original?.url || '',
        preview: gif.images?.preview_gif?.url || gif.images?.fixed_width?.url || '',
        title: gif.title || 'GIF'
      })) || [];
    }
  }

  renderGrid(gifs) {
    const grid = this.element.querySelector('#gifGrid');

    if (!gifs || gifs.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎬</div>
          <p>No GIFs found</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = gifs.map(gif => `
      <div class="gif-item" data-gif-id="${gif.id}">
        <img src="${gif.preview || gif.url}" alt="${gif.title || 'GIF'}" loading="lazy" />
      </div>
    `).join('');

    grid.querySelectorAll('.gif-item').forEach(item => {
      item.addEventListener('click', () => {
        const gif = this.results.find(g => g.id === item.dataset.gifId);
        if (gif) {
          this.onSelect(gif);
          this.close();
        }
      });
    });
  }

  showEmptyState(message) {
    const grid = this.element.querySelector('#gifGrid');
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>${message}</p>
      </div>
    `;
  }

  getMockGifs() {
    // Fallback mock GIFs
    return [
      { id: '1', url: 'https://media.tenor.com/3b8z4x4X4Y4AAAAC/happy-dance.gif', preview: 'https://media.tenor.com/3b8z4x4X4Y4AAAAC/happy-dance.gif', title: 'Happy Dance' },
      { id: '2', url: 'https://media.tenor.com/5h8z4x4X4Y4AAAAC/thumbs-up.gif', preview: 'https://media.tenor.com/5h8z4x4X4Y4AAAAC/thumbs-up.gif', title: 'Thumbs Up' },
      { id: '3', url: 'https://media.tenor.com/7h8z4x4X4Y4AAAAC/laughing.gif', preview: 'https://media.tenor.com/7h8z4x4X4Y4AAAAC/laughing.gif', title: 'Laughing' },
      { id: '4', url: 'https://media.tenor.com/9h8z4x4X4Y4AAAAC/thinking.gif', preview: 'https://media.tenor.com/9h8z4x4X4Y4AAAAC/thinking.gif', title: 'Thinking' },
      { id: '5', url: 'https://media.tenor.com/bh8z4x4X4Y4AAAAC/wow.gif', preview: 'https://media.tenor.com/bh8z4x4X4Y4AAAAC/wow.gif', title: 'Wow' }
    ];
  }

  open(targetElement) {
    this.isOpen = true;
    this.element.style.display = 'flex';

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
}

// Styles
const gifPickerStyles = `
.gif-picker {
  position: fixed;
  width: 380px;
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

.gif-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-xs) var(--space-sm);
  border-bottom: 1px solid var(--border-glass);
  flex-shrink: 0;
}

.gif-title {
  font-weight: 600;
  font-size: 14px;
}

.gif-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
}

.gif-close:hover {
  color: var(--text-primary);
}

.gif-search {
  display: flex;
  gap: var(--space-xs);
  padding: var(--space-xs);
  border-bottom: 1px solid var(--border-glass);
  flex-shrink: 0;
}

.gif-search-input {
  flex: 1;
  padding: var(--space-sm);
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.gif-search-input:focus {
  border-color: var(--primary);
}

.gif-search-btn {
  padding: var(--space-sm) var(--space-md);
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.gif-search-btn:hover {
  background: var(--primary-dark);
}

.gif-tabs {
  display: flex;
  gap: var(--space-xs);
  padding: var(--space-xs);
  border-bottom: 1px solid var(--border-glass);
  flex-shrink: 0;
}

.gif-tab {
  padding: var(--space-xs) var(--space-md);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.gif-tab:hover {
  color: var(--text-primary);
  background: var(--bg-glass);
}

.gif-tab.active {
  background: var(--primary);
  color: #fff;
}

.gif-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-xs);
  padding: var(--space-sm);
  overflow-y: auto;
  flex: 1;
  align-content: start;
}

.gif-item {
  aspect-ratio: 1;
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  overflow: hidden;
}

.gif-item:hover {
  transform: scale(1.05);
  border-color: var(--primary);
  z-index: 1;
}

.gif-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: var(--space-xl);
}

.empty-icon {
  font-size: 32px;
  margin-bottom: var(--space-sm);
}

.empty-state p {
  color: var(--text-secondary);
}

@media (max-width: 480px) {
  .gif-picker {
    width: 320px;
    max-height: 400px;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = gifPickerStyles;
document.head.appendChild(styleTag);
