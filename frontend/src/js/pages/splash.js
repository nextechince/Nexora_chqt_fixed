/**
 * Splash Screen
 * Premium loading screen with bounce animation
 */
import { Store } from '../store.js';
import { Auth } from '../utils/auth.js';
import { Router } from '../router.js';

export function SplashPage() {
  return `
    <div class="splash-container">
      <div class="splash-content">
        <div class="splash-logo-container">
          <svg class="splash-logo" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" stroke="url(#logoGradient)" stroke-width="4"/>
            <path d="M35 50 L45 60 L65 40" stroke="url(#logoGradient)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
            <defs>
              <linearGradient id="logoGradient" x1="0" y1="0" x2="100" y2="100">
                <stop offset="0%" stop-color="#5865F2"/>
                <stop offset="100%" stop-color="#00D4FF"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        <h1 class="splash-title animate-bounce-premium">
          NEXORA CHQT
        </h1>
        
        <p class="splash-subtitle">Real-Time Messaging Platform</p>
        
        <div class="splash-progress">
          <div class="splash-progress-bar" id="splashProgress"></div>
        </div>
        
        <p class="splash-status" id="splashStatus">Initializing...</p>
      </div>
    </div>
  `;
}

export function initSplash() {
  const container = document.getElementById('app');
  container.innerHTML = SplashPage();

  const progressBar = document.getElementById('splashProgress');
  const statusText = document.getElementById('splashStatus');

  const steps = [
    { progress: 20, status: 'Loading modules...' },
    { progress: 40, status: 'Connecting to server...' },
    { progress: 60, status: 'Authenticating...' },
    { progress: 80, status: 'Loading user data...' },
    { progress: 100, status: 'Ready!' },
  ];

  let currentStep = 0;

  function updateSplash() {
    if (currentStep >= steps.length) return;

    const step = steps[currentStep];
    progressBar.style.width = `${step.progress}%`;
    statusText.textContent = step.status;

    currentStep++;

    if (currentStep < steps.length) {
      // Random delay between 300-800ms
      const delay = 300 + Math.random() * 500;
      setTimeout(updateSplash, delay);
    } else {
      // Complete
      setTimeout(() => {
        handleSplashComplete();
      }, 500);
    }
  }

  async function handleSplashComplete() {
    // Check authentication
    const isAuth = Auth.isAuthenticated();

    if (isAuth) {
      try {
        await Auth.getCurrentUser();
        Router.navigate('dashboard');
      } catch {
        Router.navigate('landing');
      }
    } else {
      Router.navigate('landing');
    }
  }

  // Start splash animation
  setTimeout(updateSplash, 500);
}

// Styles for splash
const splashStyles = `
.splash-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  position: relative;
  overflow: hidden;
}

.splash-container::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, rgba(88, 101, 242, 0.1) 0%, transparent 70%);
  animation: pulse-neon 2s ease-in-out infinite;
}

.splash-content {
  text-align: center;
  z-index: 1;
  padding: var(--space-2xl);
}

.splash-logo-container {
  margin-bottom: var(--space-xl);
  display: inline-block;
  animation: pulse-neon 2s ease-in-out infinite;
}

.splash-logo {
  width: 120px;
  height: 120px;
  filter: drop-shadow(0 0 30px rgba(88, 101, 242, 0.3));
}

.splash-title {
  font-size: 48px;
  font-weight: 800;
  background: linear-gradient(135deg, #5865F2, #00D4FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--space-sm);
  letter-spacing: -1px;
}

.splash-subtitle {
  color: var(--text-secondary);
  font-size: 16px;
  margin-bottom: var(--space-xl);
  letter-spacing: 2px;
  text-transform: uppercase;
}

.splash-progress {
  width: 280px;
  height: 4px;
  background: var(--bg-glass);
  border-radius: var(--radius-full);
  margin: 0 auto var(--space-md);
  overflow: hidden;
  position: relative;
}

.splash-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #5865F2, #00D4FF);
  border-radius: var(--radius-full);
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  width: 0%;
  position: relative;
}

.splash-progress-bar::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  width: 20px;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3));
  filter: blur(4px);
}

.splash-status {
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 1px;
}

@media (max-width: 480px) {
  .splash-title {
    font-size: 32px;
  }
  
  .splash-logo {
    width: 80px;
    height: 80px;
  }
  
  .splash-progress {
    width: 200px;
  }
}
`;

// Add styles to document
const styleTag = document.createElement('style');
styleTag.textContent = splashStyles;
document.head.appendChild(styleTag);
