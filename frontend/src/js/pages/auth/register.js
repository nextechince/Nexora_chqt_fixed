/**
 * Registration Page
 * Flora style with animated background
 */
import { Auth } from '../../utils/auth.js';
import { Toast } from '../../utils/toast.js';
import { Router } from '../../router.js';

export function RegisterPage() {
  return `
    <div class="auth-page register-page">
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
          <h2>Create Account</h2>
          <p>Join the next generation messaging platform</p>
        </div>

        <form id="registerForm" class="auth-form">
          <div class="form-group">
            <label for="displayName">Display Name</label>
            <input 
              type="text" 
              id="displayName" 
              placeholder="Your display name" 
              required
              minlength="2"
              maxlength="50"
            />
          </div>

          <div class="form-group">
            <label for="username">Username</label>
            <input 
              type="text" 
              id="username" 
              placeholder="Choose a unique username" 
              required
              minlength="3"
              maxlength="30"
              pattern="^[a-zA-Z0-9_]+$"
            />
            <span class="form-hint">Only letters, numbers, and underscores</span>
          </div>

          <div class="form-group">
            <label for="phone">Phone Number</label>
            <div class="phone-input">
              <select id="countryCode" class="country-select">
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+91">🇮🇳 +91</option>
                <option value="+86">🇨🇳 +86</option>
                <option value="+81">🇯🇵 +81</option>
                <option value="+49">🇩🇪 +49</option>
                <option value="+33">🇫🇷 +33</option>
                <option value="+39">🇮🇹 +39</option>
                <option value="+55">🇧🇷 +55</option>
                <option value="+7">🇷🇺 +7</option>
                <option value="+61">🇦🇺 +61</option>
                <option value="+82">🇰🇷 +82</option>
                <option value="+34">🇪🇸 +34</option>
                <option value="+31">🇳🇱 +31</option>
                <option value="+46">🇸🇪 +46</option>
                <option value="+47">🇳🇴 +47</option>
                <option value="+45">🇩🇰 +45</option>
                <option value="+358">🇫🇮 +358</option>
                <option value="+30">🇬🇷 +30</option>
                <option value="+90">🇹🇷 +90</option>
              </select>
              <input 
                type="tel" 
                id="phone" 
                placeholder="Phone number" 
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label for="email">Email (Optional)</label>
            <input 
              type="email" 
              id="email" 
              placeholder="your@email.com" 
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <div class="password-input">
              <input 
                type="password" 
                id="password" 
                placeholder="Create a strong password" 
                required
                minlength="8"
              />
              <button type="button" class="password-toggle" aria-label="Toggle password visibility">
                👁️
              </button>
            </div>
            <span class="form-hint">Must be at least 8 characters</span>
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input 
              type="password" 
              id="confirmPassword" 
              placeholder="Confirm your password" 
              required
            />
          </div>

          <div class="form-options">
            <label class="checkbox-label">
              <input type="checkbox" id="termsCheck" required />
              <span>I agree to the <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a></span>
            </label>
          </div>

          <button type="submit" class="btn btn-primary btn-lg btn-full" id="registerBtn">
            Create Account
          </button>

          <div class="auth-divider">
            <span>Already have an account?</span>
          </div>

          <button 
            type="button" 
            class="btn btn-secondary btn-full"
            onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'login'}}))"
          >
            Login Instead
          </button>
        </form>
      </div>
    </div>
  `;
}

