/**
 * Profile Page
 * User profile with photo, username, bio, status, verification badges
 */
import { Auth } from '../utils/auth.js';
import { Store } from '../store.js';
import { Toast } from '../utils/toast.js';
import { Router } from '../router.js';
import API from '../utils/api.js';

export function ProfilePage(params) {
  const user = Auth.getCurrentUser() || {};
  
  return `
    <div class="profile-page">
      <div class="profile-header">
        <button class="btn btn-icon" onclick="window.history.back()">
          ←
        </button>
        <h2>Profile</h2>
        <button class="btn btn-icon" id="editProfileBtn">
          ✎
        </button>
      </div>

      <div class="profile-content">
        <!-- Avatar -->
        <div class="profile-avatar-section">
          <div class="profile-avatar">
            ${user.avatar_url ? 
              `<img src="${user.avatar_url}" alt="${user.display_name}" />` :
              `<span>${(user.display_name || 'U')[0].toUpperCase()}</span>`
            }
            <button class="avatar-upload-btn" id="avatarUploadBtn">
              📷
            </button>
            <input type="file" id="avatarInput" accept="image/*" style="display:none" />
          </div>
          <div class="profile-badges">
            ${user.is_verified ? '<span class="badge badge-verified">✓ Verified</span>' : ''}
            ${user.is_premium ? '<span class="badge badge-premium">⭐ Premium</span>' : ''}
          </div>
        </div>

        <!-- User Info -->
        <div class="profile-info">
          <h1 class="profile-name">${user.display_name || 'User'}</h1>
          <p class="profile-username">@${user.username || 'username'}</p>
          ${user.bio ? `<p class="profile-bio">${user.bio}</p>` : ''}
          ${user.status ? `<p class="profile-status">${user.status}</p>` : ''}
        </div>

        <!-- Stats -->
        <div class="profile-stats">
          <div class="stat-item">
            <span class="stat-value">${user.member_since || 'N/A'}</span>
            <span class="stat-label">Member Since</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${user.last_seen ? new Date(user.last_seen).toLocaleString() : 'Never'}</span>
            <span class="stat-label">Last Seen</span>
          </div>
          <div class="stat-item">
            <span class="stat-value ${user.online_status ? 'online' : 'offline'}">
              ${user.online_status ? '🟢 Online' : '⚫ Offline'}
            </span>
            <span class="stat-label">Status</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="profile-actions">
          <button class="btn btn-primary" id="settingsBtn">
            ⚙️ Settings
          </button>
          <button class="btn btn-secondary" id="logoutBtn">
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  `;
}

export function initProfile() {
  // Edit profile
  document.getElementById('editProfileBtn')?.addEventListener('click', () => {
    showEditProfileModal();
  });

  // Avatar upload
  document.getElementById('avatarUploadBtn')?.addEventListener('click', () => {
    document.getElementById('avatarInput').click();
  });

  document.getElementById('avatarInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await Auth.uploadAvatar(file);
      // Refresh profile
      const user = await Auth.getCurrentUser();
      updateProfileUI(user);
      Toast.success('Avatar updated!');
    } catch (error) {
      Toast.error('Failed to upload avatar');
    }
  });

  // Settings
  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    Router.navigate('settings');
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to logout?')) {
      await Auth.logout();
    }
  });
}

