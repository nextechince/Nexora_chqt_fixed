/**
 * Premium Page
 * Subscription plans and premium features
 */
import API from '../utils/api.js';
import { Toast } from '../utils/toast.js';
import { Router } from '../router.js';
import { Auth } from '../utils/auth.js';
import { Store } from '../store.js';

export function PremiumPage() {
  const user = Auth.getCurrentUser() || {};
  const isPremium = user.is_premium || false;
  
  return `
    <div class="premium-page">
      <div class="premium-header">
        <button class="btn btn-icon" onclick="window.history.back()">
          ←
        </button>
        <h2>⭐ Premium</h2>
      </div>

      <div class="premium-status ${isPremium ? 'active' : 'inactive'}">
        ${isPremium ? `
          <div class="premium-badge">⭐ Premium Member</div>
          <p>Your premium subscription is active until ${user.premium_until ? new Date(user.premium_until).toLocaleDateString() : 'Never'}</p>
          <button class="btn btn-secondary" onclick="cancelPremium()">Cancel Subscription</button>
        ` : `
          <div class="premium-badge">🔓 Free Account</div>
          <p>Upgrade to premium for exclusive features</p>
        `}
      </div>

      <div class="premium-features">
        <h3>Premium Features</h3>
        <div class="features-grid">
          ${premiumFeatures.map(feature => `
            <div class="feature-card glass">
              <div class="feature-icon">${feature.icon}</div>
              <h4>${feature.title}</h4>
              <p>${feature.description}</p>
              ${isPremium ? '<span class="feature-badge">✓ Included</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>

      ${!isPremium ? `
        <div class="premium-plans">
          <h3>Choose Your Plan</h3>
          <div class="plans-grid">
            ${plans.map(plan => `
              <div class="plan-card glass ${plan.popular ? 'popular' : ''}">
                ${plan.popular ? '<span class="plan-badge">Most Popular</span>' : ''}
                <h4>${plan.name}</h4>
                <div class="plan-price">${plan.price}</div>
                <div class="plan-period">${plan.period}</div>
                <ul class="plan-features">
                  ${plan.features.map(f => `<li>${f}</li>`).join('')}
                </ul>
                <button class="btn btn-primary btn-full" onclick="subscribePlan('${plan.id}')">
                  ${plan.buttonText || 'Subscribe'}
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

export function initPremium() {
  // Check premium status
  const user = Auth.getCurrentUser();
  if (user?.is_premium) {
    // Update premium status periodically
    setInterval(() => {
      Auth.getCurrentUser().then(updatedUser => {
        if (!updatedUser.is_premium) {
          Toast.warning('Your premium subscription has expired');
          location.reload();
        }
      });
    }, 60000); // Check every minute
  }
}

const premiumFeatures = [
  {
    icon: '🤖',
    title: 'AI Reply Suggestions',
    description: 'Get smart reply suggestions powered by AI'
  },
  {
    icon: '🛡️',
    title: 'AI Chat Moderator',
    description: 'Automatic moderation for your groups and channels'
  },
  {
    icon: '🎨',
    title: 'Advanced Themes',
    description: 'Access to exclusive animated themes'
  },
  {
    icon: '💾',
    title: 'More Storage',
    description: '10x more storage for media and files'
  },
  {
    icon: '⏰',
    title: 'Advanced Message Scheduler',
    description: 'Schedule messages with advanced options'
  },
  {
    icon: '🎭',
    title: 'Exclusive Stickers',
    description: 'Access to premium sticker packs'
  },
  {
    icon: '🎨',
    title: 'Custom Chat Backgrounds',
    description: 'Set custom backgrounds for your chats'
  },
  {
    icon: '😊',
    title: 'Custom Emoji',
    description: 'Upload and use custom emoji'
  },
  {
    icon: '🚀',
    title: 'Priority Support',
    description: 'Get priority support from our team'
  },
  {
    icon: '📤',
    title: 'Larger File Uploads',
    description: 'Upload files up to 2GB'
  },
  {
    icon: '🎤',
    title: 'Voice to Text',
    description: 'Transcribe voice messages to text'
  },
  {
    icon: '🔊',
    title: 'Text to Voice',
    description: 'Convert text messages to voice'
  }
];

const plans = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$9.99',
    period: 'per month',
    features: [
      'All premium features',
      'Month-to-month subscription',
      'Cancel anytime'
    ],
    buttonText: 'Subscribe Monthly'
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$99.99',
    period: 'per year',
    popular: true,
    features: [
      'All premium features',
      '2 months free',
      'Best value',
      'Cancel anytime'
    ],
    buttonText: 'Subscribe Yearly'
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: '$299.99',
    period: 'one-time payment',
    features: [
      'All premium features',
      'Lifetime access',
      'No recurring payments',
      'Priority support'
    ],
    buttonText: 'Get Lifetime'
  }
];

window.subscribePlan = function(planId) {
  Toast.info(`Redirecting to payment for ${planId} plan...`);
  // In production, redirect to Stripe checkout
  // This is a placeholder
  setTimeout(() => {
    Toast.success('Premium subscription activated! (Demo)');
    // Update user in store
    const user = Auth.getCurrentUser();
    if (user) {
      user.is_premium = true;
      user.premium_until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem('user', JSON.stringify(user));
      Store.set('user', user);
      location.reload();
    }
  }, 1500);
};

window.cancelPremium = function() {
  if (!confirm('Are you sure you want to cancel your premium subscription?')) return;
  
  Toast.info('Processing cancellation...');
  // In production, call API to cancel subscription
  setTimeout(() => {
    Toast.success('Subscription cancelled (Demo)');
  }, 1500);
};

// Styles
const premiumStyles = `
.premium-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.premium-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.premium-header h2 {
  font-size: 28px;
  font-weight: 700;
}

.premium-status {
  text-align: center;
  padding: var(--space-xl);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-xl);
}

.premium-status.active {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(251, 191, 36, 0.1));
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.premium-status.inactive {
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
}

.premium-badge {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: var(--space-sm);
}

.premium-status p {
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
}

.premium-features {
  margin-bottom: var(--space-2xl);
}

.premium-features h3,
.premium-plans h3 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: var(--space-lg);
  text-align: center;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-md);
}

.feature-card {
  padding: var(--space-lg);
  text-align: center;
  transition: all var(--transition-base);
  border: 1px solid var(--border-glass);
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: var(--border-glass-hover);
}

.feature-icon {
  font-size: 40px;
  margin-bottom: var(--space-sm);
}

.feature-card h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: var(--space-xs);
}

.feature-card p {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.feature-badge {
  display: inline-block;
  margin-top: var(--space-sm);
  padding: 2px 12px;
  background: rgba(34, 197, 94, 0.2);
  color: #22C55E;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-lg);
  max-width: 900px;
  margin: 0 auto;
}

.plan-card {
  padding: var(--space-xl);
  text-align: center;
  border: 1px solid var(--border-glass);
  position: relative;
  transition: all var(--transition-base);
}

.plan-card:hover {
  transform: translateY(-4px);
  border-color: var(--border-glass-hover);
}

.plan-card.popular {
  border-color: var(--primary);
  transform: scale(1.05);
}

.plan-card.popular:hover {
  transform: scale(1.05) translateY(-4px);
}

.plan-badge {
  position: absolute;
  top: -10px;
  right: 20px;
  background: var(--primary);
  color: #fff;
  padding: 2px 16px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
}

.plan-card h4 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: var(--space-sm);
}

.plan-price {
  font-size: 36px;
  font-weight: 800;
  margin-bottom: var(--space-xs);
}

.plan-period {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: var(--space-lg);
}

.plan-features {
  list-style: none;
  padding: 0;
  margin-bottom: var(--space-lg);
}

.plan-features li {
  padding: var(--space-xs) 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.plan-features li::before {
  content: '✓ ';
  color: var(--primary);
  font-weight: 700;
}

@media (max-width: 768px) {
  .plans-grid {
    grid-template-columns: 1fr;
    max-width: 400px;
  }
  
  .plan-card.popular {
    transform: none;
  }
  
  .plan-card.popular:hover {
    transform: none;
  }
  
  .features-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

@media (max-width: 480px) {
  .premium-page {
    padding: var(--space-md);
  }
  
  .features-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .feature-card {
    padding: var(--space-md);
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = premiumStyles;
document.head.appendChild(styleTag);
