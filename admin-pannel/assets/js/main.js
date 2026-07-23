/**
 * Admin Panel Main
 */
import API from './api.js';
import { Toast } from '../../../frontend/src/js/utils/toast.js';

// State
let currentSection = 'dashboard';
let adminToken = null;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const adminContent = document.getElementById('adminContent');
const navLinks = document.querySelectorAll('.nav-link');

// Login
document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        const response = await API.post('/admin/login', { email, password });
        adminToken = response.token;
        localStorage.setItem('adminToken', adminToken);
        API.setToken(adminToken);
        
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'block';
        
        loadSection('dashboard');
        Toast.success('Welcome to Admin Panel');
    } catch (error) {
        Toast.error('Invalid credentials');
    }
});

// Navigation
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        loadSection(link.dataset.section);
    });
});

// Logout
document.getElementById('adminLogout').addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    adminToken = null;
    API.setToken(null);
    dashboardScreen.style.display = 'none';
    loginScreen.style.display = 'flex';
    Toast.info('Logged out');
});

// Load section
async function loadSection(section) {
    currentSection = section;
    adminContent.innerHTML = `<div class="loading-spinner"></div>`;
    
    try {
        switch(section) {
            case 'dashboard':
                await loadDashboard();
                break;
            case 'users':
                await loadUsers();
                break;
            case 'groups':
                await loadGroups();
                break;
            case 'channels':
                await loadChannels();
                break;
            case 'reports':
                await loadReports();
                break;
            case 'analytics':
                await loadAnalytics();
                break;
            case 'settings':
                await loadSettings();
                break;
        }
    } catch (error) {
        adminContent.innerHTML = `
            <div class="error-container">
                <p>Failed to load ${section}</p>
                <button class="btn btn-primary" onclick="loadSection('${section}')">Retry</button>
            </div>
        `;
    }
}

// Load Dashboard
async function loadDashboard() {
    const stats = await API.get('/admin/dashboard');
    
    adminContent.innerHTML = `
        <h2>Dashboard</h2>
        <div class="admin-stats">
            <div class="stat-card">
                <div class="stat-value">${stats.totalUsers || 0}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.activeUsers || 0}</div>
                <div class="stat-label">Active Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalMessages || 0}</div>
                <div class="stat-label">Messages</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalGroups || 0}</div>
                <div class="stat-label">Groups</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalChannels || 0}</div>
                <div class="stat-label">Channels</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.premiumUsers || 0}</div>
                <div class="stat-label">Premium Users</div>
            </div>
        </div>
        <div class="recent-activity">
            <h3>Recent Activity</h3>
            <div class="activity-list">
                ${stats.recentActivity ? stats.recentActivity.map(activity => `
                    <div class="activity-item">
                        <span class="activity-time">${new Date(activity.created_at).toLocaleString()}</span>
                        <span class="activity-action">${activity.action}</span>
                        <span class="activity-user">${activity.user_name || 'System'}</span>
                    </div>
                `).join('') : '<p>No recent activity</p>'}
            </div>
        </div>
    `;
}

