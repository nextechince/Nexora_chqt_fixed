/**
 * Message Bubble Component
 * Complete message display with reactions, replies, and status
 */
export class MessageBubble {
  constructor(options = {}) {
    this.message = options.message || {};
    this.isOwn = options.isOwn || false;
    this.onReaction = options.onReaction || (() => {});
    this.onReply = options.onReply || (() => {});
    this.onForward = options.onForward || (() => {});
    this.onDelete = options.onDelete || (() => {});
    this.onEdit = options.onEdit || (() => {});
    this.showReactions = options.showReactions !== false;
    this.element = null;
  }

  render() {
    this.element = document.createElement('div');
    this.element.className = `message-bubble ${this.isOwn ? 'sent' : 'received'}`;
    this.element.dataset.messageId = this.message.id;

    const reactions = this.message.reactions || [];
    const replyTo = this.message.reply_to;
    const status = this.message.status || 'sent';
    const statusIcons = {
      sent: '✓',
      delivered: '✓✓',
      read: '✓✓✓'
    };

    this.element.innerHTML = `
      ${replyTo ? `
        <div class="message-reply">
          <span class="reply-author">${replyTo.sender_name || 'User'}</span>
          <span class="reply-content">${replyTo.content || 'Media'}</span>
        </div>
      ` : ''}
      
      <div class="message-content-wrapper">
        <div class="message-content">
          ${this.renderContent()}
        </div>
        
        ${this.showReactions && reactions.length > 0 ? `
          <div class="message-reactions">
            ${reactions.map(r => `
              <span class="reaction" data-reaction="${r.reaction}" data-user="${r.user_id}">
                ${r.reaction}
                ${r.count > 1 ? `<span class="reaction-count">${r.count}</span>` : ''}
              </span>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <div class="message-footer">
        <span class="message-time">${this.formatTime(this.message.created_at)}</span>
        ${this.isOwn ? `<span class="message-status">${statusIcons[status] || '✓'}</span>` : ''}
        ${this.message.edited ? '<span class="message-edited">(edited)</span>' : ''}
        ${this.message.is_pinned ? '<span class="message-pinned">📌</span>' : ''}
      </div>

      <div class="message-actions">
        <button class="action-btn" data-action="reply" title="Reply">↩</button>
        <button class="action-btn" data-action="reaction" title="React">😊</button>
        <button class="action-btn" data-action="forward" title="Forward">↗</button>
        ${this.isOwn ? `
          <button class="action-btn" data-action="edit" title="Edit">✎</button>
          <button class="action-btn" data-action="delete" title="Delete">🗑</button>
        ` : ''}
        <button class="action-btn" data-action="pin" title="Pin">📌</button>
      </div>
    `;

    this.setupEventListeners();
    return this.element;
  }

  renderContent() {
    const { message_type, content, media_url, media_thumbnail, file_name } = this.message;

    switch (message_type) {
      case 'text':
        return `<p class="message-text">${this.linkify(content)}</p>`;
      
      case 'image':
        return `
          <div class="message-media image-wrapper">
            <img src="${media_url}" alt="Image" loading="lazy" onclick="this.classList.toggle('expanded')" />
          </div>
          ${content ? `<p class="message-caption">${content}</p>` : ''}
        `;
      
      case 'video':
        return `
          <div class="message-media video-wrapper">
            <video src="${media_url}" controls preload="metadata" poster="${media_thumbnail || ''}"></video>
          </div>
          ${content ? `<p class="message-caption">${content}</p>` : ''}
        `;
      
      case 'audio':
        return `
          <div class="message-media audio-wrapper">
            <audio src="${media_url}" controls></audio>
          </div>
          ${content ? `<p class="message-caption">${content}</p>` : ''}
        `;
      
      case 'voice':
        return `
          <div class="message-media voice-wrapper">
            <div class="voice-player">
              <button class="play-btn" onclick="this.parentElement.parentElement.querySelector('audio').play()">▶</button>
              <div class="voice-waveform"></div>
              <span class="voice-duration">${this.message.duration || '0:00'}</span>
            </div>
            <audio src="${media_url}"></audio>
          </div>
        `;
      
      case 'file':
        return `
          <div class="message-media file-wrapper">
            <a href="${media_url}" download="${file_name || 'file'}" class="file-link">
              <span class="file-icon">📎</span>
              <span class="file-name">${file_name || 'File'}</span>
              <span class="file-size">${this.formatFileSize(this.message.file_size)}</span>
            </a>
            ${content ? `<p class="message-caption">${content}</p>` : ''}
          </div>
        `;
      
      case 'sticker':
        return `
          <div class="message-media sticker-wrapper">
            <img src="${media_url}" alt="Sticker" class="sticker-image" />
          </div>
        `;
      
      case 'gif':
        return `
          <div class="message-media gif-wrapper">
            <img src="${media_url}" alt="GIF" loading="lazy" />
          </div>
          ${content ? `<p class="message-caption">${content}</p>` : ''}
        `;
      
      default:
        return `<p class="message-text">${content || ''}</p>`;
    }
  }

  setupEventListeners() {
    // Action buttons
    this.element.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        this.handleAction(action);
      });
    });

    // Reaction click
    this.element.querySelectorAll('.reaction').forEach(el => {
      el.addEventListener('click', () => {
        const emoji = el.dataset.reaction;
        this.onReaction(this.message.id, emoji);
      });
    });

    // Double click to react with ❤️
    this.element.addEventListener('dblclick', () => {
      this.onReaction(this.message.id, '❤️');
    });
  }

  handleAction(action) {
    switch (action) {
      case 'reply':
        this.onReply(this.message);
        break;
      case 'reaction':
        this.showReactionPicker();
        break;
      case 'forward':
        this.onForward(this.message);
        break;
      case 'edit':
        this.startEditing();
        break;
      case 'delete':
        if (confirm('Delete this message?')) {
          this.onDelete(this.message.id);
        }
        break;
      case 'pin':
        this.onPin(this.message.id);
        break;
    }
  }

  showReactionPicker() {
    const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '💯', '🎉', '⭐'];
    const picker = document.createElement('div');
    picker.className = 'reaction-picker glass';
    picker.innerHTML = emojis.map(e => `
      <button class="reaction-option" onclick="this.closest('.message-bubble').__onReaction('${e}')">${e}</button>
    `).join('');

    // Store reference to onReaction
    picker.__onReaction = (emoji) => {
      this.onReaction(this.message.id, emoji);
      picker.remove();
    };

    const actions = this.element.querySelector('.message-actions');
    actions.parentNode.insertBefore(picker, actions);
    
    setTimeout(() => {
      document.addEventListener('click', function closePicker(e) {
        if (!picker.contains(e.target)) {
          picker.remove();
          document.removeEventListener('click', closePicker);
        }
      });
    }, 100);
  }

  startEditing() {
    const content = this.message.content;
    const textarea = document.createElement('textarea');
    textarea.className = 'edit-textarea';
    textarea.value = content;
    textarea.rows = 3;

    const contentWrapper = this.element.querySelector('.message-content-wrapper');
    const originalContent = contentWrapper.querySelector('.message-content');
    contentWrapper.insertBefore(textarea, originalContent);
    originalContent.style.display = 'none';

    // Save on Enter or Escape
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.saveEdit(textarea.value);
      }
      if (e.key === 'Escape') {
        this.cancelEdit();
      }
    });

    // Save on blur after delay
    textarea.addEventListener('blur', () => {
      setTimeout(() => {
        if (textarea.parentNode) {
          this.saveEdit(textarea.value);
        }
      }, 200);
    });

    textarea.focus();
    textarea.select();

    // Store reference to cancel
    this._editTextarea = textarea;
    this._editOriginal = originalContent;
  }

  saveEdit(newContent) {
    if (newContent !== this.message.content) {
      this.onEdit(this.message.id, newContent);
    }
    this.cancelEdit();
  }

  cancelEdit() {
    if (this._editTextarea) {
      this._editTextarea.remove();
      this._editOriginal.style.display = '';
      delete this._editTextarea;
      delete this._editOriginal;
    }
  }

  linkify(text) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  }

  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  updateStatus(status) {
    const statusEl = this.element.querySelector('.message-status');
    const icons = { sent: '✓', delivered: '✓✓', read: '✓✓✓' };
    if (statusEl) {
      statusEl.textContent = icons[status] || '✓';
    }
  }

  updateReactions(reactions) {
    const container = this.element.querySelector('.message-reactions');
    if (container) {
      if (reactions.length === 0) {
        container.remove();
        return;
      }
      container.innerHTML = reactions.map(r => `
        <span class="reaction" data-reaction="${r.reaction}" data-user="${r.user_id}">
          ${r.reaction}
          ${r.count > 1 ? `<span class="reaction-count">${r.count}</span>` : ''}
        </span>
      `).join('');
    }
  }

  highlight() {
    this.element.style.background = 'var(--primary)';
    this.element.style.opacity = '0.6';
    setTimeout(() => {
      this.element.style.background = '';
      this.element.style.opacity = '';
    }, 2000);
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

// Styles
const messageBubbleStyles = `
.message-bubble {
  max-width: 70%;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  position: relative;
  animation: slide-up 0.3s ease;
  margin-bottom: var(--space-xs);
}

.message-bubble.sent {
  align-self: flex-end;
  background: var(--primary);
  border-bottom-right-radius: 4px;
}

.message-bubble.received {
  align-self: flex-start;
  background: var(--bg-glass);
  border-bottom-left-radius: 4px;
}

.message-bubble:hover .message-actions {
  opacity: 1;
}

.message-reply {
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-glass);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-xs);
  border-left: 3px solid var(--primary);
  font-size: 13px;
}

.reply-author {
  font-weight: 600;
  color: var(--primary);
}

.reply-content {
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-content-wrapper {
  position: relative;
}

.message-content {
  word-wrap: break-word;
  font-size: 15px;
  line-height: 1.5;
}

.message-text {
  margin: 0;
}

.message-text a {
  color: var(--accent);
  text-decoration: underline;
}

.message-caption {
  margin: var(--space-xs) 0 0 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.message-media {
  max-width: 100%;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.image-wrapper img {
  max-width: 300px;
  max-height: 400px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: transform var(--transition-fast);
}

.image-wrapper img.expanded {
  max-width: 100%;
  max-height: 600px;
}

.video-wrapper video {
  max-width: 300px;
  max-height: 400px;
  border-radius: var(--radius-sm);
}

.audio-wrapper audio {
  width: 200px;
  height: 40px;
}

.voice-wrapper {
  display: flex;
  align-items: center;
  min-width: 200px;
}

.voice-player {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
}

.play-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--bg-glass);
  border: none;
  color: var(--text-primary);
  font-size: 16px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.play-btn:hover {
  background: var(--bg-glass-hover);
}

.voice-waveform {
  flex: 1;
  height: 30px;
  background: var(--bg-glass);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  padding: 0 var(--space-sm);
}

.voice-waveform::before {
  content: '▁▂▃▄▅▆▇██▇▆▅▄▃▂▁';
  font-size: 16px;
  color: var(--primary);
  letter-spacing: 1px;
  opacity: 0.7;
}

.voice-duration {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 36px;
}

.file-wrapper {
  min-width: 180px;
}

.file-link {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--bg-glass);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--text-primary);
  transition: background var(--transition-fast);
}

.file-link:hover {
  background: var(--bg-glass-hover);
}

.file-icon {
  font-size: 24px;
}

.file-name {
  flex: 1;
  font-weight: 500;
}

.file-size {
  font-size: 12px;
  color: var(--text-secondary);
}

.sticker-wrapper img {
  max-width: 200px;
  max-height: 200px;
  border-radius: var(--radius-sm);
}

.gif-wrapper img {
  max-width: 300px;
  max-height: 250px;
  border-radius: var(--radius-sm);
}

.message-reactions {
  display: flex;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
  flex-wrap: wrap;
}

.reaction {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  background: var(--bg-glass);
  border-radius: var(--radius-full);
  font-size: 14px;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.reaction:hover {
  transform: scale(1.2);
}

.reaction-count {
  font-size: 11px;
  color: var(--text-secondary);
}

.message-footer {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
  font-size: 11px;
  color: var(--text-muted);
}

.message-bubble.sent .message-footer {
  justify-content: flex-end;
}

.message-status {
  font-weight: 600;
}

.message-edited {
  font-style: italic;
}

.message-pinned {
  font-size: 12px;
}

.message-actions {
  display: flex;
  gap: var(--space-xs);
  position: absolute;
  top: -20px;
  right: 0;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 2px 4px;
  border: 1px solid var(--border-glass);
  opacity: 0;
  transition: opacity var(--transition-fast);
  z-index: 2;
}

.message-bubble.received .message-actions {
  right: auto;
  left: 0;
}

.action-btn {
  padding: 2px 6px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--bg-glass);
  color: var(--text-primary);
}

.edit-textarea {
  width: 100%;
  padding: var(--space-sm);
  background: var(--bg-glass);
  border: 1px solid var(--primary);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

.reaction-picker {
  display: flex;
  gap: var(--space-xs);
  padding: var(--space-xs);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-glass);
  background: var(--bg-secondary);
  position: absolute;
  top: -40px;
  z-index: 3;
}

.reaction-option {
  font-size: 20px;
  padding: 2px;
  background: none;
  border: none;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.reaction-option:hover {
  transform: scale(1.3);
}

@media (max-width: 768px) {
  .message-bubble {
    max-width: 85%;
  }
  
  .image-wrapper img,
  .video-wrapper video {
    max-width: 200px;
  }
  
  .message-actions {
    opacity: 1;
    position: static;
    margin-top: var(--space-xs);
    background: transparent;
    border: none;
    padding: 0;
  }
}

@media (max-width: 480px) {
  .message-bubble {
    max-width: 90%;
    padding: var(--space-xs) var(--space-sm);
  }
  
  .image-wrapper img,
  .video-wrapper video {
    max-width: 150px;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = messageBubbleStyles;
document.head.appendChild(styleTag);
