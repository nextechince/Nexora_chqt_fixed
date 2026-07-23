/**
 * Channel View Page
 * Posts, comments, subscription management
 */
import API from '../utils/api.js';
import { Toast } from '../utils/toast.js';
import { Router } from '../router.js';
import { Auth } from '../utils/auth.js';
import { Socket } from '../utils/socket.js';
import { Store } from '../store.js';

let channelId = null;
let isSubscribed = false;
let posts = [];

export function ChannelView(params) {
  channelId = params.id;
  
  return `
    <div class="channel-view-page" data-channel-id="${channelId}">
      <div class="channel-header glass">
        <button class="btn btn-icon" onclick="window.history.back()">
          ←
        </button>
        <div class="channel-header-info">
          <div class="channel-header-avatar" id="channelAvatar">
            <span>C</span>
          </div>
          <div class="channel-header-details">
            <span class="channel-header-name" id="channelName">Loading...</span>
            <span class="channel-header-meta" id="channelMeta">Loading...</span>
          </div>
        </div>
        <div class="channel-header-actions">
          <button class="btn btn-primary btn-sm" id="subscribeBtn">Subscribe</button>
          <button class="btn btn-icon" id="channelMenuBtn">⋮</button>
        </div>
      </div>

      <div class="channel-posts" id="channelPosts">
        <div class="loading-spinner"></div>
      </div>

      <div class="channel-input-container glass">
        <div class="channel-input-tools">
          <button class="btn btn-icon btn-sm" id="postEmojiBtn">😊</button>
          <button class="btn btn-icon btn-sm" id="postAttachBtn">📎</button>
        </div>
        <div class="channel-input-wrapper">
          <textarea 
            id="postInput" 
            rows="1" 
            placeholder="Write a post..."
            aria-label="Write a post"
          ></textarea>
          <button class="btn btn-primary btn-icon" id="postSendBtn">➤</button>
        </div>
      </div>
    </div>
  `;
}

export function initChannelView() {
  const container = document.querySelector('.channel-view-page');
  channelId = container?.dataset.channelId;

  if (!channelId) {
    Toast.error('Invalid channel');
    Router.navigate('channels');
    return;
  }

  loadChannelData();
  setupSocketListeners();

  // Post input
  const postInput = document.getElementById('postInput');
  const sendBtn = document.getElementById('postSendBtn');

  postInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  sendBtn.addEventListener('click', () => createPost());
  postInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      createPost();
    }
  });

  // Subscribe button
  document.getElementById('subscribeBtn').addEventListener('click', toggleSubscription);

  // Menu button
  document.getElementById('channelMenuBtn').addEventListener('click', showChannelMenu);
}

async function loadChannelData() {
  try {
    const response = await API.get(`/channels/${channelId}`);
    const channel = response.channel;

    if (!channel) {
      Toast.error('Channel not found');
      Router.navigate('channels');
      return;
    }

    // Update header
    const avatar = document.getElementById('channelAvatar');
    if (channel.avatar_url) {
      avatar.innerHTML = `<img src="${channel.avatar_url}" alt="${channel.name}" />`;
    } else {
      avatar.innerHTML = `<span>${(channel.name || 'C')[0].toUpperCase()}</span>`;
    }

    document.getElementById('channelName').textContent = channel.name || 'Unnamed Channel';
    document.getElementById('channelMeta').textContent = 
      `${channel.subscriber_count || 0} subscribers • ${channel.category || 'General'}`;

    // Update subscribe button
    isSubscribed = channel.isSubscribed || false;
    updateSubscribeButton();

    // Load posts
    posts = channel.recentPosts || [];
    renderPosts(posts);

  } catch (error) {
    console.error('Load channel error:', error);
    Toast.error('Failed to load channel');
  }
}

