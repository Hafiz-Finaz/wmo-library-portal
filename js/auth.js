/* ==========================================================================
   WMO Imam Gazzali Academy Library - Authentication Forms Handler
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Check if user is already logged in, redirect to admin dashboard
  const userRole = localStorage.getItem('user_role');
  if (userRole === 'admin' && (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('register.html'))) {
    window.location.href = '/admin/index.html';
    return;
  }

  // Bind login form
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
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

  // Check if we are in the recovery flow
  checkPasswordRecoveryFlow();
});

// LOGIN ACTION (Only Admins are permitted entry to the Dashboard)
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
    // Fetch profile role and redirect
    const userProfile = await window.supabaseAuth.getCurrentUser();
    if (userProfile && userProfile.role === 'admin') {
      showToast("Welcome Administrator!", "success");
      setTimeout(() => {
        window.location.href = '/admin/index.html';
      }, 1000);
    } else {
      // Not admin! Log them out immediately
      showToast("Access Denied: Administrator role required.", "error");
      await window.supabaseAuth.signOut();
      setLoadingState(submitBtn, false);
    }
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

// UPDATE PASSWORD ACTION (RECOVERY FLOW)
async function handleUpdatePasswordSubmit(e) {
  e.preventDefault();
  const password = document.getElementById("recovery-password").value;
  const confirm = document.getElementById("recovery-confirm").value;
  const submitBtn = e.target.querySelector("button[type='submit']");

  if (!password || !confirm) {
    showToast("Please fill in all fields", "warning");
    return;
  }

  if (password.length < 6) {
    showToast("Password must be at least 6 characters", "warning");
    return;
  }

  if (password !== confirm) {
    showToast("Passwords do not match", "error");
    return;
  }

  setLoadingState(submitBtn, true);

  const res = await window.supabaseAuth.updatePassword(password);
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

// Check recovery parameter
function checkPasswordRecoveryFlow() {
  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get('type');
  
  if (type === 'recovery' || window.location.hash.includes('type=recovery')) {
    // Show recovery container, hide login/forgot
    toggleAuthContainers('recovery');
  }
}

// UI State Switcher
function toggleAuthContainers(view) {
  const loginBox = document.getElementById("login-container");
  const forgotBox = document.getElementById("forgot-container");
  const recoveryBox = document.getElementById("recovery-container");

  if (loginBox) loginBox.style.display = view === 'login' ? 'block' : 'none';
  if (forgotBox) forgotBox.style.display = view === 'forgot' ? 'block' : 'none';
  if (recoveryBox) recoveryBox.style.display = view === 'recovery' ? 'block' : 'none';
}

// Button loading state manager
function setLoadingState(btn, isLoading) {
  if (!btn) return;
  if (isLoading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || "Submit";
  }
}

window.toggleAuthContainers = toggleAuthContainers;