// Load Users
async function loadUsers() {
    const users = await API.get('/admin/users');
    
    adminContent.innerHTML = `
        <div class="section-header">
            <h2>User Management</h2>
            <div class="search-bar">
                <input type="text" id="userSearch" placeholder="Search users..." oninput="searchUsers(this.value)">
            </div>
        </div>
        <div class="table-responsive">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Username</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Premium</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>
                                <div class="user-cell">
                                    ${user.avatar_url ? `<img src="${user.avatar_url}" class="user-avatar" />` : 
                                    `<div class="user-avatar-placeholder">${(user.display_name || 'U')[0]}</div>`}
                                    ${user.display_name}
                                </div>
                            </td>
                            <td>${user.username}</td>
                            <td>${user.phone}</td>
                            <td><span class="status-badge ${user.online_status ? 'active' : 'inactive'}">
                                ${user.online_status ? 'Online' : 'Offline'}
                            </span></td>
                            <td>${user.is_premium ? '✅ Premium' : '❌ Free'}</td>
                            <td>
                                <div class="admin-actions">
                                    <button class="btn btn-sm btn-secondary" onclick="viewUser('${user.id}')">View</button>
                                    <button class="btn btn-sm ${user.is_premium ? 'btn-secondary' : 'btn-primary'}" 
                                            onclick="togglePremium('${user.id}')">
                                        ${user.is_premium ? 'Revoke' : 'Grant'} Premium
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="banUser('${user.id}')">Ban</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Load Groups
async function loadGroups() {
    const groups = await API.get('/admin/groups');
    
    adminContent.innerHTML = `
        <h2>Group Management</h2>
        <div class="table-responsive">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Group</th>
                        <th>Members</th>
                        <th>Owner</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${groups.map(group => `
                        <tr>
                            <td>
                                <div class="group-cell">
                                    ${group.avatar_url ? `<img src="${group.avatar_url}" class="group-avatar" />` :
                                    `<div class="group-avatar-placeholder">${(group.name || 'G')[0]}</div>`}
                                    ${group.name}
                                </div>
                            </td>
                            <td>${group.member_count || 0}</td>
                            <td>${group.owner_name || 'Unknown'}</td>
                            <td>${new Date(group.created_at).toLocaleDateString()}</td>
                            <td>
                                <div class="admin-actions">
                                    <button class="btn btn-sm btn-secondary" onclick="viewGroup('${group.id}')">View</button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteGroup('${group.id}')">Delete</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Load Channels
async function loadChannels() {
    const channels = await API.get('/admin/channels');
    
    adminContent.innerHTML = `
        <h2>Channel Management</h2>
        <div class="table-responsive">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Channel</th>
                        <th>Subscribers</th>
                        <th>Owner</th>
                        <th>Verified</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${channels.map(channel => `
                        <tr>
                            <td>
                                <div class="channel-cell">
                                    ${channel.avatar_url ? `<img src="${channel.avatar_url}" class="channel-avatar" />` :
                                    `<div class="channel-avatar-placeholder">${(channel.name || 'C')[0]}</div>`}
                                    ${channel.name}
                                </div>
                            </td>
                            <td>${channel.subscriber_count || 0}</td>
                            <td>${channel.owner_name || 'Unknown'}</td>
                            <td>${channel.is_verified ? '✅ Verified' : '❌'}</td>
                            <td>
                                <div class="admin-actions">
                                    <button class="btn btn-sm btn-secondary" onclick="viewChannel('${channel.id}')">View</button>
                                    <button class="btn btn-sm btn-primary" onclick="verifyChannel('${channel.id}')">Verify</button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteChannel('${channel.id}')">Delete</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Load Reports
async function loadReports() {
    const reports = await API.get('/admin/reports');
    
    adminContent.innerHTML = `
        <h2>Reports</h2>
        <div class="report-filters">
            <select onchange="filterReports(this.value)">
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="actioned">Actioned</option>
                <option value="dismissed">Dismissed</option>
            </select>
        </div>
        <div class="table-responsive">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Reported By</th>
                        <th>Reported User</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${reports.map(report => `
                        <tr>
                            <td>${report.reporter_name || 'Unknown'}</td>
                            <td>${report.reported_user_name || 'Unknown'}</td>
                            <td>${report.reason}</td>
                            <td><span class="status-badge ${report.status}">${report.status}</span></td>
                            <td>${new Date(report.created_at).toLocaleDateString()}</td>
                            <td>
                                <div class="admin-actions">
                                    <button class="btn btn-sm btn-primary" onclick="resolveReport('${report.id}', 'actioned')">Action</button>
                                    <button class="btn btn-sm btn-secondary" onclick="resolveReport('${report.id}', 'dismissed')">Dismiss</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Load Analytics
async function loadAnalytics() {
    const analytics = await API.get('/admin/analytics');
    
    adminContent.innerHTML = `
        <h2>Analytics</h2>
        <div class="analytics-grid">
            <div class="chart-card">
                <h3>User Growth</h3>
                <div class="chart-container" id="userGrowthChart">
                    <!-- Chart will be rendered here -->
                </div>
            </div>
            <div class="chart-card">
                <h3>Message Activity</h3>
                <div class="chart-container" id="messageActivityChart">
                    <!-- Chart will be rendered here -->
                </div>
            </div>
            <div class="chart-card">
                <h3>Premium Revenue</h3>
                <div class="chart-container" id="revenueChart">
                    <!-- Chart will be rendered here -->
                </div>
            </div>
            <div class="chart-card">
                <h3>Feature Usage</h3>
                <div class="chart-container" id="featureUsageChart">
                    <!-- Chart will be rendered here -->
                </div>
            </div>
        </div>
        <div class="export-section">
            <button class="btn btn-primary" onclick="exportAnalytics()">📥 Export Report</button>
        </div>
    `;
    
    // Render charts with Chart.js
    renderCharts(analytics);
}

// Load Settings
async function loadSettings() {
    const settings = await API.get('/admin/settings');
    
    adminContent.innerHTML = `
        <h2>Admin Settings</h2>
        <form id="adminSettingsForm">
            <div class="settings-grid">
                <div class="settings-section">
                    <h3>General Settings</h3>
                    <div class="form-group">
                        <label>Site Name</label>
                        <input type="text" name="siteName" value="${settings.siteName || 'NEXORA CHQT'}" />
                    </div>
                    <div class="form-group">
                        <label>Maintenance Mode</label>
                        <input type="checkbox" name="maintenanceMode" ${settings.maintenanceMode ? 'checked' : ''} />
                    </div>
                </div>
                <div class="settings-section">
                    <h3>Security Settings</h3>
                    <div class="form-group">
                        <label>Require 2FA</label>
                        <input type="checkbox" name="require2FA" ${settings.require2FA ? 'checked' : ''} />
                    </div>
                    <div class="form-group">
                        <label>Max Login Attempts</label>
                        <input type="number" name="maxLoginAttempts" value="${settings.maxLoginAttempts || 5}" />
                    </div>
                </div>
                <div class="settings-section">
                    <h3>Storage Settings</h3>
                    <div class="form-group">
                        <label>Max File Size (MB)</label>
                        <input type="number" name="maxFileSize" value="${settings.maxFileSize || 100}" />
                    </div>
                    <div class="form-group">
                        <label>Allowed File Types</label>
                        <input type="text" name="allowedFileTypes" value="${settings.allowedFileTypes || 'jpg,png,pdf,docx,zip'}" />
                    </div>
                </div>
            </div>
            <button type="submit" class="btn btn-primary">Save Settings</button>
        </form>
    `;
    
    document.getElementById('adminSettingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        // Convert checkbox values
        data.maintenanceMode = !!data.maintenanceMode;
        data.require2FA = !!data.require2FA;
        
        await API.put('/admin/settings', data);
        Toast.success('Settings saved');
    });
}

// Helper functions for admin actions
window.viewUser = (userId) => {
    Toast.info(`Viewing user ${userId}`);
};

window.togglePremium = async (userId) => {
    try {
        await API.post(`/admin/users/${userId}/premium/toggle`);
        Toast.success('Premium status toggled');
        loadSection('users');
    } catch (error) {
        Toast.error('Failed to toggle premium');
    }
};

window.banUser = async (userId) => {
    if (confirm('Are you sure you want to ban this user?')) {
        try {
            await API.post(`/admin/users/${userId}/ban`);
            Toast.success('User banned');
            loadSection('users');
        } catch (error) {
            Toast.error('Failed to ban user');
        }
    }
};

window.viewGroup = (groupId) => {
    Toast.info(`Viewing group ${groupId}`);
};

window.deleteGroup = async (groupId) => {
    if (confirm('Are you sure you want to delete this group?')) {
        try {
            await API.delete(`/admin/groups/${groupId}`);
            Toast.success('Group deleted');
            loadSection('groups');
        } catch (error) {
            Toast.error('Failed to delete group');
        }
    }
};

window.viewChannel = (channelId) => {
    Toast.info(`Viewing channel ${channelId}`);
};

window.verifyChannel = async (channelId) => {
    try {
        await API.post(`/admin/channels/${channelId}/verify`);
        Toast.success('Channel verified');
        loadSection('channels');
    } catch (error) {
        Toast.error('Failed to verify channel');
    }
};

window.deleteChannel = async (channelId) => {
    if (confirm('Are you sure you want to delete this channel?')) {
        try {
            await API.delete(`/admin/channels/${channelId}`);
            Toast.success('Channel deleted');
            loadSection('channels');
        } catch (error) {
            Toast.error('Failed to delete channel');
        }
    }
};

window.resolveReport = async (reportId, status) => {
    try {
        await API.put(`/admin/reports/${reportId}`, { status });
        Toast.success('Report resolved');
        loadSection('reports');
    } catch (error) {
        Toast.error('Failed to resolve report');
    }
};

window.filterReports = (status) => {
    // Filter reports by status
    const rows = document.querySelectorAll('.admin-table tbody tr');
    rows.forEach(row => {
        const statusCell = row.querySelector('.status-badge');
        if (status === 'all' || (statusCell && statusCell.textContent === status)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
};

window.searchUsers = (query) => {
    const rows = document.querySelectorAll('.admin-table tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
};

window.exportAnalytics = () => {
    Toast.success('Report export started');
};

// Initialize
(async function init() {
    const token = localStorage.getItem('adminToken');
    if (token) {
        try {
            adminToken = token;
            API.setToken(token);
            await API.get('/admin/verify');
            loginScreen.style.display = 'none';
            dashboardScreen.style.display = 'block';
            loadSection('dashboard');
        } catch {
            localStorage.removeItem('adminToken');
        }
    }
})();

// Render charts (simplified with Chart.js CDN)
async function renderCharts(analytics) {
    try {
        // Load Chart.js from CDN
        await loadChartJS();
        
        const charts = window.Chart;
        
        // User Growth Chart
        const ctx1 = document.getElementById('userGrowthChart');
        if (ctx1) {
            new charts(ctx1, {
                type: 'line',
                data: {
                    labels: analytics.userGrowth?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Users',
                        data: analytics.userGrowth?.data || [0, 0, 0, 0, 0, 0],
                        borderColor: '#5865F2',
                        backgroundColor: 'rgba(88, 101, 242, 0.1)',
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
        
        // Message Activity Chart
        const ctx2 = document.getElementById('messageActivityChart');
        if (ctx2) {
            new charts(ctx2, {
                type: 'bar',
                data: {
                    labels: analytics.messageActivity?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Messages',
                        data: analytics.messageActivity?.data || [0, 0, 0, 0, 0, 0, 0],
                        backgroundColor: '#00D4FF'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Failed to load charts:', error);
    }
}

function loadChartJS() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
                                   }