function renderPosts(posts) {
  const container = document.getElementById('channelPosts');
  
  if (!posts || posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>No Posts Yet</h3>
        <p>Be the first to post in this channel</p>
      </div>
    `;
    return;
  }

  container.innerHTML = posts.map(post => `
    <div class="post-item" data-post-id="${post.id}">
      <div class="post-header">
        <div class="post-author-avatar">
          ${post.sender?.avatar_url ? 
            `<img src="${post.sender.avatar_url}" alt="${post.sender.display_name}" />` :
            `<span>${(post.sender?.display_name || 'U')[0].toUpperCase()}</span>`
          }
        </div>
        <div class="post-author-info">
          <span class="post-author-name">
            ${post.sender?.display_name || 'Unknown'}
            ${post.sender?.is_verified ? '<span class="badge badge-verified">✓</span>' : ''}
          </span>
          <span class="post-time">${formatTime(post.created_at)}</span>
        </div>
        ${post.is_pinned ? '<span class="post-pinned">📌 Pinned</span>' : ''}
        <div class="post-actions">
          <button class="btn btn-icon btn-sm" onclick="togglePostMenu('${post.id}')">⋮</button>
        </div>
      </div>
      <div class="post-content">
        ${post.message_type === 'text' ? post.content : 
          post.message_type === 'image' ? `<img src="${post.media_url}" alt="Image" />` :
          post.message_type === 'video' ? `<video src="${post.media_url}" controls></video>` :
          post.message_type === 'audio' ? `<audio src="${post.media_url}" controls></audio>` :
          post.message_type === 'file' ? `<a href="${post.media_url}" download>${post.file_name}</a>` :
          post.content}
      </div>
      <div class="post-footer">
        <div class="post-reactions">
          ${post.reactions?.length > 0 ? 
            post.reactions.map(r => `<span class="reaction">${r.reaction}</span>`).join('') : 
            ''}
        </div>
        <div class="post-actions">
          <button class="btn btn-sm btn-secondary" onclick="showReactionPicker('${post.id}')">
            👍 React
          </button>
          <button class="btn btn-sm btn-secondary" onclick="showCommentInput('${post.id}')">
            💬 Comment
          </button>
          <button class="btn btn-sm btn-secondary" onclick="sharePost('${post.id}')">
            📤 Share
          </button>
        </div>
      </div>
      <div class="post-comments" id="comments-${post.id}">
        ${post.comments?.length > 0 ? 
          post.comments.map(comment => `
            <div class="comment-item">
              <div class="comment-avatar">
                ${comment.user?.avatar_url ? 
                  `<img src="${comment.user.avatar_url}" alt="${comment.user.display_name}" />` :
                  `<span>${(comment.user?.display_name || 'U')[0].toUpperCase()}</span>`
                }
              </div>
              <div class="comment-content">
                <span class="comment-author">${comment.user?.display_name || 'Unknown'}</span>
                <span class="comment-text">${comment.content}</span>
                <span class="comment-time">${formatTime(comment.created_at)}</span>
              </div>
            </div>
          `).join('') : 
          ''}
      </div>
    </div>
  `).join('');

  // Scroll to top
  container.scrollTop = 0;
}

function createPost() {
  const input = document.getElementById('postInput');
  const content = input.value.trim();

  if (!content) {
    Toast.warning('Please enter some content');
    return;
  }

  if (!isSubscribed) {
    Toast.warning('You must be subscribed to post');
    return;
  }

  input.disabled = true;
  document.getElementById('postSendBtn').disabled = true;

  API.post(`/channels/${channelId}/posts`, { content })
    .then(response => {
      const post = response.post;
      posts.unshift(post);
      renderPosts(posts);
      input.value = '';
      input.style.height = 'auto';
      Toast.success('Post created!');
    })
    .catch(error => {
      Toast.error(error.message || 'Failed to create post');
    })
    .finally(() => {
      input.disabled = false;
      document.getElementById('postSendBtn').disabled = false;
      input.focus();
    });
}

function toggleSubscription() {
  if (isSubscribed) {
    if (!confirm('Unsubscribe from this channel?')) return;
    unsubscribeFromChannel();
  } else {
    subscribeToChannel();
  }
}

async function subscribeToChannel() {
  try {
    await API.post(`/channels/${channelId}/subscribe`);
    isSubscribed = true;
    updateSubscribeButton();
    Toast.success('Subscribed to channel');
  } catch (error) {
    Toast.error(error.message || 'Failed to subscribe');
  }
}

async function unsubscribeFromChannel() {
  try {
    await API.post(`/channels/${channelId}/unsubscribe`);
    isSubscribed = false;
    updateSubscribeButton();
    Toast.success('Unsubscribed from channel');
  } catch (error) {
    Toast.error(error.message || 'Failed to unsubscribe');
  }
}

function updateSubscribeButton() {
  const btn = document.getElementById('subscribeBtn');
  if (isSubscribed) {
    btn.textContent = '✓ Subscribed';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
  } else {
    btn.textContent = 'Subscribe';
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-primary');
  }
}

function setupSocketListeners() {
  // New post
  Socket.on('new_post', (data) => {
    if (data.channelId === channelId) {
      posts.unshift(data.post);
      renderPosts(posts);
      Toast.info('New post in channel');
    }
  });

  // Post updated
  Socket.on('post_updated', (data) => {
    if (data.channelId === channelId) {
      const post = posts.find(p => p.id === data.postId);
      if (post) {
        post.content = data.content;
        renderPosts(posts);
      }
    }
  });

  // Post deleted
  Socket.on('post_deleted', (data) => {
    if (data.channelId === channelId) {
      posts = posts.filter(p => p.id !== data.postId);
      renderPosts(posts);
      Toast.info('Post deleted');
    }
  });

  // Post pinned
  Socket.on('post_pinned', (data) => {
    if (data.channelId === channelId) {
      const post = posts.find(p => p.id === data.postId);
      if (post) {
        post.is_pinned = true;
        renderPosts(posts);
        Toast.info('Post pinned');
      }
    }
  });

  // New comment
  Socket.on('new_comment', (data) => {
    if (data.channelId === channelId) {
      const post = posts.find(p => p.id === data.postId);
      if (post) {
        if (!post.comments) post.comments = [];
        post.comments.push(data.comment);
        renderPosts(posts);
      }
    }
  });
}

// Reaction picker
window.showReactionPicker = function(postId) {
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '💯', '🎉', '⭐'];
  
  const picker = document.createElement('div');
  picker.className = 'reaction-picker glass';
  picker.innerHTML = emojis.map(e => `
    <button class="reaction-option" onclick="addReaction('${postId}', '${e}')">${e}</button>
  `).join('');

  const post = document.querySelector(`.post-item[data-post-id="${postId}"]`);
  if (post) {
    const footer = post.querySelector('.post-footer');
    const existing = footer.querySelector('.reaction-picker');
    if (existing) existing.remove();
    footer.prepend(picker);
    
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closePicker(e) {
        if (!picker.contains(e.target)) {
          picker.remove();
          document.removeEventListener('click', closePicker);
        }
      });
    }, 100);
  }
};

// Add reaction
window.addReaction = async function(postId, emoji) {
  try {
    await API.post(`/posts/${postId}/reactions`, { emoji });
    
    // Update UI
    const post = posts.find(p => p.id === postId);
    if (post) {
      if (!post.reactions) post.reactions = [];
      post.reactions.push({ reaction: emoji, user_id: Auth.getCurrentUser().id });
      renderPosts(posts);
    }
    
    // Remove picker
    document.querySelector('.reaction-picker')?.remove();
  } catch (error) {
    Toast.error('Failed to add reaction');
  }
};

// Comment input
window.showCommentInput = function(postId) {
  const post = document.querySelector(`.post-item[data-post-id="${postId}"]`);
  if (!post) return;

  const commentsSection = post.querySelector('.post-comments');
  
  const inputDiv = document.createElement('div');
  inputDiv.className = 'comment-input-wrapper';
  inputDiv.innerHTML = `
    <input type="text" class="comment-input" placeholder="Write a comment..." />
    <button class="btn btn-primary btn-sm" onclick="submitComment('${postId}')">Send</button>
  `;

  const existing = commentsSection.querySelector('.comment-input-wrapper');
  if (existing) {
    existing.remove();
    return;
  }

  commentsSection.prepend(inputDiv);
  const input = inputDiv.querySelector('.comment-input');
  input.focus();

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitComment(postId);
    }
  });
};

// Submit comment
window.submitComment = async function(postId) {
  const wrapper = document.querySelector(`.post-item[data-post-id="${postId}"] .comment-input-wrapper`);
  const input = wrapper?.querySelector('.comment-input');
  const content = input?.value.trim();

  if (!content) {
    Toast.warning('Please enter a comment');
    return;
  }

  try {
    const response = await API.post(`/posts/${postId}/comments`, { content });
    
    // Update UI
    const post = posts.find(p => p.id === postId);
    if (post) {
      if (!post.comments) post.comments = [];
      post.comments.push(response.comment);
      renderPosts(posts);
    }
    
    wrapper.remove();
    Toast.success('Comment added');
  } catch (error) {
    Toast.error(error.message || 'Failed to add comment');
  }
};

// Share post
window.sharePost = function(postId) {
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  const shareText = `${post.content}\n\nShared from NEXORA CHQT`;
  
  if (navigator.share) {
    navigator.share({
      title: 'Shared Post',
      text: shareText,
      url: window.location.href
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(shareText).then(() => {
      Toast.success('Copied to clipboard');
    }).catch(() => {
      Toast.info(shareText);
    });
  }
};

// Post menu
window.togglePostMenu = function(postId) {
  const post = posts.find(p => p.id === postId);
  const user = Auth.getCurrentUser();
  const isOwner = post?.sender?.id === user.id;
  
  const menu = document.createElement('div');
  menu.className = 'dropdown-menu glass';
  menu.innerHTML = `
    ${isOwner ? `
      <button onclick="editPost('${postId}')">✎ Edit</button>
      <button onclick="deletePost('${postId}')" style="color: #EF4444;">🗑️ Delete</button>
    ` : ''}
    <button onclick="reportPost('${postId}')">🚨 Report</button>
  `;

  const actions = document.querySelector(`.post-item[data-post-id="${postId}"] .post-actions`);
  const existing = actions.querySelector('.dropdown-menu');
  if (existing) {
    existing.remove();
    return;
  }

  actions.appendChild(menu);
  
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 100);
};

// Edit post
window.editPost = function(postId) {
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  const newContent = prompt('Edit your post:', post.content);
  if (newContent === null) return;

  API.put(`/channels/${channelId}/posts/${postId}`, { content: newContent })
    .then(() => {
      post.content = newContent;
      renderPosts(posts);
      Toast.success('Post updated');
    })
    .catch(error => {
      Toast.error(error.message || 'Failed to update post');
    });
};

// Delete post
window.deletePost = function(postId) {
  if (!confirm('Delete this post?')) return;

  API.delete(`/channels/${channelId}/posts/${postId}`)
    .then(() => {
      posts = posts.filter(p => p.id !== postId);
      renderPosts(posts);
      Toast.success('Post deleted');
    })
    .catch(error => {
      Toast.error(error.message || 'Failed to delete post');
    });
};

// Report post
window.reportPost = function(postId) {
  const reason = prompt('Reason for reporting:');
  if (!reason) return;

  API.post(`/reports`, { postId, reason })
    .then(() => {
      Toast.success('Report submitted');
    })
    .catch(error => {
      Toast.error(error.message || 'Failed to submit report');
    });
};

// Channel menu
function showChannelMenu() {
  const menu = document.createElement('div');
  menu.className = 'dropdown-menu glass';
  menu.innerHTML = `
    <button onclick="copyChannelLink()">🔗 Copy Link</button>
    <button onclick="muteChannel()">🔇 Mute Notifications</button>
    ${isSubscribed ? '<button onclick="unsubscribeChannel()">📤 Unsubscribe</button>' : ''}
    <button onclick="reportChannel()">🚨 Report Channel</button>
  `;

  const btn = document.getElementById('channelMenuBtn');
  const existing = btn.parentElement.querySelector('.dropdown-menu');
  if (existing) {
    existing.remove();
    return;
  }

  btn.parentElement.appendChild(menu);
  
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 100);
}

// Copy channel link
window.copyChannelLink = function() {
  const url = `${window.location.origin}/channel/${channelId}`;
  navigator.clipboard.writeText(url).then(() => {
    Toast.success('Channel link copied');
  }).catch(() => {
    Toast.info(url);
  });
};

// Mute channel
window.muteChannel = function() {
  Toast.info('Channel muted');
};

// Report channel
window.reportChannel = function() {
  const reason = prompt('Reason for reporting this channel:');
  if (!reason) return;

  API.post(`/reports`, { channelId, reason })
    .then(() => {
      Toast.success('Report submitted');
    })
    .catch(error => {
      Toast.error(error.message || 'Failed to submit report');
    });
};

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Styles
const channelViewStyles = `
.channel-view-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.channel-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
  flex-shrink: 0;
  border: 1px solid var(--border-glass);
}

.channel-header-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex: 1;
  cursor: pointer;
}

