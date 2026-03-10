/**
 * Login Page JavaScript
 * Handles authentication, validation, and toast notifications
 */

// ============================================
// MOCK CREDENTIALS (For demo purposes)
// ============================================
const MOCK_CREDENTIALS = {
    email: 'admin@blog.com',
    password: 'admin123'
};

// ============================================
// STATE
// ============================================
const state = {
    isLoading: false,
    showPassword: false
};

// ============================================
// TOAST NOTIFICATIONS
// ============================================

/**
 * Show Toast Notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds
 */
function showToast(message, type = 'success', duration = 5000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'times-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas fa-${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Remove toast after duration
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================
// LOADER FUNCTIONS
// ============================================

function showLoader(message = 'Loading...') {
    const loader = document.getElementById('loader');
    loader.querySelector('p').textContent = message;
    loader.classList.remove('hidden');
}

function hideLoader() {
    document.getElementById('loader').classList.add('hidden');
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate Email Format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate Password (minimum 6 characters)
 */
function isValidPassword(password) {
    return password.length >= 6;
}

/**
 * Show Input Error
 */
function showInputError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(errorId);
    
    input.classList.add('error');
    input.classList.remove('valid');
    errorEl.textContent = message;
    
    // Show invalid icon if exists
    const wrapper = input.closest('.input-wrapper');
    const validIcon = wrapper?.querySelector('.input-status.valid');
    const invalidIcon = wrapper?.querySelector('.input-status.invalid');
    
    if (validIcon) validIcon.classList.add('hidden');
    if (invalidIcon) invalidIcon.classList.remove('hidden');
}

/**
 * Show Input Success
 */
function showInputSuccess(inputId, errorId) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(errorId);
    
    input.classList.remove('error');
    input.classList.add('valid');
    errorEl.textContent = '';
    
    // Show valid icon if exists
    const wrapper = input.closest('.input-wrapper');
    const validIcon = wrapper?.querySelector('.input-status.valid');
    const invalidIcon = wrapper?.querySelector('.input-status.invalid');
    
    if (validIcon) validIcon.classList.remove('hidden');
    if (invalidIcon) invalidIcon.classList.add('hidden');
}

/**
 * Clear Input Validation
 */
function clearValidation(inputId, errorId) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(errorId);
    
    input.classList.remove('error', 'valid');
    errorEl.textContent = '';
    
    const wrapper = input.closest('.input-wrapper');
    const validIcon = wrapper?.querySelector('.input-status.valid');
    const invalidIcon = wrapper?.querySelector('.input-status.invalid');
    
    if (validIcon) validIcon.classList.add('hidden');
    if (invalidIcon) invalidIcon.classList.add('hidden');
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Check if user is already logged in
 */
function checkAuthStatus() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
        // Redirect to dashboard
        window.location.href = 'index.html';
    }
}

/**
 * Login User
 */
function loginUser(email, password, rememberMe = false) {
    showLoader('Signing in...');
    
    // Simulate API call delay
    setTimeout(() => {
        // Check credentials (mock authentication)
        if (email === MOCK_CREDENTIALS.email && password === MOCK_CREDENTIALS.password) {
            // Store session
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userEmail', email);
            sessionStorage.setItem('loginTime', new Date().toISOString());
            
            // If remember me, store in localStorage too
            if (rememberMe) {
                localStorage.setItem('rememberUser', email);
            } else {
                localStorage.removeItem('rememberUser');
            }
            
            hideLoader();
            showToast('Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            hideLoader();
            showToast('Invalid email or password. Please try again.', 'error');
            
            // Clear password field
            document.getElementById('password').value = '';
            clearValidation('password', 'password-error');
        }
    }, 1500);
}

/**
 * Logout User (for use in dashboard)
 */
function logoutUser() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('loginTime');
    showToast('Logged out successfully!', 'info');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

// Make logoutUser globally accessible
window.logoutUser = logoutUser;

// ============================================
// MODAL FUNCTIONS
// ============================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    
    // Reset form if exists
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
    }
}

// ============================================
// EVENT HANDLERS
// ============================================

