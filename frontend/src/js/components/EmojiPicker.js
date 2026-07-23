/**
 * Emoji Picker Component
 * Full emoji picker with categories
 */
export class EmojiPicker {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onSelect = options.onSelect || (() => {});
    this.position = options.position || 'bottom';
    this.emojiList = this.getEmojiList();
    this.currentCategory = 'smileys';
    this.isOpen = false;
    this.element = null;
  }

  getEmojiList() {
    return {
      smileys: [
        '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊',
        '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '☺️', '🙂',
        '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣',
        '😥', '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜',
        '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️',
        '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨',
        '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵',
        '😡', '😠', '🤬'
      ],
      gestures: [
        '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
        '🤟', '🤘', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎',
        '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏',
        '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦶', '👣', '👀', '👂',
        '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👄', '👅', '💋'
      ],
      hearts: [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
        '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟',
        '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️'
      ],
      objects: [
        '💼', '📚', '📝', '✏️', '🖊️', '🖋️', '🖌️', '🖍️', '📎', '📏',
        '📐', '✂️', '🗑️', '🔒', '🔓', '🔏', '🔐', '🛡️', '⚔️', '🗡️',
        '🏹', '🛹', '🛼', '🚲', '🛵', '🛴', '🛺', '🚗', '🚕', '🚙',
        '🚐', '🚚', '🚛', '🚜', '🏎️', '🚓', '🚔', '🚑', '🚒', '🚌'
      ],
      food: [
        '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈',
        '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🫑',
        '🌽', '🥕', '🧅', '🧄', '🥬', '🥦', '🧀', '🍖', '🍗', '🥩',
        '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🥙', '🧆', '🌮', '🌯',
        '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣',
        '🍱', '🥟', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰'
      ],
      activities: [
        '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
        '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🎿', '⛷️', '🏂',
        '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏄',
        '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉'
      ]
    };
  }

  render() {
    this.element = document.createElement('div');
    this.element.className = 'emoji-picker glass';
    this.element.style.display = 'none';

    const categories = Object.keys(this.emojiList);
    const categoryLabels = {
      smileys: '😊',
      gestures: '👋',
      hearts: '❤️',
      objects: '📎',
      food: '🍎',
      activities: '⚽'
    };

    this.element.innerHTML = `
      <div class="emoji-categories">
        ${categories.map(cat => `
          <button class="emoji-category ${cat === this.currentCategory ? 'active' : ''}" data-category="${cat}">
            ${categoryLabels[cat] || cat}
          </button>
        `).join('')}
      </div>
      <div class="emoji-list" id="emojiList">
        ${this.emojiList[this.currentCategory].map(emoji => `
          <button class="emoji-item" data-emoji="${emoji}">${emoji}</button>
        `).join('')}
      </div>
    `;

    // Category switching
    this.element.querySelectorAll('.emoji-category').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentCategory = btn.dataset.category;
        this.renderEmojis();
        this.element.querySelectorAll('.emoji-category').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Emoji selection
    this.element.querySelectorAll('.emoji-item').forEach(el => {
      el.addEventListener('click', () => {
        const emoji = el.dataset.emoji;
        this.onSelect(emoji);
        this.close();
      });
    });

    this.container.appendChild(this.element);
    return this.element;
  }

  renderEmojis() {
    const list = this.element.querySelector('#emojiList');
    list.innerHTML = this.emojiList[this.currentCategory].map(emoji => `
      <button class="emoji-item" data-emoji="${emoji}">${emoji}</button>
    `).join('');

    list.querySelectorAll('.emoji-item').forEach(el => {
      el.addEventListener('click', () => {
        const emoji = el.dataset.emoji;
        this.onSelect(emoji);
        this.close();
      });
    });
  }

  open(targetElement) {
    this.isOpen = true;
    this.element.style.display = 'block';

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
}

// Styles
const emojiPickerStyles = `
.emoji-picker {
  position: fixed;
  width: 320px;
  max-height: 400px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  box-shadow: var(--shadow-card);
  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.emoji-categories {
  display: flex;
  gap: var(--space-xs);
  padding: var(--space-xs);
  border-bottom: 1px solid var(--border-glass);
  flex-shrink: 0;
}

.emoji-category {
  padding: var(--space-xs) var(--space-sm);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 18px;
  transition: all var(--transition-fast);
}

.emoji-category:hover {
  background: var(--bg-glass);
}

.emoji-category.active {
  background: var(--bg-glass);
  border-bottom: 2px solid var(--primary);
}

.emoji-list {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  padding: var(--space-xs);
  overflow-y: auto;
  flex: 1;
}

.emoji-item {
  padding: var(--space-xs);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 24px;
  transition: all var(--transition-fast);
}

.emoji-item:hover {
  background: var(--bg-glass);
  transform: scale(1.2);
}

@media (max-width: 480px) {
  .emoji-picker {
    width: 280px;
    max-height: 350px;
  }
  
  .emoji-list {
    grid-template-columns: repeat(7, 1fr);
  }
}
`;

// Add styles if not already present
if (!document.querySelector('#emojiPickerStyles')) {
  const styleTag = document.createElement('style');
  styleTag.id = 'emojiPickerStyles';
  styleTag.textContent = emojiPickerStyles;
  document.head.appendChild(styleTag);
}