.channel-header-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #00D4FF, #5865F2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  overflow: hidden;
  flex-shrink: 0;
}

.channel-header-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.channel-header-details {
  display: flex;
  flex-direction: column;
}

.channel-header-name {
  font-weight: 600;
  font-size: 16px;
}

.channel-header-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.channel-header-actions {
  display: flex;
  gap: var(--space-xs);
}

.channel-posts {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding-bottom: var(--space-md);
}

.post-item {
  background: var(--bg-glass);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  border: 1px solid var(--border-glass);
  transition: all var(--transition-fast);
}

.post-item:hover {
  border-color: var(--border-glass-hover);
}

.post-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.post-author-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #5865F2, #00D4FF);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  flex-shrink: 0;
}

.post-author-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-author-info {
  flex: 1;
}

.post-author-name {
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.post-time {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: var(--space-xs);
}

.post-pinned {
  font-size: 12px;
  color: var(--primary);
  margin-left: auto;
}

.post-content {
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: var(--space-sm);
}

.post-content img {
  max-width: 100%;
  max-height: 400px;
  border-radius: var(--radius-sm);
}

.post-content video {
  max-width: 100%;
  max-height: 400px;
  border-radius: var(--radius-sm);
}

.post-footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border-glass);
}

.post-reactions {
  display: flex;
  gap: var(--space-xs);
}

