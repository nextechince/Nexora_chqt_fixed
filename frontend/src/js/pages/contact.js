/**
 * Contact Page
 */
import { Toast } from '../utils/toast.js';
import API from '../utils/api.js';

export function ContactPage() {
  return `
    <div class="contact-page">
      <div class="contact-header">
        <button class="btn btn-icon" onclick="window.history.back()">
          ←
        </button>
        <h1>Contact Us</h1>
      </div>

      <div class="contact-content">
        <div class="contact-info glass">
          <h2>Get in Touch</h2>
          <p>Have questions or feedback? We'd love to hear from you.</p>
          
          <div class="contact-methods">
            <div class="contact-method">
              <span class="contact-icon">📧</span>
              <div>
                <h4>Email</h4>
                <p>support@nexorachqt.com</p>
              </div>
            </div>
            <div class="contact-method">
              <span class="contact-icon">🐦</span>
              <div>
                <h4>Twitter</h4>
                <p>@nexorachqt</p>
              </div>
            </div>
            <div class="contact-method">
              <span class="contact-icon">💬</span>
              <div>
                <h4>Discord</h4>
                <p>discord.gg/nexorachqt</p>
              </div>
            </div>
          </div>
        </div>

        <div class="contact-form glass">
          <h2>Send a Message</h2>
          <form id="contactForm">
            <div class="form-group">
              <label for="contactName">Your Name</label>
              <input type="text" id="contactName" placeholder="Enter your name" required />
            </div>
            <div class="form-group">
              <label for="contactEmail">Email Address</label>
              <input type="email" id="contactEmail" placeholder="Enter your email" required />
            </div>
            <div class="form-group">
              <label for="contactSubject">Subject</label>
              <input type="text" id="contactSubject" placeholder="What's this about?" required />
            </div>
            <div class="form-group">
              <label for="contactMessage">Message</label>
              <textarea id="contactMessage" rows="5" placeholder="Describe your question or feedback..." required></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-full">Send Message</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

export function initContact() {
  const form = document.getElementById('contactForm');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const subject = document.getElementById('contactSubject').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    if (!name || !email || !subject || !message) {
      Toast.warning('Please fill in all fields');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    submitBtn.classList.add('btn-loading');

    try {
      await API.post('/contact', { name, email, subject, message });
      Toast.success('Message sent successfully!');
      form.reset();
    } catch (error) {
      Toast.error(error.message || 'Failed to send message');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
      submitBtn.classList.remove('btn-loading');
    }
  });
}

// Styles
const contactStyles = `
.contact-page {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.contact-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.contact-header h1 {
  font-size: 28px;
  font-weight: 700;
}

.contact-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--space-xl);
}

.contact-info,
.contact-form {
  padding: var(--space-xl);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
}

.contact-info h2,
.contact-form h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: var(--space-sm);
}

.contact-info p {
  color: var(--text-secondary);
  margin-bottom: var(--space-lg);
}

.contact-methods {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.contact-method {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-glass);
  border-radius: var(--radius-md);
}

.contact-icon {
  font-size: 28px;
}

.contact-method h4 {
  font-size: 14px;
  font-weight: 600;
}

.contact-method p {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}

.contact-form .form-group {
  margin-bottom: var(--space-md);
}

.contact-form label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: var(--space-xs);
}

.contact-form input,
.contact-form textarea {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color var(--transition-fast);
}

.contact-form input:focus,
.contact-form textarea:focus {
  border-color: var(--primary);
  box-shadow: var(--shadow-glow);
  outline: none;
}

.contact-form textarea {
  resize: vertical;
  font-family: inherit;
}

@media (max-width: 768px) {
  .contact-content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .contact-page {
    padding: var(--space-md);
  }
  
  .contact-info,
  .contact-form {
    padding: var(--space-md);
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = contactStyles;
document.head.appendChild(styleTag);
