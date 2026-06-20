/**
 * Login Page JavaScript
 * Handles authentication, validation, and toast notifications
 */

// ============================================
// STATE
// ============================================
const state = {
  isLoading: false,
  showPassword: false,
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
function showToast(message, type = "success", duration = 5000) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: "check-circle",
    error: "times-circle",
    warning: "exclamation-triangle",
    info: "info-circle",
  };

  toast.innerHTML = `
        <i class="fas fa-${icons[type]}"></i>
        <span>${message}</span>
    `;

  container.appendChild(toast);

  // Remove toast after duration
  setTimeout(() => {
    toast.classList.add("hiding");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================
// LOADER FUNCTIONS
// ============================================

function showLoader(message = "Loading...") {
  const loader = document.getElementById("loader");
  loader.querySelector("p").textContent = message;
  loader.classList.remove("hidden");
}

function hideLoader() {
  document.getElementById("loader").classList.add("hidden");
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
 * Validate Password (minimum 8 characters)
 */
function isValidPassword(password) {
  return password.length >= 8;
}

/**
 * Show Input Error
 */
function showInputError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(errorId);

  input.classList.add("error");
  input.classList.remove("valid");
  errorEl.textContent = message;

  // Show invalid icon if exists
  const wrapper = input.closest(".input-wrapper");
  const validIcon = wrapper?.querySelector(".input-status.valid");
  const invalidIcon = wrapper?.querySelector(".input-status.invalid");

  if (validIcon) validIcon.classList.add("hidden");
  if (invalidIcon) invalidIcon.classList.remove("hidden");
}

/**
 * Show Input Success
 */
function showInputSuccess(inputId, errorId) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(errorId);

  input.classList.remove("error");
  input.classList.add("valid");
  errorEl.textContent = "";

  // Show valid icon if exists
  const wrapper = input.closest(".input-wrapper");
  const validIcon = wrapper?.querySelector(".input-status.valid");
  const invalidIcon = wrapper?.querySelector(".input-status.invalid");

  if (validIcon) validIcon.classList.remove("hidden");
  if (invalidIcon) invalidIcon.classList.add("hidden");
}

/**
 * Clear Input Validation
 */
function clearValidation(inputId, errorId) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(errorId);

  input.classList.remove("error", "valid");
  errorEl.textContent = "";

  const wrapper = input.closest(".input-wrapper");
  const validIcon = wrapper?.querySelector(".input-status.valid");
  const invalidIcon = wrapper?.querySelector(".input-status.invalid");

  if (validIcon) validIcon.classList.add("hidden");
  if (invalidIcon) invalidIcon.classList.add("hidden");
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Check if user is already logged in
 *
 * api.js's refreshToken() returns a plain boolean — true on a
 * successful refresh, false otherwise — NOT an { ok: ... } object.
 * Checking `result.ok` on a boolean is always undefined (falsy),
 * which previously meant a logged-in user landing on this page would
 * never get redirected to the dashboard. Check the boolean directly.
 *
 * Also: if there's no session at all, refreshToken() gets a 401 from
 * the backend and handles its own redirect-to-login internally (with
 * a same-page guard so it doesn't loop). Nothing extra needed here
 * for that case — just don't redirect to the dashboard.
 */
async function checkAuthStatus() {
  try {
    const refreshed = await API.refreshToken();

    if (refreshed) {
      window.location.href = "/admin/index.html";
    }
    // refreshed === false: either already redirected to login (no-op,
    // we're already here), or the backend is unreachable — in which
    // case staying on the login page and letting the user retry the
    // login form (which will surface its own error) is the right move.
  } catch (error) {
    console.log("No active session");
  }
}

/**
 * Login User
 *
 * Was previously a standalone fetch() with its own local
 * `let accessToken = null;` declared at the top of this file. login.html
 * loads this script and api.js as plain (non-module) <script> tags, so they
 * share one global scope — and api.js ALSO declares `let accessToken = null;`
 * at its top level. Two `let` declarations of the same name in the same
 * scope is a SyntaxError ("Identifier 'accessToken' has already been
 * declared"), thrown the moment api.js parses, which aborted ALL of api.js
 * (so `window.API` never got defined) and broke checkAuthStatus() below,
 * which calls API.refreshToken().
 *
 * Fix: don't keep a second copy of the token here at all — delegate to
 * API.login(), which already does this exact fetch and stores the token in
 * the one place authFetch (api.js) actually reads it from.
 */
async function loginUser(email, password) {
  showLoader("Signing in...");

  try {
    await API.login(email, password);

    hideLoader();
    showToast("Login successful! Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "/admin/index.html";
    }, 1500);
  } catch (error) {
    hideLoader();
    showToast(error.message, "error");

    const passwordInput = document.getElementById("password");
    if (passwordInput) {
      passwordInput.value = "";
      clearValidation("password", "password-error");
    }
  }
}
/**
 * Logout User (for use in dashboard)
 */
function logoutUser() {
  sessionStorage.removeItem("isLoggedIn");
  sessionStorage.removeItem("userEmail");
  sessionStorage.removeItem("loginTime");
  showToast("Logged out successfully!", "info");
  setTimeout(() => {
    window.location.href = "login.html";
  }, 1000);
}

// Make logoutUser globally accessible
window.logoutUser = logoutUser;

// ============================================
// MODAL FUNCTIONS
// ============================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.add("hidden");
  document.body.style.overflow = "";

  // Reset form if exists
  const form = modal.querySelector("form");
  if (form) {
    form.reset();
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

function setupEventListeners() {
  // Email validation on blur
  const emailInput = document.getElementById("email");
  emailInput.addEventListener("blur", () => {
    const email = emailInput.value.trim();
    if (email && !isValidEmail(email)) {
      showInputError(
        "email",
        "email-error",
        "Please enter a valid email address"
      );
    } else if (email) {
      showInputSuccess("email", "email-error");
    }
  });

  emailInput.addEventListener("input", () => {
    clearValidation("email", "email-error");
  });

  // Password validation on blur
  const passwordInput = document.getElementById("password");
  passwordInput.addEventListener("blur", () => {
    const password = passwordInput.value;
    if (password && !isValidPassword(password)) {
      showInputError(
        "password",
        "password-error",
        "Password must be at least 8 characters"
      );
    } else if (password) {
      showInputSuccess("password", "password-error");
    }
  });

  passwordInput.addEventListener("input", () => {
    clearValidation("password", "password-error");
  });

  // Toggle password visibility
  const togglePasswordBtn = document.getElementById("toggle-password");
  togglePasswordBtn.addEventListener("click", () => {
    state.showPassword = !state.showPassword;
    passwordInput.type = state.showPassword ? "text" : "password";
    togglePasswordBtn.innerHTML = state.showPassword
      ? '<i class="fas fa-eye-slash"></i>'
      : '<i class="fas fa-eye"></i>';
  });

  // Login form submission
  const loginForm = document.getElementById("login-form");
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const rememberMe = document.getElementById("remember-me").checked;

    // Validate inputs
    let hasError = false;

    if (!email) {
      showInputError("email", "email-error", "Email is required");
      hasError = true;
    } else if (!isValidEmail(email)) {
      showInputError(
        "email",
        "email-error",
        "Please enter a valid email address"
      );
      hasError = true;
    }

    if (!password) {
      showInputError("password", "password-error", "Password is required");
      hasError = true;
    } else if (!isValidPassword(password)) {
      showInputError(
        "password",
        "password-error",
        "Password must be at least 8 characters"
      );
      hasError = true;
    }

    if (hasError) {
      showToast("Please fix the errors above", "warning");
      return;
    }

    // Attempt login
    loginUser(email, password, rememberMe);
  });

  // Forgot password link
  document.getElementById("forgot-password").addEventListener("click", (e) => {
    e.preventDefault();
    openModal("forgot-modal");
  });

  // Sign up link
  document.getElementById("signup-link").addEventListener("click", (e) => {
    e.preventDefault();
    openModal("signup-modal");
  });

  // Modal close buttons
  document.querySelectorAll("[data-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeModal(btn.dataset.modal);
    });
  });

  // Close modal on overlay click
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", () => {
      const modal = overlay.closest(".modal");
      closeModal(modal.id);
    });
  });

  // Forgot password form
  document.getElementById("forgot-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("reset-email").value.trim();

    if (!email || !isValidEmail(email)) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    showLoader("Sending reset link...");

    setTimeout(() => {
      hideLoader();
      closeModal("forgot-modal");
      showToast(`Password reset link sent to ${email}`, "success");
    }, 1500);
  });

  // Sign up form
  document
    .getElementById("signup-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      // 1. Get Values
      const firstName = document
        .getElementById("signup-first-name")
        .value.trim();
      const lastName = document.getElementById("signup-last-name").value.trim();
      const email = document.getElementById("signup-email").value.trim();
      const password = document.getElementById("signup-password").value;
      const confirm = document.getElementById("signup-confirm").value;

      // 2. Client-side Validation
      if (!firstName || !lastName || !email || !password || !confirm) {
        showToast("Please fill in all fields", "error");
        return;
      }
      if (password !== confirm) {
        showToast("Passwords do not match", "error");
        return;
      }

      showLoader("Creating account...");

      try {
        // 3. The API Call
        // Uses window.baseURL from config.js (loaded before login.js in
        // login.html) instead of a hardcoded localhost URL — this is what
        // was causing "Failed to fetch" against the deployed backend.
        const response = await fetch(`${window.baseURL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: firstName, // Mapping to snake_case for backend
            last_name: lastName,
            email: email,
            password: password, // Sending as 'password' for clarity
          }),
        });

        const data = await response.json();

        if (!response.ok)
          throw new Error(data.message || "Registration failed");

        // 4. Success Handling
        hideLoader();
        closeModal("signup-modal");
        // Updated message to reflect the approval logic
        showToast(
          "Registration successful! Access is pending admin approval.",
          "success"
        );
      } catch (error) {
        hideLoader();
        showToast(error.message, "error");
      }
    });

  // Social login buttons (demo)
  document.querySelectorAll(".social-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const provider = btn.classList.contains("google")
        ? "Google"
        : btn.classList.contains("github")
        ? "GitHub"
        : "Twitter";
      showToast(`${provider} login coming soon!`, "info");
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
  const rememberedUser = localStorage.getItem("rememberUser");
  if (rememberedUser) {
    document.getElementById("email").value = rememberedUser;
    document.getElementById("remember-me").checked = true;
  }

  // Setup event listeners
  setupEventListeners();

  // Focus email input on load
  document.getElementById("email").focus();
}

// Start the app
document.addEventListener("DOMContentLoaded", init);