function setupEventListeners() {
    // Email validation on blur
    const emailInput = document.getElementById('email');
    emailInput.addEventListener('blur', () => {
        const email = emailInput.value.trim();
        if (email && !isValidEmail(email)) {
            showInputError('email', 'email-error', 'Please enter a valid email address');
        } else if (email) {
            showInputSuccess('email', 'email-error');
        }
    });
    
    emailInput.addEventListener('input', () => {
        clearValidation('email', 'email-error');
    });
    
    // Password validation on blur
    const passwordInput = document.getElementById('password');
    passwordInput.addEventListener('blur', () => {
        const password = passwordInput.value;
        if (password && !isValidPassword(password)) {
            showInputError('password', 'password-error', 'Password must be at least 6 characters');
        } else if (password) {
            showInputSuccess('password', 'password-error');
        }
    });
    
    passwordInput.addEventListener('input', () => {
        clearValidation('password', 'password-error');
    });
    
    // Toggle password visibility
    const togglePasswordBtn = document.getElementById('toggle-password');
    togglePasswordBtn.addEventListener('click', () => {
        state.showPassword = !state.showPassword;
        passwordInput.type = state.showPassword ? 'text' : 'password';
        togglePasswordBtn.innerHTML = state.showPassword 
            ? '<i class="fas fa-eye-slash"></i>' 
            : '<i class="fas fa-eye"></i>';
    });
    
    // Login form submission
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me').checked;
        
        // Validate inputs
        let hasError = false;
        
        if (!email) {
            showInputError('email', 'email-error', 'Email is required');
            hasError = true;
        } else if (!isValidEmail(email)) {
            showInputError('email', 'email-error', 'Please enter a valid email address');
            hasError = true;
        }
        
        if (!password) {
            showInputError('password', 'password-error', 'Password is required');
            hasError = true;
        } else if (!isValidPassword(password)) {
            showInputError('password', 'password-error', 'Password must be at least 6 characters');
            hasError = true;
        }
        
        if (hasError) {
            showToast('Please fix the errors above', 'warning');
            return;
        }
        
        // Attempt login
        loginUser(email, password, rememberMe);
    });
    
    // Forgot password link
    document.getElementById('forgot-password').addEventListener('click', (e) => {
        e.preventDefault();
        openModal('forgot-modal');
    });
    
    // Sign up link
    document.getElementById('signup-link').addEventListener('click', (e) => {
        e.preventDefault();
        openModal('signup-modal');
    });
    
    // Modal close buttons
    document.querySelectorAll('[data-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(btn.dataset.modal);
        });
    });
    
    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            const modal = overlay.closest('.modal');
            closeModal(modal.id);
        });
    });
    
    // Forgot password form
    document.getElementById('forgot-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('reset-email').value.trim();
        
        if (!email || !isValidEmail(email)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }
        
        showLoader('Sending reset link...');
        
        setTimeout(() => {
            hideLoader();
            closeModal('forgot-modal');
            showToast(`Password reset link sent to ${email}`, 'success');
        }, 1500);
    });
    
    // Sign up form
    document.getElementById('signup-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;
        
        if (!name || !email || !password || !confirm) {
            showToast('Please fill in all fields', 'error');
            return;
        }
        
        if (!isValidEmail(email)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }
        
        if (!isValidPassword(password)) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        if (password !== confirm) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        showLoader('Creating account...');
        
        setTimeout(() => {
            hideLoader();
            closeModal('signup-modal');
            showToast('Account created successfully! Please sign in.', 'success');
        }, 1500);
    });
    
    // Social login buttons (demo)
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const provider = btn.classList.contains('google') ? 'Google' :
                            btn.classList.contains('github') ? 'GitHub' : 'Twitter';
            showToast(`${provider} login coming soon!`, 'info');
        });
    });
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
    // Check if already logged in
    checkAuthStatus();
    
    // Check for remembered user
    const rememberedUser = localStorage.getItem('rememberUser');
    if (rememberedUser) {
        document.getElementById('email').value = rememberedUser;
        document.getElementById('remember-me').checked = true;
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Focus email input on load
    document.getElementById('email').focus();
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