// Initialize registration page
export function initRegister() {
  const form = document.getElementById('registerForm');
  const passwordToggle = document.querySelector('.password-toggle');

  // Password visibility toggle
  if (passwordToggle) {
    passwordToggle.addEventListener('click', function() {
      const input = this.closest('.password-input').querySelector('input');
      input.type = input.type === 'password' ? 'text' : 'password';
      this.textContent = input.type === 'password' ? '👁️' : '🙈';
    });
  }

  // Phone input formatting
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', function() {
      // Remove non-numeric characters
      this.value = this.value.replace(/\D/g, '');
    });
  }

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('registerBtn');
    
    // Validate
    const displayName = document.getElementById('displayName').value.trim();
    const username = document.getElementById('username').value.trim();
    const countryCode = document.getElementById('countryCode').value;
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const termsChecked = document.getElementById('termsCheck').checked;

    // Validations
    if (!displayName) {
      Toast.error('Please enter your display name');
      return;
    }

    if (!username) {
      Toast.error('Please enter a username');
      return;
    }

    if (!username.match(/^[a-zA-Z0-9_]+$/)) {
      Toast.error('Username can only contain letters, numbers, and underscores');
      return;
    }

    if (!phone) {
      Toast.error('Please enter your phone number');
      return;
    }

    const fullPhone = countryCode + phone;
    if (fullPhone.length < 8) {
      Toast.error('Please enter a valid phone number');
      return;
    }

    if (password.length < 8) {
      Toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      Toast.error('Passwords do not match');
      return;
    }

    if (!termsChecked) {
      Toast.error('Please agree to the Terms of Service');
      return;
    }

    // Submit
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.classList.add('btn-loading');

    try {
      const result = await Auth.register({
        displayName,
        username,
        phone: fullPhone,
        email: email || undefined,
        password
      });

      if (result.requiresOTP) {
        // Navigate to OTP verification
        Router.navigate('verify-otp', {}, { 
          identifier: fullPhone,
          type: 'register'
        });
        Toast.info('Verification code sent to your phone');
      } else if (result.success) {
        Router.navigate('dashboard');
      }
    } catch (error) {
      // Error already handled by Auth
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
      submitBtn.classList.remove('btn-loading');
    }
  });

  // Auto-focus first input
  document.getElementById('displayName')?.focus();
}

// Styles
const registerStyles = `
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  position: relative;
}

.auth-background {
  position: fixed;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}

.flora-decoration {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(circle at 30% 20%, rgba(88,101,242,0.15) 0%, transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(0,212,255,0.1) 0%, transparent 50%);
}

.flora-particle {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(88,101,242,0.1), rgba(0,212,255,0.1));
  animation: float-particle 20s ease-in-out infinite;
}

.flora-particle.particle-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  left: -100px;
  animation-delay: 0s;
}

.flora-particle.particle-2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  right: -50px;
  animation-delay: -5s;
}

.flora-particle.particle-3 {
  width: 150px;
  height: 150px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -10s;
}

@keyframes float-particle {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(50px, -30px) scale(1.1);
  }
  50% {
    transform: translate(-20px, 50px) scale(0.9);
  }
  75% {
    transform: translate(30px, 20px) scale(1.05);
  }
}

.auth-container {
  max-width: 440px;
  width: 100%;
  padding: var(--space-xl);
  z-index: 1;
  position: relative;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-glass);
}

.auth-header {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.auth-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.auth-logo span {
  font-weight: 700;
  font-size: 20px;
  background: linear-gradient(135deg, #5865F2, #00D4FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.auth-header h2 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: var(--space-xs);
}

.auth-header p {
  color: var(--text-secondary);
  font-size: 14px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group input,
.form-group select {
  padding: 12px 16px;
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  transition: all var(--transition-fast);
}

.form-group input:focus,
.form-group select:focus {
  border-color: var(--primary);
  box-shadow: var(--shadow-glow);
}

.form-group input::placeholder {
  color: var(--text-muted);
}

.form-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.phone-input {
  display: flex;
  gap: var(--space-sm);
}

.phone-input .country-select {
  width: 100px;
  flex-shrink: 0;
  padding: 12px 8px;
}

.phone-input input {
  flex: 1;
}

.password-input {
  display: flex;
  gap: var(--space-sm);
}

.password-input input {
  flex: 1;
}

.password-toggle {
  padding: 0 12px;
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  font-size: 18px;
  transition: all var(--transition-fast);
}

.password-toggle:hover {
  background: var(--bg-glass-hover);
}

.form-options {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin-top: 2px;
  width: 18px;
  height: 18px;
  cursor: pointer;
  flex-shrink: 0;
}

.checkbox-label a {
  color: var(--primary);
  text-decoration: none;
}

.checkbox-label a:hover {
  text-decoration: underline;
}

.btn-full {
  width: 100%;
  justify-content: center;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  color: var(--text-muted);
  font-size: 14px;
  margin: var(--space-sm) 0;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-glass);
}

@media (max-width: 480px) {
  .auth-container {
    padding: var(--space-lg);
  }
  
  .auth-header h2 {
    font-size: 24px;
  }
  
  .phone-input {
    flex-direction: column;
  }
  
  .phone-input .country-select {
    width: 100%;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = registerStyles;
document.head.appendChild(styleTag);
