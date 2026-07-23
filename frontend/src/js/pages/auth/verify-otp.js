/**
 * OTP Verification Page
 * 6-digit, auto-focus, timer, Twilio SMS
 */
import { Auth } from '../../utils/auth.js';
import { Toast } from '../../utils/toast.js';
import { Router } from '../../router.js';

export function VerifyOTPPage(params, query) {
  const identifier = query.identifier || '';
  const type = query.type || 'login';

  return `
    <div class="auth-page otp-page">
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
          <h2>Verify Your Identity</h2>
          <p>We sent a 6-digit code to <strong>${identifier}</strong></p>
        </div>

        <form id="otpForm" class="auth-form">
          <div class="otp-input-container">
            <div class="otp-inputs">
              ${Array.from({length: 6}, (_, i) => `
                <input 
                  type="text" 
                  id="otp-${i}" 
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

          <div class="otp-timer">
            <span id="otpTimer">30s</span>
          </div>

          <button type="submit" class="btn btn-primary btn-lg btn-full" id="verifyBtn">
            Verify Code
          </button>

          <div class="otp-resend">
            <span>Didn't receive the code?</span>
            <button type="button" id="resendBtn" class="text-link" disabled>
              Resend Code
            </button>
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

export function initVerifyOTP() {
  const form = document.getElementById('otpForm');
  const inputs = document.querySelectorAll('.otp-input');
  const verifyBtn = document.getElementById('verifyBtn');
  const resendBtn = document.getElementById('resendBtn');
  const timerDisplay = document.getElementById('otpTimer');
  
  let timer = 30;
  let timerInterval = null;
  let isVerifying = false;

  // Get identifier from URL query
  const urlParams = new URLSearchParams(window.location.search);
  const identifier = urlParams.get('identifier') || '';
  const type = urlParams.get('type') || 'login';

  // Auto-focus first input
  inputs[0]?.focus();

  // Input handling
  inputs.forEach((input, index) => {
    // Handle input
    input.addEventListener('input', function() {
      // Only allow digits
      this.value = this.value.replace(/\D/g, '');
      
      // Auto-advance
      if (this.value && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
      
      // Auto-submit when all filled
      if (Array.from(inputs).every(inp => inp.value)) {
        setTimeout(() => form.dispatchEvent(new Event('submit')), 300);
      }
    });

    // Handle backspace
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && !this.value && index > 0) {
        inputs[index - 1].focus();
      }
    });

    // Handle paste
    input.addEventListener('paste', function(e) {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text');
      const digits = paste.replace(/\D/g, '').slice(0, 6);
      
      digits.split('').forEach((digit, i) => {
        if (i < inputs.length) {
          inputs[i].value = digit;
        }
      });
      
      // Focus last filled or next empty
      const lastIndex = Math.min(digits.length, inputs.length - 1);
      inputs[lastIndex]?.focus();
    });
  });

  // Timer
  function startTimer() {
    timer = 30;
    resendBtn.disabled = true;
    timerDisplay.textContent = `${timer}s`;
    
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
      timer--;
      timerDisplay.textContent = `${timer}s`;
      
      if (timer <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        resendBtn.disabled = false;
        timerDisplay.textContent = 'Resend';
      }
    }, 1000);
  }

  // Resend OTP
  resendBtn.addEventListener('click', async () => {
    try {
      await Auth.resendOTP(identifier);
      startTimer();
      Toast.success('New code sent successfully');
    } catch (error) {
      Toast.error('Failed to resend code');
    }
  });

  // Verify OTP
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (isVerifying) return;
    
    const code = Array.from(inputs).map(inp => inp.value).join('');
    
    if (code.length !== 6) {
      Toast.warning('Please enter all 6 digits');
      return;
    }

    isVerifying = true;
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    verifyBtn.classList.add('btn-loading');

    try {
      const result = await Auth.verifyOTP(identifier, code);
      
      if (result.success) {
        // Success animation
        inputs.forEach((input, i) => {
          setTimeout(() => {
            input.classList.add('otp-success');
          }, i * 100);
        });
        
        Toast.success('Verification successful!');
        
        setTimeout(() => {
          Router.navigate('dashboard');
        }, 1000);
      }
    } catch (error) {
      // Error already handled by Auth
      // Shake animation
      document.querySelector('.otp-inputs').classList.add('otp-shake');
      setTimeout(() => {
        document.querySelector('.otp-inputs').classList.remove('otp-shake');
      }, 500);
      
      // Clear inputs
      inputs.forEach(inp => inp.value = '');
      inputs[0]?.focus();
    } finally {
      isVerifying = false;
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify Code';
      verifyBtn.classList.remove('btn-loading');
    }
  });

  // Start timer
  startTimer();

  // Cleanup
  return () => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
  };
}

// Styles
const otpStyles = `
.otp-page .auth-container {
  max-width: 420px;
}

.otp-input-container {
  margin: var(--space-md) 0;
}

.otp-inputs {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
}

.otp-input {
  width: 48px;
  height: 56px;
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

.otp-input.otp-success {
  border-color: #22C55E;
  background: rgba(34, 197, 94, 0.1);
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.2);
}

.otp-shake {
  animation: shake 0.5s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-10px); }
  40% { transform: translateX(10px); }
  60% { transform: translateX(-10px); }
  80% { transform: translateX(10px); }
}

.otp-timer {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  margin: var(--space-sm) 0;
}

#otpTimer {
  font-weight: 600;
  color: var(--primary);
}

.otp-resend {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: var(--space-md);
}

.otp-resend .text-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .otp-input {
    width: 40px;
    height: 48px;
    font-size: 20px;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = otpStyles;
document.head.appendChild(styleTag);