function showEditProfileModal() {
  const user = Auth.getCurrentUser() || {};
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content glass">
      <div class="modal-header">
        <h3>Edit Profile</h3>
        <button class="modal-close">&times;</button>
      </div>
      <form id="editProfileForm">
        <div class="form-group">
          <label>Display Name</label>
          <input type="text" id="editDisplayName" value="${user.display_name || ''}" maxlength="50" />
        </div>
        <div class="form-group">
          <label>Username</label>
          <input type="text" id="editUsername" value="${user.username || ''}" maxlength="30" />
          <span class="form-hint">Only letters, numbers, and underscores</span>
        </div>
        <div class="form-group">
          <label>Bio</label>
          <textarea id="editBio" maxlength="500">${user.bio || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Status</label>
          <input type="text" id="editStatus" value="${user.status || ''}" maxlength="100" placeholder="What's on your mind?" />
        </div>
        <button type="submit" class="btn btn-primary btn-full">Save Changes</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  modal.classList.add('show');

  // Close modal
  modal.querySelector('.modal-close').addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Form submission
  document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const displayName = document.getElementById('editDisplayName').value.trim();
    const username = document.getElementById('editUsername').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const status = document.getElementById('editStatus').value.trim();

    if (!displayName) {
      Toast.error('Display name is required');
      return;
    }

    if (!username) {
      Toast.error('Username is required');
      return;
    }

    if (!username.match(/^[a-zA-Z0-9_]+$/)) {
      Toast.error('Username can only contain letters, numbers, and underscores');
      return;
    }

    try {
      // Update profile
      await Auth.updateProfile({ displayName, bio, status });
      
      // Update username separately
      await API.put('/users/username', { username });
      
      Toast.success('Profile updated!');
      modal.remove();
      
      // Refresh page
      const user = await Auth.getCurrentUser();
      updateProfileUI(user);
      
    } catch (error) {
      Toast.error(error.message || 'Failed to update profile');
    }
  });
}

function updateProfileUI(user) {
  // Update avatar
  const avatar = document.querySelector('.profile-avatar');
  if (avatar) {
    if (user.avatar_url) {
      avatar.innerHTML = `<img src="${user.avatar_url}" alt="${user.display_name}" />`;
    } else {
      avatar.innerHTML = `<span>${(user.display_name || 'U')[0].toUpperCase()}</span>`;
    }
  }

  // Update name
  const nameEl = document.querySelector('.profile-name');
  if (nameEl) nameEl.textContent = user.display_name || 'User';

  // Update username
  const usernameEl = document.querySelector('.profile-username');
  if (usernameEl) usernameEl.textContent = `@${user.username || 'username'}`;

  // Update bio
  const bioEl = document.querySelector('.profile-bio');
  if (bioEl) {
    if (user.bio) {
      bioEl.textContent = user.bio;
      bioEl.style.display = '';
    } else {
      bioEl.style.display = 'none';
    }
  }

  // Update status
  const statusEl = document.querySelector('.profile-status');
  if (statusEl) {
    if (user.status) {
      statusEl.textContent = user.status;
      statusEl.style.display = '';
    } else {
      statusEl.style.display = 'none';
    }
  }

  // Update badges
  const badgesContainer = document.querySelector('.profile-badges');
  if (badgesContainer) {
    let badges = '';
    if (user.is_verified) badges += '<span class="badge badge-verified">✓ Verified</span>';
    if (user.is_premium) badges += '<span class="badge badge-premium">⭐ Premium</span>';
    badgesContainer.innerHTML = badges;
  }
}

// Styles
const profileStyles = `
.profile-page {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-xl);
}

.profile-header h2 {
  font-size: 24px;
  font-weight: 700;
}

.profile-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.profile-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.profile-avatar {
  width: 120px;
  height: 120px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #5865F2, #00D4FF);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 700;
  position: relative;
  overflow: hidden;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-upload-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--primary);
  color: #fff;
  border: 3px solid var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all var(--transition-fast);
}

.avatar-upload-btn:hover {
  transform: scale(1.1);
  background: var(--primary-dark);
}

.profile-badges {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
  justify-content: center;
}

.profile-info {
  text-align: center;
}

.profile-name {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: var(--space-xs);
}

.profile-username {
  color: var(--text-secondary);
  font-size: 16px;
  margin-bottom: var(--space-sm);
}

.profile-bio {
  color: var(--text-primary);
  font-size: 16px;
  margin-bottom: var(--space-sm);
}

.profile-status {
  color: var(--text-secondary);
  font-size: 14px;
  font-style: italic;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-lg);
  width: 100%;
  max-width: 500px;
  padding: var(--space-lg);
  background: var(--bg-glass);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-glass);
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-value.online {
  color: #22C55E;
}

.stat-value.offline {
  color: var(--text-muted);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.profile-actions {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-md);
}

@media (max-width: 480px) {
  .profile-stats {
    grid-template-columns: 1fr;
    gap: var(--space-md);
  }
  
  .profile-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .profile-actions .btn {
    width: 100%;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = profileStyles;
document.head.appendChild(styleTag);
