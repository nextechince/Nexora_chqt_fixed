/**
 * Message Input Component
 * Complete message input with attachments, emojis, stickers, GIFs
 */
import { EmojiPicker } from './EmojiPicker.js';
import { Toast } from '../utils/toast.js';
import API from '../utils/api.js';

export class MessageInput {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.chatId = options.chatId || null;
    this.onSend = options.onSend || (() => {});
    this.onTyping = options.onTyping || (() => {});
    this.placeholder = options.placeholder || 'Type a message...';
    this.disabled = options.disabled || false;
    this.element = null;
    this.input = null;
    this.emojiPicker = null;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.attachments = [];
  }

  render() {
    this.element = document.createElement('div');
    this.element.className = 'message-input-component glass';
    
    this.element.innerHTML = `
      <div class="message-input-tools">
        <button class="btn btn-icon btn-sm" id="emojiBtn" title="Emoji">😊</button>
        <button class="btn btn-icon btn-sm" id="stickerBtn" title="Stickers">🎭</button>
        <button class="btn btn-icon btn-sm" id="gifBtn" title="GIF">🎬</button>
        <button class="btn btn-icon btn-sm" id="attachBtn" title="Attach">📎</button>
        <button class="btn btn-icon btn-sm" id="voiceBtn" title="Voice Note">🎤</button>
      </div>
      <div class="message-input-wrapper">
        <textarea 
          class="message-textarea" 
          rows="1" 
          placeholder="${this.placeholder}"
          ${this.disabled ? 'disabled' : ''}
        ></textarea>
        <button class="btn btn-primary btn-icon" id="sendBtn" title="Send" ${this.disabled ? 'disabled' : ''}>
          ➤
        </button>
      </div>
      <div class="message-attachments" id="attachmentsPreview"></div>
      <div class="message-voice-recorder" id="voiceRecorder" style="display:none;">
        <div class="voice-recorder-controls">
          <button class="btn btn-danger btn-icon" id="stopRecordingBtn">⏹</button>
          <div class="voice-waveform" id="voiceWaveform"></div>
          <span class="voice-timer" id="voiceTimer">00:00</span>
        </div>
      </div>
    `;

    this.container.appendChild(this.element);
    this.input = this.element.querySelector('.message-textarea');
    this.attachmentsContainer = this.element.querySelector('#attachmentsPreview');
    this.voiceRecorder = this.element.querySelector('#voiceRecorder');
    this.voiceTimer = this.element.querySelector('#voiceTimer');

    this.setupEventListeners();
    this.setupEmojiPicker();
    this.setupVoiceRecorder();
    this.setupFileUpload();

    return this.element;
  }

  setupEventListeners() {
    // Auto-resize textarea
    this.input.addEventListener('input', () => {
      this.input.style.height = 'auto';
      this.input.style.height = Math.min(this.input.scrollHeight, 120) + 'px';
      
      // Typing indicator
      if (this.input.value.trim()) {
        this.onTyping(true);
      } else {
        this.onTyping(false);
      }
    });

    // Send on Enter (Shift+Enter for new line)
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Send button
    this.element.querySelector('#sendBtn').addEventListener('click', () => {
      this.sendMessage();
    });

    // Voice button
    this.element.querySelector('#voiceBtn').addEventListener('click', () => {
      this.toggleVoiceRecording();
    });

    // Attach button - file input
    this.element.querySelector('#attachBtn').addEventListener('click', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.multiple = true;
      fileInput.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.zip,.apk,.txt';
      fileInput.onchange = (e) => this.handleFiles(e.target.files);
      fileInput.click();
    });
  }

  setupEmojiPicker() {
    const emojiBtn = this.element.querySelector('#emojiBtn');
    this.emojiPicker = new EmojiPicker({
      onSelect: (emoji) => {
        const cursorPos = this.input.selectionStart;
        const text = this.input.value;
        this.input.value = text.slice(0, cursorPos) + emoji + text.slice(cursorPos);
        this.input.focus();
        this.input.selectionStart = this.input.selectionEnd = cursorPos + emoji.length;
        this.input.dispatchEvent(new Event('input'));
      }
    });
    this.emojiPicker.render();

    emojiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.emojiPicker.toggle(emojiBtn);
    });
  }

  setupVoiceRecorder() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.ondataavailable = (e) => {
          this.audioChunks.push(e.data);
        };
        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          this.sendVoiceNote(audioBlob);
          this.audioChunks = [];
        };
      })
      .catch(() => {
        // Voice recording not supported
        this.element.querySelector('#voiceBtn').style.opacity = '0.5';
        this.element.querySelector('#voiceBtn').title = 'Voice recording not available';
      });
  }

  setupFileUpload() {
    // Drag and drop
    this.element.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.element.classList.add('drag-over');
    });

    this.element.addEventListener('dragleave', () => {
      this.element.classList.remove('drag-over');
    });

    this.element.addEventListener('drop', (e) => {
      e.preventDefault();
      this.element.classList.remove('drag-over');
      this.handleFiles(e.dataTransfer.files);
    });
  }

  handleFiles(files) {
    Array.from(files).forEach(file => {
      this.attachments.push(file);
      this.showAttachmentPreview(file);
    });
  }

  showAttachmentPreview(file) {
    const preview = document.createElement('div');
    preview.className = 'attachment-preview';
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (file.type.startsWith('image/')) {
        preview.innerHTML = `
          <img src="${e.target.result}" alt="${file.name}" />
          <button class="remove-attachment" onclick="this.parentElement.remove()">×</button>
        `;
      } else if (file.type.startsWith('video/')) {
        preview.innerHTML = `
          <video src="${e.target.result}" muted></video>
          <span class="attachment-name">${file.name}</span>
          <button class="remove-attachment" onclick="this.parentElement.remove()">×</button>
        `;
      } else {
        preview.innerHTML = `
          <div class="attachment-icon">📎</div>
          <span class="attachment-name">${file.name}</span>
          <span class="attachment-size">${this.formatFileSize(file.size)}</span>
          <button class="remove-attachment" onclick="this.parentElement.remove()">×</button>
        `;
      }
    };

    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsDataURL(file);
    }

    this.attachmentsContainer.appendChild(preview);
    this.attachmentsContainer.style.display = 'flex';
  }

  toggleVoiceRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  startRecording() {
    if (!this.mediaRecorder) {
      Toast.error('Voice recording not available');
      return;
    }

    this.isRecording = true;
    this.audioChunks = [];
    this.mediaRecorder.start();
    this.voiceRecorder.style.display = 'block';
    this.element.querySelector('#voiceBtn').classList.add('recording');
    
    // Timer
    let seconds = 0;
    this.recordingInterval = setInterval(() => {
      seconds++;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      this.voiceTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);

    // Stop button
    this.element.querySelector('#stopRecordingBtn').onclick = () => {
      this.stopRecording();
    };

    // Max 5 minutes
    setTimeout(() => {
      if (this.isRecording) {
        this.stopRecording();
        Toast.warning('Voice note limited to 5 minutes');
      }
    }, 300000);
  }

  stopRecording() {
    if (this.isRecording && this.mediaRecorder) {
      this.isRecording = false;
      this.mediaRecorder.stop();
      clearInterval(this.recordingInterval);
      this.voiceRecorder.style.display = 'none';
      this.element.querySelector('#voiceBtn').classList.remove('recording');
    }
  }

  async sendVoiceNote(audioBlob) {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-note.webm');
      
      const response = await API.upload(`/chats/${this.chatId}/voice`, formData);
      this.onSend({
        type: 'voice',
        url: response.url,
        duration: this.voiceTimer.textContent
      });
    } catch (error) {
      Toast.error('Failed to send voice note');
    }
  }

  async sendMessage() {
    const text = this.input.value.trim();
    const attachments = this.attachments;

    if (!text && attachments.length === 0) {
      return;
    }

    this.setLoading(true);

    try {
      // Send text
      if (text) {
        await this.onSend({ type: 'text', content: text });
        this.input.value = '';
        this.input.style.height = 'auto';
      }

      // Send attachments
      for (const file of attachments) {
        await this.sendAttachment(file);
      }

      this.attachments = [];
      this.attachmentsContainer.innerHTML = '';
      this.attachmentsContainer.style.display = 'none';
      this.onTyping(false);

    } catch (error) {
      Toast.error('Failed to send message');
    } finally {
      this.setLoading(false);
    }
  }

  async sendAttachment(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    let endpoint = '/media/upload';
    if (file.type.startsWith('image/')) {
      endpoint = '/media/image';
    } else if (file.type.startsWith('video/')) {
      endpoint = '/media/video';
    } else if (file.type.startsWith('audio/')) {
      endpoint = '/media/audio';
    }

    const response = await API.upload(`${endpoint}?chatId=${this.chatId}`, file);
    await this.onSend({
      type: file.type.startsWith('image/') ? 'image' :
            file.type.startsWith('video/') ? 'video' :
            file.type.startsWith('audio/') ? 'audio' : 'file',
      url: response.url,
      name: file.name,
      size: file.size
    });
  }

  setLoading(loading) {
    const sendBtn = this.element.querySelector('#sendBtn');
    if (loading) {
      sendBtn.disabled = true;
      sendBtn.textContent = '⏳';
      this.input.disabled = true;
    } else {
      sendBtn.disabled = false;
      sendBtn.textContent = '➤';
      this.input.disabled = false;
      this.input.focus();
    }
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  setDisabled(disabled) {
    this.disabled = disabled;
    this.input.disabled = disabled;
    this.element.querySelector('#sendBtn').disabled = disabled;
  }

  focus() {
    this.input.focus();
  }

  destroy() {
    this.emojiPicker?.destroy();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

// Styles
const messageInputStyles = `
.message-input-component {
  display: flex;
  flex-direction: column;
  padding: var(--space-sm);
  border-top: 1px solid var(--border-glass);
  background: var(--bg-secondary);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
}

.message-input-component.drag-over {
  border-color: var(--primary);
  box-shadow: inset 0 0 20px rgba(88, 101, 242, 0.2);
}

.message-input-tools {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-xs);
}

.message-input-tools .btn {
  font-size: 18px;
  color: var(--text-secondary);
}

.message-input-tools .btn:hover {
  color: var(--text-primary);
}

.message-input-tools .btn.recording {
  color: #EF4444;
  animation: pulse-neon 0.5s ease-in-out infinite;
}

.message-input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  background: var(--bg-glass);
  border-radius: var(--radius-md);
  padding: var(--space-xs);
  border: 1px solid var(--border-glass);
  transition: border-color var(--transition-fast);
}

.message-input-wrapper:focus-within {
  border-color: var(--primary);
  box-shadow: var(--shadow-glow);
}

.message-textarea {
  flex: 1;
  padding: var(--space-sm);
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 14px;
  resize: none;
  max-height: 120px;
  font-family: inherit;
  line-height: 1.5;
  min-height: 40px;
}

.message-textarea::placeholder {
  color: var(--text-muted);
}

.message-textarea:disabled {
  opacity: 0.5;
}

.message-attachments {
  display: none;
  flex-wrap: wrap;
  gap: var(--space-sm);
  padding: var(--space-sm);
  border-top: 1px solid var(--border-glass);
  margin-top: var(--space-sm);
}

.attachment-preview {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.attachment-preview img,
.attachment-preview video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.attachment-preview .attachment-icon {
  font-size: 32px;
}

.attachment-preview .attachment-name {
  font-size: 10px;
  color: var(--text-secondary);
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
}

.attachment-preview .attachment-size {
  font-size: 9px;
  color: var(--text-muted);
}

.remove-attachment {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background: rgba(239, 68, 68, 0.9);
  color: #fff;
  border: none;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-fast);
}

.remove-attachment:hover {
  transform: scale(1.1);
}

.message-voice-recorder {
  padding: var(--space-sm);
  border-top: 1px solid var(--border-glass);
  margin-top: var(--space-sm);
}

.voice-recorder-controls {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.voice-waveform {
  flex: 1;
  height: 40px;
  background: var(--bg-glass);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  padding: 0 var(--space-sm);
}

.voice-waveform::before {
  content: '';
  display: flex;
  gap: 2px;
  height: 100%;
  width: 100%;
}

.voice-waveform::before {
  content: '▁▂▃▄▅▆▇██▇▆▅▄▃▂▁▂▃▄▅▆▇██▇▆▅▄▃▂▁';
  font-size: 20px;
  color: var(--primary);
  letter-spacing: 2px;
  animation: pulse-neon 0.5s ease-in-out infinite;
}

.voice-timer {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 48px;
}

@media (max-width: 480px) {
  .message-input-tools .btn {
    font-size: 16px;
  }
  
  .attachment-preview {
    width: 60px;
    height: 60px;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = messageInputStyles;
document.head.appendChild(styleTag);
