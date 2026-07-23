/**
 * Login Page
 */
import { Auth } from '../../utils/auth.js';
import { Toast } from '../../utils/toast.js';
import { Router } from '../../router.js';

export function LoginPage() {
  return `
    <div class="auth-page login-page">
      <div class="auth-background">
        <div class="flora-decoration"></div>
        <div class="flora-particle particle-1"></div>
        <div class="flora-particle particle-2"></div>
        <div class="flora-particle particle-3"></div>
      </div>
      
      <div class="auth-container glass">
        <div class="auth-header">
          <div class="auth-logo">
            <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="45" stroke="#5865F2" stroke-width="4"/>
              <path d="M35 50 L45 60 L65 40" stroke="#5865F2" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>NEXORA CHQT</span>
          </div>
          <h2>Welcome Back</h2>
          <p>Sign in to continue messaging</p>
        </div>

        <form id="loginForm" class="auth-form">
          <div class="form-group">
            <label for="identifier">Phone or Email</label>
            <input 
              type="text" 
              id="identifier" 
              placeholder="Phone number or email" 
              required
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <div class="password-input">
              <input 
                type="password" 
                id="password" 
                placeholder="Enter your password" 
                required
              />
              <button type="button" class="password-toggle" aria-label="Toggle password visibility">
                👁️
              </button>
            </div>
          </div>

          <div class="form-options">
            <label class="checkbox-label">
              <input type="checkbox" id="rememberMe" />
              <span>Remember me</span>
            </label>
            <button 
              type="button" 
              class="text-link"
              onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'forgot-password'}}))"
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" class="btn btn-primary btn-lg btn-full" id="loginBtn">
            Sign In
          </button>

          <div class="auth-divider">
            <span>Don't have an account?</span>
          </div>

          <button 
            type="button" 
            class="btn btn-secondary btn-full"
            onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'register'}}))"
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  `;
}

export function initLogin() {
  const form = document.getElementById('loginForm');
  const passwordToggle = document.querySelector('.password-toggle');

  // Password visibility toggle
  if (passwordToggle) {
    passwordToggle.addEventListener('click', function() {
      const input = this.closest('.password-input').querySelector('input');
      input.type = input.type === 'password' ? 'text' : 'password';
      this.textContent = input.type === 'password' ? '👁️' : '🙈';
    });
  }

  // Handle "Remember me"
  const rememberMe = document.getElementById('rememberMe');
  const savedIdentifier = localStorage.getItem('savedIdentifier');
  if (savedIdentifier) {
    document.getElementById('identifier').value = savedIdentifier;
    rememberMe.checked = true;
  }

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('loginBtn');
    
    const identifier = document.getElementById('identifier').value.trim();
    const password = document.getElementById('password').value;
    const remember = rememberMe.checked;

    if (!identifier) {
      Toast.error('Please enter your phone or email');
      return;
    }

    if (!password) {
      Toast.error('Please enter your password');
      return;
    }

    // Save identifier if remember me
    if (remember) {
      localStorage.setItem('savedIdentifier', identifier);
    } else {
      localStorage.removeItem('savedIdentifier');
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing In...';
    submitBtn.classList.add('btn-loading');

    try {
      const result = await Auth.login(identifier, password, remember);

      if (result.requiresOTP) {
        Router.navigate('verify-otp', {}, { 
          identifier: result.identifier,
          type: 'login'
        });
        Toast.info('Verification code sent');
      } else if (result.success) {
        Router.navigate('dashboard');
      }
    } catch (error) {
      // Error already handled by Auth
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
      submitBtn.classList.remove('btn-loading');
    }
  });

  // Auto-focus
  document.getElementById('identifier')?.focus();

  // Enter key for form submission
  form.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });
}

// Styles (reuse register styles with additions)
const loginStyles = `
.login-page .auth-container {
  max-width: 400px;
}

.text-link {
  color: var(--primary);
  font-size: 14px;
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--transition-fast);
}

.text-link:hover {
  color: var(--primary-light);
  text-decoration: underline;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 480px) {
  .form-options {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-sm);
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = loginStyles;
document.head.appendChild(styleTag);
