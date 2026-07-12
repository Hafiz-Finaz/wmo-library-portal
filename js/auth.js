/* ==========================================================================
   WMO Imam Gazzali Academy Library - Authentication Forms Handler
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Check if user is already logged in, redirect to dashboard
  const userRole = localStorage.getItem('user_role');
  if (userRole && (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('register.html'))) {
    window.location.href = '/dashboard.html';
    return;
  }

  // Bind login form
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }

  // Bind register form
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegisterSubmit);
  }

  // Bind forgot password form
  const forgotForm = document.getElementById("forgot-password-form");
  if (forgotForm) {
    forgotForm.addEventListener("submit", handleForgotPasswordSubmit);
  }

  // Bind update password form (for recovery flow)
  const recoveryForm = document.getElementById("recovery-form");
  if (recoveryForm) {
    recoveryForm.addEventListener("submit", handleUpdatePasswordSubmit);
  }

  // Toggle password visibility
  const togglePassBtns = document.querySelectorAll(".toggle-password");
  togglePassBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.getAttribute("data-target"));
      if (input) {
        if (input.type === "password") {
          input.type = "text";
          btn.innerHTML = `<i class="fas fa-eye-slash"></i>`;
        } else {
          input.type = "password";
          btn.innerHTML = `<i class="fas fa-eye"></i>`;
        }
      }
    });
  });

  // Check if we are in the recovery flow (URL contains recovery params or hash)
  checkPasswordRecoveryFlow();
});

// LOGIN ACTION
async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const submitBtn = e.target.querySelector("button[type='submit']");

  if (!email || !password) {
    showToast("Please fill in all fields", "warning");
    return;
  }

  setLoadingState(submitBtn, true);

  const res = await window.supabaseAuth.signIn(email, password);
  if (res.success) {
    showToast("Login successful!", "success");
    // Fetch profile role and redirect
    const userProfile = await window.supabaseAuth.getCurrentUser();
    setTimeout(() => {
      if (userProfile && (userProfile.role === 'admin' || userProfile.role === 'librarian')) {
        window.location.href = '/admin/index.html';
      } else {
        // Redirect back to page before login if available
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        window.location.href = redirect ? decodeURIComponent(redirect) : '/dashboard.html';
      }
    }, 1000);
  } else {
    showToast(res.error, "error");
    setLoadingState(submitBtn, false);
  }
}

// REGISTER ACTION
async function handleRegisterSubmit(e) {
  e.preventDefault();
  const fullName = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const password = document.getElementById("reg-password").value;
  const role = document.getElementById("reg-role").value;
  const terms = document.getElementById("reg-terms").checked;
  const submitBtn = e.target.querySelector("button[type='submit']");

  if (!fullName || !email || !phone || !password) {
    showToast("Please fill in all fields", "warning");
    return;
  }

  if (!terms) {
    showToast("You must agree to the Terms & Conditions", "warning");
    return;
  }

  setLoadingState(submitBtn, true);

  const res = await window.supabaseAuth.signUp(email, password, fullName, phone, role);
  if (res.success) {
    showToast("Registration successful! Please check your email for confirmation.", "success");
    e.target.reset();
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 3000);
  } else {
    showToast(res.error, "error");
    setLoadingState(submitBtn, false);
  }
}

// FORGOT PASSWORD ACTION
async function handleForgotPasswordSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("forgot-email").value.trim();
  const submitBtn = e.target.querySelector("button[type='submit']");

  if (!email) {
    showToast("Please provide your email address", "warning");
    return;
  }

  setLoadingState(submitBtn, true);

  const res = await window.supabaseAuth.resetPassword(email);
  if (res.success) {
    showToast("Password reset link sent to your email!", "success");
    e.target.reset();
  } else {
    showToast(res.error, "error");
  }
  setLoadingState(submitBtn, false);
}

// RECOVERY Flow (Update Password)
async function handleUpdatePasswordSubmit(e) {
  e.preventDefault();
  const newPassword = document.getElementById("recovery-password").value;
  const confirmPassword = document.getElementById("recovery-confirm").value;
  const submitBtn = e.target.querySelector("button[type='submit']");

  if (!newPassword || !confirmPassword) {
    showToast("Please enter and confirm your password", "warning");
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast("Passwords do not match", "warning");
    return;
  }

  setLoadingState(submitBtn, true);

  const res = await window.supabaseAuth.updatePassword(newPassword);
  if (res.success) {
    showToast("Password updated successfully! Redirecting to login...", "success");
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 2000);
  } else {
    showToast(res.error, "error");
    setLoadingState(submitBtn, false);
  }
}

// HELPER STATE LOADER
function setLoadingState(button, isLoading) {
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || "Submit";
  }
}

// Check recovery flows (Hash variables injected by Supabase reset links)
function checkPasswordRecoveryFlow() {
  const hash = window.location.hash;
  const urlParams = new URLSearchParams(window.location.search);
  const isRecovery = urlParams.get('type') === 'recovery' || hash.includes('type=recovery') || hash.includes('access_token=');

  if (isRecovery) {
    const recoveryContainer = document.getElementById("recovery-container");
    const loginContainer = document.getElementById("login-container");
    const forgotContainer = document.getElementById("forgot-container");

    if (recoveryContainer && loginContainer) {
      loginContainer.style.display = "none";
      if (forgotContainer) forgotContainer.style.display = "none";
      recoveryContainer.style.display = "block";
      showToast("Access token verified. Please enter your new password.", "info");
    }
  }
}
