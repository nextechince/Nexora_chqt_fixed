/**
 * Forgot Password Page
 * Password reset flow with email/phone
 */
import { Auth } from '../utils/auth.js';
import { Toast } from '../utils/toast.js';
import { Router } from '../router.js';

export function ForgotPasswordPage() {
  return `
    <div class="auth-page forgot-password-page">
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
          <h2>Reset Password</h2>
          <p>Enter your phone or email to receive reset instructions</p>
        </div>

        <form id="forgotPasswordForm" class="auth-form">
          <div class="form-group">
            <label for="identifier">Phone or Email</label>
            <input 
              type="text" 
              id="identifier" 
              placeholder="Enter your phone or email" 
              required
            />
          </div>

          <button type="submit" class="btn btn-primary btn-lg btn-full" id="resetBtn">
            Send Reset Instructions
          </button>

          <div class="auth-divider">
            <span>Remember your password?</span>
          </div>

          <button 
            type="button" 
            class="btn btn-secondary btn-full"
            onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: {page: 'login'}}))"
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  `;
}

export function initForgotPassword() {
  const form = document.getElementById('forgotPasswordForm');
  const submitBtn = document.getElementById('resetBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const identifier = document.getElementById('identifier').value.trim();

    if (!identifier) {
      Toast.error('Please enter your phone or email');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    submitBtn.classList.add('btn-loading');

    try {
      await Auth.forgotPassword(identifier);
      
      // Show success message with OTP input
      showResetCodeInput(identifier);
    } catch (error) {
      // Error already handled by Auth
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Reset Instructions';
      submitBtn.classList.remove('btn-loading');
    }
  });
}

function showResetCodeInput(identifier) {
  const form = document.getElementById('forgotPasswordForm');
  
  form.innerHTML = `
    <div class="form-group">
      <label>Verification Code</label>
      <p class="form-hint">We sent a 6-digit code to ${identifier}</p>
      <div class="otp-inputs">
        ${Array.from({length: 6}, (_, i) => `
          <input 
            type="text" 
            id="reset-otp-${i}" 
            class="otp-input" 
            maxlength="1" 
            inputmode="numeric"
            pattern="[0-9]"
            autocomplete="one-time-code"
            required
          />
        `).join('')}
      </div>
    </div>
    <div class="form-group">
      <label>New Password</label>
      <input type="password" id="newPassword" placeholder="Enter new password" required minlength="8" />
    </div>
    <div class="form-group">
      <label>Confirm Password</label>
      <input type="password" id="confirmNewPassword" placeholder="Confirm new password" required />
    </div>
    <button type="submit" class="btn btn-primary btn-lg btn-full" id="resetPasswordBtn">
      Reset Password
    </button>
    <div class="otp-resend">
      <span>Didn't receive the code?</span>
      <button type="button" id="resendResetBtn" class="text-link">Resend Code</button>
    </div>
  `;

  // Setup OTP inputs
  const inputs = document.querySelectorAll('.otp-input');
  inputs.forEach((input, index) => {
    input.addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '');
      if (this.value && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && !this.value && index > 0) {
        inputs[index - 1].focus();
      }
    });
  });

  inputs[0]?.focus();

  // Handle form submission for reset
  const resetForm = document.getElementById('forgotPasswordForm');
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const code = Array.from(inputs).map(inp => inp.value).join('');
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;

    if (code.length !== 6) {
      Toast.warning('Please enter all 6 digits');
      return;
    }

    if (newPassword.length < 8) {
      Toast.warning('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.warning('Passwords do not match');
      return;
    }

    const btn = document.getElementById('resetPasswordBtn');
    btn.disabled = true;
    btn.textContent = 'Resetting...';
    btn.classList.add('btn-loading');

    try {
      await Auth.resetPassword(code, newPassword);
      Toast.success('Password reset successfully!');
      
      setTimeout(() => {
        Router.navigate('login');
      }, 1500);
    } catch (error) {
      // Error handled by Auth
    } finally {
      btn.disabled = false;
      btn.textContent = 'Reset Password';
      btn.classList.remove('btn-loading');
    }
  });

  // Resend code
  document.getElementById('resendResetBtn').addEventListener('click', async () => {
    const identifier = document.getElementById('identifier')?.value;
    if (identifier) {
      await Auth.resendOTP(identifier);
      Toast.success('Code resent');
    }
  });
}

// Styles (reuse from register)
const forgotStyles = `
.forgot-password-page .auth-container {
  max-width: 400px;
}

.otp-resend {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-secondary);
  font-size: 14px;
  margin: var(--space-md) 0;
}

.text-link {
  color: var(--primary);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.text-link:hover {
  text-decoration: underline;
}

.otp-inputs {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
  margin-top: var(--space-sm);
}

.otp-input {
  width: 44px;
  height: 52px;
  text-align: center;
  font-size: 24px;
  font-weight: 600;
  background: var(--bg-glass);
  border: 2px solid var(--border-glass);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.otp-input:focus {
  border-color: var(--primary);
  box-shadow: var(--shadow-glow);
  outline: none;
}

@media (max-width: 480px) {
  .otp-input {
    width: 36px;
    height: 44px;
    font-size: 20px;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = forgotStyles;
document.head.appendChild(styleTag);