.reaction {
  font-size: 16px;
  background: var(--bg-glass);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.reaction-picker {
  display: flex;
  gap: var(--space-xs);
  padding: var(--space-sm);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-glass);
  margin-bottom: var(--space-sm);
}

.reaction-option {
  font-size: 24px;
  padding: var(--space-xs);
  background: none;
  border: none;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.reaction-option:hover {
  transform: scale(1.3);
}

.post-comments {
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border-glass);
}

.comment-item {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
}

.comment-avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #5865F2, #00D4FF);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  flex-shrink: 0;
}

.comment-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.comment-content {
  flex: 1;
}

.comment-author {
  font-weight: 600;
  font-size: 13px;
  margin-right: var(--space-xs);
}

.comment-text {
  font-size: 14px;
}

.comment-time {
  font-size: 11px;
  color: var(--text-secondary);
  display: block;
}

.comment-input-wrapper {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.comment-input {
  flex: 1;
  padding: var(--space-sm);
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
}

.channel-input-container {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg);
  border-top: 1px solid var(--border-glass);
  flex-shrink: 0;
  margin-top: auto;
}

.channel-input-tools {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
}

.channel-input-wrapper {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  background: var(--bg-glass);
  border-radius: var(--radius-md);
  padding: var(--space-xs);
}

.channel-input-wrapper textarea {
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
}

.channel-input-wrapper textarea::placeholder {
  color: var(--text-muted);
}

.dropdown-menu {
  position: absolute;
  right: 0;
  top: 100%;
  min-width: 160px;
  padding: var(--space-xs);
  background: var(--bg-secondary);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  z-index: 10;
}

.dropdown-menu button {
  display: block;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  text-align: left;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.dropdown-menu button:hover {
  background: var(--bg-glass);
}

@media (max-width: 768px) {
  .channel-view-page {
    padding: var(--space-md);
  }
  
  .post-item {
    padding: var(--space-sm);
  }
  
  .post-content img,
  .post-content video {
    max-height: 250px;
  }
}

@media (max-width: 480px) {
  .channel-header {
    flex-wrap: wrap;
  }
  
  .channel-header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = channelViewStyles;
document.head.appendChild(styleTag);
