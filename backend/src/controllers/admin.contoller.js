/**
 * Admin Controller
 */
const { supabase } = require('../config/supabase');
const notificationService = require('../services/notification.service');

const adminController = {
  /**
   * Admin login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Check if user exists and is admin
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('role', 'admin')
        .single();

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValid = await comparePassword(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate admin token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: 'admin' },
        config.jwt.secret,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          display_name: user.display_name
        }
      });
    } catch (error) {
      console.error('Admin login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  },

  /**
   * Get admin dashboard data
   */
  async getDashboard(req, res) {
    try {
      // Total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('id', { count: 'exact' });

      // Active users (online in last 30 minutes)
      const activeThreshold = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { count: activeUsers } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .gt('last_seen', activeThreshold);

      // Total messages
      const { count: totalMessages } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('is_deleted', false);

      // Total groups
      const { count: totalGroups } = await supabase
        .from('chats')
        .select('id', { count: 'exact' })
        .eq('type', 'group');

      // Total channels
      const { count: totalChannels } = await supabase
        .from('chats')
        .select('id', { count: 'exact' })
        .eq('type', 'channel');

      // Premium users
      const { count: premiumUsers } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('is_premium', true);

      // Recent activity
      const { data: recentActivity } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          details,
          created_at,
          user:user_id(id, username, display_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Storage usage
      const { data: storageData } = await supabase
        .from('storage_usage')
        .select('*')
        .single();

      return res.status(200).json({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalMessages: totalMessages || 0,
        totalGroups: totalGroups || 0,
        totalChannels: totalChannels || 0,
        premiumUsers: premiumUsers || 0,
        storageUsed: storageData?.used || 0,
        storageTotal: storageData?.total || 0,
        recentActivity: recentActivity || [],
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      return res.status(500).json({ error: 'Failed to get dashboard data' });
    }
  },

  /**
   * Get users list
   */
  async getUsers(req, res) {
    try {
      const { limit = 50, offset = 0, search = '' } = req.query;

      let query = supabase
        .from('users')
        .select(`
          id,
          phone,
          email,
          username,
          display_name,
          avatar_url,
          is_verified,
          is_premium,
          premium_until,
          online_status,
          last_seen,
          created_at,
          profile:profiles(*)
        `);

      if (search) {
        query = query.or(`phone.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%,display_name.ilike.%${search}%`);
      }

      const { data: users, error, count } = await query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        users: users || [],
        total: count || 0,
        limit,
        offset
      });
    } catch (error) {
      console.error('Get users error:', error);
      return res.status(500).json({ error: 'Failed to get users' });
    }
  },

  /**
   * Ban user
   */
  async banUser(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const { data: user, error } = await supabase
        .from('users')
        .update({
          is_banned: true,
          banned_at: new Date().toISOString(),
          banned_reason: reason,
          online_status: false
        })
        .eq('id', id)
        .select()
        .single();

      if (error || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Log action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: req.user.id,
          action: 'ban_user',
          details: { userId: id, reason }
        });

      // Notify user
      await notificationService.createSystemNotification(
        id,
        'Account Banned',
        `Your account has been banned. Reason: ${reason || 'Violation of terms'}`,
        { type: 'ban', reason }
      );

      return res.status(200).json({ message: 'User banned successfully' });
    } catch (error) {
      console.error('Ban user error:', error);
      return res.status(500).json({ error: 'Failed to ban user' });
    }
  },

  /**
   * Unban user
   */
  async unbanUser(req, res) {
    try {
      const { id } = req.params;

      const { data: user, error } = await supabase
        .from('users')
        .update({
          is_banned: false,
          banned_at: null,
          banned_reason: null
        })
        .eq('id', id)
        .select()
        .single();

      if (error || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Log action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: req.user.id,
          action: 'unban_user',
          details: { userId: id }
        });

      // Notify user
      await notificationService.createSystemNotification(
        id,
        'Account Unbanned',
        'Your account has been unbanned.',
        { type: 'unban' }
      );

      return res.status(200).json({ message: 'User unbanned successfully' });
    } catch (error) {
      console.error('Unban user error:', error);
      return res.status(500).json({ error: 'Failed to unban user' });
    }
  },

  /**
   * Grant premium
   */
  async grantPremium(req, res) {
    try {
      const { id } = req.params;
      const { duration = 30 } = req.body; // Days

      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + duration);

      const { data: user, error } = await supabase
        .from('users')
        .update({
          is_premium: true,
          premium_until: premiumUntil.toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Log action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: req.user.id,
          action: 'grant_premium',
          details: { userId: id, duration }
        });

      // Notify user
      await notificationService.createSystemNotification(
        id,
        'Premium Activated',
        `Congratulations! Your premium subscription has been activated for ${duration} days.`,
        { type: 'premium' }
      );

      return res.status(200).json({ 
        message: 'Premium granted successfully',
        premium_until: premiumUntil.toISOString()
      });
    } catch (error) {
      console.error('Grant premium error:', error);
      return res.status(500).json({ error: 'Failed to grant premium' });
    }
  },

  /**
   * Revoke premium
   */
  async revokePremium(req, res) {
    try {
      const { id } = req.params;

      const { data: user, error } = await supabase
        .from('users')
        .update({
          is_premium: false,
          premium_until: null
        })
        .eq('id', id)
        .select()
        .single();

      if (error || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Log action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: req.user.id,
          action: 'revoke_premium',
          details: { userId: id }
        });

      return res.status(200).json({ message: 'Premium revoked successfully' });
    } catch (error) {
      console.error('Revoke premium error:', error);
      return res.status(500).json({ error: 'Failed to revoke premium' });
    }
  },

  /**
   * Get reports
   */
  async getReports(req, res) {
    try {
      const { status = 'all', limit = 50, offset = 0 } = req.query;

      let query = supabase
        .from('reports')
        .select(`
          *,
          reporter:reporter_id(id, username, display_name),
          reported_user:reported_user_id(id, username, display_name)
        `);

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data: reports, error, count } = await query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        reports: reports || [],
        total: count || 0,
        limit,
        offset
      });
    } catch (error) {
      console.error('Get reports error:', error);
      return res.status(500).json({ error: 'Failed to get reports' });
    }
  },

  /**
   * Resolve report
   */
  async resolveReport(req, res) {
    try {
      const { id } = req.params;
      const { status, resolution } = req.body;

      const { data: report, error } = await supabase
        .from('reports')
        .update({
          status,
          resolution,
          resolved_at: new Date().toISOString(),
          resolved_by: req.user.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error || !report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Log action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: req.user.id,
          action: 'resolve_report',
          details: { reportId: id, status, resolution }
        });

      return res.status(200).json({ 
        message: 'Report resolved successfully',
        report
      });
    } catch (error) {
      console.error('Resolve report error:', error);
      return res.status(500).json({ error: 'Failed to resolve report' });
    }
  },

  /**
   * Get analytics
   */
  async getAnalytics(req, res) {
    try {
      const { period = 'week' } = req.query;

      let startDate;
      switch (period) {
        case 'day':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }

      // User growth
      const { data: userGrowth } = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      // Message activity
      const { data: messageActivity } = await supabase
        .from('messages')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      // Group creation
      const { data: groupCreation } = await supabase
        .from('chats')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .eq('type', 'group')
        .order('created_at', { ascending: true });

      // Channel creation
      const { data: channelCreation } = await supabase
        .from('chats')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .eq('type', 'channel')
        .order('created_at', { ascending: true });

      // Aggregate data by day
      const formatDate = (date) => {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      };

      const aggregateData = (items, key = 'created_at') => {
        const result = {};
        items?.forEach(item => {
          const date = formatDate(item[key]);
          result[date] = (result[date] || 0) + 1;
        });
        return Object.entries(result).map(([date, count]) => ({ date, count }));
      };

      // Calculate total premium revenue
      const { data: premiumData } = await supabase
        .from('premium_subscriptions')
        .select('*')
        .eq('status', 'active');

      const totalRevenue = premiumData?.reduce((sum, sub) => {
        const price = sub.plan === 'monthly' ? 9.99 : sub.plan === 'yearly' ? 99.99 : 299.99;
        return sum + price;
      }, 0) || 0;

      return res.status(200).json({
        period,
        startDate: startDate.toISOString(),
        userGrowth: aggregateData(userGrowth),
        messageActivity: aggregateData(messageActivity),
        groupCreation: aggregateData(groupCreation),
        channelCreation: aggregateData(channelCreation),
        totalRevenue: totalRevenue,
        premiumUsers: premiumData?.length || 0
      });
    } catch (error) {
      console.error('Get analytics error:', error);
      return res.status(500).json({ error: 'Failed to get analytics' });
    }
  },

  /**
   * Send broadcast notification
   */
  async sendBroadcast(req, res) {
    try {
      const { title, message, audience = 'all' } = req.body;

      let usersQuery = supabase.from('users').select('id');
      
      if (audience === 'premium') {
        usersQuery = usersQuery.eq('is_premium', true);
      } else if (audience === 'verified') {
        usersQuery = usersQuery.eq('is_verified', true);
      }

      const { data: users } = await usersQuery;

      if (!users || users.length === 0) {
        return res.status(400).json({ error: 'No users in selected audience' });
      }

      // Create notifications for all users
      const notifications = users.map(user => ({
        user_id: user.id,
        type: 'system',
        title,
        body: message,
        data: { broadcast: true },
        created_at: new Date().toISOString()
      }));

      // Batch insert
      const batchSize = 100;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        await supabase.from('notifications').insert(batch);
      }

      // Log action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: req.user.id,
          action: 'send_broadcast',
          details: { title, message, audience, recipientCount: users.length }
        });

      // Emit real-time notifications
      const io = req.app.get('io');
      if (io) {
        users.forEach(user => {
          io.to(`user:${user.id}`).emit('new_notification', {
            type: 'system',
            title,
            body: message
          });
        });
      }

      return res.status(200).json({
        message: 'Broadcast sent successfully',
        recipientCount: users.length
      });
    } catch (error) {
      console.error('Send broadcast error:', error);
      return res.status(500).json({ error: 'Failed to send broadcast' });
    }
  },

  /**
   * Get system settings
   */
  async getSettings(req, res) {
    try {
      const { data: settings } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      return res.status(200).json({
        settings: settings || {
          maintenanceMode: false,
          require2FA: false,
          maxLoginAttempts: 5,
          maxFileSize: 100,
          allowedFileTypes: 'jpg,png,pdf,docx,zip',
          siteName: 'NEXORA CHQT',
          supportEmail: 'support@nexorachqt.com'
        }
      });
    } catch (error) {
      console.error('Get settings error:', error);
      return res.status(500).json({ error: 'Failed to get settings' });
    }
  },

  /**
   * Update system settings
   */
  async updateSettings(req, res) {
    try {
      const updates = req.body;

      const { data: settings, error } = await supabase
        .from('system_settings')
        .upsert({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Log action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: req.user.id,
          action: 'update_settings',
          details: updates
        });

      return res.status(200).json({
        message: 'Settings updated successfully',
        settings
      });
    } catch (error) {
      console.error('Update settings error:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  },

  /**
   * Get storage usage
   */
  async getStorageUsage(req, res) {
    try {
      // Get storage bucket sizes
      const { data: buckets } = await supabase
        .storage
        .listBuckets();

      const usage = {};
      let totalUsed = 0;

      for (const bucket of buckets) {
        const { data: files } = await supabase
          .storage
          .from(bucket.name)
          .list();

        const size = files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0;
        usage[bucket.name] = size;
        totalUsed += size;
      }

      return res.status(200).json({
        buckets: usage,
        totalUsed,
        totalAvailable: 50 * 1024 * 1024 * 1024 // 50GB
      });
    } catch (error) {
      console.error('Get storage usage error:', error);
      return res.status(500).json({ error: 'Failed to get storage usage' });
    }
  },

  /**
   * Clean unused media
   */
  async cleanUnusedMedia(req, res) {
    try {
      // Get all media messages
      const { data: mediaMessages } = await supabase
        .from('messages')
        .select('id, media_url')
        .not('media_url', 'is', null);

      // Get media in use
      const usedMedia = mediaMessages?.map(m => m.media_url) || [];

      // Get all files in storage
      const { data: files } = await supabase
        .storage
        .from('media')
        .list();

      // Find unused files
      const unusedFiles = files?.filter(file => 
        !usedMedia.some(url => url.includes(file.name))
      ) || [];

      // Delete unused files
      for (const file of unusedFiles) {
        await supabase
          .storage
          .from('media')
          .remove([file.name]);
      }

      // Log action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: req.user.id,
          action: 'clean_unused_media',
          details: { filesRemoved: unusedFiles.length }
        });

      return res.status(200).json({
        message: 'Unused media cleaned',
        filesRemoved: unusedFiles.length
      });
    } catch (error) {
      console.error('Clean unused media error:', error);
      return res.status(500).json({ error: 'Failed to clean unused media' });
    }
  }
};

module.exports = adminController;
